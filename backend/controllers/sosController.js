const crypto = require('crypto');
const User = require('../models/User');
const SOSContact = require('../models/SosContact');
const SOSIncident = require('../models/SosIncident');
const TrackingLink = require('../models/TrackingLink');
const AudioRecording = require('../models/AudioRecording');
const SpamReport = require('../models/SpamReport');
const VideoRecording = require('../models/VideoRecording');
const ContactGroup = require('../models/ContactGroup');
const logger = require('../utils/logger');
const { sendSMS } = require('../services/smsService');
const { uploadPhotoToS3 } = require('../services/s3Service');
const { saveAudioFile, validateAudio } = require('../services/audioProcessingService');
const { detectSpam } = require('../services/spamDetectionService');
const VideoTranscodingService = require('../services/videoTranscodingService');
const ContactGroupService = require('../services/contactGroupService');

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

/**
 * =============================================================================
 * PRIORITY 2 FEATURES: Video Recording & Contact Groups
 * =============================================================================
 */

/**
 * ENDPOINT 9: Upload and transcode video
 * POST /sos/upload-video/:incidentId
 * Body: { video (base64), quality }
 * Purpose: Save emergency video, queue transcoding to MP4
 */
exports.uploadVideo = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { video: base64Video, quality = 'medium' } = req.body;
    const userId = req.user.id;

    // Validate incident belongs to user
    const incident = await SOSIncident.findOne({
      _id: incidentId,
      userId,
    });

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Validate video data
    const buffer = Buffer.from(base64Video, 'base64');
    const validation = VideoTranscodingService.validateVideoQuality(buffer, 'video/webm');

    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid video',
        details: validation.errors,
      });
    }

    logger.info(`Starting video upload for incident ${incidentId}`);

    // Save and transcode video with progress callback
    const videoMetadata = await VideoTranscodingService.saveAndTranscodeVideo(
      base64Video,
      'video/webm',
      (progress) => {
        logger.debug(`Video transcoding progress: ${progress.percent}%`);
      }
    );

    // Create VideoRecording document
    const videoRecord = await VideoRecording.create({
      incidentId,
      userId,
      filename: videoMetadata.filename,
      filepath: videoMetadata.filepath,
      publicPath: videoMetadata.publicPath,
      filesize: videoMetadata.filesize,
      mimeType: videoMetadata.mimeType,
      codec: videoMetadata.codec,
      quality,
      transcodingStatus: 'completed',
      duration: videoMetadata.duration || 0,
      metadata: {
        originalMimeType: 'video/webm',
        transcodedAt: new Date(),
        preset: videoMetadata.metadata?.preset || 'fast',
      },
    });

    logger.info(`Video saved: ${videoMetadata.filename} for incident ${incidentId}`);

    res.status(201).json({
      success: true,
      video: {
        id: videoRecord._id,
        filename: videoRecord.filename,
        publicPath: videoRecord.publicPath,
        filesize: videoRecord.fileSizeFormatted,
        duration: videoRecord.durationFormatted,
        quality: videoRecord.quality,
        transcodingStatus: videoRecord.transcodingStatus,
        uploadedAt: videoRecord.storedAt,
      },
    });
  } catch (error) {
    logger.error('Video upload failed:', error);
    res.status(500).json({ error: 'Video upload failed', details: error.message });
  }
};

/**
 * ENDPOINT 10: Get incident videos
 * GET /sos/video/:incidentId
 * Purpose: Retrieve all videos for an incident
 */
exports.getIncidentVideos = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const userId = req.user.id;

    // Validate incident
    const incident = await SOSIncident.findOne({
      _id: incidentId,
      userId,
    });

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Get all videos for incident
    const videos = await VideoRecording.find({
      incidentId,
      userId,
      deletedAt: null,
    }).sort({ storedAt: -1 });

    res.json({
      success: true,
      incidentId,
      videoCount: videos.length,
      videos: videos.map((v) => ({
        id: v._id,
        filename: v.filename,
        publicPath: v.publicPath,
        filesize: v.fileSizeFormatted,
        duration: v.durationFormatted,
        quality: v.quality,
        uploadedAt: v.storedAt,
        expiresAt: v.expiresAt,
      })),
    });
  } catch (error) {
    logger.error('Get videos failed:', error);
    res.status(500).json({ error: 'Failed to retrieve videos' });
  }
};

