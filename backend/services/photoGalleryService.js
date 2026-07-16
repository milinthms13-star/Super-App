/**
 * Photo Gallery Service
 * Handles multiple photo uploads with S3, thumbnails, and verification
 */

const sharp = require('sharp');
const { uploadToS3 } = require('../config/s3');
const MatrimonialPhoto = require('../models/MatrimonialPhoto');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const logger = require('../utils/logger');

// Generate thumbnail from image buffer
const generateThumbnail = async (imageBuffer, width = 300, height = 300) => {
  try {
    return await sharp(imageBuffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch (error) {
    logger.error('Thumbnail generation failed:', error);
    throw error;
  }
};

// Upload photo to S3 with thumbnail
const uploadPhotoWithThumbnail = async (fileBuffer, fileName, mimeType, userId) => {
  try {
    // Upload original
    const originalKey = await uploadToS3(
      fileBuffer,
      `matrimonial/photos/${userId}/${Date.now()}-${fileName}`,
      mimeType
    );

    // Generate and upload thumbnail
    const thumbnailBuffer = await generateThumbnail(fileBuffer);
    const thumbnailKey = await uploadToS3(
      thumbnailBuffer,
      `matrimonial/thumbnails/${userId}/${Date.now()}-thumb-${fileName}`,
      'image/jpeg'
    );

    return {
      originalUrl: originalKey,
      thumbnailUrl: thumbnailKey,
    };
  } catch (error) {
    logger.error('Photo upload with thumbnail failed:', error);
    throw error;
  }
};

// Add photo to profile gallery
const addPhotoToGallery = async (profileId, userId, photoData) => {
  try {
    const { fileBuffer, fileName, mimeType, caption, photoType, isPrivate, visibleTo } = photoData;

    // Upload to S3
    const { originalUrl, thumbnailUrl } = await uploadPhotoWithThumbnail(
      fileBuffer,
      fileName,
      mimeType,
      userId
    );

    // Get metadata
    const metadata = await sharp(fileBuffer).metadata();

    // Get current photo count for ordering
    const photoCount = await MatrimonialPhoto.countDocuments({ profileId });

    // Create photo record
    const photo = await MatrimonialPhoto.create({
      profileId,
      userId,
      photoUrl: originalUrl,
      thumbnailUrl,
      caption: caption || '',
      photoType: photoType || 'profile',
      order: photoCount,
      isPrimary: photoCount === 0, // First photo is primary
      isPrivate: isPrivate || false,
      visibleTo: visibleTo || 'everyone',
      metadata: {
        fileSize: fileBuffer.length,
        mimeType,
        width: metadata.width,
        height: metadata.height,
      },
    });

    // Update profile's main photo if this is the primary photo
    if (photo.isPrimary) {
      await MatrimonialProfile.findByIdAndUpdate(profileId, {
        photoUrl: originalUrl,
      });
    }

    return photo;
  } catch (error) {
    logger.error('Add photo to gallery failed:', error);
    throw error;
  }
};

// Get all photos for a profile
const getProfilePhotos = async (profileId, viewerProfileId = null) => {
  try {
    const photos = await MatrimonialPhoto.find({ profileId })
      .sort({ order: 1 })
      .lean();

    // Filter based on visibility
    return photos.filter(photo => {
      if (photo.isPrivate && photo.visibleTo === 'none') {
        return false;
      }
      // Add more visibility logic here based on premium status, connections, etc.
      return true;
    });
  } catch (error) {
    logger.error('Get profile photos failed:', error);
    throw error;
  }
};

// Set primary photo
const setPrimaryPhoto = async (photoId, profileId) => {
  try {
    const photo = await MatrimonialPhoto.findOne({ _id: photoId, profileId });
    
    if (!photo) {
      throw new Error('Photo not found');
    }

    // Update all photos to non-primary
    await MatrimonialPhoto.updateMany({ profileId }, { isPrimary: false });

    // Set this photo as primary
    photo.isPrimary = true;
    await photo.save();

    // Update profile's main photo
    await MatrimonialProfile.findByIdAndUpdate(profileId, {
      photoUrl: photo.photoUrl,
    });

    return photo;
  } catch (error) {
    logger.error('Set primary photo failed:', error);
    throw error;
  }
};

// Reorder photos
const reorderPhotos = async (profileId, photoIdOrder) => {
  try {
    const updates = photoIdOrder.map((photoId, index) =>
      MatrimonialPhoto.updateOne({ _id: photoId, profileId }, { order: index })
    );

    await Promise.all(updates);
    return { success: true };
  } catch (error) {
    logger.error('Reorder photos failed:', error);
    throw error;
  }
};

// Delete photo
const deletePhoto = async (photoId, profileId) => {
  try {
    const photo = await MatrimonialPhoto.findOne({ _id: photoId, profileId });
    
    if (!photo) {
      throw new Error('Photo not found');
    }

    // Don't allow deletion if it's the only photo
    const photoCount = await MatrimonialPhoto.countDocuments({ profileId });
    if (photoCount === 1) {
      throw new Error('Cannot delete the last photo');
    }

    const wasPrimary = photo.isPrimary;

    await MatrimonialPhoto.deleteOne({ _id: photoId });

    // If deleted photo was primary, set another photo as primary
    if (wasPrimary) {
      const nextPhoto = await MatrimonialPhoto.findOne({ profileId }).sort({ order: 1 });
      if (nextPhoto) {
        await setPrimaryPhoto(nextPhoto._id, profileId);
      }
    }

    return { success: true };
  } catch (error) {
    logger.error('Delete photo failed:', error);
    throw error;
  }
};

module.exports = {
  uploadPhotoWithThumbnail,
  addPhotoToGallery,
  getProfilePhotos,
  setPrimaryPhoto,
  reorderPhotos,
  deletePhoto,
  generateThumbnail,
};
