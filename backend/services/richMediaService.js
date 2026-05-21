const logger = require('../utils/logger');
const Message = require('../models/Message');
const MediaMetadata = require('../models/MediaMetadata');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

class RichMediaService {
  constructor() {
    this.cache = new Map();
    this.memoryMedia = new Map();
    this.memoryMediaByMessage = new Map();
    this.cacheTTL = 10 * 60 * 1000; // 10 minutes
    this.supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    this.supportedVideoTypes = ['video/mp4', 'video/webm', 'video/mpeg'];
    this.supportedDocTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    this.supportedFormats = [
      ...this.supportedImageTypes,
      ...this.supportedVideoTypes,
      ...this.supportedDocTypes,
    ];
    this.maxFileSize = 100 * 1024 * 1024; // 100MB
  }

  /**
   * Upload and process media
   * @param {Buffer} fileBuffer - File data
   * @param {string} messageId - Message ID
   * @param {string} filename - Original filename
   * @param {string} mimeType - MIME type
   * @param {Object} options - Optional metadata
   * @returns {Object} Media metadata
   */
  async uploadMedia(fileBuffer, messageId, filename, mimeType, options = {}) {
    try {
      if (fileBuffer.length > this.maxFileSize) {
        throw new Error(`File size exceeds limit of ${this.maxFileSize / 1024 / 1024}MB`);
      }

      const mediaType = this.getMediaType(mimeType);
      if (!mediaType) {
        throw new Error(`Unsupported media type: ${mimeType}`);
      }

      const fileHash = this.generateFileHash(fileBuffer);
      const storagePath = path.join('uploads', mediaType, fileHash);

      // Save file
      await fs.mkdir(path.dirname(storagePath), { recursive: true });
      await fs.writeFile(storagePath, fileBuffer);

      // Create metadata
      const metadataPayload = {
        messageId,
        filename,
        mimeType,
        mediaType,
        fileSize: fileBuffer.length,
        fileHash,
        storagePath,
        url: `/api/media/${fileHash}`,
        metadata: {
          dimensions: options.dimensions || null,
          duration: options.duration || null,
          thumbnail: options.thumbnail || null,
        },
        createdAt: new Date(),
      };
      const fallbackMetadata = {
        _id: fileHash,
        ...metadataPayload,
      };

      if (this.canUseDatabase()) {
        const metadata = new MediaMetadata(metadataPayload);
        await metadata.save();
        this.cache.set(`media:${String(metadata._id)}`, { data: metadata, timestamp: Date.now() });
        logger.info(`Media uploaded: ${fileHash} (${mediaType})`);
        return metadata;
      }

      this.storeInMemoryMedia(fallbackMetadata);
      this.cache.set(`media:${String(fallbackMetadata._id)}`, {
        data: fallbackMetadata,
        timestamp: Date.now(),
      });
      logger.info(`Media uploaded (memory mode): ${fileHash} (${mediaType})`);
      return fallbackMetadata;
    } catch (error) {
      logger.error(`Error uploading media: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process image media
   * @param {Buffer} fileBuffer - Image data
   * @param {Object} options - Processing options
   * @returns {Object} Processed image info
   */
  async processImage(fileBuffer, options = {}) {
    try {
      // Get dimensions
      const dimensions = await this.getImageDimensions(fileBuffer);

      // Generate thumbnail
      const thumbnail = await this.generateThumbnail(fileBuffer);

      return {
        dimensions,
        thumbnail: thumbnail.toString('base64'),
        quality: options.quality || 'medium',
      };
    } catch (error) {
      logger.error(`Error processing image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process video media
   * @param {Buffer} fileBuffer - Video data
   * @param {Object} options - Processing options
   * @returns {Object} Processed video info
   */
  async processVideo(fileBuffer, options = {}) {
    try {
      // Get video metadata (duration, resolution, etc.)
      const videoMetadata = await this.getVideoMetadata(fileBuffer);

      // Generate preview thumbnail
      const preview = await this.generateVideoPreview(fileBuffer);

      return {
        duration: videoMetadata.duration,
        resolution: videoMetadata.resolution,
        bitrate: videoMetadata.bitrate,
        preview: preview.toString('base64'),
        quality: options.quality || 'auto',
      };
    } catch (error) {
      logger.error(`Error processing video: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process document media
   * @param {Buffer} fileBuffer - Document data
   * @param {string} mimeType - MIME type
   * @returns {Object} Processed document info
   */
  async processDocument(fileBuffer, mimeType) {
    try {
      const pageCount = await this.getDocumentPageCount(fileBuffer, mimeType);
      const preview = await this.extractDocumentPreview(fileBuffer, mimeType);

      return {
        pageCount,
        preview,
        searchable: true,
      };
    } catch (error) {
      logger.error(`Error processing document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get media by ID
   * @param {string} mediaId - Media metadata ID
   * @returns {Object} Media metadata
   */
  async getMedia(mediaId) {
    try {
      const cacheKey = `media:${mediaId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }

      const inMemoryMedia = this.memoryMedia.get(String(mediaId));
      if (inMemoryMedia) {
        this.cache.set(cacheKey, { data: inMemoryMedia, timestamp: Date.now() });
        return inMemoryMedia;
      }

      if (!this.canUseDatabase() || !this.isValidObjectId(mediaId)) {
        return undefined;
      }

      const media = await MediaMetadata.findById(mediaId);
      if (!media) {
        return undefined;
      }

      this.cache.set(cacheKey, { data: media, timestamp: Date.now() });
      return media;
    } catch (error) {
      logger.error(`Error getting media: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete media
   * @param {string} mediaId - Media metadata ID
   * @returns {boolean} Success
   */
  async deleteMedia(mediaId) {
    try {
      const inMemoryMedia = this.memoryMedia.get(String(mediaId));
      if (inMemoryMedia) {
        try {
          await fs.unlink(inMemoryMedia.storagePath);
        } catch (_err) {
          // best-effort in tests or missing files
        }
        this.deleteFromMemoryMedia(String(mediaId), inMemoryMedia.messageId);
        this.cache.delete(`media:${mediaId}`);
        return true;
      }

      if (!this.canUseDatabase() || !this.isValidObjectId(mediaId)) {
        return false;
      }

      const media = await MediaMetadata.findById(mediaId);
      if (!media) {
        return false;
      }

      // Delete file from storage
      try {
        await fs.unlink(media.storagePath);
      } catch (err) {
        logger.warn(`Could not delete file: ${media.storagePath}`);
      }

      await MediaMetadata.deleteOne({ _id: mediaId });
      this.cache.delete(`media:${mediaId}`);

      logger.info(`Media deleted: ${mediaId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting media: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get media for message
   * @param {string} messageId - Message ID
   * @returns {Array} Media items
   */
  async getMediaForMessage(messageId) {
    try {
      const inMemoryIds = this.memoryMediaByMessage.get(String(messageId)) || [];
      const inMemoryMedia = inMemoryIds
        .map((id) => this.memoryMedia.get(id))
        .filter(Boolean);

      if (!this.canUseDatabase()) {
        return inMemoryMedia;
      }

      const media = await MediaMetadata.find({ messageId }).exec();
      return [...inMemoryMedia, ...media];
    } catch (error) {
      logger.error(`Error getting message media: ${error.message}`);
      return [];
    }
  }

  // Helper methods
  getMediaType(mimeType) {
    if (this.supportedImageTypes.includes(mimeType)) return 'images';
    if (this.supportedVideoTypes.includes(mimeType)) return 'videos';
    if (this.supportedDocTypes.includes(mimeType)) return 'documents';
    return null;
  }

  generateFileHash(buffer) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async getImageDimensions(buffer) {
    // Simplified - in production use image-size library
    return { width: 1920, height: 1080 };
  }

  async generateThumbnail(buffer) {
    // Simplified - in production use sharp library
    return Buffer.from('thumbnail-data');
  }

  async getVideoMetadata(buffer) {
    // Simplified - in production use ffprobe
    return {
      duration: 120,
      resolution: '1920x1080',
      bitrate: '5000k',
    };
  }

  async generateVideoPreview(buffer) {
    // Simplified - in production use ffmpeg
    return Buffer.from('preview-data');
  }

  async getDocumentPageCount(buffer, mimeType) {
    // Simplified - in production use pdf-parse or similar
    return 10;
  }

  async extractDocumentPreview(buffer, mimeType) {
    // Simplified - in production use pdfjs or similar
    return 'Preview text from document';
  }

  clearCache() {
    this.cache.clear();
    logger.info('Media cache cleared');
  }

  canUseDatabase() {
    return mongoose.connection && mongoose.connection.readyState === 1;
  }

  isValidObjectId(value) {
    return mongoose.Types.ObjectId.isValid(value);
  }

  storeInMemoryMedia(media) {
    const mediaId = String(media._id);
    const messageKey = String(media.messageId);

    this.memoryMedia.set(mediaId, media);
    const messageMediaIds = this.memoryMediaByMessage.get(messageKey) || [];
    messageMediaIds.push(mediaId);
    this.memoryMediaByMessage.set(messageKey, messageMediaIds);
  }

  deleteFromMemoryMedia(mediaId, messageId) {
    this.memoryMedia.delete(String(mediaId));
    const messageKey = String(messageId);
    const messageMediaIds = this.memoryMediaByMessage.get(messageKey) || [];
    const filteredIds = messageMediaIds.filter((id) => id !== String(mediaId));
    if (filteredIds.length > 0) {
      this.memoryMediaByMessage.set(messageKey, filteredIds);
    } else {
      this.memoryMediaByMessage.delete(messageKey);
    }
  }
}

module.exports = new RichMediaService();
