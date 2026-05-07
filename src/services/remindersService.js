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

/**
 * Create a reminder with voice call
 * @param {Object} reminderData - Reminder data including voice call fields
 * @returns {Promise<Object>} - Created voice call reminder
 */
export const createVoiceCallReminder = async (reminderData) => {
  try {
    const payload = {
      ...reminderData,
      dueDate: toDateInputValue(reminderData.dueDate),
      reminders: ['Call']  // Voice call reminders use 'Call' type
    };
    const response = await axiosInstance.post("/reminders/voice-call", payload);
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error creating voice call reminder:", error);
    throw new Error(
      error.response?.data?.message || "Failed to create voice call reminder"
    );
  }
};

/**
 * Get voice call status for a reminder
 * @param {string} reminderId - ID of the reminder
 * @returns {Promise<Object>} - Voice call status details
 */
export const getVoiceCallStatus = async (reminderId) => {
  try {
    const response = await axiosInstance.get(
      `/reminders/${reminderId}/voice-call-status`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching voice call status:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch voice call status"
    );
  }
};

/**
 * Manually trigger a voice call for a reminder
 * @param {string} reminderId - ID of the reminder
 * @returns {Promise<Object>} - Call trigger result
 */
export const triggerVoiceCall = async (reminderId) => {
  try {
    const response = await axiosInstance.post(
      `/reminders/${reminderId}/trigger-call`
    );
    return response.data;
  } catch (error) {
    console.error("Error triggering voice call:", error);
    throw new Error(
      error.response?.data?.message || "Failed to trigger voice call"
    );
  }
};

// ============ TRUSTED CONTACTS API FUNCTIONS ============

/**
 * Send invite to become a trusted contact
 * @param {string} recipientId - ID of the user to invite
 * @param {string} message - Optional invite message
 * @param {string} relationship - Relationship type
 * @returns {Promise<Object>} - Created invite
 */
export const sendTrustedContactInvite = async (recipientId, message = "", relationship = "other") => {
  try {
    const response = await axiosInstance.post("/reminders/trusted-contacts/invite", {
      recipientId,
      message,
      relationship,
    });
    return response.data;
  } catch (error) {
    console.error("Error sending trusted contact invite:", error);
    throw new Error(
      error.response?.data?.message || "Failed to send invite"
    );
  }
};

/**
 * Get sent invites
 * @returns {Promise<Object>} - List of sent invites
 */
export const getSentTrustedContactInvites = async () => {
  try {
    const response = await axiosInstance.get("/reminders/trusted-contacts/sent");
    return response.data;
  } catch (error) {
    console.error("Error fetching sent invites:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch invites"
    );
  }
};

/**
 * Get received invites
 * @returns {Promise<Object>} - List of received invites
 */
export const getReceivedTrustedContactInvites = async () => {
  try {
    const response = await axiosInstance.get("/reminders/trusted-contacts/received");
    return response.data;
  } catch (error) {
    console.error("Error fetching received invites:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch invites"
    );
  }
};

/**
 * Get list of accepted trusted contacts
 * @returns {Promise<Object>} - List of accepted trusted contacts
 */
export const getAcceptedTrustedContacts = async () => {
  try {
    const response = await axiosInstance.get("/reminders/trusted-contacts/accepted");
    return response.data;
  } catch (error) {
    console.error("Error fetching trusted contacts:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch trusted contacts"
    );
  }
};

/**
 * Accept a trusted contact invite
 * @param {string} inviteId - ID of the invite
 * @returns {Promise<Object>} - Updated invite
 */
export const acceptTrustedContactInvite = async (inviteId) => {
  try {
    const response = await axiosInstance.post(
      `/reminders/trusted-contacts/${inviteId}/accept`
    );
    return response.data;
  } catch (error) {
    console.error("Error accepting invite:", error);
    throw new Error(
      error.response?.data?.message || "Failed to accept invite"
    );
  }
};

/**
 * Reject a trusted contact invite
 * @param {string} inviteId - ID of the invite
 * @returns {Promise<Object>} - Updated invite
 */
export const rejectTrustedContactInvite = async (inviteId) => {
  try {
    const response = await axiosInstance.post(
      `/reminders/trusted-contacts/${inviteId}/reject`
    );
    return response.data;
  } catch (error) {
    console.error("Error rejecting invite:", error);
    throw new Error(
      error.response?.data?.message || "Failed to reject invite"
    );
  }
};

