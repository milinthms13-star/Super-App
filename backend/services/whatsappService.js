/**
 * WhatsApp Business API Service
 * Handles WhatsApp message sending, templates, and verification
 */

const axios = require('axios');
const logger = require('../utils/logger');

class WhatsAppService {
  constructor() {
    this.apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  }

  /**
   * Send text message
   */
  async sendTextMessage(to, message) {
    try {
      if (!this.isConfigured()) {
        logger.warn('WhatsApp not configured, generating fallback link');
        return this.generateWhatsAppLink(to, message);
      }

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: this.formatPhoneNumber(to),
          type: 'text',
          text: {
            preview_url: false,
            body: message
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`WhatsApp message sent to ${to}: ${response.data.messages[0].id}`);

      return {
        success: true,
        messageId: response.data.messages[0].id,
        status: 'sent'
      };
    } catch (error) {
      logger.error('Error sending WhatsApp message:', error.response?.data || error.message);
      throw new Error(`Failed to send WhatsApp message: ${error.message}`);
    }
  }

  /**
   * Send template message
   */
  async sendTemplateMessage(to, templateName, language = 'en', components = []) {
    try {
      if (!this.isConfigured()) {
        throw new Error('WhatsApp not configured');
      }

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: this.formatPhoneNumber(to),
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: language
            },
            components
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`WhatsApp template sent to ${to}: ${templateName}`);

