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

const formatIncidentLocation = (incident = {}) => {
  if (String(incident.locationText || '').trim()) {
    return incident.locationText.trim();
  }

  const coordinates = incident?.location?.coordinates;
  if (Array.isArray(coordinates) && coordinates.length === 2) {
    const [longitude, latitude] = coordinates;
    return `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`;
  }

  return 'Location unavailable';
};

const getResponderIdentity = (req, payload = {}) => ({
  responderName: String(payload.responderName || req.user?.name || req.user?.email || 'Responder').trim(),
  responderEmail: String(payload.responderEmail || req.user?.email || '').trim().toLowerCase(),
});

const isPrivilegedResponder = (user = {}) => {
  const normalizedRoles = [
    user.role,
    user.registrationType,
    ...(Array.isArray(user.roles) ? user.roles : []),
  ]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);

  return normalizedRoles.some((role) =>
    ['admin', 'superadmin', 'support', 'moderator', 'responder', 'emergency'].includes(role)
  );
};

const incidentHasResponder = (incident, responderEmail = '') =>
  Boolean(responderEmail) &&
  Array.isArray(incident?.acknowledgedBy) &&
  incident.acknowledgedBy.some(
    (entry) => String(entry?.responderEmail || '').trim().toLowerCase() === responderEmail
  );

const canManageIncident = (incident, req, responderEmail = '') => {
  if (!incident || !req?.user) {
    return false;
  }

  if (isPrivilegedResponder(req.user)) {
    return true;
  }

  const incidentUserId =
    incident?.userId?._id?.toString?.() ||
    incident?.userId?.toString?.() ||
    String(incident?.userId || '');

  if (incidentUserId && incidentUserId === String(req.user._id || '')) {
    return true;
  }

  return incidentHasResponder(incident, responderEmail);
};

