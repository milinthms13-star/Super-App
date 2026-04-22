import React, { useState, useEffect } from 'react';
import './SOSIncidentResponse.css';

const SOSIncidentResponse = ({ userEmail, userName }) => {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [responseNotes, setResponseNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [userEmail]);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/sos/my-responses', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setIncidents(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (incidentId, note) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/sos/incident/${incidentId}/note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          note,
          responderName: userName,
          responderEmail: userEmail,
        }),
      });

      if (response.ok) {
        setResponseNotes((prev) => ({ ...prev, [incidentId]: '' }));
        fetchIncidents();
      }
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleUpdateStatus = async (incidentId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/sos/incident/${incidentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          responderName: userName,
        }),
      });

      if (response.ok) {
        fetchIncidents();
        if (newStatus === 'resolved') {
          setSelectedIncident(null);
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleShareLocation = async (incidentId) => {
    try {
      if (!navigator.geolocation) {
        alert('Geolocation not available');
        return;
      }

      navigator.geolocation.getCurrentPosition(async (position) => {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `/api/sos/incident/${incidentId}/location`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              responderName: userName,
            }),
          }
        );

        if (response.ok) {
          alert('Your location shared with caller');
          fetchIncidents();
        }
      });
    } catch (error) {
      console.error('Error sharing location:', error);
    }
  };

  const filteredIncidents = incidents.filter((incident) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active')
      return incident.status !== 'resolved' && incident.status !== 'cancelled';
    return incident.status === filterStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'acknowledged':
        return 'status-acknowledged';
      case 'resolved':
        return 'status-resolved';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (startTime, endTime) => {
    if (!endTime) return 'Ongoing';
    const duration = Math.floor(
      (new Date(endTime) - new Date(startTime)) / 1000 / 60
    );
    return `${duration} min`;
  };

  if (loading) {
    return <div className="loading">Loading incidents...</div>;
  }

  return (
    <div className="incident-response-container">
      <div className="response-header">
        <h2>🚨 Incident Response Management</h2>
        <p>Track and manage SOS incidents you're responding to</p>
      </div>

      <div className="response-filters">
        <button
          className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          All ({incidents.length})
        </button>
        <button
          className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
          onClick={() => setFilterStatus('active')}
        >
          Active (
          {
            incidents.filter(
              (i) => i.status !== 'resolved' && i.status !== 'cancelled'
            ).length
          }
          )
        </button>
        <button
          className={`filter-btn ${filterStatus === 'resolved' ? 'active' : ''}`}
          onClick={() => setFilterStatus('resolved')}
        >
          Resolved (
          {incidents.filter((i) => i.status === 'resolved').length})
        </button>
      </div>

      <div className="incidents-layout">
        <div className="incidents-list">
          {filteredIncidents.length > 0 ? (
            filteredIncidents.map((incident) => (
              <div
                key={incident._id}
                className={`incident-card ${
                  selectedIncident?._id === incident._id ? 'selected' : ''
                }`}
                onClick={() => setSelectedIncident(incident)}
              >
                <div className="incident-card-header">
                  <div>
                    <h4>{incident.userId?.name || 'Unknown User'}</h4>
                    <p>{incident.reason}</p>
                  </div>
                  <span className={`status-badge ${getStatusColor(incident.status)}`}>
                    {incident.status}
                  </span>
                </div>

                <div className="incident-card-meta">
                  <span>📍 {incident.location?.coordinates?.join(', ') || 'Location TBA'}</span>
                  <span>⏱ {formatTime(incident.createdAt)}</span>
                  <span>
                    ⏰{' '}
                    {calculateDuration(
                      incident.createdAt,
                      incident.resolvedAt
                    )}
                  </span>
                </div>

                {incident.acknowledgements?.length > 0 && (
                  <div className="incident-acknowledgements">
                    <strong>{incident.acknowledgements.length}</strong> responder
                    {incident.acknowledgements.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="empty-incidents">
              <p>No incidents found</p>
            </div>
          )}
        </div>

        {selectedIncident && (
          <div className="incident-details">
            <div className="detail-header">
              <h3>{selectedIncident.userId?.name}</h3>
              <button
                className="close-btn"
                onClick={() => setSelectedIncident(null)}
              >
                ✕
              </button>
            </div>

            <div className="detail-section">
              <h4>Emergency Details</h4>
              <div className="detail-item">
                <label>Reason:</label>
                <p>{selectedIncident.reason}</p>
              </div>
              <div className="detail-item">
                <label>Location:</label>
                <p>{selectedIncident.location || 'Not provided'}</p>
              </div>
              <div className="detail-item">
                <label>Reported At:</label>
                <p>{formatTime(selectedIncident.createdAt)}</p>
              </div>
              <div className="detail-item">
                <label>Escalation Level:</label>
                <p>{selectedIncident.escalationLevel || 0}</p>
              </div>
            </div>

            <div className="detail-section">
              <h4>Caller Information</h4>
              <div className="detail-item">
                <label>Name:</label>
                <p>{selectedIncident.userId?.name}</p>
              </div>
              <div className="detail-item">
                <label>Email:</label>
                <p>{selectedIncident.userId?.email}</p>
              </div>
              <div className="detail-item">
                <label>Phone:</label>
                <p>{selectedIncident.userId?.phone || 'N/A'}</p>
              </div>
            </div>

            <div className="detail-section">
              <h4>Response Actions</h4>
              <div className="action-buttons">
                <button
                  className="btn-primary"
                  onClick={() =>
                    handleShareLocation(selectedIncident._id)
                  }
                >
                  📍 Share My Location
                </button>
                <button
                  className="btn-secondary"
                  onClick={() =>
                    handleUpdateStatus(selectedIncident._id, 'acknowledged')
                  }
                  disabled={selectedIncident.status === 'acknowledged'}
                >
                  ✓ Acknowledge
                </button>
                <button
                  className="btn-success"
                  onClick={() =>
                    handleUpdateStatus(selectedIncident._id, 'resolved')
                  }
                  disabled={selectedIncident.status === 'resolved'}
                >
                  ✓ Mark Resolved
                </button>
              </div>
            </div>

            <div className="detail-section">
              <h4>Response Notes</h4>
              <textarea
                value={responseNotes[selectedIncident._id] || ''}
                onChange={(e) =>
                  setResponseNotes((prev) => ({
                    ...prev,
                    [selectedIncident._id]: e.target.value,
                  }))
                }
                placeholder="Add notes about your response..."
                className="notes-textarea"
              />
              <button
                className="btn-primary"
                onClick={() =>
                  handleAddNote(
                    selectedIncident._id,
                    responseNotes[selectedIncident._id]
                  )
                }
              >
                Add Note
              </button>
            </div>

            {selectedIncident.responseNotes &&
              selectedIncident.responseNotes.length > 0 && (
                <div className="detail-section">
                  <h4>Notes History</h4>
                  <div className="notes-list">
                    {selectedIncident.responseNotes.map((note, idx) => (
                      <div key={idx} className="note-item">
                        <p className="note-text">{note.text}</p>
                        <p className="note-meta">
                          By {note.responderName} at{' '}
                          {formatTime(note.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SOSIncidentResponse;
