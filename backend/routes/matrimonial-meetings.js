const express = require('express');
const router = express.Router();
const MeetingSchedule = require('../models/MeetingSchedule');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const FamilyMember = require('../models/FamilyMember');
const { authenticate } = require('../middleware/auth');

// Create new meeting
router.post('/create', authenticate, async (req, res) => {
  try {
    const {
      profile1,
      profile2,
      meetingType,
      title,
      description,
      proposedDates,
      meetingLocation,
      attendees
    } = req.body;

    // Verify user has access to profile1
    const profile = await MatrimonialProfile.findOne({
      _id: profile1,
      userId: req.user._id
    });

    if (!profile) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const meeting = new MeetingSchedule({
      profile1,
      profile2,
      organizer: {
        profileId: profile1
      },
      meetingType,
      title,
      description,
      proposedDates: proposedDates || [],
      meetingLocation,
      attendees: attendees || [],
      status: 'proposed',
      metadata: {
        createdVia: req.body.createdVia || 'web',
        timezone: req.body.timezone || 'Asia/Kolkata'
      }
    });

    await meeting.save();

    // TODO: Send notifications to all attendees
    
    res.json({
      message: 'Meeting created successfully',
      meeting
    });
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// Get meetings for a profile
router.get('/profile/:profileId', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { status, upcoming } = req.query;

    // Verify access
    const profile = await MatrimonialProfile.findOne({
      _id: profileId,
      userId: req.user._id
    });

    if (!profile) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = {
      $or: [
        { profile1: profileId },
        { profile2: profileId }
      ]
    };

    if (status) {
      query.status = status;
    }

    const meetings = await MeetingSchedule.find(query)
      .populate('profile1', 'name age city profession')
      .populate('profile2', 'name age city profession')
      .sort({ finalDate: -1, createdAt: -1 });

    // Filter upcoming if requested
    let filteredMeetings = meetings;
    if (upcoming === 'true') {
      filteredMeetings = meetings.filter(m => m.isUpcoming());
    }

    res.json({ meetings: filteredMeetings });
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// Get single meeting details
router.get('/:meetingId', authenticate, async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await MeetingSchedule.findById(meetingId)
      .populate('profile1', 'name age city profession photo')
      .populate('profile2', 'name age city profession photo')
      .populate('attendees.profileId', 'name')
      .populate('attendees.familyMemberId', 'name relationship');

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Verify user has access
    const hasAccess = await MatrimonialProfile.findOne({
      _id: { $in: [meeting.profile1._id, meeting.profile2._id] },
      userId: req.user._id
    });

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ meeting });
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({ error: 'Failed to fetch meeting' });
  }
});

// Vote on proposed date
router.post('/:meetingId/vote-date', authenticate, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { dateIndex, vote, profileId } = req.body;

    const meeting = await MeetingSchedule.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Verify access
    const hasAccess = await MatrimonialProfile.findOne({
      _id: { $in: [meeting.profile1, meeting.profile2] },
      userId: req.user._id
    });

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!meeting.proposedDates[dateIndex]) {
      return res.status(400).json({ error: 'Invalid date index' });
    }

    // Add or update vote
    const proposedDate = meeting.proposedDates[dateIndex];
    const existingVote = proposedDate.votes.find(v => 
      v.profileId.toString() === profileId
    );

    if (existingVote) {
      existingVote.vote = vote;
    } else {
      proposedDate.votes.push({ profileId, vote });
    }

    await meeting.save();

    res.json({
      message: 'Vote recorded',
      proposedDate
    });
  } catch (error) {
    console.error('Error voting on date:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// Finalize meeting date
router.post('/:meetingId/finalize', authenticate, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { finalDate, finalTime } = req.body;

    const meeting = await MeetingSchedule.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Verify organizer
    const isOrganizer = await MatrimonialProfile.findOne({
      _id: meeting.organizer.profileId,
      userId: req.user._id
    });

    if (!isOrganizer) {
      return res.status(403).json({ error: 'Only organizer can finalize' });
    }

    meeting.finalDate = finalDate;
    meeting.finalTime = finalTime;
    meeting.status = 'scheduled';
    await meeting.save();

    // TODO: Send confirmation notifications
    
    res.json({
      message: 'Meeting finalized',
      meeting
    });
  } catch (error) {
    console.error('Error finalizing meeting:', error);
    res.status(500).json({ error: 'Failed to finalize meeting' });
  }
});

