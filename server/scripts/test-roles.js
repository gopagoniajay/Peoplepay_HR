const BASE_URL = 'http://localhost:5000/api';

async function login(email, password = 'Password@123') {
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) {
      console.error(`Login failed for ${email}:`, json);
      return null;
    }
    return json.data.accessToken;
  } catch (err) {
    console.error(`Login error for ${email}:`, err.message);
    return null;
  }
}

async function testEndpoint(roleName, token, method, url, data = null) {
  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return { status: res.status, success: res.ok };
  } catch (err) {
    return { status: 500, error: err.message, success: false };
  }
}

async function runRoleTests() {
  console.log('--- STARTING 5-ROLE RBAC VALIDATION TESTS ---\n');

  // 1. Admin Tests
  const adminToken = await login('admin@peoplepay360.com');
  if (adminToken) {
    const usersTest = await testEndpoint('Admin', adminToken, 'GET', '/users');
    console.log(`[Admin] GET /api/users: status=${usersTest.status} (Expected: 200) -> ${usersTest.status === 200 ? 'PASS' : 'FAIL'}`);

    const rolesTest = await testEndpoint('Admin', adminToken, 'GET', '/users/roles');
    console.log(`[Admin] GET /api/users/roles: status=${rolesTest.status} (Expected: 200) -> ${rolesTest.status === 200 ? 'PASS' : 'FAIL'}`);
  }

  // 2. HR Manager Tests (Should have Core HR CRUD, but ZERO payroll access)
  const hrToken = await login('hr.manager@peoplepay360.com');
  if (hrToken) {
    const hrEmpTest = await testEndpoint('HR Manager', hrToken, 'GET', '/employees');
    console.log(`[HR Manager] GET /api/employees: status=${hrEmpTest.status} (Expected: 200) -> ${hrEmpTest.status === 200 ? 'PASS' : 'FAIL'}`);

    const hrContractTest = await testEndpoint('HR Manager', hrToken, 'GET', '/contracts');
    console.log(`[HR Manager] GET /api/contracts: status=${hrContractTest.status} (Expected: 200) -> ${hrContractTest.status === 200 ? 'PASS' : 'FAIL'}`);

    const hrPayrollForbidden = await testEndpoint('HR Manager', hrToken, 'GET', '/payroll/payruns');
    console.log(`[HR Manager] GET /api/payroll/payruns: status=${hrPayrollForbidden.status} (Expected: 403) -> ${hrPayrollForbidden.status === 403 ? 'PASS' : 'FAIL'}`);

    const hrSalaryForbidden = await testEndpoint('HR Manager', hrToken, 'GET', '/salary/structures');
    console.log(`[HR Manager] GET /api/salary/structures: status=${hrSalaryForbidden.status} (Expected: 403) -> ${hrSalaryForbidden.status === 403 ? 'PASS' : 'FAIL'}`);

    const hrUsersForbidden = await testEndpoint('HR Manager', hrToken, 'GET', '/users');
    console.log(`[HR Manager] GET /api/users: status=${hrUsersForbidden.status} (Expected: 403) -> ${hrUsersForbidden.status === 403 ? 'PASS' : 'FAIL'}`);
  }

  // 3. HR Payroll User Tests (HR permissions + Payruns/Payslips CRU + Salary Read-Only)
  const payrollUserToken = await login('payroll.user@peoplepay360.com');
  if (payrollUserToken) {
    const puStructuresRead = await testEndpoint('HR Payroll User', payrollUserToken, 'GET', '/salary/structures');
    console.log(`[HR Payroll User] GET /api/salary/structures: status=${puStructuresRead.status} (Expected: 200) -> ${puStructuresRead.status === 200 ? 'PASS' : 'FAIL'}`);

    const puStructuresWrite = await testEndpoint('HR Payroll User', payrollUserToken, 'POST', '/salary/structures', { name: 'Test' });
    console.log(`[HR Payroll User] POST /api/salary/structures: status=${puStructuresWrite.status} (Expected: 403) -> ${puStructuresWrite.status === 403 ? 'PASS' : 'FAIL'}`);

    const puPayrunRead = await testEndpoint('HR Payroll User', payrollUserToken, 'GET', '/payroll/payruns');
    console.log(`[HR Payroll User] GET /api/payroll/payruns: status=${puPayrunRead.status} (Expected: 200) -> ${puPayrunRead.status === 200 ? 'PASS' : 'FAIL'}`);

    const puPayrunApprove = await testEndpoint('HR Payroll User', payrollUserToken, 'POST', '/payroll/payruns/test-id/approve');
    console.log(`[HR Payroll User] POST /api/payroll/payruns/:id/approve: status=${puPayrunApprove.status} (Expected: 403) -> ${puPayrunApprove.status === 403 ? 'PASS' : 'FAIL'}`);
  }

  // 4. Employee Tests (Self-service only)
  const employeeToken = await login('aisha.verma@peoplepay360.com');
  if (employeeToken) {
    const empAttTest = await testEndpoint('Employee', employeeToken, 'GET', '/attendance/my-today');
    console.log(`[Employee] GET /api/attendance/my-today: status=${empAttTest.status} (Expected: 200) -> ${empAttTest.status === 200 ? 'PASS' : 'FAIL'}`);

    const empDirectoryForbidden = await testEndpoint('Employee', employeeToken, 'GET', '/employees');
    console.log(`[Employee] GET /api/employees: status=${empDirectoryForbidden.status} (Expected: 403) -> ${empDirectoryForbidden.status === 403 ? 'PASS' : 'FAIL'}`);

    const empPayrollForbidden = await testEndpoint('Employee', employeeToken, 'GET', '/payroll/payruns');
    console.log(`[Employee] GET /api/payroll/payruns: status=${empPayrollForbidden.status} (Expected: 403) -> ${empPayrollForbidden.status === 403 ? 'PASS' : 'FAIL'}`);
  }

  console.log('\n--- ALL ROLE PERMISSION TESTS COMPLETED ---');
}

runRoleTests();
