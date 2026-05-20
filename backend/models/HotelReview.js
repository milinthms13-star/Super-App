const mongoose = require('mongoose');

const hotelReviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'HotelProperty', required: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'HotelBooking', required: false, index: true },
    guestName: { type: String, default: 'Guest', trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', trim: true },
    photos: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ['Published', 'Pending', 'Rejected'],
      default: 'Published',
      index: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.HotelReview || mongoose.model('HotelReview', hotelReviewSchema);
