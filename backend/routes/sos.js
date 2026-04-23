const express = require('express');
const Chat = require('../models/Chat');
const Call = require('../models/Call');
const Contact = require('../models/Contact');
const SosContact = require('../models/SosContact');
const SosIncident = require('../models/SosIncident');
const { authenticate } = require('../middleware/auth');
const { emitToUser, getUserStatus } = require('../config/websocket');
const logger = require('../utils/logger');
const { sendSMS } = require('../utils/sendSMS');
const { sendWhatsApp } = require('../utils/sendWhatsApp');

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

// GET /api/sos/contacts - List user's trusted SOS contacts
router.get('/contacts', authenticate, async (req, res) => {
  try {
    const contacts = await SosContact.find({ userId: req.user._id }).sort({ priority: 1, createdAt: -1 });
    res.json({
      success: true,
      data: contacts
    });
  } catch (error) {
    logger.error('Failed to fetch SOS contacts', error);
    res.status(500).json({ success: false, message: 'Failed to fetch contacts' });
  }
});

// POST /api/sos/contacts - Add SOS contact
router.post('/contacts', authenticate, async (req, res) => {
  try {
    const contactData = {
      userId: req.user._id,
      ...req.body,
      notifyBy: req.body.notifyBy || ['Push', 'SMS']
    };
    const contact = new SosContact(contactData);
    await contact.save();
    res.status(201).json({
      success: true,
      data: contact
    });
  } catch (error) {
    logger.error('Failed to create SOS contact', error);
    res.status(500).json({ success: false, message: 'Failed to save contact' });
  }
});

// DELETE /api/sos/contacts/:id
router.delete('/contacts/:id', authenticate, async (req, res) => {
  try {
    const contact = await SosContact.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }
    res.json({ success: true, message: 'Contact deleted' });
  } catch (error) {
    logger.error('Failed to delete SOS contact', error);
    res.status(500).json({ success: false, message: 'Failed to delete contact' });
  }
});

// GET /api/sos/history - Recent incidents
router.get('/history', authenticate, async (req, res) => {
  try {
    const { limit = 10, status } = req.query;
    const filter = { userId: req.user._id };
    if (status) filter.status = status;
    const incidents = await SosIncident.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('acknowledgedBy.contactId', 'name phone');
    res.json({
      success: true,
      data: incidents
    });
  } catch (error) {
    logger.error('Failed to fetch SOS history', error);
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
});

// POST /api/sos/send-alert
router.post('/send-alert', authenticate, async (req, res) => {
  try {
    const {
      reason = 'Emergency support requested',
      location,
      longitude,
      latitude,
      channels = ['Push', 'Call'],
      timestamp = new Date().toISOString(),
    } = req.body;

    const userId = req.user._id;
    const userName = req.user.name || req.user.email;
    const userPhone = req.user.phone || '';

    // Create SOS incident record
    const incident = new SosIncident({
      userId,
      reason,
      location: {
        type: 'Point',
        coordinates: longitude && latitude ? [parseFloat(longitude), parseFloat(latitude)] : undefined
      }
    });
    await incident.save();
    incident.history.push({ event: 'triggered', data: { channels, location, timestamp } });
    await incident.save();

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
        incidentId: incident._id.toString(),
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

      // Log app contact notification to incident
      incident.notificationsSent.push({
        type: 'push',
        to: recipient._id.toString(),
        status: 'sent',
        timestamp: new Date()
      });

      recipients.push({
        id: recipient._id.toString(),
        name: contact.displayName || recipient.name || recipient.email,
        email: recipient.email,
        online: recipientStatus.status === 'online',
      });
    }

    // SMS/WhatsApp for SosContacts (all trusted contacts, even non-app users)
    const sosContacts = await SosContact.find({ userId });
    for (const sosContact of sosContacts) {
      const phone = sosContact.phone;
      
      if (channels.includes('SMS') && phone) {
        const smsResult = await sendSMS(phone, `${reason} at ${location || 'your location'}`, incident._id.toString());
        incident.notificationsSent.push({
          type: 'sms',
          to: phone,
          status: smsResult.status,
          timestamp: new Date()
        });
      }
      
      if (channels.includes('WhatsApp') && phone && phone.startsWith('+91')) {
        const waResult = await sendWhatsApp(phone, reason, incident._id.toString());
        incident.notificationsSent.push({
          type: 'whatsapp',
          to: phone,
          status: waResult.status || (waResult.success ? 'sent' : 'failed'),
          timestamp: new Date()
        });
      }
    }

    // Log all notifications and save incident
    await incident.save();

    logger.info('SOS alert dispatched to registered contacts', {
      userId: userId.toString(),
      userName,
      location,
      reason,
      incidentId: incident._id.toString(),
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
