const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');

let gridfsBucket = null;

const initializeGridFS = () => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB connection is not ready for GridFS.');
  }

  gridfsBucket = new GridFSBucket(db, {
    bucketName: 'uploads',
  });

  return gridfsBucket;
};

const getGridFSBucket = () => {
  if (!gridfsBucket) {
    throw new Error('GridFS bucket has not been initialized.');
  }

  return gridfsBucket;
};

const toObjectId = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof ObjectId) {
    return value;
  }

  return ObjectId.isValid(String(value)) ? new ObjectId(String(value)) : null;
};

const uploadBufferToGridFS = ({
  buffer,
  filename,
  contentType,
  metadata = {},
}) =>
  new Promise((resolve, reject) => {
    const bucket = getGridFSBucket();
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata,
    });

    uploadStream.on('error', reject);
    uploadStream.on('finish', () => {
      resolve({
        id: uploadStream.id.toString(),
        filename: uploadStream.filename,
        contentType,
        metadata,
      });
    });

    uploadStream.end(buffer);
  });

const deleteGridFSFile = async (fileId) => {
  const objectId = toObjectId(fileId);
  if (!objectId) {
    return;
  }

  try {
    await getGridFSBucket().delete(objectId);
  } catch (error) {
    if (error?.message?.includes('FileNotFound')) {
      return;
    }

    throw error;
  }
};

const findGridFSFile = async (fileId) => {
  const objectId = toObjectId(fileId);
  if (!objectId) {
    return null;
  }

  const files = await getGridFSBucket().find({ _id: objectId }).toArray();
  return files[0] || null;
};

module.exports = {
  deleteGridFSFile,
  findGridFSFile,
  getGridFSBucket,
  initializeGridFS,
  toObjectId,
  uploadBufferToGridFS,
};
