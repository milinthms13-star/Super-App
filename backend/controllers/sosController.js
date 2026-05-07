const crypto = require('crypto');
const User = require('../models/User');
const SOSContact = require('../models/SOSContact');
const SOSIncident = require('../models/SOSIncident');
const TrackingLink = require('../models/TrackingLink');
const AudioRecording = require('../models/AudioRecording');
const SpamReport = require('../models/SpamReport');
const logger = require('../utils/logger');
const { sendSMS } = require('../services/smsService');
const { uploadPhotoToS3 } = require('../services/s3Service');
const { saveAudioFile, validateAudio } = require('../services/audioProcessingService');
const { detectSpam } = require('../services/spamDetectionService');

/**
 * ENDPOINT 1: Send OTP to contact phone number
 * POST /sos/send-contact-otp
 * Body: { contactId?, phone, name }
 */
exports.sendContactOTP = async (req, res) => {
  try {
    const { phone, name, contactId } = req.body;
    const userId = req.user.id;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    let contact;

    if (contactId) {
      // Update existing contact
      contact = await SOSContact.findByIdAndUpdate(
        contactId,
        {
          phone,
          name,
          otp,
          otpExpiry,
          otpAttempts: 0,
          verified: false,
        },
        { new: true }
      );
    } else {
      // Create new contact
      contact = await SOSContact.create({
        userId,
        phone,
        name,
        otp,
        otpExpiry,
        otpAttempts: 0,
        verified: false,
        priority: 'Secondary', // Default priority
      });
    }

    if (!contact) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create/update contact',
      });
    }

    // Send OTP via SMS
    const smsResult = await sendSMS(phone, `Your NilaHub SOS verification code is: ${otp}. Valid for 5 minutes.`);

    if (!smsResult.success) {
      logger.error(`SMS send failed for ${phone}: ${smsResult.error}`);
      return res.status(503).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
        error: 'SMS_SERVICE_UNAVAILABLE',
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      contactId: contact._id,
      expiresIn: 300, // seconds
    });
  } catch (error) {
    logger.error('sendContactOTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending OTP',
      error: error.message,
    });
  }
};

/**
 * ENDPOINT 2: Verify OTP code
 * POST /sos/verify-contact-otp
 * Body: { contactId, otp }
 */
exports.verifyContactOTP = async (req, res) => {
  try {
    const { contactId, otp } = req.body;
    const userId = req.user.id;

    // Find contact
    const contact = await SOSContact.findOne({
      _id: contactId,
      userId,
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    // Check OTP expiry
    if (new Date() > contact.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired. Please request a new one.',
        code: 'OTP_EXPIRED',
      });
    }

    // Check max attempts
    if (contact.otpAttempts >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Request a new OTP.',
        code: 'OTP_MAX_ATTEMPTS',
      });
    }

    // Verify OTP
    if (contact.otp !== otp) {
      contact.otpAttempts += 1;
      await contact.save();

      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
        attemptsLeft: 3 - contact.otpAttempts,
      });
    }

    // OTP verified! Mark contact as verified
    contact.verified = true;
    contact.otp = null;
    contact.otpExpiry = null;
    contact.otpAttempts = 0;
    contact.verifiedAt = new Date();
    await contact.save();

    res.status(200).json({
      success: true,
      message: 'Contact verified successfully',
      verified: true,
      contact: {
        id: contact._id,
        name: contact.name,
        phone: contact.phone,
        priority: contact.priority,
      },
    });
  } catch (error) {
    logger.error('verifyContactOTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP',
      error: error.message,
    });
  }
};

/**
 * ENDPOINT 3: Create tracking link
 * POST /sos/create-tracking-link
 * Body: { incidentId }
 */
exports.createTrackingLink = async (req, res) => {
  try {
    const { incidentId } = req.body;
    const userId = req.user.id;

    // Verify incident belongs to user
    const incident = await SOSIncident.findOne({
      _id: incidentId,
      userId,
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found',
      });
    }

    // Generate secure token (32 characters)
    const token = crypto.randomBytes(16).toString('hex');

    // Create tracking link (24-hour expiry)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const trackingLink = await TrackingLink.create({
      token,
      incidentId,
      userId,
      expiresAt,
      active: true,
    });

    const publicURL = `${process.env.FRONTEND_URL || 'https://app.nilahub.com'}/sos/tracking/${token}`;

    res.status(201).json({
      success: true,
      message: 'Tracking link created',
      trackingLink: {
        token,
        url: publicURL,
        expiresIn: 86400, // seconds (24 hours)
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error('createTrackingLink error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating tracking link',
      error: error.message,
    });
  }
};

