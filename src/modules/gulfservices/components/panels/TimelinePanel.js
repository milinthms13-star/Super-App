import React from 'react';

const TimelinePanel = ({ timelineEntries = [] }) => {
  if (!timelineEntries.length) {
    return <p className="gulf-services-empty-state">No timeline updates yet.</p>;
  }

  return (
    <div className="gulf-services-timeline">
      {timelineEntries.map((entry, index) => (
        <div key={`${entry?.status || 'status'}-${index}`} className="gulf-services-timeline-entry">
          <span className="gulf-services-timeline-status">{entry?.status || 'Status updated'}</span>
          <span className="gulf-services-timeline-date">
            {entry?.date ? new Date(entry.date).toLocaleDateString() : 'Date pending'}
          </span>
          {entry?.note ? <p>{entry.note}</p> : null}
        </div>
      ))}
    </div>
  );
};

export default TimelinePanel;
