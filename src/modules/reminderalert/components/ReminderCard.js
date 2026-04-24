import React, { useCallback } from 'react';
import { formatReminderDueDate } from '../reminderUtils';

/**
 * ReminderCard component - displays a single reminder
 * Memoized for performance optimization
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.reminder - Reminder data
 * @param {string} props.reminder._id - Reminder ID
 * @param {string} props.reminder.title - Reminder title
 * @param {string} props.reminder.priority - Priority level
 * @param {string} props.reminder.category - Category
 * @param {string} props.reminder.dueDate - Due date
 * @param {string} props.reminder.dueTime - Due time
 * @param {boolean} props.reminder.completed - Completion status
 * @param {function} props.onEdit - Edit handler
 * @param {function} props.onDelete - Delete handler
 * @param {function} props.onToggleCompletion - Toggle completion handler
 * @param {function} props.onTriggerVoiceCall - Voice call trigger handler
 * 
 * @example
 * <ReminderCard
 *   reminder={reminder}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 *   onToggleCompletion={handleToggleCompletion}
 *   onTriggerVoiceCall={handleTriggerVoiceCall}
 * />
 */
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
        role="article"
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
                  ● {reminder.priority}
                </span>
                <span
                  className="reminderalert-task-category"
                  style={{ color: categoryColor[reminder.category] }}
                  aria-label={`Category: ${reminder.category}`}
                >
                  {reminder.category}
                </span>
                <span className="reminderalert-task-due">
                  📅 {formatReminderDueDate(reminder.dueDate, reminder.dueTime)}
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
                📞
              </button>
            )}
            <button
              className="reminderalert-action-btn edit"
              onClick={handleEdit}
              title={`Edit "${reminder.title}"`}
              aria-label={`Edit ${reminder.title}`}
            >
              ✏️
            </button>
            <button
              className="reminderalert-action-btn delete"
              onClick={handleDelete}
              title={`Delete "${reminder.title}"`}
              aria-label={`Delete ${reminder.title}`}
            >
              🗑️
            </button>
          </div>
        </div>
      </article>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison - re-render only if reminder data changed
    return (
      prevProps.reminder._id === nextProps.reminder._id &&
      prevProps.reminder.completed === nextProps.reminder.completed &&
      prevProps.reminder.title === nextProps.reminder.title &&
      prevProps.reminder.dueDate === nextProps.reminder.dueDate &&
      prevProps.reminder.priority === nextProps.reminder.priority &&
      prevProps.reminder.category === nextProps.reminder.category
    );
  }
);

ReminderCard.displayName = 'ReminderCard';

export default ReminderCard;
