const Joi = require('joi');

// RealEstate Schemas (extracted for reuse)
const realEstateListingCreateSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).required(),
  intent: Joi.string().valid('sale', 'rent', 'project').default('sale'),
  priceLabel: Joi.string().trim().min(2).max(80).when('postingType', {
    is: 'requirement',
    then: Joi.string().allow('').default(''),
    otherwise: Joi.string().trim().min(2).max(80).required(),
  }),
  priceValue: Joi.number().min(0).default(0),
  location: Joi.string().trim().min(2).max(120).required(),
  locality: Joi.string().allow('').trim().max(120).default(''),
  city: Joi.string().allow('').trim().max(120).default(''),
  state: Joi.string().allow('').trim().max(120).default(''),
  pincode: Joi.string().allow('').trim().max(12).default(''),
  type: Joi.string().trim().min(2).max(60).required(),
  bedrooms: Joi.number().integer().min(0).max(20).default(0),
  bathrooms: Joi.number().integer().min(0).max(20).default(0),
  furnishing: Joi.string().trim().max(60).default('Semi Furnished'),
  areaSqft: Joi.number().min(1).max(100000).when('postingType', {
    is: 'requirement',
    then: Joi.number().min(1).default(100),
    otherwise: Joi.number().min(100).max(100000).required(),
  }),
  carpetAreaSqft: Joi.number().min(0).allow(null).default(null),
  builtUpAreaSqft: Joi.number().min(0).allow(null).default(null),
  landSizeSqft: Joi.number().min(0).allow(null).default(null),
  floorNumber: Joi.number().integer().min(0).allow(null).default(null),
  totalFloors: Joi.number().integer().min(0).allow(null).default(null),
  parkingSpots: Joi.number().integer().min(0).allow(null).default(null),
  propertyAgeYears: Joi.number().min(0).allow(null).default(null),
  description: Joi.string().allow('').trim().max(3000).default(''),
  possession: Joi.string().allow('').trim().max(120).default(''),
  address: Joi.string().allow('').trim().max(300).default(''),
  landmark: Joi.string().allow('').trim().max(200).default(''),
  contactPhone: Joi.string().allow('').trim().max(20).default(''),
  whatsappNumber: Joi.string().allow('').trim().max(20).default(''),
  mapLocationLat: Joi.number().min(-90).max(90).allow(null).default(null),
  mapLocationLng: Joi.number().min(-180).max(180).allow(null).default(null),
  mapPreviewUrl: Joi.string().allow('').uri({ allowRelative: false }).max(500).default(''),
  amenities: Joi.array().items(Joi.string().trim().min(1).max(100)).max(50).default([]),
  mediaGallery: Joi.array().items(
    Joi.object({
      id: Joi.string().allow('').default(''),
      type: Joi.string().valid('image', 'video', 'floor-plan', 'brochure', 'map').default('image'),
      label: Joi.string().allow('').max(100).default(''),
      url: Joi.string().allow('').max(500).default(''),
      thumbnailUrl: Joi.string().allow('').max(500).default(''),
      order: Joi.number().integer().min(0).default(0),
    })
  ).max(20).default([]),
  videoTourUrl: Joi.string().allow('').max(500).default(''),
  floorPlanUrl: Joi.string().allow('').max(500).default(''),
  brochureUrl: Joi.string().allow('').max(500).default(''),
  featured: Joi.boolean().default(false),
  mediaCount: Joi.number().integer().min(0).max(50).default(0),
  hasVideoTour: Joi.boolean().default(false),
  readyToMove: Joi.boolean().default(false),
  underConstruction: Joi.boolean().default(false),
  reraNumber: Joi.string().allow('').trim().max(80).default(''),
  titleDeedStatus: Joi.string()
    .valid('pending', 'verified', 'rejected', 'not-applicable')
    .default('pending'),
  taxReceipt: Joi.boolean().default(false),
  buildingPermit: Joi.boolean().default(false),
  encumbranceCertificate: Joi.boolean().default(false),
  nearbySchoolKm: Joi.number().min(0).allow(null).default(null),
  nearbyHospitalKm: Joi.number().min(0).allow(null).default(null),
  nearbyMetroKm: Joi.number().min(0).allow(null).default(null),
  status: Joi.string().valid('available', 'sold', 'rented', 'suspended').default('available'),
  postingType: Joi.string().valid('property', 'requirement').default('property'),
  roleMode: Joi.string().valid('owner', 'agent', 'builder').default('owner'),
  sellerName: Joi.string().allow('').trim().max(120).default(''),
  sellerRole: Joi.string().allow('').trim().max(60).default(''),
  sellerEmail: Joi.string().allow('').trim().email({ tlds: { allow: false } }).default(''),
  ownerId: Joi.string().allow('').trim().max(120).default(''),
  developer: Joi.string().allow('').trim().max(120).default(''),
  languageSupport: Joi.array().items(Joi.string().trim().max(40)).max(10).default([]),
  // Requirement-specific
  minBudget: Joi.string().allow('').trim().max(80).default(''),
  maxBudget: Joi.string().allow('').trim().max(80).default(''),
  preferredLocations: Joi.string().allow('').trim().max(500).default(''),
  mustHaveAmenities: Joi.string().allow('').trim().max(500).default(''),
  moveInDate: Joi.string().allow('').trim().max(40).default(''),
});

