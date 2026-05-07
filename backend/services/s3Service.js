const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

let s3Client;

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'nilahub-photos';
const LOCAL_UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

const getS3Client = () => {
  if (s3Client) {
    return s3Client;
  }

  try {
    const AWS = require('aws-sdk');
    s3Client = new AWS.S3({
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
    return s3Client;
  } catch (error) {
    logger.warn(`AWS S3 SDK unavailable: ${error.message}`);
    return null;
  }
};

const toLocalPath = (key) => path.join(LOCAL_UPLOAD_ROOT, key);
const toLocalUrl = (key) => `/uploads/${String(key).replace(/\\/g, '/')}`;

/**
 * Upload photo to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} filename - Original filename
 * @param {string} folder - Folder path (default: photos)
 * @returns {Promise<string>} - Public S3 URL or local URL
 */
exports.uploadPhotoToS3 = async (fileBuffer, filename, folder = 'sos-photos') => {
  try {
    if (!fileBuffer) {
      throw new Error('File buffer is required');
    }

    if (!filename) {
      throw new Error('Filename is required');
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2, 11);
    const uniqueFilename = `${folder}/${timestamp}-${randomStr}-${filename}`;
    const s3 = getS3Client();

    if (!s3) {
      const localPath = toLocalPath(uniqueFilename);
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, fileBuffer);

      const localUrl = toLocalUrl(uniqueFilename);
      logger.info(`Photo stored locally: ${localUrl}`);
      return localUrl;
    }

    const params = {
      Bucket: BUCKET_NAME,
      Key: uniqueFilename,
      Body: fileBuffer,
      ContentType: 'image/jpeg',
      ACL: 'public-read',
      Metadata: {
        'original-filename': filename,
        'upload-timestamp': new Date().toISOString(),
      },
    };

    const result = await s3.upload(params).promise();

    logger.info(`Photo uploaded to S3: ${result.Location}`);
    return result.Location;
  } catch (error) {
    logger.error(`uploadPhotoToS3 error: ${error.message}`);
    throw error;
  }
};

/**
 * Upload multiple photos to S3
 * @param {Array<{buffer: Buffer, filename: string}>} files - Array of file objects
 * @param {string} folder - Folder path
 * @returns {Promise<Array<string>>} - Array of public URLs
 */
exports.uploadMultiplePhotos = async (files, folder = 'sos-photos') => {
  try {
    const uploads = files.map((file) =>
      exports.uploadPhotoToS3(file.buffer, file.filename, folder)
    );

    return Promise.all(uploads);
  } catch (error) {
    logger.error(`uploadMultiplePhotos error: ${error.message}`);
    throw error;
  }
};

/**
 * Get presigned URL for photo (temporary access)
 * @param {string} key - S3 object key
 * @param {number} expiresIn - Expiration time in seconds
 * @returns {Promise<string>} - URL
 */
exports.getPresignedURL = async (key, expiresIn = 3600) => {
  try {
    const s3 = getS3Client();
    if (!s3) {
      return toLocalUrl(key);
    }

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expiresIn,
    };

    return s3.getSignedUrl('getObject', params);
  } catch (error) {
    logger.error(`getPresignedURL error: ${error.message}`);
    throw error;
  }
};

/**
 * Delete photo from S3 or local fallback storage
 * @param {string} key - Object key
 */
exports.deletePhotoFromS3 = async (key) => {
  try {
    const s3 = getS3Client();
    if (!s3) {
      const localPath = toLocalPath(key);
      await fs.unlink(localPath);
      logger.info(`Photo deleted from local storage: ${key}`);
      return true;
    }

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await s3.deleteObject(params).promise();
    logger.info(`Photo deleted from S3: ${key}`);
    return true;
  } catch (error) {
    logger.error(`deletePhotoFromS3 error: ${error.message}`);
    throw error;
  }
};

/**
 * List all photos for an incident
 * @param {string} incidentId - Incident ID
 * @returns {Promise<Array>} - List of photo objects
 */
exports.listIncidentPhotos = async (incidentId) => {
  try {
    const prefix = `sos-photos/${incidentId}/`;
    const s3 = getS3Client();

    if (!s3) {
      const folderPath = toLocalPath(prefix);
      try {
        const entries = await fs.readdir(folderPath, { withFileTypes: true });
        return entries
          .filter((entry) => entry.isFile())
          .map((entry) => {
            const key = `${prefix}${entry.name}`;
            return {
              key,
              url: toLocalUrl(key),
            };
          });
      } catch (_error) {
        return [];
      }
    }

    const params = {
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    };

    const result = await s3.listObjectsV2(params).promise();

    if (!result.Contents || result.Contents.length === 0) {
      return [];
    }

    return result.Contents.map((obj) => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
      url: `https://${BUCKET_NAME}.s3.amazonaws.com/${obj.Key}`,
    }));
  } catch (error) {
    logger.error(`listIncidentPhotos error: ${error.message}`);
    throw error;
  }
};

/**
 * Upload photo from base64 string
 * @param {string} base64String - Base64 encoded image
 * @param {string} filename - Filename
 * @param {string} folder - Folder path
 * @returns {Promise<string>} - Public URL
 */
exports.uploadPhotoFromBase64 = async (base64String, filename, folder = 'sos-photos') => {
  try {
    const buffer = Buffer.from(base64String, 'base64');
    return exports.uploadPhotoToS3(buffer, filename, folder);
  } catch (error) {
    logger.error(`uploadPhotoFromBase64 error: ${error.message}`);
    throw error;
  }
};
