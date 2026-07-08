const express = require('express');
const router = express.Router();
const SuccessStory = require('../models/SuccessStory');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const { s3Service } = require('../services/s3Service');
const { errorTrackingService } = require('../services/errorTrackingService');
const { cacheService } = require('../services/cacheService');
const auth = require('../middleware/auth');

// Get all published success stories (public)
router.get('/public', async (req, res) => {
  try {
    const { page = 1, limit = 12, featured } = req.query;
    
    const filter = { status: 'published' };
    if (featured === 'true') {
      filter.featured = true;
      filter.featuredUntil = { $gte: new Date() };
    }

    const cacheKey = `stories:public:${page}:${limit}:${featured}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json(cached);

    const skip = (page - 1) * limit;
    
    const [stories, total] = await Promise.all([
      SuccessStory.find(filter)
        .sort({ featured: -1, publishedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-comments -moderationNotes -reviewedBy'),
      SuccessStory.countDocuments(filter)
    ]);

    const result = {
      stories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };

    await cacheService.set(cacheKey, result, 300);
    res.json(result);
  } catch (error) {
    errorTrackingService.captureError(error, { context: 'get-public-stories' });
    res.status(500).json({ error: 'Failed to fetch success stories' });
  }
});

// Get single success story (public)
router.get('/public/:storyId', async (req, res) => {
  try {
    const story = await SuccessStory.findById(req.params.storyId);
    
    if (!story || story.status !== 'published') {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Increment views
    story.views += 1;
    await story.save();

    res.json(story);
  } catch (error) {
    errorTrackingService.captureError(error, { storyId: req.params.storyId, context: 'get-story-detail' });
    res.status(500).json({ error: 'Failed to fetch story' });
  }
});

// Submit a success story (authenticated users)
router.post('/submit', auth, async (req, res) => {
  try {
    const { coupleData, storyData, photos, testimonial, metadata } = req.body;

    // Verify user owns at least one of the profiles
    const userProfile = await MatrimonialProfile.findOne({ userId: req.user.id });
    if (!userProfile) {
      return res.status(403).json({ error: 'You must have a matrimonial profile to submit a story' });
    }

    const story = new SuccessStory({
      couple: coupleData,
      story: storyData,
      photos,
      testimonial,
      metadata,
      status: 'pending'
    });

    await story.save();

    await errorTrackingService.logAudit('success_story_submitted', {
      userId: req.user.id,
      storyId: story._id
    });

    res.status(201).json({ 
      success: true, 
      storyId: story._id,
      message: 'Success story submitted for review'
    });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'submit-story' });
    res.status(500).json({ error: 'Failed to submit success story' });
  }
});

// Get user's submitted stories (authenticated)
router.get('/my-stories', auth, async (req, res) => {
  try {
    const userProfile = await MatrimonialProfile.findOne({ userId: req.user.id });
    if (!userProfile) {
      return res.json({ stories: [] });
    }

    const stories = await SuccessStory.find({
      $or: [
        { 'couple.groom.profileId': userProfile._id },
        { 'couple.bride.profileId': userProfile._id }
      ]
    }).sort({ createdAt: -1 });

    res.json({ stories });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'get-my-stories' });
    res.status(500).json({ error: 'Failed to fetch your stories' });
  }
});

// Like/unlike a story (authenticated)
router.post('/:storyId/like', auth, async (req, res) => {
  try {
    const story = await SuccessStory.findById(req.params.storyId);
    
    if (!story || story.status !== 'published') {
      return res.status(404).json({ error: 'Story not found' });
    }

    const likedIndex = story.likedBy.indexOf(req.user.id);
    
    if (likedIndex > -1) {
      // Unlike
      story.likedBy.splice(likedIndex, 1);
      story.likes = Math.max(0, story.likes - 1);
    } else {
      // Like
      story.likedBy.push(req.user.id);
      story.likes += 1;
    }

    await story.save();

    res.json({ 
      success: true, 
      liked: likedIndex === -1,
      likes: story.likes
    });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, storyId: req.params.storyId, context: 'like-story' });
    res.status(500).json({ error: 'Failed to update like status' });
  }
});

// Add comment to story (authenticated)
router.post('/:storyId/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.length > 500) {
      return res.status(400).json({ error: 'Invalid comment text' });
    }

    const story = await SuccessStory.findById(req.params.storyId);
    
    if (!story || story.status !== 'published') {
      return res.status(404).json({ error: 'Story not found' });
    }

    const comment = {
      userId: req.user.id,
      name: req.user.name || 'Anonymous',
      text,
      createdAt: new Date()
    };

    story.comments.push(comment);
    await story.save();

    res.status(201).json({ success: true, comment });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, storyId: req.params.storyId, context: 'add-comment' });
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Admin: Get all stories with filters
router.get('/admin/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { page = 1, limit = 20, status } = req.query;
    
    const filter = {};
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    
    const [stories, total] = await Promise.all([
      SuccessStory.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('couple.groom.profileId couple.bride.profileId', 'name age location'),
      SuccessStory.countDocuments(filter)
    ]);

    res.json({
      stories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'admin-get-stories' });
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// Admin: Review story (approve/reject)
router.patch('/admin/:storyId/review', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { action, moderationNotes } = req.body;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const story = await SuccessStory.findById(req.params.storyId);
    
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    story.status = action === 'approve' ? 'published' : 'rejected';
    story.reviewedBy = req.user.id;
    story.reviewedAt = new Date();
    story.moderationNotes = moderationNotes;
    
    if (action === 'approve') {
      story.publishedAt = new Date();
    }

    await story.save();

    await errorTrackingService.logAudit('success_story_reviewed', {
      adminId: req.user.id,
      storyId: story._id,
      action
    });

    // Clear cache
    await cacheService.delete('stories:public:*');

    res.json({ success: true, story });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, storyId: req.params.storyId, context: 'review-story' });
    res.status(500).json({ error: 'Failed to review story' });
  }
});

// Admin: Feature/unfeature story
router.patch('/admin/:storyId/feature', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { featured, featuredDays = 30 } = req.body;

    const story = await SuccessStory.findById(req.params.storyId);
    
    if (!story || story.status !== 'published') {
      return res.status(404).json({ error: 'Story not found or not published' });
    }

    story.featured = featured;
    if (featured) {
      const featuredUntil = new Date();
      featuredUntil.setDate(featuredUntil.getDate() + parseInt(featuredDays));
      story.featuredUntil = featuredUntil;
    } else {
      story.featuredUntil = null;
    }

    await story.save();

    await errorTrackingService.logAudit('success_story_featured', {
      adminId: req.user.id,
      storyId: story._id,
      featured
    });

    // Clear cache
    await cacheService.delete('stories:public:*');

    res.json({ success: true, story });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, storyId: req.params.storyId, context: 'feature-story' });
    res.status(500).json({ error: 'Failed to update featured status' });
  }
});

// Admin: Delete story
router.delete('/admin/:storyId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const story = await SuccessStory.findByIdAndDelete(req.params.storyId);
    
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    await errorTrackingService.logAudit('success_story_deleted', {
      adminId: req.user.id,
      storyId: req.params.storyId
    });

    // Clear cache
    await cacheService.delete('stories:public:*');

    res.json({ success: true, message: 'Story deleted successfully' });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, storyId: req.params.storyId, context: 'delete-story' });
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

// Get story statistics (admin)
router.get('/admin/statistics', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [
      total,
      pending,
      approved,
      published,
      rejected,
      featured,
      totalViews,
      totalLikes
    ] = await Promise.all([
      SuccessStory.countDocuments(),
      SuccessStory.countDocuments({ status: 'pending' }),
      SuccessStory.countDocuments({ status: 'approved' }),
      SuccessStory.countDocuments({ status: 'published' }),
      SuccessStory.countDocuments({ status: 'rejected' }),
      SuccessStory.countDocuments({ featured: true, featuredUntil: { $gte: new Date() } }),
      SuccessStory.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
      SuccessStory.aggregate([{ $group: { _id: null, total: { $sum: '$likes' } } }])
    ]);

    res.json({
      total,
      byStatus: { pending, approved, published, rejected },
      featured,
      engagement: {
        totalViews: totalViews[0]?.total || 0,
        totalLikes: totalLikes[0]?.total || 0
      }
    });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'story-statistics' });
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
