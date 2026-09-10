const prisma = require('../config/db');

const getSummary = async (req, res, next) => {
  try {
    const { period, department, employeeType } = req.query;

    // Build employee filter
    const empWhere = { employmentStatus: { not: 'TERMINATED' } };
    if (department) empWhere.departmentId = department;
    if (employeeType) empWhere.employmentType = employeeType;

    // KPI: Employee counts
    const totalEmployees = await prisma.employee.count({ where: empWhere });
    const activeEmployees = await prisma.employee.count({ where: { ...empWhere, employmentStatus: 'ACTIVE' } });
    const onLeaveEmployees = await prisma.employee.count({ where: { ...empWhere, employmentStatus: 'ON_LEAVE' } });

    // New employees (joined this month or in period)
    const periodStart = period ? new Date(period + '-01') : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const periodEnd = period ? new Date(new Date(period + '-01').setMonth(new Date(period + '-01').getMonth() + 1)) : new Date();

    const newEmployees = await prisma.employee.count({
      where: {
        ...empWhere,
        joiningDate: { gte: periodStart, lt: periodEnd },
      },
    });

    // Pending leave requests
    const pendingLeaveRequests = await prisma.leaveRequest.count({ where: { status: 'PENDING' } });

    // Attendance rate (for current month)
    const totalAttendance = await prisma.attendance.count({
      where: {
        date: { gte: periodStart, lt: periodEnd },
        ...(department ? { employee: { departmentId: department } } : {}),
      },
    });
    const presentAttendance = await prisma.attendance.count({
      where: {
        date: { gte: periodStart, lt: periodEnd },
        status: { in: ['PRESENT', 'LATE'] },
        ...(department ? { employee: { departmentId: department } } : {}),
      },
    });
    const attendanceRate = totalAttendance > 0
      ? Math.round((presentAttendance / totalAttendance) * 100)
      : 0;

    // Payroll KPIs
    const payrollAgg = await prisma.payslip.aggregate({
      where: {
        payrun: {
          periodStart: { gte: periodStart },
          periodEnd: { lt: periodEnd },
          status: { in: ['FINALIZED', 'PAID'] },
        },
      },
      _sum: { netSalary: true, grossSalary: true, totalDeductions: true },
    });

    const pendingPayruns = await prisma.payrun.count({
      where: { status: { in: ['DRAFT', 'CALCULATED', 'REVIEW'] } },
    });

    // Average salary
    const avgSalary = await prisma.contract.aggregate({
      where: { status: 'ACTIVE', employee: empWhere },
      _avg: { basicWage: true },
    });

    // ─── Charts ─────────────────────────────────────────

    // Department distribution
    const deptDistribution = await prisma.employee.groupBy({
      by: ['departmentId'],
      where: empWhere,
      _count: true,
    });

    const departments = await prisma.department.findMany();
    const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));

    const departmentChart = deptDistribution.map((d) => ({
      name: deptMap[d.departmentId] || 'Unassigned',
      value: d._count,
    }));

    // Payroll trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const payrollTrend = await prisma.payrun.findMany({
      where: {
        status: { in: ['FINALIZED', 'PAID'] },
        periodStart: { gte: sixMonthsAgo },
      },
      include: {
        payslips: {
          select: { netSalary: true, grossSalary: true, totalDeductions: true },
        },
      },
      orderBy: { periodStart: 'asc' },
    });

    const payrollTrendChart = payrollTrend.map((pr) => ({
      month: pr.periodStart.toISOString().slice(0, 7),
      name: pr.name,
      netSalary: pr.payslips.reduce((s, p) => s + parseFloat(p.netSalary), 0),
      grossSalary: pr.payslips.reduce((s, p) => s + parseFloat(p.grossSalary), 0),
      deductions: pr.payslips.reduce((s, p) => s + parseFloat(p.totalDeductions), 0),
    }));

    // Leave distribution by type
    const leaveDistribution = await prisma.leaveRequest.groupBy({
      by: ['leaveTypeId'],
      where: { status: 'APPROVED', startDate: { gte: periodStart } },
      _sum: { durationDays: true },
      _count: true,
    });

    const leaveTypes = await prisma.leaveType.findMany();
    const leaveTypeMap = Object.fromEntries(leaveTypes.map((lt) => [lt.id, lt.name]));

    const leaveChart = leaveDistribution.map((l) => ({
      name: leaveTypeMap[l.leaveTypeId] || 'Unknown',
      days: parseFloat(l._sum.durationDays) || 0,
      count: l._count,
    }));

    // Salary cost by department
    const salaryCostByDept = await prisma.payslip.groupBy({
      by: ['employeeId'],
      where: {
        payrun: { periodStart: { gte: periodStart }, periodEnd: { lt: periodEnd }, status: { in: ['FINALIZED', 'PAID'] } },
      },
      _sum: { netSalary: true },
    });

    // Map to departments
    const empDepts = await prisma.employee.findMany({
      where: { id: { in: salaryCostByDept.map(s => s.employeeId) } },
      select: { id: true, departmentId: true },
    });
    const empDeptMap = Object.fromEntries(empDepts.map(e => [e.id, e.departmentId]));

    const deptCostMap = {};
    for (const sc of salaryCostByDept) {
      const deptId = empDeptMap[sc.employeeId];
      const deptName = deptMap[deptId] || 'Unassigned';
      deptCostMap[deptName] = (deptCostMap[deptName] || 0) + parseFloat(sc._sum.netSalary || 0);
    }

    const salaryCostChart = Object.entries(deptCostMap).map(([name, value]) => ({ name, value }));

    // Operational alerts
    const missingBankDetails = await prisma.employee.count({
      where: {
        employmentStatus: 'ACTIVE',
        OR: [
          { bankAccountNumber: null },
          { bankAccountNumber: '' },
          { bankIfsc: null },
          { bankIfsc: '' },
        ],
      },
    });

    const expiringContracts = await prisma.contract.count({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    res.json({
      success: true,
      data: {
        kpis: {
          totalEmployees,
          activeEmployees,
          newEmployees,
          onLeaveEmployees,
          attendanceRate,
          pendingLeaveRequests,
          pendingPayruns,
          totalNetSalary: parseFloat(payrollAgg._sum.netSalary || 0),
          totalGrossSalary: parseFloat(payrollAgg._sum.grossSalary || 0),
          totalDeductions: parseFloat(payrollAgg._sum.totalDeductions || 0),
          averageSalary: parseFloat(avgSalary._avg.basicWage || 0),
        },
        charts: {
          departmentDistribution: departmentChart,
          payrollTrend: payrollTrendChart,
          leaveDistribution: leaveChart,
          salaryCostByDepartment: salaryCostChart,
        },
        alerts: {
          missingBankDetails,
          expiringContracts,
          pendingPayruns,
          pendingLeaveRequests,
        },
      },
    });
  } catch (error) { next(error); }
};

module.exports = { getSummary };
