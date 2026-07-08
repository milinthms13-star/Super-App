/**
 * WhatsApp Integration Routes
 * Handles WhatsApp messaging and webhook
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');
const logger = require('../utils/logger');

/**
 * POST /api/matrimonial/whatsapp/send
 * Send WhatsApp message
 */
router.post('/send', authenticate, async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and message are required'
      });
    }

    const result = await whatsappService.sendTextMessage(to, message);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error sending WhatsApp message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send WhatsApp message'
    });
  }
});

/**
 * POST /api/matrimonial/whatsapp/send-template
 * Send WhatsApp template message
 */
router.post('/send-template', authenticate, async (req, res) => {
  try {
    const { to, templateName, language, components } = req.body;

    if (!to || !templateName) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and template name are required'
      });
    }

    const result = await whatsappService.sendTemplateMessage(
      to,
      templateName,
      language,
      components
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error sending WhatsApp template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send WhatsApp template'
    });
  }
});

/**
 * POST /api/matrimonial/whatsapp/send-media
 * Send WhatsApp media message
 */
router.post('/send-media', authenticate, async (req, res) => {
  try {
    const { to, mediaType, mediaUrl, caption } = req.body;

    if (!to || !mediaType || !mediaUrl) {
      return res.status(400).json({
        success: false,
        error: 'Phone number, media type, and media URL are required'
      });
    }

    const result = await whatsappService.sendMediaMessage(
      to,
      mediaType,
      mediaUrl,
      caption
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error sending WhatsApp media:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send WhatsApp media'
    });
  }
});

/**
 * POST /api/matrimonial/whatsapp/notify/interest
 * Send interest notification
 */
router.post('/notify/interest', authenticate, async (req, res) => {
  try {
    const { to, profileName, profileUrl } = req.body;

    if (!to || !profileName) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and profile name are required'
      });
    }

    const result = await whatsappService.sendInterestNotification(
      to,
      profileName,
      profileUrl
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error sending interest notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send notification'
    });
  }
});

/**
 * POST /api/matrimonial/whatsapp/notify/match
 * Send match notification
 */
router.post('/notify/match', authenticate, async (req, res) => {
  try {
    const { to, profileName, matchScore, profileUrl } = req.body;

    if (!to || !profileName) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and profile name are required'
      });
    }

    const result = await whatsappService.sendMatchNotification(
      to,
      profileName,
      matchScore,
      profileUrl
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error sending match notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send notification'
    });
  }
});

/**
 * POST /api/matrimonial/whatsapp/notify/message
 * Send message notification
 */
router.post('/notify/message', authenticate, async (req, res) => {
  try {
    const { to, senderName, messagePreview } = req.body;

    if (!to || !senderName) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and sender name are required'
      });
    }

    const result = await whatsappService.sendMessageNotification(
      to,
      senderName,
      messagePreview
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error sending message notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send notification'
    });
  }
});

/**
 * POST /api/matrimonial/whatsapp/send-otp
 * Send OTP via WhatsApp
 */
router.post('/send-otp', authenticate, async (req, res) => {
  try {
    const { to, otp, expiryMinutes } = req.body;

    if (!to || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and OTP are required'
      });
    }

    const result = await whatsappService.sendOTP(to, otp, expiryMinutes);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error sending OTP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send OTP'
    });
  }
});

/**
 * GET /api/matrimonial/whatsapp/link
 * Generate WhatsApp link
 */
router.get('/link', async (req, res) => {
  try {
    const { phoneNumber, message } = req.query;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number required'
      });
    }

    const link = whatsappService.generateWhatsAppLink(phoneNumber, message || '');

    res.json({
      success: true,
      data: { link }
    });
  } catch (error) {
    logger.error('Error generating WhatsApp link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate link'
    });
  }
});

/**
 * GET /api/matrimonial/whatsapp/templates
 * Get message templates
 */
router.get('/templates', authenticate, async (req, res) => {
  try {
    const templates = await whatsappService.getMessageTemplates();

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    });
  }
});

/**
 * GET /api/matrimonial/whatsapp/status
 * Get WhatsApp service status
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const status = whatsappService.getStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error fetching status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch status'
    });
  }
});

/**
 * POST /api/matrimonial/whatsapp/webhook
 * WhatsApp webhook endpoint
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    // Verify signature
    if (signature) {
      const isValid = whatsappService.verifyWebhookSignature(signature, body);
      if (!isValid) {
        logger.warn('Invalid WhatsApp webhook signature');
        return res.status(401).json({
          success: false,
          error: 'Invalid signature'
        });
      }
    }

    const parsedBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // Process webhook asynchronously
    setImmediate(async () => {
      try {
        await whatsappService.handleWebhook(parsedBody);
      } catch (error) {
        logger.error('Error processing WhatsApp webhook:', error);
      }
    });

    // Respond immediately
    res.status(200).json({ success: true });

  } catch (error) {
    logger.error('WhatsApp webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed'
    });
  }
});

/**
 * GET /api/matrimonial/whatsapp/webhook
 * WhatsApp webhook verification
 */
router.get('/webhook', (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'matrimonial_verify_token';

    if (mode === 'subscribe' && token === verifyToken) {
      logger.info('WhatsApp webhook verified');
      res.status(200).send(challenge);
    } else {
      logger.warn('WhatsApp webhook verification failed');
      res.status(403).json({
        success: false,
        error: 'Verification failed'
      });
    }
  } catch (error) {
    logger.error('Webhook verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed'
    });
  }
});

module.exports = router;
