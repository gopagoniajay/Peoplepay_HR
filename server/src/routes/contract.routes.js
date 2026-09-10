const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/contract.controller');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');
const { auditLogger } = require('../middleware/audit');
const { validate } = require('../validators/auth.validator');
const { contractCreateSchema, contractUpdateSchema } = require('../validators/schemas');

router.use(authenticateJWT);

router.get('/', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PAYROLL_MANAGER', 'PAYROLL_USER', 'EMPLOYEE']), ctrl.list);
router.post('/', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'PAYROLL_USER']), validate(contractCreateSchema), auditLogger('Contract', 'CREATE'), ctrl.create);
router.get('/resolve', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER', 'HR_MANAGER']), ctrl.resolve);
router.get('/:id', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PAYROLL_MANAGER', 'PAYROLL_USER', 'EMPLOYEE']), ctrl.getById);
router.put('/:id', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'PAYROLL_USER']), validate(contractUpdateSchema), auditLogger('Contract', 'UPDATE'), ctrl.update);
router.delete('/:id', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'PAYROLL_USER']), auditLogger('Contract', 'DELETE'), ctrl.remove);

module.exports = router;
