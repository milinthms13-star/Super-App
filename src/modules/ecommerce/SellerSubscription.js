/**
 * Seller Subscription Management Component
 * Allows sellers to view, upgrade, and manage their subscription plans
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../../contexts/AppContext';
import { API_BASE_URL } from '../../utils/api';
import '../../styles/EcommerceSubscription.css';

const SellerSubscription = () => {
  const { currentUser } = useApp();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState('monthly');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (currentUser) {
      fetchSubscriptionData();
    }
  }, [currentUser]);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [plansRes, statusRes, historyRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/ecommerce/subscription/plans`),
        axios.get(`${API_BASE_URL}/ecommerce/subscription/status`, { headers }),
        axios.get(`${API_BASE_URL}/ecommerce/subscription/payment-history`, { headers }),
      ]);

      setPlans(plansRes.data.plans || []);
      setCurrentSubscription(statusRes.data);
      setPaymentHistory(historyRes.data.paymentHistory || []);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeClick = (plan) => {
    setSelectedPlan(plan);
    setShowUpgradeModal(true);
  };

  const handleUpgrade = async () => {
    try {
      const token = localStorage.getItem('authToken');

      // In a real implementation, integrate with payment gateway
      const paymentDetails = {
        method: 'razorpay',
        transactionId: `TXN${Date.now()}`,
      };

      const response = await axios.post(
        `${API_BASE_URL}/ecommerce/subscription/upgrade`,
        {
          planSlug: selectedPlan.slug,
          duration: selectedDuration,
          paymentDetails,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        alert('Subscription upgraded successfully!');
        setShowUpgradeModal(false);
        fetchSubscriptionData();
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      alert('Failed to upgrade subscription. Please try again.');
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const reason = prompt('Please tell us why you are cancelling (optional):') || '';

      const response = await axios.post(
        `${API_BASE_URL}/ecommerce/subscription/cancel`,
        { reason },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        alert(response.data.message);
        fetchSubscriptionData();
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Failed to cancel subscription. Please try again.');
    }
  };

  const toggleAutoRenew = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `${API_BASE_URL}/ecommerce/subscription/toggle-auto-renew`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        alert(response.data.message);
        fetchSubscriptionData();
      }
    } catch (error) {
      console.error('Error toggling auto-renew:', error);
      alert('Failed to toggle auto-renew. Please try again.');
    }
  };

  const getPrice = (plan, duration) => {
    if (plan.pricing[duration]) {
      const pricing = plan.pricing[duration];
      if (pricing.discount > 0) {
        const discounted = pricing.amount - (pricing.amount * pricing.discount) / 100;
        return (
          <>
            <span className="original-price">₹{pricing.amount}</span>
            <span className="discounted-price">₹{discounted}</span>
            <span className="discount-badge">{pricing.discount}% OFF</span>
          </>
        );
      }
      return <span>₹{pricing.amount}</span>;
    }
    return <span>-</span>;
  };

  const getDurationLabel = (duration) => {
    const labels = {
      monthly: 'month',
      quarterly: '3 months',
      yearly: 'year',
    };
    return labels[duration] || duration;
  };

  if (loading) {
    return (
      <div className="subscription-loading">
        <div className="spinner"></div>
        <p>Loading subscription details...</p>
      </div>
    );
  }

  return (
    <div className="seller-subscription">
      <div className="subscription-header">
        <h1>Subscription Management</h1>
        <p>Manage your seller subscription and unlock premium features</p>
      </div>

      <div className="subscription-tabs">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'plans' ? 'active' : ''}
          onClick={() => setActiveTab('plans')}
        >
          Available Plans
        </button>
        <button
          className={activeTab === 'history' ? 'active' : ''}
          onClick={() => setActiveTab('history')}
        >
          Payment History
        </button>
      </div>

      {activeTab === 'overview' && currentSubscription && (
        <div className="subscription-overview">
          <div className="current-plan-card">
            <div className="plan-header">
              <h2>Current Plan: {currentSubscription.plan?.name || 'Free'}</h2>
              <span className={`status-badge ${currentSubscription.subscription?.status}`}>
                {currentSubscription.subscription?.status}
              </span>
            </div>

            <div className="plan-details">
              <div className="detail-item">
                <span className="label">Commission Rate:</span>
                <span className="value">{currentSubscription.plan?.commission?.defaultRate}%</span>
              </div>
              <div className="detail-item">
                <span className="label">Product Limit:</span>
                <span className="value">
                  {currentSubscription.currentProductCount} / {currentSubscription.productLimit === -1 ? '∞' : currentSubscription.productLimit}
                </span>
              </div>
              {currentSubscription.daysRemaining && (
                <div className="detail-item">
                  <span className="label">Days Remaining:</span>
                  <span className="value">{currentSubscription.daysRemaining} days</span>
                </div>
              )}
              <div className="detail-item">
                <span className="label">Auto-Renew:</span>
                <span className="value">
                  {currentSubscription.subscription?.autoRenew ? 'Enabled' : 'Disabled'}
                  <button className="toggle-btn" onClick={toggleAutoRenew}>
                    Toggle
                  </button>
                </span>
              </div>
            </div>

            {currentSubscription.isExpiringSoon && (
              <div className="expiry-warning">
                ⚠️ Your subscription is expiring soon! Renew now to continue enjoying premium features.
              </div>
            )}

            <div className="plan-actions">
              {currentSubscription.subscription?.plan !== 'enterprise' && (
                <button
                  className="btn btn-primary"
                  onClick={() => setActiveTab('plans')}
                >
                  Upgrade Plan
                </button>
              )}
              {currentSubscription.subscription?.plan !== 'free' && (
                <button
                  className="btn btn-danger"
                  onClick={handleCancelSubscription}
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>

          <div className="features-summary">
            <h3>Your Plan Features</h3>
            <div className="features-grid">
              {currentSubscription.features && Object.entries(currentSubscription.features).map(([key, value]) => {
                if (typeof value === 'object') return null;
                return (
                  <div key={key} className="feature-item">
                    <span className="feature-icon">{value ? '✓' : '✗'}</span>
                    <span className="feature-name">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="plans-section">
          <div className="duration-selector">
            <label>Billing Cycle:</label>
            <select
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(e.target.value)}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly (Save 10%)</option>
              <option value="yearly">Yearly (Save 20%)</option>
            </select>
          </div>

          <div className="plans-grid">
            {plans.map((plan) => (
              <div
                key={plan.slug}
                className={`plan-card ${plan.isRecommended ? 'recommended' : ''} ${
                  currentSubscription?.subscription?.plan === plan.slug ? 'current' : ''
                }`}
              >
                {plan.isRecommended && <div className="recommended-badge">Most Popular</div>}
                {currentSubscription?.subscription?.plan === plan.slug && (
                  <div className="current-badge">Current Plan</div>
                )}

                <div className="plan-name">{plan.name}</div>
                <div className="plan-tagline">{plan.tagline}</div>
                <div className="plan-price">
                  {getPrice(plan, selectedDuration)}
                  <span className="price-period">/ {getDurationLabel(selectedDuration)}</span>
                </div>
                <div className="plan-description">{plan.description}</div>

                <div className="plan-features">
                  <h4>Features Include:</h4>
                  <ul>
                    {plan.benefits?.map((benefit, idx) => (
                      <li key={idx}>
                        <span className="benefit-icon">{benefit.icon}</span>
                        <div>
                          <strong>{benefit.title}</strong>
                          <p>{benefit.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  className={`btn ${
                    currentSubscription?.subscription?.plan === plan.slug
                      ? 'btn-secondary'
                      : 'btn-primary'
                  }`}
                  onClick={() => handleUpgradeClick(plan)}
                  disabled={currentSubscription?.subscription?.plan === plan.slug}
                >
                  {currentSubscription?.subscription?.plan === plan.slug
                    ? 'Current Plan'
                    : plan.slug === 'free'
                    ? 'Downgrade'
                    : 'Upgrade'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="payment-history">
          <h2>Payment History</h2>
          {paymentHistory.length === 0 ? (
            <p className="no-history">No payment history available</p>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Duration</th>
                  <th>Method</th>
                  <th>Transaction ID</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment, idx) => (
                  <tr key={idx}>
                    <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                    <td>₹{payment.amount}</td>
                    <td>{payment.planDuration}</td>
                    <td>{payment.paymentMethod}</td>
                    <td>{payment.transactionId}</td>
                    <td>
                      <span className={`status-badge ${payment.status}`}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showUpgradeModal && selectedPlan && (
        <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upgrade to {selectedPlan.name}</h2>
              <button className="close-btn" onClick={() => setShowUpgradeModal(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="upgrade-summary">
                <div className="summary-item">
                  <span>Plan:</span>
                  <strong>{selectedPlan.name}</strong>
                </div>
                <div className="summary-item">
                  <span>Duration:</span>
                  <strong>{getDurationLabel(selectedDuration)}</strong>
                </div>
                <div className="summary-item">
                  <span>Amount:</span>
                  <strong className="price-text">
                    {getPrice(selectedPlan, selectedDuration)}
                  </strong>
                </div>
                <div className="summary-item">
                  <span>Commission Rate:</span>
                  <strong>{selectedPlan.commission.defaultRate}%</strong>
                </div>
              </div>

              <div className="payment-info">
                <p>Payment will be processed securely through our payment gateway.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowUpgradeModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleUpgrade}>
                Confirm & Pay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerSubscription;
