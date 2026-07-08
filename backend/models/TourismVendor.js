const mongoose = require('mongoose');

const tourismVendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vendor name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    unique: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  businessName: {
    type: String,
    trim: true,
  },
  businessAddress: {
    type: String,
    trim: true,
  },
  gstNumber: {
    type: String,
    trim: true,
    uppercase: true,
  },
  panNumber: {
    type: String,
    trim: true,
    uppercase: true,
  },
  kycStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
  },
  kycDocuments: [{
    documentType: {
      type: String,
      enum: ['pan', 'gst', 'business_license', 'address_proof', 'bank_statement'],
    },
    documentUrl: String,
    uploadedAt: Date,
    verifiedAt: Date,
  }],
  verificationBadge: {
    type: Boolean,
    default: false,
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  riskFlag: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low',
  },
  emergencyContact: {
    type: String,
    trim: true,
  },
  insuranceSupport: {
    type: Boolean,
    default: false,
  },
  bankDetails: {
    accountHolderName: String,
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    branchName: String,
    verifiedAt: Date,
  },
  commissionRate: {
    type: Number,
    default: 8,
    min: 0,
    max: 30,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  totalBookings: {
    type: Number,
    default: 0,
  },
  totalRevenue: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isSuspended: {
    type: Boolean,
    default: false,
  },
  suspensionReason: {
    type: String,
  },
  notes: {
    type: String,
  },
}, {
  timestamps: true,
});

// Indexes
tourismVendorSchema.index({ email: 1 });
tourismVendorSchema.index({ kycStatus: 1, approvalStatus: 1 });
tourismVendorSchema.index({ userId: 1 });
tourismVendorSchema.index({ isActive: 1, isSuspended: 1 });

// Virtual for packages
tourismVendorSchema.virtual('packages', {
  ref: 'TourismPackage',
  localField: '_id',
  foreignField: 'vendorId',
});

// Method to update verification badge
tourismVendorSchema.methods.updateVerificationBadge = function() {
  this.verificationBadge = this.kycStatus === 'verified' && this.approvalStatus === 'approved';
  return this.save();
};

const TourismVendor = mongoose.model('TourismVendor', tourismVendorSchema);

module.exports = TourismVendor;