/**
 * Remove a trusted contact
 * @param {string} contactId - ID of the contact to remove
 * @returns {Promise<Object>} - Success response
 */
export const removeTrustedContact = async (contactId) => {
  try {
    const response = await axiosInstance.delete(
      `/reminders/trusted-contacts/${contactId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error removing trusted contact:", error);
    throw new Error(
      error.response?.data?.message || "Failed to remove trusted contact"
    );
  }
};

/**
 * Share a reminder with trusted contacts
 * @param {string} reminderId - ID of the reminder
 * @param {Array} contactIds - Array of contact IDs to share with
 * @returns {Promise<Object>} - Updated reminder
 */
export const shareReminderWithContacts = async (reminderId, contactIds = []) => {
  try {
    const response = await axiosInstance.put(
      `/reminders/${reminderId}/share-with-contacts`,
      { contactIds }
    );
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error sharing reminder:", error);
    throw new Error(
      error.response?.data?.message || "Failed to share reminder"
    );
  }
};

/**
 * Get reminders shared with me as a trusted contact
 * @returns {Promise<Object>} - List of shared reminders
 */
export const getRemindersSharedWithMe = async () => {
  try {
    const response = await axiosInstance.get("/reminders/shared-with-me/list");
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error fetching shared reminders:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch shared reminders"
    );
  }
};

/**
 * Acknowledge a reminder that was shared with the current trusted contact
 * @param {string} reminderId - Shared reminder ID
 * @returns {Promise<Object>} - Updated reminder
 */
export const acknowledgeSharedReminder = async (reminderId) => {
  try {
    const response = await axiosInstance.post(
      `/reminders/shared-with-me/${reminderId}/acknowledge`
    );
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error acknowledging shared reminder:", error);
    throw new Error(
      error.response?.data?.message || "Failed to acknowledge shared reminder"
    );
  }
};

// ============ FILE ATTACHMENT FUNCTIONS ============

/**
 * Upload a file attachment to a reminder
 * @param {string} reminderId - ID of the reminder
 * @param {File} file - The file to upload
 * @param {string} description - Optional description
 * @param {number} duration - Optional duration for audio/video files
 * @returns {Promise<Object>} - Upload response with attachment data
 */
export const uploadReminderAttachment = async (
  reminderId,
  file,
  description = "",
  duration = null
) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    if (description) {
      formData.append("description", description);
    }
    if (duration) {
      formData.append("duration", duration);
    }

    const response = await axiosInstance.post(
      `/reminders/${reminderId}/attachments`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error uploading attachment:", error);
    throw new Error(
      error.response?.data?.message || "Failed to upload attachment"
    );
  }
};

/**
 * Get all attachments for a reminder
 * @param {string} reminderId - ID of the reminder
 * @returns {Promise<Object>} - List of attachments
 */
export const getRemindersAttachments = async (reminderId) => {
  try {
    const response = await axiosInstance.get(
      `/reminders/${reminderId}/attachments`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching attachments:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch attachments"
    );
  }
};

/**
 * Get attachments by type for a reminder
 * @param {string} reminderId - ID of the reminder
 * @param {string} fileType - File type to filter by (voice, image, document, video, audio)
 * @returns {Promise<Object>} - List of filtered attachments
 */
export const getAttachmentsByType = async (reminderId, fileType) => {
  try {
    const response = await axiosInstance.get(
      `/reminders/${reminderId}/attachments/type/${fileType}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching attachments by type:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch attachments"
    );
  }
};

/**
 * Delete an attachment from a reminder
 * @param {string} reminderId - ID of the reminder
 * @param {string} attachmentId - ID of the attachment to delete
 * @returns {Promise<Object>} - Success response
 */
