const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');

const execAsync = promisify(exec);
const VIDEOS_DIR = path.join(__dirname, '../../public/videos');
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * VideoTranscodingService
 * Handle video transcoding, storage, and lifecycle management
 * Converts WebM videos to MP4 with H.264 codec using FFmpeg
 */
class VideoTranscodingService {
  /**
   * Initialize service directories
   */
  static async initialize() {
    try {
      await fs.mkdir(VIDEOS_DIR, { recursive: true });
      logger.info('Video transcoding service initialized');
    } catch (error) {
      logger.error('Failed to initialize video service:', error);
      throw error;
    }
  }

  /**
   * Save and transcode video file
   * @param {string} base64Video - Base64 encoded video data
   * @param {string} mimeType - Original MIME type (e.g., video/webm)
   * @param {Object} onProgress - Progress callback function
   * @returns {Object} Video metadata
   */
  static async saveAndTranscodeVideo(base64Video, mimeType = 'video/webm', onProgress = null) {
    try {
      // Validate input
      if (!base64Video || base64Video.length === 0) {
        throw new Error('No video data provided');
      }

      // Decode base64 to buffer
      const buffer = Buffer.from(base64Video, 'base64');

      // Check file size
      if (buffer.length > MAX_VIDEO_SIZE) {
        throw new Error(`Video exceeds maximum size of ${MAX_VIDEO_SIZE / (1024 * 1024)}MB`);
      }

      // Generate filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      const inputFilename = `sos-video-${timestamp}-${random}.webm`;
      const outputFilename = `sos-video-${timestamp}-${random}.mp4`;
      const inputPath = path.join(VIDEOS_DIR, inputFilename);
      const outputPath = path.join(VIDEOS_DIR, outputFilename);

      // Save original WebM
      await fs.writeFile(inputPath, buffer);
      logger.info(`Saved WebM video: ${inputFilename}`);

      // Check if FFmpeg is available
      const isFFmpegAvailable = await this.checkFFmpeg();
      if (!isFFmpegAvailable) {
        logger.warn('FFmpeg not available, skipping transcoding');
        // Return WebM details if FFmpeg not available
        return {
          filename: inputFilename,
          filepath: inputPath,
          publicPath: `/api/sos/video/${inputFilename}`,
          filesize: buffer.length,
          mimeType: 'video/webm',
          codec: 'vp8,opus',
          status: 'completed',
          transcodingStatus: 'skipped',
          metadata: {
            originalMimeType: mimeType,
            savedAt: new Date().toISOString(),
          },
        };
      }

      // Report progress
      if (onProgress) onProgress({ stage: 'transcoding', percent: 10 });

      // Transcode WebM to MP4 with H.264
      // Command: ffmpeg -i input.webm -c:v libx264 -preset fast -crf 28 -c:a aac output.mp4
      const ffmpegCommand = `ffmpeg -i "${inputPath}" -c:v libx264 -preset fast -crf 28 -c:a aac -y "${outputPath}"`;

      logger.info(`Starting FFmpeg transcoding: ${ffmpegCommand}`);
      const { stdout, stderr } = await execAsync(ffmpegCommand);

      if (onProgress) onProgress({ stage: 'transcoding', percent: 80 });

      // Get output file stats
      const outputStats = await fs.stat(outputPath);
      logger.info(`Transcoding complete: ${outputFilename} (${outputStats.size} bytes)`);

      // Extract video duration and bitrate (basic estimation)
      const duration = await this.estimateVideoDuration(outputStats.size, 2500000); // Assume ~2.5 Mbps

      if (onProgress) onProgress({ stage: 'cleanup', percent: 90 });

      // Delete original WebM to save space
      try {
        await fs.unlink(inputPath);
      } catch (err) {
        logger.warn(`Failed to delete original WebM: ${inputFilename}`);
      }

      if (onProgress) onProgress({ stage: 'complete', percent: 100 });

      return {
        filename: outputFilename,
        filepath: outputPath,
        publicPath: `/api/sos/video/${outputFilename}`,
        filesize: outputStats.size,
        mimeType: 'video/mp4',
        codec: 'h264,aac',
        status: 'completed',
        transcodingStatus: 'completed',
        duration,
        metadata: {
          originalMimeType: mimeType,
          transcodedAt: new Date().toISOString(),
          preset: 'fast', // FFmpeg preset used
          crfQuality: 28, // Quality setting (lower = better, 0-51)
        },
      };
    } catch (error) {
      logger.error('Video transcoding failed:', error);
      throw error;
    }
  }

  /**
   * Check if FFmpeg is available on system
   */
  static async checkFFmpeg() {
    try {
      const { stdout } = await execAsync('ffmpeg -version', { timeout: 5000 });
      return stdout && stdout.includes('ffmpeg');
    } catch (error) {
      logger.warn('FFmpeg not available:', error.message);
      return false;
    }
  }