/**
 * ENDPOINT 11: Get video transcoding status
 * GET /sos/video/:videoId/status
 * Purpose: Check transcoding progress
 */
exports.checkVideoStatus = async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user.id;

    const video = await VideoRecording.findOne({
      _id: videoId,
      userId,
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({
      success: true,
      videoId,
      status: video.transcodingStatus,
      progress: video.transcodingProgress,
      duration: video.durationFormatted,
      filesize: video.fileSizeFormatted,
      error: video.transcodingError,
    });
  } catch (error) {
    logger.error('Status check failed:', error);
    res.status(500).json({ error: 'Failed to check video status' });
  }
};

/**
 * ENDPOINT 12: Create contact group
 * POST /sos/contact-groups
 * Body: { name, description, contacts[], priority }
 * Purpose: Save reusable groups of emergency contacts
 */
exports.createContactGroup = async (req, res) => {
  try {
    const { name, description, contacts, priority = 'high' } = req.body;
    const userId = req.user.id;

    if (!name || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        error: 'Group name and at least one contact are required',
      });
    }

    const group = await ContactGroupService.createGroup(
      userId,
      name,
      description,
      contacts,
      priority
    );

    res.status(201).json({
      success: true,
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
        contactCount: group.contactCount,
        priority: group.priority,
        createdAt: group.createdAt,
      },
    });
  } catch (error) {
    logger.error('Create group failed:', error);
    res.status(500).json({ error: 'Failed to create group', details: error.message });
  }
};

/**
 * ENDPOINT 13: Get all contact groups
 * GET /sos/contact-groups
 * Purpose: List all user's contact groups
 */
exports.getContactGroups = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skip = 0, limit = 50 } = req.query;

    const result = await ContactGroupService.getUserGroups(userId, {
      skip: parseInt(skip),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      groups: result.groups.map((g) => ({
        id: g._id,
        name: g.name,
        description: g.description,
        contactCount: g.contactCount,
        priority: g.priority,
        usageCount: g.usageCount,
        lastUsedAt: g.lastUsedAt,
        isDefault: g.metadata?.isDefault,
      })),
      total: result.total,
      skip: result.skip,
      limit: result.limit,
    });
  } catch (error) {
    logger.error('Get groups failed:', error);
    res.status(500).json({ error: 'Failed to retrieve groups' });
  }
};

/**
 * ENDPOINT 14: Get single contact group with contacts
 * GET /sos/contact-groups/:groupId
 * Purpose: Retrieve full group details with all contacts
 */
exports.getContactGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await ContactGroupService.getGroup(groupId, userId);

    res.json({
      success: true,
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
        contacts: group.contacts,
        priority: group.priority,
        usageCount: group.usageCount,
        isDefault: group.metadata?.isDefault,
        createdAt: group.createdAt,
      },
    });
  } catch (error) {
    logger.error('Get group failed:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      error: error.message,
    });
  }
};

/**
 * ENDPOINT 15: Update contact group
 * PATCH /sos/contact-groups/:groupId
 * Body: { name?, description?, contacts?, priority? }
 * Purpose: Modify group settings
 */
exports.updateContactGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const group = await ContactGroupService.updateGroup(groupId, userId, updates);

    res.json({
      success: true,
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
        contactCount: group.contactCount,
        priority: group.priority,
        updatedAt: group.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Update group failed:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      error: error.message,
    });
  }
};

/**
 * ENDPOINT 16: Delete contact group
 * DELETE /sos/contact-groups/:groupId
 * Purpose: Remove a group
 */
exports.deleteContactGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    await ContactGroupService.deleteGroup(groupId, userId);

    res.json({
      success: true,
      message: 'Group deleted successfully',
    });
  } catch (error) {
    logger.error('Delete group failed:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      error: error.message,
    });
  }
};