export const deleteRemindersAttachment = async (reminderId, attachmentId) => {
  try {
    const response = await axiosInstance.delete(
      `/reminders/${reminderId}/attachments/${attachmentId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting attachment:", error);
    throw new Error(
      error.response?.data?.message || "Failed to delete attachment"
    );
  }
};

// ==================== PHASE 1: SNOOZE FUNCTIONALITY ====================

/**
 * Snooze a reminder for a specified duration
 * @param {string} reminderId - ID of the reminder to snooze
 * @param {number} minutesToSnooze - Number of minutes to snooze (1-10080)
 * @returns {Promise<Object>} - Snoozed reminder details
 */
export const snoozeReminder = async (reminderId, minutesToSnooze) => {
  try {
    const response = await axiosInstance.post(
      `/reminders/${reminderId}/snooze`,
      { minutesToSnooze }
    );
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error snoozing reminder:", error);
    throw new Error(
      error.response?.data?.message || "Failed to snooze reminder"
    );
  }
};

// ==================== PHASE 1: MISSED REMINDER TRACKING ====================

/**
 * Fetch all missed reminders for the current user
 * @param {Object} options - Query options
 * @param {number} options.limit - Limit results (default: 20)
 * @param {number} options.skip - Skip results for pagination (default: 0)
 * @returns {Promise<Object>} - Response with missed reminders and pagination info
 */
export const getMissedReminders = async (options = {}) => {
  try {
    const params = {};
    if (options.limit) {
      params.limit = options.limit;
    }
    if (options.skip) {
      params.skip = options.skip;
    }

    const response = await axiosInstance.get(`/reminders/missed`, { params });
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error fetching missed reminders:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch missed reminders"
    );
  }
};

/**
 * Manually mark a reminder as missed
 * @param {string} reminderId - ID of the reminder to mark as missed
 * @returns {Promise<Object>} - Updated reminder details
 */
export const markReminderAsMissed = async (reminderId) => {
  try {
    const response = await axiosInstance.post(
      `/reminders/${reminderId}/mark-missed`
    );
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error marking reminder as missed:", error);
    throw new Error(
      error.response?.data?.message || "Failed to mark reminder as missed"
    );
  }
};

/**
 * Resend or reschedule a missed reminder
 * @param {string} reminderId - ID of the reminder to resend
 * @param {Object} options - Resend options
 * @param {string} options.rescheduleFor - New due date/time (optional)
 * @param {string[]} options.channels - Channels to use for resend (default: ['In-app'])
 * @returns {Promise<Object>} - Resend confirmation
 */
export const resendMissedReminder = async (reminderId, options = {}) => {
  try {
    const body = {
      channels: options.channels || ["In-app"],
      rescheduleFor: options.rescheduleFor
    };

    const response = await axiosInstance.post(
      `/reminders/${reminderId}/resend`,
      body
    );
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error resending reminder:", error);
    throw new Error(
      error.response?.data?.message || "Failed to resend reminder"
    );
  }
};

// ==================== PHASE 1: REMIND-BEFORE OFFSETS ====================

/**
 * Get notification offsets for a reminder
 * @param {string} reminderId - ID of the reminder
 * @returns {Promise<Object>} - Reminder notification offsets and status
 */
export const getNotificationOffsets = async (reminderId) => {
  try {
    const response = await axiosInstance.get(
      `/reminders/${reminderId}/notification-offsets`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching notification offsets:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch notification offsets"
    );
  }
};

/**
 * Update notification offsets for a reminder
 * @param {string} reminderId - ID of the reminder
 * @param {number[]} reminderBeforeOffsets - Array of minutes before due time to send notifications
 * @returns {Promise<Object>} - Updated offsets
 */
export const setNotificationOffsets = async (reminderId, reminderBeforeOffsets) => {
  try {
    const response = await axiosInstance.put(
      `/reminders/${reminderId}/notification-offsets`,
      { reminderBeforeOffsets }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating notification offsets:", error);
    throw new Error(
      error.response?.data?.message || "Failed to update notification offsets"
    );
  }
};

// ==================== PHASE 2: SMS DELIVERY ====================

/**
 * Get SMS delivery status for a reminder
 * @param {string} reminderId - ID of the reminder
 * @returns {Promise<Object>} - SMS delivery status and logs
 */
export const getSMSDeliveryStatus = async (reminderId) => {
  try {
    const response = await axiosInstance.get(
      `/reminders/${reminderId}/sms-delivery-status`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching SMS delivery status:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch SMS delivery status"
    );
  }
};

/**
 * Manually trigger SMS resend for a reminder
 * @param {string} reminderId - ID of the reminder
 * @returns {Promise<Object>} - Resend confirmation
 */
export const resendSMS = async (reminderId) => {
  try {
    const response = await axiosInstance.post(
      `/reminders/${reminderId}/resend-sms`
    );
    return response.data;
  } catch (error) {
    console.error("Error resending SMS:", error);
    throw new Error(
      error.response?.data?.message || "Failed to resend SMS"
    );
  }
};

/**
 * Configure SMS phone number for a reminder
 * @param {string} reminderId - ID of the reminder
 * @param {string} phoneNumber - Phone number for SMS delivery
 * @returns {Promise<Object>} - Updated SMS configuration
 */
export const setSMSConfig = async (reminderId, phoneNumber) => {
  try {
    const response = await axiosInstance.put(
      `/reminders/${reminderId}/sms-config`,
      { phoneNumber }
    );
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error updating SMS configuration:", error);
    throw new Error(
      error.response?.data?.message || "Failed to update SMS configuration"
    );
  }
};

// ==================== PHASE 3: EMAIL DELIVERY ====================

/**
 * Get email delivery status for a reminder
 * @param {string} reminderId - The reminder ID
 * @returns {Promise<Object>} - Email delivery status and logs
 */
export const getEmailDeliveryStatus = async (reminderId) => {
  try {
    const response = await axiosInstance.get(`/reminders/${reminderId}/email-delivery-status`);
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error fetching email delivery status:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch email delivery status"
    );
  }
};

/**
 * Manually trigger email resend for a reminder
 * @param {string} reminderId - The reminder ID
 * @returns {Promise<Object>} - Resend confirmation
 */
export const resendEmail = async (reminderId) => {
  try {
    const response = await axiosInstance.post(
      `/reminders/${reminderId}/resend-email`,
      {}
    );
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error triggering email resend:", error);
    throw new Error(
      error.response?.data?.message || "Failed to resend email"
    );
  }
};

/**
 * Configure email address for a reminder
 * @param {string} reminderId - The reminder ID
 * @param {string} email - The email address
 * @returns {Promise<Object>} - Updated email configuration
 */
export const setEmailConfig = async (reminderId, email) => {
  try {
    const response = await axiosInstance.put(
      `/reminders/${reminderId}/email-config`,
      { email }
    );
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error updating email configuration:", error);
    throw new Error(
      error.response?.data?.message || "Failed to update email configuration"
    );
  }
};

const remindersService = {
  fetchReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  toggleReminderCompletion,
  createVoiceCallReminder,
  getVoiceCallStatus,
  triggerVoiceCall,
  sendTrustedContactInvite,
  getSentTrustedContactInvites,
  getReceivedTrustedContactInvites,
  getAcceptedTrustedContacts,
  acceptTrustedContactInvite,
  rejectTrustedContactInvite,
  removeTrustedContact,
  shareReminderWithContacts,
  getRemindersSharedWithMe,
  acknowledgeSharedReminder,
  uploadReminderAttachment,
  getRemindersAttachments,
  getAttachmentsByType,
  deleteRemindersAttachment,
  // Phase 1: Snooze
  snoozeReminder,
  // Phase 1: Missed Reminders
  getMissedReminders,
  markReminderAsMissed,
  resendMissedReminder,
  // Phase 1: Notification Offsets
  getNotificationOffsets,
  setNotificationOffsets,
  // Phase 2: SMS Delivery
  getSMSDeliveryStatus,
  resendSMS,
  setSMSConfig,
  // Phase 3: Email Delivery
  getEmailDeliveryStatus,
  resendEmail,
  setEmailConfig,
  // Phase 4: WhatsApp, Telegram, Push, Analytics, Templates
  getWhatsAppDeliveryStatus,
  resendWhatsApp,
  setWhatsAppConfig,
  getTelegramDeliveryStatus,
  resendTelegram,
  setTelegramConfig,
  getPushDeliveryStatus,
  setPushConfig,
  getDeliveryAnalytics,
  getFailedDeliveries,
  retryFailedDelivery,
  createTemplate,
  getUserTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  cloneTemplate,
};

export default remindersService;

// ==================== PHASE 4: WHATSAPP DELIVERY ====================

/**
 * Get WhatsApp delivery status
 */
export const getWhatsAppDeliveryStatus = async (reminderId) => {
  try {
    const response = await axiosInstance.get(`/reminders/${reminderId}/whatsapp-delivery-status`);
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error fetching WhatsApp delivery status:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch WhatsApp delivery status");
  }
};

/**
 * Resend WhatsApp message
 */
export const resendWhatsApp = async (reminderId) => {
  try {
    const response = await axiosInstance.post(`/reminders/${reminderId}/resend-whatsapp`, {});
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error resending WhatsApp:", error);
    throw new Error(error.response?.data?.message || "Failed to resend WhatsApp");
  }
};

/**
 * Configure WhatsApp phone number
 */
export const setWhatsAppConfig = async (reminderId, whatsappPhoneNumber) => {
  try {
    const response = await axiosInstance.put(`/reminders/${reminderId}/whatsapp-config`, { whatsappPhoneNumber });
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error updating WhatsApp config:", error);
    throw new Error(error.response?.data?.message || "Failed to update WhatsApp configuration");
  }
};

// ==================== PHASE 4: TELEGRAM DELIVERY ====================

/**
 * Get Telegram delivery status
 */
export const getTelegramDeliveryStatus = async (reminderId) => {
  try {
    const response = await axiosInstance.get(`/reminders/${reminderId}/telegram-delivery-status`);
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error fetching Telegram delivery status:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch Telegram delivery status");
  }
};

/**
 * Resend Telegram message
 */
export const resendTelegram = async (reminderId) => {
  try {
    const response = await axiosInstance.post(`/reminders/${reminderId}/resend-telegram`, {});
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error resending Telegram:", error);
    throw new Error(error.response?.data?.message || "Failed to resend Telegram");
  }
};

/**
 * Configure Telegram chat ID
 */
export const setTelegramConfig = async (reminderId, telegramChatId) => {
  try {
    const response = await axiosInstance.put(`/reminders/${reminderId}/telegram-config`, { telegramChatId });
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error updating Telegram config:", error);
    throw new Error(error.response?.data?.message || "Failed to update Telegram configuration");
  }
};

// ==================== PHASE 4: PUSH NOTIFICATIONS ====================

/**
 * Get push notification delivery status
 */
export const getPushDeliveryStatus = async (reminderId) => {
  try {
    const response = await axiosInstance.get(`/reminders/${reminderId}/push-delivery-status`);
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error fetching push delivery status:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch push delivery status");
  }
};

/**
 * Configure push notifications
 */
export const setPushConfig = async (reminderId, pushEnabled) => {
  try {
    const response = await axiosInstance.put(`/reminders/${reminderId}/push-config`, { pushEnabled });
    return normalizeReminderResponse(response.data);
  } catch (error) {
    console.error("Error updating push config:", error);
    throw new Error(error.response?.data?.message || "Failed to update push configuration");
  }
};

// ==================== PHASE 4: DELIVERY ANALYTICS ====================

/**
 * Get delivery analytics
 */
export const getDeliveryAnalytics = async (daysBack = 30, channel = null) => {
  try {
    const params = { daysBack };
    if (channel) params.channel = channel;
    
    const response = await axiosInstance.get('/reminders/analytics/delivery-stats', { params });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching delivery analytics:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch analytics");
  }
};

/**
 * Get failed deliveries for retry
 */
export const getFailedDeliveries = async (channel = null, limit = 10) => {
  try {
    const params = { limit };
    if (channel) params.channel = channel;
    
    const response = await axiosInstance.get('/reminders/analytics/failed-deliveries', { params });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching failed deliveries:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch failed deliveries");
  }
};

/**
 * Retry a failed delivery
 */
export const retryFailedDelivery = async (logId) => {
  try {
    const response = await axiosInstance.post(`/reminders/analytics/retry/${logId}`, {});
    return response.data.data;
  } catch (error) {
    console.error("Error retrying delivery:", error);
    throw new Error(error.response?.data?.message || "Failed to retry delivery");
  }
};

// ==================== PHASE 4: TEMPLATE CUSTOMIZATION ====================

/**
 * Create a new template
 */
export const createTemplate = async (templateData) => {
  try {
    const response = await axiosInstance.post('/reminders/templates', templateData);
    return response.data.data;
  } catch (error) {
    console.error("Error creating template:", error);
    throw new Error(error.response?.data?.message || "Failed to create template");
  }
};

/**
 * Get all templates for user
 */
export const getUserTemplates = async () => {
  try {
    const response = await axiosInstance.get('/reminders/templates');
    return response.data.data;
  } catch (error) {
    console.error("Error fetching templates:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch templates");
  }
};

/**
 * Get a specific template
 */
export const getTemplate = async (templateId) => {
  try {
    const response = await axiosInstance.get(`/reminders/templates/${templateId}`);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching template:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch template");
  }
};

/**
 * Update a template
 */
export const updateTemplate = async (templateId, templateData) => {
  try {
    const response = await axiosInstance.put(`/reminders/templates/${templateId}`, templateData);
    return response.data.data;
  } catch (error) {
    console.error("Error updating template:", error);
    throw new Error(error.response?.data?.message || "Failed to update template");
  }
};

/**
 * Delete a template
 */
export const deleteTemplate = async (templateId) => {
  try {
    const response = await axiosInstance.delete(`/reminders/templates/${templateId}`);
    return response.data.data;
  } catch (error) {
    console.error("Error deleting template:", error);
    throw new Error(error.response?.data?.message || "Failed to delete template");
  }
};

/**
 * Clone a template
 */
export const cloneTemplate = async (templateId, newName) => {
  try {
    const response = await axiosInstance.post(`/reminders/templates/${templateId}/clone`, { newName });
    return response.data.data;
  } catch (error) {
    console.error("Error cloning template:", error);
    throw new Error(error.response?.data?.message || "Failed to clone template");
  }
};

// ==================== PHASE 5: ANALYTICS DASHBOARD ====================

/**
 * Get full analytics dashboard overview
 */
export const getDashboardOverview = async (daysBack = 30) => {
  try {
    const response = await axiosInstance.get('/reminders/analytics/dashboard', {
      params: { daysBack }
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching dashboard overview:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch analytics");
  }
};

/**
 * Get channel comparison stats
 */
export const getChannelComparison = async (daysBack = 30) => {
  try {
    const response = await axiosInstance.get('/reminders/analytics/channel-comparison', {
      params: { daysBack }
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching channel comparison:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch channel comparison");
  }
};

/**
 * Get reminder type analysis
 */
export const getReminderTypeAnalysis = async (daysBack = 30) => {
  try {
    const response = await axiosInstance.get('/reminders/analytics/reminder-types', {
      params: { daysBack }
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching reminder type analysis:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch type analysis");
  }
};

/**
 * Get priority impact analysis
 */
export const getPriorityImpactAnalysis = async (daysBack = 30) => {
  try {
    const response = await axiosInstance.get('/reminders/analytics/priority-impact', {
      params: { daysBack }
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching priority impact:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch priority impact");
  }
};

/**
 * Get template usage analytics
 */
export const getTemplateUsageAnalytics = async (daysBack = 30) => {
  try {
    const response = await axiosInstance.get('/reminders/analytics/template-usage', {
      params: { daysBack }
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching template usage:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch template usage");
  }
};

// ==================== PHASE 5: BULK TEMPLATE MANAGEMENT ====================

/**
 * Apply template to multiple reminders
 */
export const applyTemplateToBulk = async (templateId, reminderIds) => {
  try {
    const response = await axiosInstance.post('/reminders/bulk/apply-template', {
      templateId,
      reminderIds
    });
    return response.data.data;
  } catch (error) {
    console.error("Error applying template in bulk:", error);
    throw new Error(error.response?.data?.message || "Failed to apply template");
  }
};

/**
 * Snooze multiple reminders
 */
export const bulkSnoozeReminders = async (reminderIds, snoozeMinutes) => {
  try {
    const response = await axiosInstance.post('/reminders/bulk/snooze', {
      reminderIds,
      snoozeMinutes
    });
    return response.data.data;
  } catch (error) {
    console.error("Error snoozeing reminders in bulk:", error);
    throw new Error(error.response?.data?.message || "Failed to snooze reminders");
  }
};

/**
 * Delete multiple reminders
 */
export const bulkDeleteReminders = async (reminderIds) => {
  try {
    const response = await axiosInstance.post('/reminders/bulk/delete', { reminderIds });
    return response.data.data;
  } catch (error) {
    console.error("Error deleting reminders in bulk:", error);
    throw new Error(error.response?.data?.message || "Failed to delete reminders");
  }
};

/**
 * Update priority for multiple reminders
 */
export const bulkUpdatePriority = async (reminderIds, priority) => {
  try {
    const response = await axiosInstance.post('/reminders/bulk/update-priority', {
      reminderIds,
      priority
    });
    return response.data.data;
  } catch (error) {
    console.error("Error updating priority in bulk:", error);
    throw new Error(error.response?.data?.message || "Failed to update priority");
  }
};

/**
 * Get reminder groups summary
 */
export const getReminderGroupSummary = async (groupBy = 'priority') => {
  try {
    const response = await axiosInstance.get('/reminders/bulk/group-summary', {
      params: { groupBy }
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching group summary:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch group summary");
  }
};

// ==================== PHASE 5: AI TEMPLATE SUGGESTIONS ====================

/**
 * Generate AI template suggestions
 */
export const generateAISuggestions = async (title, description, category, priority = 'medium') => {
  try {
    const response = await axiosInstance.post('/reminders/ai-suggestions/generate', {
      title,
      description,
      category,
      priority
    });
    return response.data.data;
  } catch (error) {
    console.error("Error generating AI suggestions:", error);
    throw new Error(error.response?.data?.message || "Failed to generate suggestions");
  }
};

/**
 * Accept an AI suggestion as template
 */
export const acceptAISuggestion = async (suggestion, customName = null) => {
  try {
    const response = await axiosInstance.post('/reminders/ai-suggestions/accept', {
      suggestion,
      customName
    });
    return response.data.data;
  } catch (error) {
    console.error("Error accepting suggestion:", error);
    throw new Error(error.response?.data?.message || "Failed to accept suggestion");
  }
};

/**
 * Enhance an existing template with AI
 */
export const enhanceTemplateWithAI = async (templateId) => {
  try {
    const response = await axiosInstance.post('/reminders/ai-suggestions/enhance', {
      templateId
    });
    return response.data.data;
  } catch (error) {
    console.error("Error enhancing template:", error);
    throw new Error(error.response?.data?.message || "Failed to enhance template");
  }
};

// ==================== PHASE 5: TEMPLATE LIBRARY ====================

/**
 * Browse library templates
 */
export const browseLibraryTemplates = async (query = '', category = null, tags = []) => {
  try {
    const params = { query };
    if (category) params.category = category;
    if (tags.length > 0) params.tags = tags;
    
    const response = await axiosInstance.get('/reminders/library/templates', { params });
    return response.data.data;
  } catch (error) {
    console.error("Error browsing library:", error);
    throw new Error(error.response?.data?.message || "Failed to browse library");
  }
};

/**
 * Get library categories
 */
export const getLibraryCategories = async () => {
  try {
    const response = await axiosInstance.get('/reminders/library/categories');
    return response.data.data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch categories");
  }
};

/**
 * Get popular library tags
 */
export const getLibraryTags = async () => {
  try {
    const response = await axiosInstance.get('/reminders/library/tags');
    return response.data.data;
  } catch (error) {
    console.error("Error fetching tags:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch tags");
  }
};

/**
 * Install library template to user's templates
 */
export const installLibraryTemplate = async (libraryTemplateId, customName = null) => {
  try {
    const response = await axiosInstance.post('/reminders/library/install', {
      libraryTemplateId,
      customName
    });
    return response.data.data;
  } catch (error) {
    console.error("Error installing template:", error);
    throw new Error(error.response?.data?.message || "Failed to install template");
  }
};

// ==================== PHASE 5: WHATSAPP GROUPS ====================

/**
 * Configure WhatsApp group for reminder
 */
export const configureWhatsAppGroup = async (reminderId, whatsappGroupId, whatsappGroupName) => {
  try {
    const response = await axiosInstance.put(`/reminders/${reminderId}/whatsapp-group-config`, {
      whatsappGroupId,
      whatsappGroupName
    });
    return response.data.data;
  } catch (error) {
    console.error("Error configuring WhatsApp group:", error);
    throw new Error(error.response?.data?.message || "Failed to configure group");
  }
};

/**
 * Get WhatsApp group delivery status
 */
export const getWhatsAppGroupStatus = async (reminderId) => {
  try {
    const response = await axiosInstance.get(`/reminders/${reminderId}/whatsapp-group-status`);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching group status:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch group status");
  }
};
