import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MessageScheduler.css';

const MessageScheduler = ({ chatId, onClose, onScheduled }) => {
  const [message, setMessage] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState('daily');
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'list'

  useEffect(() => {
    if (activeTab === 'list') {
      fetchScheduledMessages();
    }
  }, [activeTab, chatId]);

  const fetchScheduledMessages = async () => {
    try {
      const response = await axios.get(`/api/messaging/v5/schedule/${chatId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setScheduledMessages(response.data.messages || []);
    } catch (err) {
      console.error('Error fetching scheduled messages:', err);
      setError('Failed to load scheduled messages');
    }
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setError('Message cannot be empty');
      return;
    }

    if (!scheduleDate || !scheduleTime) {
      setError('Please select date and time');
      return;
    }

    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
    
    if (scheduledDateTime <= new Date()) {
      setError('Scheduled time must be in the future');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/messaging/v5/schedule', {
        chatId,
        content: message,
        scheduledFor: scheduledDateTime.toISOString(),
        recurring: recurring ? recurringPattern : null
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        setMessage('');
        setScheduleDate('');
        setScheduleTime('');
        setRecurring(false);
        if (onScheduled) onScheduled(response.data.message);
        setActiveTab('list');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to schedule message');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (messageId) => {
    if (!window.confirm('Cancel this scheduled message?')) return;

    try {
      await axios.delete(`/api/messaging/v5/schedule/${messageId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchScheduledMessages();
    } catch (err) {
      setError('Failed to cancel message');
    }
  };

  const handleReschedule = async (messageId, newTime) => {
    try {
      await axios.put(`/api/messaging/v5/schedule/${messageId}`, {
        scheduledFor: newTime
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchScheduledMessages();
    } catch (err) {
      setError('Failed to reschedule message');
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5); // Minimum 5 minutes from now
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="message-scheduler-modal">
      <div className="message-scheduler-container">
        <div className="scheduler-header">
          <h2>Schedule Message</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="scheduler-tabs">
          <button 
            className={`tab ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
          >
            New Schedule
          </button>
          <button 
            className={`tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            Scheduled ({scheduledMessages.length})
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {activeTab === 'new' ? (
          <form onSubmit={handleSchedule} className="scheduler-form">
            <div className="form-group">
              <label>Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                rows="4"
                maxLength="1000"
                required
              />
              <span className="char-count">{message.length}/1000</span>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="form-group">
                <label>Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={recurring}
                  onChange={(e) => setRecurring(e.target.checked)}
                />
                Recurring message
              </label>
            </div>

            {recurring && (
              <div className="form-group">
                <label>Recurrence Pattern</label>
                <select 
                  value={recurringPattern}
                  onChange={(e) => setRecurringPattern(e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="weekdays">Weekdays (Mon-Fri)</option>
                  <option value="weekends">Weekends (Sat-Sun)</option>
                </select>
              </div>
            )}

            <div className="scheduler-actions">
              <button type="button" onClick={onClose} className="btn-cancel">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-schedule">
                {loading ? 'Scheduling...' : 'Schedule Message'}
              </button>
            </div>
          </form>
        ) : (
          <div className="scheduled-messages-list">
            {scheduledMessages.length === 0 ? (
              <div className="empty-state">
                <p>No scheduled messages</p>
              </div>
            ) : (
              scheduledMessages.map((msg) => (
                <div key={msg._id} className="scheduled-message-item">
                  <div className="message-content">
                    <p>{msg.content}</p>
                    <span className="schedule-time">
                      📅 {formatDateTime(msg.scheduledFor)}
                      {msg.recurring && ` • Recurring: ${msg.recurring}`}
                    </span>
                  </div>
                  <div className="message-actions">
                    <button 
                      onClick={() => handleCancel(msg._id)}
                      className="btn-icon"
                      title="Cancel"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageScheduler;