/**
 * ENDPOINT 4: Get tracking location (public endpoint)
 * GET /sos/tracking/:token
 * No authentication needed - token is the authorization
 */
exports.getTrackingLocation = async (req, res) => {
  try {
    const { token } = req.params;

    // Find tracking link
    const trackingLink = await TrackingLink.findOne({
      token,
      active: true,
    });

    if (!trackingLink) {
      return res.status(404).json({
        success: false,
        message: 'Tracking link not found or invalid',
        code: 'INVALID_TOKEN',
      });
    }

    // Check expiry
    if (new Date() > trackingLink.expiresAt) {
      trackingLink.active = false;
      await trackingLink.save();

      return res.status(410).json({
        success: false,
        message: 'Tracking link expired',
        code: 'LINK_EXPIRED',
      });
    }

    // Get latest incident data
    const incident = await SOSIncident.findById(trackingLink.incidentId);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found',
      });
    }

    // Log tracking access (for analytics)
    trackingLink.lastAccessedAt = new Date();
    trackingLink.accessCount = (trackingLink.accessCount || 0) + 1;
    await trackingLink.save();

    res.status(200).json({
      success: true,
      data: {
        incidentId: incident._id,
        location: {
          latitude: incident.latitude,
          longitude: incident.longitude,
          accuracy: incident.accuracy,
          updatedAt: incident.updatedAt,
        },
        status: incident.status,
        reason: incident.reason,
        timestamp: incident.createdAt,
        expiresAt: trackingLink.expiresAt,
        isActive: incident.status === 'active',
      },
    });
  } catch (error) {
    logger.error('getTrackingLocation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching location',
      error: error.message,
    });
  }
};

/**
 * ENDPOINT 5: Send SOS Alert (Enhanced with photos)
 * POST /sos/send-alert
 * Body: { reason, longitude, latitude, accuracy, photos[], channels[] }
 */
