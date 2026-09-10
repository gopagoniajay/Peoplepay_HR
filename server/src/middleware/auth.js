const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/db');

/**
 * Middleware: Verify JWT access token and attach user to request.
 */
const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Access token required' },
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    // Fetch fresh user data to ensure account is still valid
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: true,
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not found' },
      });
    }

    req.user = {
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role.name,
      employeeId: user.employee?.id || null,
      employeeName: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : null,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Access token expired' },
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid access token' },
      });
    }
    next(error);
  }
};

// Role alias map to support both canonical naming and display naming
const ROLE_ALIASES = {
  ADMIN: 'SUPER_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
  HR_PAYROLL_MANAGER: 'PAYROLL_MANAGER',
  PAYROLL_MANAGER: 'PAYROLL_MANAGER',
  HR_PAYROLL_USER: 'PAYROLL_USER',
  PAYROLL_USER: 'PAYROLL_USER',
  HR_MANAGER: 'HR_MANAGER',
  HR_STAFF: 'HR_STAFF',
  EMPLOYEE: 'EMPLOYEE',
};

const normalizeRole = (r) => ROLE_ALIASES[r] || r;

/**
 * Middleware factory: Restrict access to specific roles.
 * Supports role aliases (e.g. ADMIN <-> SUPER_ADMIN, HR_PAYROLL_MANAGER <-> PAYROLL_MANAGER).
 * @param {string[]} allowedRoles - Array of RoleName values
 */
const authorizeRole = (allowedRoles) => {
  const normalizedAllowed = allowedRoles.map(normalizeRole);
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const userRole = normalizeRole(req.user.roleName);

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        },
      });
    }

    next();
  };
};

/**
 * Middleware: For Employee-portal routes, ensure user can only access own data.
 * Checks if the resource's employeeId matches the requesting user's employeeId.
 */
const enforceSelfAccess = (employeeIdExtractor) => {
  return (req, res, next) => {
    if (req.user.roleName === 'EMPLOYEE') {
      const resourceEmployeeId = typeof employeeIdExtractor === 'function'
        ? employeeIdExtractor(req)
        : req.params.employeeId || req.query.employeeId || req.body.employeeId;

      if (resourceEmployeeId && resourceEmployeeId !== req.user.employeeId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied to other employee data' },
        });
      }

      // Force scope to own data
      if (!resourceEmployeeId) {
        req.query.employeeId = req.user.employeeId;
        req.body.employeeId = req.user.employeeId;
      }
    }
    next();
  };
};

module.exports = { authenticateJWT, authorizeRole, enforceSelfAccess };
