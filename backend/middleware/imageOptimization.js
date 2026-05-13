/**
 * Image Optimization Middleware for Classifieds
 * Compresses and validates images before storage
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * Image optimization configuration
 */
const IMAGE_CONFIG = {
  maxWidth: 1920,
  maxHeight: 1440,
  quality: 85,
  formats: {
    thumbnail: { width: 300, height: 300 },
    preview: { width: 800, height: 600 },
    full: { width: 1920, height: 1440 },
  },
};

/**
 * Validate image file
 */
function validateImageFile(file) {
  if (!file) {
    throw new Error('No file provided');
  }

  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedMimes.includes(file.mimetype)) {
    throw new Error(`Invalid file type. Allowed: ${allowedMimes.join(', ')}`);
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
  }

  return true;
}

/**
 * Optimize image and generate variants
 */
async function optimizeImage(inputPath, outputDir, filename) {
  try {
    validateImageFile({ size: (await fs.stat(inputPath)).size, mimetype: 'image/jpeg' });

    // Create output directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });

    const variants = {};

    // Generate thumbnail
    const thumbnailPath = path.join(outputDir, `${filename}-thumb.webp`);
    await sharp(inputPath)
      .resize(IMAGE_CONFIG.formats.thumbnail.width, IMAGE_CONFIG.formats.thumbnail.height, {
        fit: 'cover',
      })
      .webp({ quality: 75 })
      .toFile(thumbnailPath);
    variants.thumbnail = `${filename}-thumb.webp`;

    // Generate preview
    const previewPath = path.join(outputDir, `${filename}-preview.webp`);
    await sharp(inputPath)
      .resize(IMAGE_CONFIG.formats.preview.width, IMAGE_CONFIG.formats.preview.height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_CONFIG.quality })
      .toFile(previewPath);
    variants.preview = `${filename}-preview.webp`;

    // Generate full-size optimized
    const fullPath = path.join(outputDir, `${filename}-full.webp`);
    await sharp(inputPath)
      .resize(IMAGE_CONFIG.formats.full.width, IMAGE_CONFIG.formats.full.height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_CONFIG.quality })
      .toFile(fullPath);
    variants.full = `${filename}-full.webp`;

    return variants;
  } catch (error) {
    console.error('Image optimization error:', error.message);
    throw new Error(`Image optimization failed: ${error.message}`);
  }
}

/**
 * Express middleware for image optimization
 */
function imageOptimizationMiddleware(req, res, next) {
  if (!req.file) {
    return next();
  }

  try {
    validateImageFile(req.file);
    req.imageValidated = true;
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: `Image validation failed: ${error.message}`,
    });
  }

  next();
}

module.exports = {
  optimizeImage,
  validateImageFile,
  imageOptimizationMiddleware,
  IMAGE_CONFIG,
};
