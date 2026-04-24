import React, { useEffect, useMemo, useState } from "react";
import "../../styles/ReminderAlert.css";
import "../../styles/TrustedContacts.css";
import {
  fetchReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  toggleReminderCompletion,
  createVoiceCallReminder,
  getVoiceCallStatus,
  triggerVoiceCall,
  getAcceptedTrustedContacts,
  shareReminderWithContacts,
} from "../../services/remindersService";
import { formatReminderDueDate, toDateInputValue } from "./reminderUtils";
import TrustedContacts from "./TrustedContacts";

const PRIORITIES = ["Low", "Medium", "High"];
const CATEGORIES = ["Work", "Personal", "Urgent"];
const FILTERS = ["All", "Work", "Personal", "Urgent"];
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
  isVoiceCall: false,
};

const ReminderAlert = () => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState("");
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [voiceCallData, setVoiceCallData] = useState(INITIAL_VOICE_CALL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [voiceCallStatus, setVoiceCallStatus] = useState({});  // Track call status by reminder ID
  const [trustedContacts, setTrustedContacts] = useState([]); // List of accepted trusted contacts
  const [showTrustedContacts, setShowTrustedContacts] = useState(false); // Toggle trusted contacts panel

  // Load reminders from backend on component mount
  useEffect(() => {
    const loadReminders = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchReminders({ limit: 100 });
        setTasks(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error("Failed to load reminders:", err);
        setError(err.message || "Failed to load reminders");
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    loadReminders();
  }, []);

  // Load trusted contacts
  useEffect(() => {
    const loadTrustedContacts = async () => {
      try {
        const response = await getAcceptedTrustedContacts();
        setTrustedContacts(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error("Failed to load trusted contacts:", err);
        // Don't show error for this, just silently fail
      }
    };

    loadTrustedContacts();
  }, []);

  const visibleTasks = useMemo(() => {
    if (activeFilter === "All") {
      return tasks;
    }

    return tasks.filter((task) => task.category === activeFilter);
  }, [activeFilter, tasks]);

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setVoiceCallData(INITIAL_VOICE_CALL_FORM);
    setEditingTaskId("");
    setShowAddForm(false);
  };

  const handleFormChange = (event) => {
    const { name, value, checked, type } = event.target;

    if (type === "checkbox" && name === "reminders") {
      setFormData((current) => ({
        ...current,
        reminders: checked
          ? [...current.reminders, value]
          : current.reminders.filter((item) => item !== value),
      }));
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
    const { name, value, checked, type } = event.target;

    if (name === "isVoiceCall") {
      setVoiceCallData((current) => ({
        ...current,
        isVoiceCall: checked,
      }));
      // Toggle Call in reminders
      if (checked && !formData.reminders.includes("Call")) {
        setFormData((current) => ({
          ...current,
          reminders: [...current.reminders, "Call"],
        }));
      } else if (!checked) {
        setFormData((current) => ({
          ...current,
          reminders: current.reminders.filter((r) => r !== "Call"),
        }));
      }
      return;
    }

    setVoiceCallData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError(null);

    if (!formData.title.trim() || !formData.dueDate) {
      setSubmitError("Title and due date are required");
      return;
    }

    // Validate voice call fields if enabled
    if (voiceCallData.isVoiceCall) {
      if (!voiceCallData.recipientPhoneNumber.trim()) {
        setSubmitError("Phone number is required for voice call reminders");
        return;
      }
      if (!voiceCallData.voiceMessage.trim()) {
        setSubmitError("Voice message is required for voice call reminders");
        return;
      }
    }

    try {
      setSubmitting(true);

      if (editingTaskId) {
        // Update existing reminder
        const response = await updateReminder(editingTaskId, {
          ...formData,
          dueDate: new Date(formData.dueDate),
        });
        
        // Share with trusted contacts if selected
        if (formData.sharedWithTrustedContacts && formData.sharedWithTrustedContacts.length > 0) {
          await shareReminderWithContacts(editingTaskId, formData.sharedWithTrustedContacts);
        }
        
        setTasks((current) =>
          current.map((task) =>
            task._id === editingTaskId ? response.data : task
          )
        );
      } else {
        // Create new reminder
        let reminderId;
        if (voiceCallData.isVoiceCall) {
          // Create voice call reminder
          const response = await createVoiceCallReminder({
            ...formData,
            ...voiceCallData,
            dueDate: new Date(formData.dueDate),
          });
          reminderId = response.data._id;
          setTasks((current) => [response.data, ...current]);
        } else {
          // Create regular reminder
          const response = await createReminder({
            ...formData,
            dueDate: new Date(formData.dueDate),
          });
          reminderId = response.data._id;
          setTasks((current) => [response.data, ...current]);
        }

        // Share with trusted contacts if selected
        if (formData.sharedWithTrustedContacts && formData.sharedWithTrustedContacts.length > 0) {
          await shareReminderWithContacts(reminderId, formData.sharedWithTrustedContacts);
        }
      }

      resetForm();
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
      title: task.title,
      description: task.description || "",
      category: task.category,
      priority: task.priority,
      dueDate: toDateInputValue(task.dueDate),
      dueTime: task.dueTime,
      reminders: task.reminders,
      recurring: task.recurring || "none",
      sharedWithTrustedContacts: task.sharedWithTrustedContacts || [],
    });
    setShowAddForm(true);
  };

  const handleToggleComplete = async (taskId) => {
    try {
      const task = tasks.find((t) => t._id === taskId);
      if (!task) return;

      const response = await toggleReminderCompletion(taskId, !task.completed);
      setTasks((current) =>
        current.map((t) => (t._id === taskId ? response.data : t))
      );
    } catch (err) {
      console.error("Error updating reminder:", err);
      setError(err.message || "Failed to update reminder");
    }
  };

  const handleDelete = async (taskId) => {
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
      // Refresh the reminder to get updated call status
      const response = await getVoiceCallStatus(taskId);
      setVoiceCallStatus((current) => ({
        ...current,
        [taskId]: response.data,
      }));
    } catch (err) {
      console.error("Error triggering voice call:", err);
      alert(err.message || "Failed to trigger voice call");
    }
  };

  return (
    <div className="reminderalert-page">
      <section className="reminderalert-hero">
        <div>
          <p className="reminderalert-eyebrow">Reminder workspace</p>
          <h1>Smart To-Do & Reminder System</h1>
          <p className="reminderalert-intro">
            Create tasks, schedule reminders, and keep important actions visible from one working
            dashboard.
          </p>
          {error && (
            <div style={{ color: "#d32f2f", marginBottom: "1rem", fontSize: "0.9rem" }}>
              {error}
            </div>
          )}
          <button
            type="button"
            className="reminderalert-filter-chip active"
            onClick={() => setShowAddForm((current) => !current)}
            disabled={loading}
          >
            {showAddForm ? "Close form" : "Add reminder"}
          </button>
        </div>
      </section>

      {showAddForm ? (
        <section className="reminderalert-panel">
          <div className="reminderalert-panel-heading">
            <p>Task editor</p>
            <h2>{editingTaskId ? "Update reminder" : "Create reminder"}</h2>
          </div>

          <form className="reminderalert-step-list" onSubmit={handleSubmit}>
            {submitError && (
              <div style={{ color: "#d32f2f", marginBottom: "1rem", fontSize: "0.9rem" }}>
                {submitError}
              </div>
            )}
            <label className="reminderalert-step-item">
              <span>1</span>
              <p>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="Reminder title"
                />
              </p>
            </label>

            <label className="reminderalert-step-item">
              <span>2</span>
              <p>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Description"
                />
              </p>
            </label>

            <div className="reminderalert-requirement-grid">
              <label className="reminderalert-requirement-card">
                <h3>Category</h3>
                <select name="category" value={formData.category} onChange={handleFormChange}>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="reminderalert-requirement-card">
                <h3>Priority</h3>
                <select name="priority" value={formData.priority} onChange={handleFormChange}>
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>
              <label className="reminderalert-requirement-card">
                <h3>Due date</h3>
                <input type="date" name="dueDate" value={formData.dueDate} onChange={handleFormChange} />
              </label>
              <label className="reminderalert-requirement-card">
                <h3>Due time</h3>
                <input type="time" name="dueTime" value={formData.dueTime} onChange={handleFormChange} />
              </label>
            </div>

            <div className="reminderalert-role-stack">
              {["In-app", "SMS", "Call"].map((channel) => (
                <label className="reminderalert-role-card" key={channel}>
                  <h3>{channel}</h3>
                  <ul>
                    <li>
                      <input
                        type="checkbox"
                        name="reminders"
                        value={channel}
                        checked={formData.reminders.includes(channel)}
                        onChange={handleFormChange}
                      />
                    </li>
                  </ul>
                </label>
              ))}
            </div>

            {trustedContacts.length > 0 && (
              <div className="reminderalert-panel" style={{ marginTop: "1.5rem", padding: "1.5rem", backgroundColor: "#f0f8ff", borderRadius: "8px" }}>
                <h3 style={{ marginBottom: "1rem" }}>🔗 Share with Trusted Contacts</h3>
                <div className="reminderalert-role-stack">
                  {trustedContacts.map((contact) => (
                    <label className="reminderalert-role-card" key={contact._id}>
                      <h3>{contact.recipientId?.name || contact.recipientId?.username || "Contact"}</h3>
                      <ul>
                        <li>
                          <input
                            type="checkbox"
                            name="sharedWithTrustedContacts"
                            value={contact.recipientId?._id}
                            checked={formData.sharedWithTrustedContacts.includes(contact.recipientId?._id)}
                            onChange={handleFormChange}
                          />
                        </li>
                      </ul>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {formData.reminders.includes("Call") && (
              <div className="reminderalert-panel" style={{ marginTop: "1.5rem", padding: "1.5rem", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
                <h3 style={{ marginBottom: "1rem" }}>Voice Call Reminder Setup</h3>
                
                <label className="reminderalert-requirement-card">
                  <h4>Recipient Phone Number</h4>
                  <input
                    type="tel"
                    name="recipientPhoneNumber"
                    value={voiceCallData.recipientPhoneNumber}
                    onChange={handleVoiceCallChange}
                    placeholder="+1 234-567-8900 or 23456789"
                  />
                  <small style={{ color: "#666", marginTop: "0.5rem", display: "block" }}>
                    Enter the phone number where the automated call will be sent. Include country code if outside US.
                  </small>
                </label>

                <label className="reminderalert-requirement-card">
                  <h4>Message Type</h4>
                  <select
                    name="messageType"
                    value={voiceCallData.messageType}
                    onChange={handleVoiceCallChange}
                  >
                    <option value="text">Text-to-Speech (System reads the message)</option>
                    <option value="audio">Pre-recorded Audio (Upload your own voice)</option>
                  </select>
                </label>

                <label className="reminderalert-requirement-card">
                  <h4>Voice Message</h4>
                  <textarea
                    name="voiceMessage"
                    value={voiceCallData.voiceMessage}
                    onChange={handleVoiceCallChange}
                    placeholder="Enter the message that will be read or played. Example: Please remember to take your medicine at 2 PM today."
                    rows="4"
                    maxLength="500"
                    style={{ width: "100%", padding: "0.75rem", fontFamily: "inherit" }}
                  />
                  <small style={{ color: "#666", marginTop: "0.5rem", display: "block" }}>
                    {voiceCallData.voiceMessage.length}/500 characters
                  </small>
                </label>

                <label className="reminderalert-requirement-card" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="checkbox"
                    name="isVoiceCall"
                    checked={voiceCallData.isVoiceCall}
                    onChange={handleVoiceCallChange}
                  />
                  <span>Enable automated voice call for this reminder</span>
                </label>
              </div>
            )}

            <div className="reminderalert-filter-row">
              <button
                type="submit"
                className="reminderalert-filter-chip active"
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
                onClick={resetForm}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="reminderalert-layout">
        <div className="reminderalert-primary-column">
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
                  <p>Please wait while we fetch your reminders.</p>
                </div>
              ) : visibleTasks.length ? (
                visibleTasks.map((task) => (
                  <article className="reminderalert-task-card" key={task._id}>
                    <div className="reminderalert-task-topline">
                      <div>
                        <h3>{task.title}</h3>
                        <p>
                          {task.category} - {task.priority} priority
                        </p>
                      </div>
                      <span className="reminderalert-task-status">
                        {task.completed ? "Completed" : task.status}
                      </span>
                    </div>
                    <p className="reminderalert-task-due">
                      {formatReminderDueDate(task.dueDate, task.dueTime)}
                    </p>
                    <div className="reminderalert-task-channels">
                      {task.reminders.map((reminder) => (
                        <span key={reminder}>{reminder}</span>
                      ))}
                    </div>

                    {task.recipientPhoneNumber && (
                      <div style={{ marginTop: "0.75rem", padding: "0.75rem", backgroundColor: "#f0f8ff", borderRadius: "4px", fontSize: "0.85rem" }}>
                        <strong>Voice Call:</strong> {task.recipientPhoneNumber}
                        {task.callStatus && (
                          <div style={{ marginTop: "0.5rem", color: task.callStatus === "completed" ? "#28a745" : "#ff9800" }}>
                            Status: {task.callStatus} ({task.callAttempts}/{task.maxCallAttempts} attempts)
                          </div>
                        )}
                      </div>
                    )}

                    {task.sharedWithTrustedContacts && task.sharedWithTrustedContacts.length > 0 && (
                      <div style={{ marginTop: "0.75rem", padding: "0.75rem", backgroundColor: "#f0f8ff", borderRadius: "4px", fontSize: "0.85rem" }}>
                        <strong>🔗 Shared with {task.sharedWithTrustedContacts.length} trusted contact{task.sharedWithTrustedContacts.length > 1 ? "s" : ""}</strong>
                      </div>
                    )}

                    <div className="reminderalert-filter-row">
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
                          title="Manually trigger the voice call"
                        >
                          🔔 Call Now
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
                  <p>Create a reminder or change the active filter.</p>
                </div>
              )}
            </div>
          </article>
        </div>
      </section>

      {/* Trusted Contacts Section */}
      <section className="reminderalert-layout">
        <div className="reminderalert-primary-column">
          <TrustedContacts onContactsUpdate={setTrustedContacts} />
        </div>
      </section>
    </div>
  );
};

export default ReminderAlert;
