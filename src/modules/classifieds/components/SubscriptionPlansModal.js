/**
 * SubscriptionPlansModal Component
 * Displays subscription tiers, pricing, and handles subscription purchase flow
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import '../../../styles/SubscriptionPlansModal.css';

const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly', discount: 0 },
  { value: 'quarterly', label: 'Quarterly', discount: 10 },
  { value: 'yearly', label: 'Yearly', discount: 20 },
];

const TIER_COLORS = {
  free: '#6c757d',
  basic: '#17a2b8',
  pro: '#28a745',
  business: '#6f42c1',
};

const TIER_ICONS = {
  free: '🆓',
  basic: '📱',
  pro: '⭐',
  business: '💼',
};

const SubscriptionPlansModal = ({
  isOpen,
  onClose,
  currentTier = 'free',
  onSubscribe,
  loading = false,
}) => {
  const [plans, setPlans] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('monthly');
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      setError('');

      const response = await fetch('/api/classifieds/subscription/plans', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription plans');
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setPlans(data.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError(err.message || 'Failed to load subscription plans');
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleSubscribe = (tier) => {
    if (tier === 'free') {
      return; // Free tier doesn't require subscription
    }

    if (onSubscribe) {
      onSubscribe(tier, selectedCycle);
    }
  };

  const formatPrice = (pricing) => {
    const price = pricing[selectedCycle] || 0;
    return price === 0 ? 'Free' : `₹${price}`;
  };

  const getPriceLabel = () => {
    const cycle = BILLING_CYCLES.find((c) => c.value === selectedCycle);
    return cycle ? cycle.label : 'Monthly';
  };

  const getDiscount = () => {
    const cycle = BILLING_CYCLES.find((c) => c.value === selectedCycle);
    return cycle ? cycle.discount : 0;
  };

  const renderFeatureList = (features) => {
    const featureLabels = {
      unlimitedContactAccess: 'Unlimited contact access',
      featuredAdSlots: 'Featured ad slots',
      adBoosts: 'Ad boosts',
      verifiedBadge: 'Verified seller badge',
      prioritySupport: 'Priority support',
      advancedAnalytics: 'Advanced analytics',
      bulkUpload: 'Bulk ad upload',
      apiAccess: 'API access',
      adFree: 'Ad-free experience',
      dedicatedStorefront: 'Dedicated storefront',
    };

    const featureList = [];

    // Add contact unlocks info
    if (features.contactUnlocksLimit > 0) {
      featureList.push(`${features.contactUnlocksLimit} contact unlocks/month`);
    } else if (features.unlimitedContactAccess) {
      featureList.push('✓ Unlimited contact access');
    } else {
      featureList.push('In-app messaging only');
    }

    // Add other features
    Object.entries(features).forEach(([key, value]) => {
      if (key === 'contactUnlocksLimit' || key === 'unlimitedContactAccess') {
        return; // Already handled above
      }

      const label = featureLabels[key];
      if (!label) return;

      if (typeof value === 'boolean' && value) {
        featureList.push(`✓ ${label}`);
      } else if (typeof value === 'number' && value > 0) {
        featureList.push(`${value} ${label}`);
      }
    });

    return featureList;
  };

  if (!isOpen) return null;

  return (
    <div className="subscription-modal-overlay" onClick={onClose}>
      <div className="subscription-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="subscription-modal-header">
          <h2>Choose Your Plan</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {error && (
          <div className="subscription-error-message">
            <span>⚠️ {error}</span>
            <button onClick={fetchPlans}>Retry</button>
          </div>
        )}

        {/* Billing Cycle Selector */}
        <div className="billing-cycle-selector">
          {BILLING_CYCLES.map((cycle) => (
            <button
              key={cycle.value}
              className={`cycle-btn ${selectedCycle === cycle.value ? 'active' : ''}`}
              onClick={() => setSelectedCycle(cycle.value)}
            >
              {cycle.label}
              {cycle.discount > 0 && (
                <span className="discount-badge">Save {cycle.discount}%</span>
              )}
            </button>
          ))}
        </div>

        {loadingPlans ? (
          <div className="loading-plans">
            <div className="spinner"></div>
            <p>Loading plans...</p>
          </div>
        ) : (
          <div className="subscription-plans-grid">
            {plans.map((plan) => {
              const isCurrentTier = plan.tier === currentTier;
              const isRecommended = plan.recommended;
              const features = renderFeatureList(plan.features);
              const tierColor = TIER_COLORS[plan.tier] || '#6c757d';
              const tierIcon = TIER_ICONS[plan.tier] || '📦';

              return (
                <div
                  key={plan.tier}
                  className={`subscription-plan-card ${isCurrentTier ? 'current-tier' : ''} ${
                    isRecommended ? 'recommended' : ''
                  }`}
                  style={{ borderColor: tierColor }}
                >
                  {isRecommended && (
                    <div className="recommended-badge" style={{ backgroundColor: tierColor }}>
                      Most Popular
                    </div>
                  )}

                  <div className="plan-header">
                    <div className="plan-icon">{tierIcon}</div>
                    <h3 className="plan-title" style={{ color: tierColor }}>
                      {plan.tier.charAt(0).toUpperCase() + plan.tier.slice(1)}
                    </h3>
                  </div>

                  <div className="plan-pricing">
                    <span className="price">{formatPrice(plan.pricing)}</span>
                    {plan.pricing[selectedCycle] > 0 && (
                      <span className="price-period">/{getPriceLabel()}</span>
                    )}
                  </div>

                  {getDiscount() > 0 && plan.pricing[selectedCycle] > 0 && (
                    <div className="savings-note">
                      Save ₹
                      {Math.round(
                        plan.pricing.monthly * (selectedCycle === 'quarterly' ? 3 : 12) -
                          plan.pricing[selectedCycle]
                      )}{' '}
                      per {selectedCycle === 'quarterly' ? 'quarter' : 'year'}
                    </div>
                  )}

                  <ul className="plan-features">
                    {features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>

                  <button
                    className={`subscribe-btn ${isCurrentTier ? 'current' : ''}`}
                    style={{
                      backgroundColor: isCurrentTier ? '#6c757d' : tierColor,
                      cursor: isCurrentTier ? 'default' : 'pointer',
                    }}
                    onClick={() => handleSubscribe(plan.tier)}
                    disabled={loading || isCurrentTier || plan.tier === 'free'}
                  >
                    {loading ? (
                      <>
                        <div className="btn-spinner"></div>
                        Processing...
                      </>
                    ) : isCurrentTier ? (
                      'Current Plan'
                    ) : plan.tier === 'free' ? (
                      'Default Plan'
                    ) : (
                      'Subscribe Now'
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="subscription-modal-footer">
          <p className="footer-note">
            💳 Secure payment via Razorpay • 🔒 Cancel anytime • 📧 Instant activation
          </p>
          <p className="footer-links">
            <a href="/classifieds/terms" target="_blank" rel="noopener noreferrer">
              Terms of Service
            </a>
            {' • '}
            <a href="/classifieds/refund-policy" target="_blank" rel="noopener noreferrer">
              Refund Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

SubscriptionPlansModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentTier: PropTypes.oneOf(['free', 'basic', 'pro', 'business']),
  onSubscribe: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default SubscriptionPlansModal;
