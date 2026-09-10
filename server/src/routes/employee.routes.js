const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee.controller');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');
const { auditLogger } = require('../middleware/audit');
const { validate, validateQuery } = require('../validators/auth.validator');
const { employeeCreateSchema, employeeUpdateSchema, employeeQuerySchema } = require('../validators/employee.validator');

// All routes require authentication
router.use(authenticateJWT);

// List employees (Staff Directory - HR & Payroll roles only)
router.get(
  '/',
  authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PAYROLL_MANAGER', 'PAYROLL_USER']),
  employeeController.list
);

// Create employee
router.post(
  '/',
  authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'PAYROLL_USER']),
  validate(employeeCreateSchema),
  auditLogger('Employee', 'CREATE'),
  employeeController.create
);

// Get employee detail
router.get(
  '/:id',
  authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PAYROLL_MANAGER', 'PAYROLL_USER', 'EMPLOYEE']),
  employeeController.getById
);

// Get employee summary (smart button counts - HR & Payroll only)
router.get(
  '/:id/summary',
  authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PAYROLL_MANAGER', 'PAYROLL_USER']),
  employeeController.getSummary
);

// Update employee
router.put(
  '/:id',
  authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'PAYROLL_USER']),
  validate(employeeUpdateSchema),
  auditLogger('Employee', 'UPDATE'),
  employeeController.update
);

// Terminate (soft-delete) employee
router.delete(
  '/:id',
  authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'PAYROLL_USER']),
  auditLogger('Employee', 'DELETE'),
  employeeController.terminate
);

module.exports = router;
