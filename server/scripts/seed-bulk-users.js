const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const FIRST_NAMES = [
  'Aarav', 'Aditya', 'Akash', 'Alok', 'Amit', 'Anand', 'Ananya', 'Anil', 'Anirudh', 'Anjali',
  'Ankush', 'Anupam', 'Arnav', 'Aryan', 'Ashish', 'Bhavna', 'Chetan', 'Deepak', 'Deepa', 'Dev',
  'Divya', 'Gaurav', 'Geeta', 'Harish', 'Harsh', 'Isha', 'Jatin', 'Kajal', 'Kapil', 'Karan',
  'Karthik', 'Kavita', 'Kiran', 'Kunal', 'Lakshmi', 'Madhav', 'Manish', 'Meenakshi', 'Mohit', 'Monika',
  'Mukesh', 'Naveen', 'Nidhi', 'Nikhil', 'Nitin', 'Pallavi', 'Pankaj', 'Pooja', 'Pranav', 'Prashant',
  'Pratibha', 'Preeti', 'Priya', 'Rahul', 'Rajesh', 'Rajat', 'Ramesh', 'Rashmi', 'Ravi', 'Ritu',
  'Rohan', 'Rohit', 'Sachin', 'Sameer', 'Sandhya', 'Sanjay', 'Santosh', 'Sarita', 'Saurabh', 'Shalini',
  'Shashank', 'Shilpa', 'Shivani', 'Shruti', 'Siddharth', 'Simran', 'Sneha', 'Sonali', 'Sourav', 'Subhash',
  'Sujata', 'Suman', 'Sunil', 'Suresh', 'Swati', 'Tanvi', 'Tarun', 'Umesh', 'Varun', 'Vikas',
  'Vikram', 'Vinay', 'Vineet', 'Vipul', 'Vishal', 'Vivek', 'Yash', 'Yogesh'
];

const LAST_NAMES = [
  'Agarwal', 'Banerjee', 'Bansal', 'Bhat', 'Chatterjee', 'Chauhan', 'Chopra', 'Choudhury', 'Das',
  'Deshmukh', 'Dubey', 'Ghosh', 'Goyal', 'Gupta', 'Iyer', 'Jain', 'Jha', 'Joshi', 'Kapoor',
  'Kaushik', 'Khan', 'Kulkarni', 'Kumar', 'Mahajan', 'Malhotra', 'Mehta', 'Mishra', 'Mukherjee',
  'Nair', 'Nambiar', 'Pandey', 'Patel', 'Patil', 'Pillai', 'Prasad', 'Rao', 'Reddy', 'Roy',
  'Saxena', 'Sen', 'Sharma', 'Shukla', 'Singh', 'Sinha', 'Soni', 'Srivastava', 'Tiwari', 'Tripathi',
  'Varma', 'Verma', 'Yadav'
];

const DEPARTMENT_DEFS = [
  { name: 'Engineering', code: 'ENG', positions: ['Software Engineer', 'Senior Software Engineer', 'Tech Lead', 'Frontend Specialist', 'Backend Architect', 'QA Engineer', 'DevOps Specialist'] },
  { name: 'Sales', code: 'SALES', positions: ['Sales Executive', 'Sales Manager', 'Account Executive', 'Business Development Rep', 'Solutions Consultant'] },
  { name: 'HR & Admin', code: 'HR', positions: ['HR Executive', 'HR Manager', 'Talent Partner', 'Office Administrator', 'People Operations Lead'] },
  { name: 'Finance & Accounts', code: 'FIN', positions: ['Financial Analyst', 'Senior Accountant', 'Billing Specialist', 'Finance Controller', 'Taxation Analyst'] },
  { name: 'Marketing & Growth', code: 'MKT', positions: ['Growth Marketer', 'Content Strategist', 'SEO Specialist', 'Performance Marketer', 'Brand Designer'] },
  { name: 'Customer Operations', code: 'OPS', positions: ['Operations Associate', 'Support Specialist', 'Client Success Manager', 'Operations Lead'] },
];

