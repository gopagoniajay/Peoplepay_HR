const prisma = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

class ContractService {
  /**
   * Create a new contract. Validates no overlapping ACTIVE contracts.
   */
  async create(data) {
    const startDate = data.startDate ? new Date(data.startDate) : new Date();
    const endDate = data.endDate ? new Date(data.endDate) : null;
    const basicWage = data.basicWage !== undefined ? parseFloat(data.basicWage) : parseFloat(data.baseSalary || 0);

    // Check for overlapping ACTIVE contracts
    if (data.status === 'ACTIVE') {
      await this.checkOverlap(data.employeeId, startDate, endDate, null);
    }

    return prisma.contract.create({
      data: {
        employeeId: data.employeeId,
        startDate,
        endDate,
        wageType: data.wageType || 'MONTHLY',
        basicWage,
        departmentId: data.departmentId || null,
        jobPositionId: data.jobPositionId || null,
        workingScheduleId: data.workingScheduleId || null,
        salaryStructureId: data.salaryStructureId || null,
        status: data.status || 'ACTIVE',
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        department: true,
        jobPosition: true,
        salaryStructure: true,
        workingSchedule: true,
      },
    });
  }

  /**
   * Check for overlapping ACTIVE contracts for the same employee.
   */
  async checkOverlap(employeeId, startDate, endDate, excludeId) {
    const where = {
      employeeId,
      status: 'ACTIVE',
      AND: [
        { startDate: { lte: endDate || new Date('9999-12-31') } },
        {
          OR: [
            { endDate: null },
            { endDate: { gte: startDate } },
          ],
        },
      ],
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const overlapping = await prisma.contract.findFirst({ where });
    if (overlapping) {
      throw new AppError(
        'Overlapping ACTIVE contract exists for this employee in the specified date range',
        409,
        'OVERLAPPING_CONTRACT'
      );
    }
  }

  /**
   * Resolve the period-correct contract for payroll.
   * Rule: contract.startDate <= periodEnd AND (contract.endDate IS NULL OR contract.endDate >= periodStart) AND status = 'ACTIVE'
   * If multiple match, latest startDate wins.
   */
  async resolveForPeriod(employeeId, periodStart, periodEnd) {
    const contracts = await prisma.contract.findMany({
      where: {
        employeeId,
        status: 'ACTIVE',
        startDate: { lte: periodEnd },
        OR: [
          { endDate: null },
          { endDate: { gte: periodStart } },
        ],
      },
      include: {
        salaryStructure: { include: { rules: { include: { salaryRule: true } } } },
        workingSchedule: { include: { scheduleDays: true } },
        department: true,
        jobPosition: true,
      },
      orderBy: { startDate: 'desc' },
    });

    if (contracts.length === 0) {
      return null; // No contract for this period
    }

    if (contracts.length > 1) {
      console.warn(
        `[ContractResolver] Multiple contracts for employee ${employeeId} in period ${periodStart}-${periodEnd}. Using latest startDate.`
      );
    }

    return contracts[0]; // Latest startDate wins
  }

  async list(query) {
    const { employeeId, status, page = 1, pageSize = 500 } = query;
    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const take = parseInt(pageSize, 10) || 500;
    const pageNum = parseInt(page, 10) || 1;
    const skip = (pageNum - 1) * take;

    const [items, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
          department: true,
          jobPosition: true,
          salaryStructure: true,
        },
        orderBy: { startDate: 'desc' },
        skip,
        take,
      }),
      prisma.contract.count({ where }),
    ]);

    return { items, page: pageNum, pageSize: take, total };
  }

  async getById(id) {
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        department: true,
        jobPosition: true,
        salaryStructure: { include: { rules: { include: { salaryRule: true }, orderBy: { salaryRule: { sequence: 'asc' } } } } },
        workingSchedule: { include: { scheduleDays: true } },
      },
    });

    if (!contract) {
      throw new AppError('Contract not found', 404, 'NOT_FOUND');
    }

    return contract;
  }

  async update(id, data) {
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: { payslips: { where: { status: 'PAID' }, take: 1 } },
    });

    if (!contract) {
      throw new AppError('Contract not found', 404, 'NOT_FOUND');
    }

    // Block edits on contracts referenced by FINALIZED/PAID payslips
    if (contract.payslips.length > 0) {
      throw new AppError(
        'Cannot edit contract referenced by a finalized payslip. Create a new contract instead.',
        409,
        'CONTRACT_LOCKED'
      );
    }

    // Check overlap if changing dates or status to ACTIVE
    if (data.status === 'ACTIVE' || (contract.status === 'ACTIVE' && (data.startDate || data.endDate))) {
      await this.checkOverlap(
        contract.employeeId,
        data.startDate || contract.startDate,
        data.endDate !== undefined ? data.endDate : contract.endDate,
        id
      );
    }

    return prisma.contract.update({
      where: { id },
      data,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        department: true,
        jobPosition: true,
        salaryStructure: true,
      },
    });
  }

  async delete(id) {
    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract) {
      throw new AppError('Contract not found', 404, 'NOT_FOUND');
    }
    if (contract.status !== 'DRAFT') {
      throw new AppError('Only DRAFT contracts can be deleted', 409, 'CANNOT_DELETE');
    }

    return prisma.contract.delete({ where: { id } });
  }
}

module.exports = new ContractService();
