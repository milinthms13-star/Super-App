const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const OfflineQueue = require('../models/OfflineQueue');
const AutoReplyRule = require('../models/AutoReplyRule');
const LinkPreview = require('../models/LinkPreview');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const axios = require('axios');

// Validation schemas
const bulkDeleteSchema = Joi.object({
  messageIds: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).min(1).max(100).required(),
  chatId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
});

const bulkArchiveSchema = Joi.object({
  chatIds: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).min(1).max(50).required()
});

const autoReplySchema = Joi.object({
  enabled: Joi.boolean().required(),
  message: Joi.string().min(1).max(500).required(),
  scheduleStart: Joi.date().iso().optional(),
  scheduleEnd: Joi.date().iso().optional(),
  excludedContacts: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).optional()
});

const linkPreviewSchema = Joi.object({
  url: Joi.string().uri().required()
});

// POST /api/messaging/advanced/offline-queue - Add message to offline queue
router.post('/offline-queue', authenticate, async (req, res) => {
  try {
    const { chatId, content, messageType = 'text', media, replyTo } = req.body;

    const queuedMessage = new OfflineQueue({
      userId: req.user._id,
      chatId,
      content,
      messageType,
      media,
      replyTo,
      status: 'pending',
      attempts: 0,
      createdAt: new Date()
    });

    await queuedMessage.save();


    res.status(201).json({
      success: true,
      queuedMessage: {
        id: queuedMessage._id,
        status: queuedMessage.status
      }
    });
  } catch (error) {
    logger.error('Error adding to offline queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to queue message'
    });
  }
});

// GET /api/messaging/advanced/offline-queue - Get pending offline messages
router.get('/offline-queue', authenticate, async (req, res) => {
  try {
    const queuedMessages = await OfflineQueue.find({
      userId: req.user._id,
      status: 'pending'
    }).sort({ createdAt: 1 }).limit(100);

    res.json({
      success: true,
      messages: queuedMessages
    });
  } catch (error) {
    logger.error('Error fetching offline queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch offline queue'
    });
  }
});

// POST /api/messaging/advanced/offline-queue/sync - Sync offline messages
router.post('/offline-queue/sync', authenticate, async (req, res) => {
  try {
    const queuedMessages = await OfflineQueue.find({
      userId: req.user._id,
      status: 'pending'
    }).sort({ createdAt: 1 }).limit(50);

    const results = [];
    
    for (const queuedMsg of queuedMessages) {
      try {
        // Create actual message
        const message = new Message({
          senderId: req.user._id,
          chatId: queuedMsg.chatId,
          content: queuedMsg.content,
          messageType: queuedMsg.messageType,
          media: queuedMsg.media,
          replyTo: queuedMsg.replyTo,
          createdAt: queuedMsg.createdAt
        });

        await message.save();

        // Update chat
        await Chat.findByIdAndUpdate(queuedMsg.chatId, {
          lastMessage: message._id,
          lastMessageAt: message.createdAt
        });

        // Mark as synced
        queuedMsg.status = 'synced';
        queuedMsg.messageId = message._id;
        await queuedMsg.save();

        results.push({
          queueId: queuedMsg._id,
          messageId: message._id,
          status: 'success'
        });
      } catch (error) {
        queuedMsg.attempts += 1;
        queuedMsg.lastError = error.message;
        if (queuedMsg.attempts >= 3) {
          queuedMsg.status = 'failed';
        }
        await queuedMsg.save();

        results.push({
          queueId: queuedMsg._id,
          status: 'failed',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      synced: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      results
    });
  } catch (error) {
    logger.error('Error syncing offline queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync offline messages'
    });
  }
});


// GET /api/messaging/advanced/delivery-status/:messageId - Get message delivery status
router.get('/delivery-status/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId)
      .populate('chatId', 'participants type')
      .select('senderId deliveryStatus readBy createdAt');

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Check authorization
    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this message status'
      });
    }

    const chat = message.chatId;
    const recipients = chat.participants.filter(p => p.toString() !== req.user._id.toString());

    const status = {
      messageId: message._id,
      sent: true,
      sentAt: message.createdAt,
      delivered: message.deliveryStatus === 'delivered' || message.deliveryStatus === 'read',
      deliveredAt: message.deliveredAt,
      read: message.deliveryStatus === 'read',
      readAt: message.readBy && message.readBy.length > 0 ? message.readBy[0].readAt : null,
      readByCount: message.readBy ? message.readBy.length : 0,
      totalRecipients: recipients.length
    };

    res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error('Error fetching delivery status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch delivery status'
    });
  }
});

// POST /api/messaging/advanced/messages/bulk-delete - Delete multiple messages
router.post('/messages/bulk-delete', authenticate, async (req, res) => {
  try {
    const { error, value } = bulkDeleteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { messageIds, chatId } = value;

    // Verify user is participant in the chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete messages in this chat'
      });
    }

    // Delete messages where user is the sender
    const result = await Message.updateMany(
      {
        _id: { $in: messageIds },
        senderId: req.user._id,
        chatId: chatId
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      deletedCount: result.modifiedCount
    });
  } catch (error) {
    logger.error('Error bulk deleting messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete messages'
    });
  }
});


