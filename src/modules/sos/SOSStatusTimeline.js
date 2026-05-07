import React, { useState, useEffect, useCallback } from 'react';
import './SOSStatusTimeline.css';

/**
 * SOSStatusTimeline Component (Priority 3)
 * Displays full history of status changes for incident
 * Includes filtering and detailed update information
 */
const SOSStatusTimeline = ({ incidentId, userEmail }) => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    hasMore: false,
  });

  const statusColors = {
    initial: '#FF6B6B',
    acknowledged: '#4ECDC4',
    'en-route': '#45B7D1',
    arrived: '#96CEB4',
    resolved: '#6BCB77',
    escalated: '#FF9500',
  };

  const statusIcons = {
    initial: '📢',
    acknowledged: '👍',
    'en-route': '🚗',
    arrived: '📍',
    resolved: '✅',
    escalated: '⚠️',
  };

  // Fetch timeline
  const fetchTimeline = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const query = new URLSearchParams({
        limit: pagination.limit,
        offset: pagination.offset,
        ...(filterStatus !== 'all' && { filterStatus }),
      });

      const response = await fetch(`/api/sos/incident/${incidentId}/timeline?${query}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });

      if (response.ok) {
        const data = await response.json();
        setTimeline(data.data.timeline);
        setPagination({
          limit: data.data.pagination.limit,
          offset: data.data.pagination.offset,
          hasMore: data.data.pagination.hasMore,
        });
      } else if (response.status === 404) {
        setError('Incident not found');
      } else {
        setError('Failed to fetch timeline');
      }
    } catch (err) {
      console.error('Error fetching timeline:', err);
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }, [incidentId, filterStatus, pagination.limit, pagination.offset]);

  // Initial fetch
  useEffect(() => {
    fetchTimeline();
  }, [filterStatus]);

  // Handle filter change
  const handleFilterChange = (status) => {
    setFilterStatus(status);
    setPagination({ ...pagination, offset: 0 });
  };

  // Load more
  const handleLoadMore = () => {
    setPagination({
      ...pagination,
      offset: pagination.offset + pagination.limit,
    });
    fetchTimeline();
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Calculate time difference from creation
  const getElapsedTime = (timestamp, startTime) => {
    const diff = new Date(timestamp) - new Date(startTime);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s ago`;
    } else {
      return `${seconds}s ago`;
    }
  };

  const startTime = timeline.length > 0 ? timeline[0].timestamp : new Date();

  if (loading && timeline.length === 0) {
    return (
      <div className="sos-timeline-container">
        <div className="loading">
          <div className="spinner" />
          <p>Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sos-timeline-container">
        <div className="error">
          <p>❌ {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sos-timeline-container">
      {/* Header */}
      <div className="timeline-header">
        <h3>📋 Status Timeline</h3>
        <p className="timeline-subtitle">Complete history of incident updates</p>
      </div>

      {/* Filter Buttons */}
      <div className="filter-buttons">
        <button
          className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => handleFilterChange('all')}
        >
          All ({timeline.length})
        </button>
        <button
          className={`filter-btn ${filterStatus === 'acknowledged' ? 'active' : ''}`}
          onClick={() => handleFilterChange('acknowledged')}
        >
          👍 Acknowledged
        </button>
        <button
          className={`filter-btn ${filterStatus === 'en-route' ? 'active' : ''}`}
          onClick={() => handleFilterChange('en-route')}
        >
          🚗 En-Route
        </button>
        <button
          className={`filter-btn ${filterStatus === 'arrived' ? 'active' : ''}`}
          onClick={() => handleFilterChange('arrived')}
        >
          📍 Arrived
        </button>
        <button
          className={`filter-btn ${filterStatus === 'resolved' ? 'active' : ''}`}
          onClick={() => handleFilterChange('resolved')}
        >
          ✅ Resolved
        </button>
      </div>

      {/* Timeline */}
      {timeline.length > 0 ? (
        <div className="timeline">
          {timeline.map((update, index) => (
            <div key={index} className="timeline-item">
              {/* Connector Line */}
              {index < timeline.length - 1 && <div className="timeline-line" />}

              {/* Timeline Dot */}
              <div
                className="timeline-dot"
                style={{ backgroundColor: statusColors[update.status] }}
              >
                {statusIcons[update.status]}
              </div>

              {/* Card Content */}
              <div className="timeline-card">
                {/* Status Header */}
                <div className="card-header">
                  <h4 style={{ color: statusColors[update.status] }}>
                    {statusIcons[update.status]} {update.status.toUpperCase()}
                  </h4>
                  <span className="card-time">
                    {formatTime(update.timestamp)}
                  </span>
                </div>

                {/* Responder Info */}
                <div className="card-info">
                  <p>
                    <strong>Responder:</strong> {update.responderName || 'Unknown'}
                  </p>
                  <p>
                    <strong>Updated by:</strong> {update.updatedBy || 'System'}
                  </p>
                  <p className="elapsed-time">
                    {getElapsedTime(update.timestamp, startTime)}
                  </p>
                </div>

                {/* Notes */}
                {update.notes && (
                  <div className="card-notes">
                    <strong>Notes:</strong>
                    <p>{update.notes}</p>
                  </div>
                )}

                {/* Location */}
                {update.responderLocation && (
                  <div className="card-location">
                    <strong>📍 Responder Location:</strong>
                    <p>
                      Lat: {update.responderLocation.latitude?.toFixed(5)}, Lng:{' '}
                      {update.responderLocation.longitude?.toFixed(5)}
                    </p>
                    <p>Accuracy: ±{update.responderLocation.accuracy}m</p>
                    {update.responderLocation.mapsUrl && (
                      <a
                        href={update.responderLocation.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="maps-link"
                      >
                        View on Maps 🗺️
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-timeline">
          <p>📋 No status updates yet</p>
        </div>
      )}

      {/* Load More Button */}
      {pagination.hasMore && (
        <button
          className="btn-load-more"
          onClick={handleLoadMore}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Load More Updates'}
        </button>
      )}

      {/* Summary */}
      {timeline.length > 0 && (
        <div className="timeline-summary">
          <p>
            <strong>Total Updates:</strong> {timeline.length}
          </p>
          <p>
            <strong>First Update:</strong> {formatTime(timeline[timeline.length - 1]?.timestamp)}
          </p>
          <p>
            <strong>Latest Update:</strong> {formatTime(timeline[0]?.timestamp)}
          </p>
        </div>
      )}
    </div>
  );
};

export default SOSStatusTimeline;
