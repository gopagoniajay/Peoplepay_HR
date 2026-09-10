const prisma = require('../config/db');
const contractService = require('./contract.service');
const attendanceService = require('./attendance.service');
const leaveService = require('./leave.service');
const salaryRuleEngine = require('./salaryRuleEngine.service');
const emailService = require('./email.service');
const { generatePayslipPdf } = require('./pdf.service');
const { AppError } = require('../middleware/errorHandler');

// Valid state transitions
const VALID_TRANSITIONS = {
  DRAFT: ['CALCULATING'],
  CALCULATING: ['CALCULATED'],
  CALCULATED: ['REVIEW', 'CALCULATING'], // Can recalculate
  REVIEW: ['APPROVED', 'CALCULATING'],   // Can recalculate
  APPROVED: ['FINALIZED', 'PAID', 'DRAFT'],
  FINALIZED: ['PAID', 'DRAFT'],
  PAID: ['DRAFT'],
};

class PayrollService {
  /**
   * Create a new payrun (Step 1 — scope + period).
   */
  async createPayrun(data, createdById) {
    let salaryStructureId = data.salaryStructureId;
    if (!salaryStructureId) {
      const defaultStructure = await prisma.salaryStructure.findFirst({ where: { active: true } });
      salaryStructureId = defaultStructure?.id;
    }

    return prisma.payrun.create({
      data: {
        name: data.name,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        salaryStructureId,
        status: 'DRAFT',
        createdById,
      },
      include: { salaryStructure: true },
    });
  }

  /**
   * Get eligible employees for a payrun period.
   */
  async getEligibleEmployees(payrunId) {
    const payrun = await this.getPayrun(payrunId);

    // Get all ACTIVE employees
    const employees = await prisma.employee.findMany({
      where: { employmentStatus: 'ACTIVE' },
      include: {
        department: true,
        jobPosition: true,
        contracts: {
          where: {
            status: 'ACTIVE',
            startDate: { lte: payrun.periodEnd },
            OR: [
              { endDate: null },
              { endDate: { gte: payrun.periodStart } },
            ],
          },
        },
      },
    });

    return employees.map((emp) => ({
      ...emp,
      hasContract: emp.contracts.length > 0,
      hasBankDetails: !!(emp.bankAccountNumber && emp.bankIfsc),
    }));
  }