      return {
        success: true,
        messageId: response.data.messages[0].id,
        status: 'sent'
      };
    } catch (error) {
      logger.error('Error sending WhatsApp template:', error.response?.data || error.message);
      throw new Error(`Failed to send WhatsApp template: ${error.message}`);
    }
  }

  /**
   * Send media message (image, video, document)
   */
  async sendMediaMessage(to, mediaType, mediaUrl, caption = '') {
    try {
      if (!this.isConfigured()) {
        throw new Error('WhatsApp not configured');
      }

      const mediaBody = {
        link: mediaUrl
      };

      if (caption && (mediaType === 'image' || mediaType === 'video')) {
        mediaBody.caption = caption;
      }

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: this.formatPhoneNumber(to),
          type: mediaType,
          [mediaType]: mediaBody
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`WhatsApp media sent to ${to}: ${mediaType}`);

      return {
        success: true,
        messageId: response.data.messages[0].id,
        status: 'sent'
      };
    } catch (error) {
      logger.error('Error sending WhatsApp media:', error.response?.data || error.message);
      throw new Error(`Failed to send WhatsApp media: ${error.message}`);
    }
  }

  /**
   * Send interest notification via WhatsApp
   */
  async sendInterestNotification(to, profileName, profileUrl) {
    try {
      const message = `🔔 New Interest Received!\n\n${profileName} has expressed interest in your profile.\n\nView profile: ${profileUrl}\n\nLogin to SoulMatch to respond.`;

      return await this.sendTextMessage(to, message);
    } catch (error) {
      logger.error('Error sending interest notification:', error);
      throw error;
    }
  }

  /**
   * Send match notification
   */
  async sendMatchNotification(to, profileName, matchScore, profileUrl) {
    try {
      const message = `💝 New Match Found!\n\n${profileName} (${matchScore}% match) matches your preferences.\n\nView profile: ${profileUrl}\n\nDiscover more matches on SoulMatch.`;

      return await this.sendTextMessage(to, message);
    } catch (error) {
      logger.error('Error sending match notification:', error);
      throw error;
    }
  }

  /**
   * Send message notification
   */
  async sendMessageNotification(to, senderName, messagePreview) {
    try {
      const message = `💬 New Message from ${senderName}\n\n"${messagePreview}"\n\nLogin to SoulMatch to reply.`;

      return await this.sendTextMessage(to, message);
    } catch (error) {
      logger.error('Error sending message notification:', error);
      throw error;
    }
  }

  /**
   * Send subscription reminder
   */
  async sendSubscriptionReminder(to, daysRemaining, planName) {
    try {
      const message = `⏰ Subscription Reminder\n\nYour ${planName} subscription expires in ${daysRemaining} days.\n\nRenew now to continue enjoying premium features on SoulMatch.`;

      return await this.sendTextMessage(to, message);
    } catch (error) {
      logger.error('Error sending subscription reminder:', error);
      throw error;
    }
  }

  /**
   * Send profile verification notification
   */
  async sendVerificationNotification(to, status, reason = '') {
    try {
      let message;
      if (status === 'approved') {
        message = `✅ Profile Verified!\n\nYour profile has been successfully verified.\n\nYou now have a verified badge on SoulMatch.`;
      } else {
        message = `❌ Profile Verification Failed\n\nReason: ${reason}\n\nPlease update your profile and try again.`;
      }

      return await this.sendTextMessage(to, message);
    } catch (error) {
      logger.error('Error sending verification notification:', error);
      throw error;
    }
  }

  /**
   * Send OTP for phone verification
   */
  async sendOTP(to, otp, expiryMinutes = 10) {
    try {
      const message = `🔐 SoulMatch Verification\n\nYour OTP is: ${otp}\n\nValid for ${expiryMinutes} minutes.\n\nDo not share this code with anyone.`;

      return await this.sendTextMessage(to, message);
    } catch (error) {
      logger.error('Error sending OTP:', error);
      throw error;
    }
  }

  /**
   * Generate WhatsApp web link (fallback)
   */
  generateWhatsAppLink(phoneNumber, message = '') {
    const formattedNumber = this.formatPhoneNumber(phoneNumber);
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedNumber}${message ? `?text=${encodedMessage}` : ''}`;
  }

  /**
   * Format phone number (remove special characters, add country code)
   */
  formatPhoneNumber(phone) {
    let cleaned = String(phone).replace(/\D/g, '');
    
    // Add country code if not present (default to India +91)
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = '91' + cleaned.substring(1);
    }

    return cleaned;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(signature, body) {
    try {
      const crypto = require('crypto');
      const appSecret = process.env.WHATSAPP_APP_SECRET;

      if (!appSecret) {
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', appSecret)
        .update(body)
        .digest('hex');

      return signature === `sha256=${expectedSignature}`;
    } catch (error) {
      logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(body) {
    try {
      const { entry } = body;

      if (!entry || !entry.length) {
        return { processed: false };
      }

      for (const item of entry) {
        const changes = item.changes || [];
        
        for (const change of changes) {
          if (change.field === 'messages') {
            const messages = change.value?.messages || [];
            
            for (const message of messages) {
              await this.processIncomingMessage(message, change.value);
            }
          } else if (change.field === 'message_status') {
            await this.processMessageStatus(change.value);
          }
        }
      }

      return { processed: true };
    } catch (error) {
      logger.error('Error handling WhatsApp webhook:', error);
      throw error;
    }
  }

  /**
   * Process incoming message
   */
  async processIncomingMessage(message, value) {
    try {
      logger.info(`Incoming WhatsApp message: ${message.id} from ${message.from}`);

      // Handle different message types
      if (message.type === 'text') {
        logger.info(`Text message: ${message.text.body}`);
      } else if (message.type === 'image') {
        logger.info(`Image message: ${message.image.id}`);
      } else if (message.type === 'button') {
        logger.info(`Button response: ${message.button.text}`);
      }

      // You can implement custom logic here to process messages
      // For example, auto-reply, save to database, etc.

    } catch (error) {
      logger.error('Error processing incoming message:', error);
    }
  }

  /**
   * Process message status update
   */
  async processMessageStatus(value) {
    try {
      const statuses = value.statuses || [];
      
      for (const status of statuses) {
        logger.info(`Message status update: ${status.id} -> ${status.status}`);
        
        // Update message status in database
        // You can implement this based on your requirements
      }
    } catch (error) {
      logger.error('Error processing message status:', error);
    }
  }

  /**
   * Get message template list
   */
  async getMessageTemplates() {
    try {
      if (!this.isConfigured()) {
        throw new Error('WhatsApp not configured');
      }

      const response = await axios.get(
        `${this.apiUrl}/${this.businessAccountId}/message_templates`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return response.data.data || [];
    } catch (error) {
      logger.error('Error fetching message templates:', error);
      throw new Error(`Failed to fetch templates: ${error.message}`);
    }
  }

  /**
   * Check if WhatsApp is configured
   */
  isConfigured() {
    return !!(
      this.phoneNumberId &&
      this.accessToken &&
      this.businessAccountId
    );
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      phoneNumberId: this.phoneNumberId ? '****' + this.phoneNumberId.slice(-4) : null,
      apiUrl: this.apiUrl
    };
  }
}

// Singleton instance
const whatsappService = new WhatsAppService();

module.exports = whatsappService;
