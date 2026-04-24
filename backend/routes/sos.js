const express = require('express');
const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const Call = require('../models/Call');
const SosContact = require('../models/SosContact');
const SosIncident = require('../models/SosIncident');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { emitToUser } = require('../config/websocket');
const logger = require('../utils/logger');
const { sendSMS } = require('../utils/sendSMS');
const { sendWhatsApp } = require('../utils/sendWhatsApp');
const { ensureMessagingUser } = require('../utils/ensureMessagingUser');
const voiceCallService = require('../services/voiceCallService');

const router = express.Router();
const isMongoObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

const formatCoordinate = (value) => {
  const numericValue = Number.parseFloat(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(5) : '';
};

const buildMapsUrl = (latitude, longitude) =>
  `https://www.google.com/maps?q=${latitude},${longitude}`;

const buildSharedLocation = ({ location, latitude, longitude, accuracy, mapsUrl }) => {
  const parsedLatitude = Number.parseFloat(latitude);
  const parsedLongitude = Number.parseFloat(longitude);
  const hasCoordinates = Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude);
  const parsedAccuracy = Number.parseFloat(accuracy);
  const coordinateText = hasCoordinates
    ? `${formatCoordinate(parsedLatitude)}, ${formatCoordinate(parsedLongitude)}`
    : '';
  const accuracyText = Number.isFinite(parsedAccuracy) ? `${Math.round(parsedAccuracy)}m accuracy` : '';
  const locationText = String(location || '').trim() || (
    coordinateText
      ? `${coordinateText}${accuracyText ? ` (${accuracyText})` : ''}`
      : 'Location unavailable'
  );
  const resolvedMapsUrl = mapsUrl || (hasCoordinates ? buildMapsUrl(parsedLatitude, parsedLongitude) : '');

  return {
    latitude: hasCoordinates ? parsedLatitude : null,
    longitude: hasCoordinates ? parsedLongitude : null,
    accuracy: Number.isFinite(parsedAccuracy) ? Math.round(parsedAccuracy) : null,
    locationText,
    mapsUrl: resolvedMapsUrl,
    shareText: resolvedMapsUrl ? `${locationText}. Map: ${resolvedMapsUrl}` : locationText,
  };
};

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

const getPhoneLookupVariants = (value = '') => {
  const rawValue = String(value || '').trim();
  if (!rawValue) {
    return [];
  }

  const formattedValue = voiceCallService.formatPhoneNumber(rawValue);
  const digitsOnly = formattedValue.replace(/\D/g, '');
  const localDigits = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;

  return [...new Set([
    rawValue,
    formattedValue,
    digitsOnly ? `+${digitsOnly}` : '',
    digitsOnly,
    localDigits,
  ])].filter(Boolean);
};

const findAppUserByPhone = async (phone, excludedUserId = null) => {
  const variants = getPhoneLookupVariants(phone);
  if (variants.length === 0) {
    return null;
  }

  const query = {
    phone: { $in: variants },
  };

  if (excludedUserId && isMongoObjectId(excludedUserId)) {
    query._id = { $ne: excludedUserId };
  }

  return User.findOne(query).select('name email avatar phone contactMeans');
};

