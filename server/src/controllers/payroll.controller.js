const payrollService = require('../services/payroll.service');

const createPayrun = async (req, res, next) => {
  try {
    const payrun = await payrollService.createPayrun(req.body, req.user.userId);
    res.status(201).json({ success: true, data: payrun });
  } catch (error) { next(error); }
};

const getEligibleEmployees = async (req, res, next) => {
  try {
    const employees = await payrollService.getEligibleEmployees(req.params.id);
    res.json({ success: true, data: employees });
  } catch (error) { next(error); }
};

const selectEmployees = async (req, res, next) => {
  try {
    const payslips = await payrollService.selectEmployees(req.params.id, req.body.employeeIds);
    res.json({ success: true, data: payslips });
  } catch (error) { next(error); }
};

const calculate = async (req, res, next) => {
  try {
    const results = await payrollService.calculate(req.params.id);
    res.json({ success: true, data: results });
  } catch (error) { next(error); }
};

const getPayrunDetail = async (req, res, next) => {
  try {
    const payrun = await payrollService.getPayrunDetail(req.params.id);
    res.json({ success: true, data: payrun });
  } catch (error) { next(error); }
};

const listPayruns = async (req, res, next) => {
  try {
    const result = await payrollService.listPayruns(req.query);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const validatePayrun = async (req, res, next) => {
  try {
    const warnings = await payrollService.validate(req.params.id);
    res.json({ success: true, data: warnings });
  } catch (error) { next(error); }
};

const approve = async (req, res, next) => {
  try {
    const payrun = await payrollService.approve(req.params.id, req.user.userId);
    res.json({ success: true, data: payrun });
  } catch (error) { next(error); }
};

const finalize = async (req, res, next) => {
  try {
    const payrun = await payrollService.finalize(req.params.id);
    res.json({ success: true, data: payrun });
  } catch (error) { next(error); }
};

const markPaid = async (req, res, next) => {
  try {
    const payrun = await payrollService.markPaid(req.params.id);
    res.json({ success: true, data: payrun });
  } catch (error) { next(error); }
};

const sendPayslips = async (req, res, next) => {
  try {
    const result = await payrollService.sendPayslips(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const syncEmployees = async (req, res, next) => {
  try {
    const result = await payrollService.syncEligibleEmployees(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const resetToDraft = async (req, res, next) => {
  try {
    const payrun = await payrollService.resetToDraft(req.params.id);
    res.json({ success: true, data: payrun });
  } catch (error) { next(error); }
};

module.exports = {
  createPayrun, getEligibleEmployees, selectEmployees, calculate,
  getPayrunDetail, listPayruns, validatePayrun, approve, finalize, markPaid,
  sendPayslips, syncEmployees, resetToDraft,
};
