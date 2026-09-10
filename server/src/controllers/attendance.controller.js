const prisma = require('../config/db');
const attendanceService = require('../services/attendance.service');

const resolveUserEmployeeId = async (user) => {
  if (user.employeeId) return user.employeeId;
  if (user.userId) {
    const emp = await prisma.employee.findFirst({
      where: { OR: [{ userId: user.userId }, { email: user.email }] }
    });
    if (emp) return emp.id;
  }
  return null;
};

const getMyToday = async (req, res, next) => {
  try {
    const empId = await resolveUserEmployeeId(req.user);
    const result = await attendanceService.getMyToday(empId, req.user.userId);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const checkIn = async (req, res, next) => {
  try {
    const empId = await resolveUserEmployeeId(req.user);
    const result = await attendanceService.checkIn(empId, req.user.userId);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
};

const checkOut = async (req, res, next) => {
  try {
    const empId = await resolveUserEmployeeId(req.user);
    const result = await attendanceService.checkOut(empId, req.user.userId);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const list = async (req, res, next) => {
  try {
    const query = { ...req.query };
    // Strict isolation: if role is EMPLOYEE, restrict strictly to their own employee records
    if (req.user.roleName === 'EMPLOYEE') {
      const empId = await resolveUserEmployeeId(req.user);
      query.employeeId = empId || '00000000-0000-0000-0000-000000000000';
    }
    const result = await attendanceService.list(query);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const manualCorrection = async (req, res, next) => {
  try {
    if (req.user.roleName === 'EMPLOYEE') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Employees cannot manually correct attendance' } });
    }
    const result = await attendanceService.manualCorrection(req.params.id, req.body, req.user.userId);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const manualEntry = async (req, res, next) => {
  try {
    if (req.user.roleName === 'EMPLOYEE') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Employees cannot create manual attendance' } });
    }
    const result = await attendanceService.manualEntry(req.body, req.user.userId);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

module.exports = { getMyToday, checkIn, checkOut, list, manualCorrection, manualEntry };