// GET /api/sos/contacts - List user's trusted SOS contacts
router.get('/contacts', authenticate, async (req, res) => {
  try {
    const contacts = await SosContact.find({
      userId: req.user._id,
      isActive: true,
    }).sort({ priority: 1, createdAt: -1 });
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
    const notifyBy = Array.isArray(req.body.notifyBy) && req.body.notifyBy.length > 0
      ? [...new Set(req.body.notifyBy)]
      : ['SMS'];

    const contactData = {
      userId: req.user._id,
      ...req.body,
      notifyBy,
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
      accuracy,
      mapsUrl,
      channels = ['SMS', 'Call'],
      timestamp = new Date().toISOString(),
    } = req.body;

    const senderUser = await ensureMessagingUser(req.user);
    const userId = senderUser?._id || req.user._id;
    const userName = senderUser?.name || req.user.name || req.user.email;
    const userPhone = senderUser?.phone || req.user.phone || '';
    const sharedLocation = buildSharedLocation({
      location,
      latitude,
      longitude,
      accuracy,
      mapsUrl,
    });

    // Create SOS incident record
    const incident = new SosIncident({
      userId,
      reason,
      location: {
        type: 'Point',
        coordinates:
          Number.isFinite(sharedLocation.longitude) && Number.isFinite(sharedLocation.latitude)
            ? [sharedLocation.longitude, sharedLocation.latitude]
            : undefined,
      }
    });
    await incident.save();
    incident.history.push({
      event: 'triggered',
      data: {
        channels,
        location: sharedLocation.locationText,
        mapsUrl: sharedLocation.mapsUrl,
        accuracy: sharedLocation.accuracy,
        timestamp,
      },
    });
    await incident.save();

    const sosContacts = await SosContact.find({
      userId,
      isActive: true,
    }).sort({ priority: 1, createdAt: -1 });

    if (sosContacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No SOS trusted contacts found. Add trusted contacts in the SOS module first.',
      });
    }

    const normalizedChannels = Array.isArray(channels) && channels.length > 0
      ? [...new Set(channels)]
      : ['SMS', 'Call'];
    const recipients = [];
    let videoRecipientCount = 0;

    for (const sosContact of sosContacts) {
      const rawPhone = sosContact.phone || '';
      const phone = rawPhone ? voiceCallService.formatPhoneNumber(rawPhone) : rawPhone;
      const deliveryChannels = (Array.isArray(sosContact.notifyBy) ? sosContact.notifyBy : [])
        .filter((channel) => normalizedChannels.includes(channel));
      const deliveryStatus = {};
      const matchedAppUser = deliveryChannels.includes('Call')
        ? await findAppUserByPhone(phone, userId)
        : null;

      if (deliveryChannels.includes('SMS') && phone) {
        const smsResult = await sendSMS(
          phone,
          `${reason} at ${sharedLocation.shareText}`,
          incident._id.toString()
        );
        incident.notificationsSent.push({
          type: 'sms',
          to: phone,
          status: smsResult.status,
          timestamp: new Date(),
        });
        deliveryStatus.SMS = smsResult.status;
      }

      if (deliveryChannels.includes('WhatsApp') && phone) {
        const waResult = await sendWhatsApp(
          phone,
          `${reason}\nLocation: ${sharedLocation.shareText}`,
          incident._id.toString()
        );
        incident.notificationsSent.push({
          type: 'whatsapp',
          to: phone,
          status: waResult.status || (waResult.success ? 'sent' : 'failed'),
          timestamp: new Date(),
        });
        deliveryStatus.WhatsApp = waResult.status || (waResult.success ? 'sent' : 'failed');
      }

      if (deliveryChannels.includes('Call') && phone) {
        const callResult = await voiceCallService.initiateVoiceCall({
          reminderId: incident._id.toString(),
          recipientPhoneNumber: phone,
          voiceMessage: `SOS alert from ${userName}. Reason: ${reason}. Last known location: ${sharedLocation.locationText}. Please contact them immediately.`,
          messageType: 'text',
          senderName: userName,
        });

        incident.notificationsSent.push({
          type: 'call',
          to: phone,
          status: callResult.status || 'failed',
          timestamp: new Date(),
        });
        deliveryStatus.Call = callResult.status || 'failed';
      }

      if (
        deliveryChannels.includes('Call') &&
        matchedAppUser?._id &&
        matchedAppUser.contactMeans?.availableForVideoCall !== false &&
        isMongoObjectId(userId)
      ) {
        const emergencyChat = await getOrCreateDirectChat(userId, matchedAppUser._id);
        const emergencyVideoCall = new Call({
          chatId: emergencyChat._id,
          initiatorId: userId,
          recipientId: matchedAppUser._id,
          callType: 'video',
          status: 'ringing',
        });

        await emergencyVideoCall.save();

        emitToUser(matchedAppUser._id.toString(), 'call:incoming', {
          _id: emergencyVideoCall._id,
          callId: emergencyVideoCall._id,
          initiatorId: userId,
          recipientId: matchedAppUser._id,
          chatId: emergencyChat._id,
          callType: 'video',
          status: emergencyVideoCall.status,
          emergency: true,
          caller: {
            _id: userId,
            name: userName,
            avatar: senderUser?.avatar || req.user.avatar || 'SOS',
            email: senderUser?.email || req.user.email,
            phone: userPhone,
          },
          sosAlert: {
            incidentId: incident._id.toString(),
            reason,
            location: sharedLocation.locationText,
            mapsUrl: sharedLocation.mapsUrl,
            accuracy: sharedLocation.accuracy,
            timestamp,
            liveLocation: {
              latitude: sharedLocation.latitude,
              longitude: sharedLocation.longitude,
              mapsUrl: sharedLocation.mapsUrl,
              accuracy: sharedLocation.accuracy,
            },
          },
          timestamp: new Date().toISOString(),
        });

        incident.notificationsSent.push({
          type: 'call',
          to: matchedAppUser._id.toString(),
          status: 'video-ringing',
          timestamp: new Date(),
        });
        deliveryStatus.Video = 'ringing';
        videoRecipientCount += 1;
      }

      recipients.push({
        id: sosContact._id.toString(),
        name: sosContact.name,
        phone,
        relation: sosContact.relation || '',
        priority: sosContact.priority,
        channels: deliveryChannels,
        appUserId: matchedAppUser?._id?.toString() || '',
        videoCallStatus: deliveryStatus.Video || '',
        deliveryStatus,
      });
    }

    // Log all notifications and save incident
    await incident.save();

    logger.info('SOS alert dispatched to trusted contacts', {
      userId: userId.toString(),
      userName,
      location: sharedLocation.locationText,
      reason,
      incidentId: incident._id.toString(),
      recipientCount: recipients.length,
      videoRecipientCount,
    });

    return res.status(200).json({
      success: true,
      message: 'SOS alert dispatched to trusted contacts',
      data: {
        incidentId: incident._id.toString(),
        userId: userId.toString(),
        userName,
        userPhone,
        timestamp,
        location: sharedLocation.locationText,
        mapsUrl: sharedLocation.mapsUrl,
        accuracy: sharedLocation.accuracy,
        reason,
        recipientCount: recipients.length,
        videoRecipientCount,
        deliveryCount: incident.notificationsSent.length,
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
