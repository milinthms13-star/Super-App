const axios = require('axios');
const crypto = require('crypto');
const HealthcareVideoConsultation = require('../models/healthcare/HealthcareVideoConsultation');

const VIDEO_PROVIDER = process.env.VIDEO_PROVIDER || 'webrtc'; // 'zoom', 'google_meet', 'webrtc'
const ZOOM_API_KEY = process.env.ZOOM_API_KEY || '';
const ZOOM_API_SECRET = process.env.ZOOM_API_SECRET || '';
const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID || '';
const GOOGLE_MEET_ENABLED = process.env.GOOGLE_MEET_ENABLED === 'true';

/**
 * Generate a unique meeting ID
 */
const generateMeetingId = () => {
  return `HC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

/**
 * Generate a simple meeting password
 */
const generateMeetingPassword = () => {
  return crypto.randomBytes(4).toString('hex');
};

/**
 * Create Zoom meeting
 */
const createZoomMeeting = async ({ topic, startTime, duration, agenda }) => {
  if (!ZOOM_API_KEY || !ZOOM_API_SECRET) {
    throw new Error('Zoom credentials not configured');
  }

  try {
    // Generate Zoom JWT token (simplified - use proper OAuth2 in production)
    const token = generateZoomJWT();

    const response = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      {
        topic,
        type: 2, // Scheduled meeting
        start_time: startTime,
        duration,
        timezone: 'Asia/Kolkata',
        agenda,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          waiting_room: true,
          audio: 'both',
          auto_recording: 'none',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      meetingId: response.data.id.toString(),
      meetingUrl: response.data.join_url,
      meetingPassword: response.data.password || '',
      hostKey: response.data.host_key || '',
    };
  } catch (error) {
    console.error('[VideoConsultationService] Zoom meeting creation error:', error);
    throw new Error('Failed to create Zoom meeting');
  }
};

/**
 * Generate Zoom JWT token (simplified version)
 */
const generateZoomJWT = () => {
  // This is a simplified version. In production, use proper OAuth2 flow
  const iat = Math.round(Date.now() / 1000);
  const exp = iat + 60 * 60; // 1 hour

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(
    JSON.stringify({
      iss: ZOOM_API_KEY,
      exp: exp,
    })
  ).toString('base64');

  const signature = crypto
    .createHmac('sha256', ZOOM_API_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64');

  return `${header}.${payload}.${signature}`;
};

/**
 * Create WebRTC meeting (simple room-based approach)
 */
const createWebRTCMeeting = async ({ topic, startTime }) => {
  const meetingId = generateMeetingId();
  const meetingPassword = generateMeetingPassword();

  // In production, this would create a room in your WebRTC signaling server
  const meetingUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/healthcare/video-call/${meetingId}`;

  return {
    meetingId,
    meetingUrl,
    meetingPassword,
    hostKey: crypto.randomBytes(8).toString('hex'),
    participantKey: crypto.randomBytes(8).toString('hex'),
  };
};

/**
 * Create Google Meet meeting (requires Google Calendar API)
 */
const createGoogleMeetMeeting = async ({ topic, startTime, duration }) => {
  if (!GOOGLE_MEET_ENABLED) {
    throw new Error('Google Meet integration not enabled');
  }

  // This is a placeholder. Actual implementation requires Google Calendar API
  const meetingId = generateMeetingId();
  const meetingUrl = `https://meet.google.com/${meetingId.toLowerCase()}`;

  return {
    meetingId,
    meetingUrl,
    meetingPassword: '',
    hostKey: '',
  };
};

/**
 * Create video consultation
 */
const createVideoConsultation = async ({
  appointmentId,
  userId,
  doctorId,
  scheduledStartTime,
  durationMinutes = 30,
  topic = 'Healthcare Consultation',
}) => {
  try {
    const scheduledEndTime = new Date(new Date(scheduledStartTime).getTime() + durationMinutes * 60 * 1000);

    let meetingDetails;

    switch (VIDEO_PROVIDER) {
      case 'zoom':
        meetingDetails = await createZoomMeeting({
          topic,
          startTime: new Date(scheduledStartTime).toISOString(),
          duration: durationMinutes,
          agenda: 'Healthcare video consultation',
        });
        break;

      case 'google_meet':
        meetingDetails = await createGoogleMeetMeeting({
          topic,
          startTime: scheduledStartTime,
          duration: durationMinutes,
        });
        break;

      case 'webrtc':
      default:
        meetingDetails = await createWebRTCMeeting({
          topic,
          startTime: scheduledStartTime,
        });
        break;
    }

    const videoConsultation = await HealthcareVideoConsultation.create({
      appointmentId,
      userId,
      doctorId,
      meetingProvider: VIDEO_PROVIDER,
      meetingId: meetingDetails.meetingId,
      meetingUrl: meetingDetails.meetingUrl,
      meetingPassword: meetingDetails.meetingPassword,
      hostKey: meetingDetails.hostKey,
      participantKey: meetingDetails.participantKey || '',
      scheduledStartTime,
      scheduledEndTime,
      status: 'scheduled',
    });

    return {
      success: true,
      videoConsultation: videoConsultation.toObject(),
    };
  } catch (error) {
    console.error('[VideoConsultationService] Creation error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Start video consultation
 */
const startVideoConsultation = async (consultationId) => {
  try {
    const consultation = await HealthcareVideoConsultation.findById(consultationId);

    if (!consultation) {
      throw new Error('Video consultation not found');
    }

    consultation.status = 'in_progress';
    consultation.actualStartTime = new Date();
    await consultation.save();

    return {
      success: true,
      consultation: consultation.toObject(),
    };
  } catch (error) {
    console.error('[VideoConsultationService] Start error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * End video consultation
 */
const endVideoConsultation = async (consultationId) => {
  try {
    const consultation = await HealthcareVideoConsultation.findById(consultationId);

    if (!consultation) {
      throw new Error('Video consultation not found');
    }

    const actualEndTime = new Date();
    consultation.status = 'completed';
    consultation.actualEndTime = actualEndTime;

    if (consultation.actualStartTime) {
      const durationMs = actualEndTime - consultation.actualStartTime;
      consultation.durationMinutes = Math.round(durationMs / (60 * 1000));
    }

    await consultation.save();

    return {
      success: true,
      consultation: consultation.toObject(),
    };
  } catch (error) {
    console.error('[VideoConsultationService] End error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get video consultation by appointment ID
 */
const getVideoConsultationByAppointment = async (appointmentId) => {
  try {
    const consultation = await HealthcareVideoConsultation.findOne({ appointmentId }).lean();

    return consultation;
  } catch (error) {
    console.error('[VideoConsultationService] Get error:', error);
    return null;
  }
};

/**
 * Cancel video consultation
 */
const cancelVideoConsultation = async (consultationId, reason) => {
  try {
    const consultation = await HealthcareVideoConsultation.findById(consultationId);

    if (!consultation) {
      throw new Error('Video consultation not found');
    }

    consultation.status = 'cancelled';
    consultation.cancellationReason = reason || 'Cancelled by user';
    await consultation.save();

    return {
      success: true,
      consultation: consultation.toObject(),
    };
  } catch (error) {
    console.error('[VideoConsultationService] Cancel error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  createVideoConsultation,
  startVideoConsultation,
  endVideoConsultation,
  getVideoConsultationByAppointment,
  cancelVideoConsultation,
  generateMeetingId,
};
