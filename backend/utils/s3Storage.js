// backend/utils/s3Storage.js
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Generate S3 key for file
 * @param {string} userId - User ID
 * @param {string} chatId - Chat ID
 * @param {string} fileName - Original file name
 * @returns {string} S3 key
 */
const generateS3Key = (userId, chatId, fileName) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

  return `messages/${userId}/${chatId}/${timestamp}-${randomString}-${sanitizedFileName}`;
};

/**
 * Upload file to S3
 * @param {Buffer|Stream} fileData - File content
 * @param {string} s3Key - S3 key/path
 * @param {object} options - Upload options
 * @returns {Promise<object>} Upload result
 */
const uploadToS3 = async (fileData, s3Key, options = {}) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET || 'malabarbazaar-files',
    Key: s3Key,
    Body: fileData,
    ContentType: options.contentType || 'application/octet-stream',
    Metadata: options.metadata || {},
    // Enable encryption
    ServerSideEncryption: 'AES256',
    // Optional: Add tags
    Tagging: options.tags ? Object.entries(options.tags).map(([k, v]) => `${k}=${v}`).join('&') : undefined,
    ...options,
  };

  try {
    const result = await s3.upload(params).promise();

    return {
      success: true,
      s3Key: result.Key,
      s3Url: result.Location,
      etag: result.ETag,
      contentLength: fileData.length || 0,
    };
  } catch (error) {
    throw new Error(`S3 upload failed: ${error.message}`);
  }
};

/**
 * Download file from S3
 * @param {string} s3Key - S3 key/path
 * @returns {Promise<Buffer>} File content
 */
const downloadFromS3 = async (s3Key) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET || 'malabarbazaar-files',
    Key: s3Key,
  };

  try {
    const result = await s3.getObject(params).promise();
    return result.Body;
  } catch (error) {
    throw new Error(`S3 download failed: ${error.message}`);
  }
};

/**
 * Delete file from S3
 * @param {string} s3Key - S3 key/path
 * @returns {Promise<boolean>} Success status
 */
const deleteFromS3 = async (s3Key) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET || 'malabarbazaar-files',
    Key: s3Key,
  };

  try {
    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    throw new Error(`S3 delete failed: ${error.message}`);
  }
};

/**
 * Generate signed URL for direct access
 * @param {string} s3Key - S3 key/path
 * @param {number} expiresIn - Expiration time in seconds
 * @returns {string} Signed URL
 */
const generateSignedUrl = (s3Key, expiresIn = 3600) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET || 'malabarbazaar-files',
    Key: s3Key,
    Expires: expiresIn,
  };

  return s3.getSignedUrl('getObject', params);
};

/**
 * Generate signed upload URL
 * @param {string} s3Key - S3 key/path
 * @param {string} contentType - File content type
 * @param {number} expiresIn - Expiration time in seconds
 * @returns {string} Signed upload URL
 */
const generateSignedUploadUrl = (s3Key, contentType = 'application/octet-stream', expiresIn = 600) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET || 'malabarbazaar-files',
    Key: s3Key,
    ContentType: contentType,
    Expires: expiresIn,
    ServerSideEncryption: 'AES256',
  };

  return s3.getSignedUrl('putObject', params);
};

/**
 * Get file metadata
 * @param {string} s3Key - S3 key/path
 * @returns {Promise<object>} File metadata
 */
const getFileMetadata = async (s3Key) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET || 'malabarbazaar-files',
    Key: s3Key,
  };

  try {
    const result = await s3.headObject(params).promise();

    return {
      size: result.ContentLength,
      type: result.ContentType,
      lastModified: result.LastModified,
      etag: result.ETag,
      metadata: result.Metadata,
    };
  } catch (error) {
    throw new Error(`Failed to get metadata: ${error.message}`);
  }
};

/**
 * Copy file in S3
 * @param {string} sourceKey - Source S3 key
 * @param {string} destinationKey - Destination S3 key
 * @returns {Promise<object>} Copy result
 */
const copyInS3 = async (sourceKey, destinationKey) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET || 'malabarbazaar-files',
    CopySource: `${process.env.AWS_S3_BUCKET || 'malabarbazaar-files'}/${sourceKey}`,
    Key: destinationKey,
    ServerSideEncryption: 'AES256',
  };

  try {
    const result = await s3.copyObject(params).promise();
    return {
      success: true,
      sourceKey,
      destinationKey,
      etag: result.CopyObjectResult.ETag,
    };
  } catch (error) {
    throw new Error(`S3 copy failed: ${error.message}`);
  }
};

/**
 * List files in S3 directory
 * @param {string} prefix - Directory prefix
 * @param {number} maxKeys - Maximum number of keys to return
 * @returns {Promise<array>} List of files
 */
const listFilesInS3 = async (prefix, maxKeys = 100) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET || 'malabarbazaar-files',
    Prefix: prefix,
    MaxKeys: maxKeys,
  };

  try {
    const result = await s3.listObjectsV2(params).promise();

    return (result.Contents || []).map((item) => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified,
      etag: item.ETag,
    }));
  } catch (error) {
    throw new Error(`S3 list failed: ${error.message}`);
  }
};

/**
 * Generate CloudFront URL (if using CDN)
 * @param {string} s3Key - S3 key/path
 * @returns {string} CloudFront URL
 */
const generateCdnUrl = (s3Key) => {
  if (!process.env.CLOUDFRONT_DOMAIN) {
    // Fallback to S3 URL if CloudFront not configured
    return `https://${process.env.AWS_S3_BUCKET || 'malabarbazaar-files'}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
  }

  return `https://${process.env.CLOUDFRONT_DOMAIN}/${s3Key}`;
};

/**
 * Enable CORS on S3 bucket
 * @returns {Promise<void>}
 */
const enableCorsOnS3 = async () => {
  const corsConfiguration = {
    CORSRules: [
      {
        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
        AllowedOrigins: [process.env.FRONTEND_URL || 'http://localhost:3000'],
        AllowedHeaders: ['*'],
        MaxAgeSeconds: 3000,
      },
    ],
  };

  const params = {
    Bucket: process.env.AWS_S3_BUCKET || 'malabarbazaar-files',
    CORSConfiguration: corsConfiguration,
  };

  try {
    await s3.putBucketCors(params).promise();
    console.log('[S3] CORS enabled successfully');
  } catch (error) {
    console.error('[S3] Failed to enable CORS:', error.message);
  }
};

module.exports = {
  generateS3Key,
  uploadToS3,
  downloadFromS3,
  deleteFromS3,
  generateSignedUrl,
  generateSignedUploadUrl,
  getFileMetadata,
  copyInS3,
  listFilesInS3,
  generateCdnUrl,
  enableCorsOnS3,
};
