const express = require('express');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const EducationTuitionRequest = require('../models/EducationTuitionRequest');
const {
  validateTuitionRequest,
  validateTuitionStatusUpdate,
  validateTuitionSession,
  validateSessionAttendance,
} = require('../validations/educationValidations');
const { matchTutors } = require('../services/educationService');
const logger = require('../config/logger');

const router = express.Router();

// GET /api/education/tuition/requests - Get user tuition requests
router.get('/requests', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const requests = await EducationTuitionRequest.find({ userEmail })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: { requests } });
  } catch (error) {
    logger.error('Error fetching tuition requests:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tuition requests' });
  }
});

// POST /api/education/tuition - Create tuition request
router.post('/', authenticate, async (req, res) => {
  try {
    const { error, value } = validateTuitionRequest(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { subject, classLevel, contactPhone, preferredMode, preferredTime, details } = value;
    const userEmail = req.user.email;

    const requestId = `tuition-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    const tuitionRequest = new EducationTuitionRequest({
      requestId,
      userEmail,
      subject,
      classLevel,
      contactPhone,
      preferredMode,
      preferredTime,
      details,
      status: 'submitted',
      priority: 'normal',
      timeline: [
        {
          at: new Date(),
          status: 'submitted',
          note: 'Tuition request submitted',
          actor: 'user',
        },
      ],
    });

    await tuitionRequest.save();

    // Try to match tutors
    const tutorMatches = await matchTutors({ subject, classLevel, preferredMode });

    res.json({
      success: true,
      data: {
        tuitionRequest: tuitionRequest.toObject(),
        tutorMatches,
      },
    });
  } catch (error) {
    logger.error('Error creating tuition request:', error);
    res.status(500).json({ success: false, error: 'Failed to create tuition request' });
  }
});

// PATCH /api/education/tuition/:requestId/status - Update tuition status
router.patch('/:requestId/status', authenticate, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { error, value } = validateTuitionStatusUpdate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { status, note } = value;
    const userEmail = req.user.email;

    const tuitionRequest = await EducationTuitionRequest.findOne({ requestId, userEmail });
    if (!tuitionRequest) {
      return res.status(404).json({ success: false, error: 'Tuition request not found' });
    }

    tuitionRequest.status = status;
    tuitionRequest.timeline.push({
      at: new Date(),
      status,
      note: note || `Status changed to ${status}`,
      actor: 'user',
    });

    if (status === 'booked') {
      tuitionRequest.bookedAt = new Date();
    } else if (status === 'completed') {
      tuitionRequest.completedAt = new Date();
    } else if (status === 'trial_scheduled') {
      tuitionRequest.trialSessionAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24h from now
    }

    await tuitionRequest.save();

    res.json({ success: true, data: { tuitionRequest: tuitionRequest.toObject() } });
  } catch (error) {
    logger.error('Error updating tuition status:', error);
    res.status(500).json({ success: false, error: 'Failed to update tuition status' });
  }
});

// POST /api/education/tuition/:requestId/sessions - Create tuition session
router.post('/:requestId/sessions', authenticate, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { error, value } = validateTuitionSession(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { scheduledAt, durationMinutes, agenda } = value;
    const userEmail = req.user.email;

    const tuitionRequest = await EducationTuitionRequest.findOne({ requestId, userEmail });
    if (!tuitionRequest) {
      return res.status(404).json({ success: false, error: 'Tuition request not found' });
    }

    const sessionId = `session-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const session = {
      sessionId,
      scheduledAt: new Date(scheduledAt),
      durationMinutes,
      agenda,
      attendanceStatus: 'pending',
      homework: '',
      mentorNotes: '',
      updatedAt: new Date(),
    };

    tuitionRequest.sessions.push(session);
    await tuitionRequest.save();

    res.json({ success: true, data: { tuitionRequest: tuitionRequest.toObject() } });
  } catch (error) {
    logger.error('Error creating session:', error);
    res.status(500).json({ success: false, error: 'Failed to create session' });
  }
});

// PATCH /api/education/tuition/:requestId/sessions/:sessionId - Update session attendance
router.patch('/:requestId/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    const { requestId, sessionId } = req.params;
    const { error, value } = validateSessionAttendance(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { attendanceStatus } = value;
    const userEmail = req.user.email;

    const tuitionRequest = await EducationTuitionRequest.findOne({ requestId, userEmail });
    if (!tuitionRequest) {
      return res.status(404).json({ success: false, error: 'Tuition request not found' });
    }

    const session = tuitionRequest.sessions.find(s => s.sessionId === sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    session.attendanceStatus = attendanceStatus;
    session.updatedAt = new Date();

    await tuitionRequest.save();

    res.json({ success: true, data: { tuitionRequest: tuitionRequest.toObject() } });
  } catch (error) {
    logger.error('Error updating session attendance:', error);
    res.status(500).json({ success: false, error: 'Failed to update session attendance' });
  }
});

module.exports = router;
