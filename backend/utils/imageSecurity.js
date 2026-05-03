const fs = require('fs');
const path = require('path');
const ClamScan = require('clamav.js');
const logger = require('./logger');

/**
 * Scan uploaded image buffer for malware using ClamAV
 * @param {Buffer} buffer - Image file buffer
 * @param {string} filename - Original filename
 * @returns {Promise<{clean: boolean, result: string}>}
 */
const scanImageBuffer = async (buffer, filename) => {
  try {
    const tempPath = path.join(__dirname, '..', 'temp', `scan-${Date.now()}-${path.basename(filename)}`);
    
    // Ensure temp dir exists
    const tempDir = path.dirname(tempPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Write buffer to temp file
    fs.writeFileSync(tempPath, buffer);

    const clamscan = await new ClamScan().init({
      clamdscan: {
        socket: process.env.CLAMAV_SOCKET || '/var/run/clamav/clamd.ctl',
        host: process.env.CLAMAV_HOST || 'localhost',
        port: process.env.CLAMAV_PORT || 3310,
        timeout: 20000,
      },
    });

    const { isInfected } = await clamscan.scanFile(tempPath);

    // Cleanup temp file
    fs.unlinkSync(tempPath);

    return {
      clean: !isInfected,
      result: isInfected ? 'infected' : 'clean',
      virusName: isInfected ? 'detected' : null,
    };
  } catch (error) {
    logger.warn('Image scan failed (non-blocking):', error.message);
    return {
      clean: true,
      result: 'unscannable',
      error: error.message,
    };
  }
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