const realEstateListingUpdateSchema = realEstateListingCreateSchema
  .fork(
    ['title', 'priceLabel', 'location', 'type', 'areaSqft'],
    (schema) => schema.optional()
  )
  .min(1);

const realEstateEnquirySchema = Joi.object({
  message: Joi.string().allow('').trim().max(1000).default(''),
  channel: Joi.string().valid('Enquiry', 'Call', 'Chat').default('Enquiry'),
});

const realEstateMessageSchema = Joi.object({
  text: Joi.string().trim().min(1).max(1000).required(),
});

const realEstateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5),
  score: Joi.number().integer().min(1).max(5),
  comment: Joi.string().trim().min(3).max(500).required(),
}).or('rating', 'score');

const realEstateReportSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(300).required(),
});

const realEstateModerationSchema = Joi.object({
  action: Joi.string().valid('approve', 'flag', 'reject').required(),
});

const validatePhone = (value = '') => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 10;
};

const validatePincode = (value = '') => /^\d{6}$/.test(String(value || '').trim());

const validateDeliveryAddress = (value = {}) => {
  const errors = [];

  if (!value || typeof value !== 'object') {
    return {
      isValid: false,
      errors: ['Delivery address details are required.'],
    };
  }

  if (!validatePhone(value.receiverPhone)) {
    errors.push('Receiver phone must contain at least 10 digits.');
  }

  if (!validatePincode(value.pincode)) {
    errors.push('Pincode must be a valid 6-digit Indian pincode.');
  }

  ['country', 'state', 'district', 'houseName', 'addressLine'].forEach((field) => {
    if (!String(value[field] || '').trim()) {
      errors.push(`${field} is required.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateReturnRequest = (value = {}) => {
  const errors = [];

  if (!value || typeof value !== 'object') {
    return {
      isValid: false,
      errors: ['Return request data is required.'],
    };
  }

  if (!String(value.itemId || '').trim()) {
    errors.push('itemId is required.');
  }

  if (!['damaged', 'not_satisfied', 'wrong_item'].includes(String(value.reason || '').trim())) {
    errors.push('reason must be one of damaged, not_satisfied, or wrong_item.');
  }

  if (value.details && String(value.details).length > 600) {
    errors.push('details cannot exceed 600 characters.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  realEstateListingCreateSchema,
  realEstateListingUpdateSchema,
  realEstateEnquirySchema,
  realEstateMessageSchema,
  realEstateReviewSchema,
  realEstateReportSchema,
  realEstateModerationSchema,
  validatePhone,
  validatePincode,
  validateDeliveryAddress,
  validateReturnRequest,
};

