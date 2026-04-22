import React, { useState } from 'react';

const ScheduledPosting = ({
  currentListing = {},
  onSchedule,
  onCancel,
  onClose,
  scheduledListings = [],
}) => {
  const [scheduleMode, setScheduleMode] = useState('now');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [repeatInterval, setRepeatInterval] = useState('none');
  const [repeatEndDate, setRepeatEndDate] = useState('');
  const [showScheduledList, setShowScheduledList] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const timezones = [
    { value: 'Asia/Kolkata', label: 'IST (India)' },
    { value: 'Asia/Dubai', label: 'GST (Gulf)' },
    { value: 'Europe/London', label: 'GMT (UK)' },
    { value: 'America/New_York', label: 'EST (US East)' },
    { value: 'America/Los_Angeles', label: 'PST (US West)' },
  ];

  const bestTimeSlots = [
    { time: '09:00', label: 'Morning (9 AM)', engagement: 'Medium' },
    { time: '12:30', label: 'Lunch (12:30 PM)', engagement: 'High' },
    { time: '18:00', label: 'Evening (6 PM)', engagement: 'Very High' },
    { time: '20:00', label: 'Night (8 PM)', engagement: 'Very High' },
  ];

  const repeatOptions = [
    { value: 'none', label: 'Post Once' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Every 2 Weeks' },
    { value: 'monthly', label: 'Monthly' },
  ];

  const getNextPostDate = () => {
    const date = new Date(`${selectedDate}T${selectedTime}`);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSchedule = () => {
    const scheduledItem = {
      id: Date.now(),
      listingId: currentListing.id,
      listingTitle: currentListing.title,
      scheduledDate: selectedDate,
      scheduledTime: selectedTime,
      timezone,
      repeatInterval,
      repeatEndDate: repeatInterval !== 'none' ? repeatEndDate : null,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      nextPostDate: getNextPostDate(),
    };

    if (onSchedule) {
      onSchedule(scheduledItem);
    }
  };

  const handleCancelSchedule = (scheduleId) => {
    if (onCancel) {
      onCancel(scheduleId);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <div className="scheduled-posting-modal">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="scheduled-posting-header">
          <h2>📅 Schedule Listing Post</h2>
          <p>Choose when your listing should go live</p>
        </div>

        <div className="scheduled-posting-content">
          {!showScheduledList ? (
            <>
              {/* Schedule Mode Selection */}
              <div className="schedule-mode-section">
                <h3>Post Mode</h3>
                <div className="mode-buttons">
                  <button
                    className={`mode-btn ${scheduleMode === 'now' ? 'active' : ''}`}
                    onClick={() => setScheduleMode('now')}
                  >
                    <span className="mode-icon">⚡</span>
                    <span className="mode-label">Post Now</span>
                  </button>
                  <button
                    className={`mode-btn ${scheduleMode === 'later' ? 'active' : ''}`}
                    onClick={() => setScheduleMode('later')}
                  >
                    <span className="mode-icon">📅</span>
                    <span className="mode-label">Schedule for Later</span>
                  </button>
                </div>
              </div>

              {scheduleMode === 'later' && (
                <>
                  {/* Date and Time Selection */}
                  <div className="datetime-section">
                    <h3>When to Post</h3>

                    <div className="form-row">
                      <div className="form-field">
                        <label htmlFor="post-date">Date</label>
                        <input
                          id="post-date"
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          min={getMinDate()}
                          className="form-input"
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="post-time">Time</label>
                        <input
                          id="post-time"
                          type="time"
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                          className="form-input"
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="timezone">Timezone</label>
                        <select
                          id="timezone"
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="form-select"
                        >
                          {timezones.map(tz => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Best Time Suggestions */}
                    <div className="best-times">
                      <label>💡 Best Time Slots</label>
                      <div className="time-slot-grid">
                        {bestTimeSlots.map(slot => (
                          <button
                            key={slot.time}
                            className={`time-slot-btn ${selectedTime === slot.time ? 'selected' : ''}`}
                            onClick={() => setSelectedTime(slot.time)}
                          >
                            <span className="slot-time">{slot.time}</span>
                            <span className="slot-label">{slot.label}</span>
                            <span className="slot-engagement">{slot.engagement}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Repeat Settings */}
                  <div className="repeat-section">
                    <h3>Repeat Schedule</h3>

                    <div className="form-field">
                      <label htmlFor="repeat-interval">Repeat</label>
                      <select
                        id="repeat-interval"
                        value={repeatInterval}
                        onChange={(e) => setRepeatInterval(e.target.value)}
                        className="form-select"
                      >
                        {repeatOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {repeatInterval !== 'none' && (
                      <div className="form-field">
                        <label htmlFor="repeat-end-date">Repeat Until</label>
                        <input
                          id="repeat-end-date"
                          type="date"
                          value={repeatEndDate}
                          onChange={(e) => setRepeatEndDate(e.target.value)}
                          min={selectedDate}
                          className="form-input"
                          required
                        />
                        <span className="field-hint">Leave blank for indefinite repeating</span>
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  <div className="schedule-preview">
                    <h3>Preview</h3>
                    <div className="preview-box">
                      <div className="preview-item">
                        <span className="label">Listing:</span>
                        <span className="value">{currentListing.title || 'Untitled'}</span>
                      </div>
                      <div className="preview-item">
                        <span className="label">First Post:</span>
                        <span className="value">{getNextPostDate()}</span>
                      </div>
                      {repeatInterval !== 'none' && (
                        <div className="preview-item">
                          <span className="label">Repeats:</span>
                          <span className="value">
                            {repeatInterval.charAt(0).toUpperCase() + repeatInterval.slice(1)}
                            {repeatEndDate && ` until ${formatDate(repeatEndDate)}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="info-box">
                    <span className="info-icon">ℹ️</span>
                    <div>
                      <strong>Scheduling Tips:</strong>
                      <ul>
                        <li>Posts during high engagement times get more views</li>
                        <li>Recurring posts keep your listing fresh and visible</li>
                        <li>You can edit or cancel scheduled posts anytime</li>
                      </ul>
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="modal-actions">
                <button className="secondary-btn" onClick={() => setShowScheduledList(true)}>
                  View Scheduled ({scheduledListings.length})
                </button>
                {scheduleMode === 'now' && (
                  <button className="primary-btn" onClick={() => handleSchedule()}>
                    Post Now
                  </button>
                )}
                {scheduleMode === 'later' && (
                  <button className="primary-btn" onClick={handleSchedule}>
                    Schedule Post
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Scheduled Listings List */}
              <div className="scheduled-list-view">
                <button
                  className="back-btn"
                  onClick={() => setShowScheduledList(false)}
                >
                  ← Back to Schedule
                </button>

                <h3>Scheduled Posts ({scheduledListings.length})</h3>

                {scheduledListings.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-icon">📭</p>
                    <p>No scheduled posts yet</p>
                  </div>
                ) : (
                  <div className="scheduled-list">
                    {scheduledListings.map(item => (
                      <div key={item.id} className="scheduled-item">
                        <div className="scheduled-item-header">
                          <h4>{item.listingTitle}</h4>
                          <span className={`status-badge status-${item.status}`}>
                            {item.status}
                          </span>
                        </div>

                        <div className="scheduled-item-details">
                          <div className="detail">
                            <span className="label">Scheduled for:</span>
                            <span className="value">{item.nextPostDate}</span>
                          </div>

                          {item.repeatInterval !== 'none' && (
                            <div className="detail">
                              <span className="label">Repeats:</span>
                              <span className="value">{item.repeatInterval}</span>
                            </div>
                          )}

                          <div className="detail">
                            <span className="label">Timezone:</span>
                            <span className="value">{item.timezone}</span>
                          </div>
                        </div>

                        <div className="scheduled-item-actions">
                          <button
                            className="edit-btn"
                            onClick={() => {
                              setSelectedSchedule(item);
                              setShowScheduledList(false);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="cancel-btn-inline"
                            onClick={() => handleCancelSchedule(item.id)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduledPosting;
