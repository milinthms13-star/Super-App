import React, { useEffect, useMemo, useState } from "react";
import "../../styles/ReminderAlert.css";
import "../../styles/TrustedContacts.css";
import {
  createVoiceCallReminder,
  getVoiceCallStatus,
  triggerVoiceCall,
  getAcceptedTrustedContacts,
  shareReminderWithContacts,
} from "../../services/remindersService";
import { useReminders } from "./hooks/useReminders";
import { validateReminderForm } from "./validation";
import ErrorAlert from "./components/ErrorAlert";
import { formatReminderDueDate, toDateInputValue } from "./reminderUtils";
import TrustedContacts from "./TrustedContacts";
import VoiceNoteRecorder from "../../components/VoiceNoteRecorder";

const PRIORITIES = ["Low", "Medium", "High"];
const CATEGORIES = ["Work", "Personal", "Urgent"];
const FILTERS = ["All", "Work", "Personal", "Urgent"];
const RECURRING_OPTIONS = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];
const CHANNEL_OPTIONS = [
  {
    value: "In-app",
    title: "In-app alert",
    description: "Shows the reminder inside your NilaHub workspace.",
  },
  {
    value: "SMS",
    title: "SMS",
    description: "Useful when you might be away from the app.",
  },
  {
    value: "Call",
    title: "Voice call",
    description: "Triggers an automated phone reminder with your message.",
  },
];
const INITIAL_FORM = {
  title: "",
  description: "",
  category: "Work",
  priority: "Medium",
  dueDate: "",
  dueTime: "",
  reminders: ["In-app"],
  recurring: "none",
  sharedWithTrustedContacts: [],
};
const INITIAL_VOICE_CALL_FORM = {
  recipientPhoneNumber: "",
  voiceMessage: "",
  messageType: "text",
  voiceNoteUrl: "",
  voiceNotePreviewUrl: "",
};

const resolveVoiceNoteUrl = (voiceNote) => {
  if (!voiceNote) {
    return "";
  }

  if (typeof voiceNote === "string") {
    return voiceNote;
  }

  return (
    voiceNote.s3Url ||
    voiceNote.url ||
    voiceNote.voiceNote?.s3Url ||
    voiceNote.voiceNote?.url ||
    ""
  );
};

const padDatePart = (value) => String(value).padStart(2, "0");

const getLocalDateInputValue = (value = new Date()) =>
  `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}-${padDatePart(value.getDate())}`;

const getLocalTimeInputValue = (value = new Date()) =>
  `${padDatePart(value.getHours())}:${padDatePart(value.getMinutes())}`;

const getDueDateTime = (dueDate, dueTime = "") => {
  const dateValue = toDateInputValue(dueDate);
  if (!dateValue) {
    return null;
  }

  const [year, month, day] = dateValue.split("-").map((part) => parseInt(part, 10));
  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return null;
  }

  const dueDateTime = new Date(year, month - 1, day);
  if (Number.isNaN(dueDateTime.getTime())) {
    return null;
  }

  if (dueTime) {
    const [hours, minutes] = String(dueTime)
      .split(":")
      .map((part) => parseInt(part, 10));

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return null;
    }

    dueDateTime.setHours(hours, minutes, 0, 0);
  } else {
    dueDateTime.setHours(0, 0, 0, 0);
  }

  return dueDateTime;
};

const formatDateTimeLabel = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "";
  }

  return value.toLocaleString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getReminderTimestamp = (task = {}) => {
  const dueDateTime = getDueDateTime(task.dueDate, task.dueTime || "09:00");
  if (!dueDateTime) {
    return Number.POSITIVE_INFINITY;
  }

  return dueDateTime.getTime();
};

