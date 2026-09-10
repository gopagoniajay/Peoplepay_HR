const { z } = require('zod');

const emptyToNull = (val) => (val === '' || val === undefined ? null : val);

const contractBaseSchema = z.object({
  employeeId: z.string().uuid('Please select a valid employee'),
  startDate: z.coerce.date(),
  endDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  basicWage: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().positive('Basic wage must be positive')
  ),
  baseSalary: z.any().optional(),
  wageType: z.enum(['MONTHLY', 'HOURLY', 'DAILY']).default('MONTHLY'),
  departmentId: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  jobPositionId: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  workingScheduleId: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  salaryStructureId: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED']).default('DRAFT'),
});

const contractCreateSchema = z.preprocess(
  (obj) => {
    if (obj && typeof obj === 'object') {
      if (obj.basicWage === undefined && obj.baseSalary !== undefined) {
        return { ...obj, basicWage: obj.baseSalary };
      }
    }
    return obj;
  },
  contractBaseSchema.refine(
    (data) => !data.endDate || data.endDate > data.startDate,
    { message: 'End date must be after start date', path: ['endDate'] }
  )
);

const contractUpdateSchema = z.preprocess(
  (obj) => {
    if (obj && typeof obj === 'object') {
      if (obj.basicWage === undefined && obj.baseSalary !== undefined) {
        return { ...obj, basicWage: obj.baseSalary };
      }
    }
    return obj;
  },
  contractBaseSchema.partial().omit({ employeeId: true })
);

// ─── Leave validators ──────────────────────────────────

const leaveTypeSchema = z.object({
  name: z.string().min(1).max(100),
  unit: z.enum(['DAYS', 'HOURS']).default('DAYS'),
  requiresAllocation: z.boolean().default(true),
  isPaid: z.boolean().default(true),
  requiresApproval: z.boolean().default(true),
  affectsPayroll: z.boolean().default(true),
});

const leaveBalanceSchema = z.object({
  employeeId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  allocated: z.number().min(0),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date().optional().nullable(),
});

const leaveRequestSchema = z.object({
  leaveTypeId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isHalfDay: z.boolean().default(false),
  reason: z.string().max(500).optional().nullable(),
}).refine(
  (data) => data.endDate >= data.startDate,
  { message: 'End date must be on or after start date', path: ['endDate'] }
);

// ─── Attendance validators ─────────────────────────────

const attendanceManualSchema = z.object({
  employeeId: z.string().uuid(),
  date: z.coerce.date(),
  checkIn: z.coerce.date().optional().nullable(),
  checkOut: z.coerce.date().optional().nullable(),
  status: z.enum(['PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'INCOMPLETE']).optional(),
});

// ─── Salary validators ─────────────────────────────────

const salaryStructureSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().regex(/^[A-Z_]+$/, 'Code must be uppercase with underscores').min(1).max(30),
  description: z.string().max(500).optional().nullable(),
  active: z.boolean().default(true),
});

const salaryRuleSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().regex(/^[A-Z_]+$/, 'Code must be uppercase with underscores'),
  sequence: z.number().int().positive(),
  category: z.enum(['BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET', 'CONTRIBUTION']),
  computationType: z.enum(['FIXED', 'PERCENTAGE', 'FORMULA']),
  fixedAmount: z.number().optional().nullable(),
  percentageOfCode: z.string().optional().nullable(),
  percentageValue: z.number().min(0).max(100).optional().nullable(),
  formula: z.string().optional().nullable(),
  conditionExpr: z.string().optional().nullable(),
  isDeduction: z.boolean().default(false),
  active: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.computationType === 'FIXED' && (data.fixedAmount == null || data.fixedAmount === undefined)) {
    ctx.addIssue({ code: 'custom', message: 'fixedAmount is required for FIXED type', path: ['fixedAmount'] });
  }
  if (data.computationType === 'PERCENTAGE') {
    if (!data.percentageOfCode) {
      ctx.addIssue({ code: 'custom', message: 'percentageOfCode is required for PERCENTAGE type', path: ['percentageOfCode'] });
    }
    if (data.percentageValue == null) {
      ctx.addIssue({ code: 'custom', message: 'percentageValue is required for PERCENTAGE type', path: ['percentageValue'] });
    }
  }
  if (data.computationType === 'FORMULA' && !data.formula) {
    ctx.addIssue({ code: 'custom', message: 'formula is required for FORMULA type', path: ['formula'] });
  }
});

// ─── Payroll validators ────────────────────────────────

const payrunCreateSchema = z.object({
  name: z.string().min(1).max(200),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  salaryStructureId: z.string().uuid().optional().nullable(),
}).refine(
  (data) => data.periodEnd > data.periodStart,
  { message: 'Period end must be after period start', path: ['periodEnd'] }
);

const selectEmployeesSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1, 'At least one employee must be selected'),
});

// ─── Working Schedule validators ───────────────────────

const workingScheduleSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['STANDARD', 'SHIFT', 'FLEXIBLE']).default('STANDARD'),
  overtimeThreshold: z.number().min(0).optional().nullable(),
  scheduleDays: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time format must be HH:MM'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time format must be HH:MM'),
    breakMinutes: z.number().int().min(0).default(0),
  })).optional(),
});

// ─── Department / Position validators ──────────────────

const departmentSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().max(20).optional().nullable(),
});

const jobPositionSchema = z.object({
  title: z.string().min(1).max(100),
});

module.exports = {
  contractCreateSchema,
  contractUpdateSchema,
  leaveTypeSchema,
  leaveBalanceSchema,
  leaveRequestSchema,
  attendanceManualSchema,
  salaryStructureSchema,
  salaryRuleSchema,
  payrunCreateSchema,
  selectEmployeesSchema,
  workingScheduleSchema,
  departmentSchema,
  jobPositionSchema,
};
