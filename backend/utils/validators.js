const Joi = require('joi');

// RealEstate Schemas (extracted for reuse)
const realEstateListingCreateSchema = Joi.object({
  title: Joi.string().trim().min(3).max(140).required(),
  intent: Joi.string().valid('sale', 'rent', 'project').default('sale'),
  priceLabel: Joi.string().trim().min(2).max(80).required(),
  location: Joi.string().trim().min(2).max(120).required(),
  locality: Joi.string().allow('').trim().max(120).default(''),
  type: Joi.string().trim().min(2).max(60).required(),
  bedrooms: Joi.number().integer().min(0).max(20).default(0),
  bathrooms: Joi.number().integer().min(0).max(20).default(0),
  furnishing: Joi.string().trim().max(60).default('Semi Furnished'),
  areaSqft: Joi.number().min(100).max(100000).required(),
  description: Joi.string().allow('').trim().max(2000).default(''),
  possession: Joi.string().allow('').trim().max(120).default(''),
  amenities: Joi.array().items(Joi.string().trim().min(2).max(80)).max(20).default([]),
  featured: Joi.boolean().default(false),
  mediaCount: Joi.number().integer().min(0).max(50).default(0),
  hasVideoTour: Joi.boolean().default(false),
  status: Joi.string().valid('available', 'sold', 'rented').default('available'),
  roleMode: Joi.string().valid('owner', 'agent', 'builder').default('owner'),
  sellerName: Joi.string().allow('').trim().max(120).default(''),
  sellerEmail: Joi.string().allow('').trim().email({ tlds: { allow: false } }).default(''),
  sellerRole: Joi.string().allow('').trim().max(60).default(''),
  ownerId: Joi.string().allow('').trim().max(120).default(''),
});

const realEstateListingUpdateSchema = realEstateListingCreateSchema
  .fork([
    'title', 'priceLabel', 'location', 'type', 'areaSqft'
  ], (schema) => schema.optional())
  .min(1);

const realEstateEnquirySchema = Joi.object({
  message: Joi.string().allow('').trim().max(1000).default(''),
  channel: Joi.string().valid('Enquiry', 'Call', 'Chat').default('Enquiry'),
});

const realEstateMessageSchema = Joi.object({
  text: Joi.string().trim().min(1).max(1000).required(),
});

const realEstateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().min(3).max(500).required(),
});

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