// Update attendee response
router.post('/:meetingId/attendee-response', authenticate, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { attendeeId, status } = req.body;

    const meeting = await MeetingSchedule.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const attendee = meeting.attendees.id(attendeeId);
    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found' });
    }

    attendee.status = status;
    attendee.responseAt = new Date();
    await meeting.save();

    res.json({
      message: 'Response updated',
      attendee
    });
  } catch (error) {
    console.error('Error updating response:', error);
    res.status(500).json({ error: 'Failed to update response' });
  }
});

// Submit meeting feedback
router.post('/:meetingId/feedback', authenticate, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { profileId, rating, experience, interested, comments, suggestNextStep } = req.body;

    const meeting = await MeetingSchedule.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Verify user owns the profile
    const profile = await MatrimonialProfile.findOne({
      _id: profileId,
      userId: req.user._id
    });

    if (!profile) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if feedback already exists
    const existingFeedback = meeting.feedback.find(f => 
      f.profileId.toString() === profileId
    );

    if (existingFeedback) {
      existingFeedback.rating = rating;
      existingFeedback.experience = experience;
      existingFeedback.interested = interested;
      existingFeedback.comments = comments;
      existingFeedback.suggestNextStep = suggestNextStep;
      existingFeedback.submittedAt = new Date();
    } else {
      meeting.feedback.push({
        profileId,
        rating,
        experience,
        interested,
        comments,
        suggestNextStep,
        submittedAt: new Date()
      });
    }

    // Update meeting status if completed
    if (meeting.status === 'in_progress') {
      meeting.status = 'completed';
    }

    await meeting.save();

    res.json({
      message: 'Feedback submitted',
      feedback: meeting.feedback
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Cancel meeting
router.post('/:meetingId/cancel', authenticate, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { reason, profileId } = req.body;

    const meeting = await MeetingSchedule.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Verify user has access
    const profile = await MatrimonialProfile.findOne({
      _id: profileId,
      userId: req.user._id
    });

    if (!profile) {
      return res.status(403).json({ error: 'Access denied' });
    }

    meeting.status = 'cancelled';
    meeting.cancellation = {
      cancelledBy: profileId,
      reason,
      cancelledAt: new Date()
    };

    await meeting.save();

    // TODO: Send cancellation notifications

    res.json({
      message: 'Meeting cancelled',
      meeting
    });
  } catch (error) {
    console.error('Error cancelling meeting:', error);
    res.status(500).json({ error: 'Failed to cancel meeting' });
  }
});

// Get meeting summary (upcoming meetings count, pending feedback, etc.)
router.get('/profile/:profileId/summary', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;

    // Verify access
    const profile = await MatrimonialProfile.findOne({
      _id: profileId,
      userId: req.user._id
    });

    if (!profile) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const meetings = await MeetingSchedule.find({
      $or: [{ profile1: profileId }, { profile2: profileId }]
    });

    const summary = {
      total: meetings.length,
      upcoming: meetings.filter(m => m.isUpcoming()).length,
      pending: meetings.filter(m => m.status === 'proposed').length,
      completed: meetings.filter(m => m.status === 'completed').length,
      pendingFeedback: meetings.filter(m => 
        m.status === 'completed' && 
        !m.feedback.find(f => f.profileId.toString() === profileId)
      ).length,
      upcomingMeetings: meetings
        .filter(m => m.isUpcoming())
        .map(m => m.getSummary())
        .slice(0, 5)
    };

    res.json({ summary });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

module.exports = router;
