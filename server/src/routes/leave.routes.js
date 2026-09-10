const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/leave.controller');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');
const { validate } = require('../validators/auth.validator');
const { leaveTypeSchema, leaveBalanceSchema, leaveRequestSchema } = require('../validators/schemas');

router.use(authenticateJWT);

// Leave Types
router.get('/types', ctrl.listLeaveTypes);
router.post('/types', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'PAYROLL_USER']), validate(leaveTypeSchema), ctrl.createLeaveType);
router.put('/types/:id', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'PAYROLL_USER']), ctrl.updateLeaveType);

// Leave Balances
router.get('/balances', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PAYROLL_MANAGER', 'PAYROLL_USER', 'EMPLOYEE']), ctrl.listBalances);
router.get('/balances/my', ctrl.getMyBalances);
router.post('/balances', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'PAYROLL_USER']), validate(leaveBalanceSchema), ctrl.allocateBalance);

// Leave Requests
router.get('/requests', ctrl.listRequests);
router.post('/requests', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'EMPLOYEE']), validate(leaveRequestSchema), ctrl.submitRequest);
router.get('/requests/:id', ctrl.getRequest);
router.put('/requests/:id/approve', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PAYROLL_MANAGER', 'PAYROLL_USER']), ctrl.approveRequest);
router.patch('/requests/:id/approve', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PAYROLL_MANAGER', 'PAYROLL_USER']), ctrl.approveRequest);
router.put('/requests/:id/reject', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PAYROLL_MANAGER', 'PAYROLL_USER']), ctrl.rejectRequest);
router.patch('/requests/:id/reject', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PAYROLL_MANAGER', 'PAYROLL_USER']), ctrl.rejectRequest);

module.exports = router;
