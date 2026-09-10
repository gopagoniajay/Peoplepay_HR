const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const { AppError } = require('../middleware/errorHandler');

/**
 * List all users with assigned role and linked employee profile.
 */
const listUsers = async (req, res, next) => {
  try {
    const { search, role, page = 1, pageSize = 20 } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { employee: { firstName: { contains: search } } },
        { employee: { lastName: { contains: search } } },
        { employee: { employeeCode: { contains: search } } },
      ];
    }

    if (role) {
      where.role = { name: role };
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          roleId: true,
          role: { select: { id: true, name: true } },
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              department: { select: { name: true } },
              jobPosition: { select: { title: true } },
            },
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all available roles in the system.
 */
const listRoles = async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: roles });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new user account (Admin only).
 */
const createUser = async (req, res, next) => {
  try {
    const { email, password, roleId, roleName, employeeId } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('A user with this email already exists', 409);
    }

    let resolvedRoleId = roleId;
    if (!resolvedRoleId && roleName) {
      const roleRecord = await prisma.role.findUnique({ where: { name: roleName } });
      if (roleRecord) resolvedRoleId = roleRecord.id;
    }

    if (!resolvedRoleId) {
      // Default to EMPLOYEE
      const empRole = await prisma.role.findUnique({ where: { name: 'EMPLOYEE' } });
      resolvedRoleId = empRole?.id;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        roleId: resolvedRoleId,
      },
      include: {
        role: true,
      },
    });

    if (employeeId) {
      await prisma.employee.update({
        where: { id: employeeId },
        data: { userId: user.id },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign / update user's role (Admin only).
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { roleId, roleName } = req.body;

    let targetRoleId = roleId;
    if (!targetRoleId && roleName) {
      const roleRecord = await prisma.role.findUnique({ where: { name: roleName } });
      if (roleRecord) targetRoleId = roleRecord.id;
    }

    if (!targetRoleId) {
      throw new AppError('Valid roleId or roleName is required', 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { roleId: targetRoleId },
      include: {
        role: true,
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        employee: updatedUser.employee,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset user password (Admin only).
 */
const resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id },
      data: { passwordHash, refreshToken: null },
    });

    res.json({
      success: true,
      data: { message: 'Password has been reset successfully' },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete / deactivate a user (Admin only).
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.userId) {
      throw new AppError('You cannot delete your own admin account', 400);
    }

    // Unlink employee if any
    await prisma.employee.updateMany({
      where: { userId: id },
      data: { userId: null },
    });

    // Delete notifications & audit logs or user
    await prisma.notification.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    res.json({
      success: true,
      data: { message: 'User deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listUsers,
  listRoles,
  createUser,
  updateUserRole,
  resetPassword,
  deleteUser,
};
