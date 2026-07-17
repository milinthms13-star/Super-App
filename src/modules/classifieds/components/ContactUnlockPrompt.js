/**
 * ContactUnlockPrompt Component
 * Handles conditional display of contact information based on subscription status
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import SubscriptionPlansModal from './SubscriptionPlansModal';

const ContactUnlockPrompt = ({ ad, user, onContactUnlocked, onOpenSubscription }) => {
  const [accessInfo, setAccessInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [contactDetails, setContactDetails] = useState(null);
  const [error, setError] = useState('');
  const [showPlansModal, setShowPlansModal] = useState(false);

  useEffect(() => {
    if (ad && user) {
      checkAccess();
    }
  }, [ad, user]);

  const checkAccess = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/classifieds/subscription/check-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ adId: ad.id }),
      });

      const data = await response.json();

      if (data.success) {
        setAccessInfo(data);

        // If already has access and it's owner or public, show contacts immediately
        if (data.hasAccess && (data.reason === 'owner' || data.reason === 'public' || data.reason === 'already_unlocked')) {
          setContactDetails({
            phone: ad.contactPhone || ad.phone || '',
            email: ad.contactEmail || ad.sellerEmail || '',
            whatsapp: ad.contactWhatsApp || ad.contactPhone || ad.phone || '',
          });
        }
      } else {
        setError(data.message || 'Failed to check access');
      }
    } catch (err) {
      console.error('Error checking access:', err);
      setError('Failed to check contact access');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    try {
      setUnlocking(true);
      setError('');

      const response = await fetch(`/api/classifieds/subscription/unlock-contact/${ad.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setContactDetails(data.contactDetails);
        setAccessInfo({ ...accessInfo, hasAccess: true, reason: 'already_unlocked' });

        if (onContactUnlocked) {
          onContactUnlocked(data.contactDetails, data.remainingUnlocks);
        }

        // Show success message
        showToast('Contact details unlocked successfully!', 'success');
      } else {
        setError(data.message || 'Failed to unlock contact');
        showToast(data.message || 'Failed to unlock contact', 'error');
      }
    } catch (err) {
      console.error('Error unlocking contact:', err);
      setError('Failed to unlock contact details');
      showToast('Failed to unlock contact details', 'error');
    } finally {
      setUnlocking(false);
    }
  };

  const handleUpgrade = () => {
    if (onOpenSubscription) {
      onOpenSubscription();
    } else {
      setShowPlansModal(true);
    }
  };

  const showToast = (message, type = 'info') => {
    // Simple toast implementation - could be replaced with a toast library
    const toast = document.createElement('div');
    toast.className = `contact-unlock-toast contact-unlock-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 100);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  };

  const renderContactButton = (type, value, icon) => {
    if (!value) return null;

    const getHref = () => {
      switch (type) {
        case 'phone':
          return `tel:${value}`;
        case 'email':
          return `mailto:${value}`;
        case 'whatsapp':
          return `https://wa.me/${value.replace(/[^0-9]/g, '')}`;
        default:
          return '#';
      }
    };

    const getLabel = () => {
      switch (type) {
        case 'phone':
          return 'Call';
        case 'email':
          return 'Email';
        case 'whatsapp':
          return 'WhatsApp';
        default:
          return 'Contact';
      }
    };

    return (
      <a
        href={getHref()}
        className={`contact-button contact-button-${type}`}
        target={type === 'email' ? undefined : '_blank'}
        rel="noopener noreferrer"
      >
        <span className="contact-icon">{icon}</span>
        <span className="contact-value">{value}</span>
        <span className="contact-label">{getLabel()}</span>
      </a>
    );
  };

  if (loading) {
    return (
      <div className="contact-unlock-container">
        <div className="contact-unlock-loading">
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
        </div>
      </div>
    );
  }

  if (error && !accessInfo) {
    return (
      <div className="contact-unlock-container">
        <div className="contact-unlock-error">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={checkAccess} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!accessInfo) {
    return null;
  }

  // Show contact details if user has access
  if (accessInfo.hasAccess && contactDetails) {
    return (
      <div className="contact-unlock-container">
        <div className="contact-details-unlocked">
          <div className="contact-header">
            <h3>Contact Seller</h3>
            {accessInfo.reason === 'owner' && (
              <span className="owner-badge">Your Ad</span>
            )}
            {accessInfo.reason === 'already_unlocked' && (
              <span className="unlocked-badge">✓ Unlocked</span>
            )}
          </div>

          <div className="contact-buttons-grid">
            {renderContactButton('phone', contactDetails.phone, '📞')}
            {renderContactButton('email', contactDetails.email, '📧')}
            {renderContactButton('whatsapp', contactDetails.whatsapp, '💬')}
          </div>

          {accessInfo.subscription && !accessInfo.subscription.entitlements?.unlimitedContactAccess && (
            <div className="remaining-unlocks">
              <span className="unlock-icon">🔓</span>
              <span>
                {accessInfo.subscription.remainingUnlocks || 0} unlocks remaining this month
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show unlock button if user can unlock
  if (accessInfo.hasAccess && accessInfo.reason === 'can_unlock') {
    return (
      <div className="contact-unlock-container">
        <div className="contact-unlock-prompt">
          <div className="unlock-icon-large">🔒</div>
          <h3>Unlock Contact Details</h3>
          <p>Use one of your unlocks to view seller's contact information</p>

          {accessInfo.subscription && (
            <div className="subscription-info">
              <span className="tier-badge tier-badge-{accessInfo.subscription.tier}">
                {accessInfo.subscription.tier.toUpperCase()} Plan
              </span>
              <p className="remaining-unlocks-text">
                {accessInfo.subscription.remainingUnlocks || 0} unlocks remaining
              </p>
            </div>
          )}

          <button
            onClick={handleUnlock}
            disabled={unlocking}
            className="unlock-button"
          >
            {unlocking ? (
              <>
                <span className="spinner-small"></span>
                Unlocking...
              </>
            ) : (
              <>
                <span className="unlock-icon">🔓</span>
                Unlock Contact Details
              </>
            )}
          </button>

          <p className="unlock-note">
            💡 Upgrade to <strong>Pro</strong> for unlimited unlocks
          </p>
        </div>
      </div>
    );
  }

  // Show subscription required message
  if (!accessInfo.hasAccess && accessInfo.reason === 'subscription_required') {
    return (
      <div className="contact-unlock-container">
        <div className="contact-locked">
          <div className="locked-icon-large">🔒</div>
          <h3>Premium Feature</h3>
          <p>Subscribe to view contact details or use our free in-app messaging</p>

          <div className="locked-options">
            <button onClick={handleUpgrade} className="upgrade-button">
              <span className="upgrade-icon">⭐</span>
              View Plans & Pricing
            </button>

            <div className="or-divider">
              <span>OR</span>
            </div>

            <button className="message-button">
              <span className="message-icon">💬</span>
              Send Message (Free)
            </button>
          </div>

          <div className="plan-preview">
            <p className="plan-preview-title">Our Plans:</p>
            <div className="plan-preview-grid">
              <div className="plan-preview-item">
                <strong>Basic</strong>
                <span>₹99/mo</span>
                <span className="plan-preview-feature">10 unlocks/month</span>
              </div>
              <div className="plan-preview-item recommended">
                <strong>Pro</strong>
                <span>₹299/mo</span>
                <span className="plan-preview-feature">Unlimited unlocks</span>
              </div>
            </div>
          </div>
        </div>

        {showPlansModal && (
          <SubscriptionPlansModal
            isOpen={showPlansModal}
            onClose={() => setShowPlansModal(false)}
            currentTier="free"
            onSubscribe={(tier, cycle) => {
              console.log('Subscribe:', tier, cycle);
              // Payment flow will be handled here
              setShowPlansModal(false);
            }}
          />
        )}
      </div>
    );
  }

  // Show limit reached message
  if (!accessInfo.hasAccess && accessInfo.reason === 'limit_reached') {
    return (
      <div className="contact-unlock-container">
        <div className="contact-limit-reached">
          <div className="limit-icon-large">⚠️</div>
          <h3>Unlock Limit Reached</h3>
          <p>You've used all your unlocks for this month</p>

          <div className="limit-reached-info">
            <p>
              Current Plan: <strong className="tier-badge tier-badge-basic">BASIC</strong>
            </p>
            <p>Next renewal: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
          </div>

          <button onClick={handleUpgrade} className="upgrade-button-large">
            <span className="upgrade-icon">🚀</span>
            Upgrade to Pro for Unlimited Access
            <span className="upgrade-price">₹299/month</span>
          </button>

          <p className="upgrade-note">
            ✓ Unlimited contact unlocks<br />
            ✓ Featured ad slots<br />
            ✓ Priority support
          </p>
        </div>
      </div>
    );
  }

  // Hidden by seller
  if (accessInfo.reason === 'hidden') {
    return (
      <div className="contact-unlock-container">
        <div className="contact-hidden">
          <div className="hidden-icon-large">🙈</div>
          <h3>Contact Info Hidden</h3>
          <p>The seller has chosen to hide their contact details</p>
          <button className="message-button">
            <span className="message-icon">💬</span>
            Send Message Instead
          </button>
        </div>
      </div>
    );
  }

  return null;
};

ContactUnlockPrompt.propTypes = {
  ad: PropTypes.shape({
    id: PropTypes.string.isRequired,
    contactPhone: PropTypes.string,
    contactEmail: PropTypes.string,
    contactWhatsApp: PropTypes.string,
    phone: PropTypes.string,
    sellerEmail: PropTypes.string,
  }).isRequired,
  user: PropTypes.shape({
    email: PropTypes.string,
    id: PropTypes.string,
  }),
  onContactUnlocked: PropTypes.func,
  onOpenSubscription: PropTypes.func,
};

export default ContactUnlockPrompt;
