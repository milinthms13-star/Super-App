/**
 * sendTelegramMessage
 * Sends a message via the Telegram Bot API (completely free).
 *
 * Environment variables required:
 *   TELEGRAM_BOT_TOKEN  — your bot token from @BotFather
 *
 * The recipient must have started a conversation with your bot first.
 * Their chat ID can be obtained from the /start command response.
 */

const axios = require('axios');
const logger = require('./logger');

/**
 * @param {string|number} chatId  Telegram chat ID (numeric)
 * @param {string}        text    Markdown-formatted message body
 * @returns {Promise<{success: boolean, messageId?: number, status: string, error?: string}>}
 */
const sendTelegramMessage = async (chatId, text) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    logger.warn('sendTelegramMessage: TELEGRAM_BOT_TOKEN not configured — skipping Telegram delivery');
    return { success: false, status: 'config-missing', error: 'Telegram not configured' };
  }

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      },
      { timeout: 10000 }
    );

    const messageId = response.data?.result?.message_id;
    logger.info(`sendTelegramMessage: sent to chatId=${chatId}, messageId=${messageId}`);
    return { success: true, messageId, status: 'sent' };
  } catch (error) {
    const errMsg = error.response?.data?.description || error.message;
    logger.error(`sendTelegramMessage: failed for chatId=${chatId}: ${errMsg}`);
    return { success: false, status: 'failed', error: errMsg };
  }
};

module.exports = { sendTelegramMessage };
