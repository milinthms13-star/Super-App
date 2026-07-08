import React, { useState, useEffect } from 'react';
import { financeApi } from '../financeApi';

const CRMPanel = ({ leadId, onClose }) => {
  const [activeTab, setActiveTab] = useState('timeline');
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Call logging state
  const [callForm, setCallForm] = useState({
    subject: '',
    direction: 'outbound',
    duration: '',
    outcome: 'connected',
    notes: '',
  });

  // Note state
  const [noteForm, setNoteForm] = useState({
    subject: '',
    content: '',
    tags: '',
  });

  // Task state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
  });

  // Meeting state
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    scheduledAt: '',
    duration: 30,
    location: 'Phone',
    agenda: '',
  });

  useEffect(() => {
    if (leadId && activeTab === 'timeline') {
      loadTimeline();
    }
  }, [leadId, activeTab]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await financeApi.getLeadTimeline(leadId);
      if (response.success) {
        setTimeline(response.activities || []);
      }
    } catch (err) {
      setError('Failed to load timeline');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogCall = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const response = await financeApi.logCall(leadId, {
        ...callForm,
        duration: parseInt(callForm.duration) || 0,
      });
      if (response.success) {
        alert('Call logged successfully');
        setCallForm({
          subject: '',
          direction: 'outbound',
          duration: '',
          outcome: 'connected',
          notes: '',
        });
        loadTimeline();
      }
    } catch (err) {
      setError('Failed to log call');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const response = await financeApi.addNote(leadId, {
        ...noteForm,
        tags: noteForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      if (response.success) {
        alert('Note added successfully');
        setNoteForm({ subject: '', content: '', tags: '' });
        loadTimeline();
      }
    } catch (err) {
      setError('Failed to add note');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const response = await financeApi.createTask(leadId, taskForm);
      if (response.success) {
        alert('Task created successfully');
        setTaskForm({ title: '', description: '', dueDate: '', priority: 'medium' });
        loadTimeline();
      }
    } catch (err) {
      setError('Failed to create task');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const response = await financeApi.scheduleMeeting(leadId, {
        ...meetingForm,
        duration: parseInt(meetingForm.duration) || 30,
      });
      if (response.success) {
        alert('Meeting scheduled successfully');
        setMeetingForm({ title: '', scheduledAt: '', duration: 30, location: 'Phone', agenda: '' });
        loadTimeline();
      }
    } catch (err) {
      setError('Failed to schedule meeting');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatActivityTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActivityIcon = (type) => {
    const icons = {
      call: '📞',
      note: '📝',
      task: '✅',
      meeting: '📅',
      email: '📧',
      sms: '💬',
      whatsapp: '💚',
    };
    return icons[type] || '📋';
  };

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h3>CRM Activities - Lead {leadId}</h3>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
      </div>

      {error && (
        <div style={styles.error}>{error}</div>
      )}

      <div style={styles.tabs}>
        <button
          style={activeTab === 'timeline' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('timeline')}
        >
          Timeline
        </button>
        <button
          style={activeTab === 'call' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('call')}
        >
          Log Call
        </button>
        <button
          style={activeTab === 'note' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('note')}
        >
          Add Note
        </button>
        <button
          style={activeTab === 'task' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('task')}
        >
          Create Task
        </button>
        <button
          style={activeTab === 'meeting' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('meeting')}
        >
          Schedule Meeting
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'timeline' && (
          <div>
            <h4>Activity Timeline</h4>
            {loading ? (
              <p>Loading timeline...</p>
            ) : timeline.length === 0 ? (
              <p style={styles.emptyState}>No activities yet</p>
            ) : (
              <div style={styles.timeline}>
                {timeline.map((activity) => (
                  <div key={activity._id} style={styles.timelineItem}>
                    <div style={styles.activityIcon}>{getActivityIcon(activity.activityType)}</div>
                    <div style={styles.activityContent}>
                      <div style={styles.activityHeader}>
                        <strong>{activity.subject || activity.activityType}</strong>
                        <span style={styles.activityTime}>{formatActivityTime(activity.createdAt)}</span>
                      </div>
                      {activity.description && (
                        <p style={styles.activityDesc}>{activity.description}</p>
                      )}
                      {activity.callDetails && (
                        <div style={styles.activityMeta}>
                          Direction: {activity.callDetails.direction} | 
                          Duration: {activity.callDetails.duration}s | 
                          Outcome: {activity.callDetails.outcome}
                        </div>
                      )}
                      {activity.taskDetails && (
                        <div style={styles.activityMeta}>
                          Priority: {activity.taskDetails.priority} | 
                          Status: {activity.taskDetails.completed ? 'Completed' : 'Pending'}
                          {activity.taskDetails.dueDate && ` | Due: ${new Date(activity.taskDetails.dueDate).toLocaleDateString()}`}
                        </div>
                      )}
                      {activity.tags && activity.tags.length > 0 && (
                        <div style={styles.tags}>
                          {activity.tags.map((tag, idx) => (
                            <span key={idx} style={styles.tag}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'call' && (
          <form onSubmit={handleLogCall} style={styles.form}>
            <h4>Log Phone Call</h4>
            <div style={styles.formGroup}>
              <label>Subject:</label>
              <input
                type="text"
                value={callForm.subject}
                onChange={(e) => setCallForm({ ...callForm, subject: e.target.value })}
                placeholder="E.g., Follow-up call"
                style={styles.input}
                required
              />
            </div>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label>Direction:</label>
                <select
                  value={callForm.direction}
                  onChange={(e) => setCallForm({ ...callForm, direction: e.target.value })}
                  style={styles.input}
                >
                  <option value="outbound">Outbound</option>
                  <option value="inbound">Inbound</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label>Duration (seconds):</label>
                <input
                  type="number"
                  value={callForm.duration}
                  onChange={(e) => setCallForm({ ...callForm, duration: e.target.value })}
                  placeholder="180"
                  style={styles.input}
                  required
                />
              </div>
            </div>
            <div style={styles.formGroup}>
              <label>Outcome:</label>
              <select
                value={callForm.outcome}
                onChange={(e) => setCallForm({ ...callForm, outcome: e.target.value })}
                style={styles.input}
              >
                <option value="connected">Connected</option>
                <option value="no-answer">No Answer</option>
                <option value="busy">Busy</option>
                <option value="voicemail">Voicemail</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label>Notes:</label>
              <textarea
                value={callForm.notes}
                onChange={(e) => setCallForm({ ...callForm, notes: e.target.value })}
                placeholder="Call notes..."
                style={styles.textarea}
                rows="4"
              />
            </div>
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Logging...' : 'Log Call'}
            </button>
          </form>
        )}

        {activeTab === 'note' && (
          <form onSubmit={handleAddNote} style={styles.form}>
            <h4>Add Note</h4>
            <div style={styles.formGroup}>
              <label>Subject:</label>
              <input
                type="text"
                value={noteForm.subject}
                onChange={(e) => setNoteForm({ ...noteForm, subject: e.target.value })}
                placeholder="E.g., Customer feedback"
                style={styles.input}
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label>Content:</label>
              <textarea
                value={noteForm.content}
                onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                placeholder="Note details..."
                style={styles.textarea}
                rows="6"
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label>Tags (comma-separated):</label>
              <input
                type="text"
                value={noteForm.tags}
                onChange={(e) => setNoteForm({ ...noteForm, tags: e.target.value })}
                placeholder="E.g., urgent, follow-up"
                style={styles.input}
              />
            </div>
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Adding...' : 'Add Note'}
            </button>
          </form>
        )}

        {activeTab === 'task' && (
          <form onSubmit={handleCreateTask} style={styles.form}>
            <h4>Create Task</h4>
            <div style={styles.formGroup}>
              <label>Title:</label>
              <input
                type="text"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="E.g., Collect bank statements"
                style={styles.input}
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label>Description:</label>
              <textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Task description..."
                style={styles.textarea}
                rows="4"
              />
            </div>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label>Due Date:</label>
                <input
                  type="datetime-local"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label>Priority:</label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                  style={styles.input}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </form>
        )}

        {activeTab === 'meeting' && (
          <form onSubmit={handleScheduleMeeting} style={styles.form}>
            <h4>Schedule Meeting</h4>
            <div style={styles.formGroup}>
              <label>Title:</label>
              <input
                type="text"
                value={meetingForm.title}
                onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                placeholder="E.g., Loan discussion"
                style={styles.input}
                required
              />
            </div>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label>Scheduled At:</label>
                <input
                  type="datetime-local"
                  value={meetingForm.scheduledAt}
                  onChange={(e) => setMeetingForm({ ...meetingForm, scheduledAt: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label>Duration (minutes):</label>
                <input
                  type="number"
                  value={meetingForm.duration}
                  onChange={(e) => setMeetingForm({ ...meetingForm, duration: e.target.value })}
                  placeholder="30"
                  style={styles.input}
                />
              </div>
            </div>
            <div style={styles.formGroup}>
              <label>Location:</label>
              <input
                type="text"
                value={meetingForm.location}
                onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                placeholder="E.g., Phone, Office, Zoom"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label>Agenda:</label>
              <textarea
                value={meetingForm.agenda}
                onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })}
                placeholder="Meeting agenda..."
                style={styles.textarea}
                rows="4"
              />
            </div>
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Scheduling...' : 'Schedule Meeting'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const styles = {
  panel: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0',
    color: '#666',
  },
  error: {
    padding: '10px 20px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderBottom: '1px solid #ef5350',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e0e0e0',
    padding: '0 20px',
    gap: '5px',
  },
  tab: {
    padding: '12px 20px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#666',
    fontWeight: '500',
    borderBottom: '2px solid transparent',
  },
  activeTab: {
    padding: '12px 20px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#1976d2',
    fontWeight: '600',
    borderBottom: '2px solid #1976d2',
  },
  content: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
  },
  timeline: {
    marginTop: '10px',
  },
  timelineItem: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
  },
  activityIcon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  activityTime: {
    fontSize: '12px',
    color: '#666',
  },
  activityDesc: {
    margin: '8px 0',
    color: '#333',
  },
  activityMeta: {
    fontSize: '12px',
    color: '#666',
    marginTop: '8px',
  },
  tags: {
    display: 'flex',
    gap: '5px',
    flexWrap: 'wrap',
    marginTop: '8px',
  },
  tag: {
    padding: '2px 8px',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    borderRadius: '12px',
    fontSize: '12px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#999',
  },
  form: {
    maxWidth: '600px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    marginTop: '5px',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    marginTop: '5px',
    fontFamily: 'inherit',
  },
  submitBtn: {
    padding: '12px 24px',
    backgroundColor: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px',
  },
};

export default CRMPanel;
