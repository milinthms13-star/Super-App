const mongoose = require('mongoose');

const realEstateLeadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  channel: { 
    type: String, 
    enum: ['Chat', 'Call', 'Enquiry', 'Email'], 
    default: 'Enquiry' 
  },
  priority: { 
    type: String, 
    enum: ['Hot', 'Warm', 'Cold'], 
    default: 'Warm' 
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'site_visit_scheduled', 'negotiating', 'closed', 'lost'],
    default: 'new'
  },
  message: { type: String, trim: true },
  followUpAt: { type: Date, default: null },
  followUpNote: { type: String, trim: true },
  assignedTo: { type: String, trim: true },
  lastContactedAt: { type: Date, default: null },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const realEstateVisitSchema = new mongoose.Schema({
  id: { type: String, required: true, trim: true },
  leadId: { type: String, trim: true },
  buyerName: { type: String, required: true, trim: true },
  buyerEmail: { type: String, trim: true, lowercase: true },
  buyerPhone: { type: String, trim: true },
  scheduledAt: { type: Date, required: true },
  durationMinutes: { type: Number, min: 15, max: 240, default: 45 },
  mode: {
    type: String,
    enum: ['onsite', 'virtual'],
    default: 'onsite'
  },
  note: { type: String, trim: true },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  reminderAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const realEstateMessageSchema = new mongoose.Schema({
  from: { type: String, required: true, trim: true },
  senderEmail: { type: String, trim: true, lowercase: true },
  text: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

const realEstateReviewSchema = new mongoose.Schema({
  author: { type: String, required: true, trim: true },
  buyerEmail: { type: String, trim: true, lowercase: true },
  score: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  comment: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now }
});

const realEstateReportSchema = new mongoose.Schema({
  reporterEmail: { type: String, required: true, trim: true, lowercase: true },
  reporterName: { type: String, trim: true },
  reason: { type: String, required: true, trim: true },
  status: { 
    type: String, 
    enum: ['open', 'in-review', 'resolved', 'dismissed'], 
    default: 'open' 
  },
  createdAt: { type: Date, default: Date.now }
});

const realEstatePropertySchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 200 
  },
  price: { type: String, trim: true },
  priceLabel: { type: String, required: true, trim: true },
  priceValue: { type: Number, min: 0 },
  location: { type: String, required: true, trim: true },
  locality: { type: String, trim: true },
  type: { 
    type: String, 
    enum: [
      'Apartment',
      'Villa',
      'House',
      'Flat',
      'Plot',
      'Land',
      'Commercial',
      'Office',
      'Shop',
      'Warehouse',
      'Farm land',
      'Studio'
    ], 
    required: true 
  },
  intent: { 
    type: String, 
    enum: ['sale', 'rent', 'project'], 
    required: true 
  },
  areaSqft: { type: Number, required: true, min: 100 },
  bedrooms: { type: Number, min: 0 },
  bathrooms: { type: Number, min: 0 },
  furnishing: { 
    type: String, 
    enum: ['Furnished', 'Semi Furnished', 'Unfurnished'] 
  },
  description: { type: String, trim: true },
  amenities: [String],
  sellerName: { type: String, required: true, trim: true },
  sellerRole: { 
    type: String, 
    enum: ['Owner', 'Agent', 'Builder', 'Admin'], 
    required: true 
  },
  sellerEmail: { type: String, required: true, trim: true, lowercase: true },
  ownerId: { type: String, required: true },
  developer: { type: String, trim: true },
  listedBy: { type: String, required: true },
  verified: { type: Boolean, default: false },
  verificationStatus: { 
    type: String, 
    enum: ['Pending', 'Verified', 'Rejected', 'Flagged'], 
    default: 'Pending' 
  },
  featured: { type: Boolean, default: false },
  postedOn: { type: String },
  possession: { type: String },
  mapLabel: { type: String },
  rating: { type: Number, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  premiumPlan: { type: String },
  mediaCount: { type: Number, default: 0 },
  hasVideoTour: { type: Boolean, default: false },
  projectUnits: { type: Number },
  leads: [realEstateLeadSchema],
  visits: [realEstateVisitSchema],
  chatPreview: [realEstateMessageSchema],
  reviews: [realEstateReviewSchema],
  reports: [realEstateReportSchema],
  disputeCount: { type: Number, default: 0 },
  languageSupport: [{ type: String }],
  status: { 
    type: String, 
    enum: ['available', 'sold', 'rented', 'reserved'], 
    default: 'available' 
  }
}, {
  timestamps: true
});

// Indexes for performance
realEstatePropertySchema.index({ location: 1, type: 1, intent: 1 });
realEstatePropertySchema.index({ sellerEmail: 1 });
realEstatePropertySchema.index({ verified: 1, featured: 1 });
realEstatePropertySchema.index({ priceValue: 1 });
realEstatePropertySchema.index({ rating: -1, reviewCount: -1 });

module.exports = mongoose.models.RealEstateProperty || mongoose.model('RealEstateProperty', realEstatePropertySchema);
