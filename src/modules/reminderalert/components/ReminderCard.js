import React, { useCallback } from 'react';
import { formatReminderDueDate } from '../reminderUtils';
import { getReminderUrgency } from '../reminderSmartUtils';

const ReminderCard = React.memo(
  ({
    reminder,
    onEdit,
    onDelete,
    onToggleCompletion,
    onTriggerVoiceCall
  }) => {
    const priorityColor = {
      Low: '#10b981',
      Medium: '#f59e0b',
      High: '#ef4444'
    };

    const categoryColor = {
      Work: '#3b82f6',
      Personal: '#8b5cf6',
      Urgent: '#dc2626'
    };

    const urgency = getReminderUrgency(reminder);

    const handleEdit = useCallback(() => {
      onEdit(reminder);
    }, [reminder, onEdit]);

    const handleDelete = useCallback(() => {
      onDelete(reminder._id);
    }, [reminder._id, onDelete]);

    const handleToggle = useCallback(() => {
      onToggleCompletion(reminder._id, reminder.completed);
    }, [reminder._id, reminder.completed, onToggleCompletion]);

    const handleTriggerVoiceCall = useCallback(() => {
      if (onTriggerVoiceCall) {
        onTriggerVoiceCall(reminder._id);
      }
    }, [reminder._id, onTriggerVoiceCall]);

    return (
      <article
        className={`reminderalert-task-card ${reminder.completed ? 'completed' : ''}`}
        aria-label={`Reminder: ${reminder.title}`}
      >
        <div className="reminderalert-task-topline">
          <div className="reminderalert-task-content">
            <input
              type="checkbox"
              className="reminderalert-task-checkbox"
              checked={reminder.completed}
              onChange={handleToggle}
              aria-label={`Mark "${reminder.title}" as ${reminder.completed ? 'incomplete' : 'complete'}`}
            />
            <div className="reminderalert-task-main">
              <h3 className="reminderalert-task-title">{reminder.title}</h3>
              {reminder.description && (
                <p className="reminderalert-task-description">
                  {reminder.description}
                </p>
              )}
              <div className="reminderalert-task-meta">
                <span
                  className="reminderalert-task-priority"
                  style={{ color: priorityColor[reminder.priority] }}
                  aria-label={`Priority: ${reminder.priority}`}
                >
                  Priority: {reminder.priority}
                </span>
                <span
                  className="reminderalert-task-category"
                  style={{ color: categoryColor[reminder.category] }}
                  aria-label={`Category: ${reminder.category}`}
                >
                  {reminder.category}
                </span>
                <span className={`reminderalert-status-pill ${urgency.className}`}>
                  {urgency.label}
                </span>
                <span className="reminderalert-task-due">
                  Due: {formatReminderDueDate(reminder.dueDate, reminder.dueTime)}
                </span>
              </div>
            </div>
          </div>

          <div className="reminderalert-task-actions" role="group" aria-label="Actions">
            {reminder.recipientPhoneNumber && (
              <button
                className="reminderalert-action-btn voice-call"
                onClick={handleTriggerVoiceCall}
                title={`Trigger voice call to ${reminder.recipientPhoneNumber}`}
                aria-label={`Trigger voice call for ${reminder.title}`}
              >
                Call
              </button>
            )}
            <button
              className="reminderalert-action-btn edit"
              onClick={handleEdit}
              title={`Edit "${reminder.title}"`}
              aria-label={`Edit ${reminder.title}`}
            >
              Edit
            </button>
            <button
              className="reminderalert-action-btn delete"
              onClick={handleDelete}
              title={`Delete "${reminder.title}"`}
              aria-label={`Delete ${reminder.title}`}
            >
              Delete
            </button>
          </div>
        </div>
      </article>
    );
  }
);

ReminderCard.displayName = 'ReminderCard';

export default ReminderCard;
