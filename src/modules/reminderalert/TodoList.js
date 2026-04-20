import React, { useEffect, useState } from "react";
import { fetchReminders, toggleReminderCompletion, deleteReminder } from "../../services/remindersService";

/**
 * TodoList component - displays reminders in a simple list format
 * @param {Object} props
 * @param {string} props.category - Filter by category
 * @param {boolean} props.showCompleted - Show completed reminders
 */
const TodoList = ({ category = "All", showCompleted = false }) => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadReminders = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchReminders({
          category,
          limit: 50,
        });
        
        const filteredReminders = showCompleted 
          ? response.data 
          : response.data.filter(r => !r.completed);
        
        setReminders(filteredReminders);
      } catch (err) {
        console.error("Error loading reminders:", err);
        setError(err.message || "Failed to load reminders");
      } finally {
        setLoading(false);
      }
    };

    loadReminders();
  }, [category, showCompleted]);

  const handleToggleComplete = async (reminderId, currentStatus) => {
    try {
      await toggleReminderCompletion(reminderId, !currentStatus);
      setReminders(prev =>
        prev.map(r => r._id === reminderId ? { ...r, completed: !currentStatus } : r)
      );
    } catch (err) {
      console.error("Error updating reminder:", err);
      setError(err.message || "Failed to update reminder");
    }
  };

  const handleDelete = async (reminderId) => {
    if (!window.confirm("Are you sure you want to delete this reminder?")) {
      return;
    }

    try {
      await deleteReminder(reminderId);
      setReminders(prev => prev.filter(r => r._id !== reminderId));
    } catch (err) {
      console.error("Error deleting reminder:", err);
      setError(err.message || "Failed to delete reminder");
    }
  };

  if (loading) {
    return <div className="todo-list-loading">Loading reminders...</div>;
  }

  if (error) {
    return <div className="todo-list-error">Error: {error}</div>;
  }

  if (reminders.length === 0) {
    return <div className="todo-list-empty">No reminders found</div>;
  }

  return (
    <div className="todo-list">
      {reminders.map(reminder => (
        <div key={reminder._id} className="todo-item">
          <div className="todo-item-checkbox">
            <input
              type="checkbox"
              checked={reminder.completed}
              onChange={() => handleToggleComplete(reminder._id, reminder.completed)}
              aria-label={`Mark ${reminder.title} as ${reminder.completed ? "incomplete" : "complete"}`}
            />
          </div>
          <div className="todo-item-content">
            <div className={`todo-item-title ${reminder.completed ? "completed" : ""}`}>
              {reminder.title}
            </div>
            {reminder.description && (
              <div className="todo-item-description">{reminder.description}</div>
            )}
            <div className="todo-item-meta">
              <span className={`todo-priority todo-priority-${reminder.priority.toLowerCase()}`}>
                {reminder.priority}
              </span>
              <span className="todo-category">{reminder.category}</span>
              <span className="todo-status">{reminder.status}</span>
            </div>
          </div>
          <div className="todo-item-actions">
            <button
              type="button"
              onClick={() => handleDelete(reminder._id)}
              className="todo-delete-btn"
              title="Delete reminder"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TodoList;
