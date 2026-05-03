const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreatePresignedPostCommand, CreatePresignedPostCommandInput } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const logger = require('../utils/logger');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Default bucket for reminders
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'malabarbazaar-reminders';

const getPresignedUploadUrl = async (fileName, fileType, fileSize = 50 * 1024 * 1024) => {
  try {
    const command = new CreatePresignedPostCommand({
      Bucket: BUCKET_NAME,
      Key: `reminders/${Date.now()}-${fileName}`,
      Conditions: [
        ['content-length-range', 0, fileSize],
        ['starts-with', '$Content-Type', fileType],
      ],
      Fields: {
        'Content-Type': fileType,
      },
      Expires: 600, // 10 minutes
    });

    const signedUrl = await s3Client.send(command);
    return signedUrl;
  } catch (error) {
    logger.error('Error generating S3 presigned URL:', error);
    throw new Error('Failed to generate upload URL');
  }
};

const getPresignedDownloadUrl = async (key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    logger.error('Error generating S3 download URL:', error);
    throw new Error('Failed to generate download URL');
  }
};

const uploadToS3 = async (fileBuffer, fileName, fileType) => {
  try {
    const key = `reminders/${Date.now()}-${fileName}`;
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: fileType,
    });
    await s3Client.send(command);
    return key;
  } catch (error) {
    logger.error('Error uploading to S3:', error);
    throw error;
  }
};

const deleteFromS3 = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    await s3Client.send(command);
    logger.info(`Deleted S3 object: ${key}`);
  } catch (error) {
    logger.error('Error deleting from S3:', error);
    // Don't throw - deletion is best-effort
  }
};

module.exports = {
  s3Client,
  BUCKET_NAME,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  uploadToS3,
  deleteFromS3,
};

