import React, { useEffect, useState, useCallback, useMemo } from 'react';
import '../../styles/ReminderAlert.css';
import '../../styles/TrustedContacts.css';
import './styles/accessibility.css';
import {
  getAcceptedTrustedContacts,
  shareReminderWithContacts
} from '../../services/remindersService';
import { useReminders } from './hooks/useReminders';
import { useReminderFilters } from './hooks/useReminderFilters';
import { useVoiceCall } from './hooks/useVoiceCall';
import ReminderForm from './components/ReminderForm';
import ReminderList from './components/ReminderList';
import ReminderFilters from './components/ReminderFilters';
import ReminderStats from './components/ReminderStats';
import CountdownTimer from './components/CountdownTimer';
import ErrorAlert from './components/ErrorAlert';
import TrustedContacts from './TrustedContacts';
import { announceToScreenReader } from './utils/a11y';
import { validateReminderForm } from './validation';
import { toDateInputValue } from './reminderUtils';

const INITIAL_FORM = {
  title: '',
  description: '',
  category: 'Work',
  priority: 'Medium',
  dueDate: '',
  dueTime: '',
  reminders: ['In-app'],
  recurring: 'none',
  sharedWithTrustedContacts: [],
};

const INITIAL_VOICE_CALL_FORM = {
  recipientPhoneNumber: '',
  voiceMessage: '',
  messageType: 'text',
  voiceNoteUrl: '',
  voiceNotePreviewUrl: '',
};

const padDatePart = (value) => String(value).padStart(2, '0');

const getLocalDateInputValue = (value = new Date()) =>
  `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}-${padDatePart(value.getDate())}`;

const getLocalTimeInputValue = (value = new Date()) =>
  `${padDatePart(value.getHours())}:${padDatePart(value.getMinutes())}`;

const getDueDateTime = (dueDate, dueTime = '') => {
  const dateValue = toDateInputValue(dueDate);
  if (!dateValue) return null;

  const [year, month, day] = dateValue.split('-').map(part => parseInt(part, 10));
  if ([year, month, day].some(part => Number.isNaN(part))) return null;

  const dueDateTime = new Date(year, month - 1, day);
  if (Number.isNaN(dueDateTime.getTime())) return null;

  if (dueTime) {
    const [hours, minutes] = String(dueTime).split(':').map(part => parseInt(part, 10));
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    dueDateTime.setHours(hours, minutes, 0, 0);
  } else {
    dueDateTime.setHours(0, 0, 0, 0);
  }

  return dueDateTime;
};

/**
 * ReminderAlert - Main container component for reminder management
 * Orchestrates all reminder-related functionality using custom hooks and subcomponents
 * 
 * @component
 * @example
 * <ReminderAlert />
 */
