const contractService = require('../services/contract.service');
const { capturePreviousValue } = require('../middleware/audit');

const create = async (req, res, next) => {
  try {
    const contract = await contractService.create(req.body);
    res.status(201).json({ success: true, data: contract });
  } catch (error) { next(error); }
};

const list = async (req, res, next) => {
  try {
    const result = await contractService.list(req.query);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const contract = await contractService.getById(req.params.id);
    res.json({ success: true, data: contract });
  } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try {
    const existing = await contractService.getById(req.params.id);
    capturePreviousValue(req, existing);
    const contract = await contractService.update(req.params.id, req.body);
    res.json({ success: true, data: contract });
  } catch (error) { next(error); }
};

const remove = async (req, res, next) => {
  try {
    await contractService.delete(req.params.id);
    res.json({ success: true, data: { message: 'Contract deleted' } });
  } catch (error) { next(error); }
};

const resolve = async (req, res, next) => {
  try {
    const { employeeId, date } = req.query;
    const contract = await contractService.resolveForPeriod(
      employeeId,
      new Date(date),
      new Date(date)
    );
    res.json({ success: true, data: contract });
  } catch (error) { next(error); }
};

module.exports = { create, list, getById, update, remove, resolve };
