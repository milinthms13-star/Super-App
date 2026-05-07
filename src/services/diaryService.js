import axios from "axios";
import { API_BASE_URL } from "../utils/api";

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

export const buildLocalDateParam = (value = new Date()) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const buildTimezoneOffsetParam = (value = new Date()) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return String(date.getTimezoneOffset());
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

/**
 * Fetch diary calendar notes and reminders
 * @param {Object} options - Optional filters
 * @returns {Promise<Object>} - Response with calendar items
 */
export const fetchDiaryCalendarItems = async (options = {}) => {
  try {
    const params = {};
    if (options.date) params.date = options.date;
    if (options.month) params.month = options.month;
    if (options.startDate) params.startDate = options.startDate;
    if (options.endDate) params.endDate = options.endDate;
    if (options.limit) params.limit = options.limit;

    const response = await axiosInstance.get("/diary/calendar-items", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching diary calendar items:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch diary calendar items"
    );
  }
};

/**
 * Create a diary calendar note or reminder
 * @param {Object} itemData - Calendar item payload
 * @returns {Promise<Object>} - Created calendar item
 */
export const createDiaryCalendarItem = async (itemData) => {
  try {
    const response = await axiosInstance.post("/diary/calendar-items", itemData);
    return response.data;
  } catch (error) {
    console.error("Error creating diary calendar item:", error);
    throw new Error(
      error.response?.data?.message || "Failed to create diary calendar item"
    );
  }
};

/**
 * Update a diary calendar note or reminder
 * @param {string} itemId - Calendar item ID
 * @param {Object} itemData - Updated calendar item payload
 * @returns {Promise<Object>} - Updated calendar item
 */
export const updateDiaryCalendarItem = async (itemId, itemData) => {
  try {
    const response = await axiosInstance.put(`/diary/calendar-items/${itemId}`, itemData);
    return response.data;
  } catch (error) {
    console.error("Error updating diary calendar item:", error);
    throw new Error(
      error.response?.data?.message || "Failed to update diary calendar item"
    );
  }
};

/**
 * Delete a diary calendar note or reminder
 * @param {string} itemId - Calendar item ID
 * @returns {Promise<Object>} - Deletion confirmation
 */
