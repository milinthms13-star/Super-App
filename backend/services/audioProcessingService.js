/**
 * Audio Processing Service
 * Handles audio conversion, compression, and storage for SOS alerts
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const AUDIO_STORAGE_DIR = path.join(__dirname, '../../public/audio');

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_STORAGE_DIR)) {
  fs.mkdirSync(AUDIO_STORAGE_DIR, { recursive: true });
}

/**
 * Save base64 audio to file system
 * @param {string} base64Audio - Base64 encoded audio data
 * @param {string} mimeType - MIME type (audio/webm)
 * @returns {Promise<{filename: string, path: string, size: number}>}
 */
exports.saveAudioFile = async (base64Audio, mimeType = 'audio/webm') => {
  try {
    if (!base64Audio) {
      throw new Error('Audio data is required');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const ext = mimeType === 'audio/webm' ? 'webm' : 'mp3';
    const filename = `sos-audio-${timestamp}-${randomString}.${ext}`;

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Audio, 'base64');

    // Save to file system
    const filePath = path.join(AUDIO_STORAGE_DIR, filename);
    await fs.promises.writeFile(filePath, buffer);

    // Get file size
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    logger.info(`Audio file saved: ${filename} (${fileSize} bytes)`);

    return {
      filename,
      path: filePath,
      publicPath: `/audio/${filename}`,
      size: fileSize,
      mimeType,
      duration: null, // Will be calculated from metadata
    };
  } catch (error) {
    logger.error(`Error saving audio file: ${error.message}`);
    throw error;
  }
};

/**
 * Get audio file metadata
 * @param {string} filename - Audio filename
 * @returns {Promise<Object>}
 */
exports.getAudioMetadata = async (filename) => {
  try {
    const filePath = path.join(AUDIO_STORAGE_DIR, filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found: ${filename}`);
    }

    const stats = fs.statSync(filePath);

    return {
      filename,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      publicPath: `/audio/${filename}`,
    };
  } catch (error) {
    logger.error(`Error getting audio metadata: ${error.message}`);
    throw error;
  }
};

/**
 * Delete audio file
 * @param {string} filename - Audio filename
 * @returns {Promise<boolean>}
 */
exports.deleteAudioFile = async (filename) => {
  try {
    const filePath = path.join(AUDIO_STORAGE_DIR, filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found: ${filename}`);
    }

    await fs.promises.unlink(filePath);
    logger.info(`Audio file deleted: ${filename}`);
    return true;
  } catch (error) {
    logger.error(`Error deleting audio file: ${error.message}`);
    throw error;
  }
};

/**
 * Get audio duration from buffer (basic estimation)
 * @param {Buffer} buffer - Audio data buffer
 * @param {number} sampleRate - Sample rate in Hz (default 48000)
 * @returns {number} Duration in seconds
 */
exports.estimateAudioDuration = (buffer, sampleRate = 48000) => {
  try {
    // Simple estimation: divide buffer size by (sampleRate * bytesPerSample)
    // For WebM, this is approximate
    const bytesPerSecond = sampleRate * 2; // 16-bit audio = 2 bytes per sample
    const duration = buffer.length / bytesPerSecond;
    return Math.round(duration * 10) / 10; // Round to 1 decimal place
  } catch (error) {
    logger.warn(`Error estimating audio duration: ${error.message}`);
    return 0;
  }
};

/**
 * Validate audio data
 * @param {string} base64Audio - Base64 encoded audio
 * @param {number} maxSize - Maximum size in bytes (default 5MB)
 * @returns {Object} Validation result
 */
exports.validateAudio = (base64Audio, maxSize = 5242880) => {
  const result = {
    valid: true,
    errors: [],
  };

  if (!base64Audio) {
    result.valid = false;
    result.errors.push('Audio data is required');
  }

  // Estimate actual size from base64
  const buffer = Buffer.from(base64Audio, 'base64');
  const audioSize = buffer.length;

  if (audioSize === 0) {
    result.valid = false;
    result.errors.push('Audio data is empty');
  }

  if (audioSize > maxSize) {
    result.valid = false;
    result.errors.push(`Audio file exceeds maximum size of ${maxSize / 1024 / 1024}MB`);
  }

  // Minimum audio size (at least 1KB)
  if (audioSize < 1024) {
    result.valid = false;
    result.errors.push('Audio file too small');
  }

  return result;
};

/**
 * Get list of stored audio files
 * @returns {Promise<Array>}
 */
exports.listAudioFiles = async () => {
  try {
    const files = await fs.promises.readdir(AUDIO_STORAGE_DIR);
    const audioFiles = files.filter(f => f.startsWith('sos-audio-'));

    const details = await Promise.all(
      audioFiles.map(async (filename) => {
        const stats = fs.statSync(path.join(AUDIO_STORAGE_DIR, filename));
        return {
          filename,
          size: stats.size,
          created: stats.birthtime,
          publicPath: `/audio/${filename}`,
        };
      })
    );

    return details;
  } catch (error) {
    logger.error(`Error listing audio files: ${error.message}`);
    return [];
  }
};

/**
 * Get total audio storage size used
 * @returns {Promise<number>} Total size in bytes
 */
exports.getTotalAudioStorageUsed = async () => {
  try {
    const files = await fs.promises.readdir(AUDIO_STORAGE_DIR);
    let totalSize = 0;

    for (const filename of files) {
      if (filename.startsWith('sos-audio-')) {
        const filePath = path.join(AUDIO_STORAGE_DIR, filename);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      }
    }

    return totalSize;
  } catch (error) {
    logger.error(`Error calculating audio storage: ${error.message}`);
    return 0;
  }
};

/**
 * Clean old audio files (older than 30 days)
 * @param {number} ageInDays - Age threshold in days (default 30)
 * @returns {Promise<{deleted: number, freed: number}>}
 */
exports.cleanOldAudioFiles = async (ageInDays = 30) => {
  try {
    const files = await fs.promises.readdir(AUDIO_STORAGE_DIR);
    const ageInMs = ageInDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let deleted = 0;
    let freed = 0;

    for (const filename of files) {
      if (filename.startsWith('sos-audio-')) {
        const filePath = path.join(AUDIO_STORAGE_DIR, filename);
        const stats = fs.statSync(filePath);
        const age = now - stats.birthtime.getTime();

        if (age > ageInMs) {
          await fs.promises.unlink(filePath);
          deleted++;
          freed += stats.size;
          logger.info(`Deleted old audio file: ${filename}`);
        }
      }
    }

    logger.info(`Cleaned ${deleted} old audio files, freed ${freed} bytes`);
    return { deleted, freed };
  } catch (error) {
    logger.error(`Error cleaning old audio files: ${error.message}`);
    return { deleted: 0, freed: 0 };
  }
};

module.exports = exports;
