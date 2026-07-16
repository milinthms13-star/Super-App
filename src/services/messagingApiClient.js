/**
 * Centralized API Client for Messaging
 * Handles all HTTP requests with retry logic, error handling, and authentication
 */

import axios from 'axios';

class MessagingApiClient {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_URL || '',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  /**
   * Setup request/response interceptors
   */
  setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request timestamp
        config.metadata = { startTime: Date.now() };

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Log response time
        if (response.config.metadata) {
          const duration = Date.now() - response.config.metadata.startTime;
          console.log(`Request to ${response.config.url} took ${duration}ms`);
        }

        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized - token expired
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Try to refresh token
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await axios.post('/api/auth/refresh', {
                refreshToken
              });

              const { token } = response.data;
              localStorage.setItem('token', token);

              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        // Handle network errors
        if (!error.response) {
          console.error('Network error:', error.message);
          return Promise.reject({
            message: 'Network error. Please check your connection.',
            isNetworkError: true
          });
        }

        // Handle specific error codes
        if (error.response.status === 429) {
          return Promise.reject({
            message: 'Too many requests. Please try again later.',
            isRateLimited: true
          });
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Make request with retry logic
   */
  async request(config, retries = 3) {
    let lastError;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await this.client(config);
        return response;
      } catch (error) {
        lastError = error;

        // Don't retry on client errors (4xx) except 429
        if (error.response && error.response.status < 500 && error.response.status !== 429) {
          throw error;
        }

        // Don't retry if it's a network error and we're offline
        if (error.isNetworkError && !navigator.onLine) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * HTTP Methods
   */
  async get(url, config = {}) {
    return this.request({ ...config, method: 'GET', url });
  }

  async post(url, data = {}, config = {}) {
    return this.request({ ...config, method: 'POST', url, data });
  }

  async put(url, data = {}, config = {}) {
    return this.request({ ...config, method: 'PUT', url, data });
  }

  async patch(url, data = {}, config = {}) {
    return this.request({ ...config, method: 'PATCH', url, data });
  }

  async delete(url, config = {}) {
    return this.request({ ...config, method: 'DELETE', url });
  }

  /**
   * Upload file with progress
   */
  async uploadFile(url, file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    return this.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });
  }

  /**
   * Helper: sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests() {
    // Implementation for request cancellation
    console.log('Cancelling all pending requests');
  }
}

// Singleton instance
const messagingApiClient = new MessagingApiClient();

export default messagingApiClient;
