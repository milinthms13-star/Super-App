const axios = require('axios');
const logger = require('./logger');

const FINANCE_WORKFLOW_WEBHOOK_URL = process.env.FINANCE_WORKFLOW_WEBHOOK_URL || '';
const DEFAULT_TIMEOUT_MS = 6000;

const postWorkflowEvent = async (payload = {}) => {
  if (!FINANCE_WORKFLOW_WEBHOOK_URL) {
    return { delivered: false, reason: 'not-configured' };
  }

  try {
    const response = await axios.post(FINANCE_WORKFLOW_WEBHOOK_URL, payload, {
      timeout: DEFAULT_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
    });
    return {
      delivered: true,
      statusCode: response.status,
    };
  } catch (error) {
    logger.warn(`finance workflow webhook failed: ${error.message}`);
    return {
      delivered: false,
      reason: 'delivery-failed',
      error: error.message,
    };
  }
};

module.exports = {
  postWorkflowEvent,
};
