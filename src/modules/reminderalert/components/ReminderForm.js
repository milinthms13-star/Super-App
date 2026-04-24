import React, { useState, useCallback } from 'react';
import VoiceNoteRecorder from '../../../components/VoiceNoteRecorder';
import { validateReminderForm } from '../validation';

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

  const handleSubmit = (e) => {
    e.preventDefault();

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
      return;
    }

    setFormErrors({});
    onSubmit();
  };

  const resolveVoiceNoteUrl = (voiceNote) => {
    if (!voiceNote) return '';
    if (typeof voiceNote === 'string') return voiceNote;
    return voiceNote.s3Url || voiceNote.url || voiceNote.voiceNote?.s3Url || voiceNote.voiceNote?.url || '';
  };

  return (
    <article className="reminderalert-panel">
      <div className="reminderalert-panel-heading">
        <p>{editingTaskId ? 'Update reminder' : 'Create reminder'}</p>
        <h2>{editingTaskId ? 'Edit the current reminder' : 'Build a new reminder'}</h2>
      </div>

      <form className="reminderalert-editor-form" onSubmit={handleSubmit}>
        {error && (
          <div className="reminderalert-alert reminderalert-alert-error">
            {error}
          </div>
        )}

        {/* Basic Fields */}
        <div className="reminderalert-editor-grid">
          <label className="reminderalert-field reminderalert-field-full">
            <span>Title {formErrors.title && <span className="error-indicator">*</span>}</span>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={onChange}
              placeholder="Example: Doctor follow-up"
              disabled={submitting}
              aria-invalid={!!formErrors.title}
              aria-describedby={formErrors.title ? 'title-error' : undefined}
            />
            {formErrors.title && <small id="title-error" className="error-text">{formErrors.title}</small>}
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
            />
          </label>

          <label className="reminderalert-field">
            <span>Category</span>
            <select
              name="category"
              value={formData.category}
              onChange={onChange}
              disabled={submitting}
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
            >
              {PRIORITIES.map((pri) => (
                <option key={pri} value={pri}>{pri}</option>
              ))}
            </select>
          </label>

          <label className="reminderalert-field">
            <span>Due date {formErrors.dueDate && <span className="error-indicator">*</span>}</span>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={onChange}
              disabled={submitting}
              aria-invalid={!!formErrors.dueDate}
            />
            <small className="reminderalert-inline-meta">Today: {currentDateLabel}</small>
            {formErrors.dueDate && <small className="error-text">{formErrors.dueDate}</small>}
          </label>

          <label className="reminderalert-field">
            <span>Due time</span>
            <input
              type="time"
              name="dueTime"
              value={formData.dueTime}
              onChange={onChange}
              disabled={submitting}
            />
            <small className="reminderalert-inline-meta">Now: {currentClockLabel}</small>
          </label>

          <label className="reminderalert-field">
            <span>Recurring</span>
            <select
              name="recurring"
              value={formData.recurring}
              onChange={onChange}
              disabled={submitting}
            >
              {RECURRING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>

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
        <section className="reminderalert-section-block">
          <div className="reminderalert-section-heading">
            <h3>Reminder channels {formErrors.reminders && <span className="error-indicator">*</span>}</h3>
            <p>Select how this reminder should reach you.</p>
          </div>
          <div className="reminderalert-choice-grid">
            {CHANNEL_OPTIONS.map((channel) => {
              const isSelected = formData.reminders.includes(channel.value);
              return (
                <label
                  key={channel.value}
                  className={`reminderalert-choice-card ${isSelected ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    name="reminders"
                    value={channel.value}
                    checked={isSelected}
                    onChange={onChange}
                    disabled={submitting}
                  />
                  <div className="reminderalert-choice-copy">
                    <strong>{channel.title}</strong>
                    <p>{channel.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
          {formErrors.reminders && <small className="error-text">{formErrors.reminders}</small>}
        </section>

        {/* Trusted Contacts */}
        {trustedContacts.length > 0 && (
          <section className="reminderalert-section-block">
            <div className="reminderalert-section-heading">
              <h3>Share with trusted contacts</h3>
              <p>Let someone else receive and acknowledge this reminder too.</p>
            </div>
            <div className="reminderalert-choice-grid reminderalert-choice-grid-contacts">
              {trustedContacts.map((contact) => {
                const contactId = contact.recipientId?._id;
                const isSelected = formData.sharedWithTrustedContacts?.includes(contactId);
                return (
                  <label
                    key={contact._id}
                    className={`reminderalert-choice-card ${isSelected ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      name="sharedWithTrustedContacts"
                      value={contactId}
                      checked={isSelected}
                      onChange={onChange}
                      disabled={submitting || !contactId}
                    />
                    <div className="reminderalert-choice-copy">
                      <strong>{contact.recipientId?.name || contact.recipientId?.username || 'Contact'}</strong>
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
          </section>
        )}

        {/* Voice Call Setup */}
        {formData.reminders.includes('Call') && (
          <section className="reminderalert-section-block reminderalert-voice-block">
            <div className="reminderalert-section-heading">
              <h3>Voice call setup</h3>
              <p>This reminder will ring the number below and play the message you provide.</p>
            </div>

            <div className="reminderalert-alert reminderalert-alert-info">
              Voice call reminders work best for high priority events, medicine schedules, and time-sensitive follow-ups.
            </div>

            <div className="reminderalert-editor-grid">
              <label className="reminderalert-field">
                <span>Phone number {formErrors.recipientPhoneNumber && <span className="error-indicator">*</span>}</span>
                <input
                  type="tel"
                  name="recipientPhoneNumber"
                  value={voiceCallData.recipientPhoneNumber}
                  onChange={onVoiceCallChange}
                  placeholder="+91 98765 43210"
                  disabled={submitting}
                  aria-invalid={!!formErrors.recipientPhoneNumber}
                />
                {formErrors.recipientPhoneNumber && <small className="error-text">{formErrors.recipientPhoneNumber}</small>}
              </label>

              <label className="reminderalert-field">
                <span>Message type</span>
                <select
                  name="messageType"
                  value={voiceCallData.messageType}
                  onChange={onVoiceCallChange}
                  disabled={submitting}
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
          </section>
        )}

        {/* Submit Buttons */}
        <div className="reminderalert-submit-row">
          <button
            type="submit"
            className="reminderalert-add-btn"
            disabled={submitting}
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
          >
            Cancel
          </button>
        </div>
      </form>
    </article>
  );
});

ReminderForm.displayName = 'ReminderForm';

export default ReminderForm;
