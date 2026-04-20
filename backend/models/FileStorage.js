const mongoose = require('mongoose');

const fileStorageSchema = new mongoose.Schema(
  {
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    fileName: {
      type: String,
      required: true,
    },
    originalFileName: String,
    fileSize: Number,
    fileType: String,
    mimeType: String,
    s3Key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    s3Url: String,
    s3Bucket: String,
    status: {
      type: String,
      enum: ['uploading', 'completed', 'failed', 'deleted', 'archived'],
      default: 'uploading',
    },
    uploadProgress: Number,
    thumbnailUrl: String,
    thumbnailS3Key: String,
    // File metadata
    metadata: {
      width: Number,
      height: Number,
      duration: Number, // for videos/audio
      pages: Number, // for PDFs
      colorSpace: String,
      exif: Object,
    },
    encryption: {
      isEncrypted: Boolean,
      encryptionAlgorithm: String,
      encryptionKey: String,
    },
    accessControl: {
      isPublic: Boolean,
      allowedUsers: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      expiresAt: Date,
    },
    virusScanStatus: {
      type: String,
      enum: ['pending', 'scanned', 'infected', 'clean'],
      default: 'pending',
    },
    scanResult: Object,
    // CDN/Performance
    cdnUrl: String,
    cdnDistribution: String,
    cacheTtl: Number,
    // Retention policy
    retentionDays: Number,
    deleteAt: Date,
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

// TTL index - auto soft-delete after retention period
fileStorageSchema.index({ deleteAt: 1 }, { expireAfterSeconds: 0, sparse: true });

// Create indexes
fileStorageSchema.index({ chatId: 1, createdAt: -1 });
fileStorageSchema.index({ uploadedBy: 1, createdAt: -1 });
fileStorageSchema.index({ s3Key: 1 });

module.exports = mongoose.model('FileStorage', fileStorageSchema);
