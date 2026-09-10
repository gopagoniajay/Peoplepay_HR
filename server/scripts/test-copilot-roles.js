const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const aiService = require('../src/services/ai.service');

async function runTests() {
  console.log('🚀 Starting AI Copilot Role-Based Verification Tests...\n');

  try {
    // 1. Fetch Users by role
    const employeeUser = await prisma.user.findFirst({
      where: { role: { name: 'EMPLOYEE' } },
      include: { role: true, employee: true }
    });

    const managerEmp = await prisma.employee.findFirst({
      where: { subordinates: { some: {} } },
      include: { user: { include: { role: true } } }
    });

    const hrUser = await prisma.user.findFirst({
      where: { role: { name: 'HR_MANAGER' } },
      include: { role: true, employee: true }
    });

    const payrollUser = await prisma.user.findFirst({
      where: { role: { name: 'PAYROLL_MANAGER' } },
      include: { role: true, employee: true }
    });

    console.log(`Test Users Found:
- Employee User: ${employeeUser?.email} (${employeeUser?.employee?.firstName} ${employeeUser?.employee?.lastName})
- Line Manager: ${managerEmp?.email} (${managerEmp?.firstName} ${managerEmp?.lastName})
- HR User: ${hrUser?.email}
- Payroll User: ${payrollUser?.email}\n`);

    // ── TEST SET 1: Pure Employee ──
    console.log('========================================');
    console.log('TEST SET 1: Pure Employee Permissions');
    console.log('========================================');
    const empReqUser = {
      userId: employeeUser.id,
      email: employeeUser.email,
      roleName: 'EMPLOYEE',
      employeeId: employeeUser.employee?.id,
      employeeName: `${employeeUser.employee?.firstName} ${employeeUser.employee?.lastName}`,
    };

    // 1.1 Employee Profile Summary
    const empProfileRes = await aiService.askCopilot('Summarize my information', empReqUser);
    console.log('1.1 Employee Profile Summary:');
    console.log(empProfileRes.answer.slice(0, 300) + '...\n');
    if (!empProfileRes.answer.toLowerCase().includes(employeeUser.employee.firstName.toLowerCase())) {
      throw new Error('Employee profile summary failed to mention user name');
    }

    // 1.2 Employee Salary Breakdown
    const empSalaryRes = await aiService.askCopilot('What is my salary breakdown?', empReqUser);
    console.log('1.2 Employee Salary Breakdown:');
    console.log(empSalaryRes.answer.slice(0, 300) + '...\n');
    const salaryAnsLower = empSalaryRes.answer.toLowerCase();
    if (!salaryAnsLower.includes('salary') && !salaryAnsLower.includes('wage') && !salaryAnsLower.includes('month')) {
      throw new Error('Employee salary query failed');
    }

    // 1.3 Employee Attendance Summary
    const empAttRes = await aiService.askCopilot('What is my attendance summary this month?', empReqUser);
    console.log('1.3 Employee Attendance Summary:');
    console.log(empAttRes.answer.slice(0, 300) + '...\n');

    // 1.4 Employee Leave Balance
    const empLeaveRes = await aiService.askCopilot('What is my leave balance?', empReqUser);
    console.log('1.4 Employee Leave Balance:');
    console.log(empLeaveRes.answer.slice(0, 300) + '...\n');

    // 1.5 Employee Privacy Block: Querying another employee's salary
    const empBlockedSalary = await aiService.askCopilot('What is the salary of Vikram Singh?', empReqUser);
    console.log('1.5 Employee Blocked Other Salary:');
    console.log(empBlockedSalary.answer.slice(0, 300) + '...\n');
    const blockedLower = empBlockedSalary.answer.toLowerCase();
    if (!blockedLower.includes('confidential') && !blockedLower.includes('cannot access') && !blockedLower.includes('privacy') && !blockedLower.includes('cannot view')) {
      throw new Error('Privacy guard failed: employee was able to query another employee salary!');
    }

    // 1.6 Employee Privacy Block: Querying company-wide payroll spend
    const empBlockedSpend = await aiService.askCopilot('What is our total payroll spend this month?', empReqUser);
    console.log('1.6 Employee Blocked Total Spend:');
    console.log(empBlockedSpend.answer.slice(0, 300) + '...\n');
    const spendBlockedLower = empBlockedSpend.answer.toLowerCase();
    if (!spendBlockedLower.includes('restricted') && !spendBlockedLower.includes('confidential') && !spendBlockedLower.includes('cannot') && !spendBlockedLower.includes('not authorized')) {
      throw new Error('Access restriction failed: employee was able to query company payroll totals!');
    }

    // ── TEST SET 2: Line Manager ──
    console.log('========================================');
    console.log('TEST SET 2: Line Manager Team Access');
    console.log('========================================');
    if (managerEmp) {
      const mgrReqUser = {
        userId: managerEmp.user?.id || managerEmp.userId,
        email: managerEmp.email,
        roleName: managerEmp.user?.role?.name || 'EMPLOYEE',
        employeeId: managerEmp.id,
        employeeName: `${managerEmp.firstName} ${managerEmp.lastName}`,
      };

      // 2.1 Summarize Team
      const mgrTeamRes = await aiService.askCopilot('Summarize my team', mgrReqUser);
      console.log('2.1 Line Manager Team Summary:');
      console.log(mgrTeamRes.answer.slice(0, 300) + '...\n');
      const mgrTeamLower = mgrTeamRes.answer.toLowerCase();
      if (!mgrTeamLower.includes('team') && !mgrTeamLower.includes('report') && !mgrTeamLower.includes('member')) {
        throw new Error('Line manager team summary failed');
      }

      // 2.2 Team Attendance Today
      const mgrAttRes = await aiService.askCopilot('What is my team attendance today?', mgrReqUser);
      console.log('2.2 Team Attendance Today:');
      console.log(mgrAttRes.answer.slice(0, 300) + '...\n');

      // 2.3 Team Pending Leaves
      const mgrLeavesRes = await aiService.askCopilot('Show pending team leaves', mgrReqUser);
      console.log('2.3 Team Pending Leaves:');
      console.log(mgrLeavesRes.answer.slice(0, 300) + '...\n');

      // 2.4 Subordinate lookup
      const subordinates = await prisma.employee.findMany({ where: { managerId: managerEmp.id } });
      if (subordinates.length > 0) {
        const sub1 = subordinates[0];
        const subLookupRes = await aiService.askCopilot(`Summarize employee ${sub1.firstName} ${sub1.lastName}`, mgrReqUser);
        console.log(`2.4 Manager Subordinate Lookup (${sub1.firstName}):`);
        console.log(subLookupRes.answer.slice(0, 300) + '...\n');
        if (!subLookupRes.answer.toLowerCase().includes(sub1.firstName.toLowerCase())) {
          throw new Error('Manager could not look up direct subordinate!');
        }
      }
    }

    // ── TEST SET 3: HR & Payroll Roles ──
    console.log('========================================');
    console.log('TEST SET 3: HR & Payroll Operations');
    console.log('========================================');
    if (hrUser) {
      const hrReqUser = {
        userId: hrUser.id,
        email: hrUser.email,
        roleName: 'HR_MANAGER',
        employeeId: hrUser.employee?.id,
        employeeName: hrUser.employee ? `${hrUser.employee.firstName} ${hrUser.employee.lastName}` : 'HR Manager',
      };

      const hrHeadcount = await aiService.askCopilot('Show organization headcount and department distribution', hrReqUser);
      console.log('3.1 HR Headcount Summary:');
      console.log(hrHeadcount.answer.slice(0, 300) + '...\n');
      const hrHeadLower = hrHeadcount.answer.toLowerCase();
      if (!hrHeadLower.includes('staff') && !hrHeadLower.includes('employee') && !hrHeadLower.includes('headcount') && !hrHeadLower.includes('department')) {
        throw new Error('HR headcount summary failed');
      }
    }

    if (payrollUser) {
      const prReqUser = {
        userId: payrollUser.id,
        email: payrollUser.email,
        roleName: 'PAYROLL_MANAGER',
        employeeId: payrollUser.employee?.id,
        employeeName: payrollUser.employee ? `${payrollUser.employee.firstName} ${payrollUser.employee.lastName}` : 'Payroll Manager',
      };

      const prSpend = await aiService.askCopilot('What is our total payroll expenditure this month?', prReqUser);
      console.log('3.2 Payroll Manager Total Spend:');
      console.log(prSpend.answer.slice(0, 300) + '...\n');
      const prSpendLower = prSpend.answer.toLowerCase();
      if (!prSpendLower.includes('payroll') && !prSpendLower.includes('spend') && !prSpendLower.includes('disbursed') && !prSpendLower.includes('gross') && !prSpendLower.includes('net')) {
        throw new Error('Payroll manager spend query failed');
      }

      const prTopEarners = await aiService.askCopilot('Who are the top 5 highest earners?', prReqUser);
      console.log('3.3 Payroll Manager Top Earners:');
      console.log(prTopEarners.answer.slice(0, 300) + '...\n');
      const prTopLower = prTopEarners.answer.toLowerCase();
      if (!prTopLower.includes('earner') && !prTopLower.includes('highest') && !prTopLower.includes('top') && !prTopLower.includes('salary')) {
        throw new Error('Payroll top earners query failed');
      }
    }

    console.log('🎉 ALL ROLE-BASED COPILOT TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
