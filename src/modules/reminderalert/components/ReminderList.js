import React from 'react';
import ReminderCard from './ReminderCard';

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
          <p className="reminderalert-empty-icon">No items</p>
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
