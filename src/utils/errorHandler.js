// Parse API error to user-friendly message
export const parseApiError = (error) => {
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  // Network error
  if (!error.response) {
    if (error.message === 'Network Error') {
      return 'Network connection failed. Please check your internet connection.';
    }
    return error.message || 'Unable to connect to the server. Please try again.';
  }

  // Server error response
  const { response } = error;

  // Validation errors
  if (response.status === 400 && response.data?.error) {
    return response.data.error;
  }

  // Unauthorized
  if (response.status === 401) {
    return 'Your session has expired. Please log in again.';
  }

  // Forbidden
  if (response.status === 403) {
    return 'You do not have permission to perform this action.';
  }

  // Not found
  if (response.status === 404) {
    return 'The requested resource was not found.';
  }

  // Rate limit
  if (response.status === 429) {
    return 'Too many requests. Please slow down and try again later.';
  }

  // Server errors
  if (response.status >= 500) {
    return 'Server error. Our team has been notified. Please try again later.';
  }

  // Generic error
  return response.data?.error || response.data?.message || 'An error occurred. Please try again.';
};

// Check if error is temporary (retryable)
export const isTemporaryError = (error) => {
  if (!error.response) {
    return true; // Network errors are typically temporary
  }

  const status = error.response.status;
  return status === 408 || status === 429 || status >= 500;
};

// Check if user is offline
export const isOffline = () => {
  return !navigator.onLine;
};

// Format validation errors
export const formatValidationErrors = (errors) => {
  if (Array.isArray(errors)) {
    return errors.join(', ');
  }

  if (typeof errors === 'object') {
    return Object.values(errors).flat().join(', ');
  }

  return String(errors);
};

export default {
  parseApiError,
  isTemporaryError,
  isOffline,
  formatValidationErrors,
};
