/**
 * ReferralProgram.js
 * Referral program component with code sharing and bonus tracking
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ReferralProgram.css';

const ReferralProgram = () => {
  const [referralCode, setReferralCode] = useState('');
  const [stats, setStats] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showReferralList, setShowReferralList] = useState(false);
  const [copied, setCopied] = useState(false);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      const [codeRes, statsRes, dashRes] = await Promise.all([
        axios.get(
          `${API_BASE}/api/ridesharing/phase3/referral/code`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.get(
          `${API_BASE}/api/ridesharing/phase3/referral/stats`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.get(
          `${API_BASE}/api/ridesharing/phase3/referral/dashboard`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      ]);

      setReferralCode(codeRes.data.referralCode);
      setStats(statsRes.data.stats);
      setDashboard(dashRes.data);
    } catch (err) {
      console.error('Error fetching referral data:', err);
      setError('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const fetchReferralList = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/api/ridesharing/phase3/referral/list?limit=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReferrals(response.data.referrals || []);
    } catch (err) {
      console.error('Error fetching referral list:', err);
      setError('Failed to load referral list');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareCode = (platform) => {
    const shareMessage = dashboard?.shareMessage || `Join me on NilaHub! Use code ${referralCode}`;
    const shareUrl = dashboard?.referralLink || `https://nilahub.app/referral/${referralCode}`;

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`);
        break;
      case 'sms':
        window.open(`sms:?body=${encodeURIComponent(shareMessage)}`);
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareMessage)}`);
        break;
      case 'copy':
        handleCopyCode();
        break;
      default:
        break;
    }
  };

  const handleClaimBonus = async () => {
    try {
      const response = await axios.post(
        `${API_BASE}/api/ridesharing/phase3/referral/claim-bonus`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSuccessMessage(response.data.message);
        fetchReferralData();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to claim bonus');
    }
  };

  const handleViewReferrals = () => {
    setShowReferralList(!showReferralList);
    if (!showReferralList) {
      fetchReferralList();
    }
  };

  if (loading) {
    return <div className="referral-loading">Loading referral program...</div>;
  }

  return (
    <div className="referral-container">
      {/* Header */}
      <div className="referral-header">
        <h1>👥 Referral Program</h1>
        <p className="subtitle">Earn rewards by inviting friends</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}

      {/* Referral Code Card */}
      <div className="referral-code-card">
        <div className="code-content">
          <p className="code-label">Your Referral Code</p>
          <h2 className="referral-code">{referralCode}</h2>
          <p className="code-info">Share this code with friends</p>
        </div>
        <button className="btn btn-copy" onClick={handleCopyCode}>
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
      </div>

      {/* Share Section */}
      <div className="share-section">
        <h3>Share Your Code</h3>
        <div className="share-buttons">
          <button
            className="share-btn whatsapp"
            onClick={() => handleShareCode('whatsapp')}
            title="Share on WhatsApp"
          >
            💬 WhatsApp
          </button>
          <button
            className="share-btn sms"
            onClick={() => handleShareCode('sms')}
            title="Share via SMS"
          >
            💌 SMS
          </button>
          <button
            className="share-btn telegram"
            onClick={() => handleShareCode('telegram')}
            title="Share on Telegram"
          >
            ✈️ Telegram
          </button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="stats-section">
          <h3>📊 Your Performance</h3>
          <div className="stats-grid">
            <div className="stat-box">
              <p className="stat-number">{stats.totalReferrals}</p>
              <p className="stat-label">Total Referrals</p>
            </div>
            <div className="stat-box">
              <p className="stat-number">{stats.activeReferrals}</p>
              <p className="stat-label">Active Users</p>
            </div>
            <div className="stat-box">
              <p className="stat-number">{stats.conversionRate}</p>
              <p className="stat-label">Conversion Rate</p>
            </div>
            <div className="stat-box">
              <p className="stat-number">₹{stats.totalBonus}</p>
              <p className="stat-label">Total Earned</p>
            </div>
          </div>

          <div className="detailed-stats">
            <div className="detail-row">
              <span>Inactive Referrals:</span>
              <strong>{stats.inactiveReferrals}</strong>
            </div>
            <div className="detail-row">
              <span>Total Referral Rides:</span>
              <strong>{stats.totalRidesByReferrals}</strong>
            </div>
            <div className="detail-row">
              <span>Avg Rides per Referral:</span>
              <strong>{stats.avgRidesPerReferral}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Bonus Card */}
      {stats && stats.bonusBalance > 0 && (
        <div className="bonus-card">
          <div className="bonus-content">
            <p className="bonus-label">Pending Bonus</p>
            <h2 className="bonus-amount">₹{stats.bonusBalance}</h2>
            <p className="bonus-info">Ready to claim and use</p>
          </div>
          <button className="btn btn-claim" onClick={handleClaimBonus}>
            💰 Claim Now
          </button>
        </div>
      )}

      {/* How It Works */}
      <div className="how-it-works">
        <h3>🎯 How It Works</h3>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Share Your Code</h4>
              <p>Share your referral code with friends via WhatsApp, SMS, or Telegram</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Friend Joins</h4>
              <p>Your friend signs up using your code and gets ₹75 welcome bonus</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>You Get Bonus</h4>
              <p>You instantly earn ₹100 referral bonus and they get ₹75</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h4>Use Your Bonus</h4>
              <p>Use your earned bonus for rides or claim to your wallet</p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral List */}
      {showReferralList && (
        <div className="referral-list-section">
          <h3>
            👤 Your Referrals
            <button
              className="btn-close"
              onClick={() => setShowReferralList(false)}
            >
              ✕
            </button>
          </h3>

          {referrals.length === 0 ? (
            <p className="no-referrals">No referrals yet. Start sharing your code!</p>
          ) : (
            <div className="referral-list">
              {referrals.map((referral, idx) => (
                <div key={idx} className="referral-item">
                  <div className="referral-avatar">
                    {referral.userPhoto ? (
                      <img src={referral.userPhoto} alt={referral.userName} />
                    ) : (
                      <div className="default-avatar">
                        {referral.userName?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="referral-info">
                    <p className="referral-name">{referral.userName || 'User'}</p>
                    <p className="referral-date">
                      Joined {new Date(referral.joinDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="referral-stats">
                    <span className="rides">🚗 {referral.rides} rides</span>
                    <span className="bonus">💰 ₹{referral.bonusEarned}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleViewReferrals}
            style={{ marginTop: '16px', width: '100%' }}
          >
            Hide Referrals
          </button>
        </div>
      )}

      {/* View Referrals Button */}
      {!showReferralList && (
        <button
          className="btn btn-secondary"
          onClick={handleViewReferrals}
          style={{ width: '100%', marginTop: '16px' }}
        >
          👁️ View My Referrals ({stats?.totalReferrals || 0})
        </button>
      )}

      {/* Terms */}
      <div className="terms-section">
        <h4>📋 Terms & Conditions</h4>
        <ul>
          <li>Both referrer and referee get rewards for successful sign-up</li>
          <li>Referee must complete at least one ride to be counted as active</li>
          <li>Bonus is credited within 24 hours of activation</li>
          <li>Bonus can be used only for ride payments</li>
          <li>No limit on number of referrals</li>
        </ul>
      </div>
    </div>
  );
};

export default ReferralProgram;
