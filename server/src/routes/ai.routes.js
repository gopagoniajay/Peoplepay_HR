const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ai.controller');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');

router.use(authenticateJWT);

// Anomaly Audit for a Payrun
router.get(
  '/payroll-anomalies/:payrunId',
  authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER']),
  ctrl.getPayrunAnomalies
);

// Natural Language Copilot Chat / Q&A (Available to all authenticated staff & admins)
router.post(
  '/ask',
  ctrl.askCopilot
);

// 1-Click C-Suite Executive Summary Memo
router.get(
  '/executive-summary/:payrunId',
  authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER']),
  ctrl.getExecutiveSummary
);

module.exports = router;