const ReminderAlert = () => {
  // Custom hooks
  const {
    reminders,
    loading,
    error,
    filter,
    setFilter,
    load: loadReminders,
    create: createReminder,
    update: updateReminder,
    remove: deleteReminder,
    toggleCompletion: toggleReminderCompletion,
    clearError,
    retry
  } = useReminders();

  const {
    activeFilter,
    setFilter: setActiveFilter,
    filteredReminders,
    filterOptions,
    stats
  } = useReminderFilters(reminders);

  const {
    trigger: triggerVoiceCall,
    createWithCall: createReminderWithCall,
    loading: voiceCallLoading,
    error: voiceCallError
  } = useVoiceCall();

  // Local state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState('');
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [voiceCallData, setVoiceCallData] = useState(INITIAL_VOICE_CALL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [trustedContacts, setTrustedContacts] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Load trusted contacts
  useEffect(() => {
    const loadTrustedContacts = async () => {
      try {
        const response = await getAcceptedTrustedContacts();
        setTrustedContacts(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Failed to load trusted contacts:', err);
      }
    };

    loadTrustedContacts();
  }, []);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Memoized date/time labels
  const currentDateLabel = useMemo(() => {
    return currentTime.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [currentTime]);

  const currentClockLabel = useMemo(() => {
    return currentTime.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [currentTime]);

  // Memoized due date/time preview
  const dueDateTimePreview = useMemo(() => {
    return formData.dueDate && formData.dueTime
      ? getDueDateTime(formData.dueDate, formData.dueTime)
      : null;
  }, [formData.dueDate, formData.dueTime]);

  // Memoized next due task
  const nextDueTask = useMemo(() => {
    const pending = reminders.filter(r => !r.completed);
    if (pending.length === 0) return null;
    return pending.sort((a, b) => {
      const aTime = getDueDateTime(a.dueDate, a.dueTime)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bTime = getDueDateTime(b.dueDate, b.dueTime)?.getTime() ?? Number.POSITIVE_INFINITY;
      return aTime - bTime;
    })[0];
  }, [reminders]);

  // Form handlers
  const clearEditorValues = useCallback(() => {
    setFormData(INITIAL_FORM);
    setVoiceCallData(INITIAL_VOICE_CALL_FORM);
    setEditingTaskId('');
    setSubmitError(null);
  }, []);

  const closeEditor = useCallback(() => {
    clearEditorValues();
    setShowAddForm(false);
  }, [clearEditorValues]);

  const openCreateForm = useCallback(() => {
    clearEditorValues();
    setShowAddForm(true);
  }, [clearEditorValues]);

  const handleFormChange = useCallback((event) => {
    const { name, value, checked, type } = event.target;

    if (type === 'checkbox' && name === 'reminders') {
      setFormData(current => {
        const nextReminderChannels = checked
          ? [...current.reminders, value]
          : current.reminders.filter(item => item !== value);

        return {
          ...current,
          reminders: nextReminderChannels,
        };
      });

      if (!checked && value === 'Call') {
        setVoiceCallData(current => ({
          ...current,
          recipientPhoneNumber: '',
          voiceMessage: '',
          messageType: 'text',
          voiceNoteUrl: '',
          voiceNotePreviewUrl: '',
        }));
      }
      return;
    }

    if (type === 'checkbox' && name === 'sharedWithTrustedContacts') {
      setFormData(current => ({
        ...current,
        sharedWithTrustedContacts: checked
          ? [...current.sharedWithTrustedContacts, value]
          : current.sharedWithTrustedContacts.filter(item => item !== value),
      }));
      return;
    }

    setFormData(current => ({
      ...current,
      [name]: value,
    }));
  }, []);

  const handleVoiceCallChange = useCallback((event) => {
    const { name, value } = event.target;
    setVoiceCallData(current => {
      if (name === 'messageType' && value === 'text') {
        return {
          ...current,
          messageType: value,
          voiceNoteUrl: '',
          voiceNotePreviewUrl: '',
        };
      }
      return { ...current, [name]: value };
    });
  }, []);

  const handleVoiceNoteUpload = useCallback((voiceNoteData) => {
    setVoiceCallData(current => ({
      ...current,
      ...voiceNoteData,
    }));
  }, []);

  const handleApplyCurrentDate = useCallback(() => {
    setFormData(current => ({
      ...current,
      dueDate: getLocalDateInputValue(currentTime),
    }));
  }, [currentTime]);

  const handleApplyCurrentTime = useCallback(() => {
    setFormData(current => ({
      ...current,
      dueTime: getLocalTimeInputValue(currentTime),
    }));
  }, [currentTime]);

  const handleApplyCurrentDateTime = useCallback(() => {
    setFormData(current => ({
      ...current,
      dueDate: getLocalDateInputValue(currentTime),
      dueTime: getLocalTimeInputValue(currentTime),
    }));
  }, [currentTime]);

  const handleEdit = useCallback((task) => {
    setEditingTaskId(task._id);
    setFormData({
      title: task.title || '',
      description: task.description || '',
      category: task.category || 'Work',
      priority: task.priority || 'Medium',
      dueDate: toDateInputValue(task.dueDate),
      dueTime: task.dueTime || '',
      reminders: Array.isArray(task.reminders) && task.reminders.length ? task.reminders : ['In-app'],
      recurring: task.recurring || 'none',
      sharedWithTrustedContacts: task.sharedWithTrustedContacts || [],
    });
    setVoiceCallData({
      recipientPhoneNumber: task.recipientPhoneNumber || '',
      voiceMessage: task.voiceMessage || '',
      messageType: task.messageType || 'text',
      voiceNoteUrl: task.voiceNoteUrl || '',
      voiceNotePreviewUrl: task.voiceNoteUrl || '',
    });
    setSubmitError(null);
    setShowAddForm(true);
  }, []);

  const handleToggleComplete = useCallback(async (taskId) => {
    try {
      const task = reminders.find(item => item._id === taskId);
      if (!task) return;
      await toggleReminderCompletion(taskId, !task.completed);
    } catch (err) {
      console.error('Error updating reminder:', err);
      setSubmitError(err.message || 'Failed to update reminder');
    }
  }, [reminders, toggleReminderCompletion]);

  const handleDelete = useCallback(async (taskId) => {
    if (!window.confirm('Delete this reminder?')) return;

    try {
      await deleteReminder(taskId);
    } catch (err) {
      console.error('Error deleting reminder:', err);
      setSubmitError(err.message || 'Failed to delete reminder');
    }
  }, [deleteReminder]);

  const handleTriggerVoiceCall = useCallback(async (taskId) => {
    try {
      await triggerVoiceCall(taskId);
    } catch (err) {
      console.error('Error triggering voice call:', err);
      setSubmitError(err.message || 'Failed to trigger voice call');
    }
  }, [triggerVoiceCall]);

  const handleSubmit = useCallback(async (event) => {
    if (event?.preventDefault) {
      event.preventDefault();
    }
    setSubmitError(null);

    const validationData = {
      ...formData,
      recipientPhoneNumber: formData.reminders.includes('Call')
        ? voiceCallData.recipientPhoneNumber
        : '',
      voiceMessage: formData.reminders.includes('Call') ? voiceCallData.voiceMessage : '',
      messageType: formData.reminders.includes('Call') ? voiceCallData.messageType : 'text',
    };

    const { isValid, errors } = validateReminderForm(validationData);
    if (!isValid) {
      const validationMessage = Object.values(errors).join('. ');
      setSubmitError(validationMessage);
      announceToScreenReader(
        `Reminder form validation failed: ${Object.values(errors).join(', ')}`,
        'assertive'
      );
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        ...formData,
        dueDate: new Date(formData.dueDate),
        recipientPhoneNumber: formData.reminders.includes('Call')
          ? voiceCallData.recipientPhoneNumber
          : '',
        voiceMessage: formData.reminders.includes('Call') ? voiceCallData.voiceMessage : '',
        messageType: formData.reminders.includes('Call') ? voiceCallData.messageType : 'text',
        voiceNoteUrl: formData.reminders.includes('Call') && voiceCallData.messageType === 'audio'
          ? voiceCallData.voiceNoteUrl
          : '',
      };

      let savedTask = null;

      if (editingTaskId) {
        savedTask = await updateReminder(editingTaskId, payload);
      } else if (formData.reminders.includes('Call')) {
        savedTask = await createReminderWithCall(payload);
      } else {
        savedTask = await createReminder(payload);
      }

      if (savedTask?._id) {
        const sharedReminder = await shareReminderWithContacts(
          savedTask._id,
          formData.sharedWithTrustedContacts
        );
        if (sharedReminder?.data?._id) {
          savedTask = sharedReminder.data;
        }
      }

      if (!editingTaskId && formData.reminders.includes('Call')) {
        await loadReminders();
      }

      announceToScreenReader(
        editingTaskId ? 'Reminder updated successfully' : 'Reminder created successfully',
        'polite'
      );
      closeEditor();
    } catch (err) {
      console.error('Error saving reminder:', err);
      setSubmitError(err.message || 'Failed to save reminder');
    } finally {
      setSubmitting(false);
    }
  }, [
    formData,
    voiceCallData,
    editingTaskId,
    createReminder,
    createReminderWithCall,
    updateReminder,
    loadReminders,
    closeEditor,
  ]);

  return (
    <div className="reminderalert-page">
      {/* Current Time Display */}
      <div className="reminderalert-current-time">
        <div className="reminderalert-time-display">
          <p className="reminderalert-time-label">Current date and time</p>
          <strong>{currentDateLabel}</strong>
          <p className="reminderalert-time-clock">{currentClockLabel}</p>
        </div>
        {showAddForm && (
          <CountdownTimer
            dueDateTime={dueDateTimePreview}
            showQuickActions={true}
            onApplyDate={handleApplyCurrentDate}
            onApplyTime={handleApplyCurrentTime}
            onApplyDateTime={handleApplyCurrentDateTime}
            disabled={submitting}
          />
        )}
      </div>

      {/* Hero Section */}
      <section className="reminderalert-hero">
        <div className="reminderalert-hero-copy">
          <p className="reminderalert-eyebrow">Reminder workspace</p>
          <h1>Smart To-Do & Reminder System</h1>
          <p className="reminderalert-intro">
            Plan follow-ups, automate nudges, and share critical reminders with people you trust,
            all from one cleaner workspace.
          </p>
          <div className="reminderalert-hero-actions">
            <button
              type="button"
              className="reminderalert-add-btn"
              onClick={() => {
                if (showAddForm) {
                  closeEditor();
                } else {
                  openCreateForm();
                }
              }}
              disabled={loading}
            >
              {showAddForm ? 'Close editor' : 'Add reminder'}
            </button>
            {showAddForm && editingTaskId && (
              <button
                type="button"
                className="reminderalert-filter-chip"
                onClick={openCreateForm}
                disabled={submitting}
              >
                Start new
              </button>
            )}
          </div>
          {error && (
            <ErrorAlert
              error={error}
              onDismiss={clearError}
              onRetry={error.canRetry ? retry : null}
            />
          )}
        </div>

        <aside className="reminderalert-highlight-card">
          <p className="reminderalert-highlight-label">Next up</p>
          <strong>
            {nextDueTask ? nextDueTask.title : 'You have a clear schedule right now'}
          </strong>
          <p>
            {nextDueTask
              ? `${new Date(nextDueTask.dueDate).toLocaleDateString()} • ${nextDueTask.priority} priority`
              : 'Create a reminder and it will appear here with the soonest due time.'}
          </p>
        </aside>
      </section>

      {/* Statistics */}
      <ReminderStats stats={stats} reminders={reminders} />

      {/* Main Layout */}
      <section className="reminderalert-layout">
        <div className="reminderalert-primary-column">
          {/* Reminder Form */}
          {showAddForm && (
            <ReminderForm
              formData={formData}
              voiceCallData={voiceCallData}
              trustedContacts={trustedContacts}
              submitting={submitting}
              editingTaskId={editingTaskId}
              error={submitError}
              onChange={handleFormChange}
              onVoiceCallChange={handleVoiceCallChange}
              onVoiceNoteUpload={handleVoiceNoteUpload}
              onSubmit={handleSubmit}
              onCancel={closeEditor}
              countdown={
                formData.dueDate && formData.dueTime
                  ? {
                      days: 0,
                      hours: 0,
                      minutes: 0,
                      seconds: 0,
                      isPast: false,
                    }
                  : null
              }
              onApplyCurrentDate={handleApplyCurrentDate}
              onApplyCurrentTime={handleApplyCurrentTime}
              onApplyCurrentDateTime={handleApplyCurrentDateTime}
              currentDateLabel={currentDateLabel}
              currentClockLabel={currentClockLabel}
            />
          )}

          {/* Filters */}
          <ReminderFilters
            filterOptions={filterOptions}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            stats={stats}
          />

          {/* Reminder List */}
          <ReminderList
            reminders={filteredReminders}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleCompletion={handleToggleComplete}
            onTriggerVoiceCall={handleTriggerVoiceCall}
          />
        </div>
      </section>

      {/* Trusted Contacts Section */}
      <section className="reminderalert-trusted-section">
        <TrustedContacts onContactsUpdate={setTrustedContacts} />
      </section>
    </div>
  );
};

export default ReminderAlert;
