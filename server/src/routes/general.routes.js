const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');
const { validate } = require('../validators/auth.validator');
const { departmentSchema, jobPositionSchema, workingScheduleSchema } = require('../validators/schemas');
const { AppError } = require('../middleware/errorHandler');

router.use(authenticateJWT);

// ─── Departments ────────────────────────────────────────

router.get('/departments', async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: departments });
  } catch (error) { next(error); }
});

router.post('/departments', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'PAYROLL_USER']), validate(departmentSchema), async (req, res, next) => {
  try {
    const dept = await prisma.department.create({ data: req.body });
    res.status(201).json({ success: true, data: dept });
  } catch (error) { next(error); }
});

router.put('/departments/:id', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'PAYROLL_USER']), async (req, res, next) => {
  try {
    const dept = await prisma.department.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: dept });
  } catch (error) { next(error); }
});

router.delete('/departments/:id', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER']), async (req, res, next) => {
  try {
    await prisma.department.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: { message: 'Department deleted' } });
  } catch (error) { next(error); }
});

// ─── Job Positions ──────────────────────────────────────

router.get('/job-positions', async (req, res, next) => {
  try {
    const positions = await prisma.jobPosition.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { title: 'asc' },
    });
    res.json({ success: true, data: positions });
  } catch (error) { next(error); }
});

router.post('/job-positions', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'PAYROLL_USER']), validate(jobPositionSchema), async (req, res, next) => {
  try {
    const pos = await prisma.jobPosition.create({ data: req.body });
    res.status(201).json({ success: true, data: pos });
  } catch (error) { next(error); }
});

router.put('/job-positions/:id', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'PAYROLL_USER']), async (req, res, next) => {
  try {
    const pos = await prisma.jobPosition.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: pos });
  } catch (error) { next(error); }
});

router.delete('/job-positions/:id', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER']), async (req, res, next) => {
  try {
    await prisma.jobPosition.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: { message: 'Position deleted' } });
  } catch (error) { next(error); }
});

// ─── Working Schedules ──────────────────────────────────

router.get('/working-schedules', async (req, res, next) => {
  try {
    const schedules = await prisma.workingSchedule.findMany({
      include: { scheduleDays: { orderBy: { dayOfWeek: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: schedules });
  } catch (error) { next(error); }
});

router.post('/working-schedules', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'PAYROLL_USER']), validate(workingScheduleSchema), async (req, res, next) => {
  try {
    const { scheduleDays, ...scheduleData } = req.body;

    const schedule = await prisma.$transaction(async (tx) => {
      const sched = await tx.workingSchedule.create({ data: scheduleData });

      if (scheduleDays && scheduleDays.length > 0) {
        await tx.scheduleDay.createMany({
          data: scheduleDays.map(d => ({
            workingScheduleId: sched.id,
            dayOfWeek: d.dayOfWeek,
            startTime: d.startTime,
            endTime: d.endTime,
            breakMinutes: d.breakMinutes || 0,
          })),
        });

        // Auto-calc total weekly hours
        let totalMinutes = 0;
        for (const d of scheduleDays) {
          const [sh, sm] = d.startTime.split(':').map(Number);
          const [eh, em] = d.endTime.split(':').map(Number);
          totalMinutes += (eh * 60 + em) - (sh * 60 + sm) - (d.breakMinutes || 0);
        }
        await tx.workingSchedule.update({
          where: { id: sched.id },
          data: { totalWeeklyHours: totalMinutes / 60 },
        });
      }

      return tx.workingSchedule.findUnique({
        where: { id: sched.id },
        include: { scheduleDays: { orderBy: { dayOfWeek: 'asc' } } },
      });
    });

    res.status(201).json({ success: true, data: schedule });
  } catch (error) { next(error); }
});

router.get('/working-schedules/:id', async (req, res, next) => {
  try {
    const schedule = await prisma.workingSchedule.findUnique({
      where: { id: req.params.id },
      include: { scheduleDays: { orderBy: { dayOfWeek: 'asc' } } },
    });
    if (!schedule) throw new AppError('Schedule not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: schedule });
  } catch (error) { next(error); }
});

router.put('/working-schedules/:id', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'PAYROLL_USER']), async (req, res, next) => {
  try {
    const { scheduleDays, ...scheduleData } = req.body;

    const schedule = await prisma.$transaction(async (tx) => {
      await tx.workingSchedule.update({ where: { id: req.params.id }, data: scheduleData });

      if (scheduleDays) {
        await tx.scheduleDay.deleteMany({ where: { workingScheduleId: req.params.id } });
        if (scheduleDays.length > 0) {
          await tx.scheduleDay.createMany({
            data: scheduleDays.map(d => ({
              workingScheduleId: req.params.id,
              dayOfWeek: d.dayOfWeek,
              startTime: d.startTime,
              endTime: d.endTime,
              breakMinutes: d.breakMinutes || 0,
            })),
          });

          let totalMinutes = 0;
          for (const d of scheduleDays) {
            const [sh, sm] = d.startTime.split(':').map(Number);
            const [eh, em] = d.endTime.split(':').map(Number);
            totalMinutes += (eh * 60 + em) - (sh * 60 + sm) - (d.breakMinutes || 0);
          }
          await tx.workingSchedule.update({
            where: { id: req.params.id },
            data: { totalWeeklyHours: totalMinutes / 60 },
          });
        }
      }

      return tx.workingSchedule.findUnique({
        where: { id: req.params.id },
        include: { scheduleDays: { orderBy: { dayOfWeek: 'asc' } } },
      });
    });

    res.json({ success: true, data: schedule });
  } catch (error) { next(error); }
});

