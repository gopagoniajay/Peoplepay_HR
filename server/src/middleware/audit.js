const prisma = require('../config/db');

/**
 * Middleware factory: Log mutating actions to the audit_logs table.
 * @param {string} entity - The entity name (e.g., "Employee", "Contract")
 * @param {string} action - The action type (CREATE, UPDATE, DELETE, APPROVE, FINALIZE, GENERATE)
 */
const auditLogger = (entity, action) => {
  return async (req, res, next) => {
    // Store original json method to intercept response
    const originalJson = res.json.bind(res);

    res.json = async function (body) {
      // Only log on successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300 && body?.success) {
        try {
          const entityId = body?.data?.id || req.params?.id || 'unknown';
          await prisma.auditLog.create({
            data: {
              userId: req.user?.userId || null,
              action,
              entity,
              entityId: String(entityId),
              previousValue: req._auditPreviousValue || null,
              newValue: body?.data || null,
              ipAddress: req.ip || req.connection?.remoteAddress,
            },
          });
        } catch (err) {
          // Audit logging should never break the main flow
          console.error('Audit log write failed:', err.message);
        }
      }
      return originalJson(body);
    };

    next();
  };
};

/**
 * Helper: Capture the previous state of an entity before mutation.
 * Call in the controller before making changes.
 */
const capturePreviousValue = (req, value) => {
  req._auditPreviousValue = value;
};

module.exports = { auditLogger, capturePreviousValue };
