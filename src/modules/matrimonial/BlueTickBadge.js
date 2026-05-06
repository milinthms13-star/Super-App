import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../../contexts/AppContext';
import { API_BASE_URL } from './constants';

const BlueTickBadge = ({ profileId, onUpdate }) => {
  const { currentUser } = useApp();
  const [tickStatus, setTickStatus] = useState(null);
  const [eligibilityScore, setEligibilityScore] = useState(0);
  const [requirementsMet, setRequirementsMet] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (profileId) {
      checkBlueTickStatus();
    }
  }, [profileId]);

  const checkBlueTickStatus = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/matrimonial/blue-tick/status`,
        {
          params: { profileId },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      setTickStatus(response.data.status);
      setEligibilityScore(response.data.eligibilityScore || 0);
      setRequirementsMet(response.data.requirementsMet || {});
      setMessage('');
    } catch (error) {
      setMessage(`✗ Failed to check status: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const requestManualReview = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/matrimonial/blue-tick/request`,
        { profileId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      setMessage('✓ Manual review requested. Admin will review shortly.');
      setTickStatus(response.data.status);
      if (onUpdate) onUpdate(response.data);
    } catch (error) {
      setMessage(`✗ Request failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (tickStatus) {
      case 'approved':
        return '#4CAF50';
      case 'pending_review':
        return '#FF9800';
      case 'rejected':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const getStatusIcon = () => {
    switch (tickStatus) {
      case 'approved':
        return '✓';
      case 'pending_review':
        return '⏳';
      case 'rejected':
        return '✗';
      default:
        return '?';
    }
  };

  const getMissingRequirements = () => {
    const missing = [];
    if (!requirementsMet.kycVerified) missing.push('KYC not verified');
    if (!requirementsMet.noFraudReports) missing.push('Has fraud reports');
    if (!requirementsMet.activeProfile) missing.push('Profile not active');
    if (!requirementsMet.completeProfile) missing.push('Complete your profile');
    if (!requirementsMet.profileAge3Months) missing.push('Profile too new (need 3+ months)');
    if (!requirementsMet.noUserComplaints) missing.push('Has user complaints');
    if (!requirementsMet.passwordSecurityPassed) missing.push('Update security settings');
    return missing;
  };

  const missingRequirements = getMissingRequirements();

  return (
    <div className="blue-tick-container">
      <div className="blue-tick-header">
        <h3>Profile Verification Badge</h3>
        {tickStatus === 'approved' && (
          <span className="blue-tick-icon" style={{ color: getStatusColor() }}>
            ✓ VERIFIED
          </span>
        )}
      </div>

      {message && (
        <div className={`message ${message.startsWith('✓') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="eligibility-score">
        <div className="score-bar">
          <div
            className="score-fill"
            style={{
              width: `${Math.min(eligibilityScore, 100)}%`,
              backgroundColor:
                eligibilityScore >= 50
                  ? '#4CAF50'
                  : eligibilityScore >= 30
                    ? '#FF9800'
                    : '#F44336',
            }}
          />
        </div>
        <span className="score-text">
          Eligibility: {eligibilityScore}/100 {
            eligibilityScore >= 50 ? '✓ Eligible' : '⚠ Not yet eligible'
          }
        </span>
      </div>

      <div className="tick-status-display">
        <div className={`status-badge status-${tickStatus}`}>
          <span className="status-icon" style={{ color: getStatusColor() }}>
            {getStatusIcon()}
          </span>
          <span className="status-text">
            {tickStatus === 'approved' && 'Verified Badge Active'}
            {tickStatus === 'pending_review' && 'Under Review'}
            {tickStatus === 'rejected' && 'Not Approved'}
            {tickStatus === 'not_eligible' && 'Not Eligible Yet'}
          </span>
        </div>

        {tickStatus === 'approved' && (
          <div className="approved-info">
            <p>🎉 Your profile has been verified!</p>
            <p>Your blue tick badge will appear on your profile.</p>
          </div>
        )}

        {tickStatus === 'pending_review' && (
          <div className="pending-info">
            <p>⏳ Your profile is under admin review.</p>
            <p>You'll be notified once the review is complete.</p>
          </div>
        )}

        {tickStatus === 'not_eligible' && missingRequirements.length > 0 && (
          <div className="ineligible-info">
            <p>⚠ Complete these to become eligible:</p>
            <ul className="requirements-list">
              {missingRequirements.map((req, idx) => (
                <li key={idx}>• {req}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="requirements-section">
        <button
          className="btn btn-outline toggle-details"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? '▼ Hide Requirements' : '▶ Show Requirements'}
        </button>

        {showDetails && (
          <div className="requirements-detail">
            <h4>Eligibility Criteria (8-Point Checklist)</h4>
            <div className="requirement-item">
              <span className={requirementsMet.kycVerified ? 'met' : 'unmet'}>
                {requirementsMet.kycVerified ? '✓' : '✗'} KYC Verified (40%)
              </span>
              <p>Complete identity verification with government ID</p>
            </div>

            <div className="requirement-item">
              <span className={requirementsMet.kyc6MonthsOld ? 'met' : 'unmet'}>
                {requirementsMet.kyc6MonthsOld ? '✓' : '✗'} KYC 6+ Months Old (20%)
              </span>
              <p>Your KYC must be at least 6 months old</p>
            </div>

            <div className="requirement-item">
              <span className={requirementsMet.noFraudReports ? 'met' : 'unmet'}>
                {requirementsMet.noFraudReports ? '✓' : '✗'} No Fraud Reports (20%)
              </span>
              <p>Your account must have no fraud flags</p>
            </div>

            <div className="requirement-item">
              <span className={requirementsMet.activeProfile ? 'met' : 'unmet'}>
                {requirementsMet.activeProfile ? '✓' : '✗'} Active Profile (15%)
              </span>
              <p>Keep your profile updated and active</p>
            </div>

            <div className="requirement-item">
              <span className={requirementsMet.completeProfile ? 'met' : 'unmet'}>
                {requirementsMet.completeProfile ? '✓' : '✗'} Profile 100% Complete (10%)
              </span>
              <p>Fill all profile sections</p>
            </div>

            <div className="requirement-item">
              <span className={requirementsMet.profileAge3Months ? 'met' : 'unmet'}>
                {requirementsMet.profileAge3Months ? '✓' : '✗'} Profile 3+ Months Old (10%)
              </span>
              <p>Your profile must exist for at least 3 months</p>
            </div>

            <div className="requirement-item">
              <span className={requirementsMet.noUserComplaints ? 'met' : 'unmet'}>
                {requirementsMet.noUserComplaints ? '✓' : '✗'} No User Complaints (5%)
              </span>
              <p>No complaints from other users</p>
            </div>

            <div className="requirement-item">
              <span className={requirementsMet.passwordSecurityPassed ? 'met' : 'unmet'}>
                {requirementsMet.passwordSecurityPassed ? '✓' : '✗'} Security Check (5%)
              </span>
              <p>Use a strong password and enable 2FA</p>
            </div>
          </div>
        )}
      </div>

      <div className="tick-actions">
        <button
          className="btn btn-secondary"
          onClick={checkBlueTickStatus}
          disabled={loading}
        >
          {loading ? 'Checking...' : 'Refresh Status'}
        </button>

        {tickStatus === 'not_eligible' && eligibilityScore >= 40 && (
          <button
            className="btn btn-primary"
            onClick={requestManualReview}
            disabled={loading}
          >
            {loading ? 'Requesting...' : 'Request Manual Review'}
          </button>
        )}
      </div>

      <div className="tick-info">
        <h4>What's a Blue Tick?</h4>
        <ul>
          <li>Shows your profile is verified and authentic</li>
          <li>Builds trust with other users</li>
          <li>Prioritized in search results</li>
          <li>Premium badge on your profile</li>
          <li>Auto-renews yearly</li>
        </ul>
      </div>
    </div>
  );
};

export default BlueTickBadge;