router.delete('/working-schedules/:id', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER']), async (req, res, next) => {
  try {
    await prisma.workingSchedule.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: { message: 'Schedule deleted' } });
  } catch (error) { next(error); }
});

// ─── Notifications ──────────────────────────────────────

router.get('/notifications', async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.userId, isRead: false },
    });
    res.json({ success: true, data: { items: notifications, unreadCount } });
  } catch (error) { next(error); }
});

router.put('/notifications/:id/read', async (req, res, next) => {
  try {
    const notif = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ success: true, data: notif });
  } catch (error) { next(error); }
});

router.put('/notifications/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, data: { message: 'All notifications marked as read' } });
  } catch (error) { next(error); }
});

// ─── Audit Logs ─────────────────────────────────────────

router.get('/audit-logs', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'HR_MANAGER']), async (req, res, next) => {
  try {
    const { entity, entityId, userId, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;

    // Scope for non-admin
    if (req.user.roleName === 'HR_MANAGER') {
      where.entity = { in: ['Employee', 'Contract', 'Attendance', 'LeaveRequest'] };
    } else if (req.user.roleName === 'PAYROLL_MANAGER') {
      where.entity = { in: ['SalaryRule', 'SalaryStructure', 'Payrun', 'Payslip'] };
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ success: true, data: { items, page: parseInt(page), pageSize: parseInt(pageSize), total } });
  } catch (error) { next(error); }
});

// ─── Global Universal Search ──────────────────────────────

