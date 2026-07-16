/**
 * Success Stories Routes
 * Submit, approve, and display success stories
 */

const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const SuccessStory = require('../models/SuccessStory');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const { uploadToS3 } = require('../config/s3');
const logger = require('../utils/logger');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Get published success stories (public)
router.get('/public', async (req, res) => {
  try {
    const { page = 1, limit = 12, featured } = req.query;
    
    const query = { 
      isPublished: true,
      status: 'approved',
    };
    
    if (featured === 'true') {
      query.isFeatured = true;
    }

    const stories = await SuccessStory.find(query)
      .sort({ isFeatured: -1, views: -1, marriageDate: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await SuccessStory.countDocuments(query);

    res.json({
      success: true,
      data: stories,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Get success stories failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch success stories',
    });
  }
});

// Submit success story
router.post('/submit', authenticate, upload.array('photos', 5), async (req, res) => {
  try {
    const {
      groomProfileId,
      brideProfileId,
      groomName,
      brideName,
      title,
      story,
      marriageDate,
      location,
      testimonial,
      howWeMet,
      matchedOn,
      engagementDate,
      consentGiven,
    } = req.body;

    if (!consentGiven || consentGiven !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Consent is required to publish the story',
      });
    }

    // Verify user owns one of the profiles
    const userProfile = await MatrimonialProfile.findOne({ 
      userId: req.user._id,
      _id: { $in: [groomProfileId, brideProfileId] },
    });

    if (!userProfile) {
      return res.status(403).json({
        success: false,
        message: 'You can only submit stories for your own profile',
      });
    }

    // Upload photos
    const photos = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const photoUrl = await uploadToS3(
          file.buffer,
          `matrimonial/success-stories/${Date.now()}-${file.originalname}`,
          file.mimetype
        );
        photos.push({
          url: photoUrl,
          caption: '',
          order: i,
        });
      }
    }

    const story = await SuccessStory.create({
      groomProfileId,
      brideProfileId,
      groomName,
      brideName,
      title,
      story: story,
      marriageDate,
      location,
      photos,
      testimonial,
      howWeMet,
      matchedOn,
      engagementDate,
      submittedBy: req.user._id,
      consentGiven: true,
      status: 'pending',
    });

    res.json({
      success: true,
      message: 'Success story submitted for review',
      data: story,
    });
  } catch (error) {
    logger.error('Submit success story failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit success story',
    });
  }
});

// Get user's submitted stories
router.get('/my-stories', authenticate, async (req, res) => {
  try {
    const stories = await SuccessStory.find({ submittedBy: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: stories,
    });
  } catch (error) {
    logger.error('Get my stories failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your stories',
    });
  }
});

// Admin: Get pending stories
router.get('/admin/pending', authenticate, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const stories = await SuccessStory.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: stories,
    });
  } catch (error) {
    logger.error('Get pending stories failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending stories',
    });
  }
});

// Admin: Approve/reject story
router.patch('/admin/:storyId/moderate', authenticate, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { action, rejectionReason, featured } = req.body;

    const update = {
      approvedBy: req.user._id,
      approvedAt: new Date(),
    };

    if (action === 'approve') {
      update.status = featured ? 'featured' : 'approved';
      update.isPublished = true;
      update.isFeatured = featured || false;
    } else if (action === 'reject') {
      update.status = 'rejected';
      update.rejectionReason = rejectionReason;
      update.isPublished = false;
    }

    const story = await SuccessStory.findByIdAndUpdate(
      req.params.storyId,
      update,
      { new: true }
    );

    res.json({
      success: true,
      message: `Story ${action}ed successfully`,
      data: story,
    });
  } catch (error) {
    logger.error('Moderate story failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to moderate story',
    });
  }
});

// Increment story views
router.post('/:storyId/view', async (req, res) => {
  try {
    await SuccessStory.findByIdAndUpdate(
      req.params.storyId,
      { $inc: { views: 1 } }
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('Increment story views failed:', error);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
