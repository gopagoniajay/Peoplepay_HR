const prisma = require('../config/db');
const salaryRuleEngine = require('../services/salaryRuleEngine.service');
const { AppError } = require('../middleware/errorHandler');

// ─── Salary Structures ─────────────────────────────────

const listStructures = async (req, res, next) => {
  try {
    const structures = await prisma.salaryStructure.findMany({
      include: {
        rules: {
          include: { salaryRule: true },
          orderBy: { salaryRule: { sequence: 'asc' } },
        },
        _count: { select: { contracts: true, payruns: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: structures });
  } catch (error) { next(error); }
};

const getStructure = async (req, res, next) => {
  try {
    const structure = await prisma.salaryStructure.findUnique({
      where: { id: req.params.id },
      include: {
        rules: {
          include: { salaryRule: true },
          orderBy: { salaryRule: { sequence: 'asc' } },
        },
      },
    });
    if (!structure) throw new AppError('Structure not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: structure });
  } catch (error) { next(error); }
};

const createStructure = async (req, res, next) => {
  try {
    const structure = await prisma.salaryStructure.create({
      data: {
        name: req.body.name,
        code: req.body.code,
        description: req.body.description || null,
        active: req.body.active ?? true,
      },
    });
    res.status(201).json({ success: true, data: structure });
  } catch (error) { next(error); }
};

const updateStructure = async (req, res, next) => {
  try {
    const structure = await prisma.salaryStructure.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        rules: { include: { salaryRule: true } },
      },
    });
    res.json({ success: true, data: structure });
  } catch (error) { next(error); }
};

const deleteStructure = async (req, res, next) => {
  try {
    await prisma.salaryStructure.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: { message: 'Structure deleted' } });
  } catch (error) { next(error); }
};

const addRuleToStructure = async (req, res, next) => {
  try {
    const { salaryRuleId, sequenceOverride } = req.body;
    const rule = await prisma.salaryStructureRule.create({
      data: {
        salaryStructureId: req.params.id,
        salaryRuleId,
        sequenceOverride: sequenceOverride || null,
      },
      include: { salaryRule: true },
    });
    res.status(201).json({ success: true, data: rule });
  } catch (error) { next(error); }
};

const removeRuleFromStructure = async (req, res, next) => {
  try {
    await prisma.salaryStructureRule.delete({ where: { id: req.params.ruleId } });
    res.json({ success: true, data: { message: 'Rule removed from structure' } });
  } catch (error) { next(error); }
};

// ─── Salary Rules ───────────────────────────────────────

const listRules = async (req, res, next) => {
  try {
    const rules = await prisma.salaryRule.findMany({
      orderBy: { sequence: 'asc' },
    });
    res.json({ success: true, data: rules });
  } catch (error) { next(error); }
};

const getRule = async (req, res, next) => {
  try {
    const rule = await prisma.salaryRule.findUnique({ where: { id: req.params.id } });
    if (!rule) throw new AppError('Rule not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

const createRule = async (req, res, next) => {
  try {
    // Validate dependencies
    const existingRules = await prisma.salaryRule.findMany({ where: { active: true } });
    const errors = await salaryRuleEngine.validateDependencies(req.body, existingRules);
    if (errors.length > 0) {
      throw new AppError(errors.join('; '), 400, 'DEPENDENCY_ERROR');
    }

    const rule = await prisma.salaryRule.create({ data: req.body });
    res.status(201).json({ success: true, data: rule });
  } catch (error) { next(error); }
};

const updateRule = async (req, res, next) => {
  try {
    const existingRules = await prisma.salaryRule.findMany({
      where: { active: true, id: { not: req.params.id } },
    });
    const currentRule = await prisma.salaryRule.findUnique({ where: { id: req.params.id } });
    const mergedRule = { ...currentRule, ...req.body };
    const errors = await salaryRuleEngine.validateDependencies(mergedRule, existingRules);
    if (errors.length > 0) {
      throw new AppError(errors.join('; '), 400, 'DEPENDENCY_ERROR');
    }

    const rule = await prisma.salaryRule.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

const deleteRule = async (req, res, next) => {
  try {
    // Soft-delete: deactivate
    const rule = await prisma.salaryRule.update({
      where: { id: req.params.id },
      data: { active: false },
    });
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

const testRule = async (req, res, next) => {
  try {
    const { rule, context } = req.body;
    const result = salaryRuleEngine.testRule(rule, context);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

module.exports = {
  listStructures, getStructure, createStructure, updateStructure, deleteStructure,
  addRuleToStructure, removeRuleFromStructure,
  listRules, getRule, createRule, updateRule, deleteRule, testRule,
};
