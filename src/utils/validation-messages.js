/**
 * User-friendly validation messages
 * Clear, actionable, never technical
 */
export const VALIDATION_MESSAGES = {
  // Username validation
  username: {
    tooShort: "Username must be at least 3 characters",
    tooLong: "Username must be 20 characters or less",
    invalidChars: "Use letters, numbers, underscores, and dashes only",
    taken: "This username is already taken",
    available: "✓ Username is available",
    checking: "Checking availability...",
  },
  
  // Email validation
  email: {
    invalid: "Please enter a valid email address",
    required: "Email is required",
    checking: "Checking email...",
  },
  
  // Phone validation
  phone: {
    invalid: "Please enter a valid phone number",
    tooShort: "Phone number must be at least 10 digits",
    required: "Phone number is required",
  },
  
  // Full name validation
  fullName: {
    required: "Please enter your full name",
    tooShort: "Full name must be at least 2 characters",
  },
  
  // OTP validation
  otp: {
    invalid: "OTP must be 6 digits",
    required: "Please enter the OTP",
    expired: "OTP has expired. Request a new one.",
  },
  
  // MPIN validation
  mpin: {
    invalid: "MPIN must be 4 digits",
    required: "Please enter your MPIN",
  },
  
  // Terms validation
  terms: {
    required: "You must agree to terms to continue",
  },
  
  // Network errors
  network: {
    offline: "You're offline. Please check your connection.",
    timeout: "Request timed out. Please try again.",
    serverError: "Server error. Please try again later.",
    tooManyAttempts: "Too many attempts. Please wait before trying again.",
  },
};

/**
 * Field validation result object
 */
export const createValidationResult = (isValid, message = "", status = null) => ({
  isValid,
  message,
  status, // 'checking', 'valid', 'invalid', 'warning'
});

/**
 * Network error handler
 */
export const handleNetworkError = (error) => {
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return {
        message: VALIDATION_MESSAGES.network.timeout,
        isRetryable: true,
        statusCode: 0,
      };
    }
    return {
      message: VALIDATION_MESSAGES.network.offline,
      isRetryable: true,
      statusCode: 0,
    };
  }

  const statusCode = error.response.status;
  
  // Rate limiting
  if (statusCode === 429) {
    const retryAfter = error.response.headers['retry-after'] || '60';
    return {
      message: `${VALIDATION_MESSAGES.network.tooManyAttempts} (${retryAfter}s)`,
      isRetryable: true,
      statusCode,
      retryAfter: parseInt(retryAfter),
    };
  }
  
  // Server errors
  if (statusCode >= 500) {
    return {
      message: VALIDATION_MESSAGES.network.serverError,
      isRetryable: true,
      statusCode,
    };
  }
  
  // Client errors (except 429)
  return {
    message: error.response.data?.message || `Error: ${statusCode}`,
    isRetryable: false,
    statusCode,
  };
};
