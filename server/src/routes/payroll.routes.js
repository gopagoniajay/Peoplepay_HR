const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/payroll.controller');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');
const { auditLogger } = require('../middleware/audit');
const { validate } = require('../validators/auth.validator');
const { payrunCreateSchema, selectEmployeesSchema } = require('../validators/schemas');

router.use(authenticateJWT);

// Payrun CRUD
router.get('/payruns', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER']), ctrl.listPayruns);
router.post('/payruns', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER']), validate(payrunCreateSchema), auditLogger('Payrun', 'CREATE'), ctrl.createPayrun);
router.get('/payruns/:id', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER']), ctrl.getPayrunDetail);

// Payrun workflow
router.get('/payruns/:id/eligible-employees', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER']), ctrl.getEligibleEmployees);
router.post('/payruns/:id/select-employees', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER']), validate(selectEmployeesSchema), ctrl.selectEmployees);
router.post('/payruns/:id/calculate', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER']), auditLogger('Payrun', 'CALCULATE'), ctrl.calculate);
router.post('/payruns/:id/validate', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER']), ctrl.validatePayrun);
router.post('/payruns/:id/approve', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER']), auditLogger('Payrun', 'APPROVE'), ctrl.approve);
router.post('/payruns/:id/finalize', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER']), auditLogger('Payrun', 'FINALIZE'), ctrl.finalize);
router.post('/payruns/:id/mark-paid', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER']), auditLogger('Payrun', 'MARK_PAID'), ctrl.markPaid);
router.post('/payruns/:id/send-payslips', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER']), auditLogger('Payrun', 'SEND_PAYSLIPS'), ctrl.sendPayslips);
router.post('/payruns/:id/sync-employees', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER']), auditLogger('Payrun', 'SYNC_EMPLOYEES'), ctrl.syncEmployees);
router.post('/payruns/:id/reset', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER']), auditLogger('Payrun', 'RESET'), ctrl.resetToDraft);

module.exports = router;