const SALARIES = [32000, 38000, 45000, 52000, 60000, 72000, 85000, 95000, 115000, 130000, 150000];

async function main() {
  console.log('🚀 Starting bulk population of 230 realistic employees & records...\n');

  // 1. Fetch reference entities
  const employeeRole = await prisma.role.findUnique({ where: { name: 'EMPLOYEE' } });
  const standardSchedule = await prisma.workingSchedule.findFirst({ where: { type: 'STANDARD' } })
    || await prisma.workingSchedule.findFirst();
  const salaryStructure = await prisma.salaryStructure.findFirst()
    || await prisma.salaryStructure.findFirst();
  const leaveTypes = await prisma.leaveType.findMany();

  if (!employeeRole || !standardSchedule || !salaryStructure) {
    console.error('Missing core roles, schedules, or salary structures. Please run prisma seed first.');
    return;
  }

  // 2. Ensure all departments and job positions exist
  const deptMap = {};
  const posMap = {};

  for (const dDef of DEPARTMENT_DEFS) {
    let dept = await prisma.department.findUnique({ where: { name: dDef.name } });
    if (!dept) {
      dept = await prisma.department.create({ data: { name: dDef.name, code: dDef.code } });
    }
    deptMap[dDef.name] = dept;

    for (const pTitle of dDef.positions) {
      let pos = await prisma.jobPosition.findUnique({ where: { title: pTitle } });
      if (!pos) {
        pos = await prisma.jobPosition.create({ data: { title: pTitle } });
      }
      posMap[pTitle] = pos;
    }
  }

  // Pre-hash password for performance
  console.log('  Hashing universal test password (Password@123)...');
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const TOTAL_TO_ADD = 230;
  console.log(`  Generating ${TOTAL_TO_ADD} comprehensive employee records...`);

  let count = 0;
  const startCode = 110;

  for (let i = 0; i < TOTAL_TO_ADD; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const ln = LAST_NAMES[(i * 3 + Math.floor(i / FIRST_NAMES.length)) % LAST_NAMES.length];
    const codeNum = startCode + i;
    const employeeCode = `EMP-0${codeNum}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}.${codeNum}@peoplepay360.com`;
    const phone = `+91-98${String(10000000 + (i * 37373) % 90000000).slice(0, 8)}`;

    const deptDef = DEPARTMENT_DEFS[i % DEPARTMENT_DEFS.length];
    const dept = deptMap[deptDef.name];
    const posTitle = deptDef.positions[i % deptDef.positions.length];
    const pos = posMap[posTitle];

    // Joining date staggered between Jan 2024 and Jan 2026
    const joinDaysAgo = 30 + (i * 3) % 700;
    const joiningDate = new Date(Date.now() - joinDaysAgo * 24 * 60 * 60 * 1000);
    const basicWage = SALARIES[i % SALARIES.length];

    const bankAccount = `9182${String(10000000 + (i * 87654) % 90000000)}`;
    const bankIfsc = ['HDFC0001234', 'ICIC0002345', 'SBIN0003456', 'KKBK0004567', 'AXIS0005678'][i % 5];

    try {
      // 1. Create User
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          roleId: employeeRole.id,
        },
      });

      // 2. Create Employee
      const employee = await prisma.employee.create({
        data: {
          employeeCode,
          firstName: fn,
          lastName: ln,
          email,
          phone,
          departmentId: dept.id,
          jobPositionId: pos.id,
          workingScheduleId: standardSchedule.id,
          joiningDate,
          employmentStatus: i % 15 === 0 ? 'ON_LEAVE' : 'ACTIVE',
          employmentType: i % 12 === 0 ? 'CONTRACT' : 'FULL_TIME',
          bankAccountName: `${fn} ${ln}`,
          bankAccountNumber: bankAccount,
          bankIfsc,
          userId: user.id,
        },
      });

      // 3. Create Active Contract
      await prisma.contract.create({
        data: {
          employeeId: employee.id,
          startDate: joiningDate,
          basicWage,
          wageType: 'MONTHLY',
          departmentId: dept.id,
          jobPositionId: pos.id,
          workingScheduleId: standardSchedule.id,
          salaryStructureId: salaryStructure.id,
          status: 'ACTIVE',
        },
      });

      // 4. Create Leave Balances for 2026
      for (const lt of leaveTypes) {
        const allocated = lt.name.includes('Sick') ? 10 : (lt.name.includes('Casual') ? 12 : 20);
        const taken = Math.floor(Math.random() * 4);
        const remaining = allocated - taken;

        await prisma.leaveBalance.create({
          data: {
            employeeId: employee.id,
            leaveTypeId: lt.id,
            allocated,
            taken,
            remaining,
            validFrom: new Date('2026-01-01T00:00:00.000Z'),
            validTo: new Date('2026-12-31T23:59:59.000Z'),
          },
        });
      }

      // 5. Create Attendance for March 1-5, 2026
      const marchDays = ['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05'];
      for (const mDay of marchDays) {
        const dObj = new Date(mDay);
        // Skip Sunday
        if (dObj.getDay() === 0) continue;

        const isLate = Math.random() < 0.12;
        const checkInHour = isLate ? '09:35' : (Math.random() < 0.5 ? '08:55' : '09:05');
        const checkOutHour = '18:00';
        const ci = new Date(`${mDay}T${checkInHour}:00.000Z`);
        const co = new Date(`${mDay}T${checkOutHour}:00.000Z`);
        const workedHours = isLate ? 8.4 : 8.9;

        await prisma.attendance.create({
          data: {
            employeeId: employee.id,
            date: new Date(`${mDay}T00:00:00.000Z`),
            checkIn: ci,
            checkOut: co,
            workedHours,
            status: isLate ? 'LATE' : 'PRESENT',
            isLate,
            source: 'SELF_CHECKIN',
          },
        });
      }

      // 6. Occasional Leave Request (1 in 5 employees)
      if (i % 5 === 0 && leaveTypes.length > 0) {
        const reqLt = leaveTypes[i % leaveTypes.length];
        await prisma.leaveRequest.create({
          data: {
            employeeId: employee.id,
            leaveTypeId: reqLt.id,
            startDate: new Date('2026-03-12T00:00:00.000Z'),
            endDate: new Date('2026-03-14T00:00:00.000Z'),
            durationDays: 2.0,
            status: i % 10 === 0 ? 'APPROVED' : 'PENDING',
            reason: i % 2 === 0 ? 'Family occasion' : 'Medical checkup and rest',
          },
        });
      }

      count++;
      if (count % 25 === 0 || count === TOTAL_TO_ADD) {
        console.log(`  ✓ Populated ${count}/${TOTAL_TO_ADD} employees with contracts, attendance & balances...`);
      }
    } catch (err) {
      console.warn(`  Warning on employee ${employeeCode}: ${err.message}`);
    }
  }

  const finalCount = await prisma.employee.count();
  const contractCount = await prisma.contract.count();
  const attendanceCount = await prisma.attendance.count();
  const balanceCount = await prisma.leaveBalance.count();

  console.log('\n🎉 Bulk population complete!');
  console.log(`  Total Employees in DB: ${finalCount}`);
  console.log(`  Total Contracts: ${contractCount}`);
  console.log(`  Total Attendance Records: ${attendanceCount}`);
  console.log(`  Total Leave Balances: ${balanceCount}`);
  console.log('\nEvery newly created user can log in with:');
  console.log('  Email: <firstname>.<lastname>.<codeNum>@peoplepay360.com');
  console.log('  Password: Password@123\n');
}

main()
  .catch((e) => {
    console.error('Bulk seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
