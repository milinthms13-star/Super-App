/**
 * Matrimonial Photo Gallery Routes
 * Handles multiple photo uploads, gallery management
 */

const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const photoGalleryService = require('../services/photoGalleryService');
const logger = require('../utils/logger');

const router = express.Router();

// Multer configuration for multiple photos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10, // Max 10 files at once
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      callback(new Error('Only image files are allowed'));
      return;
    }
    callback(null, true);
  },
});

router.use(authenticate);

// Upload multiple photos
router.post('/upload', upload.array('photos', 10), async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    const { captions, photoTypes, isPrivate, visibleTo } = req.body;
    const captionArray = captions ? JSON.parse(captions) : [];
    const typeArray = photoTypes ? JSON.parse(photoTypes) : [];

    const uploadedPhotos = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      
      const photo = await photoGalleryService.addPhotoToGallery(
        profile._id,
        req.user._id,
        {
          fileBuffer: file.buffer,
          fileName: file.originalname,
          mimeType: file.mimetype,
          caption: captionArray[i] || '',
          photoType: typeArray[i] || 'profile',
          isPrivate: isPrivate === 'true',
          visibleTo: visibleTo || 'everyone',
        }
      );

      uploadedPhotos.push(photo);
    }

    res.json({
      success: true,
      message: `${uploadedPhotos.length} photo(s) uploaded successfully`,
      data: uploadedPhotos,
    });
  } catch (error) {
    logger.error('Photo upload failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Photo upload failed',
    });
  }
});

// Get profile photos
router.get('/', async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    const photos = await photoGalleryService.getProfilePhotos(profile._id);

    res.json({
      success: true,
      data: photos,
    });
  } catch (error) {
    logger.error('Get photos failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch photos',
    });
  }
});

// Get photos for a specific profile (public view)
router.get('/profile/:profileId', async (req, res) => {
  try {
    const viewerProfile = await MatrimonialProfile.findOne({ userId: req.user._id });
    const photos = await photoGalleryService.getProfilePhotos(
      req.params.profileId,
      viewerProfile?._id
    );

    res.json({
      success: true,
      data: photos,
    });
  } catch (error) {
    logger.error('Get profile photos failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch photos',
    });
  }
});

// Set primary photo
router.patch('/:photoId/set-primary', async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    const photo = await photoGalleryService.setPrimaryPhoto(
      req.params.photoId,
      profile._id
    );

    res.json({
      success: true,
      message: 'Primary photo updated',
      data: photo,
    });
  } catch (error) {
    logger.error('Set primary photo failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to set primary photo',
    });
  }
});

// Reorder photos
router.patch('/reorder', async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    const { photoIdOrder } = req.body;
    
    if (!Array.isArray(photoIdOrder)) {
      return res.status(400).json({
        success: false,
        message: 'photoIdOrder must be an array',
      });
    }

    await photoGalleryService.reorderPhotos(profile._id, photoIdOrder);

    res.json({
      success: true,
      message: 'Photos reordered successfully',
    });
  } catch (error) {
    logger.error('Reorder photos failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder photos',
    });
  }
});

// Delete photo
router.delete('/:photoId', async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    await photoGalleryService.deletePhoto(req.params.photoId, profile._id);

    res.json({
      success: true,
      message: 'Photo deleted successfully',
    });
  } catch (error) {
    logger.error('Delete photo failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete photo',
    });
  }
});

module.exports = router;