exports.sendSOSAlert = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reason, longitude, latitude, accuracy, photos = [], channels = [] } = req.body;

    // Validate user has verified contacts
    const verifiedContacts = await SOSContact.find({
      userId,
      verified: true,
    });

    if (verifiedContacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No verified emergency contacts',
        code: 'NO_VERIFIED_CONTACTS',
      });
    }

    // Upload photos to S3 (if provided)
    let photoURLs = [];
    if (photos && photos.length > 0) {
      for (const photo of photos) {
        try {
          // photo should be base64 string
          const buffer = Buffer.from(photo.data, 'base64');
          const filename = `sos-${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
          const url = await uploadPhotoToS3(buffer, filename, 'sos-photos');
          photoURLs.push({
            url,
            timestamp: photo.timestamp,
          });
        } catch (photoError) {
          logger.warn(`Photo upload failed: ${photoError.message}`);
          // Continue without this photo, don't block alert
        }
      }
    }

    // Create incident record
    const incident = await SOSIncident.create({
      userId,
      reason,
      latitude,
      longitude,
      accuracy,
      photos: photoURLs,
      status: 'active',
      channels,
      retryLog: [
        {
          timestamp: new Date(),
          action: 'INITIAL_ALERT',
          status: 'sent',
        },
      ],
    });

    if (!incident) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create incident',
      });
    }

    // Send alerts to verified contacts via specified channels
    const alerts = [];
    for (const contact of verifiedContacts) {
      for (const channel of channels) {
        try {
          if (channel === 'SMS' || channel === 'WhatsApp') {
            // Create tracking link first
            const token = crypto.randomBytes(16).toString('hex');
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

            await TrackingLink.create({
              token,
              incidentId: incident._id,
              userId,
              expiresAt,
              active: true,
            });

            const trackingURL = `${process.env.FRONTEND_URL || 'https://app.nilahub.com'}/sos/tracking/${token}`;

            const message = `🚨 EMERGENCY ALERT: ${reason}\n\n📍 Location: ${latitude}, ${longitude}\nℹ️ Accuracy: ${accuracy}m\n\n🔗 Track live: ${trackingURL}\n\n(Valid for 24 hours)`;

            await sendSMS(contact.phone, message);

            alerts.push({
              contactId: contact._id,
              phone: contact.phone,
              channel,
              status: 'sent',
              timestamp: new Date(),
            });
          } else if (channel === 'Call') {
            // TODO: Implement voice call integration (Twilio voice)
            alerts.push({
              contactId: contact._id,
              phone: contact.phone,
              channel,
              status: 'pending',
              timestamp: new Date(),
            });
          }
        } catch (alertError) {
          logger.error(`Alert send failed for ${contact.phone}: ${alertError.message}`);
          alerts.push({
            contactId: contact._id,
            phone: contact.phone,
            channel,
            status: 'failed',
            error: alertError.message,
            timestamp: new Date(),
          });

          // Add to retry queue
          incident.retryLog.push({
            timestamp: new Date(),
            action: `ALERT_${channel}`,
            status: 'failed',
            error: alertError.message,
            nextRetry: new Date(Date.now() + 30000), // retry in 30 seconds
          });
        }
      }
    }

    // Update incident with alert info
    incident.alerts = alerts;
    await incident.save();

    res.status(201).json({
      success: true,
      message: 'SOS alert sent to contacts',
      incidentId: incident._id,
      contactsNotified: verifiedContacts.length,
      channelsUsed: channels,
      photosAttached: photoURLs.length,
      details: {
        reason,
        location: { latitude, longitude, accuracy },
        timestamp: incident.createdAt,
        status: incident.status,
      },
    });
  } catch (error) {
    logger.error('sendSOSAlert error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending SOS alert',
      error: error.message,
    });
  }
};

/**
 * Get OTP verification status for a contact
 */
exports.getOTPStatus = async (req, res) => {
  try {
    const { contactId } = req.params;
    const userId = req.user.id;

    const contact = await SOSContact.findOne({
      _id: contactId,
      userId,
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        contactId: contact._id,
        verified: contact.verified,
        verifiedAt: contact.verifiedAt,
        phone: contact.phone.replace(/(?<=.{2})./g, '*'), // mask phone
        priority: contact.priority,
      },
    });
  } catch (error) {
    logger.error('getOTPStatus error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching OTP status',
      error: error.message,
    });
  }
};

/**
 * Get incident details
 */
exports.getIncidentDetails = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const userId = req.user.id;

    const incident = await SOSIncident.findOne({
      _id: incidentId,
      userId,
    }).populate('userId', 'name phone email');

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found',
      });
    }

    res.status(200).json({
      success: true,
      data: incident,
    });
  } catch (error) {
    logger.error('getIncidentDetails error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching incident details',
      error: error.message,
    });
  }
};

/**
 * Get all incidents for user
 */
exports.getUserIncidents = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit = 50, page = 1 } = req.query;

    let query = { userId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const incidents = await SOSIncident.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('reason latitude longitude accuracy status createdAt updatedAt');

    const total = await SOSIncident.countDocuments(query);

    res.status(200).json({
      success: true,
      data: incidents,
      pagination: {
        total,
        limit: parseInt(limit),
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('getUserIncidents error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching incidents',
      error: error.message,
    });
  }
};

/**
 * Update incident status
 */
exports.updateIncidentStatus = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    const validStatuses = ['active', 'resolved', 'escalated'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const incident = await SOSIncident.findOneAndUpdate(
      { _id: incidentId, userId },
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found',
      });
    }

    res.status(200).json({
      success: true,
      message: `Incident marked as ${status}`,
      data: incident,
    });
  } catch (error) {
    logger.error('updateIncidentStatus error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating incident status',
      error: error.message,
    });
  }
};

/**
 * AUDIO FEATURE: Upload audio recording to incident
 * POST /api/sos/upload-audio/:incidentId
 * Body: { audio: base64, duration: number, mimeType: string }
 */
exports.uploadAudio = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { audio, duration, mimeType = 'audio/webm' } = req.body;
    const userId = req.user.id;

    // Validate incident ownership
    const incident = await SOSIncident.findOne({
      _id: incidentId,
      userId,
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found',
      });
    }

    // Validate audio data
    const validation = validateAudio(audio);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid audio data',
        errors: validation.errors,
      });
    }

    // Save audio file
    const audioFile = await saveAudioFile(audio, mimeType);

    // Create audio recording entry
    const audioRecording = await AudioRecording.create({
      incidentId,
      userId,
      filename: audioFile.filename,
      filesize: audioFile.size,
      duration: duration || 0,
      mimeType: audioFile.mimeType,
      publicPath: audioFile.publicPath,
    });

    logger.info(`Audio uploaded for incident ${incidentId}: ${audioFile.filename}`);

    res.status(201).json({
      success: true,
      message: 'Audio uploaded successfully',
      data: {
        audioId: audioRecording._id,
        filename: audioFile.filename,
        size: audioFile.size,
        duration,
        publicPath: audioFile.publicPath,
      },
    });
  } catch (error) {
    logger.error('uploadAudio error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading audio',
      error: error.message,
    });
  }
};

/**
 * AUDIO FEATURE: Get audio recordings for incident
 * GET /api/sos/audio/:incidentId
 */
exports.getIncidentAudio = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const userId = req.user.id;

    // Verify incident ownership
    const incident = await SOSIncident.findOne({
      _id: incidentId,
      userId,
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found',
      });
    }

    // Get audio recordings
    const recordings = await AudioRecording.find({
      incidentId,
    }).select('filename filesize duration mimeType publicPath storedAt');

    res.status(200).json({
      success: true,
      data: recordings,
      count: recordings.length,
    });
  } catch (error) {
    logger.error('getIncidentAudio error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audio recordings',
      error: error.message,
    });
  }
};

/**
 * SPAM DETECTION FEATURE: Analyze incident for spam/false alarm
 * POST /api/sos/check-spam/:incidentId
 */
exports.checkSpam = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const userId = req.user.id;

    // Find incident
    const incident = await SOSIncident.findOne({
      _id: incidentId,
      userId,
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found',
      });
    }

    // Get user's incident history
    const userIncidents = await SOSIncident.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('latitude longitude status createdAt');

    // Calculate false alarm rate
    const resolved = userIncidents.filter(i => i.status === 'resolved').length;
    const falseAlarmRate = userIncidents.length > 0 ? resolved / userIncidents.length : 0;

    // Prepare history for spam detector
    const userHistory = {
      recentAlerts: userIncidents,
      totalAlerts: userIncidents.length,
      falseAlarmRate,
      resolutionTime: [],
    };

    // Run spam detection
    const spamResult = detectSpam(incident.toObject(), userHistory);

    // Create/update spam report
    const spamReport = await SpamReport.findOneAndUpdate(
      { incidentId },
      {
        userId,
        'automatedDetection.score': spamResult.score,
        'automatedDetection.level': spamResult.level,
        'automatedDetection.reasons': spamResult.reasons,
        'automatedDetection.breakdown': spamResult.breakdown,
        'automatedDetection.detectedAt': new Date(),
      },
      { upsert: true, new: true }
    );

    logger.info(
      `Spam check for incident ${incidentId}: ` +
      `level=${spamResult.level}, score=${spamResult.score}`
    );

    res.status(200).json({
      success: true,
      data: {
        incidentId,
        spamScore: spamResult.score,
        spamLevel: spamResult.level,
        reasons: spamResult.reasons,
        breakdown: spamResult.breakdown,
        reportId: spamReport._id,
      },
    });
  } catch (error) {
    logger.error('checkSpam error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking spam',
      error: error.message,
    });
  }
};

/**
 * SPAM DETECTION FEATURE: Get spam report for incident
 * GET /api/sos/spam-report/:incidentId
 */
exports.getSpamReport = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const userId = req.user.id;

    // Verify incident ownership
    const incident = await SOSIncident.findOne({
      _id: incidentId,
      userId,
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found',
      });
    }

    // Get spam report
    const report = await SpamReport.findOne({ incidentId });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'No spam report found for this incident',
      });
    }

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('getSpamReport error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching spam report',
      error: error.message,
    });
  }
};
