import React from 'react';

const RemindersPanel = ({ reminders = [], onReminderAction }) => {
  if (!reminders.length) {
    return <p className="gulf-services-empty-state">No reminders configured.</p>;
  }

  return (
    <div className="gulf-services-app-list">
      {reminders.map((reminder, index) => {
        const id = reminder?.id || reminder?._id || `${index}`;
        const label = reminder?.label || reminder?.title || 'Reminder';
        const dueAt = reminder?.dueAt || reminder?.scheduledAt;
        const enabled = reminder?.enabled !== false;

        return (
          <article key={id} className="gulf-services-app-item">
            <div>
              <strong>{label}</strong>
              {dueAt ? <p>{new Date(dueAt).toLocaleString()}</p> : <p>Schedule pending</p>}
              <small>{enabled ? 'Active' : 'Paused'}</small>
            </div>
            {onReminderAction ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onReminderAction(reminder, enabled ? 'disable' : 'enable')}
              >
                {enabled ? 'Pause' : 'Enable'}
              </button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
};

export default RemindersPanel;
