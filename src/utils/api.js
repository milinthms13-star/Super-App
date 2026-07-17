/**
 * API Utility Functions
 * Centralized utilities for API interactions
 */

// Get API base URL from environment or default
const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Default to same domain in production, localhost in development
  if (process.env.NODE_ENV === 'production') {
    return window.location.origin;
  }
  
  return 'http://localhost:5000';
};

// Export base URL constants for backward compatibility
export const BACKEND_BASE_URL = getApiBaseUrl();
export const API_BASE_URL = `${getApiBaseUrl()}/api`;
export const API_ORIGIN = getApiBaseUrl();

/**
 * Build full API URL from path
 * @param {string} path - API endpoint path (e.g., '/beauty-ai/tips')
 * @returns {string} Full API URL
 */
export const buildApiUrl = (path) => {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

/**
 * Handle API error responses
 * @param {Error} error - Error object from API call
 * @returns {object} Formatted error response
 */
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    return {
      success: false,
      error: error.response.data?.message || error.response.data?.error || 'Server error',
      status: error.response.status,
      data: error.response.data,
    };
  } else if (error.request) {
    // Request made but no response received
    return {
      success: false,
      error: 'Network error. Please check your connection.',
      status: 0,
    };
  } else {
    // Error in request configuration
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
      status: -1,
    };
  }
};

/**
 * Create query string from parameters object
 * @param {object} params - Parameters object
 * @returns {string} Query string
 */
export const buildQueryString = (params) => {
  const cleanParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  
  return new URLSearchParams(cleanParams).toString();
};

export default {
  buildApiUrl,
  handleApiError,
  buildQueryString,
  getApiBaseUrl,
};
