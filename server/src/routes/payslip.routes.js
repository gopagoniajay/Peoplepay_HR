const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/payslip.controller');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');

router.use(authenticateJWT);
router.use(authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER', 'EMPLOYEE']));

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.get('/:id/pdf', ctrl.downloadPdf);

module.exports = router;
