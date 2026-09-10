const prisma = require('../config/db');
const leaveService = require('../services/leave.service');

// Leave Types
const createLeaveType = async (req, res, next) => {
  try {
    const result = await leaveService.createLeaveType(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
};

const listLeaveTypes = async (req, res, next) => {
  try {
    const result = await leaveService.listLeaveTypes();
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const updateLeaveType = async (req, res, next) => {
  try {
    const result = await leaveService.updateLeaveType(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

// Leave Balances
const allocateBalance = async (req, res, next) => {
  try {
    const result = await leaveService.allocateBalance(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
};

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

const listBalances = async (req, res, next) => {
  try {
    const query = { ...req.query };
    if (req.user.roleName === 'EMPLOYEE') {
      const empId = await resolveUserEmployeeId(req.user);
      query.employeeId = empId || '00000000-0000-0000-0000-000000000000';
    }
    const result = await leaveService.listBalances(query);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const getMyBalances = async (req, res, next) => {
  try {
    const employeeId = await resolveUserEmployeeId(req.user);
    const result = employeeId ? await leaveService.getBalances(employeeId) : [];
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

// Leave Requests
const submitRequest = async (req, res, next) => {
  try {
    let employeeId = req.user.employeeId || req.body.employeeId;
    if (!employeeId) {
      employeeId = await resolveUserEmployeeId(req.user);
    }
    if (!employeeId) {
      return res.status(400).json({ success: false, error: { code: 'NO_EMPLOYEE', message: 'No linked employee profile found' } });
    }
    const result = await leaveService.submitRequest(employeeId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
};

const listRequests = async (req, res, next) => {
  try {
    const query = { ...req.query };
    // Strict isolation: if role is EMPLOYEE, restrict strictly to their own requests
    if (req.user.roleName === 'EMPLOYEE') {
      const empId = await resolveUserEmployeeId(req.user);
      query.employeeId = empId || '00000000-0000-0000-0000-000000000000';
    }
    const result = await leaveService.listRequests(query);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const getRequest = async (req, res, next) => {
  try {
    const result = await leaveService.getRequestById(req.params.id);
    if (req.user.roleName === 'EMPLOYEE') {
      const empId = await resolveUserEmployeeId(req.user);
      if (result.employeeId !== empId) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot access other employee leave requests' } });
      }
    }
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const approveRequest = async (req, res, next) => {
  try {
    if (req.user.roleName === 'EMPLOYEE') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Employees cannot approve leave requests' } });
    }
    const result = await leaveService.approveRequest(req.params.id, req.user.userId);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const rejectRequest = async (req, res, next) => {
  try {
    if (req.user.roleName === 'EMPLOYEE') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Employees cannot reject leave requests' } });
    }
    const result = await leaveService.rejectRequest(req.params.id, req.user.userId);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

module.exports = {
  createLeaveType, listLeaveTypes, updateLeaveType,
  allocateBalance, listBalances, getMyBalances,
  submitRequest, listRequests, getRequest, approveRequest, rejectRequest,
};
