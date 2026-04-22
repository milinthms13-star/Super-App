import axios from "axios";
import { normalizeReminderRecord, toDateInputValue } from "../modules/reminderalert/reminderUtils";
import { API_BASE_URL } from "../utils/api";

// Configure axios to send cookies with requests
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const normalizeReminderResponse = (responseData) => {
  if (Array.isArray(responseData?.data)) {
    return {
      ...responseData,
      data: responseData.data.map((reminder) => normalizeReminderRecord(reminder)),
    };
  }

  if (responseData?.data && typeof responseData.data === "object") {
    return {
      ...responseData,
      data: normalizeReminderRecord(responseData.data),
    };
  }

  return responseData;
};

/**
 * Fetch all reminders for the current user
 * @param {Object} options - Query options
 * @param {string} options.category - Filter by category (Work, Personal, Urgent, All)
 * @param {boolean} options.completed - Filter by completion status
 * @param {number} options.limit - Limit results
 * @param {number} options.skip - Skip results for pagination
 * @returns {Promise<Object>} - Response with reminders and pagination info
 */
export const fetchReminders = async (options = {}) => {
  try {
    const params = {};
    if (options.category && options.category !== "All") {
      params.category = options.category;
    }
    if (options.completed !== undefined) {
      params.completed = options.completed;
    }
    if (options.limit) {
      params.limit = options.limit;
    }
    if (options.skip) {
      params.skip = options.skip;
    }

    const response = await axiosInstance.get("/reminders", { params });
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error fetching reminders:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch reminders"
    );
  }
};

/**
 * Create a new reminder
 * @param {Object} reminderData - Reminder data
 * @returns {Promise<Object>} - Created reminder with ID
 */
export const createReminder = async (reminderData) => {
  try {
    const payload = {
      ...reminderData,
      dueDate: toDateInputValue(reminderData.dueDate),
    };
    const response = await axiosInstance.post("/reminders", payload);
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error creating reminder:", error);
    throw new Error(
      error.response?.data?.message || "Failed to create reminder"
    );
  }
};

/**
 * Update an existing reminder
 * @param {string} reminderId - ID of reminder to update
 * @param {Object} reminderData - Updated reminder data
 * @returns {Promise<Object>} - Updated reminder
 */
export const updateReminder = async (reminderId, reminderData) => {
  try {
    const payload = {
      ...reminderData,
    };
    // Convert dueDate if provided
    if (reminderData.dueDate) {
      payload.dueDate = toDateInputValue(reminderData.dueDate);
    }
    const response = await axiosInstance.put(
      `/reminders/${reminderId}`,
      payload
    );
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error updating reminder:", error);
    throw new Error(
      error.response?.data?.message || "Failed to update reminder"
    );
  }
};

/**
 * Delete a reminder
 * @param {string} reminderId - ID of reminder to delete
 * @returns {Promise<Object>} - Deletion confirmation
 */
export const deleteReminder = async (reminderId) => {
  try {
    const response = await axiosInstance.delete(`/reminders/${reminderId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting reminder:", error);
    throw new Error(
      error.response?.data?.message || "Failed to delete reminder"
    );
  }
};

/**
 * Toggle reminder completion status
 * @param {string} reminderId - ID of reminder
 * @param {boolean} completed - New completion status
 * @returns {Promise<Object>} - Updated reminder
 */
export const toggleReminderCompletion = async (reminderId, completed) => {
  try {
    const response = await axiosInstance.put(`/reminders/${reminderId}`, {
      completed,
    });
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error toggling reminder completion:", error);
    throw new Error(
      error.response?.data?.message ||
        "Failed to update reminder completion status"
    );
  }
};

const remindersService = {
  fetchReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  toggleReminderCompletion,
};

export default remindersService;
