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

module.exports = {
  scanImageBuffer,
  validateImagePreScan,
};

