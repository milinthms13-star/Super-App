import React, { useState, useEffect, useRef, useCallback } from 'react';
import VoiceNoteRecorder from '../../../components/VoiceNoteRecorder';
import ProReminderContactPicker from './ProReminderContactPicker';
import { validateReminderForm } from '../validation';
import { notifyContact, callContact } from '../../../services/remindersService';
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
    description: 'Shows the reminder inside your MGRAND HUB workspace.',
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
  {
    value: 'Email',
    title: 'Email',
    description: 'Sends a reminder email at your configured reminder times.',
  },
  {
    value: 'WhatsApp',
    title: 'WhatsApp',
    description: 'Delivers reminders as WhatsApp messages.',
  },
  {
    value: 'Telegram',
    title: 'Telegram',
    description: 'Sends reminders to your Telegram chat.',
  },
  {
    value: 'Push',
    title: 'Push notification',
    description: 'Shows reminders on connected devices with push enabled.',
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
  // Pro Reminder props
  selectedContact = null,
  onContactSelect,
  deliveryMode = 'text',
  onDeliveryModeChange,
}) => {
  const [formErrors, setFormErrors] = useState({});
  const [callActionState, setCallActionState] = useState({ loading: false, error: null, success: null });
  const [notifyActionState, setNotifyActionState] = useState({ loading: false, error: null, success: null });
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

  // ── Pro: manual call action ───────────────────────────────────────────────
  const handleManualCall = useCallback(async () => {
    if (!editingTaskId) return;
    setCallActionState({ loading: true, error: null, success: null });
    try {
      const result = await callContact(editingTaskId);
      if (result.callMethod === 'tel-uri' && result.data?.telUri) {
        window.location.href = result.data.telUri;
      }
      setCallActionState({
        loading: false,
        error: null,
        success: `Call initiated to ${result.data?.recipientName || 'contact'}`,
      });
      announceToScreenReader(`Call initiated to ${result.data?.recipientName || 'contact'}`, 'polite');
    } catch (err) {
      setCallActionState({ loading: false, error: err.message, success: null });
    }
  }, [editingTaskId]);

  // ── Pro: manual notify action ─────────────────────────────────────────────
  const handleManualNotify = useCallback(async () => {
    if (!editingTaskId) return;
    setNotifyActionState({ loading: true, error: null, success: null });
    try {
      const result = await notifyContact(editingTaskId);
      const channels = (result.data?.deliveryResults || [])
        .filter((r) => r.success)
        .map((r) => r.channel)
        .join(', ');
      setNotifyActionState({
        loading: false,
        error: null,
        success: channels ? `Sent via ${channels}` : 'Notification sent',
      });
      announceToScreenReader('Reminder notification sent', 'polite');
    } catch (err) {
      setNotifyActionState({ loading: false, error: err.message, success: null });
    }
  }, [editingTaskId]);

  function handleSubmit(e) {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    const validationData = {
      ...formData,
      recipientPhoneNumber: voiceCallData.recipientPhoneNumber,
      voiceMessage: voiceCallData.voiceMessage,
      messageType: voiceCallData.messageType,
      voiceNoteUrl: voiceCallData.voiceNoteUrl,
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
    onSubmit();
  }

  function handleKeyDown(e) {
    const handled = handleKeyboardShortcut(e, {
      save: handleSubmit,
      cancel: onCancel,
    });

    if (handled) return;

    if (e.key === 'Tab') {
      trapFocus(e, formRef.current);
    }
  }

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

        {/* ── PRO: Recipient & Delivery Mode ────────────────────────────── */}
        <fieldset className="reminderalert-section-block pro-recipient-section">
          <legend className="reminderalert-section-heading">
            <h3>👤 Who gets this reminder?</h3>
            <p>Set it for yourself or schedule it for someone in your contacts. The other person must not have blocked you.</p>
          </legend>

          <ProReminderContactPicker
            selectedContact={selectedContact}
            onSelect={onContactSelect}
            disabled={submitting}
          />

          {/* Delivery mode selector — shown only when a contact is selected */}
          {selectedContact && (
            <div className="pro-delivery-mode">
              <p className="pro-delivery-mode__label">How should {selectedContact.name} receive this reminder?</p>
              <div className="pro-delivery-mode__options" role="group" aria-label="Delivery mode">
                <label
                  className={`pro-delivery-mode__option ${deliveryMode === 'text' ? 'pro-delivery-mode__option--active' : ''}`}
                >
                  <input
                    type="radio"
                    name="deliveryMode"
                    value="text"
                    checked={deliveryMode === 'text'}
                    onChange={() => onDeliveryModeChange('text')}
                    disabled={submitting}
                  />
                  <span className="pro-delivery-mode__icon">💬</span>
                  <span className="pro-delivery-mode__text">
                    <strong>Text Message</strong>
                    <small>WhatsApp (free) or in-app notification</small>
                  </span>
                </label>

                <label
                  className={`pro-delivery-mode__option ${deliveryMode === 'voice' ? 'pro-delivery-mode__option--active' : ''}`}
                >
                  <input
                    type="radio"
                    name="deliveryMode"
                    value="voice"
                    checked={deliveryMode === 'voice'}
                    onChange={() => onDeliveryModeChange('voice')}
                    disabled={submitting}
                  />
                  <span className="pro-delivery-mode__icon">📞</span>
                  <span className="pro-delivery-mode__text">
                    <strong>Voice Call</strong>
                    <small>Phone call with spoken message</small>
                  </span>
                </label>
              </div>

              {/* WhatsApp number input for text mode */}
              {deliveryMode === 'text' && (
                <div className="pro-delivery-mode__config">
                  <label className="reminderalert-field">
                    <span>WhatsApp number for {selectedContact.name}</span>
                    <input
                      type="tel"
                      name="whatsappPhoneNumber"
                      value={formData.whatsappPhoneNumber || ''}
                      onChange={onChange}
                      placeholder={selectedContact.phoneNumber || '+91 98765 43210'}
                      disabled={submitting}
                    />
                    <small className="reminderalert-inline-meta">
                      Used to send a free WhatsApp reminder. Leave blank to send only in-app.
                    </small>
                  </label>

                  {/* Manual notify button on existing reminders */}
                  {editingTaskId && (
                    <div className="pro-delivery-mode__action-row">
                      <button
                        type="button"
                        className="pro-delivery-action-btn pro-delivery-action-btn--notify"
                        onClick={handleManualNotify}
                        disabled={submitting || notifyActionState.loading}
                      >
                        {notifyActionState.loading ? 'Sending…' : '💬 Send Now'}
                      </button>
                      {notifyActionState.success && (
                        <span className="pro-delivery-action-feedback pro-delivery-action-feedback--ok">
                          ✓ {notifyActionState.success}
                        </span>
                      )}
                      {notifyActionState.error && (
                        <span className="pro-delivery-action-feedback pro-delivery-action-feedback--err">
                          ✗ {notifyActionState.error}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Phone number + voice message for voice mode */}
              {deliveryMode === 'voice' && (
                <div className="pro-delivery-mode__config">
                  <label className="reminderalert-field">
                    <span>Phone number for {selectedContact.name}</span>
                    <input
                      type="tel"
                      name="recipientPhoneNumber"
                      value={voiceCallData.recipientPhoneNumber}
                      onChange={onVoiceCallChange}
                      placeholder={selectedContact.phoneNumber || '+91 98765 43210'}
                      disabled={submitting}
                    />
                    <small className="reminderalert-inline-meta">
                      A phone call will be placed with your spoken message when the reminder fires.
                    </small>
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
                      <span>Spoken message</span>
                      <textarea
                        name="voiceMessage"
                        value={voiceCallData.voiceMessage}
                        onChange={onVoiceCallChange}
                        placeholder="Example: Please remember your appointment at 3 PM."
                        rows="3"
                        maxLength="500"
                        disabled={submitting}
                      />
                      <small className="reminderalert-inline-meta">
                        {voiceCallData.voiceMessage.length}/500 characters
                      </small>
                    </label>
                  )}

                  {voiceCallData.messageType === 'audio' && (
                    <div className="reminderalert-field reminderalert-field-full">
                      <span className="reminderalert-field-label">Record or upload voice note</span>
                      <VoiceNoteRecorder
                        module="reminder"
                        contextId={editingTaskId || 'new'}
                        recipientId={voiceCallData.recipientPhoneNumber}
                        onSend={(voiceNote) => {
                          const url = resolveVoiceNoteUrl(voiceNote);
                          onVoiceNoteUpload({ voiceNoteUrl: url, voiceNotePreviewUrl: url });
                        }}
                      />
                      {voiceCallData.voiceNoteUrl && (
                        <div className="reminderalert-voice-note-preview">
                          <p className="reminderalert-voice-note-label">✓ Voice note recorded</p>
                          <audio controls preload="metadata"
                            src={voiceCallData.voiceNotePreviewUrl || voiceCallData.voiceNoteUrl}>
                            Your browser could not play this recording.
                          </audio>
                          <button type="button" className="reminderalert-filter-chip"
                            onClick={() => onVoiceNoteUpload({ voiceNoteUrl: '', voiceNotePreviewUrl: '' })}
                            disabled={submitting}>
                            Clear
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual call button on existing reminders */}
                  {editingTaskId && (
                    <div className="pro-delivery-mode__action-row">
                      <button
                        type="button"
                        className="pro-delivery-action-btn pro-delivery-action-btn--call"
                        onClick={handleManualCall}
                        disabled={submitting || callActionState.loading}
                      >
                        {callActionState.loading ? 'Calling…' : '📞 Call Now'}
                      </button>
                      {callActionState.success && (
                        <span className="pro-delivery-action-feedback pro-delivery-action-feedback--ok">
                          ✓ {callActionState.success}
                        </span>
                      )}
                      {callActionState.error && (
                        <span className="pro-delivery-action-feedback pro-delivery-action-feedback--err">
                          ✗ {callActionState.error}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </fieldset>

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

        {/* Phase 1: Snooze Options */}
        <fieldset className="reminderalert-section-block">
          <legend className="reminderalert-section-heading">
            <h3>Snooze options (optional)</h3>
            <p>Configure how long you can snooze this reminder when it appears. Default is 5, 10, 15, and 30 minutes.</p>
          </legend>
          <div className="reminderalert-choice-grid" role="group" aria-label="snooze options">
            {[5, 10, 15, 30].map((minutes) => {
              const isSelected = (formData.snoozeOptions || []).includes(minutes);
              return (
                <label
                  key={`snooze-${minutes}`}
                  className={`reminderalert-choice-card ${isSelected ? 'selected' : ''}`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <input
                    type="checkbox"
                    name="snoozeOptions"
                    value={minutes}
                    checked={isSelected}
                    onChange={onChange}
                    disabled={submitting}
                    aria-label={`Snooze for ${minutes} minutes`}
                  />
                  <div className="reminderalert-choice-copy">
                    <strong>{minutes} minutes</strong>
                    <p>Pause this reminder</p>
                  </div>
                </label>
              );
            })}
          </div>
          <p className="reminderalert-help-text">You can always add custom snooze times when the reminder appears.</p>
        </fieldset>

        {/* Phase 1: Remind-Before Offsets */}
        <fieldset className="reminderalert-section-block">
          <legend className="reminderalert-section-heading">
            <h3>Advanced reminders (optional)</h3>
            <p>Get notified before the due time. Default is a single reminder 5 minutes before.</p>
          </legend>
          <div className="reminderalert-choice-grid" role="group" aria-label="reminder notification times">
            {[
              { value: 5, label: '5 minutes before' },
              { value: 15, label: '15 minutes before' },
              { value: 30, label: '30 minutes before' },
              { value: 60, label: '1 hour before' },
              { value: 1440, label: '1 day before' },
            ].map((offset) => {
              const isSelected = (formData.reminderBeforeOffsets || [5]).includes(offset.value);
              return (
                <label
                  key={`offset-${offset.value}`}
                  className={`reminderalert-choice-card ${isSelected ? 'selected' : ''}`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <input
                    type="checkbox"
                    name="reminderBeforeOffsets"
                    value={offset.value}
                    checked={isSelected}
                    onChange={onChange}
                    disabled={submitting}
                    aria-label={`Remind me ${offset.label}`}
                  />
                  <div className="reminderalert-choice-copy">
                    <strong>{offset.label}</strong>
                    <p>Get an early notification</p>
                  </div>
                </label>
              );
            })}
          </div>
          <p className="reminderalert-help-text">Select multiple times to get notifications at different intervals.</p>
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

        {/* Voice Call — handled in the Recipient section when a contact is selected */}
        {!selectedContact && formData.reminders.includes('Call') && (
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
                      {formErrors.voiceNoteUrl && (
                        <small className="error-text" role="alert">{formErrors.voiceNoteUrl}</small>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </fieldset>
          </fieldset>
        )}

        {!selectedContact && !formData.reminders.includes('Call') && (
          <div className="reminderalert-alert reminderalert-alert-info" role="note">
            <p style={{ marginBottom: '0.5rem' }}>
              Looking for voice note? Enable the <strong>Voice call</strong> channel above, then choose
              <strong> Pre-recorded audio</strong> in message type.
            </p>
            <button
              type="button"
              className="reminderalert-filter-chip"
              onClick={() =>
                onChange({
                  target: {
                    type: 'checkbox',
                    name: 'reminders',
                    value: 'Call',
                    checked: true,
                  },
                })
              }
              disabled={submitting}
            >
              Enable voice call
            </button>
          </div>
        )}

        {selectedContact && (
          <div className="reminderalert-alert reminderalert-alert-info" role="note">
            📞 Voice call and WhatsApp delivery for <strong>{selectedContact.name}</strong> are configured in the <em>Recipient</em> section above.
          </div>
        )}

        {/* Phase 2: SMS Setup */}
        {formData.reminders.includes('SMS') && (
          <fieldset className="reminderalert-section-block reminderalert-sms-block">
            <legend className="reminderalert-section-heading">
              <h3>SMS reminder setup</h3>
              <p>This reminder will send an SMS to the phone number you provide.</p>
            </legend>

            <div className="reminderalert-alert reminderalert-alert-info" role="note">
              💬 SMS reminders are reliable and work even without internet. You'll receive notifications at each scheduled time before the due date.
            </div>

            <fieldset>
              <legend className="sr-only">SMS configuration</legend>
              <div className="reminderalert-editor-grid">
                <label className="reminderalert-field reminderalert-field-full">
                  <span>
                    Phone number for SMS {formErrors.smsPhoneNumber && <span className="error-indicator" aria-label="required">*</span>}
                  </span>
                  <input
                    type="tel"
                    name="smsPhoneNumber"
                    value={formData.smsPhoneNumber || ''}
                    onChange={onChange}
                    placeholder="+91 98765 43210"
                    disabled={submitting}
                    aria-invalid={!!formErrors.smsPhoneNumber}
                    aria-describedby={formErrors.smsPhoneNumber ? 'sms-phone-error' : 'sms-phone-help'}
                  />
                  <small id="sms-phone-help" className="sr-only">Enter the phone number where the SMS reminder will be sent. Include country code if needed.</small>
                  {formErrors.smsPhoneNumber && (
                    <small id="sms-phone-error" className="error-text" role="alert">{formErrors.smsPhoneNumber}</small>
                  )}
                </label>
              </div>

              <div className="reminderalert-info-box">
                <p className="reminderalert-info-title">💡 SMS Notification Times</p>
                <p className="reminderalert-info-text">
                  You'll receive SMS notifications based on your Advanced Reminders settings:
                </p>
                <ul className="reminderalert-info-list">
                  {(formData.reminderBeforeOffsets || [5]).length > 0 ? (
                    (formData.reminderBeforeOffsets || [5]).map((offset) => {
                      const labels = {
                        5: '5 minutes before',
                        15: '15 minutes before',
                        30: '30 minutes before',
                        60: '1 hour before',
                        1440: '1 day before'
                      };
                      return (
                        <li key={`sms-offset-${offset}`}>
                          SMS notification: {labels[offset] || `${offset} minutes before`}
                        </li>
                      );
                    })
                  ) : (
                    <li>Default: 5 minutes before the due time</li>
                  )}
                </ul>
              </div>
            </fieldset>
          </fieldset>
        )}

        {/* Phase 3: Email Setup */}
        {formData.reminders.includes('Email') && (
          <fieldset className="reminderalert-section-block reminderalert-email-block">
            <legend className="reminderalert-section-heading">
              <h3>Email reminder setup</h3>
              <p>This reminder will send an email notification to the address you provide.</p>
            </legend>

            <div className="reminderalert-alert reminderalert-alert-info" role="note">
              📧 Email reminders are sent at each scheduled time before the due date. You can check your spam folder if you don't see them.
            </div>

            <fieldset>
              <legend className="sr-only">Email configuration</legend>
              <div className="reminderalert-editor-grid">
                <label className="reminderalert-field reminderalert-field-full">
                  <span>
                    Email address {formErrors.email && <span className="error-indicator" aria-label="required">*</span>}
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={onChange}
                    placeholder="your.email@example.com"
                    disabled={submitting}
                    aria-invalid={!!formErrors.email}
                    aria-describedby={formErrors.email ? 'email-error' : 'email-help'}
                  />
                  <small id="email-help" className="sr-only">Enter the email address where the reminder notification will be sent.</small>
                  {formErrors.email && (
                    <small id="email-error" className="error-text" role="alert">{formErrors.email}</small>
                  )}
                </label>
              </div>

              <div className="reminderalert-info-box">
                <p className="reminderalert-info-title">💡 Email Notification Times</p>
                <p className="reminderalert-info-text">
                  You'll receive email notifications based on your Advanced Reminders settings:
                </p>
                <ul className="reminderalert-info-list">
                  {(formData.reminderBeforeOffsets || [5]).length > 0 ? (
                    (formData.reminderBeforeOffsets || [5]).map((offset) => {
                      const labels = {
                        5: '5 minutes before',
                        15: '15 minutes before',
                        30: '30 minutes before',
                        60: '1 hour before',
                        1440: '1 day before'
                      };
                      return (
                        <li key={`email-offset-${offset}`}>
                          Email notification: {labels[offset] || `${offset} minutes before`}
                        </li>
                      );
                    })
                  ) : (
                    <li>Default: 5 minutes before the due time</li>
                  )}
                </ul>
              </div>
            </fieldset>
          </fieldset>
        )}

        {/* Phase 4: WhatsApp Setup */}
        {formData.reminders.includes('WhatsApp') && (
          <fieldset className="reminderalert-section-block reminderalert-whatsapp-block">
            <legend className="reminderalert-section-heading">
              <h3>WhatsApp reminder setup</h3>
              <p>Receive reminders via WhatsApp messages.</p>
            </legend>

            <div className="reminderalert-alert reminderalert-alert-info" role="note">
              💬 WhatsApp reminders reach you instantly. You'll receive formatted messages at each scheduled time.
            </div>

            <fieldset>
              <legend className="sr-only">WhatsApp configuration</legend>
              <div className="reminderalert-editor-grid">
                <label className="reminderalert-field reminderalert-field-full">
                  <span>
                    WhatsApp phone number {formErrors.whatsappPhoneNumber && <span className="error-indicator">*</span>}
                  </span>
                  <input
                    type="tel"
                    name="whatsappPhoneNumber"
                    value={formData.whatsappPhoneNumber || ''}
                    onChange={onChange}
                    placeholder="+91 98765 43210"
                    disabled={submitting}
                    aria-invalid={!!formErrors.whatsappPhoneNumber}
                  />
                  {formErrors.whatsappPhoneNumber && (
                    <small className="error-text" role="alert">{formErrors.whatsappPhoneNumber}</small>
                  )}
                </label>
              </div>
            </fieldset>
          </fieldset>
        )}

        {/* Phase 4: Telegram Setup */}
        {formData.reminders.includes('Telegram') && (
          <fieldset className="reminderalert-section-block reminderalert-telegram-block">
            <legend className="reminderalert-section-heading">
              <h3>Telegram reminder setup</h3>
              <p>Receive reminders via your Telegram bot.</p>
            </legend>

            <div className="reminderalert-alert reminderalert-alert-info" role="note">
              🤖 Telegram reminders are sent to your private chat. Ensure you've started our Telegram bot first.
            </div>

            <fieldset>
              <legend className="sr-only">Telegram configuration</legend>
              <div className="reminderalert-editor-grid">
                <label className="reminderalert-field reminderalert-field-full">
                  <span>
                    Telegram Chat ID {formErrors.telegramChatId && <span className="error-indicator">*</span>}
                  </span>
                  <input
                    type="text"
                    name="telegramChatId"
                    value={formData.telegramChatId || ''}
                    onChange={onChange}
                    placeholder="123456789"
                    disabled={submitting}
                    aria-invalid={!!formErrors.telegramChatId}
                  />
                  <small className="sr-only">Your unique Telegram chat ID. Get it from /start command in our bot.</small>
                  {formErrors.telegramChatId && (
                    <small className="error-text" role="alert">{formErrors.telegramChatId}</small>
                  )}
                </label>
              </div>
            </fieldset>
          </fieldset>
        )}

        {/* Phase 4: Push Notifications */}
        <fieldset className="reminderalert-section-block reminderalert-push-block">
          <legend className="reminderalert-section-heading">
            <h3>Push notification settings</h3>
            <p>Browser and mobile notifications for instant alerts.</p>
          </legend>

          <div className="reminderalert-editor-grid">
            <label className="reminderalert-field reminderalert-checkbox-field">
              <input
                type="checkbox"
                name="pushEnabled"
                checked={formData.pushEnabled || false}
                onChange={onChange}
                disabled={submitting}
              />
              <span>Enable push notifications for this reminder</span>
            </label>
          </div>

          {formData.pushEnabled && (
            <div className="reminderalert-alert reminderalert-alert-info" role="note">
              🔔 Push notifications will appear on all your connected devices. Make sure you've granted permission.
            </div>
          )}
        </fieldset>

        {/* Phase 4: Template Selection */}
        <fieldset className="reminderalert-section-block reminderalert-template-block">
          <legend className="reminderalert-section-heading">
            <h3>Notification template</h3>
            <p>Customize how your reminders are formatted (optional).</p>
          </legend>

          <div className="reminderalert-editor-grid">
            <label className="reminderalert-field reminderalert-field-full">
              <span>Message template</span>
              <select
                name="templateId"
                value={formData.templateId || ''}
                onChange={onChange}
                disabled={submitting}
              >
                <option value="">Use default template</option>
                <option value="custom">Create custom template</option>
              </select>
              <small className="sr-only">Choose how your reminder messages are formatted across different channels.</small>
            </label>
          </div>
        </fieldset>

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
            <ul>
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
