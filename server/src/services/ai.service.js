const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AIService {
  /**
   * ─── 1. Automated Anomaly Scanner & Cycle Health Audit ───
   */
  async auditPayrunAnomalies(payrunId) {
    const payrun = await prisma.payrun.findUnique({
      where: { id: payrunId },
      include: {
        salaryStructure: true,
        payslips: {
          include: {
            employee: {
              include: {
                department: true,
                jobPosition: true,
              },
            },
            contract: true,
            lines: true,
          },
        },
      },
    });

    if (!payrun) {
      const error = new Error('Payrun not found');
      error.statusCode = 404;
      throw error;
    }

    const payslips = payrun.payslips || [];
    const anomalies = [];
    const bankAccountMap = new Map(); // bankAccount -> [employeeName]

    let totalGross = 0;
    let totalNet = 0;
    let totalDeductions = 0;

    // Scan individual payslips
    payslips.forEach((slip) => {
      const emp = slip.employee;
      const contract = slip.contract;
      const gross = Number(slip.grossSalary || 0);
      const net = Number(slip.netSalary || 0);
      const deductions = Number(slip.totalDeductions || 0);
      const workedDays = Number(slip.workedDays || 0);
      const baseWage = Number(contract?.wage || gross || 0);

      totalGross += gross;
      totalNet += net;
      totalDeductions += deductions;

      // 1. Ghost Worker / 0 Worked Days with Full Pay
      if (workedDays <= 0 && net > 0) {
        anomalies.push({
          type: 'GHOST_WORKER_RISK',
          severity: 'HIGH',
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          department: emp.department?.name || 'General',
          description: `Zero recorded worked days (${workedDays} days) but receiving ₹${net.toLocaleString('en-IN')} net salary.`,
          amount: net,
          actionRequired: 'Verify attendance logs or unpaid leave records before approval.',
        });
      }

      // 2. Wage Spike (>20% higher than base contract wage)
      if (baseWage > 0 && net > baseWage * 1.2) {
        const pctIncrease = Math.round(((net - baseWage) / baseWage) * 100);
        anomalies.push({
          type: 'WAGE_SPIKE',
          severity: 'MEDIUM',
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          department: emp.department?.name || 'General',
          description: `Net payout is +${pctIncrease}% above contract base salary (₹${net.toLocaleString('en-IN')} vs base ₹${baseWage.toLocaleString('en-IN')}).`,
          amount: net - baseWage,
          actionRequired: 'Inspect allowances, overtime, or manual bonuses for formula accuracy.',
        });
      }

      // 3. Significant Wage Drop (>35% below base contract wage)
      if (baseWage > 0 && net < baseWage * 0.65 && workedDays > 10) {
        const pctDrop = Math.round(((baseWage - net) / baseWage) * 100);
        anomalies.push({
          type: 'WAGE_DROP',
          severity: 'LOW',
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          department: emp.department?.name || 'General',
          description: `Net payout is -${pctDrop}% below base salary despite working ${workedDays} days.`,
          amount: baseWage - net,
          actionRequired: 'Verify statutory deductions and unpaid absence penalties.',
        });
      }

      // 4. Zero or Negative Net Salary
      if (net <= 0) {
        anomalies.push({
          type: 'ZERO_OR_NEGATIVE_PAY',
          severity: 'HIGH',
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          department: emp.department?.name || 'General',
          description: `Net salary is ₹${net.toLocaleString('en-IN')}. Deductions (₹${deductions.toLocaleString('en-IN')}) equal or exceed gross pay.`,
          amount: net,
          actionRequired: 'Recalculate deductions or review contract terms immediately.',
        });
      }

      // 5. Excessive Deductions (>40% of gross)
      if (gross > 0 && deductions / gross > 0.4) {
        const dedPct = Math.round((deductions / gross) * 100);
        anomalies.push({
          type: 'EXCESSIVE_DEDUCTIONS',
          severity: 'MEDIUM',
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          department: emp.department?.name || 'General',
          description: `Statutory and company deductions total ${dedPct}% of gross salary (₹${deductions.toLocaleString('en-IN')}).`,
          amount: deductions,
          actionRequired: 'Ensure employee take-home pay complies with minimum wage statutory guidelines.',
        });
      }

      // 6. Missing Bank Account or IFSC
      if (!emp.bankAccountNumber || !emp.bankIfsc) {
        anomalies.push({
          type: 'MISSING_BANK_DETAILS',
          severity: 'MEDIUM',
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          department: emp.department?.name || 'General',
          description: `Bank account or IFSC code is missing in employee master. Direct deposit disburser will fail.`,
          amount: 0,
          actionRequired: 'Update banking profile in Employee Directory before bank batch export.',
        });
      } else {
        // Collect for duplicate check
        const key = `${emp.bankAccountNumber.trim().toLowerCase()}__${(emp.bankIfsc || '').trim().toLowerCase()}`;
        if (!bankAccountMap.has(key)) {
          bankAccountMap.set(key, []);
        }
        bankAccountMap.get(key).push({
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          employeeCode: emp.employeeCode,
          account: emp.bankAccountNumber,
        });
      }
    });

    // 7. Duplicate Bank Accounts Across Different Employees
    for (const [key, emps] of bankAccountMap.entries()) {
      if (emps.length > 1) {
        const names = emps.map((e) => `${e.employeeName} (${e.employeeCode})`).join(', ');
        emps.forEach((emp) => {
          anomalies.push({
            type: 'DUPLICATE_BANK_ACCOUNT',
            severity: 'HIGH',
            employeeId: emp.employeeId,
            employeeName: emp.employeeName,
            department: 'Compliance Risk',
            description: `Bank account (${emps[0].account}) is shared across multiple employees: ${names}.`,
            amount: 0,
            actionRequired: 'Review personnel records for ghost employee fraud or account entry errors.',
          });
        });
      }
    }

    // ── Calculate Weighted Cycle Health Score (0 - 100) ──
    let score = 100;
    anomalies.forEach((a) => {
      if (a.severity === 'HIGH') score -= 12;
      else if (a.severity === 'MEDIUM') score -= 6;
      else score -= 2;
    });
    score = Math.max(0, Math.min(100, score));

    let riskLevel = 'LOW';
    if (score < 70) riskLevel = 'HIGH';
    else if (score < 88) riskLevel = 'MEDIUM';

    // Formulate actionable recommendations
    const recommendations = [];
    if (anomalies.some((a) => a.type === 'DUPLICATE_BANK_ACCOUNT')) {
      recommendations.push('Immediate Action: Verify identical bank accounts before executing bank NEFT/IMPS transfer.');
    }
    if (anomalies.some((a) => a.type === 'GHOST_WORKER_RISK')) {
      recommendations.push('Hold payment on 0-worked-day employees pending department manager confirmation.');
    }
    if (anomalies.some((a) => a.type === 'MISSING_BANK_DETAILS')) {
      recommendations.push('Request banking mandate forms from employees flagged with missing accounts.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Cycle metrics comply with all statutory limits and organizational tolerance bands. Ready for final approval.');
    }

    return {
      payrunId,
      payrunName: payrun.name,
      periodStart: payrun.periodStart,
      periodEnd: payrun.periodEnd,
      status: payrun.status,
      healthScore: score,
      riskLevel,
      totalEmployees: payslips.length,
      totalGross,
      totalNet,
      totalDeductions,
      anomaliesCount: anomalies.length,
      highRiskCount: anomalies.filter((a) => a.severity === 'HIGH').length,
      mediumRiskCount: anomalies.filter((a) => a.severity === 'MEDIUM').length,
      anomalies,
      recommendations,
      auditedAt: new Date().toISOString(),
    };
  }

  /**
   * ─── 2. C-Suite Executive Briefing Generator ───
   */
  async generateExecutiveSummary(payrunId) {
    const audit = await this.auditPayrunAnomalies(payrunId);
    const payrun = await prisma.payrun.findUnique({
      where: { id: payrunId },
      include: {
        salaryStructure: true,
        payslips: {
          include: {
            employee: { include: { department: true } },
          },
        },
      },
    });

    const payslips = payrun.payslips || [];
    const avgSalary = payslips.length > 0 ? Math.round(audit.totalNet / payslips.length) : 0;

    // Aggregate department breakdown
    const deptTotals = {};
    payslips.forEach((s) => {
      const dName = s.employee?.department?.name || 'General';
      if (!deptTotals[dName]) deptTotals[dName] = { count: 0, cost: 0 };
      deptTotals[dName].count += 1;
      deptTotals[dName].cost += Number(s.netSalary || 0);
    });

    const deptRows = Object.entries(deptTotals)
      .map(([name, data]) => `| **${name}** | ${data.count} staff | ₹${data.cost.toLocaleString('en-IN')} | ${Math.round((data.cost / (audit.totalNet || 1)) * 100)}% |`)
      .join('\n');

    const formattedStartDate = new Date(audit.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedEndDate = new Date(audit.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const markdown = `
# 📑 Executive Payroll Briefing & Audit Report
**Cycle**: ${audit.payrunName}  
**Period**: ${formattedStartDate} — ${formattedEndDate}  
**Audit Generated**: ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}  
**Compliance Health Score**: **${audit.healthScore}% (${audit.riskLevel} RISK)**

---

### 1. Financial Snapshot
- **Total Gross Payroll**: ₹${audit.totalGross.toLocaleString('en-IN')}
- **Net Disbursed Amount**: ₹${audit.totalNet.toLocaleString('en-IN')}
- **Statutory & Other Deductions**: ₹${audit.totalDeductions.toLocaleString('en-IN')} (${Math.round((audit.totalDeductions / (audit.totalGross || 1)) * 100)}% effective deduction rate)
- **Active Staff Processed**: **${audit.totalEmployees} employees**
- **Average Net Compensation**: ₹${avgSalary.toLocaleString('en-IN')} / employee

---

### 2. Departmental Expenditure Allocation
| Business Unit | Staff Headcount | Net Payout | Total Share |
|---|:---:|:---:|:---:|
${deptRows}

---

### 3. Automated Risk & Anomaly Assessment
${audit.anomaliesCount === 0 
  ? `> 🟢 **Zero Critical Anomalies Detected.** All payslips comply with standard compensation thresholds and bank verification checks.`
  : `> ⚠️ **${audit.anomaliesCount} Total Anomalies Flagged** (${audit.highRiskCount} High Risk, ${audit.mediumRiskCount} Medium Risk).
${audit.anomalies.slice(0, 5).map(a => `- **[${a.severity}] ${a.employeeName} (${a.department})**: ${a.description}`).join('\n')}`
}

---

### 4. Strategic Governance Recommendations
${audit.recommendations.map(r => `- ${r}`).join('\n')}

---
*Signed by PeoplePay360 AI Audit Engine for Executive Sign-off.*
`;

    return {
      payrunId,
      payrunName: audit.payrunName,
      healthScore: audit.healthScore,
      riskLevel: audit.riskLevel,
      summaryMarkdown: markdown.trim(),
    };
  }

  /**
   * ─── 3. Build Comprehensive Role-Based Context ───
   */
  async buildRoleContext(user) {
    const roleName = user?.roleName || 'EMPLOYEE';
    const isSuperAdmin = (roleName === 'SUPER_ADMIN' || roleName === 'ADMIN');
    const isHR = isSuperAdmin || (roleName === 'HR_MANAGER' || roleName === 'HR_STAFF');
    const isPayroll = isSuperAdmin || (roleName === 'PAYROLL_MANAGER' || roleName === 'PAYROLL_USER');

    // 1. Fetch Self Employee Record
    let selfEmployee = null;
    if (user?.employeeId || user?.userId || user?.email) {
      const whereClause = user?.employeeId
        ? { id: user.employeeId }
        : { OR: [{ userId: user.userId || '' }, { email: user.email || '' }] };

      selfEmployee = await prisma.employee.findFirst({
        where: whereClause,
        include: {
          department: true,
          jobPosition: true,
          manager: {
            select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true }
          },
          contracts: {
            where: { status: 'ACTIVE' },
            orderBy: { startDate: 'desc' },
            take: 1,
            include: { salaryStructure: true }
          },
          payslips: {
            orderBy: { createdAt: 'desc' },
            take: 3,
            include: { payrun: true, lines: true }
          },
          leaveBalances: {
            include: { leaveType: true }
          },
          leaveRequests: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { leaveType: true }
          },
          workingSchedule: {
            include: { scheduleDays: true }
          },
          attendance: {
            orderBy: { date: 'desc' },
            take: 31
          }
        }
      });
    }

    // 2. Compute Self Attendance & Leave Stats
    let selfAttendanceStats = {
      present: 0,
      late: 0,
      absent: 0,
      halfDay: 0,
      overtimeHours: 0,
      todayStatus: 'Not Checked In',
      todayCheckIn: null,
      todayCheckOut: null,
    };

    if (selfEmployee?.attendance?.length) {
      const nowStr = new Date().toISOString().slice(0, 10);
      selfEmployee.attendance.forEach((att) => {
        const attDateStr = new Date(att.date).toISOString().slice(0, 10);
        if (attDateStr === nowStr) {
          selfAttendanceStats.todayStatus = att.status;
          selfAttendanceStats.todayCheckIn = att.checkIn ? new Date(att.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;
          selfAttendanceStats.todayCheckOut = att.checkOut ? new Date(att.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;
        }

        if (att.status === 'PRESENT') selfAttendanceStats.present++;
        else if (att.status === 'LATE') selfAttendanceStats.late++;
        else if (att.status === 'ABSENT') selfAttendanceStats.absent++;
        else if (att.status === 'HALF_DAY') selfAttendanceStats.halfDay++;

        if (att.overtimeHours) {
          selfAttendanceStats.overtimeHours += Number(att.overtimeHours || 0);
        }
      });
    }

    // 3. Line Manager Check (Subordinates)
    let directSubordinates = [];
    if (selfEmployee?.id) {
      directSubordinates = await prisma.employee.findMany({
        where: { managerId: selfEmployee.id, employmentStatus: 'ACTIVE' },
        include: {
          department: true,
          jobPosition: true,
          contracts: { where: { status: 'ACTIVE' }, take: 1 },
          leaveRequests: {
            where: { status: 'PENDING' },
            include: { leaveType: true }
          },
          attendance: {
            orderBy: { date: 'desc' },
            take: 31
          }
        }
      });
    }

    const isLineManager = directSubordinates.length > 0;
    const isManager = isLineManager || isHR || isPayroll || isSuperAdmin;
    const isEmployeeOnly = (roleName === 'EMPLOYEE' && !isLineManager);

    // 4. Team Context (For Line Managers)
    let teamContext = null;
    if (isLineManager) {
      const nowStr = new Date().toISOString().slice(0, 10);
      const teamAttendanceToday = directSubordinates.map(sub => {
        const latestAtt = sub.attendance?.[0];
        const isToday = latestAtt ? new Date(latestAtt.date).toISOString().slice(0, 10) === nowStr : false;
        return {
          id: sub.id,
          name: `${sub.firstName} ${sub.lastName}`,
          code: sub.employeeCode,
          status: isToday ? latestAtt.status : 'NO_RECORD',
          checkIn: (isToday && latestAtt.checkIn) ? new Date(latestAtt.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—',
          isLate: isToday ? latestAtt.isLate : false,
        };
      });

      const teamPendingLeaves = [];
      directSubordinates.forEach(sub => {
        (sub.leaveRequests || []).forEach(req => {
          teamPendingLeaves.push({
            employeeName: `${sub.firstName} ${sub.lastName}`,
            leaveType: req.leaveType?.name || 'General Leave',
            durationDays: Number(req.durationDays || 1),
            startDate: new Date(req.startDate).toISOString().slice(0, 10),
            endDate: new Date(req.endDate).toISOString().slice(0, 10),
            reason: req.reason || 'Not specified',
          });
        });
      });

      teamContext = {
        subordinatesCount: directSubordinates.length,
        subordinates: directSubordinates.map(s => {
          let pres = 0, late = 0, abs = 0, ot = 0;
          (s.attendance || []).forEach(a => {
            if (a.status === 'PRESENT') pres++;
            else if (a.status === 'LATE') late++;
            else if (a.status === 'ABSENT') abs++;
            if (a.overtimeHours) ot += Number(a.overtimeHours || 0);
          });
          return {
            id: s.id,
            employeeCode: s.employeeCode,
            name: `${s.firstName} ${s.lastName}`,
            department: s.department?.name || 'General',
            designation: s.jobPosition?.title || 'Staff Member',
            email: s.email,
            attendanceStats: { present: pres, late, absent: abs, overtimeHours: ot },
          };
        }),
        teamAttendanceToday,
        teamPendingLeaves,
      };
    }

    // 5. Organizational & Payroll Context
    let orgContext = null;
    let payrollContext = null;

    const [empCount, deptCounts] = await Promise.all([
      prisma.employee.count({ where: { employmentStatus: 'ACTIVE' } }),
      prisma.department.findMany({
        include: { _count: { select: { employees: true } } }
      }),
    ]);

    let activeContracts = 0;
    let pendingLeavesCount = 0;
    if (isHR || isPayroll || isSuperAdmin) {
      [activeContracts, pendingLeavesCount] = await Promise.all([
        prisma.contract.count({ where: { status: 'ACTIVE' } }),
        prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      ]);
    }

    orgContext = {
      totalActiveStaff: empCount,
      departments: deptCounts.map(d => ({ name: d.name, staffCount: d._count.employees })),
      activeContractsCount: activeContracts,
      pendingLeavesCount,
    };

    if (isPayroll || isSuperAdmin) {
      const latestPayrun = await prisma.payrun.findFirst({
        orderBy: { createdAt: 'desc' },
        include: {
          payslips: {
            include: {
              employee: { include: { department: true } },
            },
          },
        },
      });

      const payslips = latestPayrun?.payslips || [];
      const totalNet = payslips.reduce((sum, s) => sum + Number(s.netSalary || 0), 0);
      const totalGross = payslips.reduce((sum, s) => sum + Number(s.grossSalary || 0), 0);
      const avgSalary = payslips.length > 0 ? Math.round(totalNet / payslips.length) : 0;

      const topEarners = [...payslips]
        .sort((a, b) => Number(b.netSalary || 0) - Number(a.netSalary || 0))
        .slice(0, 5)
        .map(s => ({
          name: `${s.employee.firstName} ${s.employee.lastName}`,
          code: s.employee.employeeCode,
          department: s.employee.department?.name || 'General',
          netSalary: Number(s.netSalary || 0),
        }));

      payrollContext = {
        activePayrunName: latestPayrun?.name || 'Current Period',
        payrunStatus: latestPayrun?.status || 'UNKNOWN',
        totalNet,
        totalGross,
        avgSalary,
        payslipsCount: payslips.length,
        topEarners,
      };
    }

    return {
      roleName,
      isSuperAdmin,
      isHR,
      isPayroll,
      isLineManager,
      isManager,
      isEmployeeOnly,
      selfEmployee,
      selfAttendanceStats,
      teamContext,
      orgContext,
      payrollContext,
    };
  }

  /**
   * ─── 4. Gemini Generative AI Call with Strict Role Privacy ───
   */
  async callGemini(prompt, ctx, user) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 15 || apiKey === 'YOUR_GEMINI_API_KEY') {
      return null;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;

      // Build personalized, role-bounded system instruction
      let systemInstruction = `You are PayPilot AI Copilot in PeoplePay360, an enterprise HRMS & Payroll system.
You are an intelligent, helpful, professional, and courteous AI assistant.

AUTHENTICATED USER:
- Name: ${user?.employeeName || (ctx.selfEmployee ? `${ctx.selfEmployee.firstName} ${ctx.selfEmployee.lastName}` : user?.email || 'User')}
- Role: "${ctx.roleName}"
- Line Manager: ${ctx.isLineManager ? 'YES (Has Direct Subordinates)' : 'NO'}

PERMISSIONS & CONFIDENTIALITY BOUNDARIES:
1. Pure Employee Scope:
   - If user is an EMPLOYEE (and not a line manager), they are strictly RESTRICTED to their own profile, attendance, leave balances, contracts, and payslips.
   - If an employee asks for another employee's salary or personal records, REFUSE: "In accordance with company privacy and HR data protection policies, employees cannot access or view other staff members' compensation or personal records."
   - Employees cannot view executive organization-wide payroll totals or audit anomaly scores.
2. Manager Scope:
   - Line managers can view their own details and information about their DIRECT REPORTS (subordinates listed below in TEAM CONTEXT).
   - Managers CANNOT view salaries or confidential records of employees outside their direct reporting line unless they hold HR/Admin roles.
3. HR & Payroll Scope:
   - HR & Payroll specialists can access organization-wide summaries, directory lookups, and payroll metrics appropriate to their role.
4. Scope Restriction:
   - Only answer questions related to PeoplePay360: HR operations, attendance, leaves, payroll processing, salary structures, contracts, and statutory taxes (PF, ESI, TDS).
   - REFUSE general questions outside HR/Payroll (e.g. general programming, sports, movies, weather) with: "⚠️ **Out of Scope**: I am PayPilot AI Copilot, specialized exclusively in **PeoplePay360 HR & Payroll Management**."

DATA CONTEXT AVAILABLE FOR THIS USER:
`;

      // Inject Self Data
      if (ctx.selfEmployee) {
        const contract = ctx.selfEmployee.contracts?.[0];
        const latestSlip = ctx.selfEmployee.payslips?.[0];
        const baseWage = Number(contract?.wage || contract?.basicWage || latestSlip?.grossSalary || 0);
        const netPay = Number(latestSlip?.netSalary || baseWage || 0);

        systemInstruction += `
USER SELF-DATA:
- Full Name: ${ctx.selfEmployee.firstName} ${ctx.selfEmployee.lastName}
- Employee Code: ${ctx.selfEmployee.employeeCode}
- Title / Designation: ${ctx.selfEmployee.jobPosition?.title || 'Staff Member'}
- Department: ${ctx.selfEmployee.department?.name || 'General Operations'}
- Manager: ${ctx.selfEmployee.manager ? `${ctx.selfEmployee.manager.firstName} ${ctx.selfEmployee.manager.lastName}` : 'Executive Leadership'}
- Base Contract Wage: ₹${baseWage.toLocaleString('en-IN')} / month
- Latest Net Disbursed Take-Home: ₹${netPay.toLocaleString('en-IN')} (${latestSlip?.payrun?.name || 'Current Period'})
- Attendance (Last 30 days): ${ctx.selfAttendanceStats.present} Present, ${ctx.selfAttendanceStats.late} Late, ${ctx.selfAttendanceStats.absent} Absent, ${ctx.selfAttendanceStats.overtimeHours} hrs Overtime
- Today's Punch: ${ctx.selfAttendanceStats.todayStatus} (Check-in: ${ctx.selfAttendanceStats.todayCheckIn || 'None'})
- Leave Balances: ${(ctx.selfEmployee.leaveBalances || []).map(b => `${b.leaveType?.name}: ${Number(b.remaining)} remaining (allocated ${Number(b.allocated)}, taken ${Number(b.taken)})`).join('; ') || 'No leave balances configured'}
`;
      }

      // Inject Team Data (for Line Managers)
      if (ctx.isLineManager && ctx.teamContext) {
        systemInstruction += `
TEAM CONTEXT (User's Direct Reports):
- Team Size: ${ctx.teamContext.subordinatesCount} members
- Direct Reports: ${ctx.teamContext.subordinates.map(s => `${s.name} (${s.employeeCode} - ${s.designation}, ${s.department})`).join(', ')}
- Team Attendance Today: ${ctx.teamContext.teamAttendanceToday.map(t => `${t.name}: ${t.status} (In: ${t.checkIn})`).join('; ')}
- Pending Team Leaves: ${ctx.teamContext.teamPendingLeaves.length ? ctx.teamContext.teamPendingLeaves.map(l => `${l.employeeName} (${l.leaveType}, ${l.durationDays} days from ${l.startDate})`).join('; ') : 'None'}
`;
      }

      // Inject Org Context (for HR / Payroll)
      if (ctx.orgContext) {
        systemInstruction += `
ORGANIZATION HR CONTEXT:
- Total Active Staff: ${ctx.orgContext.totalActiveStaff}
- Active Contracts: ${ctx.orgContext.activeContractsCount}
- Departments: ${ctx.orgContext.departments.map(d => `${d.name} (${d.staffCount} staff)`).join(', ')}
- Company-wide Pending Leave Requests: ${ctx.orgContext.pendingLeavesCount}
`;
      }

      // Inject Payroll Context (for Payroll / Super Admin)
      if (ctx.payrollContext) {
        systemInstruction += `
PAYROLL & FINANCIAL CONTEXT:
- Active Payrun: "${ctx.payrollContext.activePayrunName}" (Status: ${ctx.payrollContext.payrunStatus})
- Total Net Disbursed: ₹${ctx.payrollContext.totalNet.toLocaleString('en-IN')}
- Total Gross Monthly Payroll: ₹${ctx.payrollContext.totalGross.toLocaleString('en-IN')}
- Average Take-Home Pay: ₹${ctx.payrollContext.avgSalary.toLocaleString('en-IN')}
- Processed Payslips: ${ctx.payrollContext.payslipsCount}
- Top 5 Earners: ${ctx.payrollContext.topEarners.map(e => `${e.name} (₹${e.netSalary.toLocaleString('en-IN')})`).join(', ')}
`;
      }

      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nUSER QUESTION: ${prompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        console.warn(`[Gemini API Warning] HTTP ${res.status}: Falling back to local rule-based engine.`);
        return null;
      }

      const json = await res.json();
      const answer = json.candidates?.[0]?.content?.parts?.[0]?.text;
      return answer ? answer.trim() : null;
    } catch (err) {
      console.warn('[Gemini API Notice] Fallback triggered:', err.message);
      return null;
    }
  }

  /**
   * ─── 5. Natural Language Assistant Engine (Role-Aware Hybrid Intelligence) ───
   */
  async askCopilot(prompt, user) {
    const q = (prompt || '').trim().toLowerCase();
    const ctx = await this.buildRoleContext(user);

    // ── SCOPE GUARD: Strictly refuse non-project topics ──
    const outOfScopePatterns = ['java', 'python', 'c++', 'javascript', 'c#', 'php', 'golang', 'rust', 'ruby', 'weather', 'recipe', 'movie', 'cricket', 'football', 'bitcoin', 'crypto', 'game', 'song', 'capital of', 'who is president'];
    if (outOfScopePatterns.some(p => q.includes(p))) {
      return {
        answer: `⚠️ **Out of Scope**: I am PayPilot AI Copilot, specialized exclusively in **PeoplePay360 HR & Payroll Management**.

I cannot answer questions outside the scope of our HR and payroll platform.

**You can ask me questions about:**
${ctx.isEmployeeOnly ? `- Your personal compensation & payslips (*"What is my salary?"*)
- Your attendance logs and punctuality (*"What is my attendance summary?"*)
- Your leave balances & vacation time (*"What is my leave balance?"*)
- Your manager & profile details (*"Summarize my information"*)` : ctx.isLineManager ? `- Your direct team members and reports (*"Summarize my team"*)
- Team attendance today (*"Who is present today?"*)
- Pending team leave requests (*"Show pending team leaves"*)
- Your own personal profile and compensation` : `- Organization payroll expenditure and active cycles
- Department-wise compensation breakdowns
- Employee directory lookups and staff profiles
- Payroll anomaly audits and statutory deductions`}`,
        suggestedActions: this.getSuggestedActionsForRole(ctx),
      };
    }

    // ── PRIVACY GUARD 1: Pure Employee Asking for Another Employee's Data ──
    if (ctx.isEmployeeOnly) {
      const isAskingOtherSalary = (
        q.includes('salary of') ||
        q.includes('pay of') ||
        q.includes('wage of') ||
        q.includes('compensation of') ||
        q.includes('who earns') ||
        q.includes('highest earner') ||
        q.includes('top earner') ||
        q.includes('top 5') ||
        q.includes('who makes the most') ||
        q.includes('other employee')
      );

      const otherEmps = await prisma.employee.findMany({
        where: ctx.selfEmployee?.id ? { id: { not: ctx.selfEmployee.id } } : {},
        select: { firstName: true, lastName: true },
        take: 200
      });

      const mentionsOtherPerson = otherEmps.some(e => {
        const fn = (e.firstName || '').toLowerCase().trim();
        const ln = (e.lastName || '').toLowerCase().trim();
        return (fn.length >= 3 && q.includes(fn)) || (ln.length >= 3 && q.includes(ln));
      });

      if (isAskingOtherSalary || mentionsOtherPerson) {
        return {
          answer: `### 🔒 Confidentiality & Privacy Notice
In accordance with company data protection policies and HR confidentiality guidelines, **employees cannot access or view the salary, compensation, or personal records of other employees**.

You are authorized to view and inquire about your own employment, salary, attendance, and leave information.

*Tip: Try asking **"Summarize my information"** or **"What is my salary?"** to view your personal records.*`,
          suggestedActions: this.getSuggestedActionsForRole(ctx),
        };
      }

      // PRIVACY GUARD 2: Pure Employee Asking for Company Financials
      if (q.includes('total payroll') || q.includes('total spend') || q.includes('company budget') || q.includes('executive summary') || q.includes('anomalies')) {
        return {
          answer: `### 🔒 Access Restricted
Organization-wide payroll aggregates, audit anomaly reports, and executive summaries are confidential to **HR & Payroll Managers**.

As an employee, you can ask about:
- Your own compensation (*"What is my salary?"*)
- Your attendance logs (*"What is my attendance this month?"*)
- Your leave entitlements (*"What is my leave balance?"*)
- Your profile details (*"Summarize my information"*)`,
          suggestedActions: this.getSuggestedActionsForRole(ctx),
        };
      }
    }

    // ── PRIVACY GUARD 3: Line Manager Querying Employees Outside Their Team ──
    if (ctx.isLineManager && !ctx.isHR && !ctx.isPayroll && !ctx.isSuperAdmin) {
      if (q.includes('salary of') || q.includes('profile of') || q.includes('summarize employee') || q.includes('who is')) {
        const allOtherEmps = await prisma.employee.findMany({
          where: {
            AND: [
              { managerId: { not: ctx.selfEmployee.id } },
              { id: { not: ctx.selfEmployee.id } }
            ]
          },
          select: { firstName: true, lastName: true }
        });

        const mentionsOutsidePerson = allOtherEmps.some(e => {
          const fn = (e.firstName || '').toLowerCase().trim();
          const ln = (e.lastName || '').toLowerCase().trim();
          return (fn.length >= 3 && q.includes(fn)) || (ln.length >= 3 && q.includes(ln));
        });

        if (mentionsOutsidePerson) {
          return {
            answer: `### 🔒 Managerial Scope Boundary
As a line manager, your administrative access is scoped exclusively to **your direct reporting team**. You cannot view details or compensation for staff members outside your department / team.

*Tip: You can ask **"Summarize my team"** to inspect members of your reporting line.*`,
            suggestedActions: this.getSuggestedActionsForRole(ctx),
          };
        }
      }
    }

    // ── PRIMARY ENGINE: Gemini Generative AI ──
    const geminiAnswer = await this.callGemini(prompt, ctx, user);
    if (geminiAnswer) {
      return {
        answer: geminiAnswer,
        suggestedActions: this.getSuggestedActionsForRole(ctx),
      };
    }

    // ── LOCAL RESILIENT ENGINE (Zero-Gemini Fallback) ──
    const selfEmp = ctx.selfEmployee;
    const contract = selfEmp?.contracts?.[0];
    const latestSlip = selfEmp?.payslips?.[0];
    const baseWage = Number(contract?.wage || contract?.basicWage || latestSlip?.grossSalary || 0);
    const netPay = Number(latestSlip?.netSalary || baseWage || 0);
    const cycleName = latestSlip?.payrun?.name || 'Current Active Cycle';

    // ── 1. EMPLOYEE SELF: Summarize Profile / Personal Information ──
    if (
      q.includes('summarize my info') ||
      q.includes('summarize my information') ||
      q.includes('my profile') ||
      q.includes('who am i') ||
      q.includes('about me') ||
      q.includes('my details')
    ) {
      const leaveSummary = (selfEmp?.leaveBalances || []).map(b => `${b.leaveType?.name}: **${Number(b.remaining)}** remaining`).join(', ') || 'Standard annual quota';
      const scheduleName = selfEmp?.workingSchedule?.name || 'Standard 9-to-6';

      return {
        answer: `### 👤 Employee Profile Summary: ${selfEmp ? `${selfEmp.firstName} ${selfEmp.lastName}` : (user.employeeName || 'Staff Member')}
- **Staff ID**: \`${selfEmp?.employeeCode || 'EMP-XXXX'}\`
- **Designation**: **${selfEmp?.jobPosition?.title || 'Staff Member'}**
- **Department**: **${selfEmp?.department?.name || 'General Operations'}**
- **Reporting Manager**: **${selfEmp?.manager ? `${selfEmp.manager.firstName} ${selfEmp.manager.lastName}` : 'Executive Leadership'}**
- **Employment Status**: \`${selfEmp?.employmentStatus || 'ACTIVE'}\` (${selfEmp?.employmentType || 'FULL_TIME'})
- **Email / Phone**: ${selfEmp?.email || user.email} | ${selfEmp?.phone || 'Not recorded'}

---
#### 💼 Compensation & Active Contract
- **Base Monthly Wage**: **₹${baseWage.toLocaleString('en-IN')}**
- **Latest Net Disbursed**: **₹${netPay.toLocaleString('en-IN')}** (${cycleName})
- **Contract Wage Type**: ${contract?.wageType || 'MONTHLY'}

---
#### ⏰ Attendance (Last 30 Days)
- **Present**: **${ctx.selfAttendanceStats.present} days** | **Late**: **${ctx.selfAttendanceStats.late} days** | **Absent**: **${ctx.selfAttendanceStats.absent} days**
- **Overtime Logged**: **${ctx.selfAttendanceStats.overtimeHours} hrs**
- **Today's Status**: **${ctx.selfAttendanceStats.todayStatus}** ${ctx.selfAttendanceStats.todayCheckIn ? `(Checked in at ${ctx.selfAttendanceStats.todayCheckIn})` : ''}

---
#### 🌴 Leave Quota Balances
- ${leaveSummary}
- **Work Schedule**: ${scheduleName}`,
        suggestedActions: [
          { label: '💰 Salary Breakdown', query: 'What is my salary breakdown?' },
          { label: '⏰ My Attendance Logs', path: '/attendance' },
          { label: '🌴 Request Time Off', path: '/leave' },
          { label: '📄 View My Payslips', path: '/payslips' },
        ],
      };
    }

    // ── 2. EMPLOYEE SELF: Salary & Compensation ──
    if (
      q.includes('my salary') ||
      q.includes('my pay') ||
      q.includes('my wage') ||
      q.includes('my compensation') ||
      q.includes('how much do i make') ||
      q.includes('how much do i earn') ||
      q.includes('my take home') ||
      q.includes('salary breakdown')
    ) {
      const gross = Number(latestSlip?.grossSalary || baseWage || 0);
      const deductions = Number(latestSlip?.totalDeductions || 0);

      return {
        answer: `### 💼 Compensation & Salary Breakdown
Hello **${selfEmp ? `${selfEmp.firstName} ${selfEmp.lastName}` : (user.employeeName || 'Staff Member')}** (\`${selfEmp?.employeeCode || 'EMP-XXXX'}\`):

- **Designation**: **${selfEmp?.jobPosition?.title || 'Staff Member'}** (${selfEmp?.department?.name || 'General Operations'})
- **Contract Base Monthly Wage**: **₹${baseWage.toLocaleString('en-IN')}**
- **Latest Gross Earnings**: **₹${gross.toLocaleString('en-IN')}**
- **Total Statutory & Other Deductions**: **₹${deductions.toLocaleString('en-IN')}**
- **Latest Net Disbursed Take-Home**: **₹${netPay.toLocaleString('en-IN')}** (${cycleName})
- **Contract Status**: \`${contract?.status || 'ACTIVE'}\`

You can review your detailed payslips and monthly tax deduction breakdowns in the **[My Payslips](/payslips)** section.`,
        suggestedActions: [
          { label: '📄 View My Payslips', path: '/payslips' },
          { label: '⏰ My Attendance', path: '/attendance' },
          { label: '🌴 My Leave Balance', query: 'What is my leave balance?' },
        ],
      };
    }

    // ── 3. EMPLOYEE SELF: Attendance ──
    if (
      q.includes('my attendance') ||
      q.includes('attendance summary') ||
      q.includes('how many days worked') ||
      q.includes('attendance logs') ||
      q.includes('am i present')
    ) {
      return {
        answer: `### ⏰ Attendance & Time Tracking Summary
Attendance metrics for **${selfEmp?.firstName || 'Staff Member'}** (Last 30 Recorded Days):

- **Today's Status**: **${ctx.selfAttendanceStats.todayStatus}**
  - **Check-In Time**: ${ctx.selfAttendanceStats.todayCheckIn || 'Not recorded'}
  - **Check-Out Time**: ${ctx.selfAttendanceStats.todayCheckOut || 'Not checked out yet'}
- **Present Days**: **${ctx.selfAttendanceStats.present} days**
- **Late Arrivals**: **${ctx.selfAttendanceStats.late} days**
- **Absences**: **${ctx.selfAttendanceStats.absent} days**
- **Half Days**: **${ctx.selfAttendanceStats.halfDay} days**
- **Total Overtime Logged**: **${ctx.selfAttendanceStats.overtimeHours} hours**
- **Working Schedule**: **${selfEmp?.workingSchedule?.name || 'Standard 9-to-6'}**`,
        suggestedActions: [
          { label: '⏰ Open Attendance Log', path: '/attendance' },
          { label: '🌴 Check Leave Balance', query: 'What is my leave balance?' },
          { label: '👤 Profile Summary', query: 'Summarize my information' },
        ],
      };
    }

    // ── 4. EMPLOYEE SELF: Leave Balances & Requests ──
    if (
      q.includes('my leave') ||
      q.includes('leave balance') ||
      q.includes('time off') ||
      q.includes('vacation') ||
      q.includes('remaining leaves')
    ) {
      const balances = selfEmp?.leaveBalances || [];
      const balanceRows = balances.map(b => `- **${b.leaveType?.name}**: **${Number(b.remaining)} days remaining** (Allocated: ${Number(b.allocated)}d | Used: ${Number(b.taken)}d)`).join('\n');

      const recentRequests = selfEmp?.leaveRequests || [];
      const requestRows = recentRequests.slice(0, 3).map(r => `- ${r.leaveType?.name}: **${r.status}** (${Number(r.durationDays)}d from ${new Date(r.startDate).toLocaleDateString('en-IN')})`).join('\n');

      return {
        answer: `### 🌴 Leave Balance & Entitlements
Here is your current leave entitlement status:

${balanceRows || '- Standard Annual Quota assigned.'}

${recentRequests.length ? `---
#### Recent Leave Requests
${requestRows}` : ''}

You can apply for new leave or check your historical requests in the **[Leave Management](/leave)** section.`,
        suggestedActions: [
          { label: '🌴 Apply for Leave', path: '/leave' },
          { label: '⏰ View Attendance', path: '/attendance' },
          { label: '👤 Profile Summary', query: 'Summarize my information' },
        ],
      };
    }

    // ── 5. EMPLOYEE SELF: Reporting Manager ──
    if (q.includes('who is my manager') || q.includes('reporting manager') || q.includes('who do i report to')) {
      const mgr = selfEmp?.manager;
      return {
        answer: `### 👔 Reporting Hierarchy
${mgr ? `- **Reporting Manager**: **${mgr.firstName} ${mgr.lastName}**
- **Staff ID**: \`${mgr.employeeCode}\`
- **Email**: ${mgr.email}
- **Direct Reports Relationship**: Active` : `You currently report directly to **Executive Leadership / Human Resources**.`}`,
        suggestedActions: [
          { label: '👤 Profile Summary', query: 'Summarize my information' },
          { label: '💰 Check My Salary', query: 'What is my salary?' },
        ],
      };
    }

    // ── 5.5. MANAGER / HR: Specific Employee Attendance Query ──
    const isQueryingSpecificAttendance = (
      q.includes('attendance') && (
        q.includes(' of ') ||
        q.includes(' for ') ||
        q.includes('employee') ||
        q.includes('staff') ||
        q.includes('data of')
      )
    );

    if ((ctx.isManager || ctx.isHR) && isQueryingSpecificAttendance) {
      const attMatch = q.match(/(?:give|show|get|display|check|what is)?\s*(?:the\s+)?attendance(?:\s+data|\s+records?|\s+logs?|\s+status|\s+summary)?\s+(?:of|for)\s+(?:employee\s+)?["']?([^"'\?]+)["']?/i) ||
                       q.match(/how is\s+(?:employee\s+)?["']?([^"'\?]+)["']?['’]s?\s+attendance/i);
      
      const searchTarget = attMatch ? attMatch[1].trim().replace(/['"]/g, '') : '';
      if (searchTarget) {
        const parts = searchTarget.split(/\s+/).filter(Boolean);
        const orConditions = [
          { firstName: { contains: searchTarget } },
          { lastName: { contains: searchTarget } },
          { employeeCode: { contains: searchTarget } },
        ];
        if (parts.length >= 2) {
          orConditions.push({
            AND: [
              { firstName: { contains: parts[0] } },
              { lastName: { contains: parts[1] } },
            ]
          });
        }

        const foundEmp = await prisma.employee.findFirst({
          where: { OR: orConditions },
          include: {
            department: true,
            jobPosition: true,
            manager: true,
            attendance: { orderBy: { date: 'desc' }, take: 31 }
          }
        });

        if (foundEmp) {
          const isDirectReport = ctx.teamContext?.subordinates?.some(s => s.id === foundEmp.id);
          if (ctx.isLineManager && !ctx.isHR && !ctx.isSuperAdmin && !isDirectReport) {
            return {
              answer: `### 🔒 Scope Notice\n**${foundEmp.firstName} ${foundEmp.lastName}** is not in your direct reporting team. Line managers can only access attendance records for their direct subordinates.`,
              suggestedActions: this.getSuggestedActionsForRole(ctx),
            };
          }

          let pres = 0, late = 0, abs = 0, half = 0, ot = 0;
          let todayStatus = 'Not Checked In';
          let todayCheckIn = null;
          let todayCheckOut = null;
          const nowStr = new Date().toISOString().slice(0, 10);

          (foundEmp.attendance || []).forEach((att) => {
            const attDateStr = new Date(att.date).toISOString().slice(0, 10);
            if (attDateStr === nowStr) {
              todayStatus = att.status;
              todayCheckIn = att.checkIn ? new Date(att.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;
              todayCheckOut = att.checkOut ? new Date(att.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;
            }

            if (att.status === 'PRESENT') pres++;
            else if (att.status === 'LATE') late++;
            else if (att.status === 'ABSENT') abs++;
            else if (att.status === 'HALF_DAY') half++;

            if (att.overtimeHours) {
              ot += Number(att.overtimeHours || 0);
            }
          });

          const recentLogs = (foundEmp.attendance || []).slice(0, 5).map(a => {
            const d = new Date(a.date).toLocaleDateString('en-IN');
            const inTime = a.checkIn ? new Date(a.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
            const outTime = a.checkOut ? new Date(a.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
            return `- **${d}**: \`${a.status}\` | In: ${inTime} | Out: ${outTime}`;
          }).join('\n');

          return {
            answer: `### ⏰ Attendance Dossier: ${foundEmp.firstName} ${foundEmp.lastName}
- **Staff ID**: \`${foundEmp.employeeCode}\`
- **Designation**: **${foundEmp.jobPosition?.title || 'Staff Member'}** (${foundEmp.department?.name || 'General Operations'})
- **Reporting Line**: ${foundEmp.manager ? `Reports to **${foundEmp.manager.firstName} ${foundEmp.manager.lastName}**` : 'Executive Leadership'}
- **Today's Status**: **${todayStatus}** ${todayCheckIn ? `(Checked in at ${todayCheckIn})` : ''}

---
#### 📊 Last 30 Recorded Days
- **Present Days**: **${pres} days**
- **Late Arrivals**: **${late} days**
- **Absences**: **${abs} days**
- **Half Days**: **${half} days**
- **Total Overtime Logged**: **${Number(ot || 0).toFixed(1)} hours**

${recentLogs ? `---
#### 📅 Recent Punch History
${recentLogs}` : ''}`,
            suggestedActions: [
              { label: '⏰ Open Attendance Portal', path: '/attendance' },
              { label: '👥 Team Roster', query: 'Summarize my team' },
              { label: '🌴 Team Leaves', query: 'Show pending team leave requests' },
            ],
          };
        }
      }
    }

    // ── 6. MANAGER: Team Attendance Today ──
    if (
      ctx.isLineManager && (
        q.includes('attendance') ||
        q.includes('who is present today') ||
        q.includes('who is late') ||
        q.includes('team check in')
      )
    ) {
      const attRows = (ctx.teamContext?.teamAttendanceToday || []).map(t => {
        let badge = '⚪ Not Checked In';
        if (t.status === 'PRESENT') badge = '🟢 Present';
        else if (t.status === 'LATE') badge = '🟡 Late Arrival';
        else if (t.status === 'ABSENT') badge = '🔴 Absent';
        return `- **${t.name}** (\`${t.code}\`): ${badge} ${t.checkIn !== '—' ? `*(In: ${t.checkIn})*` : ''}`;
      }).join('\n');

      return {
        answer: `### ⏰ Team Attendance Status Today
Live attendance check-in status for your direct reporting members:

${attRows || 'No attendance records logged for today.'}

---
You can perform manual corrections or review historical monthly punches in the **[Attendance Management](/attendance)** portal.`,
        suggestedActions: [
          { label: '⏰ Open Attendance Page', path: '/attendance' },
          { label: '🌴 Pending Team Leaves', query: 'Show pending team leave requests' },
          { label: '👥 Team Roster', query: 'Summarize my team' },
        ],
      };
    }

    // ── 7. MANAGER: Team Pending Leave Requests ──
    if (
      ctx.isLineManager && (
        q.includes('leave') ||
        q.includes('time off') ||
        q.includes('vacation') ||
        q.includes('approval')
      )
    ) {
      const pendingLeaves = ctx.teamContext?.teamPendingLeaves || [];
      const leaveRows = pendingLeaves.length
        ? pendingLeaves.map((l, i) => `${i + 1}. **${l.employeeName}** — **${l.leaveType}** (${l.durationDays} day(s) from \`${l.startDate}\` to \`${l.endDate}\`)\n   *Reason*: ${l.reason}`).join('\n\n')
        : '🎉 **No pending leave requests** from your direct team members.';

      return {
        answer: `### 🌴 Team Leave Requests Awaiting Approval
${leaveRows}

You can approve or reject team leave requests in the **[Leave Management](/leave)** section.`,
        suggestedActions: [
          { label: '🌴 Go to Leave Approvals', path: '/leave' },
          { label: '⏰ Team Attendance', query: 'What is my team attendance today?' },
          { label: '👥 Team Roster', query: 'Summarize my team' },
        ],
      };
    }

    // ── 8. MANAGER: Team Summary & Direct Reports ──
    if (
      ctx.isLineManager && (
        q.includes('team') ||
        q.includes('who reports to me') ||
        q.includes('direct report') ||
        q.includes('subordinate') ||
        q.includes('roster')
      )
    ) {
      const subs = ctx.teamContext?.subordinates || [];
      const subRows = subs.map((s, idx) => `${idx + 1}. **${s.name}** (\`${s.employeeCode}\`) — **${s.designation}** | *${s.department}* (${s.email})`).join('\n');

      return {
        answer: `### 👥 Your Direct Reporting Team (${subs.length} Members)
You are the direct reporting manager for the following staff members:

${subRows}

---
*Tip: Ask **"What is my team attendance today?"** or **"Show pending team leaves"** to manage your squad.*`,
        suggestedActions: [
          { label: '⏰ Team Attendance Today', query: 'What is my team attendance today?' },
          { label: '🌴 Pending Team Leaves', query: 'Show pending team leave requests' },
          { label: '👤 My Own Profile', query: 'Summarize my information' },
        ],
      };
    }

    // ── 9. MANAGER / HR: Querying Specific Employee Details ──
    if (
      (ctx.isManager || ctx.isHR) && (
        q.includes('summarize employee') ||
        q.includes('profile of') ||
        q.includes('details of') ||
        q.includes('who is')
      )
    ) {
      const match = q.match(/(?:summarize employee|profile of|details of|who is)\s+["']?([^"'\?]+)["']?/i);
      const searchTarget = match ? match[1].trim().replace(/['"]/g, '') : '';

      if (searchTarget) {
        const parts = searchTarget.split(/\s+/).filter(Boolean);
        const orConditions = [
          { firstName: { contains: searchTarget } },
          { lastName: { contains: searchTarget } },
          { employeeCode: { contains: searchTarget } },
        ];
        if (parts.length >= 2) {
          orConditions.push({
            AND: [
              { firstName: { contains: parts[0] } },
              { lastName: { contains: parts[1] } },
            ]
          });
        }

        const foundEmp = await prisma.employee.findFirst({
          where: { OR: orConditions },
          include: {
            department: true,
            jobPosition: true,
            manager: true,
            contracts: { where: { status: 'ACTIVE' }, take: 1 },
            payslips: { orderBy: { createdAt: 'desc' }, take: 1, include: { payrun: true } },
            leaveBalances: { include: { leaveType: true } },
            attendance: { orderBy: { date: 'desc' }, take: 1 }
          }
        });

        if (foundEmp) {
          // Check if line manager is authorized to see this employee
          const isDirectReport = ctx.teamContext?.subordinates?.some(s => s.id === foundEmp.id);
          if (ctx.isLineManager && !ctx.isHR && !ctx.isSuperAdmin && !isDirectReport) {
            return {
              answer: `### 🔒 Scope Notice
**${foundEmp.firstName} ${foundEmp.lastName}** is not in your direct reporting team. Line managers can only access records for their direct subordinates.`,
              suggestedActions: this.getSuggestedActionsForRole(ctx),
            };
          }

          const empContract = foundEmp.contracts?.[0];
          const empWage = Number(empContract?.wage || empContract?.basicWage || 0);
          const empSlip = foundEmp.payslips?.[0];
          const empNet = Number(empSlip?.netSalary || empWage || 0);

          return {
            answer: `### 👤 Staff Dossier: ${foundEmp.firstName} ${foundEmp.lastName}
- **Staff ID**: \`${foundEmp.employeeCode}\`
- **Designation**: **${foundEmp.jobPosition?.title || 'Staff Member'}**
- **Department**: **${foundEmp.department?.name || 'General Operations'}**
- **Direct Manager**: ${foundEmp.manager ? `${foundEmp.manager.firstName} ${foundEmp.manager.lastName}` : 'Executive Leadership'}
- **Employment Status**: \`${foundEmp.employmentStatus}\` (${foundEmp.employmentType})
- **Work Email**: ${foundEmp.email}
${(ctx.isPayroll || ctx.isSuperAdmin) ? `- **Base Monthly Wage**: **₹${empWage.toLocaleString('en-IN')}**
- **Latest Net Disbursed**: **₹${empNet.toLocaleString('en-IN')}** (${empSlip?.payrun?.name || 'Current Period'})` : ''}
- **Today's Attendance**: ${foundEmp.attendance?.[0] ? foundEmp.attendance[0].status : 'No record today'}`,
            suggestedActions: [
              { label: '👥 Directory Record', path: '/employees' },
              { label: '⏰ Attendance Portal', path: '/attendance' },
            ],
          };
        }
      }
    }

    // ── 10. HR / ADMIN / ORG: Headcount, Total Employees & Department Distribution ──
    const isHeadcountQuery = 
      q.includes('headcount') ||
      q.includes('head count') ||
      q.includes('total staff') ||
      q.includes('department distribution') ||
      q.includes('number of employee') ||
      q.includes('total employee') ||
      q.includes('count of employee') ||
      q.includes('how many employee') ||
      q.includes('how many staff') ||
      q.includes('employee count') ||
      q.includes('workforce') ||
      q.includes('active employee') ||
      q.includes('all employee') ||
      q.includes('departments') ||
      q.includes('company size');

    if ((ctx.isHR || ctx.isPayroll || ctx.isSuperAdmin) && isHeadcountQuery) {
      const depts = ctx.orgContext?.departments || [];
      const deptRows = depts.map(d => `- **${d.name}**: **${d.staffCount} staff members**`).join('\n');

      return {
        answer: `### 📊 Organization Headcount & Department Distribution
- **Total Active Personnel**: **${ctx.orgContext?.totalActiveStaff || 0} employees**
- **Active Employment Contracts**: **${ctx.orgContext?.activeContractsCount || 0} active**
- **Pending Leave Approvals Across Company**: **${ctx.orgContext?.pendingLeavesCount || 0} requests**

---
#### Department Breakdown
${deptRows || 'No departments recorded.'}`,
        suggestedActions: [
          { label: '👥 Open Employee Directory', path: '/employees' },
          { label: '🌴 Review Pending Leaves', path: '/leave' },
          { label: '⏰ Company Attendance Today', query: 'What is company attendance today?' },
        ],
      };
    }

    if (isHeadcountQuery) {
      return {
        answer: `### 🏢 Organization Overview
PeoplePay360 currently employs **${ctx.orgContext?.totalActiveStaff || 0} active employees** across **${ctx.orgContext?.departments?.length || 0} departments**.

For detailed employee records, please consult the **[Employee Directory](/employees)**.`,
        suggestedActions: this.getSuggestedActionsForRole(ctx),
      };
    }

    // ── 10B. HR / ADMIN: Company Attendance Today ──
    if (
      (ctx.isHR || ctx.isSuperAdmin) && (
        q.includes('company attendance') ||
        q.includes('organization attendance') ||
        q.includes('attendance today') ||
        q.includes('attendance across company') ||
        q.includes('company-wide attendance')
      )
    ) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const [todayPunches, totalActive] = await Promise.all([
        prisma.attendance.findMany({
          where: { date: { gte: todayStart, lte: todayEnd } },
          include: { employee: true },
        }),
        prisma.employee.count({ where: { employmentStatus: 'ACTIVE' } }),
      ]);

      let pres = 0, late = 0, abs = 0, half = 0;
      todayPunches.forEach(p => {
        if (p.status === 'PRESENT') pres++;
        else if (p.status === 'LATE') late++;
        else if (p.status === 'ABSENT') abs++;
        else if (p.status === 'HALF_DAY') half++;
      });
      const checkedIn = pres + late + half;
      const notCheckedIn = Math.max(0, totalActive - checkedIn - abs);

      return {
        answer: `### ⏰ Organization Attendance Today
Real-time workforce attendance metrics across all departments:

- **Total Active Workforce**: **${totalActive} staff**
- **Checked In Today**: **${checkedIn} employees** (${Math.round((checkedIn / (totalActive || 1)) * 100)}% attendance rate)
  - 🟢 **On Time (Present)**: **${pres} staff**
  - 🟡 **Late Arrivals**: **${late} staff**
  - 🟠 **Half Day**: **${half} staff**
  - 🔴 **Marked Absent**: **${abs} staff**
  - ⚪ **Not Checked In Yet**: **${notCheckedIn} staff**

---
You can monitor live punch times and biometric devices in the **[Attendance Portal](/attendance)**.`,
        suggestedActions: [
          { label: '⏰ Open Attendance Portal', path: '/attendance' },
          { label: '📊 Organization Headcount', query: 'Show organization headcount and department distribution' },
          { label: '🌴 All Pending Leaves', query: 'Show all pending leave requests' },
        ],
      };
    }

    // ── 10C. HR / ADMIN: All Pending Leave Requests Across Company ──
    if (
      (ctx.isHR || ctx.isSuperAdmin) && (
        q.includes('all pending leave') ||
        q.includes('pending leave requests') ||
        q.includes('pending leaves across') ||
        q.includes('company pending leave') ||
        q.includes('all leave request') ||
        (q.includes('pending') && q.includes('leave'))
      )
    ) {
      const pendingLeaves = await prisma.leaveRequest.findMany({
        where: { status: 'PENDING' },
        include: {
          employee: { include: { department: true } },
          leaveType: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      const leaveRows = pendingLeaves.length
        ? pendingLeaves.map((l, i) => `${i + 1}. **${l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : 'Staff Member'}** (\`${l.employee?.employeeCode || 'EMP'}\` - ${l.employee?.department?.name || 'General'})\n   - **${l.leaveType?.name || 'Leave'}**: ${l.totalDays || 1} day(s) (${new Date(l.startDate).toLocaleDateString('en-IN')} to ${new Date(l.endDate).toLocaleDateString('en-IN')})\n   - *Reason*: ${l.reason || 'Personal matters'}`).join('\n\n')
        : '🎉 **No pending leave requests** currently across the organization.';

      return {
        answer: `### 🌴 Organization Pending Leave Requests (${pendingLeaves.length} Awaiting Review)
${leaveRows}

You can review, approve, or reject employee requests in the **[Leave Management](/leave)** section.`,
        suggestedActions: [
          { label: '🌴 Open Leave Approvals', path: '/leave' },
          { label: '📊 Headcount Overview', query: 'Show organization headcount and department distribution' },
          { label: '⏰ Today\'s Attendance', query: 'What is company attendance today?' },
        ],
      };
    }

    // ── 10D. HR / PAYROLL / ADMIN: Department Cost Breakdown ──
    if (
      (ctx.isHR || ctx.isPayroll || ctx.isSuperAdmin) && (
        q.includes('dept cost') ||
        q.includes('department cost') ||
        q.includes('department breakdown') ||
        q.includes('department-wise') ||
        q.includes('dept breakdown')
      )
    ) {
      const depts = await prisma.department.findMany({
        include: {
          employees: {
            where: { employmentStatus: 'ACTIVE' },
            include: {
              contracts: { where: { status: 'ACTIVE' }, take: 1 },
              payslips: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
          },
        },
      });

      const deptSummary = depts.map(d => {
        const staff = d.employees || [];
        const totalDeptWage = staff.reduce((sum, e) => {
          const wage = Number(e.contracts?.[0]?.wage || e.contracts?.[0]?.basicWage || e.payslips?.[0]?.netSalary || 0);
          return sum + wage;
        }, 0);
        return `- **${d.name}**: **${staff.length} staff** | Approx. Monthly Payroll: **₹${totalDeptWage.toLocaleString('en-IN')}**`;
      }).join('\n');

      return {
        answer: `### 🏢 Department Workforce & Payroll Distribution
${deptSummary || 'No departmental records found.'}

---
For individual salary allocations and cost center ledger entries, visit **[Salary Structures](/salary-structures)**.`,
        suggestedActions: [
          { label: '💰 Total Monthly Spend', query: 'What is our total payroll expenditure this month?' },
          { label: '👥 Employee Directory', path: '/employees' },
          { label: '🛡️ Audit Anomalies', query: 'Detect payroll anomalies and wage spikes' },
        ],
      };
    }

    // ── 10E. PAYROLL / ADMIN / HR: Audit Anomalies & Wage Spikes ──
    if (
      (ctx.isPayroll || ctx.isSuperAdmin || ctx.isHR) && (
        q.includes('anomaly') ||
        q.includes('anomalies') ||
        q.includes('outlier') ||
        q.includes('wage spike') ||
        q.includes('audit score') ||
        q.includes('health score')
      )
    ) {
      const latestPayrun = await prisma.payrun.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      if (!latestPayrun) {
        return {
          answer: `### 🛡️ Payroll Audit & Anomaly Detection
No payroll runs found in the system to audit. Create and calculate a payrun first.`,
          suggestedActions: [{ label: 'View Payruns', path: '/payroll' }],
        };
      }

      const audit = await this.auditPayrunAnomalies(latestPayrun.id);
      const anomalyRows = (audit.anomalies || []).slice(0, 5).map((a, i) => {
        const sevBadge = a.severity === 'HIGH' ? '🔴 HIGH' : a.severity === 'MEDIUM' ? '🟡 MEDIUM' : '🔵 LOW';
        return `${i + 1}. [${sevBadge}] **${a.employeeName}** (\`${a.employeeCode}\`)\n   - *Issue*: **${a.title}**\n   - *Details*: ${a.description}\n   - *Action*: ${a.actionRecommendation}`;
      }).join('\n\n');

      return {
        answer: `### 🛡️ Payroll Health & Audit Report: ${audit.payrunName}
- **Health Score**: **${audit.healthScore}/100** (\`${audit.riskLevel} RISK\`)
- **Total Employees Audited**: **${audit.totalEmployees} staff**
- **Anomalies Flagged**: **${audit.anomaliesCount} issues** (${audit.highRiskCount} High Risk, ${audit.mediumRiskCount} Medium Risk)

${anomalyRows ? `---
#### ⚠️ Top Flagged Outliers
${anomalyRows}` : '✅ **No anomalies or financial outliers detected in this cycle.**'}

---
#### 💡 Recommendations
${(audit.recommendations || []).map(r => `- ${r}`).join('\n')}`,
        suggestedActions: [
          { label: 'View Payrun Details', path: '/payroll' },
          { label: '💰 Total Monthly Spend', query: 'What is our total payroll expenditure this month?' },
          { label: '🌟 Top 5 Earners', query: 'Who are the top 5 highest earners?' },
        ],
      };
    }

    // ── 10F. PAYROLL / ADMIN: Executive Briefing / Leadership Summary ──
    if (
      (ctx.isPayroll || ctx.isSuperAdmin) && (
        q.includes('executive summary') ||
        q.includes('briefing memo') ||
        q.includes('executive briefing') ||
        q.includes('leadership summary')
      )
    ) {
      const latestPayrun = await prisma.payrun.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      if (!latestPayrun) {
        return {
          answer: `### 📑 Executive Briefing Memo
No completed payruns found to generate an executive summary.`,
          suggestedActions: [{ label: 'View Payruns', path: '/payroll' }],
        };
      }

      const summary = await this.generateExecutiveSummary(latestPayrun.id);
      return {
        answer: summary.summaryMarkdown,
        suggestedActions: [
          { label: 'View Payrun Details', path: '/payroll' },
          { label: '🛡️ Audit Anomalies', query: 'Detect payroll anomalies and wage spikes' },
          { label: '💰 Monthly Spend', query: 'What is our total payroll expenditure this month?' },
        ],
      };
    }

    // ── 11. PAYROLL: Total Monthly Spend & Cycle Details ──
    if (ctx.isPayroll && (q.includes('total') || q.includes('spend') || q.includes('expenditure') || q.includes('budget') || q.includes('disbursed'))) {
      const pCtx = ctx.payrollContext;
      return {
        answer: `### 💰 Monthly Payroll Summary
For the active cycle (**${pCtx?.activePayrunName || 'Current Period'}**):
- **Cycle Status**: \`${pCtx?.payrunStatus || 'ACTIVE'}\`
- **Total Net Disbursed**: **₹${(pCtx?.totalNet || 0).toLocaleString('en-IN')}**
- **Total Gross Payroll**: **₹${(pCtx?.totalGross || 0).toLocaleString('en-IN')}**
- **Employees Processed**: **${pCtx?.payslipsCount || 0} active staff**
- **Average Take-Home Pay**: **₹${(pCtx?.avgSalary || 0).toLocaleString('en-IN')} / employee**`,
        suggestedActions: [
          { label: 'View Payrun Details', path: '/payroll' },
          { label: 'Top 5 Earners', query: 'Who are the top 5 highest earners?' },
          { label: 'Audit Anomaly Score', query: 'Detect payroll anomalies' },
        ],
      };
    }

    // ── 12. PAYROLL: Top 5 Highest Earners ──
    if (ctx.isPayroll && (q.includes('highest') || q.includes('earner') || q.includes('top salary') || q.includes('top 5'))) {
      const topRows = (ctx.payrollContext?.topEarners || []).map((s, i) => {
        return `${i + 1}. **${s.name}** (\`${s.code}\`) — **₹${s.netSalary.toLocaleString('en-IN')}** (${s.department})`;
      }).join('\n');

      return {
        answer: `### 🌟 Top 5 Highest Compensated Employees\n${topRows || 'No processed payslips found.'}`,
        suggestedActions: [
          { label: 'View Salary Structures', path: '/salary-structures' },
          { label: 'Payroll Batches', path: '/payroll' },
        ],
      };
    }

    // ── 13. STATUTORY INTENTS (TDS, EPF, ESI, LOP) ──
    if (q.includes('tds') || q.includes('tax deduction') || q.includes('income tax')) {
      return {
        answer: `### 🧾 Tax Deducted at Source (TDS) in Payroll
**TDS** is a statutory withholding tax governed by the Indian Income Tax Act (Section 192), where an employer withholds tax on estimated annual income and remits it directly to the government:

- **Assessment**: Computed on total annual projected gross earnings minus declared standard exemptions (Section 80C, 80D, HRA).
- **Tax Regimes**: Supports both Old Regime (with exemptions) and New Regime (simplified concessionary tax slabs).
- **Compliance Certificate**: Form 16 is issued at the close of the financial year itemizing total deductions.`,
        suggestedActions: [
          { label: '📄 View My Payslips', path: '/payslips' },
          { label: '💰 Check My Salary', query: 'What is my salary?' },
        ],
      };
    }

    if (q.includes('epf') || q.includes('pf') || q.includes('provident fund')) {
      return {
        answer: `### 🏛️ Employees' Provident Fund (EPF)
**EPF** is mandatory retirement savings regulated by the EPFO in India:

- **Employee Contribution**: Exactly 12% of (Basic Salary + Dearness Allowance).
- **Employer Contribution**: 12% total (3.67% to EPF + 8.33% to EPS Pension Scheme).
- **Statutory Ceiling**: Mandatory for monthly basic wages up to ₹15,000, optional on higher compensation amounts.`,
        suggestedActions: [
          { label: '📄 View My Payslips', path: '/payslips' },
          { label: '💰 Check My Salary', query: 'What is my salary?' },
        ],
      };
    }

    if (q.includes('esi') || q.includes('insurance')) {
      return {
        answer: `### 🏥 Employee State Insurance (ESI)
**ESI** provides comprehensive medical and social security coverage for employees:
- **Eligibility**: Employees with gross wages up to ₹21,000 per month.
- **Employee Share**: 0.75% of gross wages.
- **Employer Share**: 3.25% of gross wages.`,
        suggestedActions: [
          { label: '📄 View My Payslips', path: '/payslips' },
          { label: '💰 Check My Salary', query: 'What is my salary?' },
        ],
      };
    }

    if (q.includes('lop') || q.includes('loss of pay') || q.includes('unpaid leave')) {
      return {
        answer: `### 📉 Loss of Pay (LOP) Calculation
In PeoplePay360, **Loss of Pay (LOP)** automatically deducts compensation for unexcused absences or approved unpaid time-off:
- **Formula**: $\\text{Daily Rate} = \\frac{\\text{Gross Base Salary}}{\\text{Scheduled Working Days in Month}}$
- **Deduction**: $\\text{LOP Deduction} = \\text{Daily Rate} \\times \\text{Unpaid Absent Days}$
- **Attendance Link**: Synchronized automatically with daily punch logs and leave approvals.`,
        suggestedActions: [
          { label: '⏰ My Attendance', query: 'What is my attendance summary this month?' },
          { label: '🌴 My Leave Balance', query: 'What is my leave balance?' },
        ],
      };
    }

    // ── DEFAULT WELCOME FALLBACK (ROLE-TAILORED) ──
    return {
      answer: `### ✨ PayPilot AI Copilot
Hello! I am your AI Assistant in **PeoplePay360**.

${ctx.isEmployeeOnly ? `**As an Employee, you can ask me questions like:**
- *"Summarize my information"* (profile, compensation, attendance, leaves)
- *"What is my salary breakdown?"*
- *"What is my attendance summary this month?"*
- *"What is my leave balance?"*
- *"Who is my manager?"*` : ctx.isLineManager ? `**As a Line Manager, you can ask me questions like:**
- *"Summarize my team"* (list of direct reporting members)
- *"What is my team attendance today?"*
- *"Show pending team leave requests"*
- *"Summarize my information"* (your personal profile & compensation)` : ctx.isHR ? `**As an HR Specialist, you can ask me questions like:**
- *"Show organization headcount and department distribution"*
- *"Summarize employee [Name]"*
- *"Show all pending leave requests across company"*
- *"Explain EPF and TDS rules"*` : `**As a Payroll Executive, you can ask me questions like:**
- *"What is our total payroll expenditure this month?"*
- *"Who are the top 5 highest earners?"*
- *"Detect payroll anomalies and wage spikes"*
- *"Summarize employee [Name]"*`}`,
      suggestedActions: this.getSuggestedActionsForRole(ctx),
    };
  }

  /**
   * Helper: Generate Role-Appropriate Suggested Action Pills
   */
  getSuggestedActionsForRole(ctx) {
    if (ctx.isEmployeeOnly) {
      return [
        { label: '👤 Summarize My Profile', query: 'Summarize my information' },
        { label: '💼 My Salary Breakdown', query: 'What is my salary breakdown?' },
        { label: '⏰ My Attendance', query: 'What is my attendance summary this month?' },
        { label: '🌴 My Leave Balance', query: 'What is my leave balance?' },
        { label: '📄 My Payslips', path: '/payslips' },
      ];
    }

    if (ctx.isLineManager) {
      return [
        { label: '👥 Summarize My Team', query: 'Summarize my team' },
        { label: '⏰ Team Attendance Today', query: 'What is my team attendance today?' },
        { label: '🌴 Pending Team Leaves', query: 'Show pending team leave requests' },
        { label: '👤 My Own Profile', query: 'Summarize my information' },
        { label: '💼 My Salary Breakdown', query: 'What is my salary breakdown?' },
      ];
    }

    if (ctx.isHR) {
      return [
        { label: '📊 Organization Headcount', query: 'Show organization headcount and department distribution' },
        { label: '🌴 Pending Leave Requests', query: 'Show all pending leave requests' },
        { label: '👥 Employee Directory', path: '/employees' },
        { label: '⏰ Attendance Portal', path: '/attendance' },
      ];
    }

    // Default to Payroll / Super Admin
    return [
      { label: '💰 Total Monthly Spend', query: 'What is our total payroll expenditure this month?' },
      { label: '🛡️ Audit Anomalies & Outliers', query: 'Detect payroll anomalies and wage spikes' },
      { label: '🏢 Dept Cost Breakdown', query: 'Show department-wise compensation breakdown' },
      { label: '🌟 Top 5 Highest Earners', query: 'Who are the top 5 highest earners?' },
      { label: '📑 Executive Briefing Memo', query: 'Generate executive summary for leadership' },
    ];
  }
}

module.exports = new AIService();

