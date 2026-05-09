/**
 * SOSEmergency.js
 * Emergency SOS component for ride-sharing
 */

import React, { useState } from 'react';
import axios from 'axios';
import './SOSEmergency.css';

const SOSEmergency = ({ rideId, onSuccess, onError }) => {
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [shareEmail, setShareEmail] = useState('');
  const [activeIncidents, setActiveIncidents] = useState([]);

  const incidentTypes = [
    { value: 'accident', label: '🚗 Accident' },
    { value: 'harassment', label: '⚠️ Harassment' },
    { value: 'threat', label: '🚨 Threat' },
    { value: 'medical', label: '🏥 Medical Emergency' },
    { value: 'lost_item', label: '🔍 Lost Item' },
    { value: 'other', label: '❓ Other' },
  ];

  /**
   * Send emergency SOS alert
   */
  const handleSendSOS = async () => {
    if (!selectedIncident || !description.trim()) {
      onError('Please select incident type and provide description');
      return;
    }

    try {
      setIsAlertActive(true);
      const response = await axios.post(
        '/api/ridesharing/phase2/sos/emergency',
        {
          rideId,
          incidentType: selectedIncident,
          description,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        }
      );

      if (response.data.success) {
        onSuccess('Emergency alert sent! Support team notified.');
        // Fetch active incidents
        await fetchActiveIncidents();
        // Reset form
        setSelectedIncident(null);
        setDescription('');
        setUploadedFiles([]);
      }
    } catch (error) {
      setIsAlertActive(false);
      onError(error.response?.data?.message || 'Failed to send SOS alert');
    }
  };

  /**
   * Upload incident evidence
   */
  const handleUploadEvidence = async (e) => {
    const files = Array.from(e.target.files);

    for (const file of files) {
      try {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', file.type.startsWith('audio') ? 'audio' : 'image');

        const response = await axios.post(
          `/api/ridesharing/phase2/sos/upload-evidence/${activeIncidents[0]?._id}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        if (response.data.success) {
          setUploadedFiles((prev) => [...prev, response.data.url]);
          onSuccess(`${file.name} uploaded successfully`);
        }
      } catch (error) {
        onError(`Failed to upload ${file.name}`);
      } finally {
        setIsUploading(false);
      }
    }
  };

  /**
   * Share live trip
   */
  const handleShareTrip = async () => {
    if (!shareEmail.trim() || !activeIncidents[0]) {
      onError('Please enter email and ensure SOS is active');
      return;
    }

    try {
      const response = await axios.post(
        '/api/ridesharing/phase2/sos/share-trip',
        {
          rideId,
          sharedWithEmail: shareEmail,
          duration: 24,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        }
      );

      if (response.data.success) {
        onSuccess('Live trip shared! Link sent to email.');
        setShareEmail('');
      }
    } catch (error) {
      onError(error.response?.data?.message || 'Failed to share trip');
    }
  };

  /**
   * Fetch active incidents
   */
  const fetchActiveIncidents = async () => {
    try {
      const response = await axios.get('/api/ridesharing/phase2/sos/active', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });

      if (response.data.success) {
        setActiveIncidents(response.data.incidents);
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
    }
  };

  React.useEffect(() => {
    if (isAlertActive) {
      fetchActiveIncidents();
      const interval = setInterval(fetchActiveIncidents, 10000); // Refresh every 10s
      return () => clearInterval(interval);
    }
  }, [isAlertActive]);

  return (
    <div className="sos-emergency-container">
      {/* Emergency Alert Panel */}
      {!isAlertActive ? (
        <div className="sos-alert-form">
          <h2>🚨 Emergency SOS</h2>
          <p className="sos-subtitle">Report a safety concern immediately</p>

          {/* Incident Type Selection */}
          <div className="incident-types">
            {incidentTypes.map((type) => (
              <button
                key={type.value}
                className={`incident-btn ${selectedIncident === type.value ? 'active' : ''}`}
                onClick={() => setSelectedIncident(type.value)}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Description */}
          <textarea
            className="description-input"
            placeholder="Describe what's happening..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="4"
          />

          {/* Send SOS Button */}
          <button
            className="send-sos-btn"
            onClick={handleSendSOS}
            disabled={!selectedIncident || !description.trim()}
          >
            Send SOS Alert
          </button>

          <p className="sos-note">
            ⚠️ Your location and ride details will be shared with emergency contacts and support.
          </p>
        </div>
      ) : (
        /* Active SOS Panel */
        <div className="sos-active-panel">
          <div className="sos-status">
            <h2>🚨 SOS ACTIVE</h2>
            <p className="status-text">Emergency alert sent to support team and contacts</p>
          </div>

          {/* Active Incidents */}
          {activeIncidents.length > 0 && (
            <div className="active-incidents">
              {activeIncidents.map((incident) => (
                <div key={incident._id} className="incident-card">
                  <div className="incident-header">
                    <span className="incident-type">{incident.incidentType}</span>
                    <span className={`incident-status ${incident.status}`}>{incident.status}</span>
                  </div>
                  <p className="incident-description">{incident.description}</p>
                  <p className="incident-time">{new Date(incident.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}

          {/* Upload Evidence */}
          <div className="upload-section">
            <h3>Upload Evidence</h3>
            <div className="upload-area">
              <input
                type="file"
                id="evidence-upload"
                multiple
                accept="image/*,audio/*"
                onChange={handleUploadEvidence}
                disabled={isUploading}
              />
              <label htmlFor="evidence-upload" className="upload-label">
                {isUploading ? 'Uploading...' : '📸 📹 📝 Upload Images/Audio/Videos'}
              </label>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="uploaded-files">
                <h4>Uploaded Files:</h4>
                {uploadedFiles.map((url, idx) => (
                  <p key={idx} className="file-item">
                    ✓ File {idx + 1}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Share Live Trip */}
          <div className="share-section">
            <h3>Share Live Location</h3>
            <div className="share-form">
              <input
                type="email"
                placeholder="Enter email to share with"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
              />
              <button onClick={handleShareTrip} className="share-btn">
                Share Live Trip
              </button>
            </div>
          </div>

          {/* Close SOS */}
          <button
            className="close-sos-btn"
            onClick={() => {
              setIsAlertActive(false);
              setSelectedIncident(null);
              setDescription('');
            }}
          >
            Close SOS (When Safe)
          </button>
        </div>
      )}
    </div>
  );
};

export default SOSEmergency;
