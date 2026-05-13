const mongoose = require('mongoose');

const educationEnrollmentSchema = new mongoose.Schema(
  {
    enrollmentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    courseId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    courseTitle: {
      type: String,
      default: '',
      trim: true,
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentMethod: {
      type: String,
      default: 'none',
      trim: true,
    },
    paymentGateway: {
      type: String,
      default: 'none',
      trim: true,
    },
    status: {
      type: String,
      default: 'payment_pending',
      trim: true,
      index: true,
    },
    orderId: {
      type: String,
      default: '',
      trim: true,
    },
    paymentRecordId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    paymentVerifiedAt: {
      type: Date,
      default: null,
    },
    enrolledAt: {
      type: Date,
      default: null,
    },
    errorReason: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EducationEnrollment', educationEnrollmentSchema);

