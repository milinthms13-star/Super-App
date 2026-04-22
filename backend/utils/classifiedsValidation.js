const Joi = require('joi');
const { validateContentQuality } = require('./spamDetector');

/**
 * Comprehensive validation schemas for classified listings
 */

// Main listing creation/update schema
const classifiedListingSchema = Joi.object({
  title: Joi.string().trim().min(5).max(140).required().error(
    new Error('Title must be between 5 and 140 characters')
  ),
  description: Joi.string().trim().min(20).max(1500).required().error(
    new Error('Description must be between 20 and 1500 characters')
  ),
  price: Joi.number().min(1).required().error(
    new Error('Price must be a positive number')
  ),
  category: Joi.string().trim().min(2).max(60).required(),
  subcategory: Joi.string().trim().max(60).allow(''),
  location: Joi.string().trim().min(2).max(120).required(),
  locality: Joi.string().trim().max(120).allow(''),
  condition: Joi.string()
    .valid('New', 'Like New', 'Used', 'Refurbished')
    .default('Used'),
  tags: Joi.array().items(Joi.string().trim().max(30)).max(10).default([]),
  contactOptions: Joi.array()
    .items(Joi.string().valid('Chat', 'Call', 'Email', 'WhatsApp'))
    .min(1)
    .default(['Chat']),
  mediaCount: Joi.number().integer().min(1).max(12).default(1),
  plan: Joi.string()
    .valid('free', 'featured', 'urgent', 'subscription')
    .default('free'),
  languageSupport: Joi.array()
    .items(Joi.string().trim())
    .default(['English', 'Malayalam']),
  autoRenew: Joi.boolean().default(false),
  isDraft: Joi.boolean().default(false),
}).unknown(false);

// Message schema
const classifiedMessageSchema = Joi.object({
  text: Joi.string().trim().min(1).max(1000).required().error(
    new Error('Message must be between 1 and 1000 characters')
  ),
  attachments: Joi.array().items(Joi.object()).max(5).default([]),
});

// Report schema
const classifiedReportSchema = Joi.object({
  reason: Joi.string()
    .trim()
    .min(10)
    .max(300)
    .required()
    .error(new Error('Report reason must be between 10 and 300 characters')),
});

// Review schema
const classifiedReviewSchema = Joi.object({
  buyerName: Joi.string().trim().min(2).max(60).required(),
  rating: Joi.number().integer().min(1).max(5).required().error(
    new Error('Rating must be between 1 and 5')
  ),
  comment: Joi.string().trim().max(500).allow(''),
  aspectRatings: Joi.object({
    accuracy: Joi.number().integer().min(1).max(5),
    communication: Joi.number().integer().min(1).max(5),
    condition: Joi.number().integer().min(1).max(5),
  }).unknown(false),
});

// Moderation schema
const classifiedModerationSchema = Joi.object({
  action: Joi.string()
    .valid('approve', 'flag', 'reject')
    .required()
    .error(new Error('Invalid moderation action')),
  moderationNotes: Joi.string().trim().max(500).allow(''),
});

// Search query schema
const classifiedSearchSchema = Joi.object({
  text: Joi.string().trim().max(200).allow(''),
  category: Joi.string().trim().allow(''),
  location: Joi.string().trim().allow(''),
  minPrice: Joi.number().min(0).default(0),
  maxPrice: Joi.number().min(0).default(Infinity),
  condition: Joi.string().allow(''),
  sortBy: Joi.string()
    .valid('featured', 'latest', 'price-low', 'price-high', 'popular')
    .default('featured'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(false);

// Filter validation
const classifiedFilterSchema = Joi.object({
  category: Joi.string().allow('All', ''),
  location: Joi.string().allow('All', ''),
  condition: Joi.string().allow('All', ''),
  priceRange: Joi.string().allow('All', ''),
  searchText: Joi.string().trim().max(200).allow(''),
  sortBy: Joi.string()
    .valid('featured', 'latest', 'price-low', 'price-high', 'popular')
    .default('featured'),
}).unknown(false);

/**
 * Validate listing creation/update
 */
const validateListingData = async (data) => {
  const errors = [];

  // Schema validation
  const { error, value } = classifiedListingSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    error.details.forEach((detail) => {
      errors.push(detail.message);
    });
  }

  // Content quality validation
  const contentErrors = validateContentQuality(data);
  errors.push(...contentErrors);

  // Price validation
  if (data.price && (data.price < 1 || data.price > 10000000)) {
    errors.push('Price must be between ₹1 and ₹1,00,00,000');
  }

  // Category validation
  const validCategories = [
    'Vehicles',
    'Electronics',
    'Real Estate',
    'Jobs',
    'Services',
    'Fashion',
    'Home & Furniture',
    'Books & Media',
    'Sports',
    'Pets',
    'General',
  ];

  if (data.category && !validCategories.includes(data.category)) {
    errors.push(`Invalid category. Valid options: ${validCategories.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: value,
  };
};

/**
 * Validate message
 */
const validateMessage = (data) => {
  const { error, value } = classifiedMessageSchema.validate(data, {
    abortEarly: false,
  });

  if (error) {
    return {
      isValid: false,
      errors: error.details.map((d) => d.message),
      data: null,
    };
  }

  return { isValid: true, errors: [], data: value };
};

/**
 * Validate report
 */
const validateReport = (data) => {
  const { error, value } = classifiedReportSchema.validate(data, {
    abortEarly: false,
  });

  if (error) {
    return {
      isValid: false,
      errors: error.details.map((d) => d.message),
      data: null,
    };
  }

  return { isValid: true, errors: [], data: value };
};

/**
 * Validate review
 */
const validateReview = (data) => {
  const { error, value } = classifiedReviewSchema.validate(data, {
    abortEarly: false,
  });

  if (error) {
    return {
      isValid: false,
      errors: error.details.map((d) => d.message),
      data: null,
    };
  }

  return { isValid: true, errors: [], data: value };
};

/**
 * Validate search query
 */
const validateSearchQuery = (query) => {
  const { error, value } = classifiedSearchSchema.validate(query, {
    abortEarly: false,
  });

  if (error) {
    return {
      isValid: false,
      errors: error.details.map((d) => d.message),
      data: null,
    };
  }

  return { isValid: true, errors: [], data: value };
};

/**
 * Validate filters
 */
const validateFilters = (filters) => {
  const { error, value } = classifiedFilterSchema.validate(filters, {
    abortEarly: false,
  });

  if (error) {
    return {
      isValid: false,
      errors: error.details.map((d) => d.message),
      data: null,
    };
  }

  return { isValid: true, errors: [], data: value };
};

module.exports = {
  validateListingData,
  validateMessage,
  validateReport,
  validateReview,
  validateSearchQuery,
  validateFilters,
  classifiedListingSchema,
  classifiedMessageSchema,
  classifiedReportSchema,
  classifiedReviewSchema,
  classifiedModerationSchema,
  classifiedSearchSchema,
  classifiedFilterSchema,
};
