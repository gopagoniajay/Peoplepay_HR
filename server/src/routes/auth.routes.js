const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateJWT } = require('../middleware/auth');
const { loginSchema, validate } = require('../validators/auth.validator');

// Public routes
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);

// Protected routes
router.get('/me', authenticateJWT, authController.getMe);
router.post('/logout', authenticateJWT, authController.logout);

module.exports = router;
