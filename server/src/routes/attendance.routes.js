const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attendance.controller');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');

router.use(authenticateJWT);

router.get('/my-today', ctrl.getMyToday);
router.post('/check-in', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PAYROLL_MANAGER', 'PAYROLL_USER', 'EMPLOYEE']), ctrl.checkIn);
router.post('/check-out', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PAYROLL_MANAGER', 'PAYROLL_USER', 'EMPLOYEE']), ctrl.checkOut);
router.post('/manual-entry', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'PAYROLL_USER']), ctrl.manualEntry);
router.get('/', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PAYROLL_MANAGER', 'PAYROLL_USER', 'EMPLOYEE']), ctrl.list);
router.put('/:id', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'PAYROLL_USER']), ctrl.manualCorrection);

module.exports = router;