const buildResponseHistoryItem = (incident, responderEmail = '') => {
  const normalizedResponderEmail = String(responderEmail || '').trim().toLowerCase();
  const matchingAcknowledgement =
    incident?.acknowledgedBy?.find(
      (entry) => String(entry?.responderEmail || '').trim().toLowerCase() === normalizedResponderEmail
    ) || incident?.acknowledgedBy?.[0];
  const matchingLocation =
    incident?.responderLocations
      ?.filter(
        (entry) => String(entry?.responderEmail || '').trim().toLowerCase() === normalizedResponderEmail
      )
      .slice(-1)[0] || incident?.responderLocations?.slice(-1)[0];

  return {
    _id: incident._id,
    callerName: incident?.userId?.name || 'Unknown User',
    callerEmail: incident?.userId?.email || '',
    callerPhone: incident?.userId?.phone || '',
    reason: incident.reason,
    location: formatIncidentLocation(incident),
    mapsUrl: incident.mapsUrl || '',
    status: incident.status,
    createdAt: incident.createdAt,
    acknowledgedAt: matchingAcknowledgement?.timestamp || null,
    resolvedAt: incident.resolvedAt || null,
    escalationLevel: incident.escalationLevel || 0,
    notes: incident.responseNotes || [],
    myLocation: matchingLocation || null,
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
      batteryStatus = {},
      channels = ['SMS', 'Call'],
      timestamp = new Date().toISOString(),
      countdownSeconds = null,
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
    const normalizedChannels = Array.isArray(channels) && channels.length > 0
      ? [...new Set(channels)]
      : ['SMS', 'Call'];
    const normalizedBatteryStatus = {
      supported: Boolean(batteryStatus?.supported),
      level: Number.isFinite(Number.parseFloat(batteryStatus?.level))
        ? Math.round(Number.parseFloat(batteryStatus.level))
        : null,
      charging: Boolean(batteryStatus?.charging),
    };

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
      },
      locationText: sharedLocation.locationText,
      mapsUrl: sharedLocation.mapsUrl,
      accuracy: sharedLocation.accuracy,
      channels: normalizedChannels,
      batteryStatus: normalizedBatteryStatus,
    });
    await incident.save();
    incident.history.push({
      event: 'triggered',
      data: {
        channels: normalizedChannels,
        location: sharedLocation.locationText,
        mapsUrl: sharedLocation.mapsUrl,
        accuracy: sharedLocation.accuracy,
        batteryStatus: normalizedBatteryStatus,
        countdownSeconds,
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

// POST /api/sos/acknowledge
router.post('/acknowledge', authenticate, async (req, res) => {
  try {
    const { incidentId } = req.body;
    if (!isMongoObjectId(incidentId)) {
      return res.status(400).json({ success: false, message: 'Valid incidentId is required' });
    }

    const incident = await SosIncident.findById(incidentId).populate('userId', 'name email phone');
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const { responderName, responderEmail } = getResponderIdentity(req, req.body);
    const alreadyAcknowledged = incidentHasResponder(incident, responderEmail);

    if (!alreadyAcknowledged) {
      incident.acknowledgedBy.push({
        responderName,
        responderEmail,
        timestamp: new Date(),
      });
    }

    if (incident.status !== 'resolved' && incident.status !== 'cancelled') {
      incident.status = 'acknowledged';
    }

    incident.history.push({
      event: 'acknowledged',
      data: {
        responderName,
        responderEmail,
      },
    });
    await incident.save();

    if (incident.userId?._id) {
      emitToUser(incident.userId._id.toString(), 'sos:acknowledged', {
        incidentId: incident._id.toString(),
        responderName,
        responderEmail,
        respondedAt: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data: buildResponseHistoryItem(incident, responderEmail),
    });
  } catch (error) {
    logger.error('Failed to acknowledge SOS incident', error);
    return res.status(500).json({ success: false, message: 'Failed to acknowledge incident' });
  }
});

// GET /api/sos/my-responses
router.get('/my-responses', authenticate, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const responderEmail = String(req.user?.email || '').trim().toLowerCase();
    const filter = isPrivilegedResponder(req.user)
      ? {}
      : { 'acknowledgedBy.responderEmail': responderEmail };

    const incidents = await SosIncident.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number.parseInt(limit, 10) || 50)
      .populate('userId', 'name email phone');

    const data = incidents.map((incident) => {
      const incidentObject = incident.toObject();
      return {
        ...incidentObject,
        location: formatIncidentLocation(incident),
        responseNotes: incident.responseNotes || [],
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    logger.error('Failed to fetch responder incidents', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch incidents' });
  }
});

// POST /api/sos/incident/:id/note
router.post('/incident/:id/note', authenticate, async (req, res) => {
  try {
    const { note = '' } = req.body;
    const trimmedNote = String(note || '').trim();
    if (!trimmedNote) {
      return res.status(400).json({ success: false, message: 'Note text is required' });
    }

    const incident = await SosIncident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const { responderName, responderEmail } = getResponderIdentity(req, req.body);
    if (!canManageIncident(incident, req, responderEmail)) {
      return res.status(403).json({ success: false, message: 'Not allowed to update this incident' });
    }

    incident.responseNotes.push({
      text: trimmedNote,
      responderName,
      responderEmail,
      createdAt: new Date(),
    });
    incident.history.push({
      event: 'note-added',
      data: {
        responderName,
        responderEmail,
        note: trimmedNote,
      },
    });
    await incident.save();

    return res.json({
      success: true,
      data: incident.responseNotes,
    });
  } catch (error) {
    logger.error('Failed to add SOS response note', error);
    return res.status(500).json({ success: false, message: 'Failed to add note' });
  }
});

// PUT /api/sos/incident/:id/status
router.put('/incident/:id/status', authenticate, async (req, res) => {
  try {
    const nextStatus = String(req.body.status || '').trim().toLowerCase();
    if (!['active', 'acknowledged', 'escalated', 'resolved', 'cancelled'].includes(nextStatus)) {
      return res.status(400).json({ success: false, message: 'Unsupported incident status' });
    }

    const incident = await SosIncident.findById(req.params.id).populate('userId', 'name email phone');
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const { responderName, responderEmail } = getResponderIdentity(req, req.body);
    if (!canManageIncident(incident, req, responderEmail)) {
      return res.status(403).json({ success: false, message: 'Not allowed to update this incident' });
    }

    if (nextStatus === 'acknowledged' && !incidentHasResponder(incident, responderEmail)) {
      incident.acknowledgedBy.push({
        responderName,
        responderEmail,
        timestamp: new Date(),
      });
    }

    incident.status = nextStatus;
    if (nextStatus === 'resolved' || nextStatus === 'cancelled') {
      incident.resolvedAt = new Date();
    }

    incident.history.push({
      event: 'status-updated',
      data: {
        status: nextStatus,
        responderName,
        responderEmail,
      },
    });
    await incident.save();

    return res.json({
      success: true,
      data: {
        _id: incident._id,
        status: incident.status,
        resolvedAt: incident.resolvedAt,
      },
    });
  } catch (error) {
    logger.error('Failed to update SOS incident status', error);
    return res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// POST /api/sos/incident/:id/location
router.post('/incident/:id/location', authenticate, async (req, res) => {
  try {
    const incident = await SosIncident.findById(req.params.id).populate('userId', 'name email phone');
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const { responderName, responderEmail } = getResponderIdentity(req, req.body);
    if (!canManageIncident(incident, req, responderEmail)) {
      return res.status(403).json({ success: false, message: 'Not allowed to share location for this incident' });
    }

    const sharedLocation = buildSharedLocation(req.body);
    if (!Number.isFinite(sharedLocation.latitude) || !Number.isFinite(sharedLocation.longitude)) {
      return res.status(400).json({ success: false, message: 'Valid coordinates are required' });
    }

    incident.responderLocations.push({
      responderName,
      responderEmail,
      latitude: sharedLocation.latitude,
      longitude: sharedLocation.longitude,
      accuracy: sharedLocation.accuracy,
      mapsUrl: sharedLocation.mapsUrl,
      createdAt: new Date(),
    });
    incident.history.push({
      event: 'responder-location-shared',
      data: {
        responderName,
        responderEmail,
        mapsUrl: sharedLocation.mapsUrl,
        accuracy: sharedLocation.accuracy,
      },
    });
    await incident.save();

    if (incident.userId?._id) {
      emitToUser(incident.userId._id.toString(), 'sos:responder-location', {
        incidentId: incident._id.toString(),
        responderName,
        responderEmail,
        mapsUrl: sharedLocation.mapsUrl,
        accuracy: sharedLocation.accuracy,
        location: sharedLocation.locationText,
      });
    }

    return res.json({
      success: true,
      data: incident.responderLocations.slice(-1)[0],
    });
  } catch (error) {
    logger.error('Failed to share responder location', error);
    return res.status(500).json({ success: false, message: 'Failed to share location' });
  }
});

// GET /api/sos/response-history
router.get('/response-history', authenticate, async (req, res) => {
  try {
    const responderEmail = String(req.user?.email || '').trim().toLowerCase();
    const filter = {};

    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    if (!isPrivilegedResponder(req.user)) {
      filter['acknowledgedBy.responderEmail'] = responderEmail;
    }

    const incidents = await SosIncident.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'name email phone');

    return res.json({
      success: true,
      data: incidents.map((incident) => buildResponseHistoryItem(incident, responderEmail)),
    });
  } catch (error) {
    logger.error('Failed to fetch SOS response history', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch response history' });
  }
});

// GET /api/sos/dashboard
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    if (!isPrivilegedResponder(req.user)) {
      return res.status(403).json({ success: false, message: 'Admin or responder access required' });
    }

    const { limit = 20 } = req.query;
    const parsedLimit = Number.parseInt(limit, 10) || 20;

    const [
      totalIncidents,
      activeIncidents,
      resolvedIncidents,
      escalatedIncidents,
      recentIncidents,
    ] = await Promise.all([
      SosIncident.countDocuments({}),
      SosIncident.countDocuments({ status: { $in: ['active', 'acknowledged', 'escalated'] } }),
      SosIncident.countDocuments({ status: 'resolved' }),
      SosIncident.countDocuments({ status: 'escalated' }),
      SosIncident.find({})
        .sort({ createdAt: -1 })
        .limit(parsedLimit)
        .populate('userId', 'name email phone'),
    ]);

    const failedDeliveries = recentIncidents.reduce(
      (total, incident) =>
        total +
        (incident.notificationsSent || []).filter((entry) =>
          ['failed', 'error', 'undelivered'].includes(String(entry?.status || '').toLowerCase())
        ).length,
      0
    );

    return res.json({
      success: true,
      data: {
        summary: {
          totalIncidents,
          activeIncidents,
          resolvedIncidents,
          escalatedIncidents,
          failedDeliveries,
        },
        incidents: recentIncidents.map((incident) => ({
          _id: incident._id,
          userId: incident.userId,
          reason: incident.reason,
          status: incident.status,
          location: formatIncidentLocation(incident),
          mapsUrl: incident.mapsUrl || '',
          createdAt: incident.createdAt,
          resolvedAt: incident.resolvedAt || null,
          escalationLevel: incident.escalationLevel || 0,
          deliveryCount: (incident.notificationsSent || []).length,
        })),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch SOS dashboard summary', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary' });
  }
});

module.exports = router;
