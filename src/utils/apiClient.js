import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mb_auth_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('mb_auth_token');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// Sleep utility
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Check if error is retryable
const isRetryableError = (error) => {
  if (!error.response) {
    // Network error
    return true;
  }

  return RETRY_STATUS_CODES.includes(error.response.status);
};

// API call with retry logic
export const apiCallWithRetry = async (endpoint, method = 'GET', data = null, options = {}) => {
  const {
    retries = MAX_RETRIES,
    retryDelay = RETRY_DELAY,
    onRetry = null,
  } = options;

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const config = {
        method,
        url: endpoint,
        ...options,
      };

      if (data) {
        if (method === 'GET') {
          config.params = data;
        } else {
          config.data = data;
        }
      }

      const response = await apiClient(config);
      return response.data;
    } catch (error) {
      lastError = error;

      if (attempt < retries && isRetryableError(error)) {
        const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
        
        if (onRetry) {
          onRetry(attempt + 1, retries, delay);
        }

        await sleep(delay);
      } else {
        break;
      }
    }
  }

  throw lastError;
};

export default apiClient;
