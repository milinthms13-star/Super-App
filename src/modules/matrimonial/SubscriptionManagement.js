import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../../contexts/AppContext';
import { API_BASE_URL } from './constants';

const SubscriptionManagement = ({ onSubscriptionChange, userEmail }) => {
  const { currentUser } = useApp();
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const subscriptionTiers = [
    {
      name: 'Free',
      tier: 'free',
      price: 0,
      currency: 'INR',
      features: [
        '50 Profile views/month',
        '5 Interest requests/month',
        'Basic matching',
        'See who liked you',
      ],
      badge: '🆓 Free Tier',
      color: '#999',
    },
    {
      name: 'Gold',
      tier: 'gold',
      price: 499,
      currency: 'INR',
      billingCycle: 'monthly',
      features: [
        '500 Profile views/month',
        '50 Interest requests/month',
        'Horoscope matching',
        'Direct messaging',
        'Priority in search',
        'Remove ads',
      ],
      badge: '✨ Gold',
      color: '#FFD700',
    },
    {
      name: 'Premium',
      tier: 'premium',
      price: 999,
      currency: 'INR',
      billingCycle: 'monthly',
      features: [
        '2000 Profile views/month',
        '500 Interest requests/month',
        'Horoscope matching',
        'Unlimited messaging',
        'Video call feature',
        'Top priority search',
        'No ads',
        'Profile badge',
      ],
      badge: '👑 Premium',
      color: '#C0C0C0',
    },
    {
      name: 'VIP',
      tier: 'vip',
      price: 2999,
      currency: 'INR',
      billingCycle: 'monthly',
      features: [
        'Unlimited profile views',
        'Unlimited interest requests',
        'Horoscope matching',
        'Unlimited messaging',
        'Video call feature',
        'Highest priority search',
        'Premium support',
        'VIP badge',
        'Profile verification priority',
        'Exclusive VIP events',
      ],
      badge: '💎 VIP',
      color: '#E5B000',
    },
  ];

  useEffect(() => {
    setTiers(subscriptionTiers);
    fetchCurrentSubscription();
  }, []);

  const fetchCurrentSubscription = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/matrimonial/subscription/current`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      setCurrentSubscription(response.data);
      setMessage('');
    } catch (error) {
      // Free tier if no subscription found
      setCurrentSubscription({ tier: 'free' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (tier, billingCycle = 'monthly') => {
    if (tier === 'free') return;

    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/matrimonial/subscription/create`,
        {
          tier,
          billingCycle,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      setMessage(`✓ Subscription initiated. Redirecting to payment...`);
      setCurrentSubscription(response.data.subscription);

      // Store payment session and redirect to payment gateway
      if (response.data.paymentSession) {
        localStorage.setItem('pendingPaymentSession', JSON.stringify(response.data.paymentSession));
        // Will handle actual payment in PaymentGateway component
      }

      if (onSubscriptionChange) {
        onSubscriptionChange(response.data.subscription);
      }

      setTimeout(() => {
        fetchCurrentSubscription();
      }, 1000);
    } catch (error) {
      setMessage(`✗ Subscription failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (tier) => {
    const tierData = tiers.find((t) => t.tier === tier);
    if (tierData) {
      handleSubscribe(tier);
    }
  };

  const handleCancel = async () => {
    if (!currentSubscription?.subscriptionId) {
      setMessage('✗ No active subscription to cancel');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/matrimonial/subscription/${currentSubscription.subscriptionId}/cancel`,
        { reason: 'User requested cancellation' },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      setMessage('✓ Subscription cancelled. Reverting to free tier.');
      setCurrentSubscription({ tier: 'free' });
      setShowCancelConfirm(false);

      if (onSubscriptionChange) {
        onSubscriptionChange({ tier: 'free' });
      }
    } catch (error) {
      setMessage(`✗ Cancellation failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!currentSubscription?.subscriptionId) {
      setMessage('✗ No active subscription to refund');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/matrimonial/subscription/${currentSubscription.subscriptionId}/refund`,
        { reason: 'Customer request' },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      setMessage('✓ Refund initiated. Amount will be credited in 3-5 business days.');
      setCurrentSubscription(response.data.subscription);
    } catch (error) {
      setMessage(`✗ Refund failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isCurrentTier = (tierName) => currentSubscription?.tier === tierName;
  const getCurrentTierData = () => tiers.find((t) => t.tier === currentSubscription?.tier);
  const currentTierData = getCurrentTierData();

  return (
    <div className="subscription-management-container">
      <div className="subscription-header">
        <h2>Subscription Plans</h2>
        <p>Choose a plan that works best for you</p>
      </div>

      {message && (
        <div className={`message ${message.startsWith('✓') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {currentSubscription && (
        <div className="current-subscription-banner">
          <h3>Current Plan: {currentTierData?.name || 'Free'}</h3>
          {currentSubscription.endDate && (
            <p>
              Renews on:{' '}
              {new Date(currentSubscription.endDate).toLocaleDateString()}
            </p>
          )}
          {currentSubscription.isActive && currentSubscription.tier !== 'free' && (
            <div className="subscription-actions">
              <button
                className="btn btn-outline"
                onClick={() => setShowCancelConfirm(true)}
                disabled={loading}
              >
                Cancel Subscription
              </button>
              {currentSubscription.refundEligible && (
                <button
                  className="btn btn-warning"
                  onClick={handleRefund}
                  disabled={loading}
                >
                  Request Refund
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {showCancelConfirm && (
        <div className="cancel-confirm-modal">
          <div className="modal-content">
            <h3>Cancel Subscription?</h3>
            <p>
              You will lose access to premium features and revert to the free tier.
            </p>
            <p>Are you sure you want to cancel?</p>
            <div className="modal-actions">
              <button
                className="btn btn-danger"
                onClick={handleCancel}
                disabled={loading}
              >
                {loading ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setShowCancelConfirm(false)}
                disabled={loading}
              >
                No, Keep It
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="subscription-plans-grid">
        {tiers.map((tier) => (
          <div
            key={tier.tier}
            className={`plan-card ${isCurrentTier(tier.tier) ? 'current-plan' : ''}`}
            style={{
              borderColor: isCurrentTier(tier.tier) ? tier.color : '#ddd',
            }}
          >
            <div className="plan-header" style={{ backgroundColor: tier.color }}>
              <div className="plan-badge">{tier.badge}</div>
              <h3>{tier.name}</h3>
            </div>

            <div className="plan-price">
              <div className="price-main">
                ₹ {tier.price}
                {tier.price > 0 && <span className="price-period">/{tier.billingCycle}</span>}
              </div>
            </div>

            <div className="plan-features">
              <h4>Features</h4>
              <ul>
                {tier.features.map((feature, idx) => (
                  <li key={idx}>✓ {feature}</li>
                ))}
              </ul>
            </div>

            <div className="plan-action">
              {isCurrentTier(tier.tier) ? (
                <button className="btn btn-outline" disabled>
                  ✓ Current Plan
                </button>
              ) : tier.tier === 'free' ? (
                <button className="btn btn-outline" onClick={() => handleCancel()}>
                  Switch to Free
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => handleUpgrade(tier.tier)}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Subscribe Now'}
                </button>
              )}
            </div>

            {tier.tier === 'vip' && (
              <div className="plan-recommended">★ Most Popular</div>
            )}
          </div>
        ))}
      </div>

      <div className="subscription-info">
        <h3>FAQ</h3>
        <div className="faq-item">
          <h4>Can I cancel anytime?</h4>
          <p>Yes, you can cancel your subscription anytime. You'll revert to the free tier immediately.</p>
        </div>

        <div className="faq-item">
          <h4>Is there a refund policy?</h4>
          <p>We offer refunds within 7 days of purchase if you're not satisfied. After 7 days, you can still cancel but won't receive a refund.</p>
        </div>

        <div className="faq-item">
          <h4>Can I upgrade or downgrade?</h4>
          <p>Yes, you can change your plan anytime. If upgrading, the difference will be pro-rated to your next billing cycle.</p>
        </div>

        <div className="faq-item">
          <h4>What if features aren't available in my region?</h4>
          <p>Some features may be restricted in certain regions due to local regulations. Contact support for details.</p>
        </div>
      </div>

      <div className="subscription-footer">
        <p>📧 Need help? Contact our support team at support@matrimonial.com</p>
      </div>
    </div>
  );
};

export default SubscriptionManagement;
