const mongoose = require('mongoose');

const tourismComplaintSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourismBooking',
  },
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourismPackage',
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourismVendor',
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  customerName: {
    type: String,
    trim: true,
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true,
  },
  customerPhone: {
    type: String,
    trim: true,
  },
  issue: {
    type: String,
    required: [true, 'Issue description is required'],
    trim: true,
  },
  category: {
    type: String,
    enum: ['service_quality', 'hotel_issue', 'transport_issue', 'refund_delay', 'vendor_behavior', 'safety_concern', 'other'],
    default: 'other',
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed', 'escalated'],
    default: 'open',
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  contact: {
    type: String,
  },
  attachments: [{
    type: String,
  }],
  resolution: {
    type: String,
  },
  resolvedAt: {
    type: Date,
  },
  resolvedBy: {
    type: String,
  },
  assignedTo: {
    type: String,
  },
  escalationTimeline: [{
    at: { type: Date, default: Date.now },
    event: String,
    details: String,
  }],
  internalNotes: [{
    note: String,
    addedBy: String,
    addedAt: { type: Date, default: Date.now },
  }],
  compensationOffered: {
    type: String,
  },
  compensationAmount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Indexes
tourismComplaintSchema.index({ bookingId: 1 });
tourismComplaintSchema.index({ packageId: 1 });
tourismComplaintSchema.index({ vendorId: 1 });
tourismComplaintSchema.index({ userId: 1 });
tourismComplaintSchema.index({ status: 1, priority: -1 });
tourismComplaintSchema.index({ createdAt: -1 });
tourismComplaintSchema.index({ severity: 1 });

// Method to add escalation event
tourismComplaintSchema.methods.addEscalation = function(event, details) {
  this.escalationTimeline.push({
    at: new Date(),
    event,
    details,
  });
  return this.save();
};

// Method to add internal note
tourismComplaintSchema.methods.addInternalNote = function(note, addedBy) {
  this.internalNotes.push({
    note,
    addedBy,
    addedAt: new Date(),
  });
  return this.save();
};

// Method to resolve complaint
tourismComplaintSchema.methods.resolve = function(resolution, resolvedBy) {
  this.status = 'resolved';
  this.resolution = resolution;
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
  return this.save();
};

const TourismComplaint = mongoose.model('TourismComplaint', tourismComplaintSchema);

module.exports = TourismComplaint;
