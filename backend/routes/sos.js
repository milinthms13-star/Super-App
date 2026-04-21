const express = require('express');
const Chat = require('../models/Chat');
const Call = require('../models/Call');
const Contact = require('../models/Contact');
const { authenticate } = require('../middleware/auth');
const { emitToUser, getUserStatus } = require('../config/websocket');
const logger = require('../utils/logger');

const router = express.Router();

const getOrCreateDirectChat = async (currentUserId, otherUserId) => {
  let chat = await Chat.findOne({
    type: 'direct',
    participants: { $all: [currentUserId, otherUserId] },
  });

  if (!chat) {
    chat = new Chat({
      type: 'direct',
      participants: [currentUserId, otherUserId],
    });
    await chat.save();
  }

  return chat;
};

// POST /api/sos/send-alert
router.post('/send-alert', authenticate, async (req, res) => {
  try {
    const {
      reason = 'Emergency support requested',
      location = 'Current Location',
      channels = ['Push', 'Call'],
      timestamp = new Date().toISOString(),
    } = req.body || {};

    const userId = req.user._id;
    const userName = req.user.name || req.user.email;
    const userPhone = req.user.phone || '';

    const contacts = await Contact.find({
      userId,
      isBlocked: false,
    }).populate('contactUserId', 'name avatar email phone');

    const registeredContacts = contacts.filter((contact) => contact.contactUserId?._id);

    if (registeredContacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No registered app contacts found. Add trusted contacts in LinkUp first.',
      });
    }

    const recipients = [];

    for (const contact of registeredContacts) {
      const recipient = contact.contactUserId;
      const chat = await getOrCreateDirectChat(userId, recipient._id);
      const call = new Call({
        chatId: chat._id,
        initiatorId: userId,
        recipientId: recipient._id,
        callType: 'audio',
        status: 'ringing',
      });
      await call.save();

      const recipientStatus = getUserStatus(recipient._id.toString());
      const alertPayload = {
        alertId: `sos-${call._id}`,
        callId: call._id.toString(),
        chatId: chat._id.toString(),
        fromUser: {
          id: userId.toString(),
          name: userName,
          avatar: req.user.avatar || 'SOS',
          email: req.user.email,
          phone: userPhone,
        },
        location,
        reason,
        channels,
        timestamp,
        online: recipientStatus.status === 'online',
      };

      emitToUser(recipient._id.toString(), 'notification:received', {
        userId: recipient._id.toString(),
        title: `SOS from ${userName}`,
        body: `${reason} at ${location}`,
        type: 'sos-alert',
        actionData: alertPayload,
      });

      emitToUser(recipient._id.toString(), 'sos:incoming', alertPayload);
      emitToUser(recipient._id.toString(), 'call:incoming', {
        callId: call._id.toString(),
        initiatorId: userId.toString(),
        recipientId: recipient._id.toString(),
        chatId: chat._id.toString(),
        callType: 'audio',
        status: 'ringing',
        emergency: true,
        caller: {
          id: userId.toString(),
          name: userName,
          avatar: req.user.avatar || 'SOS',
          email: req.user.email,
          phone: userPhone,
        },
        sosAlert: {
          reason,
          location,
          timestamp,
        },
      });

      recipients.push({
        id: recipient._id.toString(),
        name: contact.displayName || recipient.name || recipient.email,
        email: recipient.email,
        online: recipientStatus.status === 'online',
      });
    }

    logger.info('SOS alert dispatched to registered contacts', {
      userId: userId.toString(),
      userName,
      location,
      reason,
      recipientCount: recipients.length,
    });

    return res.status(200).json({
      success: true,
      message: 'SOS alert dispatched to registered contacts',
      data: {
        userId: userId.toString(),
        userName,
        userPhone,
        timestamp,
        location,
        reason,
        recipientCount: recipients.length,
        onlineRecipientCount: recipients.filter((recipient) => recipient.online).length,
        recipients,
      },
    });
  } catch (error) {
    logger.error('SOS alert failed', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send SOS alert',
    });
  }
});

module.exports = router;