export const deleteDiaryCalendarItem = async (itemId) => {
  try {
    const response = await axiosInstance.delete(`/diary/calendar-items/${itemId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting diary calendar item:", error);
    throw new Error(
      error.response?.data?.message || "Failed to delete diary calendar item"
    );
  }
};

/**
 * Fetch today's diary entries, notes, and reminders
 * @returns {Promise<Object>} - Today's items summary
 */
export const fetchTodaysSummary = async (date = new Date()) => {
  try {
    const response = await axiosInstance.get("/diary/today/summary", {
      params: {
        date: buildLocalDateParam(date),
        timezoneOffsetMinutes: buildTimezoneOffsetParam(date),
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching today's summary:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch today's summary"
    );
  }
};

/**
 * Fetch upcoming reminders
 * @param {number} daysAhead - Number of days to look ahead
 * @param {Date|string} startDate - Local day to use as the window start
 * @returns {Promise<Object>} - Upcoming reminders
 */
export const fetchUpcomingReminders = async (
  daysAhead = 7,
  startDate = new Date()
) => {
  try {
    const response = await axiosInstance.get("/diary/upcoming-reminders", {
      params: {
        daysAhead,
        startDate: buildLocalDateParam(startDate),
        timezoneOffsetMinutes: buildTimezoneOffsetParam(startDate),
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching upcoming reminders:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch upcoming reminders"
    );
  }
};

/**
 * Mark reminder as notified
 * @param {string} reminderId - Reminder ID
 * @returns {Promise<Object>} - Updated reminder
 */
export const markReminderAsNotified = async (reminderId) => {
  try {
    const response = await axiosInstance.put(
      `/diary/calendar-items/${reminderId}/mark-notified`
    );
    return response.data;
  } catch (error) {
    console.error("Error marking reminder as notified:", error);
    throw new Error(
      error.response?.data?.message || "Failed to mark reminder as notified"
    );
  }
};

// ============================================================================
// PHASE 5.1: VERSION HISTORY, TRASH, AUTOSAVE, APP LOCK
// ============================================================================

/**
 * Auto-save diary entry (creates version)
 * @param {string} entryId - Entry ID
 * @param {Object} data - Entry data to save
 * @returns {Promise<Object>} - Updated entry with version info
 */
export const autosaveDiaryEntry = async (entryId, data) => {
  try {
    const response = await axiosInstance.post(
      `/diary/${entryId}/autosave`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error auto-saving diary entry:", error);
    throw new Error(
      error.response?.data?.message || "Failed to auto-save entry"
    );
  }
};

/**
 * Fetch all versions of a diary entry
 * @param {string} entryId - Entry ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Entry versions
 */
export const getEntryVersions = async (entryId, options = {}) => {
  try {
    const params = {};
    if (options.limit) params.limit = options.limit;
    if (options.skip) params.skip = options.skip;

    const response = await axiosInstance.get(
      `/diary/${entryId}/versions`,
      { params }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching entry versions:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch versions"
    );
  }
};

/**
 * Restore a specific version of an entry
 * @param {string} entryId - Entry ID
 * @param {number} versionNumber - Version number to restore
 * @returns {Promise<Object>} - Restored entry
 */
export const restoreEntryVersion = async (entryId, versionNumber) => {
  try {
    const response = await axiosInstance.post(
      `/diary/${entryId}/versions/${versionNumber}/restore`
    );
    return response.data;
  } catch (error) {
    console.error("Error restoring version:", error);
    throw new Error(
      error.response?.data?.message || "Failed to restore version"
    );
  }
};

/**
 * Fetch all deleted entries (trash)
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Deleted entries
 */
export const getTrash = async (options = {}) => {
  try {
    const params = {};
    if (options.limit) params.limit = options.limit;
    if (options.skip) params.skip = options.skip;

    const response = await axiosInstance.get(
      "/diary/trash/list",
      { params }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching trash:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch trash"
    );
  }
};

/**
 * Recover an entry from trash
 * @param {string} entryId - Entry ID
 * @returns {Promise<Object>} - Recovered entry
 */
export const recoverFromTrash = async (entryId) => {
  try {
    const response = await axiosInstance.post(
      `/diary/${entryId}/recover`
    );
    return response.data;
  } catch (error) {
    console.error("Error recovering from trash:", error);
    throw new Error(
      error.response?.data?.message || "Failed to recover entry"
    );
  }
};

/**
 * Permanently delete an entry (bypasses trash)
 * @param {string} entryId - Entry ID
 * @returns {Promise<Object>} - Success response
 */
export const permanentlyDeleteEntry = async (entryId) => {
  try {
    const response = await axiosInstance.delete(
      `/diary/${entryId}/permanent`
    );
    return response.data;
  } catch (error) {
    console.error("Error permanently deleting entry:", error);
    throw new Error(
      error.response?.data?.message || "Failed to permanently delete entry"
    );
  }
};

// ============================================================================
// APP LOCK SERVICES
// ============================================================================

/**
 * Get app lock status
 * @returns {Promise<Object>} - App lock status
 */
export const getAppLockStatus = async () => {
  try {
    const response = await axiosInstance.get("/diary/app-lock/status");
    return response.data;
  } catch (error) {
    console.error("Error fetching app lock status:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch app lock status"
    );
  }
};

/**
 * Setup or update app lock PIN
 * @param {string} pin - PIN code (4-8 digits)
 * @returns {Promise<Object>} - Setup response
 */
export const setupAppLockPin = async (pin) => {
  try {
    const response = await axiosInstance.post(
      "/diary/app-lock/setup-pin",
      { pin }
    );
    return response.data;
  } catch (error) {
    console.error("Error setting up app lock:", error);
    throw new Error(
      error.response?.data?.message || "Failed to setup app lock"
    );
  }
};

/**
 * Verify app lock PIN
 * @param {string} pin - PIN code to verify
 * @returns {Promise<Object>} - Verification response
 */
export const verifyAppLockPin = async (pin) => {
  try {
    const response = await axiosInstance.post(
      "/diary/app-lock/verify-pin",
      { pin }
    );
    return response.data;
  } catch (error) {
    console.error("Error verifying app lock PIN:", error);
    throw new Error(
      error.response?.data?.message || "Failed to verify PIN"
    );
  }
};

/**
 * Disable app lock
 * @returns {Promise<Object>} - Disable response
 */
export const disableAppLock = async () => {
  try {
    const response = await axiosInstance.post(
      "/diary/app-lock/disable"
    );
    return response.data;
  } catch (error) {
    console.error("Error disabling app lock:", error);
    throw new Error(
      error.response?.data?.message || "Failed to disable app lock"
    );
  }
};

/**
 * Update auto-lock timeout
 * @param {number} timeoutMinutes - Timeout in minutes (1-120)
 * @returns {Promise<Object>} - Update response
 */
export const updateAutoLockTimeout = async (timeoutMinutes) => {
  try {
    const response = await axiosInstance.put(
      "/diary/app-lock/auto-lock-timeout",
      { timeoutMinutes }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating auto-lock timeout:", error);
    throw new Error(
      error.response?.data?.message || "Failed to update timeout"
    );
  }
};

// ============================================================================
// PHASE 5.2: END-TO-END ENCRYPTION, CLOUD BACKUP, AI FEATURES
// ============================================================================

/**
 * Enable E2E encryption for diary
 * @returns {Promise<Object>} - Encryption setup response
 */
export const enableEncryption = async () => {
  try {
    const response = await axiosInstance.post("/diary/encryption/enable");
    return response.data;
  } catch (error) {
    console.error("Error enabling encryption:", error);
    throw new Error(
      error.response?.data?.message || "Failed to enable encryption"
    );
  }
};

/**
 * Get encryption status
 * @returns {Promise<Object>} - Encryption status
 */
export const getEncryptionStatus = async () => {
  try {
    const response = await axiosInstance.get("/diary/encryption/status");
    return response.data;
  } catch (error) {
    console.error("Error checking encryption status:", error);
    throw new Error(
      error.response?.data?.message || "Failed to check encryption status"
    );
  }
};

/**
 * Encrypt a specific entry
 * @param {string} entryId - Entry ID
 * @returns {Promise<Object>} - Encryption response
 */
export const encryptEntry = async (entryId) => {
  try {
    const response = await axiosInstance.post(
      `/diary/${entryId}/encrypt`
    );
    return response.data;
  } catch (error) {
    console.error("Error encrypting entry:", error);
    throw new Error(
      error.response?.data?.message || "Failed to encrypt entry"
    );
  }
};

/**
 * Create backup of all diary entries
 * @param {string} backupType - 'manual' or 'scheduled'
 * @returns {Promise<Object>} - Backup creation response
 */
export const createBackup = async (backupType = 'manual') => {
  try {
    const response = await axiosInstance.post("/diary/backup/create", {
      backupType,
    });
    return response.data;
  } catch (error) {
    console.error("Error creating backup:", error);
    throw new Error(
      error.response?.data?.message || "Failed to create backup"
    );
  }
};

/**
 * Get list of backups
 * @param {Object} options - Query options
 * @param {number} options.limit - Limit results
 * @param {number} options.skip - Skip results
 * @param {string} options.status - Filter by status
 * @returns {Promise<Object>} - Backup list
 */
export const getBackupList = async (options = {}) => {
  try {
    const { limit = 10, skip = 0, status } = options;
    const query = new URLSearchParams({
      limit,
      skip,
    });
    if (status) query.append("status", status);

    const response = await axiosInstance.get(
      `/diary/backup/list?${query.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching backups:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch backups"
    );
  }
};

/**
 * Restore from backup
 * @param {string} backupId - Backup ID
 * @returns {Promise<Object>} - Restore response
 */
export const restoreBackup = async (backupId) => {
  try {
    const response = await axiosInstance.post(
      `/diary/backup/${backupId}/restore`
    );
    return response.data;
  } catch (error) {
    console.error("Error restoring backup:", error);
    throw new Error(
      error.response?.data?.message || "Failed to restore backup"
    );
  }
};

/**
 * Get AI-generated diary summary
 * @param {Object} options - Query options
 * @param {string} options.period - 'week', 'month', 'year'
 * @param {string} options.entryId - Specific entry ID for summary
 * @returns {Promise<Object>} - AI summary response
 */
export const getAISummary = async (options = {}) => {
  try {
    const { period = 'month', entryId } = options;
    const query = new URLSearchParams({ period });
    if (entryId) query.append("entryId", entryId);

    const response = await axiosInstance.get(
      `/diary/ai/summary?${query.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error getting AI summary:", error);
    throw new Error(
      error.response?.data?.message || "Failed to generate summary"
    );
  }
};

/**
 * Get AI mood insights and emotional patterns
 * @param {Object} options - Query options
 * @param {number} options.daysBack - Days to analyze
 * @returns {Promise<Object>} - Mood insights
 */
export const getMoodInsights = async (options = {}) => {
  try {
    const { daysBack = 30 } = options;
    const query = new URLSearchParams({ daysBack });

    const response = await axiosInstance.get(
      `/diary/ai/mood-insights?${query.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error getting mood insights:", error);
    throw new Error(
      error.response?.data?.message || "Failed to analyze mood patterns"
    );
  }
};

/**
 * Get personalized wellness recommendations
 * @param {Object} options - Query options
 * @param {number} options.daysBack - Days to consider
 * @returns {Promise<Object>} - Wellness recommendations
 */
export const getWellnessRecommendations = async (options = {}) => {
  try {
    const { daysBack = 30 } = options;
    const query = new URLSearchParams({ daysBack });

    const response = await axiosInstance.get(
      `/diary/ai/wellness-recommendations?${query.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error getting wellness recommendations:", error);
    throw new Error(
      error.response?.data?.message || "Failed to get recommendations"
    );
  }
};

/**
 * Extract action items from entry using AI
 * @param {string} entryId - Entry ID
 * @returns {Promise<Object>} - Action items
 */
export const extractActionItems = async (entryId) => {
  try {
    const response = await axiosInstance.get(
      `/diary/${entryId}/ai/action-items`
    );
    return response.data;
  } catch (error) {
    console.error("Error extracting action items:", error);
    throw new Error(
      error.response?.data?.message || "Failed to extract action items"
    );
  }
};

// ============================================================================
// PDF EXPORT FUNCTIONALITY
// ============================================================================

/**
 * Export a single diary entry as PDF
 * @param {Object} entry - Diary entry object with title, content, mood, date, etc.
 * @returns {Promise<void>} - Generates PDF download
 */
export const exportEntryAsPDF = (entry) => {
  return new Promise((resolve, reject) => {
    try {
      const jsPDF = window.jspdf?.jsPDF;
      if (!jsPDF) {
        throw new Error("jsPDF library not loaded");
      }

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const lineHeight = 7;
      let yPosition = margin;

      // Set fonts and colors
      const primaryColor = [102, 126, 234]; // #667eea
      const textColor = [51, 51, 51]; // Dark gray
      const accentColor = [200, 200, 200]; // Light gray

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(...primaryColor);
      doc.text(entry.title || "Untitled Entry", margin, yPosition);
      yPosition += 12;

      // Date and metadata
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...accentColor);
      const entryDate = new Date(entry.createdAt).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      doc.text(`Date: ${entryDate}`, margin, yPosition);
      yPosition += 6;

      if (entry.mood) {
        const moodEmoji = { happy: "😊", sad: "😢", angry: "😠", neutral: "😐", anxious: "😰", grateful: "🙏" }[entry.mood] || "📝";
        doc.text(`Mood: ${moodEmoji} ${entry.mood}`, margin, yPosition);
        yPosition += 6;
      }

      if (entry.category) {
        doc.text(`Category: ${entry.category}`, margin, yPosition);
        yPosition += 6;
      }

      if (entry.tags && entry.tags.length > 0) {
        doc.text(`Tags: ${entry.tags.join(", ")}`, margin, yPosition);
        yPosition += 6;
      }

      yPosition += 4;

      // Divider line
      doc.setDrawColor(...accentColor);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      // Content
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...textColor);

      // Strip HTML tags from content if needed
      let content = entry.content || "";
      content = content
        .replace(/<[^>]*>/g, "") // Remove HTML tags
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");

      const splitText = doc.splitTextToSize(content, pageWidth - 2 * margin);

      for (let i = 0; i < splitText.length; i++) {
        if (yPosition + lineHeight > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(splitText[i], margin, yPosition);
        yPosition += lineHeight;
      }

      // Footer with generation info
      yPosition = pageHeight - margin;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...accentColor);
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
        margin,
        yPosition
      );

      // Generate filename
      const fileName = `diary-${entry.title?.replace(/\s+/g, "-").toLowerCase() || "entry"}-${new Date(entry.createdAt).toISOString().split("T")[0]}.pdf`;

      // Download PDF
      doc.save(fileName);
      resolve();
    } catch (error) {
      console.error("Error exporting entry as PDF:", error);
      reject(new Error("Failed to export entry as PDF: " + error.message));
    }
  });
};

/**
 * Export multiple diary entries as PDF
 * @param {Array} entries - Array of diary entry objects
 * @param {Object} options - Export options
 * @param {string} options.title - Document title
 * @param {boolean} options.includeStats - Include mood statistics
 * @returns {Promise<void>} - Generates PDF download
 */
export const exportEntriesAsPDF = (entries, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const jsPDF = window.jspdf?.jsPDF;
      if (!jsPDF) {
        throw new Error("jsPDF library not loaded");
      }

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const lineHeight = 6;
      let yPosition = margin;

      const primaryColor = [102, 126, 234];
      const textColor = [51, 51, 51];
      const accentColor = [200, 200, 200];

      // Document Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(...primaryColor);
      doc.text(options.title || "My Diary Export", margin, yPosition);
      yPosition += 10;

      // Summary
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...accentColor);
      doc.text(
        `Total Entries: ${entries.length} | Generated: ${new Date().toLocaleDateString()}`,
        margin,
        yPosition
      );
      yPosition += 8;

      // Divider
      doc.setDrawColor(...accentColor);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Process each entry
      entries.forEach((entry, index) => {
        // Check if page break needed
        if (yPosition + 20 > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }

        // Entry header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(...primaryColor);
        doc.text(`${index + 1}. ${entry.title || "Untitled"}`, margin, yPosition);
        yPosition += 7;

        // Entry metadata
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...accentColor);
        const entryDate = new Date(entry.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
        let metadataText = `${entryDate}`;
        if (entry.mood) {
          metadataText += ` • ${entry.mood}`;
        }
        if (entry.category) {
          metadataText += ` • ${entry.category}`;
        }
        doc.text(metadataText, margin, yPosition);
        yPosition += 5;

        // Entry content preview (first 200 chars)
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...textColor);
        let preview = entry.content || "";
        preview = preview
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&")
          .substring(0, 200);
        if (entry.content && entry.content.length > 200) {
          preview += "...";
        }
        const previewLines = doc.splitTextToSize(preview, pageWidth - 2 * margin - 5);
        previewLines.forEach((line) => {
          if (yPosition + lineHeight > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin + 5, yPosition);
          yPosition += lineHeight;
        });

        yPosition += 3;

        // Entry divider
        doc.setDrawColor(...accentColor);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;
      });

      // Footer
      yPosition = pageHeight - margin;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...accentColor);
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} • Diary Export`,
        margin,
        yPosition
      );

      // Save
      const fileName = `diary-export-${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
      resolve();
    } catch (error) {
      console.error("Error exporting entries as PDF:", error);
      reject(new Error("Failed to export entries as PDF: " + error.message));
    }
  });
};

export default {
  buildLocalDateParam,
  buildTimezoneOffsetParam,
  fetchDiaryEntries,
  fetchDraftEntries,
  fetchTags,
  fetchMoodStats,
  fetchDiaryEntry,
  createDiaryEntry,
  updateDiaryEntry,
  deleteDiaryEntry,
  fetchEntriesByDate,
  fetchDiaryCalendarItems,
  createDiaryCalendarItem,
  updateDiaryCalendarItem,
  deleteDiaryCalendarItem,
  fetchTodaysSummary,
  fetchUpcomingReminders,
  markReminderAsNotified,
  // Phase 5.1: Version history, trash, autosave, app lock
  autosaveDiaryEntry,
  getEntryVersions,
  restoreEntryVersion,
  getTrash,
  recoverFromTrash,
  permanentlyDeleteEntry,
  getAppLockStatus,
  setupAppLockPin,
  verifyAppLockPin,
  disableAppLock,
  updateAutoLockTimeout,
  // Phase 5.2: E2EE, Cloud Backup, AI Features
  enableEncryption,
  getEncryptionStatus,
  encryptEntry,
  createBackup,
  getBackupList,
  restoreBackup,
  getAISummary,
  getMoodInsights,
  getWellnessRecommendations,
  extractActionItems,
  // PDF Export
  exportEntryAsPDF,
  exportEntriesAsPDF,
};
