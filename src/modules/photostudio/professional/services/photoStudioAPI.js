/**
 * Photo Studio API Service
 * Frontend service to interact with backend API
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const PHOTO_STUDIO_API = `${API_BASE_URL}/photo-studio`;

// Axios instance with authentication
const apiClient = axios.create({
  baseURL: PHOTO_STUDIO_API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Project Management API
 */

export const projectAPI = {
  // Create new project
  create: async (projectData) => {
    try {
      const response = await apiClient.post('/projects', projectData);
      return response.data;
    } catch (error) {
      throw handleAPIError(error);
    }
  },

  // Get user's projects
  getAll: async (options = {}) => {
    try {
      const response = await apiClient.get('/projects', { params: options });
      return response.data;
    } catch (error) {
      throw handleAPIError(error);
    }
  },

  // Get single project
  getById: async (projectId) => {
    try {
      const response = await apiClient.get(`/projects/${projectId}`);
      return response.data;
    } catch (error) {
      throw handleAPIError(error);
    }
  },

  // Update project
  update: async (projectId, updates) => {
    try {
      const response = await apiClient.put(`/projects/${projectId}`, updates);
      return response.data;
    } catch (error) {
      throw handleAPIError(error);
    }
  },

  // Delete project
  delete: async (projectId) => {
    try {
      const response = await apiClient.delete(`/projects/${projectId}`);
      return response.data;
    } catch (error) {
      throw handleAPIError(error);
    }
  },

  // Auto-save project (debounced)
  autoSave: async (projectId, data) => {
    try {
      const response = await apiClient.put(`/projects/${projectId}`, {
        canvasData: data.canvasData,
        layers: data.layers,
      });
      return response.data;
    } catch (error) {
      console.error('Auto-save failed:', error);
      return null;
    }
  },
};

/**
 * Image Processing API
 */

export const processingAPI = {
  // Remove background (server-side AI)
  removeBackground: async (imageData) => {
    try {
      const response = await apiClient.post('/process/remove-background', {
        imageData,
      });
      return response.data;
    } catch (error) {
      throw handleAPIError(error);
    }
  },

  // Batch process images
  batchProcess: async (images, operations) => {
    try {
      const response = await apiClient.post('/process/batch', {
        images,
        operations,
      });
      return response.data;
    } catch (error) {
      throw handleAPIError(error);
    }
  },

  // Get job status
  getJobStatus: async (jobId) => {
    try {
      const response = await apiClient.get(`/process/jobs/${jobId}`);
      return response.data;
    } catch (error) {
      throw handleAPIError(error);
    }
  },

  // Poll job status until complete
  pollJobStatus: async (jobId, onProgress, interval = 2000, timeout = 60000) => {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const result = await processingAPI.getJobStatus(jobId);
          
          if (onProgress) {
            onProgress(result.job);
          }

          if (result.job.status === 'completed') {
            resolve(result.job);
          } else if (result.job.status === 'failed') {
            reject(new Error(result.job.error || 'Processing failed'));
          } else if (Date.now() - startTime > timeout) {
            reject(new Error('Processing timeout'));
          } else {
            setTimeout(poll, interval);
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  },

  // Export image with high quality
  exportImage: async (imageData, options) => {
    try {
      const response = await apiClient.post('/export', {
        imageData,
        ...options,
      }, {
        responseType: 'blob',
      });

      return response.data;
    } catch (error) {
      throw handleAPIError(error);
    }
  },
};

/**
 * User Preferences API
 */

export const preferencesAPI = {
  // Get preferences
  get: async () => {
    try {
      const response = await apiClient.get('/preferences');
      return response.data;
    } catch (error) {
      throw handleAPIError(error);
    }
  },

  // Update preferences
  update: async (preferences) => {
    try {
      const response = await apiClient.put('/preferences', { preferences });
      return response.data;
    } catch (error) {
      throw handleAPIError(error);
    }
  },

  // Update single preference
  updateSingle: async (key, value) => {
    try {
      const response = await apiClient.put('/preferences', {
        preferences: { [key]: value },
      });
      return response.data;
    } catch (error) {
      throw handleAPIError(error);
    }
  },
};

/**
 * Cloud Storage API
 */

export const storageAPI = {
  // Upload image
  upload: async (imageData, projectId = null) => {
    try {
      const response = await apiClient.post('/upload', {
        imageData,
        projectId,
      });
      return response.data;
    } catch (error) {
      throw handleAPIError(error);
    }
  },

  // Upload multiple images
  uploadMultiple: async (images, projectId = null) => {
    try {
      const promises = images.map((imageData) =>
        storageAPI.upload(imageData, projectId)
      );
      const results = await Promise.all(promises);
      return results;
    } catch (error) {
      throw handleAPIError(error);
    }
  },
};

/**
 * Helper Functions
 */

function handleAPIError(error) {
  if (error.response) {
    // Server responded with error
    return new Error(error.response.data.error || error.response.data.message || 'API Error');
  } else if (error.request) {
    // Request made but no response
    return new Error('No response from server');
  } else {
    // Something else happened
    return new Error(error.message || 'Unknown error');
  }
}

/**
 * Utility Functions
 */

// Debounce function for auto-save
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Create auto-save function
export function createAutoSave(projectId, interval = 5000) {
  return debounce(async (data) => {
    try {
      await projectAPI.autoSave(projectId, data);
      console.log('Auto-saved at', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, interval);
}

/**
 * Hooks for React Components
 */

// Custom hook for projects
export function useProjects() {
  const [projects, setProjects] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const loadProjects = async (options) => {
    setLoading(true);
    setError(null);
    try {
      const result = await projectAPI.getAll(options);
      setProjects(result.projects);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { projects, loading, error, loadProjects };
}

// Custom hook for preferences
export function usePreferences() {
  const [preferences, setPreferences] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const loadPreferences = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await preferencesAPI.get();
      setPreferences(result.preferences);
      return result.preferences;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (newPrefs) => {
    setLoading(true);
    setError(null);
    try {
      const result = await preferencesAPI.update(newPrefs);
      setPreferences(result.preferences);
      return result.preferences;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { preferences, loading, error, loadPreferences, updatePreferences };
}

// Export all APIs
export default {
  projects: projectAPI,
  processing: processingAPI,
  preferences: preferencesAPI,
  storage: storageAPI,
};
