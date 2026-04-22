import React, { useState, useEffect } from 'react';
import './SOSResponseHistory.css';

const SOSResponseHistory = ({ userEmail, userName }) => {
  const [responseHistory, setResponseHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });

  useEffect(() => {
    fetchResponseHistory();
  }, [userEmail, dateRange]);

  const fetchResponseHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      });

      const response = await fetch(`/api/sos/response-history?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setResponseHistory(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching response history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (startTime, endTime) => {
    if (!endTime) return 'Ongoing';
    const durationMs = new Date(endTime) - new Date(startTime);
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved':
        return '✓';
      case 'acknowledged':
        return '→';
      case 'cancelled':
        return '✕';
      default:
        return '•';
    }
  };

  const filteredHistory =
    filterType === 'all'
      ? responseHistory
      : responseHistory.filter((r) => r.status === filterType);

  const stats = {
    total: responseHistory.length,
    resolved: responseHistory.filter((r) => r.status === 'resolved').length,
    acknowledged: responseHistory.filter((r) => r.status === 'acknowledged')
      .length,
    avgResponseTime: responseHistory.length
      ? Math.round(
          responseHistory.reduce((sum, r) => {
            const responseTime = new Date(r.acknowledgedAt) - new Date(r.createdAt);
            return sum + responseTime;
          }, 0) / responseHistory.length / 1000 / 60
        )
      : 0,
  };

  if (loading) {
    return <div className="loading">Loading response history...</div>;
  }

  return (
    <div className="response-history-container">
      <div className="history-header">
        <h2>📊 Response History</h2>
        <p>Track your emergency response activities</p>
      </div>

      {/* Statistics */}
      <div className="history-stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Responses</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Resolved</span>
          <span className="stat-value">{stats.resolved}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Acknowledged</span>
          <span className="stat-value">{stats.acknowledged}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Avg Response Time</span>
          <span className="stat-value">{stats.avgResponseTime} min</span>
        </div>
      </div>

      {/* Filters */}
      <div className="history-filters">
        <div className="filter-group">
          <label>Status:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Responses</option>
            <option value="resolved">Resolved</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="filter-group">
          <label>From:</label>
          <input
            type="date"
            value={dateRange.startDate.toISOString().split('T')[0]}
            onChange={(e) =>
              setDateRange((prev) => ({
                ...prev,
                startDate: new Date(e.target.value),
              }))
            }
          />
        </div>

        <div className="filter-group">
          <label>To:</label>
          <input
            type="date"
            value={dateRange.endDate.toISOString().split('T')[0]}
            onChange={(e) =>
              setDateRange((prev) => ({
                ...prev,
                endDate: new Date(e.target.value),
              }))
            }
          />
        </div>

        <button className="btn-refresh" onClick={fetchResponseHistory}>
          🔄 Refresh
        </button>
      </div>

      {/* History List */}
      <div className="history-layout">
        <div className="history-list">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((response) => (
              <div
                key={response._id}
                className={`history-item ${
                  selectedResponse?._id === response._id ? 'selected' : ''
                }`}
                onClick={() => setSelectedResponse(response)}
              >
                <div className="history-item-header">
                  <div className="item-avatar">
                    {response.callerName?.charAt(0) || 'U'}
                  </div>
                  <div className="item-info">
                    <h4>{response.callerName}</h4>
                    <p>{response.reason}</p>
                    <p className="item-date">
                      {formatDate(response.createdAt)}
                    </p>
                  </div>
                  <div className="item-status">
                    <span className={`status-badge ${response.status}`}>
                      {getStatusIcon(response.status)} {response.status}
                    </span>
                    <span className="duration">
                      {calculateDuration(
                        response.createdAt,
                        response.resolvedAt
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-history">
              <p>No response history found</p>
              <p style={{ fontSize: '0.9rem', color: '#999' }}>
                Your emergency responses will appear here
              </p>
            </div>
          )}
        </div>

        {/* Detail View */}
        {selectedResponse && (
          <div className="history-detail">
            <div className="detail-header">
              <h3>Response Details</h3>
              <button
                className="close-btn"
                onClick={() => setSelectedResponse(null)}
              >
                ✕
              </button>
            </div>

            <div className="detail-section">
              <h4>Incident Information</h4>
              <div className="detail-row">
                <span>Caller:</span>
                <strong>{selectedResponse.callerName}</strong>
              </div>
              <div className="detail-row">
                <span>Email:</span>
                <strong>{selectedResponse.callerEmail}</strong>
              </div>
              <div className="detail-row">
                <span>Phone:</span>
                <strong>{selectedResponse.callerPhone || 'N/A'}</strong>
              </div>
              <div className="detail-row">
                <span>Reason:</span>
                <strong>{selectedResponse.reason}</strong>
              </div>
              <div className="detail-row">
                <span>Location:</span>
                <strong>{selectedResponse.location || 'Not provided'}</strong>
              </div>
            </div>

            <div className="detail-section">
              <h4>Response Timeline</h4>
              <div className="timeline">
                <div className="timeline-item">
                  <span className="timeline-label">Alert Received:</span>
                  <span className="timeline-time">
                    {formatDateTime(selectedResponse.createdAt)}
                  </span>
                </div>
                {selectedResponse.acknowledgedAt && (
                  <div className="timeline-item">
                    <span className="timeline-label">Acknowledged:</span>
                    <span className="timeline-time">
                      {formatDateTime(selectedResponse.acknowledgedAt)}
                    </span>
                  </div>
                )}
                {selectedResponse.resolvedAt && (
                  <div className="timeline-item">
                    <span className="timeline-label">Resolved:</span>
                    <span className="timeline-time">
                      {formatDateTime(selectedResponse.resolvedAt)}
                    </span>
                  </div>
                )}
              </div>
              <div className="detail-row">
                <span>Total Duration:</span>
                <strong>
                  {calculateDuration(
                    selectedResponse.createdAt,
                    selectedResponse.resolvedAt
                  )}
                </strong>
              </div>
            </div>

            <div className="detail-section">
              <h4>Response Status</h4>
              <div className="detail-row">
                <span>Current Status:</span>
                <strong className={selectedResponse.status}>
                  {selectedResponse.status}
                </strong>
              </div>
              <div className="detail-row">
                <span>Escalation Level:</span>
                <strong>{selectedResponse.escalationLevel || 0}</strong>
              </div>
            </div>

            {selectedResponse.notes && selectedResponse.notes.length > 0 && (
              <div className="detail-section">
                <h4>Response Notes</h4>
                <div className="notes-section">
                  {selectedResponse.notes.map((note, idx) => (
                    <div key={idx} className="note">
                      <p className="note-text">{note.text}</p>
                      <p className="note-meta">
                        {formatDateTime(note.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedResponse.myLocation && (
              <div className="detail-section">
                <h4>My Location When Responding</h4>
                <div className="location-info">
                  <p>Latitude: {selectedResponse.myLocation.latitude}</p>
                  <p>Longitude: {selectedResponse.myLocation.longitude}</p>
                  <p>
                    Accuracy:{' '}
                    {selectedResponse.myLocation.accuracy?.toFixed(0)}m
                  </p>
                </div>
              </div>
            )}

            <div className="detail-actions">
              <button className="btn-secondary">📋 Export Report</button>
              <button className="btn-secondary">📧 Send Summary</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SOSResponseHistory;
