const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/user.controller');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');

router.use(authenticateJWT);
// Restrict all user management endpoints exclusively to Admin
router.use(authorizeRole(['SUPER_ADMIN', 'ADMIN']));

router.get('/', ctrl.listUsers);
router.get('/roles', ctrl.listRoles);
router.post('/', ctrl.createUser);
router.put('/:id/role', ctrl.updateUserRole);
router.put('/:id/password', ctrl.resetPassword);
router.delete('/:id', ctrl.deleteUser);

module.exports = router;
