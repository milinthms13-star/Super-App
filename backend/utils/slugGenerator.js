const crypto = require('crypto');

/**
 * Generate a URL-friendly slug from title and ID
 */
const generateSlug = (title = '', id = '') => {
  const baseSlug = String(title || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores/hyphens with single dash
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes

  const uniqueId = id ? String(id).slice(-8) : crypto.randomBytes(4).toString('hex');
  return `${baseSlug || 'listing'}-${uniqueId}`;
};

/**
 * Validate slug format
 */
const isValidSlug = (slug = '') => {
  const slugRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  return slugRegex.test(slug) && slug.length >= 5 && slug.length <= 200;
};

/**
 * Extract ID from slug
 */
const extractIdFromSlug = (slug = '') => {
  const parts = slug.split('-');
  if (parts.length > 0) {
    return parts[parts.length - 1]; // Last part is typically the ID
  }
  return null;
};

module.exports = {
  generateSlug,
  isValidSlug,
  extractIdFromSlug,
};
