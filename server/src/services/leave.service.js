const prisma = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

class LeaveService {
  // ─── Leave Types ──────────────────────────────────────

  async createLeaveType(data) {
    return prisma.leaveType.create({ data });
  }

  async listLeaveTypes() {
    return prisma.leaveType.findMany({ orderBy: { name: 'asc' } });
  }

  async updateLeaveType(id, data) {
    return prisma.leaveType.update({ where: { id }, data });
  }

  // ─── Leave Balances ───────────────────────────────────

  async allocateBalance(data) {
    return prisma.leaveBalance.create({
      data: {
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        allocated: data.allocated,
        taken: 0,
        remaining: data.allocated,
        validFrom: data.validFrom,
        validTo: data.validTo || null,
      },
      include: { leaveType: true, employee: { select: { firstName: true, lastName: true } } },
    });
  }

  async getBalances(employeeId) {
    return prisma.leaveBalance.findMany({
      where: { employeeId },
      include: { leaveType: true },
      orderBy: { leaveType: { name: 'asc' } },
    });
  }

  async listBalances(query) {
    const { employeeId, leaveTypeId, page = 1, pageSize = 500 } = query;
    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (leaveTypeId) where.leaveTypeId = leaveTypeId;

    const take = parseInt(pageSize, 10) || 500;
    const pageNum = parseInt(page, 10) || 1;
    const skip = (pageNum - 1) * take;

    const [items, total] = await Promise.all([
      prisma.leaveBalance.findMany({
        where,
        include: {
          leaveType: true,
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        },
        skip,
        take,
      }),
      prisma.leaveBalance.count({ where }),
    ]);

    return { items, page: pageNum, pageSize: take, total };
  }

  // ─── Leave Requests ───────────────────────────────────

  async submitRequest(employeeId, data) {
    const leaveType = await prisma.leaveType.findUnique({ where: { id: data.leaveTypeId } });
    if (!leaveType) {
      throw new AppError('Leave type not found', 404, 'NOT_FOUND');
    }

    // Calculate duration
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    let durationDays = 0;

    if (data.isHalfDay) {
      durationDays = 0.5;
    } else {
      // Count business days between start and end (inclusive)
      const current = new Date(startDate);
      while (current <= endDate) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) { // Skip weekends
          durationDays++;
        }
        current.setDate(current.getDate() + 1);
      }
    }

    // Check balance if allocation is required
    if (leaveType.requiresAllocation) {
      const balance = await prisma.leaveBalance.findFirst({
        where: {
          employeeId,
          leaveTypeId: data.leaveTypeId,
          validFrom: { lte: startDate },
          OR: [
            { validTo: null },
            { validTo: { gte: endDate } },
          ],
        },
      });

      if (!balance) {
        throw new AppError('No valid leave allocation found for this period', 400, 'NO_ALLOCATION');
      }

      if (parseFloat(balance.remaining) < durationDays) {
        throw new AppError(
          `Insufficient balance. Available: ${balance.remaining}, Requested: ${durationDays}`,
          400,
          'INSUFFICIENT_BALANCE'
        );
      }
    }

    return prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId: data.leaveTypeId,
        startDate,
        endDate,
        isHalfDay: data.isHalfDay || false,
        durationDays,
        status: leaveType.requiresApproval ? 'PENDING' : 'APPROVED',
        reason: data.reason || null,
      },
      include: {
        leaveType: true,
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });
  }

  async listRequests(query) {
    const { employeeId, status, page = 1, pageSize = 500 } = query;
    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const take = parseInt(pageSize, 10) || 500;
    const pageNum = parseInt(page, 10) || 1;
    const skip = (pageNum - 1) * take;

    const [items, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          leaveType: true,
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return { items, page: pageNum, pageSize: take, total };
  }

  async getRequestById(id) {
    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        leaveType: true,
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });
    if (!request) throw new AppError('Leave request not found', 404, 'NOT_FOUND');
    return request;
  }

  /**
   * Approve a leave request: decrement balance + mark attendance as ON_LEAVE.
   */
  async approveRequest(id, approvedById) {
    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { leaveType: true },
    });

    if (!request) throw new AppError('Leave request not found', 404, 'NOT_FOUND');
    if (request.status !== 'PENDING') {
      throw new AppError(`Cannot approve a ${request.status} request`, 409, 'INVALID_STATUS');
    }

    return prisma.$transaction(async (tx) => {
      // Update request status
      const updated = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById,
          decidedAt: new Date(),
        },
        include: {
          leaveType: true,
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        },
      });

      // Decrement leave balance
      if (request.leaveType.requiresAllocation) {
        const balance = await tx.leaveBalance.findFirst({
          where: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            validFrom: { lte: request.startDate },
            OR: [
              { validTo: null },
              { validTo: { gte: request.endDate } },
            ],
          },
        });

        if (balance) {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              taken: { increment: parseFloat(request.durationDays) },
              remaining: { decrement: parseFloat(request.durationDays) },
            },
          });
        }
      }

      // Mark attendance as ON_LEAVE for the request period
      const current = new Date(request.startDate);
      const end = new Date(request.endDate);
      while (current <= end) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) { // Skip weekends
          try {
            await tx.attendance.upsert({
              where: {
                employeeId_date: {
                  employeeId: request.employeeId,
                  date: new Date(current),
                },
              },
              create: {
                employeeId: request.employeeId,
                date: new Date(current),
                status: 'ON_LEAVE',
                source: 'MANUAL_CORRECTION',
              },
              update: {
                status: 'ON_LEAVE',
              },
            });
          } catch (err) {
            // Non-critical: attendance record creation may fail for edge cases
            console.warn(`Failed to mark attendance ON_LEAVE for ${current.toISOString()}:`, err.message);
          }
        }
        current.setDate(current.getDate() + 1);
      }

      return updated;
    });
  }

  async rejectRequest(id, approvedById) {
    const request = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!request) throw new AppError('Leave request not found', 404, 'NOT_FOUND');
    if (request.status !== 'PENDING') {
      throw new AppError(`Cannot reject a ${request.status} request`, 409, 'INVALID_STATUS');
    }

    return prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById,
        decidedAt: new Date(),
      },
      include: {
        leaveType: true,
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });
  }

  /**
   * Aggregate leave data for payroll: count unpaid/paid leave days in period.
   */
  async aggregateForPayroll(employeeId, periodStart, periodEnd) {
    const approvedRequests = await prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        startDate: { lte: periodEnd },
        endDate: { gte: periodStart },
      },
      include: { leaveType: true },
    });

    let paidDays = 0;
    let unpaidDays = 0;

    for (const req of approvedRequests) {
      const days = parseFloat(req.durationDays);
      if (req.leaveType.isPaid) {
        paidDays += days;
      } else {
        unpaidDays += days;
      }
    }

    return { paidDays, unpaidDays, totalLeaveDays: paidDays + unpaidDays };
  }
}

module.exports = new LeaveService();
