const twilio = require('twilio');
const twilioConfig = require('../config/twilio');
const logger = require('./logger');

let client = null;

const getTwilioClient = () => {
  if (!twilioConfig.accountSid || !twilioConfig.authToken) {
    return null;
  }
  if (!client) {
    client = twilio(twilioConfig.accountSid, twilioConfig.authToken);
  }
  return client;
};

const sendSMS = async (to, message, incidentId) => {
  const twilioClient = getTwilioClient();
  if (!twilioClient) {
    logger.warn('Twilio config missing - SMS skipped');
    return { success: false, status: 'config-missing', error: 'Twilio not configured' };
  }

  try {
    const result = await twilioClient.messages.create({
      body: `🚨 SOS Alert - MalabarBazaar 🚨\n\n${message}\n\nIncident ID: ${incidentId}\nReply HELP for status.`,
      from: twilioConfig.phoneNumber,
      to: to
    });
    logger.info('SMS sent successfully', { sid: result.sid, to, incidentId });
    return { success: true, sid: result.sid, status: 'sent' };
  } catch (error) {
    logger.error('SMS send failed', { error: error.message, to, incidentId });
    return { 
      success: false, 
      error: error.message, 
      status: error.code === 21614 ? 'invalid-number' : 'failed' 
    };
  }
};

module.exports = { sendSMS };