/**
 * ENDPOINT 17: Add contact to group
 * POST /sos/contact-groups/:groupId/contacts
 * Body: { contactId }
 * Purpose: Add a contact to an existing group
 */
exports.addContactToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { contactId } = req.body;
    const userId = req.user.id;

    if (!contactId) {
      return res.status(400).json({ error: 'Contact ID required' });
    }

    const group = await ContactGroupService.addContactToGroup(groupId, userId, contactId);

    res.json({
      success: true,
      group: {
        id: group._id,
        name: group.name,
        contactCount: group.contactCount,
      },
    });
  } catch (error) {
    logger.error('Add contact failed:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * ENDPOINT 18: Remove contact from group
 * DELETE /sos/contact-groups/:groupId/contacts/:contactId
 * Purpose: Remove a contact from a group
 */
exports.removeContactFromGroup = async (req, res) => {
  try {
    const { groupId, contactId } = req.params;
    const userId = req.user.id;

    const group = await ContactGroupService.removeContactFromGroup(
      groupId,
      userId,
      contactId
    );

    res.json({
      success: true,
      group: {
        id: group._id,
        name: group.name,
        contactCount: group.contactCount,
      },
    });
  } catch (error) {
    logger.error('Remove contact failed:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * ENDPOINT 19: Get group statistics
 * GET /sos/groups/stats
 * Purpose: Analytics on all user's groups
 */
exports.getGroupStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await ContactGroupService.getGroupStats(userId);

    res.json({
      success: true,
      stats: {
        totalGroups: stats.totalGroups,
        totalContacts: stats.totalContacts,
        averageContactsPerGroup:
          stats.totalGroups > 0 ? (stats.totalContacts / stats.totalGroups).toFixed(1) : 0,
        byPriority: stats.byPriority,
      },
    });
  } catch (error) {
    logger.error('Get stats failed:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
};

/**
 * =============================================================================
 * PRIORITY 3 FEATURES: Real-Time Status Updates & Responder Coordination
 * =============================================================================
 */

/**
 * ENDPOINT 20: Update incident status (Priority 3 - Real-time tracking)
 * PATCH /api/sos/incident/:incidentId/status
 * Body: { status, notes, responderLocation?, responderName?, responderEmail? }
 * Purpose: Responder updates incident status, tracked in statusHistory for real-time updates
 * Auth: JWT token required
 */
exports.updateIncidentStatusPriority3 = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { status, notes, responderLocation, responderName, responderEmail } = req.body;
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    // Validate status value
    const validStatuses = ['initial', 'acknowledged', 'en-route', 'arrived', 'resolved', 'escalated'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Find incident
    const incident = await SOSIncident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found',
      });
    }

    // Record previous status
    const previousStatus = incident.currentStatus || 'initial';

    // Add to status history
    const statusRecord = {
      status,
      timestamp: new Date(),
      updatedBy: responderEmail || userEmail || 'system',
      responderName: responderName || req.user?.name || 'Unknown Responder',
      notes: notes || '',
    };

    // Add responder location if provided
    if (responderLocation) {
      statusRecord.responderLocation = {
        latitude: responderLocation.latitude,
        longitude: responderLocation.longitude,
        accuracy: responderLocation.accuracy,
        mapsUrl: responderLocation.mapsUrl,
      };
    }

    // Update incident
    incident.statusHistory = incident.statusHistory || [];
    incident.statusHistory.push(statusRecord);
    incident.currentStatus = status;
    incident.lastStatusUpdate = new Date();
    incident.lastUpdatedBy = responderEmail || userEmail || 'system';

    await incident.save();

    logger.info(
      `Status updated for incident ${incidentId}: ${previousStatus} → ${status} by ${statusRecord.updatedBy}`
    );

    // Emit WebSocket event for real-time updates (if available)
    const { emitToUser } = require('../config/websocket');
    if (emitToUser) {
      emitToUser(incident.userId?.toString(), 'sos:status:updated', {
        incidentId: incident._id.toString(),
        previousStatus,
        newStatus: status,
        timestamp: statusRecord.timestamp,
        responderName: statusRecord.responderName,
        responderEmail: statusRecord.updatedBy,
        notes,
      });
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: {
        incidentId: incident._id,
        previousStatus,
        newStatus: status,
        statusHistory: incident.statusHistory,
        lastUpdate: {
          timestamp: statusRecord.timestamp,
          updatedBy: statusRecord.updatedBy,
          responderName: statusRecord.responderName,
          notes,
        },
      },
    });
  } catch (error) {
    logger.error('Update status failed:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating incident status',
      error: error.message,
    });
  }
};

