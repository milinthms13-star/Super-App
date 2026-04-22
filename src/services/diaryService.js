import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Configure axios to send cookies with requests
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const appendFormValue = (formData, key, value) => {
  if (value === undefined || value === null) {
    return;
  }

  if (Array.isArray(value) || (typeof value === "object" && !(value instanceof Date))) {
    formData.append(key, JSON.stringify(value));
    return;
  }

  formData.append(key, value);
};

/**
 * Fetch all diary entries
 * @param {Object} options - Query options
 * @param {string} options.category - Filter by category
 * @param {string} options.mood - Filter by mood
 * @param {string} options.search - Search query
 * @param {number} options.limit - Limit results
 * @param {number} options.skip - Skip results for pagination
 * @returns {Promise<Object>} - Response with diary entries and pagination info
 */
export const fetchDiaryEntries = async (options = {}) => {
  try {
    const params = {};
    if (options.category) params.category = options.category;
    if (options.mood) params.mood = options.mood;
    if (options.search) params.search = options.search;
    if (options.limit) params.limit = options.limit;
    if (options.skip) params.skip = options.skip;
    if (options.sortBy) params.sortBy = options.sortBy;

    const response = await axiosInstance.get("/diary", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching diary entries:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch diary entries"
    );
  }
};

/**
 * Fetch draft entries
 * @returns {Promise<Object>} - Response with draft entries
 */
export const fetchDraftEntries = async (options = {}) => {
  try {
    const params = {};
    if (options.limit) params.limit = options.limit;
    if (options.skip) params.skip = options.skip;

    const response = await axiosInstance.get("/diary/drafts", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching draft entries:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch draft entries"
    );
  }
};

/**
 * Fetch all unique tags
 * @returns {Promise<Object>} - Response with tags and their counts
 */
export const fetchTags = async () => {
  try {
    const response = await axiosInstance.get("/diary/tags");
    return response.data;
  } catch (error) {
    console.error("Error fetching tags:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch tags");
  }
};

/**
 * Fetch mood statistics
 * @param {number} days - Number of days to analyze (default: 30)
 * @returns {Promise<Object>} - Response with mood statistics
 */
export const fetchMoodStats = async (days = 30) => {
  try {
    const response = await axiosInstance.get("/diary/mood-stats", {
      params: { days }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching mood stats:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch mood statistics"
    );
  }
};

/**
 * Fetch single diary entry
 * @param {string} entryId - ID of entry to fetch
 * @returns {Promise<Object>} - Response with diary entry
 */
export const fetchDiaryEntry = async (entryId) => {
  try {
    const response = await axiosInstance.get(`/diary/${entryId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching diary entry:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch diary entry"
    );
  }
};

/**
 * Create a new diary entry (multipart for files)
 * @param {Object} entryData - Entry data
 * @param {File[]} files - Optional files
 * @returns {Promise<Object>} - Created diary entry
 */
export const createDiaryEntry = async (entryData, files = []) => {
  const formData = new FormData();
  Object.keys(entryData).forEach((key) => {
    appendFormValue(formData, key, entryData[key]);
  });
  files.forEach((file) => formData.append("attachments", file));
  
  try {
    const response = await axiosInstance.post("/diary", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error creating diary entry:", error);
    throw new Error(
      error.response?.data?.message || "Failed to create diary entry"
    );
  }
};

/**
 * Update an existing diary entry (multipart for files)
 * @param {string} entryId - ID of entry to update
 * @param {Object} entryData - Updated entry data
 * @param {File[]} files - Optional new files
 * @returns {Promise<Object>} - Updated diary entry
 */
export const updateDiaryEntry = async (entryId, entryData, files = []) => {
  const formData = new FormData();
  Object.keys(entryData).forEach((key) => {
    appendFormValue(formData, key, entryData[key]);
  });
  files.forEach((file) => formData.append("attachments", file));
  
  try {
    const response = await axiosInstance.put(`/diary/${entryId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error updating diary entry:", error);
    throw new Error(
      error.response?.data?.message || "Failed to update diary entry"
    );
  }
};

/**
 * Delete a diary entry
 * @param {string} entryId - ID of entry to delete
 * @returns {Promise<Object>} - Deletion confirmation
 */
export const deleteDiaryEntry = async (entryId) => {
  try {
    const response = await axiosInstance.delete(`/diary/${entryId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting diary entry:", error);
    throw new Error(
      error.response?.data?.message || "Failed to delete diary entry"
    );
  }
};

/**
 * Get entries for a specific date
 * @param {Date} date - Date to fetch entries for
 * @returns {Promise<Object>} - Entries for that date
 */
export const fetchEntriesByDate = async (date) => {
  try {
    const dateString = new Date(date).toISOString().split("T")[0];
    const response = await axiosInstance.get(`/diary/by-date/${dateString}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching entries by date:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch entries by date"
    );
  }
};

export default {
  fetchDiaryEntries,
  fetchDraftEntries,
  fetchTags,
  fetchMoodStats,
  fetchDiaryEntry,
  createDiaryEntry,
  updateDiaryEntry,
  deleteDiaryEntry,
  fetchEntriesByDate,
};
