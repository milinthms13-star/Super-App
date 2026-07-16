import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MeetingScheduler.css';

const MeetingScheduler = ({ profileId, profile2Id = null, profile2Name = '' }) => {
  const [meetings, setMeetings] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const [newMeeting, setNewMeeting] = useState({
    profile2: profile2Id || '',
    meetingType: 'first_meeting',
    title: '',
    description: '',
    proposedDates: [{ date: '', time: '' }],
    meetingLocation: {
      type: 'physical',
      venue: {
        name: '',
        address: '',
        city: ''
      }
    },
    attendees: []
  });

  const [feedback, setFeedback] = useState({
    rating: 5,
    experience: 'good',
    interested: 'interested',
    comments: '',
    suggestNextStep: 'second_meeting'
  });

  useEffect(() => {
    fetchMeetings();
  }, [profileId, filter]);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await axios.get(`/api/matrimonial/meetings/profile/${profileId}`, { params });
      setMeetings(response.data.meetings);
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post('/api/matrimonial/meetings/create', {
        ...newMeeting,
        profile1: profileId
      });
      
      alert('Meeting created successfully!');
      setShowCreateModal(false);
      fetchMeetings();
      resetForm();
    } catch (err) {
      alert('Failed to create meeting');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeMeeting = async (meetingId, finalDate, finalTime) => {
    try {
      await axios.post(`/api/matrimonial/meetings/${meetingId}/finalize`, {
        finalDate,
        finalTime
      });
      alert('Meeting finalized!');
      fetchMeetings();
    } catch (err) {
      console.error('Failed to finalize meeting:', err);
    }
  };

  const handleSubmitFeedback = async (meetingId) => {
    try {
      await axios.post(`/api/matrimonial/meetings/${meetingId}/feedback`, {
        ...feedback,
        profileId
      });
      alert('Feedback submitted!');
      setShowDetailsModal(false);
      fetchMeetings();
    } catch (err) {
      alert('Failed to submit feedback');
      console.error(err);
    }
  };

  const handleCancelMeeting = async (meetingId, reason) => {
    if (!reason) {
      reason = prompt('Please provide a reason for cancellation:');
      if (!reason) return;
    }

    try {
      await axios.post(`/api/matrimonial/meetings/${meetingId}/cancel`, {
        reason,
        profileId
      });
      alert('Meeting cancelled');
      fetchMeetings();
    } catch (err) {
      console.error('Failed to cancel meeting:', err);
    }
  };

  const resetForm = () => {
    setNewMeeting({
      profile2: profile2Id || '',
      meetingType: 'first_meeting',
      title: '',
      description: '',
      proposedDates: [{ date: '', time: '' }],
      meetingLocation: {
        type: 'physical',
        venue: {
          name: '',
          address: '',
          city: ''
        }
      },
      attendees: []
    });
  };

  const addProposedDate = () => {
    setNewMeeting({
      ...newMeeting,
      proposedDates: [...newMeeting.proposedDates, { date: '', time: '' }]
    });
  };

  const updateProposedDate = (index, field, value) => {
    const updated = [...newMeeting.proposedDates];
    updated[index][field] = value;
    setNewMeeting({ ...newMeeting, proposedDates: updated });
  };

  const getStatusBadge = (status) => {
    const badges = {
      proposed: { label: 'Proposed', class: 'status-proposed', icon: '📝' },
      scheduled: { label: 'Scheduled', class: 'status-scheduled', icon: '📅' },
      confirmed: { label: 'Confirmed', class: 'status-confirmed', icon: '✅' },
      completed: { label: 'Completed', class: 'status-completed', icon: '🎉' },
      cancelled: { label: 'Cancelled', class: 'status-cancelled', icon: '❌' }
    };
    const badge = badges[status] || badges.proposed;
    return (
      <span className={`status-badge ${badge.class}`}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  const getMeetingTypeLabel = (type) => {
    const types = {
      first_meeting: '☕ First Meeting',
      family_meeting: '👨‍👩‍👧 Family Meeting',
      casual_meetup: '🎭 Casual Meetup',
      video_call: '📹 Video Call',
      phone_call: '📞 Phone Call',
      other: '📌 Other'
    };
    return types[type] || type;
  };

  const formatDateTime = (date, time) => {
    if (!date) return 'Not set';
    const d = new Date(date);
    return `${d.toLocaleDateString()} ${time || ''}`;
  };

  const isUpcoming = (date) => {
    if (!date) return false;
    return new Date(date) > new Date();
  };

  const meetingTypes = [
    { value: 'first_meeting', label: 'First Meeting' },
    { value: 'family_meeting', label: 'Family Meeting' },
    { value: 'casual_meetup', label: 'Casual Meetup' },
    { value: 'video_call', label: 'Video Call' },
    { value: 'phone_call', label: 'Phone Call' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div className="meeting-scheduler">
      <div className="scheduler-header">
        <h2>Meeting Scheduler</h2>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <i className="icon-plus"></i> Schedule Meeting
        </button>
      </div>

      <div className="filter-tabs">
        {['all', 'proposed', 'scheduled', 'confirmed', 'completed'].map(status => (
          <button
            key={status}
            className={`filter-tab ${filter === status ? 'active' : ''}`}
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <div className="meetings-grid">
        {meetings.length === 0 ? (
          <div className="empty-state">
            <i className="icon-calendar"></i>
            <h3>No meetings {filter !== 'all' ? `with status "${filter}"` : ''}</h3>
            <p>Schedule your first meeting to get started</p>
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              Schedule Meeting
            </button>
          </div>
        ) : (
          meetings.map(meeting => (
            <div 
              key={meeting._id} 
              className={`meeting-card ${isUpcoming(meeting.finalDate) ? 'upcoming' : ''}`}
              onClick={() => {
                setSelectedMeeting(meeting);
                setShowDetailsModal(true);
              }}
            >
              <div className="meeting-card-header">
                <div>
                  <h3>{meeting.title}</h3>
                  <span className="meeting-type">{getMeetingTypeLabel(meeting.meetingType)}</span>
                </div>
                {getStatusBadge(meeting.status)}
              </div>

              <div className="meeting-details">
                {meeting.finalDate && (
                  <div className="detail-item">
                    <i className="icon-calendar"></i>
                    <span>{formatDateTime(meeting.finalDate, meeting.finalTime)}</span>
                  </div>
                )}

                <div className="detail-item">
                  <i className="icon-location"></i>
                  <span>
                    {meeting.meetingLocation.type === 'physical' 
                      ? meeting.meetingLocation.venue?.name || 'Physical location'
                      : meeting.meetingLocation.type}
                  </span>
                </div>

                {meeting.attendees && meeting.attendees.length > 0 && (
                  <div className="detail-item">
                    <i className="icon-users"></i>
                    <span>{meeting.attendees.length} attendees</span>
                  </div>
                )}
              </div>

              {isUpcoming(meeting.finalDate) && (
                <div className="upcoming-badge">
                  <i className="icon-clock"></i> Upcoming
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Schedule New Meeting</h3>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateMeeting} className="create-meeting-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Meeting Type *</label>
                  <select
                    value={newMeeting.meetingType}
                    onChange={(e) => setNewMeeting({...newMeeting, meetingType: e.target.value})}
                    required
                  >
                    {meetingTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Location Type *</label>
                  <select
                    value={newMeeting.meetingLocation.type}
                    onChange={(e) => setNewMeeting({
                      ...newMeeting,
                      meetingLocation: { ...newMeeting.meetingLocation, type: e.target.value }
                    })}
                    required
                  >
                    <option value="physical">Physical Meeting</option>
                    <option value="video">Video Call</option>
                    <option value="phone">Phone Call</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Meeting Title *</label>
                <input
                  type="text"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting({...newMeeting, title: e.target.value})}
                  placeholder="e.g., Coffee at Cafe Coffee Day"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newMeeting.description}
                  onChange={(e) => setNewMeeting({...newMeeting, description: e.target.value})}
                  placeholder="Add any additional details..."
                  rows="3"
                />
              </div>

              {newMeeting.meetingLocation.type === 'physical' && (
                <>
                  <div className="form-group">
                    <label>Venue Name *</label>
                    <input
                      type="text"
                      value={newMeeting.meetingLocation.venue.name}
                      onChange={(e) => setNewMeeting({
                        ...newMeeting,
                        meetingLocation: {
                          ...newMeeting.meetingLocation,
                          venue: { ...newMeeting.meetingLocation.venue, name: e.target.value }
                        }
                      })}
                      placeholder="e.g., Cafe Coffee Day"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Address *</label>
                    <input
                      type="text"
                      value={newMeeting.meetingLocation.venue.address}
                      onChange={(e) => setNewMeeting({
                        ...newMeeting,
                        meetingLocation: {
                          ...newMeeting.meetingLocation,
                          venue: { ...newMeeting.meetingLocation.venue, address: e.target.value }
                        }
                      })}
                      placeholder="Full address"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>City *</label>
                    <input
                      type="text"
                      value={newMeeting.meetingLocation.venue.city}
                      onChange={(e) => setNewMeeting({
                        ...newMeeting,
                        meetingLocation: {
                          ...newMeeting.meetingLocation,
                          venue: { ...newMeeting.meetingLocation.venue, city: e.target.value }
                        }
                      })}
                      placeholder="City"
                      required
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Proposed Dates & Times</label>
                {newMeeting.proposedDates.map((pd, index) => (
                  <div key={index} className="proposed-date-row">
                    <input
                      type="date"
                      value={pd.date}
                      onChange={(e) => updateProposedDate(index, 'date', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                    <input
                      type="time"
                      value={pd.time}
                      onChange={(e) => updateProposedDate(index, 'time', e.target.value)}
                      required
                    />
                  </div>
                ))}
                <button type="button" className="btn-add-date" onClick={addProposedDate}>
                  + Add Another Date Option
                </button>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Meeting Details Modal */}
      {showDetailsModal && selectedMeeting && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedMeeting.title}</h3>
              <button className="btn-close" onClick={() => setShowDetailsModal(false)}>×</button>
            </div>

            <div className="meeting-details-content">
              <div className="detail-section">
                <h4>Meeting Information</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <strong>Type:</strong>
                    <span>{getMeetingTypeLabel(selectedMeeting.meetingType)}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Status:</strong>
                    {getStatusBadge(selectedMeeting.status)}
                  </div>
                  {selectedMeeting.finalDate && (
                    <div className="detail-item">
                      <strong>Date & Time:</strong>
                      <span>{formatDateTime(selectedMeeting.finalDate, selectedMeeting.finalTime)}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <strong>Location:</strong>
                    <span>
                      {selectedMeeting.meetingLocation.type === 'physical'
                        ? `${selectedMeeting.meetingLocation.venue?.name}, ${selectedMeeting.meetingLocation.venue?.city}`
                        : selectedMeeting.meetingLocation.type}
                    </span>
                  </div>
                </div>

                {selectedMeeting.description && (
                  <div className="description-box">
                    <strong>Description:</strong>
                    <p>{selectedMeeting.description}</p>
                  </div>
                )}
              </div>

              {selectedMeeting.status === 'completed' && (
                <div className="feedback-section">
                  <h4>Submit Feedback</h4>
                  <div className="feedback-form">
                    <div className="form-group">
                      <label>How was your experience?</label>
                      <select
                        value={feedback.experience}
                        onChange={(e) => setFeedback({...feedback, experience: e.target.value})}
                      >
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="average">Average</option>
                        <option value="poor">Poor</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Interest Level</label>
                      <select
                        value={feedback.interested}
                        onChange={(e) => setFeedback({...feedback, interested: e.target.value})}
                      >
                        <option value="very_interested">Very Interested</option>
                        <option value="interested">Interested</option>
                        <option value="maybe">Maybe</option>
                        <option value="not_interested">Not Interested</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Rating (1-5)</label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={feedback.rating}
                        onChange={(e) => setFeedback({...feedback, rating: parseInt(e.target.value)})}
                      />
                      <div className="rating-display">{'⭐'.repeat(feedback.rating)}</div>
                    </div>

                    <div className="form-group">
                      <label>Comments</label>
                      <textarea
                        value={feedback.comments}
                        onChange={(e) => setFeedback({...feedback, comments: e.target.value})}
                        rows="3"
                        placeholder="Share your thoughts..."
                      />
                    </div>

                    <button 
                      className="btn-primary"
                      onClick={() => handleSubmitFeedback(selectedMeeting._id)}
                    >
                      Submit Feedback
                    </button>
                  </div>
                </div>
              )}

              <div className="meeting-actions">
                {selectedMeeting.status !== 'cancelled' && selectedMeeting.status !== 'completed' && (
                  <button 
                    className="btn-danger"
                    onClick={() => handleCancelMeeting(selectedMeeting._id)}
                  >
                    Cancel Meeting
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingScheduler;
