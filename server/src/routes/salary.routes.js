const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/salary.controller');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');
const { auditLogger } = require('../middleware/audit');
const { validate } = require('../validators/auth.validator');
const { salaryStructureSchema, salaryRuleSchema } = require('../validators/schemas');

router.use(authenticateJWT);

// Salary Structures
router.get('/structures', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER']), ctrl.listStructures);
router.get('/structures/:id', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER']), ctrl.getStructure);
router.post('/structures', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER']), validate(salaryStructureSchema), auditLogger('SalaryStructure', 'CREATE'), ctrl.createStructure);
router.put('/structures/:id', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER']), auditLogger('SalaryStructure', 'UPDATE'), ctrl.updateStructure);
router.delete('/structures/:id', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER']), auditLogger('SalaryStructure', 'DELETE'), ctrl.deleteStructure);
router.post('/structures/:id/rules', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER']), ctrl.addRuleToStructure);
router.delete('/structures/:id/rules/:ruleId', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER']), ctrl.removeRuleFromStructure);

// Salary Rules
router.get('/rules', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER']), ctrl.listRules);
router.get('/rules/:id', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER']), ctrl.getRule);
router.post('/rules', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER']), validate(salaryRuleSchema), auditLogger('SalaryRule', 'CREATE'), ctrl.createRule);
router.put('/rules/:id', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER']), auditLogger('SalaryRule', 'UPDATE'), ctrl.updateRule);
router.delete('/rules/:id', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER']), auditLogger('SalaryRule', 'DELETE'), ctrl.deleteRule);
router.post('/rules/test', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER']), ctrl.testRule);

module.exports = router;
