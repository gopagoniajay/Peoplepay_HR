const prisma = require('../config/db');
const authService = require('./auth.service');
const { AppError } = require('../middleware/errorHandler');

class EmployeeService {
  /**
   * Generate next employee code (EMP-0001, EMP-0002, etc.)
   */
  async generateEmployeeCode() {
    const lastEmployee = await prisma.employee.findFirst({
      orderBy: { employeeCode: 'desc' },
      select: { employeeCode: true },
    });

    if (!lastEmployee) return 'EMP-0001';

    const lastNum = parseInt(lastEmployee.employeeCode.replace('EMP-', ''), 10);
    return `EMP-${String(lastNum + 1).padStart(4, '0')}`;
  }

  /**
   * Create a new employee + auto-create a User account (role: EMPLOYEE).
   */
  async create(data) {
    const employeeCode = await this.generateEmployeeCode();

    // Check email uniqueness
    const existing = await prisma.employee.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError('Email already in use', 409, 'DUPLICATE_EMAIL');
    }

    // Create user account with default password (hash before transaction)
    const defaultPassword = 'Password@123';
    const passwordHash = await authService.hashPassword(defaultPassword);

    return prisma.$transaction(async (tx) => {
      // Find EMPLOYEE role
      const employeeRole = await tx.role.findUnique({ where: { name: 'EMPLOYEE' } });
      if (!employeeRole) {
        throw new AppError('EMPLOYEE role not found. Run seed first.', 500, 'ROLE_NOT_FOUND');
      }

      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          roleId: employeeRole.id,
        },
      });

      // Parse dates properly for Prisma @db.Date
      const parsedJoiningDate = data.joiningDate ? new Date(data.joiningDate) : new Date();
      const parsedDob = data.dateOfBirth ? new Date(data.dateOfBirth) : null;

      // Create employee
      const employee = await tx.employee.create({
        data: {
          employeeCode,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone || null,
          departmentId: data.departmentId || null,
          jobPositionId: data.jobPositionId || null,
          managerId: data.managerId || null,
          workingScheduleId: data.workingScheduleId || null,
          joiningDate: parsedJoiningDate,
          employmentStatus: data.employmentStatus || data.status || 'ACTIVE',
          employmentType: data.employmentType || 'FULL_TIME',
          bankAccountName: data.bankAccountName || null,
          bankAccountNumber: data.bankAccountNumber || null,
          bankIfsc: data.bankIfsc || null,
          profilePhotoUrl: data.profilePhotoUrl || null,
          dateOfBirth: parsedDob,
          gender: data.gender || null,
          address: data.address || null,
          userId: user.id,
        },
        include: {
          department: true,
          jobPosition: true,
          manager: { select: { id: true, firstName: true, lastName: true } },
          workingSchedule: true,
        },
      });

      return employee;
    }, { timeout: 15000 });
  }

  /**
   * List employees with search, filter, sort, and pagination.
   */
  async list(query) {
    const {
      search, department, status, employmentType,
      sort = 'firstName', order = 'asc',
      page = 1, pageSize = 500,
    } = query;

    const where = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { employeeCode: { contains: search } },
      ];
    }

    if (department) {
      where.departmentId = department;
    }

    if (status) {
      where.employmentStatus = status;
    }

    if (employmentType) {
      where.employmentType = employmentType;
    }

    const take = parseInt(pageSize, 10) || 500;
    const pageNum = parseInt(page, 10) || 1;
    const skip = (pageNum - 1) * take;

    const [items, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: {
          department: true,
          jobPosition: true,
          manager: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
          workingSchedule: { select: { id: true, name: true, type: true, totalWeeklyHours: true } },
          _count: {
            select: {
              contracts: true,
              attendance: true,
              leaveRequests: true,
              payslips: true,
            },
          },
        },
        orderBy: { [sort]: order },
        skip,
        take,
      }),
      prisma.employee.count({ where }),
    ]);

    return { items, page: pageNum, pageSize: take, total };
  }

  /**
   * Get single employee by ID with relations.
   */
  async getById(id) {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        jobPosition: true,
        manager: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        workingSchedule: { include: { scheduleDays: true } },
        user: { select: { id: true, email: true, role: { select: { name: true } } } },
        _count: {
          select: {
            contracts: true,
            attendance: true,
            leaveRequests: true,
            payslips: true,
          },
        },
      },
    });

    if (!employee) {
      throw new AppError('Employee not found', 404, 'NOT_FOUND');
    }

    return employee;
  }

  /**
   * Update employee.
   */
  async update(id, data) {
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      throw new AppError('Employee not found', 404, 'NOT_FOUND');
    }

    // If email changed, check uniqueness and update linked user
    if (data.email && data.email !== employee.email) {
      const emailExists = await prisma.employee.findFirst({
        where: { email: data.email, id: { not: id } },
      });
      if (emailExists) {
        throw new AppError('Email already in use', 409, 'DUPLICATE_EMAIL');
      }

      // Update linked user email too
      if (employee.userId) {
        await prisma.user.update({
          where: { id: employee.userId },
          data: { email: data.email },
        });
      }
    }

    const updateData = { ...data };
    if (updateData.joiningDate) updateData.joiningDate = new Date(updateData.joiningDate);
    if (updateData.dateOfBirth) updateData.dateOfBirth = new Date(updateData.dateOfBirth);

    return prisma.employee.update({
      where: { id },
      data: updateData,
      include: {
        department: true,
        jobPosition: true,
        manager: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        workingSchedule: true,
        _count: {
          select: {
            contracts: true,
            attendance: true,
            leaveRequests: true,
            payslips: true,
          },
        },
      },
    });
  }

  /**
   * Soft-delete (terminate) an employee. Cannot hard-delete if payslips exist.
   */
  async terminate(id) {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { payslips: { select: { id: true }, take: 1 } },
    });

    if (!employee) {
      throw new AppError('Employee not found', 404, 'NOT_FOUND');
    }

    return prisma.employee.update({
      where: { id },
      data: { employmentStatus: 'TERMINATED' },
    });
  }

  /**
   * Get related record counts for smart buttons.
   */
  async getSummary(id) {
    const [contracts, attendance, leaveRequests, payslips] = await Promise.all([
      prisma.contract.count({ where: { employeeId: id } }),
      prisma.attendance.count({ where: { employeeId: id } }),
      prisma.leaveRequest.count({ where: { employeeId: id } }),
      prisma.payslip.count({ where: { employeeId: id } }),
    ]);

    return { contracts, attendance, leaveRequests, payslips };
  }
}

module.exports = new EmployeeService();
