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

module.exports = {
  realEstateListingCreateSchema,
  realEstateListingUpdateSchema,
  realEstateEnquirySchema,
  realEstateMessageSchema,
  realEstateReviewSchema,
  realEstateReportSchema,
  realEstateModerationSchema,
};

