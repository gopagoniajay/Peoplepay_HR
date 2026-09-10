const aiService = require('../services/ai.service');

const getPayrunAnomalies = async (req, res, next) => {
  try {
    const audit = await aiService.auditPayrunAnomalies(req.params.payrunId);
    res.json({ success: true, data: audit });
  } catch (error) {
    next(error);
  }
};

const askCopilot = async (req, res, next) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, error: { message: 'A text prompt is required.' } });
    }
    const response = await aiService.askCopilot(prompt, req.user);
    res.json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
};

const getExecutiveSummary = async (req, res, next) => {
  try {
    const summary = await aiService.generateExecutiveSummary(req.params.payrunId);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPayrunAnomalies,
  askCopilot,
  getExecutiveSummary,
};
