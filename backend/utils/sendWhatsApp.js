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

module.exports = { sendWhatsApp };
