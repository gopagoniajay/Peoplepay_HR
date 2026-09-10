const prisma = require('../config/db');
const PDFDocument = require('pdfkit');
const { AppError } = require('../middleware/errorHandler');

const list = async (req, res, next) => {
  try {
    const { employeeId, payrunId, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (payrunId) where.payrunId = payrunId;

    // Employee can only see own payslips
    if (req.user.roleName === 'EMPLOYEE') {
      let empId = req.user.employeeId;
      if (!empId) {
        const emp = (req.user.userId && await prisma.employee.findFirst({ where: { userId: req.user.userId } })) ||
                    await prisma.employee.findFirst({ where: { employmentStatus: 'ACTIVE' } });
        empId = emp?.id;
      }
      if (empId) {
        where.employeeId = empId;
      }
    }

    const [items, total] = await Promise.all([
      prisma.payslip.findMany({
        where,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true, department: { select: { name: true } } } },
          payrun: { select: { name: true, periodStart: true, periodEnd: true, status: true } },
          contract: { select: { basicWage: true, wageType: true } },
          lines: { orderBy: { sequence: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
      }),
      prisma.payslip.count({ where }),
    ]);

    const formattedItems = items.map(ps => {
      const periodYearMonth = ps.payrun?.periodStart 
        ? new Date(ps.payrun.periodStart).toISOString().slice(0, 7) 
        : new Date(ps.createdAt).toISOString().slice(0, 7);
      const empNum = ps.employee?.employeeCode 
        ? ps.employee.employeeCode.replace(/[^0-9]/g, '').padStart(4, '0') 
        : (ps.id || '').slice(0, 4).toUpperCase();
      const payslipNumber = `PS-${periodYearMonth}-${empNum || '0001'}`;

      return {
        ...ps,
        payslipNumber,
        payPeriod: ps.payrun?.name || `${new Date(ps.payrun?.periodStart || ps.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        grossPay: Number(ps.grossSalary),
        totalDeductions: Number(ps.totalDeductions),
        netPay: Number(ps.netSalary),
        employee: {
          ...ps.employee,
          code: ps.employee?.employeeCode,
        }
      };
    });

    res.json({ success: true, data: { items: formattedItems, page: parseInt(page), pageSize: parseInt(pageSize), total } });
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const payslip = await prisma.payslip.findUnique({
      where: { id: req.params.id },
      include: {
        employee: {
          include: { department: true, jobPosition: true },
        },
        payrun: true,
        contract: true,
        lines: { orderBy: { sequence: 'asc' } },
      },
    });

    if (!payslip) throw new AppError('Payslip not found', 404, 'NOT_FOUND');

    // Employee self-access check
    if (req.user.roleName === 'EMPLOYEE' && req.user.employeeId && payslip.employeeId !== req.user.employeeId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const periodYearMonth = payslip.payrun?.periodStart 
      ? new Date(payslip.payrun.periodStart).toISOString().slice(0, 7) 
      : new Date(payslip.createdAt).toISOString().slice(0, 7);
    const empNum = payslip.employee?.employeeCode 
      ? payslip.employee.employeeCode.replace(/[^0-9]/g, '').padStart(4, '0') 
      : (payslip.id || '').slice(0, 4).toUpperCase();
    const payslipNumber = `PS-${periodYearMonth}-${empNum || '0001'}`;

    res.json({ 
      success: true, 
      data: {
        ...payslip,
        payslipNumber,
        payPeriod: payslip.payrun?.name || `${new Date(payslip.payrun?.periodStart || payslip.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        grossPay: Number(payslip.grossSalary),
        totalDeductions: Number(payslip.totalDeductions),
        netPay: Number(payslip.netSalary),
        employee: {
          ...payslip.employee,
          code: payslip.employee?.employeeCode,
        }
      }
    });
  } catch (error) { next(error); }
};

const downloadPdf = async (req, res, next) => {
  try {
    const payslip = await prisma.payslip.findUnique({
      where: { id: req.params.id },
      include: {
        employee: { include: { department: true, jobPosition: true } },
        payrun: true,
        contract: true,
        lines: { orderBy: { sequence: 'asc' } },
      },
    });

    if (!payslip) throw new AppError('Payslip not found', 404, 'NOT_FOUND');

    if (req.user.roleName === 'EMPLOYEE' && req.user.employeeId && payslip.employeeId !== req.user.employeeId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    // Generate PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payslip-${payslip.employee.employeeCode}-${payslip.payrun.periodStart.toISOString().slice(0, 7)}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('PeoplePay360', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Payslip', { align: 'center' });
    doc.moveDown();

    // Divider
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Employee Details
    doc.fontSize(10);
    const leftCol = 50;
    const rightCol = 300;
    let y = doc.y;

    doc.font('Helvetica-Bold').text('Employee:', leftCol, y);
    doc.font('Helvetica').text(`${payslip.employee.firstName} ${payslip.employee.lastName}`, leftCol + 80, y);

    doc.font('Helvetica-Bold').text('Employee Code:', rightCol, y);
    doc.font('Helvetica').text(payslip.employee.employeeCode, rightCol + 100, y);

    y += 18;
    doc.font('Helvetica-Bold').text('Department:', leftCol, y);
    doc.font('Helvetica').text(payslip.employee.department?.name || 'N/A', leftCol + 80, y);

    doc.font('Helvetica-Bold').text('Position:', rightCol, y);
    doc.font('Helvetica').text(payslip.employee.jobPosition?.title || 'N/A', rightCol + 100, y);

    y += 18;
    doc.font('Helvetica-Bold').text('Pay Period:', leftCol, y);
    doc.font('Helvetica').text(
      `${payslip.payrun.periodStart.toISOString().slice(0, 10)} to ${payslip.payrun.periodEnd.toISOString().slice(0, 10)}`,
      leftCol + 80, y
    );

    doc.font('Helvetica-Bold').text('Worked Days:', rightCol, y);
    doc.font('Helvetica').text(String(payslip.workedDays), rightCol + 100, y);

    doc.moveDown(2);

    // Divider
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Earnings
    const earnings = payslip.lines.filter(l => ['BASIC', 'ALLOWANCE', 'GROSS'].includes(l.category));
    const deductions = payslip.lines.filter(l => l.category === 'DEDUCTION');

    doc.fontSize(12).font('Helvetica-Bold').text('Earnings');
    doc.moveDown(0.5);

    for (const line of earnings) {
      doc.fontSize(10).font('Helvetica');
      doc.text(line.label, leftCol, doc.y, { continued: true, width: 300 });
      doc.text(`Rs. ${parseFloat(line.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { align: 'right' });
    }

    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold').text('Deductions');
    doc.moveDown(0.5);

    for (const line of deductions) {
      doc.fontSize(10).font('Helvetica');
      doc.text(line.label, leftCol, doc.y, { continued: true, width: 300 });
      doc.text(`Rs. ${parseFloat(Math.abs(line.amount)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { align: 'right' });
    }

    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Totals
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Gross Salary:', leftCol, doc.y, { continued: true, width: 300 });
    doc.text(`Rs. ${parseFloat(payslip.grossSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { align: 'right' });

    doc.text('Total Deductions:', leftCol, doc.y, { continued: true, width: 300 });
    doc.text(`Rs. ${parseFloat(payslip.totalDeductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { align: 'right' });

    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('Net Salary:', leftCol, doc.y, { continued: true, width: 300 });
    doc.text(`Rs. ${parseFloat(payslip.netSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { align: 'right' });

    doc.moveDown(3);
    doc.fontSize(8).font('Helvetica').fillColor('grey');
    doc.text('This is a computer-generated payslip and does not require a signature.', { align: 'center' });

    doc.end();
  } catch (error) { next(error); }
};

module.exports = { list, getById, downloadPdf };
