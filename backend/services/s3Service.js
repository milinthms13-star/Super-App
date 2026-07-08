/**
 * AWS S3 Service
 * Handles file upload, CDN integration, and image optimization
 */

const AWS = require('aws-sdk');
const sharp = require('sharp');
const crypto = require('crypto');
const logger = require('../utils/logger');

class S3Service {
  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'ap-south-1'
    });
    
    this.bucket = process.env.AWS_S3_BUCKET;
    this.cdnDomain = process.env.AWS_CDN_DOMAIN || `https://${this.bucket}.s3.amazonaws.com`;
  }

  /**
   * Upload file to S3
   */
  async uploadFile(buffer, filename, mimeType, folder = 'matrimonial') {
    try {
      if (!this.isConfigured()) {
        throw new Error('S3 not configured');
      }

      const key = `${folder}/${Date.now()}-${this.sanitizeFilename(filename)}`;

      const params = {
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ACL: 'public-read',
        CacheControl: 'max-age=31536000' // 1 year
      };

      const result = await this.s3.upload(params).promise();

      logger.info(`File uploaded to S3: ${key}`);

      return {
        url: result.Location,
        cdnUrl: `${this.cdnDomain}/${key}`,
        key: result.Key,
        bucket: result.Bucket
      };
    } catch (error) {
      logger.error('Error uploading to S3:', error);
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  /**
   * Upload image with optimization
   */
  async uploadImage(buffer, filename, options = {}) {
    try {
      // Optimize image
      const optimizedBuffer = await this.optimizeImage(buffer, options);

      // Generate thumbnails if needed
      const uploads = [];
      
      // Upload original optimized image
      const mainUpload = await this.uploadFile(
        optimizedBuffer,
        filename,
        'image/jpeg',
        options.folder || 'matrimonial/photos'
      );
      uploads.push({ size: 'original', ...mainUpload });

      // Upload thumbnail
      if (options.createThumbnail !== false) {
        const thumbnailBuffer = await this.createThumbnail(buffer, 300, 300);
        const thumbUpload = await this.uploadFile(
          thumbnailBuffer,
          `thumb_${filename}`,
          'image/jpeg',
          options.folder || 'matrimonial/photos'
        );
        uploads.push({ size: 'thumbnail', ...thumbUpload });
      }

      // Upload medium size
      if (options.createMedium !== false) {
        const mediumBuffer = await this.createThumbnail(buffer, 800, 800);
        const mediumUpload = await this.uploadFile(
          mediumBuffer,
          `medium_${filename}`,
          'image/jpeg',
          options.folder || 'matrimonial/photos'
        );
        uploads.push({ size: 'medium', ...mediumUpload });
      }

      return uploads;
    } catch (error) {
      logger.error('Error uploading image:', error);
      throw error;
    }
  }

  /**
   * Optimize image
   */
  async optimizeImage(buffer, options = {}) {
    try {
      const quality = options.quality || 85;
      const maxWidth = options.maxWidth || 1920;
      const maxHeight = options.maxHeight || 1920;

      return await sharp(buffer)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality, progressive: true })
        .toBuffer();
    } catch (error) {
      logger.error('Error optimizing image:', error);
      throw error;
    }
  }

  /**
   * Create thumbnail
   */
  async createThumbnail(buffer, width, height) {
    try {
      return await sharp(buffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (error) {
      logger.error('Error creating thumbnail:', error);
      throw error;
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key) {
    try {
      if (!this.isConfigured()) {
        throw new Error('S3 not configured');
      }

      const params = {
        Bucket: this.bucket,
        Key: key
      };

      await this.s3.deleteObject(params).promise();

      logger.info(`File deleted from S3: ${key}`);

      return { success: true };
    } catch (error) {
      logger.error('Error deleting from S3:', error);
      throw new Error(`S3 delete failed: ${error.message}`);
    }
  }

  /**
   * Get signed URL for private files
   */
  getSignedUrl(key, expiresIn = 3600) {
    try {
      if (!this.isConfigured()) {
        throw new Error('S3 not configured');
      }

      const params = {
        Bucket: this.bucket,
        Key: key,
        Expires: expiresIn
      };

      const url = this.s3.getSignedUrl('getObject', params);

      return url;
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(key) {
    try {
      if (!this.isConfigured()) {
        return false;
      }

      const params = {
        Bucket: this.bucket,
        Key: key
      };

      await this.s3.headObject(params).promise();
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Sanitize filename
   */
  sanitizeFilename(filename) {
    const ext = filename.split('.').pop();
    const hash = crypto.randomBytes(8).toString('hex');
    return `${hash}.${ext}`;
  }

  /**
   * Check if S3 is configured
   */
  isConfigured() {
    return !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      this.bucket
    );
  }
}

// Singleton instance
const s3Service = new S3Service();

module.exports = s3Service;
