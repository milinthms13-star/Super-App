const mongoose = require('mongoose');

const tourismLeadSchema = new mongoose.Schema({
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourismPackage',
  },
  packageTitle: {
    type: String,
    default: 'Custom request',
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourismVendor',
  },
  travelerName: {
    type: String,
    required: [true, 'Traveler name is required'],
    trim: true,
  },
  travelerPhone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
  },
  travelerEmail: {
    type: String,
    trim: true,
    lowercase: true,
  },
  travelerType: {
    type: String,
    enum: ['Couple', 'Family', 'Group', 'Solo', 'Student', 'NRI'],
    default: 'Family',
  },
  destination: {
    type: String,
    required: [true, 'Destination is required'],
    trim: true,
  },
  pickupCity: {
    type: String,
    trim: true,
  },
  hotelCategory: {
    type: String,
    enum: ['budget', '3-star', '4-star', 'luxury'],
  },
  startDate: {
    type: String,
  },
  days: {
    type: Number,
    min: 1,
    max: 30,
    default: 3,
  },
  budget: {
    type: Number,
    default: 0,
  },
  estimatedBudget: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'proposal_shared', 'negotiation', 'confirmed', 'lost'],
    default: 'new',
  },
  source: {
    type: String,
    enum: ['direct_booking', 'custom_request', 'vendor_import', 'admin_created'],
    default: 'direct_booking',
  },
  note: {
    type: String,
    trim: true,
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'hot'],
    default: 'normal',
  },
  proposalSentAt: {
    type: Date,
  },
  proposalDetails: {
    type: String,
  },
  convertedToBooking: {
    type: Boolean,
    default: false,
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourismBooking',
  },
  followUpDate: {
    type: Date,
  },
  assignedTo: {
    type: String,
  },
  statusHistory: [{
    status: String,
    changedAt: { type: Date, default: Date.now },
    notes: String,
  }],
}, {
  timestamps: true,
});

// Indexes
tourismLeadSchema.index({ vendorId: 1, status: 1 });
tourismLeadSchema.index({ travelerPhone: 1 });
tourismLeadSchema.index({ status: 1, priority: -1 });
tourismLeadSchema.index({ createdAt: -1 });
tourismLeadSchema.index({ followUpDate: 1 });

// Method to add status history
tourismLeadSchema.methods.addStatusHistory = function(status, notes) {
  this.statusHistory.push({
    status,
    changedAt: new Date(),
    notes,
  });
  this.status = status;
  return this.save();
};

// Method to convert to booking
tourismLeadSchema.methods.convertToBooking = function(bookingId) {
  this.convertedToBooking = true;
  this.bookingId = bookingId;
  this.status = 'confirmed';
  return this.save();
};

const TourismLead = mongoose.model('TourismLead', tourismLeadSchema);

module.exports = TourismLead;
