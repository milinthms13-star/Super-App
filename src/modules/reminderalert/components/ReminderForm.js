import React, { useState, useCallback, useEffect, useRef } from 'react';
import VoiceNoteRecorder from '../../../components/VoiceNoteRecorder';
import { validateReminderForm } from '../validation';
import { 
  getAriaLabel, 
  trapFocus, 
  createFocusManager,
  handleKeyboardShortcut,
  announceToScreenReader,
} from '../utils/a11y';

const PRIORITIES = ['Low', 'Medium', 'High'];
const CATEGORIES = ['Work', 'Personal', 'Urgent'];
const RECURRING_OPTIONS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];
const CHANNEL_OPTIONS = [
  {
    value: 'In-app',
    title: 'In-app alert',
    description: 'Shows the reminder inside your NilaHub workspace.',
  },
  {
    value: 'SMS',
    title: 'SMS',
    description: 'Useful when you might be away from the app.',
  },
  {
    value: 'Call',
    title: 'Voice call',
    description: 'Triggers an automated phone reminder with your message.',
  },
];

/**
 * ReminderForm component - comprehensive form for creating/editing reminders
 * Handles all reminder fields including voice call configuration
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.formData - Current form state
 * @param {Object} props.voiceCallData - Voice call configuration
 * @param {Array} props.trustedContacts - Available trusted contacts
 * @param {boolean} props.submitting - Loading indicator
 * @param {string} props.editingTaskId - ID if editing existing reminder
 * @param {string} props.error - Error message to display
 * @param {function} props.onChange - Form field change handler
 * @param {function} props.onVoiceCallChange - Voice call field change handler
 * @param {function} props.onVoiceNoteUpload - Voice note upload handler
 * @param {function} props.onSubmit - Form submission handler
 * @param {function} props.onCancel - Cancel handler
 * @param {Object} props.countdown - Countdown timer data
 * @param {function} props.onApplyCurrentDate - Quick action: use current date
 * @param {function} props.onApplyCurrentTime - Quick action: use current time
 * @param {function} props.onApplyCurrentDateTime - Quick action: use current date/time
 * @param {string} props.currentDateLabel - Formatted current date
 * @param {string} props.currentClockLabel - Formatted current time
 * 
 * @example
 * <ReminderForm
 *   formData={formData}
 *   voiceCallData={voiceCallData}
 *   trustedContacts={contacts}
 *   submitting={isSubmitting}
 *   editingTaskId={taskId}
 *   error={errorMsg}
 *   onChange={handleFormChange}
 *   onVoiceCallChange={handleVoiceCallChange}
 *   onSubmit={handleSubmit}
 *   onCancel={handleCancel}
 * />
 */
