const axios = require('axios');
const logger = require('./logger');

const sendWhatsApp = async (toPhone, message, incidentId) => {
  if (!process.env.WHATSAPP_ACCESS_TOKEN) {
    logger.warn('WhatsApp config missing - WhatsApp skipped');
    return { success: false, status: 'config-missing', error: 'WhatsApp not configured' };
  }

  try {
    // Convert +91 to 91 for WhatsApp API
    const waNumber = toPhone.replace('+91', '91');
    
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_BUSINESS_ACCOUNT_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: waNumber,
        type: "text",  // Use simple text for testing (template needed for prod)
        text: {
          body: `🚨 SOS Alert - MalabarBazaar 🚨\n\n${message}\n\nIncident: ${incidentId}\nReply "STATUS" for live update.`
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    logger.info('WhatsApp sent successfully', { messageId: response.data.messages[0].id, to: waNumber, incidentId });
    return { success: true, messageId: response.data.messages[0].id, status: 'sent' };
  } catch (error) {
    logger.error('WhatsApp send failed', { error: error.response?.data || error.message, to: toPhone, incidentId });
    return { 
      success: false, 
      error: error.response?.data?.error?.message || error.message,
      status: 'failed' 
    };
  }
};

/**
 * Send WhatsApp message to a group
 * @param {String} groupId - WhatsApp group ID (in format: 120363xxx-120363xxx)
 * @param {String} message - Message content
 * @param {String} reminderId - Reminder ID for logging
 */
const sendWhatsAppToGroup = async (groupId, message, reminderId) => {
  if (!process.env.WHATSAPP_ACCESS_TOKEN) {
    logger.warn('WhatsApp config missing - WhatsApp group message skipped');
    return { success: false, status: 'config-missing', error: 'WhatsApp not configured' };
  }

  // Validate group ID format
  if (!groupId || !groupId.includes('-')) {
    logger.warn('Invalid WhatsApp group ID format:', groupId);
    return { success: false, status: 'invalid-group', error: 'Invalid group ID format' };
  }

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_BUSINESS_ACCOUNT_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: groupId,
        type: "text",
        text: {
          body: message
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    logger.info('WhatsApp group message sent successfully', {
      messageId: response.data.messages[0].id,
      groupId,
      reminderId
    });

    return {
      success: true,
      messageId: response.data.messages[0].id,
      status: 'sent',
      groupId
    };
  } catch (error) {
    logger.error('WhatsApp group message failed', {
      error: error.response?.data || error.message,
      groupId,
      reminderId
    });

    return {
      success: false,
      error: error.response?.data?.error?.message || error.message,
      status: 'failed',
      groupId
    };
  }
};

/**
 * Send WhatsApp message to either personal or group chat
 * Auto-detects based on recipient format
 */
const sendWhatsAppMessage = async (recipient, message, reminderId, isGroup = false) => {
  if (isGroup || (typeof recipient === 'string' && recipient.includes('-'))) {
    return sendWhatsAppToGroup(recipient, message, reminderId);
  } else {
    return sendWhatsApp(recipient, message, reminderId);
  }
};

module.exports = { sendWhatsApp, sendWhatsAppToGroup, sendWhatsAppMessage };
