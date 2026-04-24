import React, { useCallback } from 'react';
import ReminderCard from './ReminderCard';

/**
 * ReminderList component - displays a list of reminders
 * Memoized for performance optimization
 * 
 * @component
 * @param {Object} props
 * @param {Array} props.reminders - Array of reminder objects to display
 * @param {boolean} props.loading - Loading indicator
 * @param {function} props.onEdit - Edit handler
 * @param {function} props.onDelete - Delete handler
 * @param {function} props.onToggleCompletion - Toggle completion handler
 * @param {function} props.onTriggerVoiceCall - Trigger voice call handler
 * 
 * @example
 * <ReminderList
 *   reminders={reminders}
 *   loading={isLoading}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 *   onToggleCompletion={handleToggle}
 * />
 */
const ReminderList = React.memo(({
  reminders = [],
  loading = false,
  onEdit = () => {},
  onDelete = () => {},
  onToggleCompletion = () => {},
  onTriggerVoiceCall = () => {},
}) => {
  if (loading) {
    return (
      <div className="reminderalert-loading">
        <p>Loading your reminders...</p>
      </div>
    );
  }

  if (!reminders || reminders.length === 0) {
    return (
      <article className="reminderalert-panel reminderalert-empty-state">
        <div className="reminderalert-empty-content">
          <p className="reminderalert-empty-icon">📋</p>
          <h3>No reminders yet</h3>
          <p>Create your first reminder to get started with organizing your tasks.</p>
        </div>
      </article>
    );
  }

  return (
    <div className="reminderalert-tasks-list">
      {reminders.map((reminder) => (
        <ReminderCard
          key={reminder._id}
          reminder={reminder}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleCompletion={onToggleCompletion}
          onTriggerVoiceCall={onTriggerVoiceCall}
        />
      ))}
    </div>
  );
});

ReminderList.displayName = 'ReminderList';

export default ReminderList;