/**
 * ENDPOINT 21: Get incident status timeline (Priority 3)
 * GET /api/sos/incident/:incidentId/timeline
 * Query params: { limit=50, offset=0, filterStatus? }
 * Purpose: Retrieve full status history for incident
 * Auth: JWT token required
 */
exports.getIncidentTimeline = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { limit = 50, offset = 0, filterStatus } = req.query;
    const userId = req.user?.id;

    // Find incident
    let incident = await SOSIncident.findById(incidentId);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found',
      });
    }

    // Verify user has access (is caller or responder)
    const hasAccess = incident.userId?.toString() === userId || req.user?.role === 'responder';
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this incident',
      });
    }

    // Get status history
    let timeline = incident.statusHistory || [];

    // Filter by status if specified
    if (filterStatus) {
      timeline = timeline.filter((t) => t.status === filterStatus);
    }

    // Pagination
    const startIndex = parseInt(offset) || 0;
    const endIndex = startIndex + parseInt(limit);
    const paginatedTimeline = timeline.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        incidentId: incident._id,
        timeline: paginatedTimeline,
        pagination: {
          total: timeline.length,
          limit: parseInt(limit),
          offset: startIndex,
          hasMore: endIndex < timeline.length,
        },
        currentStatus: incident.currentStatus || 'initial',
        lastUpdate: incident.lastStatusUpdate,
      },
    });
  } catch (error) {
    logger.error('Get timeline failed:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching timeline',
      error: error.message,
    });
  }
};

/**
 * ENDPOINT 22: Get current incident status snapshot (Priority 3)
 * GET /api/sos/incident/:incidentId/status
 * Purpose: Get latest status and responder info
 * Auth: JWT token required
 */
exports.getIncidentCurrentStatus = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const userId = req.user?.id;

    // Find incident
    const incident = await SOSIncident.findById(incidentId).populate(
      'userId',
      'name email phone'
    );

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found',
      });
    }

    // Verify access
    const hasAccess = incident.userId?._id?.toString() === userId || req.user?.role === 'responder';
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Get latest status record
    const latestStatus = incident.statusHistory?.[incident.statusHistory.length - 1] || {
      status: 'initial',
      timestamp: incident.createdAt,
      updatedBy: 'system',
    };

    // Calculate wait time
    const waitTime = Math.floor((Date.now() - incident.createdAt) / 1000); // seconds

    res.json({
      success: true,
      data: {
        incidentId: incident._id,
        currentStatus: incident.currentStatus || 'initial',
        reason: incident.reason,
        location: {
          latitude: incident.location?.coordinates?.[1],
          longitude: incident.location?.coordinates?.[0],
          mapsUrl: incident.mapsUrl,
        },
        latestUpdate: {
          status: latestStatus.status,
          timestamp: latestStatus.timestamp,
          responderName: latestStatus.responderName,
          responderEmail: latestStatus.updatedBy,
          notes: latestStatus.notes,
        },
        statistics: {
          totalStatusUpdates: incident.statusHistory?.length || 0,
          waitingTime: waitTime, // seconds
          estimatedArrival: latestStatus.responderLocation?.mapsUrl ? null : 'Calculating...',
        },
        caller: {
          name: incident.userId?.name,
          email: incident.userId?.email,
          phone: incident.userId?.phone,
        },
        incidentCreatedAt: incident.createdAt,
      },
    });
  } catch (error) {
    logger.error('Get current status failed:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching incident status',
      error: error.message,
    });
  }
};