const ReminderAlert = () => {
  // Use the new custom hook for reminder management
  const {
    reminders: tasks,
    loading,
    error,
    filter: activeFilter,
    setFilter: setActiveFilter,
    create: createReminder,
    update: updateReminder,
    remove: deleteReminder,
    toggleCompletion: toggleReminderCompletion,
    clearError,
    retry
  } = useReminders();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState("");
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [voiceCallData, setVoiceCallData] = useState(INITIAL_VOICE_CALL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [trustedContacts, setTrustedContacts] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [countdown, setCountdown] = useState(null);
  const currentDateLabel = currentTime.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const currentClockLabel = currentTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dueDateTimePreview = useMemo(
    () =>
      formData.dueDate && formData.dueTime
        ? getDueDateTime(formData.dueDate, formData.dueTime)
        : null,
    [formData.dueDate, formData.dueTime]
  );

  useEffect(() => {
    const loadTrustedContacts = async () => {
      try {
        const response = await getAcceptedTrustedContacts();
        setTrustedContacts(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error("Failed to load trusted contacts:", err);
      }
    };

    loadTrustedContacts();
  }, []);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate countdown when form has due date and time
  useEffect(() => {
    if (!dueDateTimePreview) {
      setCountdown(null);
      return;
    }

    const diffMs = dueDateTimePreview.getTime() - currentTime.getTime();

    if (diffMs > 0) {
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diffMs / 1000 / 60) % 60);
      const seconds = Math.floor((diffMs / 1000) % 60);

      setCountdown({
        days,
        hours,
        minutes,
        seconds,
        isPast: false,
      });
      return;
    }

    setCountdown({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isPast: true,
    });
  }, [currentTime, dueDateTimePreview]);

  const visibleTasks = useMemo(() => {
    const filteredTasks =
      activeFilter === "All"
        ? tasks
        : tasks.filter((task) => task.category === activeFilter);

    return [...filteredTasks].sort(
      (leftTask, rightTask) => getReminderTimestamp(leftTask) - getReminderTimestamp(rightTask)
    );
  }, [activeFilter, tasks]);

  const stats = useMemo(() => {
    const pending = tasks.filter((task) => !task.completed).length;
    const completed = tasks.filter((task) => task.completed).length;
    const highPriority = tasks.filter((task) => task.priority === "High" && !task.completed).length;
    const callEnabled = tasks.filter(
      (task) => task.reminders?.includes("Call") || task.recipientPhoneNumber
    ).length;

    return {
      total: tasks.length,
      pending,
      completed,
      highPriority,
      callEnabled,
    };
  }, [tasks]);

  const nextDueTask = useMemo(() => {
    const upcomingTasks = tasks
      .filter((task) => !task.completed)
      .sort((leftTask, rightTask) => getReminderTimestamp(leftTask) - getReminderTimestamp(rightTask));

    return upcomingTasks[0] || null;
  }, [tasks]);

  const clearEditorValues = () => {
    setFormData(INITIAL_FORM);
    setVoiceCallData(INITIAL_VOICE_CALL_FORM);
    setEditingTaskId("");
    setSubmitError(null);
  };

  const closeEditor = () => {
    clearEditorValues();
    setShowAddForm(false);
  };

  const openCreateForm = () => {
    clearEditorValues();
    setShowAddForm(true);
  };

  const applyCurrentDate = () => {
    setFormData((current) => ({
      ...current,
      dueDate: getLocalDateInputValue(currentTime),
    }));
  };

  const applyCurrentTime = () => {
    setFormData((current) => ({
      ...current,
      dueTime: getLocalTimeInputValue(currentTime),
    }));
  };

  const applyCurrentDateTime = () => {
    setFormData((current) => ({
      ...current,
      dueDate: getLocalDateInputValue(currentTime),
      dueTime: getLocalTimeInputValue(currentTime),
    }));
  };

  const handleFormChange = (event) => {
    const { name, value, checked, type } = event.target;

    if (type === "checkbox" && name === "reminders") {
      const nextReminderChannels = checked
        ? [...formData.reminders, value]
        : formData.reminders.filter((item) => item !== value);

      setFormData((current) => ({
        ...current,
        reminders: nextReminderChannels,
      }));

      if (!checked && value === "Call") {
        setVoiceCallData((current) => ({
          ...current,
          recipientPhoneNumber: "",
          voiceMessage: "",
          messageType: "text",
          voiceNoteUrl: "",
          voiceNotePreviewUrl: "",
        }));
      }
      return;
    }

    if (type === "checkbox" && name === "sharedWithTrustedContacts") {
      setFormData((current) => ({
        ...current,
        sharedWithTrustedContacts: checked
          ? [...current.sharedWithTrustedContacts, value]
          : current.sharedWithTrustedContacts.filter((item) => item !== value),
      }));
      return;
    }

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleVoiceCallChange = (event) => {
    const { name, value } = event.target;
    setVoiceCallData((current) => {
      if (name === "messageType" && value === "text") {
        return {
          ...current,
          messageType: value,
          voiceNoteUrl: "",
          voiceNotePreviewUrl: "",
        };
      }

      return {
        ...current,
        [name]: value,
      };
    });
  };

  const syncReminderSharing = async (reminderId, contactIds = []) => {
    const response = await shareReminderWithContacts(reminderId, contactIds);
    return response?.data || null;
  };

  const upsertTask = (savedTask, { prepend = false } = {}) => {
    if (!savedTask?._id) {
      return;
    }

    setTasks((current) => {
      const withoutCurrent = current.filter((task) => task._id !== savedTask._id);
      return prepend ? [savedTask, ...withoutCurrent] : [...withoutCurrent, savedTask];
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError(null);

    // Use comprehensive validation
    const validationData = {
      ...formData,
      recipientPhoneNumber: voiceCallData.recipientPhoneNumber,
      voiceMessage: voiceCallData.voiceMessage,
      messageType: voiceCallData.messageType
    };

    const { isValid, errors } = validateReminderForm(validationData);
    
    if (!isValid) {
      // Display first error message to user
      const firstError = Object.values(errors)[0];
      setSubmitError(firstError);
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        ...formData,
        dueDate: new Date(formData.dueDate),
        recipientPhoneNumber: formData.reminders.includes("Call")
          ? voiceCallData.recipientPhoneNumber
          : "",
        voiceMessage: formData.reminders.includes("Call") ? voiceCallData.voiceMessage : "",
        messageType: formData.reminders.includes("Call") ? voiceCallData.messageType : "text",
        voiceNoteUrl: formData.reminders.includes("Call") && voiceCallData.messageType === "audio"
          ? voiceCallData.voiceNoteUrl
          : "",
      };

      let savedTask = null;

      if (editingTaskId) {
        const response = await updateReminder(editingTaskId, payload);
        savedTask = response.data;
      } else if (formData.reminders.includes("Call")) {
        const response = await createVoiceCallReminder(payload);
        savedTask = response.data;
      } else {
        const response = await createReminder(payload);
        savedTask = response.data;
      }

      if (savedTask?._id) {
        const sharedReminder = await syncReminderSharing(
          savedTask._id,
          formData.sharedWithTrustedContacts
        );
        if (sharedReminder?._id) {
          savedTask = sharedReminder;
        }

        upsertTask(savedTask, { prepend: !editingTaskId });
      }

      closeEditor();
    } catch (err) {
      console.error("Error saving reminder:", err);
      setSubmitError(err.message || "Failed to save reminder");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (task) => {
    setEditingTaskId(task._id);
    setFormData({
      title: task.title || "",
      description: task.description || "",
      category: task.category || "Work",
      priority: task.priority || "Medium",
      dueDate: toDateInputValue(task.dueDate),
      dueTime: task.dueTime || "",
      reminders: Array.isArray(task.reminders) && task.reminders.length ? task.reminders : ["In-app"],
      recurring: task.recurring || "none",
      sharedWithTrustedContacts: task.sharedWithTrustedContacts || [],
    });
    setVoiceCallData({
      recipientPhoneNumber: task.recipientPhoneNumber || "",
      voiceMessage: task.voiceMessage || "",
      messageType: task.messageType || "text",
      voiceNoteUrl: task.voiceNoteUrl || "",
      voiceNotePreviewUrl: task.voiceNoteUrl || "",
    });
    setSubmitError(null);
    setShowAddForm(true);
  };

  const handleToggleComplete = async (taskId) => {
    try {
      const task = tasks.find((item) => item._id === taskId);
      if (!task) {
        return;
      }

      const response = await toggleReminderCompletion(taskId, !task.completed);
      upsertTask(response.data);
    } catch (err) {
      console.error("Error updating reminder:", err);
      setError(err.message || "Failed to update reminder");
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm("Delete this reminder?")) {
      return;
    }

    try {
      await deleteReminder(taskId);
      setTasks((current) => current.filter((task) => task._id !== taskId));
    } catch (err) {
      console.error("Error deleting reminder:", err);
      setError(err.message || "Failed to delete reminder");
    }
  };

  const handleTriggerVoiceCall = async (taskId) => {
    try {
      await triggerVoiceCall(taskId);
      const response = await getVoiceCallStatus(taskId);
      const nextStatus = response?.data || {};

      setTasks((current) =>
        current.map((task) =>
          task._id === taskId
            ? {
                ...task,
                callStatus: nextStatus.callStatus || task.callStatus,
                lastCallTime: nextStatus.lastCallTime || task.lastCallTime,
                nextCallTime: nextStatus.nextCallTime || task.nextCallTime,
                callAttempts: nextStatus.callAttempts ?? task.callAttempts,
                maxCallAttempts: nextStatus.maxCallAttempts ?? task.maxCallAttempts,
              }
            : task
        )
      );
    } catch (err) {
      console.error("Error triggering voice call:", err);
      setError(err.message || "Failed to trigger voice call");
    }
  };

  return (
    <div className="reminderalert-page">
      <div className="reminderalert-current-time">
        <div className="reminderalert-time-display">
          <p className="reminderalert-time-label">Current date and time</p>
          <strong>{currentDateLabel}</strong>
          <p className="reminderalert-time-clock">{currentClockLabel}</p>
        </div>
        {showAddForm && (
          <div className="reminderalert-time-actions">
            <button
              type="button"
              className="reminderalert-filter-chip"
              onClick={applyCurrentDate}
              disabled={submitting}
            >
              Use current date
            </button>
            <button
              type="button"
              className="reminderalert-filter-chip"
              onClick={applyCurrentTime}
              disabled={submitting}
            >
              Use current time
            </button>
            <button
              type="button"
              className="reminderalert-add-btn"
              onClick={applyCurrentDateTime}
              disabled={submitting}
            >
              Use now
            </button>
          </div>
        )}
      </div>

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
              {showAddForm ? "Close editor" : "Add reminder"}
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
            {nextDueTask ? nextDueTask.title : "You have a clear schedule right now"}
          </strong>
          <p>
            {nextDueTask
              ? `${formatReminderDueDate(nextDueTask.dueDate, nextDueTask.dueTime)} • ${
                  nextDueTask.priority
                } priority`
              : "Create a reminder and it will appear here with the soonest due time."}
          </p>
        </aside>
      </section>

      <section className="reminderalert-stats-grid">
        <article className="reminderalert-stat-card">
          <strong>{stats.total}</strong>
          <span>Total reminders</span>
          <p>Everything currently tracked in your personal reminder board.</p>
        </article>
        <article className="reminderalert-stat-card">
          <strong>{stats.pending}</strong>
          <span>Open items</span>
          <p>Tasks that still need your attention or a triggered reminder.</p>
        </article>
        <article className="reminderalert-stat-card">
          <strong>{stats.highPriority}</strong>
          <span>High priority</span>
          <p>Urgent reminders that are active and ready for escalation.</p>
        </article>
        <article className="reminderalert-stat-card">
          <strong>{stats.callEnabled}</strong>
          <span>Voice call enabled</span>
          <p>Reminders configured to ring a phone with your custom message.</p>
        </article>
      </section>

      <section className="reminderalert-layout">
        <div className="reminderalert-primary-column">
          {showAddForm && (
            <article className="reminderalert-panel">
              <div className="reminderalert-panel-heading">
                <p>{editingTaskId ? "Update reminder" : "Create reminder"}</p>
                <h2>{editingTaskId ? "Edit the current reminder" : "Build a new reminder"}</h2>
              </div>

              <form className="reminderalert-editor-form" onSubmit={handleSubmit}>
                {submitError && (
                  <div className="reminderalert-alert reminderalert-alert-error">
                    {submitError}
                  </div>
                )}

                <div className="reminderalert-editor-grid">
                  <label className="reminderalert-field reminderalert-field-full">
                    <span>Title</span>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleFormChange}
                      placeholder="Example: Doctor follow-up"
                      disabled={submitting}
                    />
                  </label>

                  <label className="reminderalert-field reminderalert-field-full">
                    <span>Description</span>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleFormChange}
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
                      onChange={handleFormChange}
                      disabled={submitting}
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="reminderalert-field">
                    <span>Priority</span>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleFormChange}
                      disabled={submitting}
                    >
                      {PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="reminderalert-field">
                    <span>Due date</span>
                    <input
                      type="date"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleFormChange}
                      disabled={submitting}
                    />
                    <small className="reminderalert-inline-meta">Today: {currentDateLabel}</small>
                  </label>

                  <label className="reminderalert-field">
                    <span>Due time</span>
                    <input
                      type="time"
                      name="dueTime"
                      value={formData.dueTime}
                      onChange={handleFormChange}
                      disabled={submitting}
                    />
                    <small className="reminderalert-inline-meta">Now: {currentClockLabel}</small>
                  </label>

                  <label className="reminderalert-field">
                    <span>Recurring</span>
                    <select
                      name="recurring"
                      value={formData.recurring}
                      onChange={handleFormChange}
                      disabled={submitting}
                    >
                      {RECURRING_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <section className="reminderalert-section-block">
                  <div className="reminderalert-section-heading">
                    <h3>Reminder channels</h3>
                    <p>Select how this reminder should reach you.</p>
                  </div>
                  <div className="reminderalert-choice-grid">
                    {CHANNEL_OPTIONS.map((channel) => {
                      const isSelected = formData.reminders.includes(channel.value);

                      return (
                        <label
                          key={channel.value}
                          className={`reminderalert-choice-card ${
                            isSelected ? "selected" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            name="reminders"
                            value={channel.value}
                            checked={isSelected}
                            onChange={handleFormChange}
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
                </section>

                {trustedContacts.length > 0 && (
                  <section className="reminderalert-section-block">
                    <div className="reminderalert-section-heading">
                      <h3>Share with trusted contacts</h3>
                      <p>Let someone else receive and acknowledge this reminder too.</p>
                    </div>
                    <div className="reminderalert-choice-grid reminderalert-choice-grid-contacts">
                      {trustedContacts.map((contact) => {
                        const contactId = contact.recipientId?._id;
                        const isSelected = formData.sharedWithTrustedContacts.includes(contactId);

                        return (
                          <label
                            key={contact._id}
                            className={`reminderalert-choice-card ${
                              isSelected ? "selected" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              name="sharedWithTrustedContacts"
                              value={contactId}
                              checked={isSelected}
                              onChange={handleFormChange}
                              disabled={submitting || !contactId}
                            />
                            <div className="reminderalert-choice-copy">
                              <strong>
                                {contact.recipientId?.name ||
                                  contact.recipientId?.username ||
                                  "Trusted contact"}
                              </strong>
                              <p>
                                {contact.relationship
                                  ? `${contact.relationship.charAt(0).toUpperCase()}${contact.relationship.slice(1)}`
                                  : "Connected"}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                )}

                {formData.reminders.includes("Call") && (
                  <section className="reminderalert-section-block reminderalert-voice-block">
                    <div className="reminderalert-section-heading">
                      <h3>Voice call setup</h3>
                      <p>
                        This reminder will ring the number below and play the message you provide.
                      </p>
                    </div>

                    <div className="reminderalert-alert reminderalert-alert-info">
                      Voice call reminders work best for high priority events, medicine schedules,
                      and time-sensitive follow-ups.
                    </div>

                    <div className="reminderalert-editor-grid">
                      <label className="reminderalert-field">
                        <span>Phone number</span>
                        <input
                          type="tel"
                          name="recipientPhoneNumber"
                          value={voiceCallData.recipientPhoneNumber}
                          onChange={handleVoiceCallChange}
                          placeholder="+91 98765 43210"
                          disabled={submitting}
                        />
                      </label>

                      <label className="reminderalert-field">
                        <span>Message type</span>
                        <select
                          name="messageType"
                          value={voiceCallData.messageType}
                          onChange={handleVoiceCallChange}
                          disabled={submitting}
                        >
                          <option value="text">Text to speech</option>
                          <option value="audio">Pre-recorded audio</option>
                        </select>
                      </label>

                      {voiceCallData.messageType === "text" && (
                        <label className="reminderalert-field reminderalert-field-full">
                          <span>Spoken message</span>
                          <textarea
                            name="voiceMessage"
                            value={voiceCallData.voiceMessage}
                            onChange={handleVoiceCallChange}
                            placeholder="Example: Please remember to take your medicine at 2 PM."
                            rows="4"
                            maxLength="500"
                            disabled={submitting}
                          />
                          <small className="reminderalert-inline-meta">
                            {voiceCallData.voiceMessage.length}/500 characters
                          </small>
                        </label>
                      )}

                      {voiceCallData.messageType === "audio" && (
                        <div className="reminderalert-field reminderalert-field-full">
                          <span>Record or upload voice note</span>
                          <div className="reminderalert-voice-recorder-section">
                            <VoiceNoteRecorder
                              module="reminder"
                              contextId={editingTaskId || "new"}
                              recipientId={voiceCallData.recipientPhoneNumber}
                              onSend={(voiceNote) => {
                                const uploadedVoiceNoteUrl = resolveVoiceNoteUrl(voiceNote);
                                setVoiceCallData((current) => ({
                                  ...current,
                                  voiceNoteUrl: uploadedVoiceNoteUrl,
                                  voiceNotePreviewUrl:
                                    voiceNote?.previewUrl || uploadedVoiceNoteUrl,
                                }));
                              }}
                            />
                            {voiceCallData.voiceNoteUrl && (
                              <div className="reminderalert-voice-note-preview">
                                <p className="reminderalert-voice-note-label">✓ Voice note recorded</p>
                                <div className="reminderalert-inline-stack">
                                  <audio
                                    controls
                                    preload="metadata"
                                    src={
                                      voiceCallData.voiceNotePreviewUrl || voiceCallData.voiceNoteUrl
                                    }
                                  >
                                    Your browser could not play this recording.
                                  </audio>
                                </div>
                                <button
                                  type="button"
                                  className="reminderalert-filter-chip"
                                  onClick={() =>
                                    setVoiceCallData((current) => ({
                                      ...current,
                                      voiceNoteUrl: "",
                                      voiceNotePreviewUrl: "",
                                    }))
                                  }
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

                <div className="reminderalert-submit-row">
                  <button
                    type="submit"
                    className="reminderalert-add-btn"
                    disabled={submitting || loading}
                  >
                    {submitting
                      ? editingTaskId
                        ? "Updating..."
                        : "Saving..."
                      : editingTaskId
                      ? "Update reminder"
                      : "Save reminder"}
                  </button>
                  <button
                    type="button"
                    className="reminderalert-filter-chip"
                    onClick={closeEditor}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </article>
          )}

          <article className="reminderalert-panel">
            <div className="reminderalert-panel-heading">
              <p>Task board</p>
              <h2>Your reminders</h2>
            </div>

            <div className="reminderalert-filter-row">
              {FILTERS.map((filter) => (
                <button
                  type="button"
                  key={filter}
                  className={`reminderalert-filter-chip ${activeFilter === filter ? "active" : ""}`}
                  onClick={() => setActiveFilter(filter)}
                  disabled={loading}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="reminderalert-task-list">
              {loading ? (
                <div className="reminderalert-callout">
                  <strong>Loading reminders...</strong>
                  <p>Please wait while we fetch your latest schedule.</p>
                </div>
              ) : visibleTasks.length ? (
                visibleTasks.map((task) => (
                  <article
                    className={`reminderalert-task-card ${task.completed ? "completed" : ""}`}
                    key={task._id}
                  >
                    <div className="reminderalert-task-topline">
                      <div>
                        <h3>{task.title}</h3>
                        <p>
                          {task.category} · {task.priority} priority
                        </p>
                      </div>
                      <span className="reminderalert-task-status">
                        {task.completed ? "Completed" : task.status}
                      </span>
                    </div>

                    {task.description && (
                      <p className="reminderalert-task-description">{task.description}</p>
                    )}

                    <p className="reminderalert-task-due">
                      {formatReminderDueDate(task.dueDate, task.dueTime)}
                    </p>

                    <div className="reminderalert-task-channels">
                      {(task.reminders || []).map((reminder) => (
                        <span key={reminder}>{reminder}</span>
                      ))}
                      {task.recurring && task.recurring !== "none" && (
                        <span className="reminderalert-task-chip-muted">
                          Repeats {task.recurring}
                        </span>
                      )}
                    </div>

                    {task.recipientPhoneNumber && (
                      <div className="reminderalert-callout reminderalert-callout-inline">
                        <strong>Voice call reminder</strong>
                        <p>{task.recipientPhoneNumber}</p>
                        <p className="reminderalert-inline-meta">
                          Status: {task.callStatus || "pending"} · Attempts{" "}
                          {task.callAttempts || 0}/{task.maxCallAttempts || 3}
                        </p>
                      </div>
                    )}

                    {task.sharedWithTrustedContacts?.length > 0 && (
                      <div className="reminderalert-inline-stack">
                        <span className="reminderalert-inline-tag">
                          Shared with {task.sharedWithTrustedContacts.length} trusted
                          {task.sharedWithTrustedContacts.length > 1 ? " contacts" : " contact"}
                        </span>
                      </div>
                    )}

                    <div className="reminderalert-filter-row reminderalert-filter-row-tight">
                      <button
                        type="button"
                        className="reminderalert-filter-chip"
                        onClick={() => handleToggleComplete(task._id)}
                      >
                        {task.completed ? "Reopen" : "Complete"}
                      </button>
                      <button
                        type="button"
                        className="reminderalert-filter-chip"
                        onClick={() => handleEdit(task)}
                      >
                        Edit
                      </button>
                      {task.recipientPhoneNumber && (
                        <button
                          type="button"
                          className="reminderalert-filter-chip"
                          onClick={() => handleTriggerVoiceCall(task._id)}
                          title="Trigger the configured voice call now"
                        >
                          Call now
                        </button>
                      )}
                      <button
                        type="button"
                        className="reminderalert-filter-chip"
                        onClick={() => handleDelete(task._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="reminderalert-callout">
                  <strong>No reminders found</strong>
                  <p>Create a reminder or switch the active filter to see more items.</p>
                </div>
              )}
            </div>
          </article>
        </div>

        <aside className="reminderalert-secondary-column">
          <article className="reminderalert-panel reminderalert-countdown-panel">
            <div className="reminderalert-panel-heading">
              <p>Countdown</p>
              <h2>Time to remind</h2>
            </div>
            {!showAddForm ? (
              <div className="reminderalert-callout">
                <strong>Countdown preview is available</strong>
                <p>Open the reminder editor, then choose a due date and due time to start the live countdown.</p>
              </div>
            ) : !formData.dueDate ? (
              <div className="reminderalert-callout">
                <strong>Add a due date</strong>
                <p>Select the reminder day to unlock the countdown preview.</p>
              </div>
            ) : !formData.dueTime ? (
              <div className="reminderalert-callout">
                <strong>Add a due time</strong>
                <p>Pick the exact time and the countdown will start updating every second.</p>
              </div>
            ) : countdown?.isPast ? (
              <div className="reminderalert-countdown-expired">
                <p>Time has already passed</p>
                <small>Please select a future date and time</small>
              </div>
            ) : countdown ? (
              <div className="reminderalert-countdown-display">
                <div className="reminderalert-countdown-item">
                  <span className="reminderalert-countdown-value">{countdown.days}</span>
                  <span className="reminderalert-countdown-label">Days</span>
                </div>
                <div className="reminderalert-countdown-separator">:</div>
                <div className="reminderalert-countdown-item">
                  <span className="reminderalert-countdown-value">{String(countdown.hours).padStart(2, "0")}</span>
                  <span className="reminderalert-countdown-label">Hours</span>
                </div>
                <div className="reminderalert-countdown-separator">:</div>
                <div className="reminderalert-countdown-item">
                  <span className="reminderalert-countdown-value">{String(countdown.minutes).padStart(2, "0")}</span>
                  <span className="reminderalert-countdown-label">Minutes</span>
                </div>
                <div className="reminderalert-countdown-separator">:</div>
                <div className="reminderalert-countdown-item">
                  <span className="reminderalert-countdown-value">{String(countdown.seconds).padStart(2, "0")}</span>
                  <span className="reminderalert-countdown-label">Seconds</span>
                </div>
              </div>
            ) : (
              <div className="reminderalert-callout">
                <strong>Countdown unavailable</strong>
                <p>Check the due date and time fields, then try again.</p>
              </div>
            )}
            {dueDateTimePreview && (
              <div className="reminderalert-countdown-info">
                <p>
                  <strong>Reminder set for:</strong> {formatDateTimeLabel(dueDateTimePreview)}
                </p>
              </div>
            )}
          </article>
          {false && (
            <article className="reminderalert-panel reminderalert-countdown-panel">
              <div className="reminderalert-panel-heading">
                <p>Countdown</p>
                <h2>Time to remind</h2>
              </div>
              {countdown.isPast ? (
                <div className="reminderalert-countdown-expired">
                  <p>⏰ This reminder time has passed</p>
                  <small>Please select a future date and time</small>
                </div>
              ) : (
                <div className="reminderalert-countdown-display">
                  <div className="reminderalert-countdown-item">
                    <span className="reminderalert-countdown-value">{countdown.days}</span>
                    <span className="reminderalert-countdown-label">Days</span>
                  </div>
                  <div className="reminderalert-countdown-separator">:</div>
                  <div className="reminderalert-countdown-item">
                    <span className="reminderalert-countdown-value">{String(countdown.hours).padStart(2, "0")}</span>
                    <span className="reminderalert-countdown-label">Hours</span>
                  </div>
                  <div className="reminderalert-countdown-separator">:</div>
                  <div className="reminderalert-countdown-item">
                    <span className="reminderalert-countdown-value">{String(countdown.minutes).padStart(2, "0")}</span>
                    <span className="reminderalert-countdown-label">Minutes</span>
                  </div>
                  <div className="reminderalert-countdown-separator">:</div>
                  <div className="reminderalert-countdown-item">
                    <span className="reminderalert-countdown-value">{String(countdown.seconds).padStart(2, "0")}</span>
                    <span className="reminderalert-countdown-label">Seconds</span>
                  </div>
                </div>
              )}
              <div className="reminderalert-countdown-info">
                <p>
                  <strong>Due: </strong>
                  {new Date(`${formData.dueDate}T${formData.dueTime}`).toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </article>
          )}
          <article className="reminderalert-panel">
            <div className="reminderalert-panel-heading">
              <p>Quick view</p>
              <h2>Stay in control</h2>
            </div>
            <div className="reminderalert-role-stack">
              <div className="reminderalert-role-card">
                <h3>Today&apos;s focus</h3>
                <ul>
                  <li>
                    {nextDueTask
                      ? `${nextDueTask.title} is the next active reminder in your queue.`
                      : "You do not have an active reminder scheduled right now."}
                  </li>
                </ul>
              </div>
              <div className="reminderalert-role-card">
                <h3>Trusted contacts</h3>
                <ul>
                  <li>
                    {trustedContacts.length
                      ? `${trustedContacts.length} people can help monitor shared reminders.`
                      : "Add trusted contacts so urgent reminders can reach other people too."}
                  </li>
                </ul>
              </div>
              <div className="reminderalert-role-card">
                <h3>Escalation coverage</h3>
                <ul>
                  <li>
                    Use SMS or voice call for reminders that should still reach you away from the
                    app.
                  </li>
                  <li>High priority items are easier to spot when they also include a call.</li>
                </ul>
              </div>
            </div>
          </article>
        </aside>
      </section>

      <section className="reminderalert-trusted-section">
        <TrustedContacts onContactsUpdate={setTrustedContacts} />
      </section>
    </div>
  );
};

export default ReminderAlert;
