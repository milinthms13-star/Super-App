const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const MatrimonialProfile = require('../models/MatrimonialProfile');
const User = require('../models/User');
const { s3Config } = require('../config/s3');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const { createModerateRateLimiter } = require('../middleware/rateLimiter');

// Middleware
router.use(authenticate);

// Rate limiters
const profileUpdateLimiter = createModerateRateLimiter({ max: 5, windowMs: 15 * 60 * 1000 });
const searchLimiter = createModerateRateLimiter({ max: 30, windowMs: 15 * 60 * 1000 });
const interestLimiter = createModerateRateLimiter({ max: 20, windowMs: 24 * 60 * 60 * 1000 });

// File upload for profile photos (multer temp storage)
const upload = multer({ dest: 'uploads/matrimonial-temp/' });

// Validation schemas (inline for brevity)
const validateProfileUpdate = (data) => {
  const errors = [];
  if (!data.name?.trim()) errors.push('Name required');
  if (!data.age || data.age < 18 || data.age > 100) errors.push('Valid age 18-100 required');
  if (!data.bio?.trim()) errors.push('Bio required');
  return { isValid: errors.length === 0, errors };
};

// GET /api/matrimonial/profile - Get own profile
router.get('/profile', async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    res.json({
      success: true,
      data: profile ? profile.toObject() : null,
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/matrimonial/profile - Update own profile
router.put('/profile', profileUpdateLimiter, upload.single('photo'), async (req, res) => {
  try {
    const updateData = req.body;
    const validation = validateProfileUpdate(updateData);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    let photoUrl = null;
    if (req.file) {
      const key = `matrimonial/profiles/${req.user._id}/${Date.now()}-${req.file.originalname}`;
      const command = new s3Config.s3Client.send(new PutObjectCommand({
        Bucket: s3Config.BUCKET_NAME,
        Key: key,
        Body: require('fs').createReadStream(req.file.path),
        ContentType: req.file.mimetype,
      }));
      photoUrl = key;
      require('fs').unlinkSync(req.file.path); // Cleanup temp
    }

    const profile = await MatrimonialProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { ...updateData, photoUrl, updatedAt: new Date() } },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, data: profile });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// GET /api/matrimonial/search - Search matches
router.get('/search', searchLimiter, async (req, res) => {
  try {
    const {
      religion, caste, location, education, profession,
      ageMin, ageMax, page = 1, limit = 20, verifiedOnly = true
    } = req.query;

    const query = {};
    if (religion !== 'Any') query.religion = religion;
    if (caste !== 'Any') query.caste = caste;
    if (location !== 'Any') query.location = { $regex: location, $options: 'i' };
    if (education !== 'Any') query.education = education;
    if (profession !== 'Any') query.profession = profession;
    if (verifiedOnly === 'true') query.verificationStatus = 'verified';
    if (ageMin || ageMax) query.age = {};
    if (ageMin) query.age.$gte = Number(ageMin);
    if (ageMax) query.age.$lte = Number(ageMax);

    const skip = (Number(page) - 1) * Number(limit);
    const profiles = await MatrimonialProfile.find(query)
      .select('-messages -interests -reports')
      .sort({ lastActive: -1, profileViews: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await MatrimonialProfile.countDocuments(query);

    res.json({
      success: true,
      data: profiles,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

// POST /api/matrimonial/interests - Send interest
router.post('/interests', interestLimiter, async (req, res) => {
  try {
    const { toProfileId, message } = req.body;
    if (!mongoose.Types.ObjectId.isValid(toProfileId)) {
      return res.status(400).json({ success: false, message: 'Invalid profile ID' });
    }

    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    const toProfile = await MatrimonialProfile.findById(toProfileId);
    if (!profile || !toProfile || profile._id.equals(toProfile._id)) {
      return res.status(400).json({ success: false, message: 'Invalid profiles' });
    }

    const interest = {
      fromProfileId: profile._id,
      toProfileId: toProfile._id,
      message: message?.trim() || '',
    };

    toProfile.interests.push(interest);
    await toProfile.save();

    res.json({ success: true, data: interest });
  } catch (error) {
    logger.error('Interest error:', error);
    res.status(500).json({ success: false, message: 'Interest failed' });
  }
});

// GET /api/matrimonial/interests - Get interests
router.get('/interests', async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id }).populate('interests.fromProfileId', 'name photoUrl');
    res.json({ success: true, data: profile?.interests || [] });
  } catch (error) {
    logger.error('Get interests error:', error);
    res.status(500).json({ success: false, message: 'Failed to load interests' });
  }
});

module.exports = router;

