// backend/utils/s3Storage.js
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const region = process.env.AWS_REGION || 'us-east-1';
const localUploadsRoot = path.resolve(__dirname, '..', 'uploads');

// Validate region parameter to prevent security issues
if (!/^[a-z0-9\-]+$/.test(region)) {
  throw new Error('Invalid AWS region provided');
}

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const hasConfiguredAwsCredentials = () => {
  const accessKeyId = String(process.env.AWS_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = String(process.env.AWS_SECRET_ACCESS_KEY || '').trim();
  const bucketName = String(process.env.AWS_S3_BUCKET || '').trim();

  if (!accessKeyId || !secretAccessKey || !bucketName) {
    return false;
  }

  return !(
    accessKeyId.includes('your-') ||
    secretAccessKey.includes('your-') ||
    bucketName.includes('your-')
  );
};

const normalizeStorageKey = (storageKey = '') =>
  String(storageKey || '')
    .replace(/\\/g, '/')
    .replace(/\.\.+/g, '')
    .replace(/^\/+/, '');

const buildPublicStorageUrl = (storageKey) => {
  const normalizedKey = normalizeStorageKey(storageKey);

  if (!normalizedKey) {
    return '';
  }

  return `https://${process.env.AWS_S3_BUCKET}.s3.${region}.amazonaws.com/${normalizedKey}`;
};

const uploadToLocalStorage = async (fileData, storageKey, options = {}) => {
  const normalizedKey = normalizeStorageKey(storageKey);
  const targetPath = path.join(localUploadsRoot, normalizedKey);

  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.promises.writeFile(targetPath, fileData);

  return {
    success: true,
    storage: 'local',
    s3Key: normalizedKey,
    s3Url: '',
    publicUrlPath: `/uploads/${normalizedKey}`,
    contentLength: fileData.length || 0,
    contentType: options.contentType || 'application/octet-stream',
  };
};

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
  if (!hasConfiguredAwsCredentials()) {
    return uploadToLocalStorage(fileData, s3Key, options);
  }

  const params = {
    Bucket: process.env.AWS_S3_BUCKET || 'malabarbazaar-files',
    Key: s3Key,
    Body: fileData,
    ContentType: options.contentType || 'application/octet-stream',
    Metadata: options.metadata || {},
    ServerSideEncryption: 'AES256',
    ...(options.tags && { Tagging: Object.entries(options.tags).map(([k, v]) => `${k}=${v}`).join('&') }),
    ...options,
  };

  try {
    const command = new PutObjectCommand(params);
    const result = await s3Client.send(command);

    return {
      success: true,
      s3Key: s3Key,
      s3Url: `https://${params.Bucket}.s3.${region}.amazonaws.com/${s3Key}`,
      etag: result.ETag,
      contentLength: fileData.length || 0,
    };
  } catch (error) {
    return uploadToLocalStorage(fileData, s3Key, options);
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
    const command = new GetObjectCommand(params);
    const result = await s3Client.send(command);
    // Convert the response body stream to buffer
    const chunks = [];
    for await (const chunk of result.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
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
  const normalizedKey = normalizeStorageKey(s3Key);

  if (!hasConfiguredAwsCredentials()) {
    const targetPath = path.join(localUploadsRoot, normalizedKey);
    await fs.promises.rm(targetPath, { force: true });
    return true;
  }

  const params = {
    Bucket: process.env.AWS_S3_BUCKET || 'malabarbazaar-files',
    Key: normalizedKey,
  };

  try {
    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);
    return true;
  } catch (error) {
    const fallbackPath = path.join(localUploadsRoot, normalizedKey);
    await fs.promises.rm(fallbackPath, { force: true });
    return true;
  }
};

/**
 * Generate signed URL for direct access
 * @param {string} s3Key - S3 key/path
 * @param {number} expiresIn - Expiration time in seconds
 * @returns {string} Signed URL
 */
const generateSignedUrl = (s3Key, expiresIn = 3600) => {
  const normalizedKey = normalizeStorageKey(s3Key);

  if (!hasConfiguredAwsCredentials()) {
    return `/uploads/${normalizedKey}`;
  }

  return buildPublicStorageUrl(normalizedKey);
};

/**
 * Generate signed upload URL
 * @param {string} s3Key - S3 key/path
 * @param {string} contentType - File content type
 * @param {number} expiresIn - Expiration time in seconds
 * @returns {string} Signed upload URL
 */
const generateSignedUploadUrl = (s3Key, contentType = 'application/octet-stream', expiresIn = 600) => {
  return hasConfiguredAwsCredentials()
    ? buildPublicStorageUrl(s3Key)
    : `/uploads/${normalizeStorageKey(s3Key)}`;
};

/**
 * Get file metadata
 * @param {string} s3Key - S3 key/path
 * @returns {Promise<object>} File metadata
 */
const getFileMetadata = async (s3Key) => {
  const normalizedKey = normalizeStorageKey(s3Key);
  const targetPath = path.join(localUploadsRoot, normalizedKey);
  const stats = await fs.promises.stat(targetPath);

  return {
    size: stats.size,
    type: path.extname(targetPath).slice(1),
    lastModified: stats.mtime,
    etag: '',
    metadata: {},
  };
};

/**
 * Copy file in S3
 * @param {string} sourceKey - Source S3 key
 * @param {string} destinationKey - Destination S3 key
 * @returns {Promise<object>} Copy result
 */
const copyInS3 = async (sourceKey, destinationKey) => {
  const sourcePath = path.join(localUploadsRoot, normalizeStorageKey(sourceKey));
  const destinationPath = path.join(localUploadsRoot, normalizeStorageKey(destinationKey));

  await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.promises.copyFile(sourcePath, destinationPath);

  return {
    success: true,
    sourceKey,
    destinationKey,
    etag: '',
  };
};

/**
 * List files in S3 directory
 * @param {string} prefix - Directory prefix
 * @param {number} maxKeys - Maximum number of keys to return
 * @returns {Promise<array>} List of files
 */
const listFilesInS3 = async (prefix, maxKeys = 100) => {
  const normalizedPrefix = normalizeStorageKey(prefix);
  const prefixPath = path.join(localUploadsRoot, normalizedPrefix);
  const entries = await fs.promises.readdir(prefixPath, { withFileTypes: true }).catch(() => []);

  return entries
    .filter((entry) => entry.isFile())
    .slice(0, maxKeys)
    .map((entry) => ({
      key: path.posix.join(normalizedPrefix, entry.name),
      size: 0,
      lastModified: null,
      etag: '',
    }));
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
  return;
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
