const axios = require('axios');
const logger = require('./logger');

/**
 * Send Telegram message via Telegram Bot API
 * @param {string} telegramChatId - Telegram chat ID or user ID
 * @param {string} message - Message text
 * @param {string} reminderId - Reminder ID for tracking
 * @returns {Promise<Object>}
 */
const sendTelegram = async (telegramChatId, message, reminderId) => {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    logger.warn('Telegram config missing - Telegram skipped');
    return { success: false, status: 'config-missing', error: 'Telegram not configured' };
  }

  try {
    // Validate chat ID format (should be numeric)
    const chatId = String(telegramChatId).trim();
    if (!chatId.match(/^-?\d+$/)) {
      logger.error('Invalid Telegram chat ID format', { chatId, reminderId });
      return { success: false, status: 'invalid-format', error: 'Invalid chat ID' };
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await axios.post(apiUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    }, {
      timeout: 5000
    });

    logger.info('Telegram message sent successfully', {
      messageId: response.data.result.message_id,
      chatId,
      reminderId
    });

    return {
      success: true,
      messageId: response.data.result.message_id,
      status: 'sent'
    };
  } catch (error) {
    logger.error('Telegram send failed', {
      error: error.response?.data || error.message,
      chatId: telegramChatId,
      reminderId
    });

    return {
      success: false,
      error: error.response?.data?.description || error.message,
      status: 'failed'
    };
  }
};

module.exports = { sendTelegram };
