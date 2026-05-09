/**
 * RouteSafety.js
 * Route safety checking and unsafe area detection
 */

import React, { useState } from 'react';
import axios from 'axios';
import './RouteSafety.css';

const RouteSafety = ({ pickupLat, pickupLng, dropoffLat, dropoffLng, onSafetyUpdate }) => {
  const [safetyReport, setSafetyReport] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [unsafeReportForm, setUnsafeReportForm] = useState({
    latitude: '',
    longitude: '',
    description: '',
    severity: 'medium',
  });
  const [reportingUnsafeArea, setReportingUnsafeArea] = useState(false);

  /**
   * Check route safety
   */
  const handleCheckRouteSafety = async () => {
    if (!pickupLat || !dropoffLat) {
      alert('Please provide pickup and dropoff locations');
      return;
    }

    try {
      setIsChecking(true);
      const response = await axios.post(
        '/api/ridesharing/phase2/safety/check-route',
        {
          pickupLat: parseFloat(pickupLat),
          pickupLng: parseFloat(pickupLng),
          dropoffLat: parseFloat(dropoffLat),
          dropoffLng: parseFloat(dropoffLng),
          time: new Date().getHours() >= 18 || new Date().getHours() < 6 ? 'night' : 'day',
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        }
      );

      if (response.data.success) {
        setSafetyReport(response.data.safetyReport);
        if (onSafetyUpdate) {
          onSafetyUpdate(response.data);
        }
      }
    } catch (error) {
      console.error('Error checking route safety:', error);
      alert(error.response?.data?.message || 'Failed to check route safety');
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * Report unsafe area
   */
  const handleReportUnsafeArea = async () => {
    if (!unsafeReportForm.description.trim()) {
      alert('Please describe the unsafe area');
      return;
    }

    try {
      setReportingUnsafeArea(true);
      const response = await axios.post(
        '/api/ridesharing/phase2/safety/mark-unsafe-area',
        {
          latitude: parseFloat(unsafeReportForm.latitude) || pickupLat,
          longitude: parseFloat(unsafeReportForm.longitude) || pickupLng,
          description: unsafeReportForm.description,
          severity: unsafeReportForm.severity,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        }
      );

      if (response.data.success) {
        alert('Unsafe area reported. Thank you for keeping the community safe!');
        setUnsafeReportForm({
          latitude: '',
          longitude: '',
          description: '',
          severity: 'medium',
        });
      }
    } catch (error) {
      console.error('Error reporting unsafe area:', error);
      alert(error.response?.data?.message || 'Failed to report unsafe area');
    } finally {
      setReportingUnsafeArea(false);
    }
  };

  return (
    <div className="route-safety-container">
      {/* Check Route Safety Button */}
      <div className="check-route-section">
        <button
          className="check-safety-btn"
          onClick={handleCheckRouteSafety}
          disabled={isChecking || !pickupLat || !dropoffLat}
        >
          {isChecking ? 'Checking Route...' : '🛡️ Check Route Safety'}
        </button>
      </div>

      {/* Safety Report */}
      {safetyReport && (
        <div className="safety-report">
          {/* Safety Score */}
          <div className={`safety-score ${safetyReport.safeRoute ? 'safe' : 'caution'}`}>
            <div className="score-header">
              <span className="score-icon">
                {safetyReport.safeRoute ? '✓' : '⚠️'}
              </span>
              <div className="score-info">
                <h3>{safetyReport.safeRoute ? 'Safe Route' : 'Route Caution'}</h3>
                <p>Safety Score: {safetyReport.safetyScore}%</p>
              </div>
            </div>
          </div>

          {/* Risks */}
          {safetyReport.risks.length > 0 && (
            <div className="risks-section">
              <h4>Risks Identified</h4>
              {safetyReport.risks.map((risk, idx) => (
                <div key={idx} className={`risk-item severity-${risk.severity}`}>
                  <span className="risk-type">{risk.type}</span>
                  <p>{risk.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {safetyReport.recommendations.length > 0 && (
            <div className="recommendations-section">
              <h4>Recommendations</h4>
              {safetyReport.recommendations.map((rec, idx) => (
                <div key={idx} className="recommendation-item">
                  <span className="rec-type">{rec.type === 'tip' ? '💡' : '→'}</span>
                  <p>{rec.message || rec.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Report Unsafe Area Section */}
      <div className="report-unsafe-section">
        <h4>Report Unsafe Area</h4>
        <div className="unsafe-form">
          <input
            type="number"
            placeholder="Latitude (optional)"
            value={unsafeReportForm.latitude}
            onChange={(e) =>
              setUnsafeReportForm({ ...unsafeReportForm, latitude: e.target.value })
            }
            step="0.0001"
          />
          <input
            type="number"
            placeholder="Longitude (optional)"
            value={unsafeReportForm.longitude}
            onChange={(e) =>
              setUnsafeReportForm({ ...unsafeReportForm, longitude: e.target.value })
            }
            step="0.0001"
          />
          <textarea
            placeholder="Describe what makes this area unsafe..."
            value={unsafeReportForm.description}
            onChange={(e) =>
              setUnsafeReportForm({ ...unsafeReportForm, description: e.target.value })
            }
            rows="3"
          />
          <select
            value={unsafeReportForm.severity}
            onChange={(e) =>
              setUnsafeReportForm({ ...unsafeReportForm, severity: e.target.value })
            }
          >
            <option value="low">Low Severity</option>
            <option value="medium">Medium Severity</option>
            <option value="high">High Severity</option>
          </select>
          <button
            className="report-btn"
            onClick={handleReportUnsafeArea}
            disabled={reportingUnsafeArea}
          >
            {reportingUnsafeArea ? 'Reporting...' : 'Report Unsafe Area'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteSafety;
