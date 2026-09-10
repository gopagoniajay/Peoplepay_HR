const { ZodError } = require('zod');

/**
 * Global error handler middleware.
 */
const errorHandler = (err, req, res, next) => {
  // Only log full stack trace for 500 server errors; keep 4xx operational warnings concise
  const isOperational = (err instanceof ZodError) || (err.statusCode && err.statusCode < 500);
  if (!isOperational) {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err);
  } else {
    console.warn(`[WARN] ${req.method} ${req.path} (${err.statusCode || 400}): ${err.message}`);
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const issues = err.issues || err.errors || [];
    const firstMsg = issues[0]?.message || 'Validation failed';
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: firstMsg,
        details: issues.map((e) => ({
          field: Array.isArray(e.path) ? e.path.join('.') : '',
          message: e.message,
        })),
      },
    });
  }

  // Prisma known errors
  if (err.code === 'P2002') {
    const target = err.meta?.target;
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: `A record with this ${target || 'value'} already exists`,
      },
    });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'FOREIGN_KEY_ERROR',
        message: 'Referenced record does not exist',
      },
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: err.meta?.cause || 'Record not found',
      },
    });
  }

  // Custom application errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code || 'ERROR',
        message: err.message,
      },
    });
  }

  // Fallback: unexpected error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    },
  });
};

/**
 * Custom application error class.
 */
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}

module.exports = { errorHandler, AppError };
