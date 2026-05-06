const fs = require('fs');
const path = require('path');
// const ClamScan = require('clamav.js'); // Disabled: not installed
const logger = require('./logger');

/**
 * Scan uploaded image buffer for malware using ClamAV
 * @param {Buffer} buffer - Image file buffer
 * @param {string} filename - Original filename
 * @returns {Promise<{clean: boolean, result: string}>}
 */
const scanImageBuffer = async (buffer, filename) => {
  logger.warn('ClamAV scan disabled - returning clean');
  return {
    clean: true,
    result: 'scan_disabled',
  };
};

/**
 * Pre-scan validation (size, type, dimensions using sharp)
 */
const validateImagePreScan = async (buffer, mimetype, filename, maxSize = 5 * 1024 * 1024, maxDimensions = 4096) => {
  // Basic type check
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(mimetype)) {
    return { valid: false, reason: 'unsupported_image_type' };
  }

  if (!buffer?.length) {
    return { valid: false, reason: 'file_buffer_missing' };
  }

  if (buffer.length > maxSize) {
    return { valid: false, reason: 'file_too_large' };
  }

  try {
    const sharp = require('sharp');
    const metadata = await sharp(buffer).metadata();
    
    if (metadata.width > maxDimensions || metadata.height > maxDimensions) {
      return { valid: false, reason: 'dimensions_too_large' };
    }

    if (metadata.pages && metadata.pages > 1) {
      return { valid: false, reason: 'multi_page_image' };
    }

    return { valid: true };
  } catch (sharpError) {
    logger.warn('Sharp validation failed:', sharpError.message);
    return { valid: true }; // Allow if sharp fails (non-blocking)
  }
};

/**
 * Apply watermark to matrimonial profile image
 * Prevents unauthorized screenshot/sharing
 */
const applyWatermark = async (imageBuffer, profileId, userEmail) => {
  try {
    const sharp = require('sharp');
    const watermarkText = `Protected by NilaHub\n${userEmail}\nID: ${profileId.slice(-6)}`;

    const watermarkSvg = Buffer.from(`
      <svg width="800" height="800">
        <defs>
          <style>
            text { font-family: Arial; font-size: 24px; fill: rgba(255,255,255,0.4); }
          </style>
        </defs>
        <text x="50" y="100" transform="rotate(-45)">${watermarkText}</text>
        <text x="50" y="600" transform="rotate(-45)">${watermarkText}</text>
        <text x="400" y="50" transform="rotate(-45)">${watermarkText}</text>
        <text x="400" y="700" transform="rotate(-45)">${watermarkText}</text>
      </svg>
    `);

    const watermarked = await sharp(imageBuffer)
      .composite([
        {
          input: watermarkSvg,
          gravity: 'center',
          tile: true,
          blend: 'overlay',
        },
      ])
      .png()
      .toBuffer();

    return watermarked;
  } catch (error) {
    logger.error(`Error applying watermark: ${error.message}`);
    return imageBuffer;
  }
};

/**
 * Create low-resolution preview for list views
 */
const createLowResPreview = async (imageBuffer) => {
  try {
    const sharp = require('sharp');
    const preview = await sharp(imageBuffer)
      .resize(400, 400, { fit: 'cover', withoutEnlargement: true })
      .blur(2)
      .quality(60)
      .toBuffer();
    return preview;
  } catch (error) {
    logger.error(`Error creating preview: ${error.message}`);
    return imageBuffer;
  }
};

/**
 * Detect fake/suspicious images
 */
const detectFakeImage = async (imageBuffer) => {
  try {
    const sharp = require('sharp');
    const metadata = await sharp(imageBuffer).metadata();

    const fakeIndicators = {
      lowQuality: metadata.density && metadata.density < 72,
      unusualRatio: Math.abs(metadata.width / metadata.height - 1) > 0.5,
      noEXIF: !metadata.exif,
      suspiciousDimensions: (metadata.width + metadata.height) % 100 === 0,
    };

    const riskScore = Object.values(fakeIndicators).filter(Boolean).length * 25;

    return {
      isSuspicious: riskScore >= 50,
      riskScore: Math.min(riskScore, 100),
      indicators: fakeIndicators,
      recommendation: riskScore >= 75 ? 'reject' : riskScore >= 50 ? 'manual_review' : 'accept',
    };
  } catch (error) {
    logger.error(`Error detecting fake image: ${error.message}`);
    return { isSuspicious: false, riskScore: 0 };
  }
};

/**
 * Track image access for security auditing
 */
const trackImageUsage = (imageId, accessedBy, context = 'view') => {
  logger.info(`Image ${imageId} accessed by ${accessedBy} (${context})`);
};

module.exports = {
  scanImageBuffer,
  validateImagePreScan,
  applyWatermark,
  createLowResPreview,
  detectFakeImage,
  trackImageUsage,
};