  /**
   * Select employees for the payrun (Step 2).
   */
  async selectEmployees(payrunId, employeeIds) {
    const payrun = await this.getPayrun(payrunId);
    this.assertStatus(payrun, ['DRAFT', 'CALCULATED', 'REVIEW']);

    // Delete existing payslips for this payrun (for re-selection)
    await prisma.payslipLine.deleteMany({
      where: { payslip: { payrunId } },
    });
    await prisma.payslip.deleteMany({ where: { payrunId } });

    // Create empty payslip shells
    const payslips = [];
    for (const employeeId of employeeIds) {
      // Resolve contract for each employee
      const contract = await contractService.resolveForPeriod(
        employeeId,
        payrun.periodStart,
        payrun.periodEnd
      );

      if (!contract) {
        // Create payslip with warning but no contract
        continue; // Skip employees without contracts
      }

      payslips.push({
        payrunId,
        employeeId,
        contractId: contract.id,
        grossSalary: 0,
        totalDeductions: 0,
        netSalary: 0,
        workedDays: 0,
        status: 'DRAFT',
      });
    }

    if (payslips.length > 0) {
      await prisma.payslip.createMany({ data: payslips });
    }

    return prisma.payslip.findMany({
      where: { payrunId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } },
        contract: true,
      },
    });
  }

  /**
   * Calculate payroll for all payslips in a payrun.
   * Each employee's calculation is wrapped in a transaction.
   */
  async calculate(payrunId) {
    const payrun = await this.getPayrun(payrunId);
    this.assertStatus(payrun, ['DRAFT', 'CALCULATED', 'REVIEW']);

    // Transition to CALCULATING
    await prisma.payrun.update({
      where: { id: payrunId },
      data: { status: 'CALCULATING' },
    });

    try {
      const payslips = await prisma.payslip.findMany({
        where: { payrunId },
        include: {
          employee: true,
          contract: {
            include: {
              salaryStructure: {
                include: {
                  rules: {
                    include: { salaryRule: true },
                    orderBy: { salaryRule: { sequence: 'asc' } },
                  },
                },
              },
              workingSchedule: { include: { scheduleDays: true } },
            },
          },
        },
      });

      // Load the payrun's salary structure as fallback
      const payrunStructure = await prisma.salaryStructure.findUnique({
        where: { id: payrun.salaryStructureId },
        include: {
          rules: {
            include: { salaryRule: true },
            orderBy: { salaryRule: { sequence: 'asc' } },
          },
        },
      });

      const results = [];

      for (const payslip of payslips) {
        try {
          await this.calculateSinglePayslip(payslip, payrun, payrunStructure);
          results.push({ employeeId: payslip.employeeId, status: 'success' });
        } catch (err) {
          // Mark individual payslip with warning, don't abort batch
          console.error(`[Payroll] Calc failed for employee ${payslip.employeeId}:`, err.message);
          await prisma.payslip.update({
            where: { id: payslip.id },
            data: {
              warnings: [{ type: 'CALCULATION_ERROR', message: err.message }],
              status: 'DRAFT',
            },
          });
          results.push({ employeeId: payslip.employeeId, status: 'error', message: err.message });
        }
      }

      // Transition to CALCULATED
      await prisma.payrun.update({
        where: { id: payrunId },
        data: { status: 'CALCULATED' },
      });

      return results;
    } catch (err) {
      // Reset status on catastrophic failure
      await prisma.payrun.update({
        where: { id: payrunId },
        data: { status: 'DRAFT' },
      });
      throw err;
    }
  }

  /**
   * Calculate a single payslip within a transaction.
   */
  async calculateSinglePayslip(payslip, payrun, fallbackStructure) {
    await prisma.$transaction(async (tx) => {
      // Use contract's structure or fallback to payrun structure
      const structure = payslip.contract?.salaryStructure || fallbackStructure;
      if (!structure || !structure.rules || structure.rules.length === 0) {
        throw new Error('No salary structure/rules found');
      }

      // Aggregate attendance for the period
      const attendance = await attendanceService.aggregateForPayroll(
        payslip.employeeId,
        payrun.periodStart,
        payrun.periodEnd
      );

      // Aggregate leave for the period
      const leave = await leaveService.aggregateForPayroll(
        payslip.employeeId,
        payrun.periodStart,
        payrun.periodEnd
      );

      // Calculate expected working days in the period
      const periodStart = new Date(payrun.periodStart);
      const periodEnd = new Date(payrun.periodEnd);
      let expectedDays = 0;
      const current = new Date(periodStart);
      while (current <= periodEnd) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) expectedDays++;
        current.setDate(current.getDate() + 1);
      }

      // Build evaluation context
      const context = {
        BASIC: parseFloat(payslip.contract?.basicWage || 0),
        employee: {
          employmentType: payslip.employee.employmentType,
          employmentStatus: payslip.employee.employmentStatus,
        },
        contract: {
          basicWage: parseFloat(payslip.contract?.basicWage || 0),
          wageType: payslip.contract?.wageType || 'MONTHLY',
        },
        attendance: {
          workedDays: attendance.workedDays,
          expectedDays,
          overtimeHours: attendance.totalOvertimeHours,
          absentDays: attendance.absentDays,
        },
        leave: {
          unpaidDays: leave.unpaidDays,
          paidDays: leave.paidDays,
        },
        workingDaysInMonth: expectedDays,
        unpaidLeaveDays: leave.unpaidDays,
      };

      // Run the rule engine
      const result = salaryRuleEngine.evaluate(structure.rules, context);

      // Delete existing lines (for recalculation)
      await tx.payslipLine.deleteMany({ where: { payslipId: payslip.id } });

      // Create new lines
      if (result.lines.length > 0) {
        await tx.payslipLine.createMany({
          data: result.lines.map((line) => ({
            payslipId: payslip.id,
            salaryRuleId: line.salaryRuleId,
            ruleCode: line.ruleCode,
            label: line.label,
            amount: line.amount,
            sequence: line.sequence,
            category: line.category,
          })),
        });
      }

      // Update payslip totals
      const warnings = result.warnings.length > 0 ? result.warnings : null;
      await tx.payslip.update({
        where: { id: payslip.id },
        data: {
          grossSalary: result.grossSalary,
          totalDeductions: result.totalDeductions,
          netSalary: result.netSalary,
          workedDays: attendance.workedDays,
          status: 'CALCULATED',
          warnings,
        },
      });
    });
  }

  /**
   * Validate a payrun — produce warnings for review.
   */
  async validate(payrunId) {
    let payrun = await this.getPayrun(payrunId);
    if (payrun.status === 'DRAFT') {
      await this.calculate(payrunId);
      payrun = await this.getPayrun(payrunId);
    } else {
      this.assertStatus(payrun, ['CALCULATED', 'REVIEW']);
    }

    const payslips = await prisma.payslip.findMany({
      where: { payrunId },
      include: {
        employee: true,
        lines: true,
      },
    });

    const allWarnings = [];

    for (const ps of payslips) {
      const warnings = Array.isArray(ps.warnings) ? [...ps.warnings] : [];

      // Missing bank details
      if (!ps.employee.bankAccountNumber || !ps.employee.bankIfsc) {
        warnings.push({ type: 'MISSING_BANK', message: 'Missing bank account details' });
      }

      // Negative/zero net
      if (parseFloat(ps.netSalary) <= 0) {
        warnings.push({ type: 'ZERO_NET', message: `Net salary is ${ps.netSalary}` });
      }

      // No payslip lines
      if (ps.lines.length === 0) {
        warnings.push({ type: 'NO_LINES', message: 'No salary rule lines computed' });
      }

      if (warnings.length > 0) {
        await prisma.payslip.update({
          where: { id: ps.id },
          data: {
            warnings,
            status: 'VALIDATED',
          },
        });
      } else {
        await prisma.payslip.update({
          where: { id: ps.id },
          data: { status: 'VALIDATED' },
        });
      }

      allWarnings.push({
        employeeId: ps.employeeId,
        employeeName: `${ps.employee.firstName} ${ps.employee.lastName}`,
        warnings,
      });
    }

    await prisma.payrun.update({
      where: { id: payrunId },
      data: { status: 'REVIEW' },
    });

    return allWarnings;
  }

  /**
   * Approve a payrun.
   */
  async approve(payrunId, approvedById) {
    const payrun = await this.getPayrun(payrunId);
    this.assertStatus(payrun, ['REVIEW', 'CALCULATED']);

    return prisma.payrun.update({
      where: { id: payrunId },
      data: {
        status: 'APPROVED',
        approvedById,
      },
      include: { payslips: true, salaryStructure: true },
    });
  }

  /**
   * Finalize a payrun — makes it immutable.
   */
  async finalize(payrunId) {
    const payrun = await this.getPayrun(payrunId);
    this.assertStatus(payrun, ['APPROVED']);

    return prisma.payrun.update({
      where: { id: payrunId },
      data: {
        status: 'FINALIZED',
        finalizedAt: new Date(),
      },
      include: { payslips: true, salaryStructure: true },
    });
  }

  /**
   * Mark payrun as paid.
   */
  async markPaid(payrunId) {
    const payrun = await this.getPayrun(payrunId);
    this.assertStatus(payrun, ['FINALIZED', 'APPROVED']);

    // Update all payslips to PAID
    await prisma.payslip.updateMany({
      where: { payrunId },
      data: { status: 'PAID' },
    });

    const updatedPayrun = await prisma.payrun.update({
      where: { id: payrunId },
      data: {
        status: 'PAID',
        finalizedAt: payrun.finalizedAt || new Date(),
      },
      include: { payslips: true, salaryStructure: true },
    });

    // Automatically trigger official payslip PDF dispatch to all employees via email
    this.sendPayslips(payrunId).catch(err => {
      console.error('⚠️ Automatic payslips email delivery error on markPaid:', err.message);
    });

    return updatedPayrun;
  }

  /**
   * Sync and automatically enroll any eligible employees who have active contracts for the payrun period
   */
  async syncEligibleEmployees(payrunId) {
    const payrun = await this.getPayrun(payrunId);
    this.assertStatus(payrun, ['DRAFT', 'CALCULATED', 'REVIEW']);

    const eligible = await this.getEligibleEmployees(payrunId);
    const eligibleWithContract = eligible.filter(e => e.hasContract);

    const existingPayslips = await prisma.payslip.findMany({
      where: { payrunId },
      select: { employeeId: true },
    });
    const enrolledIds = new Set(existingPayslips.map(p => p.employeeId));

    const newlyAdded = [];
    for (const emp of eligibleWithContract) {
      if (!enrolledIds.has(emp.id)) {
        const contract = emp.contracts[0];
        await prisma.payslip.create({
          data: {
            payrunId,
            employeeId: emp.id,
            contractId: contract.id,
            grossSalary: 0,
            totalDeductions: 0,
            netSalary: 0,
            workedDays: 0,
            status: 'DRAFT',
          },
        });
        newlyAdded.push(`${emp.firstName} ${emp.lastName}`);
      }
    }

    return {
      success: true,
      totalEligible: eligibleWithContract.length,
      newlyAddedCount: newlyAdded.length,
      newlyAdded,
    };
  }

  /**
   * Reset payrun back to DRAFT state for corrections / re-calculation
   */
  async resetToDraft(payrunId) {
    const payrun = await this.getPayrun(payrunId);

    // Reset payslips status back to DRAFT
    await prisma.payslip.updateMany({
      where: { payrunId },
      data: { status: 'DRAFT' },
    });

    return prisma.payrun.update({
      where: { id: payrunId },
      data: {
        status: 'DRAFT',
        approvedById: null,
        finalizedAt: null,
      },
      include: { payslips: true, salaryStructure: true },
    });
  }

  // ─── List & Detail ────────────────────────────────────

  async listPayruns(query) {
    const { status } = query;
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const pageSize = Math.max(1, parseInt(query.pageSize, 10) || 20);
    const where = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.payrun.findMany({
        where,
        include: {
          salaryStructure: true,
          _count: { select: { payslips: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.payrun.count({ where }),
    ]);

    return { items, page, pageSize, total };
  }

  async getPayrunDetail(payrunId) {
    const payrun = await prisma.payrun.findUnique({
      where: { id: payrunId },
      include: {
        salaryStructure: true,
        payslips: {
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true, department: { select: { name: true } } },
            },
            contract: true,
            lines: { orderBy: { sequence: 'asc' } },
          },
        },
      },
    });

    if (!payrun) throw new AppError('Payrun not found', 404, 'NOT_FOUND');

    const totalGross = payrun.payslips.reduce((sum, p) => sum + parseFloat(p.grossSalary || 0), 0);
    const totalDeductions = payrun.payslips.reduce((sum, p) => sum + parseFloat(p.totalDeductions || 0), 0);
    const totalNet = payrun.payslips.reduce((sum, p) => sum + parseFloat(p.netSalary || 0), 0);

    return {
      ...payrun,
      totalGross: Math.round(totalGross * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      totalNet: Math.round(totalNet * 100) / 100,
      payrunItems: payrun.payslips.map(p => ({
        id: p.id,
        employee: p.employee,
        basic: p.lines?.find(l => l.ruleCode === 'BASIC')?.amount ?? p.contract?.basicWage ?? 0,
        grossPay: p.grossSalary,
        totalDeductions: p.totalDeductions,
        netPay: p.netSalary,
        workedDays: p.workedDays,
        status: p.status,
        lines: p.lines,
      })),
    };
  }

  // ─── Helpers ──────────────────────────────────────────

  async getPayrun(id) {
    const payrun = await prisma.payrun.findUnique({
      where: { id },
      include: { salaryStructure: true },
    });
    if (!payrun) throw new AppError('Payrun not found', 404, 'NOT_FOUND');
    return payrun;
  }

  assertStatus(payrun, allowedStatuses) {
    if (!allowedStatuses.includes(payrun.status)) {
      throw new AppError(
        `Action not allowed in status '${payrun.status}'. Required: ${allowedStatuses.join(', ')}`,
        409,
        'INVALID_STATUS'
      );
    }
  }

  async sendPayslips(payrunId) {
    const payrun = await this.getPayrun(payrunId);
    const payslips = await prisma.payslip.findMany({
      where: { payrunId },
      include: {
        employee: { 
          include: { department: true, jobPosition: true }
        },
        payrun: true,
        contract: true,
        lines: { orderBy: { sequence: 'asc' } },
      }
    });

    const results = [];
    for (const ps of payslips) {
      if (!ps.employee?.email) continue;

      // Filter out seed/dummy test domain to avoid Gmail SMTP 454 rate-limit / bounce penalties
      if (ps.employee.email.endsWith('@peoplepay360.com')) {
        results.push({
          employeeId: ps.employeeId,
          email: ps.employee.email,
          name: `${ps.employee.firstName} ${ps.employee.lastName}`,
          payslipId: ps.id,
          netSalary: ps.netSalary,
          emailStatus: 'SENT',
          previewUrl: '(Mock domain @peoplepay360.com)',
        });
        continue;
      }

      try {
        // Generate official PDF statement buffer
        const pdfBuffer = await generatePayslipPdf(ps);
        // Send email with attached PDF
        const emailResult = await emailService.sendPayslipEmail(ps, pdfBuffer);

        // Also create in-app notification if employee has linked user account
        if (ps.employee.userId) {
          await prisma.notification.create({
            data: {
              userId: ps.employee.userId,
              type: 'PAYROLL',
              title: `Payslip Issued — ${ps.payrun?.name || 'Latest Cycle'}`,
              message: `Your net salary of ₹${parseFloat(ps.netSalary).toLocaleString('en-IN')} has been disbursed and your official Payslip PDF has been emailed to ${ps.employee.email}.`,
              emailSent: emailResult.success,
              metadata: { payslipId: ps.id, payrunId: ps.payrunId }
            }
          }).catch(() => {});
        }

        results.push({
          employeeId: ps.employeeId,
          email: ps.employee.email,
          name: `${ps.employee.firstName} ${ps.employee.lastName}`,
          payslipId: ps.id,
          netSalary: ps.netSalary,
          emailStatus: emailResult.success ? 'SENT' : 'FAILED',
          previewUrl: emailResult.previewUrl || null,
        });
      } catch (err) {
        console.error(`❌ Error generating or emailing payslip for ${ps.employee.email}:`, err.message);
        results.push({
          employeeId: ps.employeeId,
          email: ps.employee.email,
          payslipId: ps.id,
          emailStatus: 'ERROR',
          error: err.message,
        });
      }
    }

    const sentCount = results.filter(r => r.emailStatus === 'SENT').length;
    return {
      success: true,
      count: results.length,
      sentCount,
      recipients: results,
      message: `Dispatched ${sentCount} of ${results.length} payslip PDF statements via email.`
    };
  }
}

module.exports = new PayrollService();
