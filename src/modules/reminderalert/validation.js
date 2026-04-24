/**
 * Comprehensive validation for reminder form data
 * Validates all fields and returns structured error object
 * 
 * @param {Object} formData - Form data to validate
 * @param {string} formData.title - Reminder title (required, max 200 chars)
 * @param {string} [formData.description] - Reminder description (max 1000 chars)
 * @param {string} formData.category - Reminder category (Work|Personal|Urgent)
 * @param {string} formData.priority - Priority level (Low|Medium|High)
 * @param {string} formData.dueDate - Due date in YYYY-MM-DD format (required)
 * @param {string} [formData.dueTime] - Due time in HH:mm format
 * @param {string[]} formData.reminders - Reminder channels (In-app|SMS|Call)
 * @param {string} [formData.recipientPhoneNumber] - Phone for voice calls
 * @param {string} [formData.messageType] - Message type (text|audio)
 * @param {string} [formData.voiceMessage] - Text message for voice calls
 * 
 * @returns {Object} Validation result
 * @returns {boolean} returns.isValid - Is form valid
 * @returns {Object} returns.errors - Field errors {fieldName: errorMessage}
 * 
 * @example
 * const { isValid, errors } = validateReminderForm(formData);
 * if (!isValid) {
 *   console.log('Title error:', errors.title);
 *   console.log('Date error:', errors.dueDate);
 * }
 */
export const validateReminderForm = (formData) => {
  const errors = {};

  // Title validation
  if (!formData.title?.trim()) {
    errors.title = 'Title is required';
  } else if (formData.title.trim().length > 200) {
    errors.title = 'Title must be less than 200 characters';
  }

  // Description validation
  if (formData.description && formData.description.length > 1000) {
    errors.description = 'Description must be less than 1000 characters';
  }

  // Due date validation
  if (!formData.dueDate) {
    errors.dueDate = 'Due date is required';
  } else {
    const selectedDate = new Date(formData.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      errors.dueDate = 'Due date cannot be in the past';
    }
  }

  // Due time validation (if due date is today, time must be in future)
  if (formData.dueTime) {
    const selectedDate = new Date(formData.dueDate);
    const today = new Date();
    
    selectedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate.getTime() === today.getTime()) {
      const [hours, minutes] = formData.dueTime.split(':');
      const selectedTime = new Date();
      selectedTime.setHours(parseInt(hours), parseInt(minutes), 0);
      
      if (selectedTime < new Date()) {
        errors.dueTime = 'Time must be in the future for today\'s reminders';
      }
    }
  }

  // Category validation
  if (!['Work', 'Personal', 'Urgent'].includes(formData.category)) {
    errors.category = 'Invalid category';
  }

  // Priority validation
  if (!['Low', 'Medium', 'High'].includes(formData.priority)) {
    errors.priority = 'Invalid priority';
  }

  // Reminders validation
  if (!formData.reminders || formData.reminders.length === 0) {
    errors.reminders = 'Select at least one reminder channel';
  }

  // Voice call validation
  if (formData.reminders && formData.reminders.includes('Call')) {
    if (!formData.recipientPhoneNumber?.trim()) {
      errors.recipientPhoneNumber = 'Phone number required for voice call reminders';
    } else if (!isValidPhoneNumber(formData.recipientPhoneNumber)) {
      errors.recipientPhoneNumber = 'Invalid phone number format';
    }

    if (formData.messageType === 'text' && !formData.voiceMessage?.trim()) {
      errors.voiceMessage = 'Message text required for voice call reminders';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate phone number format
 * Supports various international formats
 * 
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone format
 * 
 * @example
 * isValidPhoneNumber('+1 (555) 123-4567'); // true
 * isValidPhoneNumber('555.123.4567'); // true
 * isValidPhoneNumber('invalid'); // false
 */
const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Get validation errors grouped by field
 * Useful for mapping errors back to form fields
 * 
 * @param {Object} errors - Error object from validateReminderForm
 * @returns {Object} Errors keyed by field name
 * 
 * @example
 * const errors = {
 *   title: 'Title is required',
 *   dueDate: 'Due date cannot be in the past'
 * };
 * const grouped = getErrorsByField(errors);
 * // Same structure, just organized
 */
export const getErrorsByField = (errors) => {
  const errorsByField = {};
  Object.entries(errors).forEach(([field, message]) => {
    errorsByField[field] = message;
  });
  return errorsByField;
};
