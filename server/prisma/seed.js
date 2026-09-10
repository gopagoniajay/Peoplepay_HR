const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PeoplePay360 database...\n');

  // Clean existing data
  console.log('  Cleaning existing data...');
  await prisma.payslipLine.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.payrun.deleteMany();
  await prisma.salaryStructureRule.deleteMany();
  await prisma.salaryRule.deleteMany();
  await prisma.salaryStructure.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.scheduleDay.deleteMany();
  await prisma.workingSchedule.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.jobPosition.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  // ─── 1. Roles ─────────────────────────────────────────
  console.log('  Creating roles...');
  const roles = {};
  for (const name of ['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER', 'HR_MANAGER', 'HR_STAFF', 'EMPLOYEE']) {
    roles[name] = await prisma.role.create({ data: { name } });
  }

  // ─── 2. Admin & Staff Users ───────────────────────────
  console.log('  Creating admin & staff users...');
  const passwordHash = await bcrypt.hash('Password@123', 12);

  const superAdmin = await prisma.user.create({
    data: { email: 'admin@peoplepay360.com', passwordHash, roleId: roles.SUPER_ADMIN.id },
  });
  const hrManager = await prisma.user.create({
    data: { email: 'hr.manager@peoplepay360.com', passwordHash, roleId: roles.HR_MANAGER.id },
  });
  const payrollManager = await prisma.user.create({
    data: { email: 'payroll.manager@peoplepay360.com', passwordHash, roleId: roles.PAYROLL_MANAGER.id },
  });
  const payrollUser = await prisma.user.create({
    data: { email: 'payroll.user@peoplepay360.com', passwordHash, roleId: roles.PAYROLL_USER.id },
  });

  // ─── 3. Departments ──────────────────────────────────
  console.log('  Creating departments...');
  const engineering = await prisma.department.create({ data: { name: 'Engineering', code: 'ENG' } });
  const sales = await prisma.department.create({ data: { name: 'Sales', code: 'SALES' } });
  const hrAdmin = await prisma.department.create({ data: { name: 'HR & Admin', code: 'HR' } });

  // ─── 4. Job Positions ────────────────────────────────
  console.log('  Creating job positions...');
  const positions = {};
  for (const title of ['Software Engineer', 'Senior Software Engineer', 'Tech Lead', 'Sales Executive', 'Sales Manager', 'HR Executive', 'HR Manager', 'Office Administrator', 'DevOps Engineer', 'QA Engineer']) {
    positions[title] = await prisma.jobPosition.create({ data: { title } });
  }

  // ─── 5. Working Schedules ────────────────────────────
  console.log('  Creating working schedules...');
  const standardSchedule = await prisma.workingSchedule.create({
    data: {
      name: 'Standard 9-to-6',
      type: 'STANDARD',
      totalWeeklyHours: 45,
      overtimeThreshold: 9,
    },
  });

  // Mon-Fri schedule days
  for (let day = 1; day <= 5; day++) {
    await prisma.scheduleDay.create({
      data: {
        workingScheduleId: standardSchedule.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '18:00',
        breakMinutes: 60,
      },
    });
  }

  const flexSchedule = await prisma.workingSchedule.create({
    data: {
      name: 'Flexible Schedule',
      type: 'FLEXIBLE',
      totalWeeklyHours: 40,
    },
  });

  for (let day = 1; day <= 5; day++) {
    await prisma.scheduleDay.create({
      data: {
        workingScheduleId: flexSchedule.id,
        dayOfWeek: day,
        startTime: '10:00',
        endTime: '19:00',
        breakMinutes: 60,
      },
    });
  }

  // ─── 6. Employees ────────────────────────────────────
  console.log('  Creating employees...');
  const employeeData = [
    { firstName: 'Aisha', lastName: 'Verma', email: 'aisha.verma@peoplepay360.com', dept: engineering, pos: positions['Senior Software Engineer'], type: 'FULL_TIME', wage: 30000 },
    { firstName: 'Rohan', lastName: 'Sharma', email: 'rohan.sharma@peoplepay360.com', dept: engineering, pos: positions['Software Engineer'], type: 'FULL_TIME', wage: 25000 },
    { firstName: 'Priya', lastName: 'Nair', email: 'priya.nair@peoplepay360.com', dept: engineering, pos: positions['Tech Lead'], type: 'FULL_TIME', wage: 50000 },
    { firstName: 'Vikram', lastName: 'Singh', email: 'vikram.singh@peoplepay360.com', dept: sales, pos: positions['Sales Manager'], type: 'FULL_TIME', wage: 40000 },
    { firstName: 'Meera', lastName: 'Patel', email: 'meera.patel@peoplepay360.com', dept: sales, pos: positions['Sales Executive'], type: 'FULL_TIME', wage: 28000 },
    { firstName: 'Arjun', lastName: 'Reddy', email: 'arjun.reddy@peoplepay360.com', dept: engineering, pos: positions['DevOps Engineer'], type: 'FULL_TIME', wage: 35000 },
    { firstName: 'Kavya', lastName: 'Iyer', email: 'kavya.iyer@peoplepay360.com', dept: hrAdmin, pos: positions['HR Executive'], type: 'FULL_TIME', wage: 27000 },
    { firstName: 'Siddharth', lastName: 'Das', email: 'siddharth.das@peoplepay360.com', dept: engineering, pos: positions['QA Engineer'], type: 'FULL_TIME', wage: 26000 },
    { firstName: 'Neha', lastName: 'Gupta', email: 'neha.gupta@peoplepay360.com', dept: hrAdmin, pos: positions['Office Administrator'], type: 'PART_TIME', wage: 18000 },
    { firstName: 'Rahul', lastName: 'Joshi', email: 'rahul.joshi@peoplepay360.com', dept: engineering, pos: positions['Software Engineer'], type: 'INTERN', wage: 15000 },
  ];

  const employees = [];
  for (let i = 0; i < employeeData.length; i++) {
    const emp = employeeData[i];
    const empUser = await prisma.user.create({
      data: { email: emp.email, passwordHash, roleId: roles.EMPLOYEE.id },
    });

    const employee = await prisma.employee.create({
      data: {
        employeeCode: `EMP-${String(i + 1).padStart(4, '0')}`,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: `+91-${9000000000 + Math.floor(Math.random() * 999999999)}`,
        departmentId: emp.dept.id,
        jobPositionId: emp.pos.id,
        workingScheduleId: i < 8 ? standardSchedule.id : flexSchedule.id,
        joiningDate: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        employmentStatus: 'ACTIVE',
        employmentType: emp.type,
        bankAccountName: `${emp.firstName} ${emp.lastName}`,
        bankAccountNumber: `${100000000 + Math.floor(Math.random() * 899999999)}${Math.floor(Math.random() * 9999)}`,
        bankIfsc: 'HDFC0001234',
        userId: empUser.id,
        managerId: i === 2 ? null : (i < 4 ? employees[2]?.id : (i < 6 ? employees[3]?.id : employees[6]?.id)),
      },
    });
    employees.push(employee);
  }

  // ─── 7. Contracts ────────────────────────────────────
  console.log('  Creating contracts...');

  // Aisha Verma: 2 contracts (Jan-Jun ₹25k, Jul-Dec ₹30k) — demonstrates period resolution
  await prisma.contract.create({
    data: {
      employeeId: employees[0].id,
      startDate: new Date(2026, 0, 1),
      endDate: new Date(2026, 5, 30),
      wageType: 'MONTHLY',
      basicWage: 25000,
      departmentId: engineering.id,
      jobPositionId: positions['Software Engineer'].id,
      workingScheduleId: standardSchedule.id,
      status: 'EXPIRED',
    },
  });

  await prisma.contract.create({
    data: {
      employeeId: employees[0].id,
      startDate: new Date(2026, 6, 1),
      endDate: new Date(2026, 11, 31),
      wageType: 'MONTHLY',
      basicWage: 30000,
      departmentId: engineering.id,
      jobPositionId: positions['Senior Software Engineer'].id,
      workingScheduleId: standardSchedule.id,
      status: 'ACTIVE',
    },
  });

  // Rohan Sharma: 2 contracts — promotion
  await prisma.contract.create({
    data: {
      employeeId: employees[1].id,
      startDate: new Date(2025, 6, 1),
      endDate: new Date(2026, 5, 30),
      wageType: 'MONTHLY',
      basicWage: 22000,
      departmentId: engineering.id,
      jobPositionId: positions['Software Engineer'].id,
      workingScheduleId: standardSchedule.id,
      status: 'EXPIRED',
    },
  });

  await prisma.contract.create({
    data: {
      employeeId: employees[1].id,
      startDate: new Date(2026, 6, 1),
      endDate: null, // open-ended
      wageType: 'MONTHLY',
      basicWage: 25000,
      departmentId: engineering.id,
      jobPositionId: positions['Software Engineer'].id,
      workingScheduleId: standardSchedule.id,
      status: 'ACTIVE',
    },
  });

  // Remaining employees: single active contract
  for (let i = 2; i < employees.length; i++) {
    const emp = employeeData[i];
    await prisma.contract.create({
      data: {
        employeeId: employees[i].id,
        startDate: new Date(2026, 0, 1),
        endDate: null,
        wageType: 'MONTHLY',
        basicWage: emp.wage,
        departmentId: emp.dept.id,
        jobPositionId: emp.pos.id,
        workingScheduleId: i < 8 ? standardSchedule.id : flexSchedule.id,
        status: 'ACTIVE',
      },
    });
  }

  // ─── 8. Salary Rules ─────────────────────────────────
  console.log('  Creating salary rules...');

  const basicRule = await prisma.salaryRule.create({
    data: { name: 'Basic Salary', code: 'BASIC', sequence: 10, category: 'BASIC', computationType: 'FIXED', fixedAmount: 0, isDeduction: false, active: true },
  });
  const hraRule = await prisma.salaryRule.create({
    data: { name: 'Housing Allowance (HRA)', code: 'HRA', sequence: 20, category: 'ALLOWANCE', computationType: 'PERCENTAGE', percentageOfCode: 'BASIC', percentageValue: 20, isDeduction: false, active: true },
  });
  const transportRule = await prisma.salaryRule.create({
    data: { name: 'Transport Allowance', code: 'TRANSPORT', sequence: 30, category: 'ALLOWANCE', computationType: 'FIXED', fixedAmount: 2000, isDeduction: false, active: true },
  });
  const bonusRule = await prisma.salaryRule.create({
    data: { name: 'Performance Bonus', code: 'BONUS', sequence: 40, category: 'ALLOWANCE', computationType: 'FIXED', fixedAmount: 3000, conditionExpr: "employee_employmentType == 'FULL_TIME'", isDeduction: false, active: true },
  });
  const grossRule = await prisma.salaryRule.create({
    data: { name: 'Gross Salary', code: 'GROSS', sequence: 50, category: 'GROSS', computationType: 'FORMULA', formula: 'BASIC + HRA + TRANSPORT + BONUS', isDeduction: false, active: true },
  });
  const taxRule = await prisma.salaryRule.create({
    data: { name: 'Income Tax', code: 'TAX', sequence: 60, category: 'DEDUCTION', computationType: 'PERCENTAGE', percentageOfCode: 'GROSS', percentageValue: 10, isDeduction: true, active: true },
  });
  const lopRule = await prisma.salaryRule.create({
    data: { name: 'Loss of Pay', code: 'LOP', sequence: 70, category: 'DEDUCTION', computationType: 'FORMULA', formula: 'unpaidLeaveDays > 0 ? (BASIC / workingDaysInMonth) * unpaidLeaveDays : 0', isDeduction: true, active: true },
  });
  const netRule = await prisma.salaryRule.create({
    data: { name: 'Net Salary', code: 'NET', sequence: 80, category: 'NET', computationType: 'FORMULA', formula: 'GROSS - TAX - LOP', isDeduction: false, active: true },
  });

  // ─── 9. Salary Structure ─────────────────────────────
  console.log('  Creating salary structure...');

  const salaryStructure = await prisma.salaryStructure.create({
    data: {
      name: 'Regular Salary – Full Time',
      code: 'REG_FT',
      description: 'Standard salary structure for full-time employees',
      active: true,
    },
  });

  // Link rules to structure
  const allRules = [basicRule, hraRule, transportRule, bonusRule, grossRule, taxRule, lopRule, netRule];
  for (const rule of allRules) {
    await prisma.salaryStructureRule.create({
      data: {
        salaryStructureId: salaryStructure.id,
        salaryRuleId: rule.id,
      },
    });
  }

  // Update contracts to reference the salary structure
  await prisma.contract.updateMany({
    where: { status: 'ACTIVE' },
    data: { salaryStructureId: salaryStructure.id },
  });

  // ─── 10. Leave Types ─────────────────────────────────
  console.log('  Creating leave types...');

  const casualLeave = await prisma.leaveType.create({
    data: { name: 'Casual Leave', unit: 'DAYS', requiresAllocation: true, isPaid: true, requiresApproval: true, affectsPayroll: true },
  });
  const sickLeave = await prisma.leaveType.create({
    data: { name: 'Sick Leave', unit: 'DAYS', requiresAllocation: true, isPaid: true, requiresApproval: true, affectsPayroll: true },
  });
  const unpaidLeave = await prisma.leaveType.create({
    data: { name: 'Unpaid Leave', unit: 'DAYS', requiresAllocation: false, isPaid: false, requiresApproval: true, affectsPayroll: true },
  });

  // ─── 11. Leave Balances ──────────────────────────────
  console.log('  Creating leave balances...');

  for (const emp of employees) {
    // Casual Leave: 12/year
    await prisma.leaveBalance.create({
      data: {
        employeeId: emp.id,
        leaveTypeId: casualLeave.id,
        allocated: 12,
        taken: Math.floor(Math.random() * 4),
        remaining: 12 - Math.floor(Math.random() * 4),
        validFrom: new Date(2026, 0, 1),
        validTo: new Date(2026, 11, 31),
      },
    });
    // Sick Leave: 8/year
    await prisma.leaveBalance.create({
      data: {
        employeeId: emp.id,
        leaveTypeId: sickLeave.id,
        allocated: 8,
        taken: Math.floor(Math.random() * 2),
        remaining: 8 - Math.floor(Math.random() * 2),
        validFrom: new Date(2026, 0, 1),
        validTo: new Date(2026, 11, 31),
      },
    });
  }

  // ─── 12. Leave Requests ──────────────────────────────
  console.log('  Creating leave requests...');

  // Some approved, some pending
  await prisma.leaveRequest.create({
    data: {
      employeeId: employees[0].id,
      leaveTypeId: casualLeave.id,
      startDate: new Date(2026, 7, 10),
      endDate: new Date(2026, 7, 11),
      isHalfDay: false,
      durationDays: 2,
      status: 'APPROVED',
      reason: 'Family function',
      approvedById: hrManager.id,
      decidedAt: new Date(2026, 7, 8),
    },
  });

  await prisma.leaveRequest.create({
    data: {
      employeeId: employees[1].id,
      leaveTypeId: sickLeave.id,
      startDate: new Date(2026, 7, 15),
      endDate: new Date(2026, 7, 15),
      isHalfDay: false,
      durationDays: 1,
      status: 'APPROVED',
      reason: 'Feeling unwell',
      approvedById: hrManager.id,
      decidedAt: new Date(2026, 7, 14),
    },
  });

  await prisma.leaveRequest.create({
    data: {
      employeeId: employees[4].id,
      leaveTypeId: unpaidLeave.id,
      startDate: new Date(2026, 8, 10),
      endDate: new Date(2026, 8, 11),
      isHalfDay: false,
      durationDays: 2,
      status: 'PENDING',
      reason: 'Personal work',
    },
  });

  await prisma.leaveRequest.create({
    data: {
      employeeId: employees[3].id,
      leaveTypeId: casualLeave.id,
      startDate: new Date(2026, 8, 20),
      endDate: new Date(2026, 8, 20),
      isHalfDay: true,
      durationDays: 0.5,
      status: 'PENDING',
      reason: 'Doctor appointment',
    },
  });

  // ─── 13. Attendance ──────────────────────────────────
  console.log('  Creating attendance records (August 2026)...');

  const augustDays = [];
  for (let d = 1; d <= 31; d++) {
    const date = new Date(2026, 7, d);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Weekdays only
      augustDays.push(date);
    }
  }

  for (const emp of employees) {
    for (const day of augustDays) {
      const rand = Math.random();

      // 5% chance of missing checkout, 5% late, 3% absent
      let status = 'PRESENT';
      let checkIn = new Date(day);
      checkIn.setHours(9, Math.floor(Math.random() * 15), 0, 0);
      let checkOut = new Date(day);
      checkOut.setHours(18, Math.floor(Math.random() * 30), 0, 0);
      let workedHours = (checkOut - checkIn) / (1000 * 60 * 60);
      let isLate = false;
      let isEarlyDeparture = false;

      if (rand < 0.03) {
        status = 'ABSENT';
        checkIn = null;
        checkOut = null;
        workedHours = null;
      } else if (rand < 0.08) {
        // Missing checkout
        status = 'INCOMPLETE';
        checkOut = null;
        workedHours = null;
      } else if (rand < 0.15) {
        // Late arrival
        checkIn = new Date(day);
        checkIn.setHours(9, 30 + Math.floor(Math.random() * 30), 0, 0);
        isLate = true;
        status = 'LATE';
        workedHours = checkOut ? (checkOut - checkIn) / (1000 * 60 * 60) : null;
      }

      try {
        await prisma.attendance.create({
          data: {
            employeeId: emp.id,
            date: day,
            checkIn,
            checkOut,
            workedHours: workedHours ? parseFloat(workedHours.toFixed(2)) : null,
            status,
            isLate,
            isEarlyDeparture,
            overtimeHours: workedHours && workedHours > 9 ? parseFloat((workedHours - 9).toFixed(2)) : 0,
            source: 'SELF_CHECKIN',
          },
        });
      } catch (e) {
        // Skip duplicates
      }
    }
  }

  // ─── 14. Payrun (Previous month — July 2026) ────────
  console.log('  Creating payrun for July 2026...');

  const payrun = await prisma.payrun.create({
    data: {
      name: 'July 2026 Payroll',
      periodStart: new Date(2026, 6, 1),
      periodEnd: new Date(2026, 6, 31),
      salaryStructureId: salaryStructure.id,
      status: 'PAID',
      createdById: payrollManager.id,
      approvedById: payrollManager.id,
      finalizedAt: new Date(2026, 7, 1),
    },
  });

  // Create payslips for all employees
  for (const emp of employees) {
    const empData = employeeData[employees.indexOf(emp)];
    const basicWage = emp === employees[0] ? 30000 : empData.wage; // Aisha's July contract

    const grossSalary = basicWage + (basicWage * 0.20) + 2000 + (empData.type === 'FULL_TIME' ? 3000 : 0);
    const tax = grossSalary * 0.10;
    const netSalary = grossSalary - tax;

    // Find the active contract for this employee
    const contract = await prisma.contract.findFirst({
      where: { employeeId: emp.id, status: { in: ['ACTIVE', 'EXPIRED'] } },
      orderBy: { startDate: 'desc' },
    });

    if (!contract) continue;

    const payslip = await prisma.payslip.create({
      data: {
        payrunId: payrun.id,
        employeeId: emp.id,
        contractId: contract.id,
        grossSalary,
        totalDeductions: tax,
        netSalary,
        workedDays: 22,
        status: 'PAID',
      },
    });

    // Payslip lines
    await prisma.payslipLine.createMany({
      data: [
        { payslipId: payslip.id, salaryRuleId: basicRule.id, ruleCode: 'BASIC', label: 'Basic Salary', amount: basicWage, sequence: 10, category: 'BASIC' },
        { payslipId: payslip.id, salaryRuleId: hraRule.id, ruleCode: 'HRA', label: 'Housing Allowance (HRA)', amount: basicWage * 0.20, sequence: 20, category: 'ALLOWANCE' },
        { payslipId: payslip.id, salaryRuleId: transportRule.id, ruleCode: 'TRANSPORT', label: 'Transport Allowance', amount: 2000, sequence: 30, category: 'ALLOWANCE' },
        ...(empData.type === 'FULL_TIME' ? [{ payslipId: payslip.id, salaryRuleId: bonusRule.id, ruleCode: 'BONUS', label: 'Performance Bonus', amount: 3000, sequence: 40, category: 'ALLOWANCE' }] : []),
        { payslipId: payslip.id, salaryRuleId: grossRule.id, ruleCode: 'GROSS', label: 'Gross Salary', amount: grossSalary, sequence: 50, category: 'GROSS' },
        { payslipId: payslip.id, salaryRuleId: taxRule.id, ruleCode: 'TAX', label: 'Income Tax', amount: tax, sequence: 60, category: 'DEDUCTION' },
        { payslipId: payslip.id, salaryRuleId: lopRule.id, ruleCode: 'LOP', label: 'Loss of Pay', amount: 0, sequence: 70, category: 'DEDUCTION' },
        { payslipId: payslip.id, salaryRuleId: netRule.id, ruleCode: 'NET', label: 'Net Salary', amount: netSalary, sequence: 80, category: 'NET' },
      ],
    });
  }

  // ─── 15. Notifications ───────────────────────────────
  console.log('  Creating sample notifications...');

  await prisma.notification.createMany({
    data: [
      { userId: hrManager.id, type: 'LEAVE_REQUEST', title: 'New Leave Request', message: 'Meera Patel has requested 2 days of Unpaid Leave (Sep 10-11)', isRead: false },
      { userId: hrManager.id, type: 'LEAVE_REQUEST', title: 'New Leave Request', message: 'Vikram Singh has requested 0.5 day of Casual Leave (Sep 20)', isRead: false },
      { userId: payrollManager.id, type: 'PAYROLL_COMPLETE', title: 'July 2026 Payroll Complete', message: 'Payroll for July 2026 has been finalized and marked as paid.', isRead: true },
    ],
  });

  console.log('\n✅ Seed complete!\n');
  console.log('  Login credentials (all passwords: Password@123):');
  console.log('  ┌─────────────────────────────────────────────────────┐');
  console.log('  │ Role             │ Email                            │');
  console.log('  ├─────────────────────────────────────────────────────┤');
  console.log('  │ Super Admin      │ admin@peoplepay360.com           │');
  console.log('  │ HR Manager       │ hr.manager@peoplepay360.com      │');
  console.log('  │ Payroll Manager  │ payroll.manager@peoplepay360.com │');
  console.log('  │ Payroll User     │ payroll.user@peoplepay360.com    │');
  console.log('  │ Employee (Aisha) │ aisha.verma@peoplepay360.com     │');
  console.log('  └─────────────────────────────────────────────────────┘');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
