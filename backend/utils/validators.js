/**
 * Centralized validation utilities
 */

const { VALIDATION_PATTERNS, CONSTRAINTS } = require('../config/constants');

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return VALIDATION_PATTERNS.EMAIL.test(email.trim());
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  
  // Check overall pattern
  if (!VALIDATION_PATTERNS.PHONE.test(trimmed)) return false;
  
  // Extract digits only and check if at least 10 digits
  const digitsOnly = trimmed.replace(/\D/g, '');
  return digitsOnly.length >= 10;
};

/**
 * Validate pincode format (Indian 6-digit pincode)
 * @param {string} pincode - Pincode to validate
 * @returns {boolean}
 */
const validatePincode = (pincode) => {
  if (!pincode || typeof pincode !== 'string') return false;
  return VALIDATION_PATTERNS.PINCODE.test(pincode.trim());
};

/**
 * Validate delivery address
 * @param {object} address - Address object
 * @returns {object} - { isValid: boolean, errors: string[] }
 */
const validateDeliveryAddress = (address) => {
  const errors = [];

  if (!address) {
    return { isValid: false, errors: ['Address is required'] };
  }

  if (!address.name || !address.name.trim()) {
    errors.push('Name is required');
  }

  if (!validatePhone(address.phone)) {
    errors.push('Invalid phone number format (at least 10 digits required)');
  }

  if (!address.street || !address.street.trim()) {
    errors.push('Street address is required');
  } else if (address.street.length > CONSTRAINTS.MAX_ADDRESS_LENGTH) {
    errors.push(`Street address exceeds maximum length of ${CONSTRAINTS.MAX_ADDRESS_LENGTH}`);
  }

  if (!validatePincode(address.pincode)) {
    errors.push('Invalid pincode format (6-digit Indian pincode required)');
  }

  if (!address.city || !address.city.trim()) {
    errors.push('City is required');
  }

  if (!address.state || !address.state.trim()) {
    errors.push('State is required');
  }

  if (!address.country || !address.country.trim()) {
    errors.push('Country is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate product data
 * @param {object} product - Product object
 * @returns {object} - { isValid: boolean, errors: string[] }
 */
const validateProductData = (product) => {
  const errors = [];

  if (!product.title || !product.title.trim()) {
    errors.push('Product title is required');
  } else if (product.title.length > CONSTRAINTS.MAX_PRODUCT_TITLE_LENGTH) {
    errors.push(`Product title exceeds maximum length of ${CONSTRAINTS.MAX_PRODUCT_TITLE_LENGTH}`);
  }

  if (product.description && product.description.length > CONSTRAINTS.MAX_PRODUCT_DESCRIPTION_LENGTH) {
    errors.push(`Product description exceeds maximum length of ${CONSTRAINTS.MAX_PRODUCT_DESCRIPTION_LENGTH}`);
  }

  if (!product.category || !product.category.trim()) {
    errors.push('Category is required');
  }

  if (product.mrp && product.mrp <= 0) {
    errors.push('MRP must be greater than 0');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate discount dates
 * @param {Date} startDate - Discount start date
 * @param {Date} endDate - Discount end date
 * @returns {object} - { isValid: boolean, error: string | null }
 */
const validateDiscountDates = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  if (start > end) {
    return { isValid: false, error: 'Discount start date must be before end date' };
  }

  if (start < now) {
    return { isValid: false, error: 'Discount start date cannot be in the past' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate product expiry date
 * @param {Date} manufacturingDate - Manufacturing date
 * @param {Date} expiryDate - Expiry date
 * @returns {object} - { isValid: boolean, error: string | null }
 */
const validateExpiryDate = (manufacturingDate, expiryDate) => {
  const mfgDate = new Date(manufacturingDate);
  const expDate = new Date(expiryDate);
  const now = new Date();

  if (mfgDate > expDate) {
    return { isValid: false, error: 'Manufacturing date must be before expiry date' };
  }

  if (expDate < now) {
    return { isValid: false, error: 'Product expiry date cannot be in the past' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate return request
 * @param {object} data - Return request data
 * @returns {object} - { isValid: boolean, errors: string[] }
 */
const validateReturnRequest = (data) => {
  const errors = [];

  if (!data.reason || !data.reason.trim()) {
    errors.push('Return reason is required');
  }

  const validReasons = ['Damaged', 'Not Satisfied', 'Wrong Item', 'Other'];
  if (data.reason && !validReasons.includes(data.reason)) {
    errors.push(`Invalid return reason. Allowed: ${validReasons.join(', ')}`);
  }

  if (data.comments && data.comments.length > 1000) {
    errors.push('Return comments exceed maximum length of 1000 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateEmail,
  validatePhone,
  validatePincode,
  validateDeliveryAddress,
  validateProductData,
  validateDiscountDates,
  validateExpiryDate,
  validateReturnRequest,
};