// POST /api/messaging/advanced/chats/bulk-archive - Archive multiple chats
router.post('/chats/bulk-archive', authenticate, async (req, res) => {
  try {
    const { error, value } = bulkArchiveSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { chatIds } = value;

    // Update chats where user is participant
    const result = await Chat.updateMany(
      {
        _id: { $in: chatIds },
        participants: req.user._id
      },
      {
        $set: {
          [`archivedBy.${req.user._id}`]: true,
          [`archivedAt.${req.user._id}`]: new Date()
        }
      }
    );

    res.json({
      success: true,
      archivedCount: result.modifiedCount
    });
  } catch (error) {
    logger.error('Error bulk archiving chats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive chats'
    });
  }
});

// GET /api/messaging/advanced/unread-count - Get total unread message count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id
    }).select('unreadCount');

    const totalUnread = chats.reduce((sum, chat) => {
      const userUnread = chat.unreadCount?.get(req.user._id.toString()) || 0;
      return sum + userUnread;
    }, 0);

    res.json({
      success: true,
      unreadCount: totalUnread,
      chatsWithUnread: chats.filter(c => (c.unreadCount?.get(req.user._id.toString()) || 0) > 0).length
    });
  } catch (error) {
    logger.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unread count'
    });
  }
});

// GET /api/messaging/advanced/link-preview - Fetch link preview metadata
router.get('/link-preview', authenticate, async (req, res) => {
  try {
    const { error, value } = linkPreviewSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { url } = value;

    // Check cache first
    const cached = await LinkPreview.findOne({ url }).where('expiresAt').gt(new Date());
    if (cached) {
      return res.json({
        success: true,
        preview: {
          url: cached.url,
          title: cached.title,
          description: cached.description,
          image: cached.image,
          siteName: cached.siteName
        },
        cached: true
      });
    }

    // Fetch metadata
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MalabarBazaar/1.0)'
        }
      });

      const html = response.data;
      
      // Simple meta tag extraction (could use cheerio for better parsing)
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
      const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i);
      const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
      const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
      const ogSiteMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["'][^>]*>/i);

      const preview = {
        url,
        title: (ogTitleMatch ? ogTitleMatch[1] : titleMatch ? titleMatch[1] : 'No title').slice(0, 200),
        description: (ogDescMatch ? ogDescMatch[1] : descMatch ? descMatch[1] : '').slice(0, 500),
        image: ogImageMatch ? ogImageMatch[1] : null,
        siteName: ogSiteMatch ? ogSiteMatch[1] : new URL(url).hostname
      };

      // Cache for 24 hours
      await LinkPreview.create({
        ...preview,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      res.json({
        success: true,
        preview,
        cached: false
      });
    } catch (fetchError) {
      res.json({
        success: true,
        preview: {
          url,
          title: url,
          description: '',
          image: null,
          siteName: new URL(url).hostname
        },
        cached: false,
        error: 'Could not fetch metadata'
      });
    }
  } catch (error) {
    logger.error('Error fetching link preview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch link preview'
    });
  }
});


// POST /api/messaging/advanced/auto-reply - Create/update auto-reply rule
router.post('/auto-reply', authenticate, async (req, res) => {
  try {
    const { error, value } = autoReplySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { enabled, message, scheduleStart, scheduleEnd, excludedContacts } = value;

    // Find existing or create new
    let autoReply = await AutoReplyRule.findOne({ userId: req.user._id });
    
    if (autoReply) {
      autoReply.enabled = enabled;
      autoReply.message = message;
      autoReply.scheduleStart = scheduleStart;
      autoReply.scheduleEnd = scheduleEnd;
      autoReply.excludedContacts = excludedContacts || [];
      await autoReply.save();
    } else {
      autoReply = await AutoReplyRule.create({
        userId: req.user._id,
        enabled,
        message,
        scheduleStart,
        scheduleEnd,
        excludedContacts: excludedContacts || []
      });
    }

    res.json({
      success: true,
      autoReply: {
        id: autoReply._id,
        enabled: autoReply.enabled,
        message: autoReply.message,
        scheduleStart: autoReply.scheduleStart,
        scheduleEnd: autoReply.scheduleEnd,
        excludedContacts: autoReply.excludedContacts
      }
    });
  } catch (error) {
    logger.error('Error creating auto-reply:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create auto-reply rule'
    });
  }
});

// GET /api/messaging/advanced/auto-reply - Get auto-reply rules
router.get('/auto-reply', authenticate, async (req, res) => {
  try {
    const autoReply = await AutoReplyRule.findOne({ userId: req.user._id });

    res.json({
      success: true,
      autoReply: autoReply ? {
        id: autoReply._id,
        enabled: autoReply.enabled,
        message: autoReply.message,
        scheduleStart: autoReply.scheduleStart,
        scheduleEnd: autoReply.scheduleEnd,
        excludedContacts: autoReply.excludedContacts
      } : null
    });
  } catch (error) {
    logger.error('Error fetching auto-reply:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch auto-reply rules'
    });
  }
});

// DELETE /api/messaging/advanced/auto-reply - Delete auto-reply rule
router.delete('/auto-reply', authenticate, async (req, res) => {
  try {
    await AutoReplyRule.deleteOne({ userId: req.user._id });

    res.json({
      success: true,
      message: 'Auto-reply rule deleted'
    });
  } catch (error) {
    logger.error('Error deleting auto-reply:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete auto-reply rule'
    });
  }
});

module.exports = router;
