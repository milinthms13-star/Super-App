/**
 * SubscriptionPlans.jsx
 * Browse and compare subscription plans
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SubscriptionPlans.css';

const SubscriptionPlans = ({ userId }) => {
  const [plans, setPlans] = useState([]);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');

  useEffect(() => {
    fetchPlans();
    fetchActiveSubscription();
  }, [userId]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/subscriptions/plans', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPlans(response.data.data || []);
    } catch (err) {
      setError('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveSubscription = async () => {
    try {
      const response = await axios.get('/api/subscriptions/active', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setActiveSubscription(response.data.data);
    } catch (err) {
      // No active subscription
    }
  };

  const handleSubscribe = async (planId) => {
    try {
      await axios.post(
        '/api/subscriptions/subscribe',
        { planId, billingCycle },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      setSuccess('Subscription successful!');
      fetchActiveSubscription();
    } catch (err) {
      setError(err.response?.data?.error || 'Subscription failed');
    }
  };

  const handleUpgrade = async (newPlanId) => {
    try {
      await axios.post(
        '/api/subscriptions/upgrade',
        { newPlanId },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      setSuccess('Upgraded successfully!');
      fetchActiveSubscription();
    } catch (err) {
      setError(err.response?.data?.error || 'Upgrade failed');
    }
  };

  if (loading) return <div className="loading">Loading subscription plans...</div>;

  return (
    <div className="subscription-plans">
      <div className="plans-header">
        <h2>Subscription Plans</h2>
        <p>Choose the perfect plan for your needs</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {activeSubscription && (
        <div className="current-subscription">
          <h3>Current Plan</h3>
          <p>
            You are subscribed to <strong>{activeSubscription.planName}</strong> ({activeSubscription.billingCycle})
          </p>
          <p className="renewal-date">
            Renews on {new Date(activeSubscription.renewalDate).toLocaleDateString()}
          </p>
        </div>
      )}

      <div className="billing-toggle">
        <label>
          <input
            type="radio"
            name="billing"
            value="monthly"
            checked={billingCycle === 'monthly'}
            onChange={(e) => setBillingCycle(e.target.value)}
          />
          Monthly
        </label>
        <label>
          <input
            type="radio"
            name="billing"
            value="annual"
            checked={billingCycle === 'annual'}
            onChange={(e) => setBillingCycle(e.target.value)}
          />
          Annual (Save 20%)
        </label>
      </div>

      <div className="plans-grid">
        {plans.map((plan) => (
          <div
            key={plan._id}
            className={`plan-card ${plan.popular ? 'popular' : ''} ${plan.recommended ? 'recommended' : ''} ${
              activeSubscription?.planId === plan._id ? 'current' : ''
            }`}
          >
            {plan.popular && <div className="badge">Popular</div>}
            {plan.recommended && <div className="badge">Recommended</div>}
            {activeSubscription?.planId === plan._id && <div className="badge current">Current</div>}

            <div className="plan-icon" style={{ backgroundColor: plan.color }}>
              {plan.icon || '🌟'}
            </div>

            <h3>{plan.planName}</h3>
            <p className="plan-tier">{plan.planTier.toUpperCase()}</p>

            <div className="plan-price">
              <span className="currency">₹</span>
              <span className="amount">
                {billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice}
              </span>
              <span className="period">/{billingCycle === 'annual' ? 'year' : 'month'}</span>
            </div>

            {billingCycle === 'annual' && plan.annualPrice && (
              <p className="savings">
                Save ₹{(plan.monthlyPrice * 12 - plan.annualPrice).toFixed(0)}/year
              </p>
            )}

            <div className="plan-features">
              <h4>Features:</h4>
              <ul>
                {plan.highlights?.map((highlight, idx) => (
                  <li key={idx}>✓ {highlight}</li>
                ))}
              </ul>
            </div>

            <div className="plan-benefits">
              <h4>Benefits:</h4>
              <ul>
                {plan.benefits?.slice(0, 3).map((benefit, idx) => (
                  <li key={idx}>
                    <strong>{benefit.name}:</strong> {benefit.description}
                  </li>
                ))}
              </ul>
            </div>

            <div className="plan-action">
              {activeSubscription?.planId === plan._id ? (
                <button className="btn-current" disabled>
                  Current Plan
                </button>
              ) : activeSubscription && activeSubscription.planTier < plan.planTier ? (
                <button
                  className="btn-upgrade"
                  onClick={() => handleUpgrade(plan._id)}
                >
                  Upgrade
                </button>
              ) : (
                <button
                  className="btn-subscribe"
                  onClick={() => handleSubscribe(plan._id)}
                >
                  Subscribe Now
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPlans;
