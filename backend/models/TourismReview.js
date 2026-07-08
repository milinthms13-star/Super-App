const mongoose = require('mongoose');

const tourismReviewSchema = new mongoose.Schema({
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourismPackage',
    required: true,
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourismBooking',
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewerName: {
    type: String,
    required: [true, 'Reviewer name is required'],
    trim: true,
  },
  reviewerEmail: {
    type: String,
    trim: true,
    lowercase: true,
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters'],
  },
  images: [{
    type: String,
  }],
  isVerified: {
    type: Boolean,
    default: false,
  },
  isVisible: {
    type: Boolean,
    default: true,
  },
  helpfulCount: {
    type: Number,
    default: 0,
  },
  reportCount: {
    type: Number,
    default: 0,
  },
  vendorResponse: {
    text: String,
    respondedAt: Date,
    respondedBy: String,
  },
}, {
  timestamps: true,
});

// Indexes
tourismReviewSchema.index({ packageId: 1, createdAt: -1 });
tourismReviewSchema.index({ userId: 1 });
tourismReviewSchema.index({ bookingId: 1 });
tourismReviewSchema.index({ rating: -1 });
tourismReviewSchema.index({ isVisible: 1 });

// Update package rating after review save
tourismReviewSchema.post('save', async function() {
  const TourismPackage = mongoose.model('TourismPackage');
  const pkg = await TourismPackage.findById(this.packageId);
  if (pkg) {
    await pkg.updateRating();
  }
});

// Update package rating after review delete
tourismReviewSchema.post('remove', async function() {
  const TourismPackage = mongoose.model('TourismPackage');
  const pkg = await TourismPackage.findById(this.packageId);
  if (pkg) {
    await pkg.updateRating();
  }
});

const TourismReview = mongoose.model('TourismReview', tourismReviewSchema);

module.exports = TourismReview;
