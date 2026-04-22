/**
 * Media handling utilities for classified listings
 */

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_MEDIA_PER_LISTING = 12;

/**
 * Validate media file
 */
const validateMediaFile = (file = {}, isVideo = false) => {
  const errors = [];

  if (!file || !file.mimetype) {
    errors.push('Invalid file');
    return errors;
  }

  const allowedTypes = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
  if (!allowedTypes.includes(file.mimetype.toLowerCase())) {
    errors.push(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
  }

  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    const maxMB = maxSize / (1024 * 1024);
    errors.push(`File size exceeds ${maxMB}MB limit`);
  }

  return errors;
};

/**
 * Process uploaded image
 */
const processImage = async (fileBuffer = null, fileName = '') => {
  if (!fileBuffer) {
    throw new Error('No file buffer provided');
  }

  // In production, you would:
  // 1. Resize/optimize image
  // 2. Generate thumbnails
  // 3. Upload to S3/CDN
  // 4. Return URLs

  // For now, return a placeholder
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);
  const processedFileName = `${timestamp}-${randomStr}.jpg`;

  return {
    id: randomStr,
    url: `/uploads/classifieds/${processedFileName}`,
    fileName: processedFileName,
    size: fileBuffer.length,
    type: 'image',
    uploadedAt: new Date(),
  };
};

/**
 * Process uploaded video
 */
const processVideo = async (fileBuffer = null, fileName = '') => {
  if (!fileBuffer) {
    throw new Error('No file buffer provided');
  }

  // In production, you would:
  // 1. Transcode video
  // 2. Generate thumbnail
  // 3. Upload to S3/CDN
  // 4. Return URLs

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);
  const processedFileName = `${timestamp}-${randomStr}.mp4`;

  return {
    id: randomStr,
    url: `/uploads/classifieds/${processedFileName}`,
    thumbnailUrl: `/uploads/classifieds/${timestamp}-${randomStr}-thumb.jpg`,
    fileName: processedFileName,
    size: fileBuffer.length,
    type: 'video',
    uploadedAt: new Date(),
  };
};

/**
 * Optimize images for different resolutions
 */
const generateImageVariants = (originalUrl = '') => {
  // In production, would generate actual variants from CDN
  return {
    original: originalUrl,
    thumbnail: originalUrl.replace(/\.[^.]+$/, '-thumb.jpg'), // 150x150
    small: originalUrl.replace(/\.[^.]+$/, '-small.jpg'), // 300x300
    medium: originalUrl.replace(/\.[^.]+$/, '-medium.jpg'), // 600x600
    large: originalUrl.replace(/\.[^.]+$/, '-large.jpg'), // 1200x1200
  };
};

/**
 * Validate media gallery
 */
const validateMediaGallery = (mediaItems = []) => {
  const errors = [];

  if (!Array.isArray(mediaItems)) {
    errors.push('Media gallery must be an array');
    return errors;
  }

  if (mediaItems.length === 0) {
    errors.push('At least one image is required');
  }

  if (mediaItems.length > MAX_MEDIA_PER_LISTING) {
    errors.push(`Maximum ${MAX_MEDIA_PER_LISTING} media items allowed`);
  }

  // Validate each media item
  mediaItems.forEach((item, index) => {
    if (!item.url) {
      errors.push(`Media item ${index + 1} is missing URL`);
    }

    if (!item.type || !['image', 'video'].includes(item.type)) {
      errors.push(`Media item ${index + 1} has invalid type`);
    }
  });

  return errors;
};

/**
 * Organize media by order
 */
const organizeMediaGallery = (mediaItems = []) => {
  return mediaItems
    .map((item, index) => ({
      ...item,
      order: item.order || index,
    }))
    .sort((a, b) => a.order - b.order);
};

/**
 * Extract cover image from media gallery
 */
const getCoverImage = (mediaItems = []) => {
  const organized = organizeMediaGallery(mediaItems);
  if (organized.length > 0) {
    return organized[0];
  }
  return null;
};

/**
 * Get media statistics
 */
const getMediaStats = (mediaItems = []) => {
  const images = mediaItems.filter((m) => m.type === 'image');
  const videos = mediaItems.filter((m) => m.type === 'video');

  return {
    total: mediaItems.length,
    images: images.length,
    videos: videos.length,
    hasCoverImage: images.length > 0,
    hasVideo: videos.length > 0,
  };
};

module.exports = {
  validateMediaFile,
  processImage,
  processVideo,
  generateImageVariants,
  validateMediaGallery,
  organizeMediaGallery,
  getCoverImage,
  getMediaStats,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_MEDIA_PER_LISTING,
};
