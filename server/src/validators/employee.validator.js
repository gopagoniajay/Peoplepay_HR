const { z } = require('zod');

const emptyToNull = (val) => (val === '' || val === undefined ? null : val);

const employeeBaseSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email format'),
  phone: z.preprocess(emptyToNull, z.string().regex(/^[0-9+\-\s]{7,20}$/, 'Invalid phone format').nullable().optional()),
  departmentId: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  jobPositionId: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  managerId: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  workingScheduleId: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  joiningDate: z.coerce.date(),
  employmentStatus: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED']).default('ACTIVE'),
  status: z.string().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).default('FULL_TIME'),
  bankAccountName: z.preprocess(emptyToNull, z.string().max(100).nullable().optional()),
  bankAccountNumber: z.preprocess(emptyToNull, z.string().regex(/^[0-9]{9,18}$/, 'Bank account must be 9-18 digits').nullable().optional()),
  bankIfsc: z.preprocess(emptyToNull, z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code').nullable().optional()),
  profilePhotoUrl: z.preprocess(emptyToNull, z.string().url().nullable().optional()),
  dateOfBirth: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  gender: z.preprocess(emptyToNull, z.string().nullable().optional()),
  address: z.preprocess(emptyToNull, z.string().max(500).nullable().optional()),
});

const employeeCreateSchema = employeeBaseSchema.refine(
  (data) => !data.managerId || data.managerId !== data.id,
  { message: 'Manager cannot be self', path: ['managerId'] }
);

const employeeUpdateSchema = employeeBaseSchema.partial();

const employeeQuerySchema = z.object({
  search: z.string().optional(),
  department: z.string().optional(),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED']).optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).optional(),
  sort: z.string().optional().default('firstName'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(1000).optional().default(500),
});

module.exports = { employeeCreateSchema, employeeUpdateSchema, employeeQuerySchema };