const ReminderForm = React.memo(({
  formData,
  voiceCallData,
  trustedContacts = [],
  submitting = false,
  editingTaskId = '',
  error = null,
  onChange,
  onVoiceCallChange,
  onVoiceNoteUpload,
  onSubmit,
  onCancel,
  countdown = null,
  onApplyCurrentDate,
  onApplyCurrentTime,
  onApplyCurrentDateTime,
  currentDateLabel = '',
  currentClockLabel = '',
}) => {
  const [formErrors, setFormErrors] = useState({});
  const formRef = useRef(null);
  const focusManagerRef = useRef(null);

  // Initialize focus manager
  useEffect(() => {
    if (formRef.current) {
      focusManagerRef.current = createFocusManager(formRef);
      focusManagerRef.current.trap();
    }

    return () => {
      focusManagerRef.current?.restore();
    };
  }, []);

  const handleKeyDown = useCallback((e) => {
    // Handle keyboard shortcuts
    const handled = handleKeyboardShortcut(e, {
      save: handleSubmit,
      cancel: onCancel,
    });

    if (handled) return;

    // Handle focus trapping
    if (e.key === 'Tab') {
      trapFocus(e, formRef.current);
    }
  }, [handleSubmit, onCancel]);

  const handleSubmit = useCallback(async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    // Validate form
    const validationData = {
      ...formData,
      recipientPhoneNumber: voiceCallData.recipientPhoneNumber,
      voiceMessage: voiceCallData.voiceMessage,
      messageType: voiceCallData.messageType
    };

    const { isValid, errors } = validateReminderForm(validationData);

    if (!isValid) {
      setFormErrors(errors);
      announceToScreenReader(
        `Form validation failed: ${Object.values(errors).join(', ')}`,
        'assertive'
      );
      return;
    }

    setFormErrors({});
    await onSubmit();
  }, [formData, voiceCallData, editingTaskId, onSubmit]);

  const resolveVoiceNoteUrl = (voiceNote) => {
    if (!voiceNote) return '';
    if (typeof voiceNote === 'string') return voiceNote;
    return voiceNote.s3Url || voiceNote.url || voiceNote.voiceNote?.s3Url || voiceNote.voiceNote?.url || '';
  };

  return (
    <article className="reminderalert-panel" role="region" aria-label="Create or edit reminder">
      <div className="reminderalert-panel-heading">
        <p>{editingTaskId ? 'Update reminder' : 'Create reminder'}</p>
        <h2>{editingTaskId ? 'Edit the current reminder' : 'Build a new reminder'}</h2>
      </div>

      <form 
        ref={formRef}
        className="reminderalert-editor-form" 
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        aria-label="Reminder creation form"
      >
        {error && (
          <div 
            className="reminderalert-alert reminderalert-alert-error"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </div>
        )}

        {/* Basic Fields */}
        <fieldset>
          <legend className="sr-only">Basic reminder information</legend>
          <div className="reminderalert-editor-grid">
            <label className="reminderalert-field reminderalert-field-full">
              <span>
                Title {formErrors.title && <span className="error-indicator" aria-label="required">*</span>}
              </span>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={onChange}
                placeholder="Example: Doctor follow-up"
                disabled={submitting}
                aria-invalid={!!formErrors.title}
                aria-describedby={formErrors.title ? 'title-error' : 'title-help'}
                aria-label={getAriaLabel('view', 'reminder title')}
              />
              <small id="title-help" className="sr-only">Enter a clear, concise title for your reminder</small>
              {formErrors.title && <small id="title-error" className="error-text" role="alert">{formErrors.title}</small>}
            </label>

            <label className="reminderalert-field reminderalert-field-full">
              <span>Description</span>
              <textarea
                name="description"
                value={formData.description}
                onChange={onChange}
                placeholder="Add context so you know what needs to happen."
                rows="4"
                disabled={submitting}
                aria-label="Reminder description"
                aria-describedby="description-help"
              />
              <small id="description-help" className="sr-only">Provide additional context or details about this reminder</small>
            </label>

            <label className="reminderalert-field">
              <span>Category</span>
              <select
                name="category"
                value={formData.category}
                onChange={onChange}
                disabled={submitting}
                aria-label="Reminder category"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>

            <label className="reminderalert-field">
              <span>Priority</span>
              <select
                name="priority"
                value={formData.priority}
                onChange={onChange}
                disabled={submitting}
                aria-label="Reminder priority level"
              >
                {PRIORITIES.map((pri) => (
                  <option key={pri} value={pri}>{pri}</option>
                ))}
              </select>
            </label>

            <label className="reminderalert-field">
              <span>
                Due date {formErrors.dueDate && <span className="error-indicator" aria-label="required">*</span>}
              </span>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={onChange}
                disabled={submitting}
                aria-invalid={!!formErrors.dueDate}
                aria-describedby={formErrors.dueDate ? 'dueDate-error' : 'dueDate-help'}
              />
              <small id="dueDate-help" className="reminderalert-inline-meta">Today: {currentDateLabel}</small>
              {formErrors.dueDate && <small id="dueDate-error" className="error-text" role="alert">{formErrors.dueDate}</small>}
            </label>

            <label className="reminderalert-field">
              <span>Due time</span>
              <input
                type="time"
                name="dueTime"
                value={formData.dueTime}
                onChange={onChange}
                disabled={submitting}
                aria-label="Reminder due time"
                aria-describedby="dueTime-help"
              />
              <small id="dueTime-help" className="reminderalert-inline-meta">Now: {currentClockLabel}</small>
            </label>

            <label className="reminderalert-field">
              <span>Recurring</span>
              <select
                name="recurring"
                value={formData.recurring}
                onChange={onChange}
                disabled={submitting}
                aria-label="Reminder recurrence pattern"
              >
                {RECURRING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        {/* Countdown Display */}
        {countdown && !countdown.isPast && (
          <div className="reminderalert-countdown-display">
            <p className="reminderalert-countdown-label">Time until reminder:</p>
            <div className="reminderalert-countdown">
              {countdown.days > 0 && <span className="countdown-part">{countdown.days}d</span>}
              <span className="countdown-part">{countdown.hours}h</span>
              <span className="countdown-part">{countdown.minutes}m</span>
              <span className="countdown-part">{countdown.seconds}s</span>
            </div>
          </div>
        )}

        {/* Reminder Channels */}
        <fieldset className="reminderalert-section-block">
          <legend className="reminderalert-section-heading">
            <h3>
              Reminder channels {formErrors.reminders && <span className="error-indicator" aria-label="required">*</span>}
            </h3>
            <p>Select how this reminder should reach you. Choose at least one option.</p>
          </legend>
          <div className="reminderalert-choice-grid" role="group" aria-label="notification channels">
            {CHANNEL_OPTIONS.map((channel) => {
              const isSelected = formData.reminders.includes(channel.value);
              return (
                <label
                  key={channel.value}
                  className={`reminderalert-choice-card ${isSelected ? 'selected' : ''}`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <input
                    type="checkbox"
                    name="reminders"
                    value={channel.value}
                    checked={isSelected}
                    onChange={onChange}
                    disabled={submitting}
                    aria-label={`Send reminder via ${channel.title}: ${channel.description}`}
                  />
                  <div className="reminderalert-choice-copy">
                    <strong>{channel.title}</strong>
                    <p>{channel.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
          {formErrors.reminders && (
            <small className="error-text" role="alert">{formErrors.reminders}</small>
          )}
        </fieldset>

        {/* Trusted Contacts */}
        {trustedContacts.length > 0 && (
          <fieldset className="reminderalert-section-block">
            <legend className="reminderalert-section-heading">
              <h3>Share with trusted contacts</h3>
              <p>Let someone else receive and acknowledge this reminder too. This step is optional.</p>
            </legend>
            <div className="reminderalert-choice-grid reminderalert-choice-grid-contacts" role="group" aria-label="trusted contacts">
              {trustedContacts.map((contact) => {
                const contactId = contact.recipientId?._id;
                const contactName = contact.recipientId?.name || contact.recipientId?.username || 'Contact';
                const isSelected = formData.sharedWithTrustedContacts?.includes(contactId);
                return (
                  <label
                    key={contact._id}
                    className={`reminderalert-choice-card ${isSelected ? 'selected' : ''}`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <input
                      type="checkbox"
                      name="sharedWithTrustedContacts"
                      value={contactId}
                      checked={isSelected}
                      onChange={onChange}
                      disabled={submitting || !contactId}
                      aria-label={`Share reminder with ${contactName}`}
                    />
                    <div className="reminderalert-choice-copy">
                      <strong>{contactName}</strong>
                      <p>
                        {contact.relationship
                          ? `${contact.relationship.charAt(0).toUpperCase()}${contact.relationship.slice(1)}`
                          : 'Connected'}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {/* Voice Call Setup */}
        {formData.reminders.includes('Call') && (
          <fieldset className="reminderalert-section-block reminderalert-voice-block">
            <legend className="reminderalert-section-heading">
              <h3>Voice call setup</h3>
              <p>This reminder will ring the number below and play the message you provide.</p>
            </legend>

            <div className="reminderalert-alert reminderalert-alert-info" role="note">
              Voice call reminders work best for high priority events, medicine schedules, and time-sensitive follow-ups.
            </div>

            <fieldset>
              <legend className="sr-only">Voice call configuration</legend>
              <div className="reminderalert-editor-grid">
                <label className="reminderalert-field">
                  <span>
                    Phone number {formErrors.recipientPhoneNumber && <span className="error-indicator" aria-label="required">*</span>}
                  </span>
                  <input
                    type="tel"
                    name="recipientPhoneNumber"
                    value={voiceCallData.recipientPhoneNumber}
                    onChange={onVoiceCallChange}
                    placeholder="+91 98765 43210"
                    disabled={submitting}
                    aria-invalid={!!formErrors.recipientPhoneNumber}
                    aria-describedby={formErrors.recipientPhoneNumber ? 'phone-error' : 'phone-help'}
                  />
                  <small id="phone-help" className="sr-only">Enter the phone number where the voice call reminder will be sent. Include country code if needed.</small>
                  {formErrors.recipientPhoneNumber && (
                    <small id="phone-error" className="error-text" role="alert">{formErrors.recipientPhoneNumber}</small>
                  )}
                </label>

                <label className="reminderalert-field">
                  <span>Message type</span>
                  <select
                    name="messageType"
                    value={voiceCallData.messageType}
                    onChange={onVoiceCallChange}
                    disabled={submitting}
                    aria-label="Voice message type"
                    aria-describedby="message-type-help"
                  >
                    <option value="text">Text to speech</option>
                  <option value="audio">Pre-recorded audio</option>
                </select>
              </label>

              {voiceCallData.messageType === 'text' && (
                <label className="reminderalert-field reminderalert-field-full">
                  <span>Spoken message {formErrors.voiceMessage && <span className="error-indicator">*</span>}</span>
                  <textarea
                    name="voiceMessage"
                    value={voiceCallData.voiceMessage}
                    onChange={onVoiceCallChange}
                    placeholder="Example: Please remember to take your medicine at 2 PM."
                    rows="4"
                    maxLength="500"
                    disabled={submitting}
                    aria-invalid={!!formErrors.voiceMessage}
                  />
                  <small className="reminderalert-inline-meta">
                    {voiceCallData.voiceMessage.length}/500 characters
                  </small>
                  {formErrors.voiceMessage && <small className="error-text">{formErrors.voiceMessage}</small>}
                </label>
              )}

              {voiceCallData.messageType === 'audio' && (
                <div className="reminderalert-field reminderalert-field-full">
                  <span>Record or upload voice note</span>
                  <div className="reminderalert-voice-recorder-section">
                    <VoiceNoteRecorder
                      module="reminder"
                      contextId={editingTaskId || 'new'}
                      recipientId={voiceCallData.recipientPhoneNumber}
                      onSend={(voiceNote) => {
                        const uploadedVoiceNoteUrl = resolveVoiceNoteUrl(voiceNote);
                        onVoiceNoteUpload({
                          voiceNoteUrl: uploadedVoiceNoteUrl,
                          voiceNotePreviewUrl: voiceNote?.previewUrl || uploadedVoiceNoteUrl,
                        });
                      }}
                    />
                    {voiceCallData.voiceNoteUrl && (
                      <div className="reminderalert-voice-note-preview">
                        <p className="reminderalert-voice-note-label">✓ Voice note recorded</p>
                        <audio
                          controls
                          preload="metadata"
                          src={voiceCallData.voiceNotePreviewUrl || voiceCallData.voiceNoteUrl}
                        >
                          Your browser could not play this recording.
                        </audio>
                        <button
                          type="button"
                          className="reminderalert-filter-chip"
                          onClick={() => onVoiceNoteUpload({ voiceNoteUrl: '', voiceNotePreviewUrl: '' })}
                          disabled={submitting}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            </fieldset>
          </fieldset>
        )}

        {/* Submit Buttons */}
        <div className="reminderalert-submit-row">
          <button
            type="submit"
            className="reminderalert-add-btn"
            disabled={submitting}
            aria-label={editingTaskId ? 'Update reminder (Ctrl+S)' : 'Save reminder (Ctrl+S)'}
            title="Press Ctrl+S or Cmd+S to save"
          >
            {submitting
              ? editingTaskId ? 'Updating...' : 'Saving...'
              : editingTaskId ? 'Update reminder' : 'Save reminder'}
          </button>
          <button
            type="button"
            className="reminderalert-filter-chip"
            onClick={onCancel}
            disabled={submitting}
            aria-label="Cancel changes (Esc)"
            title="Press Escape to cancel"
          >
            Cancel
          </button>
        </div>

        {/* Keyboard Shortcuts Help */}
        <details className="reminderalert-help-section">
          <summary aria-label="Keyboard shortcuts information">
            <span>Keyboard shortcuts available</span>
          </summary>
          <div className="reminderalert-help-content">
            <ul role="list">
              <li><kbd>Ctrl</kbd> + <kbd>S</kbd> (or <kbd>Cmd</kbd> + <kbd>S</kbd>): Save reminder</li>
              <li><kbd>Esc</kbd>: Cancel and close form</li>
              <li><kbd>Tab</kbd>: Move to next field</li>
              <li><kbd>Shift</kbd> + <kbd>Tab</kbd>: Move to previous field</li>
            </ul>
          </div>
        </details>
      </form>
    </article>
  );
});

ReminderForm.displayName = 'ReminderForm';

export default ReminderForm;
