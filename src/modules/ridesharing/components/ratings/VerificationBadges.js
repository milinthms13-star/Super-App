/**
 * VerificationBadges.js
 * Display verification badges and verification status
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VerificationBadges.css';

const VerificationBadges = ({ userId, userType = 'driver' }) => {
  const [badges, setBadges] = useState([]);
  const [trustScore, setTrustScore] = useState(null);
  const [documentExpiry, setDocumentExpiry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState(null);

  useEffect(() => {
    fetchVerificationData();
  }, [userId, userType]);

  /**
   * Fetch all verification data
   */
  const fetchVerificationData = async () => {
    try {
      setLoading(true);

      // Fetch badges
      const badgeRes = await axios.get('/api/ridesharing/phase2/verification/badges', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });

      if (badgeRes.data.success) {
        setBadges(badgeRes.data.badges);
      }

      // Fetch trust score if rider
      if (userType === 'rider') {
        const trustRes = await axios.get('/api/ridesharing/phase2/verification/trust-score', {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });

        if (trustRes.data.success) {
          setTrustScore(trustRes.data);
        }
      }

      // Fetch document expiry if driver
      if (userType === 'driver') {
        const expiryRes = await axios.get('/api/ridesharing/phase2/verification/document-expiry', {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });

        if (expiryRes.data.success) {
          setDocumentExpiry(expiryRes.data.expiryAlerts);
        }
      }
    } catch (error) {
      console.error('Error fetching verification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const badgeDetails = {
    verified: {
      icon: '✓',
      name: 'Verified',
      description: 'All documents verified',
      color: '#4CAF50',
    },
    verified_rider: {
      icon: '✓',
      name: 'Verified Rider',
      description: 'Phone & email verified',
      color: '#4CAF50',
    },
    super_driver: {
      icon: '⭐',
      name: 'Super Driver',
      description: '500+ rides, 4.8+ rating',
      color: '#FFC107',
    },
    top_rated: {
      icon: '👑',
      name: 'Top Rated',
      description: '4.8+ rating, 100+ rides',
      color: '#FFC107',
    },
    trusted: {
      icon: '⭐',
      name: 'Trusted',
      description: 'Trusted rider with 50+ rides',
      color: '#FFC107',
    },
    green_driver: {
      icon: '🌱',
      name: 'Eco-Friendly',
      description: 'Electric or hybrid vehicle',
      color: '#8BC34A',
    },
    blue_tick: {
      icon: '✓',
      name: 'Blue Tick',
      description: 'Highly trusted member',
      color: '#2196F3',
    },
  };

  if (loading) {
    return (
      <div className="verification-container">
        <div className="loading">Loading verification info...</div>
      </div>
    );
  }

  return (
    <div className="verification-container">
      {/* Badges Section */}
      <div className="badges-section">
        <h3>Badges & Certifications</h3>

        {badges.length > 0 ? (
          <div className="badges-grid">
            {badges.map((badge) => {
              const details = badgeDetails[badge.badgeType] || {};
              return (
                <div key={badge._id} className="badge-card">
                  <div className="badge-icon" style={{ color: details.color }}>
                    {details.icon}
                  </div>
                  <h4>{details.name}</h4>
                  <p>{details.description}</p>
                  <span className="badge-date">
                    {new Date(badge.awardedAt).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="no-badges">No badges yet. Complete verification to earn badges!</p>
        )}
      </div>

      {/* Trust Score Section (Rider) */}
      {trustScore && (
        <div className="trust-score-section">
          <div className="trust-card">
            <h3>Trust Score</h3>
            <div className="score-display">
              <div className="score-number">{trustScore.trustScore}</div>
              <div className="score-bar">
                <div
                  className="score-fill"
                  style={{
                    width: `${trustScore.trustScore}%`,
                    backgroundColor: getTrustColor(trustScore.trustScore),
                  }}
                />
              </div>
            </div>
            <p className="trust-level">{trustScore.trustLevel}</p>
            <p className="trust-description">
              Your trust level helps drivers and riders feel confident when matching with you.
            </p>
          </div>
        </div>
      )}

      {/* Document Expiry Section (Driver) */}
      {documentExpiry.length > 0 && (
        <div className="document-expiry-section">
          <button
            className="section-toggle"
            onClick={() =>
              setExpandedSection(expandedSection === 'expiry' ? null : 'expiry')
            }
          >
            <span>⚠️ Document Expiry Alerts</span>
            <span>{expandedSection === 'expiry' ? '▼' : '▶'}</span>
          </button>

          {expandedSection === 'expiry' && (
            <div className="expiry-list">
              {documentExpiry.map((alert, idx) => (
                <div
                  key={idx}
                  className={`expiry-item ${alert.expired ? 'expired' : 'warning'}`}
                >
                  <div className="expiry-header">
                    <h4>{alert.document}</h4>
                    <span className={`expiry-status ${alert.expired ? 'expired' : 'warning'}`}>
                      {alert.expired ? '❌ Expired' : `⚠️ ${alert.daysRemaining} days left`}
                    </span>
                  </div>
                  <p className="expiry-date">
                    Expires: {new Date(alert.expiryDate).toLocaleDateString()}
                  </p>
                  <button className="renew-btn">Renew Now</button>
                </div>
              ))}
            </div>
          )}

          {documentExpiry.some((alert) => alert.expired) && (
            <div className="urgent-notice">
              ⚠️ You have expired documents. Please update them to continue accepting rides.
            </div>
          )}
        </div>
      )}

      {/* Verification Checklist */}
      <div className="verification-checklist">
        <h3>Verification Checklist</h3>
        <div className="checklist-items">
          {userType === 'driver' ? (
            <>
              <div className="checklist-item">
                <input type="checkbox" defaultChecked disabled />
                <label>Phone verification</label>
              </div>
              <div className="checklist-item">
                <input type="checkbox" defaultChecked disabled />
                <label>Email verification</label>
              </div>
              <div className="checklist-item">
                <input type="checkbox" defaultChecked disabled />
                <label>Driving license verification</label>
              </div>
              <div className="checklist-item">
                <input type="checkbox" defaultChecked disabled />
                <label>Vehicle registration verification</label>
              </div>
              <div className="checklist-item">
                <input type="checkbox" defaultChecked disabled />
                <label>Background check</label>
              </div>
            </>
          ) : (
            <>
              <div className="checklist-item">
                <input type="checkbox" defaultChecked disabled />
                <label>Phone verification</label>
              </div>
              <div className="checklist-item">
                <input type="checkbox" defaultChecked disabled />
                <label>Email verification</label>
              </div>
              <div className="checklist-item">
                <input type="checkbox" disabled />
                <label>Emergency contact verified</label>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Refresh Button */}
      <button className="refresh-btn" onClick={fetchVerificationData}>
        🔄 Refresh Verification Status
      </button>
    </div>
  );
};

/**
 * Helper: Get color based on trust score
 */
function getTrustColor(score) {
  if (score >= 80) return '#4CAF50';
  if (score >= 60) return '#FFC107';
  if (score >= 40) return '#FF9800';
  return '#F44336';
}

export default VerificationBadges;
