/**
 * Delivery Location Service
 * Handles delivery location verification, mapping, and distance calculation
 * Phase 2: Delivery Verification Feature
 */

const logger = require('./logger');

/**
 * Calculate distance between two coordinates (haversine formula)
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Validate if delivery location is within reasonable bounds of delivery address
 * @param {Object} deliveryLocation - { lat, lng, address }
 * @param {Object} expectedLocation - { lat, lng } - Expected delivery address coordinates
 * @param {number} maxDistanceKm - Maximum allowed distance in km (default: 2km)
 * @returns {Object} Validation result { isValid, distanceKm, message }
 */
const validateDeliveryLocation = (
  deliveryLocation = {},
  expectedLocation = {},
  maxDistanceKm = 2
) => {
  if (!deliveryLocation.lat || !deliveryLocation.lng) {
    return {
      isValid: false,
      distanceKm: null,
      message: 'Delivery location coordinates are missing.',
    };
  }

  if (!expectedLocation.lat || !expectedLocation.lng) {
    return {
      isValid: true, // Can't validate without expected location
      distanceKm: null,
      message: 'Expected delivery location not provided. Validation skipped.',
    };
  }

  const distanceKm = calculateDistance(
    expectedLocation.lat,
    expectedLocation.lng,
    deliveryLocation.lat,
    deliveryLocation.lng
  );

  if (distanceKm > maxDistanceKm) {
    return {
      isValid: false,
      distanceKm,
      message: `Delivery location is ${distanceKm.toFixed(2)}km away from delivery address. Maximum allowed: ${maxDistanceKm}km.`,
    };
  }

  return {
    isValid: true,
    distanceKm,
    message: `Delivery location verified. Distance: ${distanceKm.toFixed(2)}km from delivery address.`,
  };
};

/**
 * Build Google Maps link from coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} label - Optional label for the location
 * @returns {string} Google Maps URL
 */
const buildGoogleMapsLink = (lat, lng, label = '') => {
  const baseUrl = 'https://www.google.com/maps';
  if (label) {
    return `${baseUrl}?q=${lat},${lng}(${encodeURIComponent(label)})`;
  }
  return `${baseUrl}?q=${lat},${lng}`;
};

/**
 * Build Google Maps embed URL for iframe
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} Google Maps embed URL
 */
const buildGoogleMapsEmbedUrl = (lat, lng) => {
  return `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3600!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zM0M1NicyN1cuN1MrMDA0ttNOEc5NsTE=!5e0!3m2!1sen!2sin!4v`;
};

/**
 * Extract coordinates from address (mock implementation)
 * In production, integrate with Google Geocoding API or similar
 * @param {string} address - Delivery address
 * @returns {Object|null} { lat, lng } or null if not found
 */
const geocodeAddress = async (address) => {
  if (!address) {
    return null;
  }

  // Mock implementation - in production, call Google Geocoding API
  logger.info(`geocoding address: ${address}`);

  // For now, return null (will be implemented with actual geocoding API)
  return null;
};

/**
 * Reverse geocode coordinates to address (mock implementation)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object|null} { address, city, state, country } or null
 */
const reverseGeocodeCoordinates = async (lat, lng) => {
  if (!lat || !lng) {
    return null;
  }

  // Mock implementation - in production, call Google Reverse Geocoding API
  logger.info(`reverse geocoding coordinates: ${lat}, ${lng}`);

  // For now, return null (will be implemented with actual reverse geocoding API)
  return null;
};

/**
 * Format delivery location for display
 * @param {Object} deliveryLocation - { lat, lng, address, capturedAt }
 * @returns {string} Formatted location string
 */
const formatDeliveryLocation = (deliveryLocation = {}) => {
  if (!deliveryLocation) {
    return 'No delivery location recorded';
  }

  const parts = [];

  if (deliveryLocation.address) {
    parts.push(deliveryLocation.address);
  }

  if (deliveryLocation.lat && deliveryLocation.lng) {
    parts.push(`(${deliveryLocation.lat.toFixed(4)}, ${deliveryLocation.lng.toFixed(4)})`);
  }

  if (deliveryLocation.capturedAt) {
    parts.push(`at ${new Date(deliveryLocation.capturedAt).toLocaleString()}`);
  }

  return parts.length > 0 ? parts.join(' ') : 'No delivery location recorded';
};

module.exports = {
  calculateDistance,
  validateDeliveryLocation,
  buildGoogleMapsLink,
  buildGoogleMapsEmbedUrl,
  geocodeAddress,
  reverseGeocodeCoordinates,
  formatDeliveryLocation,
};