  /**
   * Get video file from storage
   * @param {string} filename - Video filename
   * @returns {Object} Video metadata and path
   */
  static async getVideoFile(filename) {
    try {
      const filepath = path.join(VIDEOS_DIR, filename);

      // Security: Prevent path traversal
      if (!filepath.startsWith(VIDEOS_DIR)) {
        throw new Error('Invalid file path');
      }

      const stats = await fs.stat(filepath);

      return {
        filename,
        filepath,
        filesize: stats.size,
        createdAt: stats.birthtime,
      };
    } catch (error) {
      logger.error(`Failed to get video: ${filename}`, error);
      throw error;
    }
  }

  /**
   * Delete video file
   * @param {string} filename - Video filename
   */
  static async deleteVideoFile(filename) {
    try {
      const filepath = path.join(VIDEOS_DIR, filename);

      // Security: Prevent path traversal
      if (!filepath.startsWith(VIDEOS_DIR)) {
        throw new Error('Invalid file path');
      }

      await fs.unlink(filepath);
      logger.info(`Deleted video: ${filename}`);
    } catch (error) {
      logger.error(`Failed to delete video: ${filename}`, error);
      throw error;
    }
  }

  /**
   * List all videos in storage
   */
  static async listVideoFiles() {
    try {
      const files = await fs.readdir(VIDEOS_DIR);
      const videoFiles = files.filter(f => f.endsWith('.mp4') || f.endsWith('.webm'));

      const fileDetails = await Promise.all(
        videoFiles.map(async (filename) => {
          const filepath = path.join(VIDEOS_DIR, filename);
          const stats = await fs.stat(filepath);
          return {
            filename,
            filesize: stats.size,
            createdAt: stats.birthtime,
          };
        })
      );

      return fileDetails;
    } catch (error) {
      logger.error('Failed to list video files:', error);
      throw error;
    }
  }

  /**
   * Get total video storage usage
   */
  static async getTotalVideoStorageUsed() {
    try {
      const files = await fs.readdir(VIDEOS_DIR);
      let totalSize = 0;

      for (const filename of files) {
        const filepath = path.join(VIDEOS_DIR, filename);
        const stats = await fs.stat(filepath);
        totalSize += stats.size;
      }

      return totalSize;
    } catch (error) {
      logger.error('Failed to calculate total storage:', error);
      return 0;
    }
  }

  /**
   * Clean up old videos based on age
   * @param {number} ageInDays - Delete videos older than this many days
   */
  static async cleanOldVideoFiles(ageInDays = 30) {
    try {
      const files = await fs.readdir(VIDEOS_DIR);
      const now = Date.now();
      const ageMs = ageInDays * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const filename of files) {
        const filepath = path.join(VIDEOS_DIR, filename);
        const stats = await fs.stat(filepath);
        const fileAge = now - stats.birthtime.getTime();

        if (fileAge > ageMs) {
          await fs.unlink(filepath);
          deletedCount++;
          logger.info(`Deleted old video: ${filename}`);
        }
      }

      logger.info(`Cleanup complete: deleted ${deletedCount} old videos`);
      return { deletedCount, timestamp: new Date() };
    } catch (error) {
      logger.error('Video cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Estimate video duration from file size and bitrate
   * @param {number} filesize - File size in bytes
   * @param {number} bitrate - Bitrate in bits per second (default 2.5 Mbps)
   * @returns {number} Duration in seconds (estimated)
   */
  static estimateVideoDuration(filesize, bitrate = 2500000) {
    const bitsTotal = filesize * 8;
    const seconds = Math.round(bitsTotal / bitrate);
    return Math.max(1, seconds); // Minimum 1 second
  }

  /**
   * Validate video quality (file size and codec)
   * @param {Buffer} buffer - Video file buffer
   * @param {string} mimeType - MIME type
   * @returns {Object} Validation result
   */
  static validateVideoQuality(buffer, mimeType = 'video/webm') {
    const filesize = buffer.length;
    const isValidMime = ['video/webm', 'video/mp4', 'video/quicktime'].includes(mimeType);
    const isValidSize = filesize > 0 && filesize <= MAX_VIDEO_SIZE;

    return {
      isValid: isValidMime && isValidSize,
      filesize,
      mimeType,
      errors: [
        !isValidMime && `Invalid MIME type: ${mimeType}`,
        !isValidSize && `File size exceeds ${MAX_VIDEO_SIZE / (1024 * 1024)}MB limit`,
      ].filter(Boolean),
    };
  }
}

module.exports = VideoTranscodingService;
