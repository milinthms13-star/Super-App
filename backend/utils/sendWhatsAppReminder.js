/**
 * sendWhatsAppReminder
 * Sends a reminder notification via the Meta WhatsApp Business API (WABA).
 *
 * Free tier: you can send free-form messages within a 24-hour customer-service
 * window, or use approved message templates outside that window.  This utility
 * uses a simple text message (works within the 24-hour window) and a pre-approved
 * template name for outside that window.
 *
 * Environment variables required:
 *   WHATSAPP_ACCESS_TOKEN          — permanent access token from Meta
 *   WHATSAPP_BUSINESS_ACCOUNT_ID   — phone-number ID (not the account ID)
 *   WHATSAPP_REMINDER_TEMPLATE     — (optional) template name, default "reminder_notification"
 */

const axios = require('axios');
const logger = require('./logger');

const WABA_API_VERSION = 'v19.0';

/**
 * @param {string} toPhone  E.164 format, e.g. "+919876543210"
 * @param {Object} data
 * @param {string} data.senderName
 * @param {string} data.title
 * @param {string} data.description
 * @param {string} data.dueLabel
 * @param {string} data.priority
 * @returns {Promise<{success: boolean, messageId?: string, status: string, error?: string}>}
 */
const sendWhatsAppReminder = async (toPhone, data) => {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

  if (!token || !phoneNumberId) {
    logger.warn('sendWhatsAppReminder: WABA credentials not configured — skipping WhatsApp delivery');
    return { success: false, status: 'config-missing', error: 'WhatsApp not configured' };
  }

  // Normalize phone: strip leading + for the API
  const waNumber = String(toPhone).replace(/^\+/, '').replace(/\s/g, '');

  const messageText =
    `🔔 *Reminder from ${data.senderName}*\n\n` +
    `📋 *${data.title}*\n` +
    (data.description ? `${data.description}\n\n` : '\n') +
    `📅 Due: ${data.dueLabel}\n` +
    `⚡ Priority: ${data.priority}\n\n` +
    `_Sent via MGRAND HUB Reminder_`;

  try {
    const response = await axios.post(
      `https://graph.facebook.com/${WABA_API_VERSION}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: waNumber,
        type: 'text',
        text: { body: messageText, preview_url: false },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const messageId = response.data?.messages?.[0]?.id;
    logger.info(`sendWhatsAppReminder: sent to ${waNumber}, messageId=${messageId}`);
    return { success: true, messageId, status: 'sent' };
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    logger.error(`sendWhatsAppReminder: failed for ${waNumber}: ${errMsg}`);
    return { success: false, status: 'failed', error: errMsg };
  }
};

module.exports = { sendWhatsAppReminder };
