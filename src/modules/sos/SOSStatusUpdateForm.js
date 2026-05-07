import React, { useState } from 'react';
import './SOSStatusUpdateForm.css';

/**
 * SOSStatusUpdateForm Component (Priority 3)
 * Responder UI for updating incident status
 * Includes status selection, notes, and location capture
 */
const SOSStatusUpdateForm = ({ incidentId, onStatusUpdated, responderName, responderEmail }) => {
  const [status, setStatus] = useState('acknowledged');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const statusOptions = [
    { value: 'acknowledged', label: 'Acknowledged', icon: '👍' },
    { value: 'en-route', label: 'En-Route', icon: '🚗' },
    { value: 'arrived', label: 'Arrived', icon: '📍' },
    { value: 'resolved', label: 'Resolved', icon: '✅' },
    { value: 'escalated', label: 'Escalated', icon: '⚠️' },
  ];

  // Get current location
  const captureLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

        setLocation({
          latitude: parseFloat(latitude.toFixed(5)),
          longitude: parseFloat(longitude.toFixed(5)),
          accuracy: Math.round(accuracy),
          mapsUrl,
        });

        setError(null);
      },
      (err) => {
        setError(`Location error: ${err.message}`);
      }
    );
  };

  // Submit status update
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!status) {
      setError('Please select a status');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`/api/sos/incident/${incidentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          status,
          notes: notes || null,
          responderLocation: location || null,
          responderName,
          responderEmail,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Status updated to ${status}`);
        setNotes('');
        setLocation(null);

        // Callback to parent
        if (onStatusUpdated) {
          onStatusUpdated(data.data);
        }

        // Auto-clear success message
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Error updating status');
    } finally {
      setLoading(false);
    }
  };

  const selectedStatusOption = statusOptions.find((opt) => opt.value === status);

  return (
    <div className="sos-status-update-form">
      <h3>📋 Update Incident Status</h3>

      <form onSubmit={handleSubmit}>
        {/* Status Selection */}
        <div className="form-group">
          <label htmlFor="status">Select Status</label>
          <div className="status-radio-group">
            {statusOptions.map((option) => (
              <label key={option.value} className="radio-label">
                <input
                  type="radio"
                  name="status"
                  value={option.value}
                  checked={status === option.value}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={loading}
                />
                <span className="radio-custom">
                  {option.icon}
                </span>
                <span className="radio-text">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Current Status Display */}
        <div className="status-display">
          <div className="status-badge">
            {selectedStatusOption?.icon} <strong>{selectedStatusOption?.label}</strong>
          </div>
        </div>

        {/* Notes Field */}
        <div className="form-group">
          <label htmlFor="notes">Additional Notes (Optional)</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any relevant information about the incident..."
            disabled={loading}
            rows="4"
            className="notes-textarea"
          />
          <span className="char-count">{notes.length}/500</span>
        </div>

        {/* Location Section */}
        <div className="location-section">
          <h4>📍 Your Location</h4>

          {location ? (
            <div className="location-display">
              <p>
                <strong>Latitude:</strong> {location.latitude}
              </p>
              <p>
                <strong>Longitude:</strong> {location.longitude}
              </p>
              <p>
                <strong>Accuracy:</strong> ±{location.accuracy}m
              </p>
              <a href={location.mapsUrl} target="_blank" rel="noopener noreferrer" className="maps-link">
                View on Maps 🗺️
              </a>
              <button
                type="button"
                onClick={() => setLocation(null)}
                className="btn-clear-location"
              >
                ✕ Clear Location
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={captureLocation}
              className="btn-capture-location"
              disabled={loading}
            >
              📍 Capture Current Location
            </button>
          )}
        </div>

        {/* Responder Info Display */}
        <div className="responder-info">
          <p>
            <strong>Responder:</strong> {responderName || 'Unknown'}
          </p>
          <p>
            <strong>Email:</strong> {responderEmail || 'Unknown'}
          </p>
          <p>
            <strong>Time:</strong> {new Date().toLocaleString()}
          </p>
        </div>

        {/* Error Message */}
        {error && <div className="alert alert-error">{error}</div>}

        {/* Success Message */}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Submit Button */}
        <button
          type="submit"
          className="btn-submit"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-small" />
              Updating...
            </>
          ) : (
            <>✓ Update Status</>
          )}
        </button>
      </form>

      {/* Info Box */}
      <div className="info-box">
        <p>
          <strong>💡 Tip:</strong> Capture your location when updating status to help the caller track your progress.
        </p>
      </div>
    </div>
  );
};

export default SOSStatusUpdateForm;
