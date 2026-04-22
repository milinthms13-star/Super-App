/**
 * Geolocation and distance calculation utilities
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Convert degrees to radians
 */
const degreesToRadians = (degrees) => (degrees * Math.PI) / 180;

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
const calculateDistance = (coords1 = [0, 0], coords2 = [0, 0]) => {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;

  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

/**
 * Validate coordinates format [longitude, latitude]
 */
const isValidCoordinates = (coords = []) => {
  if (!Array.isArray(coords) || coords.length !== 2) {
    return false;
  }

  const [lon, lat] = coords;
  // Longitude: -180 to 180, Latitude: -90 to 90
  return lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
};

/**
 * Common Indian city coordinates
 */
const CITY_COORDINATES = {
  'trivandrum': [72.8479, 8.5241],
  'kochi': [76.2711, 9.9312],
  'thrissur': [76.2144, 10.5276],
  'kozhikode': [75.7821, 11.2588],
  'bengaluru': [77.5946, 12.9716],
  'hyderabad': [78.4711, 17.3850],
  'mumbai': [72.8479, 19.0760],
  'delhi': [77.2090, 28.7041],
  'pune': [73.8479, 18.5204],
  'chennai': [80.2707, 13.0827],
};

/**
 * Get coordinates for a city (fuzzy match)
 */
const getCoordinatesForCity = (cityName = '') => {
  const normalized = String(cityName || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '');

  // Exact match
  if (CITY_COORDINATES[normalized]) {
    return CITY_COORDINATES[normalized];
  }

  // Partial match
  const matches = Object.entries(CITY_COORDINATES).filter(
    ([key]) => key.includes(normalized) || normalized.includes(key)
  );

  if (matches.length > 0) {
    return matches[0][1];
  }

  // Default to null island (0, 0)
  return [0, 0];
};

/**
 * Create geospatial query filter
 */
const createGeoQuery = (centerCoords = [0, 0], radiusKm = 50) => {
  if (!isValidCoordinates(centerCoords)) {
    return null;
  }

  return {
    coordinates: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: centerCoords,
        },
        $maxDistance: radiusKm * 1000, // Convert to meters
      },
    },
  };
};

/**
 * Calculate bounding box for approximate location queries
 */
const calculateBoundingBox = (coords = [0, 0], radiusKm = 50) => {
  const latChange = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);
  const lonChange = (radiusKm / (EARTH_RADIUS_KM * Math.cos(degreesToRadians(coords[1])))) * (180 / Math.PI);

  return {
    minLat: coords[1] - latChange,
    maxLat: coords[1] + latChange,
    minLon: coords[0] - lonChange,
    maxLon: coords[0] + lonChange,
  };
};

module.exports = {
  calculateDistance,
  isValidCoordinates,
  getCoordinatesForCity,
  createGeoQuery,
  calculateBoundingBox,
  CITY_COORDINATES,
  EARTH_RADIUS_KM,
};
