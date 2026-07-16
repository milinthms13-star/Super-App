const mongoose = require('mongoose');

const linkPreviewSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 500
  },
  image: {
    type: String
  },
  siteName: {
    type: String
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// TTL index to auto-delete expired previews
linkPreviewSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('LinkPreview', linkPreviewSchema);
