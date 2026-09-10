const prisma = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

class AttendanceService {
  async resolveEmployeeId(employeeId, userId) {
    if (employeeId) return employeeId;
    if (userId) {
      const emp = await prisma.employee.findFirst({ where: { userId } });
      if (emp) return emp.id;
    }
    const fallback = await prisma.employee.findFirst({ where: { employmentStatus: 'ACTIVE' } });
    if (fallback) return fallback.id;
    throw new AppError('No employee profile found for attendance punch', 400, 'NO_EMPLOYEE');
  }

  /**
   * Get employee attendance for today.
   */
  async getMyToday(employeeId, userId) {
    const resolvedId = await this.resolveEmployeeId(employeeId, userId);
    const today = getTodayDate();

    const record = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: resolvedId, date: today } },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });

    return record;
  }

  /**
   * Employee self check-in.
   */
  async checkIn(employeeId, userId) {
    const resolvedId = await this.resolveEmployeeId(employeeId, userId);
    const today = getTodayDate();

    // Check for existing check-in today
    let existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: resolvedId, date: today } },
    });

    if (existing) {
      if (existing.checkOut) {
        // User already checked out today, allow re-clocking in / resuming shift
        return prisma.attendance.update({
          where: { id: existing.id },
          data: {
            checkOut: null,
            workedHours: null,
            source: 'SELF_CHECKIN',
            status: 'PRESENT',
          },
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
          },
        });
      }
      throw new AppError('Already checked in today', 400, 'DUPLICATE_CHECKIN');
    }

    // Get employee's schedule to determine lateness
    const employee = await prisma.employee.findUnique({
      where: { id: resolvedId },
      include: {
        workingSchedule: { include: { scheduleDays: true } },
      },
    });

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun..6=Sat
    const scheduleDay = employee?.workingSchedule?.scheduleDays?.find(
      (d) => d.dayOfWeek === dayOfWeek
    );

    let isLate = false;
    if (scheduleDay) {
      const [schedH, schedM] = scheduleDay.startTime.split(':').map(Number);
      const scheduleStart = new Date(now);
      scheduleStart.setHours(schedH, schedM, 0, 0);
      // 15 min grace period
      scheduleStart.setMinutes(scheduleStart.getMinutes() + 15);
      isLate = now > scheduleStart;
    }

    return prisma.attendance.create({
      data: {
        employeeId: resolvedId,
        date: today,
        checkIn: now,
        status: isLate ? 'LATE' : 'PRESENT',
        isLate,
        source: 'SELF_CHECKIN',
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });
  }

  /**
   * Employee self check-out.
   */
  async checkOut(employeeId, userId) {
    const resolvedId = await this.resolveEmployeeId(employeeId, userId);
    const today = getTodayDate();

    let attendance = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: resolvedId, date: today } },
    });

    if (!attendance) {
      throw new AppError('No check-in found for today. Please clock in first.', 400, 'NO_CHECKIN');
    }

    if (attendance.checkOut) {
      throw new AppError('Already checked out today', 400, 'DUPLICATE_CHECKOUT');
    }

    const now = new Date();
    const checkIn = new Date(attendance.checkIn);
    const workedMs = now - checkIn;
    const workedHours = parseFloat((workedMs / (1000 * 60 * 60)).toFixed(2));

    // Get schedule to compute overtime and early departure
    const employee = await prisma.employee.findUnique({
      where: { id: resolvedId },
      include: { workingSchedule: { include: { scheduleDays: true } } },
    });

    const dayOfWeek = now.getDay();
    const scheduleDay = employee?.workingSchedule?.scheduleDays?.find(
      (d) => d.dayOfWeek === dayOfWeek
    );

    let isEarlyDeparture = false;
    let overtimeHours = 0;
    let expectedHours = 8; // default

    if (scheduleDay) {
      const [startH, startM] = scheduleDay.startTime.split(':').map(Number);
      const [endH, endM] = scheduleDay.endTime.split(':').map(Number);
      expectedHours = (endH * 60 + endM - startH * 60 - startM - scheduleDay.breakMinutes) / 60;

      const schedEnd = new Date(now);
      schedEnd.setHours(endH, endM, 0, 0);
      isEarlyDeparture = now < schedEnd;

      overtimeHours = Math.max(0, parseFloat((workedHours - expectedHours).toFixed(2)));
    }

    return prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: now,
        workedHours,
        isEarlyDeparture,
        overtimeHours,
        status: attendance.isLate ? 'LATE' : 'PRESENT',
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });
  }

  /**
   * List attendance records with filters.
   */
  async list(query) {
    const { employeeId, from, to, status, page = 1, pageSize = 500 } = query;
    const where = {};

    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const take = parseInt(pageSize, 10) || 500;
    const pageNum = parseInt(page, 10) || 1;
    const skip = (pageNum - 1) * take;

    const [items, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } },
        },
        orderBy: { date: 'desc' },
        skip,
        take,
      }),
      prisma.attendance.count({ where }),
    ]);

    const formattedItems = items.map(att => {
      let hours = att.workedHours;
      if ((hours === null || hours === undefined) && att.checkIn && att.checkOut) {
        const diffMs = new Date(att.checkOut) - new Date(att.checkIn);
        if (diffMs > 0) {
          hours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
        }
      }
      return {
        ...att,
        workedHours: hours !== null && hours !== undefined ? Number(hours) : null,
        totalHours: hours !== null && hours !== undefined ? Number(hours) : null,
        employee: {
          ...att.employee,
          code: att.employee?.employeeCode,
        }
      };
    });

    return { items: formattedItems, page: pageNum, pageSize: take, total };
  }

  /**
   * Manual correction by HR.
   */
  async manualCorrection(id, data, correctedById) {
    const attendance = await prisma.attendance.findUnique({ where: { id } });
    if (!attendance) {
      throw new AppError('Attendance record not found', 404, 'NOT_FOUND');
    }

    let workedHours = attendance.workedHours;
    if (data.checkIn && data.checkOut) {
      const ci = new Date(data.checkIn);
      const co = new Date(data.checkOut);
      if (co <= ci) {
        throw new AppError('Check-out must be after check-in', 400, 'INVALID_TIMES');
      }
      workedHours = parseFloat(((co - ci) / (1000 * 60 * 60)).toFixed(2));
    }

    return prisma.attendance.update({
      where: { id },
      data: {
        ...data,
        workedHours,
        source: 'MANUAL_CORRECTION',
        correctedById,
        status: data.status || attendance.status,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });
  }

  /**
   * Manual creation of attendance record by HR.
   */
  async manualEntry(data, createdById) {
    const { employeeId, date, checkIn, checkOut, remarks, status } = data;
    const targetDate = new Date(`${date}T00:00:00.000Z`);
    let ciDate = null;
    let coDate = null;
    let workedHours = null;

    if (checkIn) {
      ciDate = new Date(`${date}T${checkIn.length === 5 ? checkIn + ':00' : checkIn}`);
    }
    if (checkOut) {
      coDate = new Date(`${date}T${checkOut.length === 5 ? checkOut + ':00' : checkOut}`);
    }
    if (ciDate && coDate && coDate > ciDate) {
      workedHours = parseFloat(((coDate - ciDate) / (1000 * 60 * 60)).toFixed(2));
    }

    return prisma.attendance.upsert({
      where: { employeeId_date: { employeeId, date: targetDate } },
      create: {
        employeeId,
        date: targetDate,
        checkIn: ciDate,
        checkOut: coDate,
        workedHours,
        status: status || 'PRESENT',
        source: 'MANUAL_CORRECTION',
        correctedById: createdById,
      },
      update: {
        checkIn: ciDate,
        checkOut: coDate,
        workedHours,
        status: status || 'PRESENT',
        source: 'MANUAL_CORRECTION',
        correctedById: createdById,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });
  }

  /**
   * Aggregate attendance for payroll: count worked days, overtime, etc. for a period.
   */
  async aggregateForPayroll(employeeId, periodStart, periodEnd) {
    const records = await prisma.attendance.findMany({
      where: {
        employeeId,
        date: { gte: periodStart, lte: periodEnd },
        status: { notIn: ['INCOMPLETE'] },
      },
    });

    const workedDays = records.filter((r) =>
      ['PRESENT', 'LATE', 'HALF_DAY'].includes(r.status)
    ).length;

    const halfDays = records.filter((r) => r.status === 'HALF_DAY').length;
    const totalWorkedHours = records.reduce(
      (sum, r) => sum + (r.workedHours ? parseFloat(r.workedHours) : 0),
      0
    );
    const totalOvertimeHours = records.reduce(
      (sum, r) => sum + parseFloat(r.overtimeHours || 0),
      0
    );
    const absentDays = records.filter((r) => r.status === 'ABSENT').length;
    const lateDays = records.filter((r) => r.isLate).length;

    return {
      workedDays: workedDays - halfDays * 0.5,
      totalWorkedHours: parseFloat(totalWorkedHours.toFixed(2)),
      totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
      absentDays,
      lateDays,
      halfDays,
      totalRecords: records.length,
    };
  }
}

module.exports = new AttendanceService();
