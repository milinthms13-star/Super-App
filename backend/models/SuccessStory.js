const mongoose = require('mongoose');

const SuccessStorySchema = new mongoose.Schema({
  couple: {
    groom: {
      profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'MatrimonialProfile', required: true },
      name: { type: String, required: true },
      photo: String
    },
    bride: {
      profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'MatrimonialProfile', required: true },
      name: { type: String, required: true },
      photo: String
    }
  },
  story: {
    title: { type: String, required: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 5000 },
    howWeMet: { type: String, maxlength: 1000 },
    weddingDate: Date,
    location: String
  },
  photos: [{
    url: { type: String, required: true },
    caption: String,
    order: Number
  }],
  testimonial: {
    text: { type: String, maxlength: 1000 },
    author: { type: String, enum: ['groom', 'bride', 'both'], default: 'both' }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'published'],
    default: 'pending'
  },
  featured: { type: Boolean, default: false },
  featuredUntil: Date,
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    text: { type: String, maxlength: 500 },
    createdAt: { type: Date, default: Date.now }
  }],
  moderationNotes: String,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  publishedAt: Date,
  metadata: {
    matchedOn: Date,
    platformUsageDays: Number,
    messagesExchanged: Number
  }
}, {
  timestamps: true
});

SuccessStorySchema.index({ status: 1, publishedAt: -1 });
SuccessStorySchema.index({ featured: 1, featuredUntil: -1 });
SuccessStorySchema.index({ 'couple.groom.profileId': 1 });
SuccessStorySchema.index({ 'couple.bride.profileId': 1 });

module.exports = mongoose.model('SuccessStory', SuccessStorySchema);
