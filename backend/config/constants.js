/**
 * Centralized configuration constants
 */

// Admin Configuration
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'mgdhanyamohan@gmail.com').trim().toLowerCase();

// Order Configuration
const ORDER_STATUSES = ['Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
const ORDER_STATUS_RANK = {
  Confirmed: 0,
  Packed: 1,
  Shipped: 2,
  Delivered: 3,
  Cancelled: 4,
};

// Pagination
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const PRODUCT_DEFAULT_LIMIT = 12;
const PRODUCT_MAX_LIMIT = 50;

// Currency & Payments
const ORDER_CURRENCY = 'INR';
const DELIVERY_BASE_FEE = 40;
const DELIVERY_PER_ITEM_FEE = 15;

// Time Constants
const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

// Commission & Settlement Configuration
const COMMISSION_CONFIG = {
  PLATFORM_COMMISSION_PERCENTAGE: parseFloat(process.env.PLATFORM_COMMISSION_PCT || '15'), // 15% default admin commission
  SETTLEMENT_MIN_AMOUNT: parseFloat(process.env.SETTLEMENT_MIN_AMOUNT || '100'), // Min amount to trigger settlement
  SETTLEMENT_CYCLE_DAYS: parseInt(process.env.SETTLEMENT_CYCLE_DAYS || '7'), // Weekly settlements
  SETTLEMENT_STATUSES: ['Pending', 'Processing', 'Completed', 'Failed', 'OnHold'],
  SETTLEMENT_PAYMENT_METHODS: ['bank_transfer', 'wallet_credit', 'check', 'manual'],
};

// Validation Patterns
const VALIDATION_PATTERNS = {
  PHONE: /^[0-9+\-\s()]{7,20}$/, // Phone number: 7-20 chars with digits, +, -, spaces, parentheses
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Basic email validation
  PINCODE: /^[0-9]{6}$/, // Indian pincode: exactly 6 digits
  PHONE_DIGITS_ONLY: /^\d{10}$/, // Extract 10 digits for validation
};

// Constraints
const CONSTRAINTS = {
  MAX_PRODUCT_TITLE_LENGTH: 200,
  MAX_PRODUCT_DESCRIPTION_LENGTH: 2000,
  MAX_CATEGORY_LENGTH: 100,
  MAX_BUSINESS_NAME_LENGTH: 100,
  MAX_ADDRESS_LENGTH: 500,
  MIN_PHONE_LENGTH: 7,
  MAX_PHONE_LENGTH: 20,
  MIN_PINCODE_LENGTH: 6,
  MAX_PINCODE_LENGTH: 6,
};

// Invitation Configuration (Admin-configurable)
const INVITATION_CONFIG = {
  EXPIRY_DAYS: parseInt(process.env.INVITATION_EXPIRY_DAYS || '30'),
  MAX_PENDING_INVITATIONS_PER_USER: 50,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 20,
};

module.exports = {
  ADMIN_EMAIL,
  ORDER_STATUSES,
  ORDER_STATUS_RANK,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  PRODUCT_DEFAULT_LIMIT,
  PRODUCT_MAX_LIMIT,
  ORDER_CURRENCY,
  DELIVERY_BASE_FEE,
  DELIVERY_PER_ITEM_FEE,
  MILLISECONDS_IN_DAY,
  COMMISSION_CONFIG,
  VALIDATION_PATTERNS,
  CONSTRAINTS,
  INVITATION_CONFIG,
};
