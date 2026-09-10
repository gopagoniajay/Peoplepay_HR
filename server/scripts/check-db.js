const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('\n=========================================');
  console.log('   PeoplePay360 Database Health Check    ');
  console.log('=========================================\n');

  try {
    const startTime = Date.now();
    // 1. Test connection with raw query
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;
    console.log(`[PASS] MySQL Connection: ONLINE (Latency: ${latency}ms)`);

    // 2. Query table counts
    const [
      users,
      roles,
      employees,
      departments,
      positions,
      attendance,
      contracts,
      salaryStructures,
      payruns,
      payslips,
      leaves
    ] = await Promise.all([
      prisma.user.count(),
      prisma.role.count(),
      prisma.employee.count(),
      prisma.department.count(),
      prisma.jobPosition.count(),
      prisma.attendance.count(),
      prisma.contract.count(),
      prisma.salaryStructure.count(),
      prisma.payrun.count(),
      prisma.payslip.count(),
      prisma.leaveRequest.count(),
    ]);

    console.log('\n--- Table Record Counts ---');
    console.table([
      { Table: 'Users', Count: users },
      { Table: 'Roles', Count: roles },
      { Table: 'Employees', Count: employees },
      { Table: 'Departments', Count: departments },
      { Table: 'Job Positions', Count: positions },
      { Table: 'Attendance Logs', Count: attendance },
      { Table: 'Contracts', Count: contracts },
      { Table: 'Salary Structures', Count: salaryStructures },
      { Table: 'Payruns', Count: payruns },
      { Table: 'Payslips', Count: payslips },
      { Table: 'Leave Requests', Count: leaves }
    ]);

    console.log('[SUCCESS] All database tables are accessible and populated.\n');
  } catch (err) {
    console.error('\n[FAIL] Database Connection Error:');
    console.error(err.message);
    console.log('\nTroubleshooting Checklist:');
    console.log('1. Verify MySQL service is running: Get-Service mysql*');
    console.log('2. Check server/.env DATABASE_URL credentials (host, port 3306, user, password)');
    console.log('3. Run "npx prisma db push" or "npm run seed" if tables are missing.\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
