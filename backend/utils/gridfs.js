const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');
const logger = require('../config/logger');

let gridFSBucket = null;
let mongoClient = null;

// Initialize GridFS bucket
const initializeGridFS = async () => {
  try {
    if (gridFSBucket) {
      return gridFSBucket;
    }

    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/malabarbazaar';
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();

    const db = mongoClient.db();
    gridFSBucket = new GridFSBucket(db, {
      bucketName: 'uploads',
    });

    logger.info('GridFS initialized successfully');
    return gridFSBucket;
  } catch (error) {
    logger.error('Failed to initialize GridFS:', error);
    throw error;
  }
};

// Upload buffer to GridFS
const uploadToGridFS = async (buffer, options = {}) => {
  try {
    const bucket = gridFSBucket || (await initializeGridFS());

    const { filename, contentType, metadata } = options;

    return new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(filename || `file-${Date.now()}`, {
        contentType: contentType || 'application/octet-stream',
        metadata: metadata || {},
      });

      uploadStream.on('error', (error) => {
        logger.error('GridFS upload error:', error);
        reject(error);
      });

      uploadStream.on('finish', () => {
        resolve({
          fileId: uploadStream.id.toString(),
          filename: uploadStream.filename,
          contentType: uploadStream.options.contentType,
        });
      });

      uploadStream.end(buffer);
    });
  } catch (error) {
    logger.error('Failed to upload to GridFS:', error);
    throw error;
  }
};

// Upload buffer to GridFS (alias for compatibility)
const uploadBufferToGridFS = uploadToGridFS;

// Delete file from GridFS
const deleteGridFSFile = async (fileId) => {
  try {
    const bucket = gridFSBucket || (await initializeGridFS());
    await bucket.delete(new ObjectId(fileId));
    logger.info(`Deleted file from GridFS: ${fileId}`);
  } catch (error) {
    logger.error(`Failed to delete file from GridFS: ${fileId}`, error);
    throw error;
  }
};

// Download file from GridFS
const downloadFromGridFS = async (fileId) => {
  try {
    const bucket = gridFSBucket || (await initializeGridFS());

    return new Promise((resolve, reject) => {
      const chunks = [];
      const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));

      downloadStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      downloadStream.on('error', (error) => {
        logger.error('GridFS download error:', error);
        reject(error);
      });

      downloadStream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
    });
  } catch (error) {
    logger.error(`Failed to download from GridFS: ${fileId}`, error);
    throw error;
  }
};

// Get file metadata from GridFS
const getGridFSFileMetadata = async (fileId) => {
  try {
    const bucket = gridFSBucket || (await initializeGridFS());
    const files = await bucket.find({ _id: new ObjectId(fileId) }).toArray();

    if (files.length === 0) {
      throw new Error('File not found');
    }

    return files[0];
  } catch (error) {
    logger.error(`Failed to get file metadata from GridFS: ${fileId}`, error);
    throw error;
  }
};

// Close GridFS connection
const closeGridFS = async () => {
  try {
    if (mongoClient) {
      await mongoClient.close();
      mongoClient = null;
      gridFSBucket = null;
      logger.info('GridFS connection closed');
    }
  } catch (error) {
    logger.error('Failed to close GridFS connection:', error);
    throw error;
  }
};

module.exports = {
  initializeGridFS,
  uploadToGridFS,
  uploadBufferToGridFS,
  deleteGridFSFile,
  downloadFromGridFS,
  getGridFSFileMetadata,
  closeGridFS,
};
