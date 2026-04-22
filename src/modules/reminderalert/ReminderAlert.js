import React, { useEffect, useMemo, useState } from "react";
import "../../styles/ReminderAlert.css";
import {
  fetchReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  toggleReminderCompletion,
} from "../../services/remindersService";
import { LINK_PRESETS, normalizeCustomLink } from "../../utils/customLinks";
import { formatReminderDueDate, toDateInputValue } from "./reminderUtils";

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
};
const INITIAL_LINK_FORM = {
  preset: "custom",
  title: "",
  url: "",
  description: "",
};

const ReminderAlert = ({ customLinks = [], onCustomLinksChange = () => {} }) => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState("");
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [linkForm, setLinkForm] = useState(INITIAL_LINK_FORM);
  const [linkError, setLinkError] = useState(null);

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

  const visibleTasks = useMemo(() => {
    if (activeFilter === "All") {
      return tasks;
    }

    return tasks.filter((task) => task.category === activeFilter);
  }, [activeFilter, tasks]);

  const resetForm = () => {
    setFormData(INITIAL_FORM);
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

    setFormData((current) => ({
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

    try {
      setSubmitting(true);

      if (editingTaskId) {
        // Update existing reminder
        const response = await updateReminder(editingTaskId, {
          ...formData,
          dueDate: new Date(formData.dueDate),
        });
        setTasks((current) =>
          current.map((task) =>
            task._id === editingTaskId ? response.data : task
          )
        );
      } else {
        // Create new reminder
        const response = await createReminder({
          ...formData,
          dueDate: new Date(formData.dueDate),
        });
        setTasks((current) => [response.data, ...current]);
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

  const handleLinkFormChange = (event) => {
    const { name, value } = event.target;

    if (name === "preset") {
      const preset = LINK_PRESETS[value] || LINK_PRESETS.custom;
      setLinkForm({
        preset: value,
        title: preset.title,
        url: preset.url,
        description: preset.description,
      });
      setLinkError(null);
      return;
    }

    setLinkForm((current) => ({
      ...current,
      [name]: value,
    }));
    setLinkError(null);
  };

  const handleAddCustomLink = (event) => {
    event.preventDefault();

    const nextLink = normalizeCustomLink({
      id: `custom-link-${Date.now()}`,
      ...linkForm,
    });

    if (!nextLink.title || !nextLink.url) {
      setLinkError("Link title and URL are required.");
      return;
    }

    try {
      new URL(nextLink.url);
    } catch (validationError) {
      setLinkError("Enter a valid URL like https://facebook.com or mail.google.com.");
      return;
    }

    onCustomLinksChange((currentLinks) => [...currentLinks, nextLink]);
    setLinkForm(INITIAL_LINK_FORM);
    setLinkError(null);
  };

  const handleRemoveCustomLink = (linkId) => {
    onCustomLinksChange((currentLinks) => currentLinks.filter((link) => link.id !== linkId));
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
              <p>Quick links</p>
              <h2>Add Facebook, Gmail, or any custom shortcut</h2>
            </div>

            <form className="reminderalert-link-form" onSubmit={handleAddCustomLink}>
              {linkError ? (
                <div style={{ color: "#d32f2f", marginBottom: "1rem", fontSize: "0.9rem" }}>
                  {linkError}
                </div>
              ) : null}

              <div className="reminderalert-requirement-grid">
                <label className="reminderalert-requirement-card">
                  <h3>Service</h3>
                  <select name="preset" value={linkForm.preset} onChange={handleLinkFormChange}>
                    {Object.entries(LINK_PRESETS).map(([value, preset]) => (
                      <option key={value} value={value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="reminderalert-requirement-card">
                  <h3>Link title</h3>
                  <input
                    type="text"
                    name="title"
                    value={linkForm.title}
                    onChange={handleLinkFormChange}
                    placeholder="Facebook, Gmail, Business mail"
                  />
                </label>
                <label className="reminderalert-requirement-card">
                  <h3>URL</h3>
                  <input
                    type="text"
                    name="url"
                    value={linkForm.url}
                    onChange={handleLinkFormChange}
                    placeholder="https://mail.google.com/"
                  />
                </label>
                <label className="reminderalert-requirement-card">
                  <h3>Description</h3>
                  <input
                    type="text"
                    name="description"
                    value={linkForm.description}
                    onChange={handleLinkFormChange}
                    placeholder="Optional card description for launch and home page"
                  />
                </label>
              </div>

              <div className="reminderalert-filter-row">
                <button type="submit" className="reminderalert-filter-chip active">
                  Save quick link
                </button>
              </div>
            </form>

            <div className="reminderalert-task-list">
              {customLinks.length ? (
                customLinks.map((link) => (
                  <article className="reminderalert-task-card" key={link.id}>
                    <div className="reminderalert-task-topline">
                      <div>
                        <h3>{link.title}</h3>
                        <p>{link.description || "Custom shortcut for launch and home page."}</p>
                      </div>
                      <span className="reminderalert-task-status">Quick link</span>
                    </div>
                    <p className="reminderalert-task-due">{link.url}</p>
                    <div className="reminderalert-filter-row">
                      <button
                        type="button"
                        className="reminderalert-filter-chip"
                        onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        className="reminderalert-filter-chip"
                        onClick={() => handleRemoveCustomLink(link.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="reminderalert-callout">
                  <strong>No quick links yet</strong>
                  <p>
                    Save Gmail, Facebook, or any website here and it will appear on the launch page
                    and home page next to the fixed categories.
                  </p>
                </div>
              )}
            </div>
          </article>

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
    </div>
  );
};

export default ReminderAlert;
