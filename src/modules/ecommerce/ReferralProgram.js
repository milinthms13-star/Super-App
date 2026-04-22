import React, { useState, useEffect } from 'react';
import './ReferralProgram.css';

const ReferralProgram = ({ userEmail, userName }) => {
  const [referral, setReferral] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchReferralData();
  }, [userEmail]);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [referralRes, statsRes] = await Promise.all([
        fetch('/api/referral/my-referral', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/referral/statistics', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (referralRes.ok) {
        const data = await referralRes.json();
        setReferral(data.data);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStatistics(data.data);
      }
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    if (referral?.referralCode) {
      navigator.clipboard.writeText(referral.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleReferralStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/referral/toggle-status', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setReferral(data.data);
      }
    } catch (error) {
      console.error('Error toggling referral status:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading referral program...</div>;
  }

  return (
    <div className="referral-program-container">
      <div className="referral-header">
        <h1>💰 Referral Program</h1>
        <p>Earn rewards by sharing with friends</p>
      </div>

      <div className="referral-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'referrals' ? 'active' : ''}`}
          onClick={() => setActiveTab('referrals')}
        >
          My Referrals
        </button>
        <button
          className={`tab ${activeTab === 'rewards' ? 'active' : ''}`}
          onClick={() => setActiveTab('rewards')}
        >
          Rewards
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="overview-tab">
          <div className="referral-code-section">
            <h3>Your Referral Code</h3>
            <div className="code-display">
              <input
                type="text"
                value={referral?.referralCode || ''}
                readOnly
                className="code-input"
              />
              <button
                className="copy-btn"
                onClick={copyReferralCode}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p className="code-instruction">Share this code with your friends to earn rewards</p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <h4>Total Referrals</h4>
              <p className="stat-value">{statistics?.totalReferrals || 0}</p>
            </div>
            <div className="stat-card">
              <h4>Successful Referrals</h4>
              <p className="stat-value">{statistics?.successfulReferrals || 0}</p>
            </div>
            <div className="stat-card">
              <h4>Conversion Rate</h4>
              <p className="stat-value">{statistics?.conversionRate || '0'}%</p>
            </div>
            <div className="stat-card">
              <h4>Total Rewards</h4>
              <p className="stat-value">₹{statistics?.totalRewardsEarned || 0}</p>
            </div>
          </div>

          <div className="tier-section">
            <h3>Your Tier: {referral?.tier}</h3>
            <p>Complete more referrals to unlock higher tiers and better rewards</p>
            <div className="tier-benefits">
              <div className="benefit">
                <span>🎁 Extra Reward:</span>
                <span>+{referral?.tierBenefits?.rewardPercentage || 0}%</span>
              </div>
              {referral?.tierBenefits?.exclusiveOffers && (
                <div className="benefit">
                  <span>🌟 Exclusive Offers:</span>
                  <span>Available</span>
                </div>
              )}
              {referral?.tierBenefits?.prioritySupport && (
                <div className="benefit">
                  <span>📞 Priority Support:</span>
                  <span>Available</span>
                </div>
              )}
            </div>
          </div>

          <button
            className={`status-btn ${referral?.status === 'Active' ? 'pause' : 'resume'}`}
            onClick={toggleReferralStatus}
          >
            {referral?.status === 'Active' ? '⏸ Pause Program' : '▶ Resume Program'}
          </button>
        </div>
      )}

      {activeTab === 'referrals' && (
        <div className="referrals-tab">
          <h3>Referrals ({statistics?.totalReferrals || 0})</h3>
          {statistics?.referredUsers && statistics.referredUsers.length > 0 ? (
            <div className="referrals-list">
              {statistics.referredUsers.map((user, idx) => (
                <div key={idx} className="referral-item">
                  <div className="referral-info">
                    <p className="referral-name">{user.name}</p>
                    <p className="referral-email">{user.email}</p>
                    <p className="referral-date">
                      Referred: {new Date(user.referredAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="referral-status">
                    <span className={`status-badge ${user.conversionStatus}`}>
                      {user.conversionStatus}
                    </span>
                    <span className={`reward-badge ${user.rewardStatus}`}>
                      {user.rewardStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No referrals yet. Share your code to get started!</p>
          )}
        </div>
      )}

      {activeTab === 'rewards' && (
        <div className="rewards-tab">
          <h3>Your Rewards</h3>
          <div className="rewards-summary">
            <div className="reward-card large">
              <h4>Total Earned</h4>
              <p className="reward-amount">₹{statistics?.totalRewardsEarned || 0}</p>
            </div>
            <div className="reward-card">
              <h4>Reward Type</h4>
              <p>{referral?.rewardType || 'Wallet Credits'}</p>
            </div>
            <div className="reward-card">
              <h4>Per Referral</h4>
              <p>₹{referral?.rewardAmount || 0}</p>
            </div>
          </div>
          <p className="rewards-note">
            Rewards are automatically credited to your wallet when referred friends complete their first purchase.
          </p>
        </div>
      )}
    </div>
  );
};

export default ReferralProgram;
