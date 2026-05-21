const axios = require('axios');
const logger = require('./logger');

const GULF_EMERGENCY_WEBHOOK = process.env.GULF_EMERGENCY_WEBHOOK_URL || null;

async function sendEmergencyAlert(payload = {}) {
  try {
    if (!GULF_EMERGENCY_WEBHOOK) {
      logger.info('Emergency webhook not configured; skipping external alert.', payload);
      return { delivered: false, reason: 'not-configured' };
    }

    // POST to configured webhook (expects JSON)
    const resp = await axios.post(GULF_EMERGENCY_WEBHOOK, payload, { timeout: 5000 });
    logger.info('Emergency alert delivered', { status: resp.status });
    return { delivered: true, status: resp.status };
  } catch (error) {
    logger.error('sendEmergencyAlert error:', error?.message || error);
    return { delivered: false, reason: error?.message || 'error' };
  }
}

module.exports = { sendEmergencyAlert };