router.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.json({ success: true, data: { results: {}, total: 0 } });
    }

    const roleName = req.user.roleName;
    const isEmployee = (roleName === 'EMPLOYEE');
    const isHR = ['HR_MANAGER', 'SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER'].includes(roleName);
    const isPayroll = ['PAYROLL_USER', 'PAYROLL_MANAGER', 'SUPER_ADMIN'].includes(roleName);

    // Find linked employee ID if any
    let employeeId = req.user.employeeId;
    if (!employeeId && req.user.userId) {
      const emp = await prisma.employee.findFirst({
        where: { OR: [{ userId: req.user.userId }, { email: req.user.email }] },
        select: { id: true }
      });
      if (emp) employeeId = emp.id;
    }

    const results = {
      pages: [],
      employees: [],
      contracts: [],
      payruns: [],
      payslips: [],
      leaves: [],
      salaryStructures: []
    };

    // 1. Navigation Pages (Filtered by RBAC)
    const allPages = [
      { title: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', desc: 'Workforce analytics & metrics', roles: ['ALL'] },
      { title: 'Employee Directory', path: '/employees', icon: 'Users', desc: 'Manage staff profiles & directory', roles: ['HR_MANAGER', 'PAYROLL_USER', 'PAYROLL_MANAGER', 'SUPER_ADMIN'] },
      { title: 'Shift Attendance', path: '/attendance', icon: 'Clock', desc: 'Daily punch logs & worked hours', roles: ['ALL'] },
      { title: 'Time Off & Leaves', path: '/leave', icon: 'CalendarCheck', desc: 'Leave requests, balances & approvals', roles: ['ALL'] },
      { title: 'Contracts & Work Shifts', path: '/contracts', icon: 'FileText', desc: 'Staff agreements & schedules', roles: ['HR_MANAGER', 'PAYROLL_USER', 'PAYROLL_MANAGER', 'SUPER_ADMIN'] },
      { title: 'Payroll Batches & Cycles', path: '/payroll', icon: 'Calculator', desc: 'Batch computation & disbursement', roles: ['PAYROLL_USER', 'PAYROLL_MANAGER', 'SUPER_ADMIN'] },
      { title: 'Salary Structures & Rules', path: '/salary-structures', icon: 'Layers', desc: 'Compensation formula templates', roles: ['PAYROLL_USER', 'PAYROLL_MANAGER', 'SUPER_ADMIN'] },
      { title: 'Payslip Statements', path: '/payslips', icon: 'Receipt', desc: 'Download itemized salary slips', roles: ['ALL'] },
      { title: 'Employee Self-Service Portal', path: '/portal', icon: 'User', desc: 'Personal records & shift history', roles: ['EMPLOYEE', 'SUPER_ADMIN'] },
      { title: 'User Management & Roles', path: '/admin/users', icon: 'Shield', desc: 'Admin account & role configuration', roles: ['SUPER_ADMIN'] },
    ];

    results.pages = allPages.filter(p => {
      const roleAllowed = p.roles.includes('ALL') || p.roles.includes(roleName);
      const matchesQuery = p.title.toLowerCase().includes(q.toLowerCase()) || p.desc.toLowerCase().includes(q.toLowerCase());
      return roleAllowed && matchesQuery;
    });

    // EMPLOYEES (HR & Payroll & Admin)
    if (!isEmployee && isHR) {
      const emps = await prisma.employee.findMany({
        where: {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { employeeCode: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
            { department: { name: { contains: q } } },
            { jobPosition: { title: { contains: q } } },
          ]
        },
        include: { department: true, jobPosition: true },
        take: 6
      });
      results.employees = emps.map(e => ({
        id: e.id,
        title: `${e.firstName} ${e.lastName}`,
        subtitle: `${e.employeeCode} • ${e.department?.name || 'Staff'} • ${e.jobPosition?.title || 'Member'}`,
        path: `/employees`,
        status: e.employmentStatus
      }));
    }

    // CONTRACTS (HR & Payroll & Admin)
    if (!isEmployee && isHR) {
      const contracts = await prisma.contract.findMany({
        where: {
          OR: [
            { employee: { firstName: { contains: q } } },
            { employee: { lastName: { contains: q } } },
            { employee: { employeeCode: { contains: q } } },
          ]
        },
        include: { employee: true },
        take: 5
      });
      results.contracts = contracts.map(c => ({
        id: c.id,
        title: `${c.employee?.firstName} ${c.employee?.lastName} Contract`,
        subtitle: `${c.wageType} • ₹${parseFloat(c.basicWage || 0).toLocaleString('en-IN')}/mo • ${c.status}`,
        path: `/contracts`,
        status: c.status
      }));
    }

    // PAYRUNS (Payroll & Admin)
    if (!isEmployee && isPayroll) {
      const validPayrunStatuses = ['DRAFT', 'COMPUTED', 'VALIDATED', 'PAID', 'CANCELLED'];
      const matchedStatus = validPayrunStatuses.find(s => s === q.toUpperCase());
      const payruns = await prisma.payrun.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            ...(matchedStatus ? [{ status: matchedStatus }] : [])
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      results.payruns = payruns.map(p => ({
        id: p.id,
        title: p.name,
        subtitle: `Status: ${p.status} • ${new Date(p.periodStart).toLocaleDateString()} to ${new Date(p.periodEnd).toLocaleDateString()}`,
        path: `/payroll`,
        status: p.status
      }));
    }

    // PAYSLIPS (For Employee: only own; For Payroll/Admin: all)
    const payslipWhere = isEmployee
      ? {
          employeeId: employeeId || '__NO_ID__',
          OR: [
            { payrun: { name: { contains: q } } }
          ]
        }
      : isPayroll
      ? {
          OR: [
            { payrun: { name: { contains: q } } },
            { employee: { firstName: { contains: q } } },
            { employee: { lastName: { contains: q } } },
            { employee: { employeeCode: { contains: q } } },
          ]
        }
      : null;

    if (payslipWhere) {
      const slips = await prisma.payslip.findMany({
        where: payslipWhere,
        include: { employee: true, payrun: true },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      results.payslips = slips.map(s => ({
        id: s.id,
        title: `${s.employee?.firstName} ${s.employee?.lastName} — ${s.payrun?.name || 'Payslip'}`,
        subtitle: `Net: ₹${parseFloat(s.netSalary || 0).toLocaleString('en-IN')} • Worked: ${s.workedDays || 0}d • ${s.status}`,
        path: `/payslips`,
        status: s.status
      }));
    }

    // LEAVE REQUESTS (For Employee: own; For HR: all)
    const validLeaveStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
    const matchedLeaveStatus = validLeaveStatuses.find(s => s === q.toUpperCase());
    const leaveWhere = isEmployee
      ? {
          employeeId: employeeId || '__NO_ID__',
          OR: [
            { leaveType: { name: { contains: q } } },
            { reason: { contains: q } },
            ...(matchedLeaveStatus ? [{ status: matchedLeaveStatus }] : [])
          ]
        }
      : isHR
      ? {
          OR: [
            { employee: { firstName: { contains: q } } },
            { employee: { lastName: { contains: q } } },
            { employee: { employeeCode: { contains: q } } },
            { leaveType: { name: { contains: q } } },
            { reason: { contains: q } },
            ...(matchedLeaveStatus ? [{ status: matchedLeaveStatus }] : [])
          ]
        }
      : null;

    if (leaveWhere) {
      const leaves = await prisma.leaveRequest.findMany({
        where: leaveWhere,
        include: { employee: true, leaveType: true },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      results.leaves = leaves.map(l => ({
        id: l.id,
        title: `${l.employee?.firstName} ${l.employee?.lastName} — ${l.leaveType?.name || 'Leave'}`,
        subtitle: `${new Date(l.startDate).toLocaleDateString()} to ${new Date(l.endDate).toLocaleDateString()} • ${l.status}`,
        path: `/leave`,
        status: l.status
      }));
    }

    // SALARY STRUCTURES (Payroll & Admin)
    if (!isEmployee && isPayroll) {
      const structures = await prisma.salaryStructure.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { code: { contains: q } },
            { description: { contains: q } }
          ]
        },
        take: 5
      });
      results.salaryStructures = structures.map(st => ({
        id: st.id,
        title: `${st.name} (${st.code})`,
        subtitle: st.description || `Salary calculation structure template`,
        path: `/salary-structures`
      }));
    }

    const totalMatches =
      results.pages.length +
      results.employees.length +
      results.contracts.length +
      results.payruns.length +
      results.payslips.length +
      results.leaves.length +
      results.salaryStructures.length;

    res.json({ success: true, data: { results, total: totalMatches, query: q } });
  } catch (error) { next(error); }
});

module.exports = router;
