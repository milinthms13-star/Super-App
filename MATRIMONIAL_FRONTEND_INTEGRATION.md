# Matrimonial Module - Integration Guide for Frontend

## Overview

The matrimonial backend is now ready for frontend integration. This guide covers how to integrate the APIs into your React/Vue components.

---

## 1. KYC Verification Flow (Frontend Implementation)

### Component: `KYCVerificationForm.js`

```javascript
import React, { useState } from 'react';
import API from '../services/api';

export default function KYCVerificationForm({ profileId, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('pending');
  const [documents, setDocuments] = useState({
    aadhaar: null,
    pan: null,
    selfie: null,
  });

  const handleFileUpload = async (documentType, file) => {
    try {
      setLoading(true);
      
      // Upload to S3 or your storage
      const fileUrl = await uploadFileToStorage(file);
      
      // Notify backend
      const response = await API.post('/matrimonial/kyc/upload', {
        profileId,
        documentType,
        fileUrl,
      });

      setDocuments({ ...documents, [documentType]: fileUrl });
      alert(`${documentType} uploaded successfully!`);
    } catch (error) {
      alert(`Error uploading ${documentType}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    try {
      const response = await API.get('/matrimonial/kyc/status', {
        params: { profileId },
      });

      setStatus(response.data.data.status);

      if (response.data.data.isApproved) {
        alert('KYC Approved! 🎉 You now have a Blue Tick!');
        onComplete?.();
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  return (
    <div className="kyc-form">
      <h2>Identity Verification</h2>
      <p>Status: {status}</p>

      <div className="document-upload">
        <h3>Upload Documents</h3>
        
        <FileInput
          label="Aadhaar Card"
          onChange={(file) => handleFileUpload('aadhaar', file)}
          disabled={loading}
        />
        
        <FileInput
          label="PAN Card"
          onChange={(file) => handleFileUpload('pan', file)}
          disabled={loading}
        />
        
        <FileInput
          label="Selfie (for biometric verification)"
          onChange={(file) => handleFileUpload('selfie', file)}
          disabled={loading}
        />
      </div>

      <button onClick={checkStatus} disabled={loading}>
        Check Verification Status
      </button>

      {status === 'approved' && (
        <div className="verified-badge">
          ✅ Verified Profile
        </div>
      )}
    </div>
  );
}
```

---

## 2. Blue Tick Badge Display

### Component: `BlueTickBadge.js`

```javascript
import React, { useEffect, useState } from 'react';
import API from '../services/api';

export default function BlueTickBadge({ profileId }) {
  const [blueTick, setBlueTick] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkBlueTick();
  }, [profileId]);

  const checkBlueTick = async () => {
    try {
      const response = await API.get('/matrimonial/blue-tick/status', {
        params: { profileId },
      });
      setBlueTick(response.data.data);
    } catch (error) {
      console.error('Error checking blue tick:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <span>Loading...</span>;

  return (
    <div className="blue-tick-container">
      {blueTick?.hasBlueTick ? (
        <div className="verified-badge" title={`Verified on ${blueTick.issuedAt}`}>
          ✓ Verified
        </div>
      ) : (
        <div className="not-verified">
          Profile not yet verified
          <small>Score: {blueTick?.eligibilityScore || 0}/100</small>
        </div>
      )}
    </div>
  );
}
```

### CSS: `BlueTickBadge.css`

```css
.verified-badge {
  display: inline-block;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
  margin-left: 8px;
}

.not-verified {
  color: #999;
  font-size: 12px;
}

.not-verified small {
  display: block;
  margin-top: 4px;
}
```

---

## 3. Horoscope Matching Component

### Component: `HoroscopeMatchingCard.js`

```javascript
import React, { useState, useEffect } from 'react';
import API from '../services/api';

export default function HoroscopeMatchingCard({ myProfileId, targetProfileId }) {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateMatch();
  }, [myProfileId, targetProfileId]);

  const calculateMatch = async () => {
    try {
      const response = await API.post('/matrimonial/horoscope/match', {
        profileId1: myProfileId,
        profileId2: targetProfileId,
      });

      setMatch(response.data.data);
    } catch (error) {
      console.error('Error calculating match:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Calculating compatibility...</div>;
  if (!match) return <div>Horoscope data not available</div>;

  const getColorClass = (level) => {
    switch (level) {
      case 'excellent': return 'excellent';
      case 'very_good': return 'very-good';
      case 'good': return 'good';
      case 'acceptable': return 'acceptable';
      default: return 'poor';
    }
  };

  return (
    <div className={`matching-card ${getColorClass(match.compatibilityLevel)}`}>
      <h3>Astrological Compatibility</h3>

      <div className="score-display">
        <div className="score-circle">{match.overallScore}%</div>
        <span className="compatibility-level">{match.compatibilityLevel}</span>
      </div>

      <div className="guna-score">
        <h4>Guna Score</h4>
        <div className="score-bar">
          <div 
            className="score-fill" 
            style={{ width: `${match.gunaScore.percentage}%` }}
          />
        </div>
        <p>
          {match.gunaScore.score}/{match.gunaScore.maxScore} 
          ({match.gunaScore.percentage}%)
        </p>
        <p className="min-acceptable">
          Minimum: {match.gunaScore.minAcceptable}/36
        </p>
      </div>

      <div className="compatibility-details">
        <h4>Compatibility Factors</h4>
        <ul>
          {match.details.nadiCompatible && (
            <li>✓ Nadi Compatible (genetic match)</li>
          )}
          {match.details.rashiCompatible && (
            <li>✓ Rashi Compatible (zodiac match)</li>
          )}
          {!match.details.nadiCompatible && (
            <li>✗ Nadi Incompatibility (genetic concern)</li>
          )}
        </ul>
      </div>

      <div className="recommendation">
        <h4>Recommendation</h4>
        <p>{match.recommendation}</p>
      </div>

      {match.gunaScore.isSuitable ? (
        <div className="suitable-alert">
          ✓ Suitable Match
        </div>
      ) : (
        <div className="not-suitable-alert">
          ✗ Score Below Minimum
        </div>
      )}
    </div>
  );
}
```

### CSS: `HoroscopeMatchingCard.css`

```css
.matching-card {
  border-radius: 12px;
  padding: 20px;
  margin: 16px 0;
  border-left: 4px solid #ddd;
}

.matching-card.excellent {
  background: #e8f5e9;
  border-left-color: #4caf50;
}

.matching-card.very-good {
  background: #e3f2fd;
  border-left-color: #2196f3;
}

.matching-card.good {
  background: #fff3e0;
  border-left-color: #ff9800;
}

.matching-card.acceptable {
  background: #fce4ec;
  border-left-color: #e91e63;
}

.score-display {
  text-align: center;
  margin: 20px 0;
}

.score-circle {
  display: inline-block;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 36px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.compatibility-level {
  display: block;
  margin-top: 12px;
  font-size: 18px;
  font-weight: 600;
  text-transform: capitalize;
}

.score-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin: 8px 0;
}

.score-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
}

.min-acceptable {
  color: #666;
  font-size: 12px;
}

.suitable-alert {
  background: #c8e6c9;
  color: #2e7d32;
  padding: 12px;
  border-radius: 6px;
  margin-top: 16px;
  text-align: center;
  font-weight: 600;
}

.not-suitable-alert {
  background: #ffcdd2;
  color: #c62828;
  padding: 12px;
  border-radius: 6px;
  margin-top: 16px;
  text-align: center;
  font-weight: 600;
}
```

---

## 4. Subscription Management Component

### Component: `SubscriptionPlans.js`

```javascript
import React, { useState, useEffect } from 'react';
import API from '../services/api';

const plans = [
  {
    name: 'Free',
    tier: 'free',
    price: 0,
    duration: 'Forever',
    features: [
      '50 profile views/month',
      '10 interest requests',
      'No direct messages',
      'No horoscope matching',
    ],
  },
  {
    name: 'Gold',
    tier: 'gold',
    price: 499,
    duration: 'Monthly',
    features: [
      '500 profile views/month',
      '100 interest requests',
      '200 messages/month',
      'Horoscope matching',
    ],
  },
  {
    name: 'Premium',
    tier: 'premium',
    price: 999,
    duration: 'Monthly',
    features: [
      '2000 profile views/month',
      '500 interest requests',
      '1000 messages/month',
      'Horoscope matching',
      'Video calls',
    ],
    recommended: true,
  },
  {
    name: 'VIP',
    tier: 'vip',
    price: 2999,
    duration: 'Monthly',
    features: [
      'Unlimited profile views',
      'Unlimited interest requests',
      'Unlimited messages',
      'Horoscope matching',
      'Video calls',
    ],
  },
];

export default function SubscriptionPlans({ profileId, onUpgrade }) {
  const [currentTier, setCurrentTier] = useState('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentSubscription();
  }, []);

  const fetchCurrentSubscription = async () => {
    try {
      const response = await API.get('/matrimonial/subscription/current');
      setCurrentTier(response.data.data.tier);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier) => {
    try {
      setLoading(true);
      const response = await API.post('/matrimonial/subscription/create', {
        profileId,
        tier,
        billingCycle: 'monthly',
      });

      if (response.data.paymentRequired) {
        // Redirect to payment gateway
        window.location.href = '/payment?subscriptionId=' + response.data.data._id;
      } else {
        // Direct upgrade (for free tier)
        setCurrentTier(tier);
        alert(`Upgraded to ${tier} tier!`);
        onUpgrade?.(tier);
      }
    } catch (error) {
      alert('Error upgrading subscription: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading plans...</div>;

  return (
    <div className="subscription-plans">
      <h2>Choose Your Plan</h2>

      <div className="plans-grid">
        {plans.map((plan) => (
          <div 
            key={plan.tier} 
            className={`plan-card ${plan.recommended ? 'recommended' : ''} ${
              currentTier === plan.tier ? 'current' : ''
            }`}
          >
            {plan.recommended && <div className="ribbon">Recommended</div>}
            
            <h3>{plan.name}</h3>

            <div className="price">
              {plan.price === 0 ? (
                <span>Free</span>
              ) : (
                <>
                  <span className="amount">₹{plan.price}</span>
                  <span className="duration">/{plan.duration}</span>
                </>
              )}
            </div>

            <ul className="features">
              {plan.features.map((feature, idx) => (
                <li key={idx}>✓ {feature}</li>
              ))}
            </ul>

            {currentTier === plan.tier ? (
              <button className="current-plan" disabled>
                Current Plan
              </button>
            ) : (
              <button 
                className="upgrade-btn" 
                onClick={() => handleUpgrade(plan.tier)}
              >
                {currentTier === 'free' ? 'Get Started' : 'Upgrade'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### CSS: `SubscriptionPlans.css`

```css
.subscription-plans {
  padding: 40px 20px;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-top: 40px;
}

.plan-card {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s ease;
  position: relative;
}

.plan-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.plan-card.recommended {
  border-color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
}

.plan-card.current {
  border-color: #4caf50;
  background: #f1f8f4;
}

.ribbon {
  position: absolute;
  top: -12px;
  right: 20px;
  background: #667eea;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
}

.price {
  margin: 20px 0;
  text-align: center;
}

.amount {
  font-size: 32px;
  font-weight: bold;
  color: #667eea;
}

.duration {
  font-size: 14px;
  color: #999;
}

.features {
  list-style: none;
  padding: 0;
  margin: 20px 0;
}

.features li {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  color: #333;
}

.upgrade-btn {
  width: 100%;
  padding: 12px;
  margin-top: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.upgrade-btn:hover {
  transform: scale(1.02);
}

.current-plan {
  width: 100%;
  padding: 12px;
  margin-top: 20px;
  background: #e0e0e0;
  color: #666;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: not-allowed;
}
```

---

## 5. Entitlement Enforcement (In Search/Discovery)

### Hook: `useSubscriptionEntitlement.js`

```javascript
import { useState, useCallback } from 'react';
import API from '../services/api';

export function useSubscriptionEntitlement() {
  const checkAccess = useCallback(async (entitlement) => {
    try {
      const response = await API.post(
        '/matrimonial/subscription/check-entitlement',
        { entitlement }
      );
      return response.data.hasAccess;
    } catch (error) {
      console.error('Error checking entitlement:', error);
      return false;
    }
  }, []);

  const consumeEntitlement = useCallback(async (entitlement) => {
    try {
      await API.post('/matrimonial/subscription/consume', { entitlement });
      return true;
    } catch (error) {
      console.error('Error consuming entitlement:', error);
      return false;
    }
  }, []);

  return { checkAccess, consumeEntitlement };
}
```

### Usage in ProfileCard:

```javascript
import { useSubscriptionEntitlement } from '../hooks/useSubscriptionEntitlement';

export function ProfileCard({ profile }) {
  const { checkAccess, consumeEntitlement } = useSubscriptionEntitlement();
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccess('profileViews').then(setHasAccess);
  }, []);

  const handleViewProfile = async () => {
    if (!hasAccess) {
      alert('Upgrade your subscription to view more profiles');
      return;
    }

    // Consume entitlement
    const consumed = await consumeEntitlement('profileViews');
    if (consumed) {
      // Navigate to full profile
      navigate(`/profile/${profile._id}`);
    }
  };

  return (
    <div className="profile-card">
      <img src={profile.photos[0]} alt={profile.name} />
      <h3>{profile.name}, {profile.age}</h3>
      <button onClick={handleViewProfile} disabled={!hasAccess}>
        {hasAccess ? 'View Profile' : 'Upgrade to View'}
      </button>
    </div>
  );
}
```

---

## 6. Admin Dashboard Integration

### Component: `AdminKYCReview.js`

```javascript
import React, { useState, useEffect } from 'react';
import API from '../services/api';

export default function AdminKYCReview() {
  const [pendingKYCs, setPendingKYCs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingKYCs();
  }, []);

  const fetchPendingKYCs = async () => {
    try {
      // TODO: Create endpoint for admin to list pending KYCs
      // const response = await API.get('/api/admin/kyc/pending');
      // setPendingKYCs(response.data.data);
    } catch (error) {
      console.error('Error fetching pending KYCs:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveKYC = async (kycId) => {
    try {
      const notes = prompt('Enter approval notes:');
      if (!notes) return;

      await API.patch(`/matrimonial/kyc/${kycId}/approve`, {
        notes,
      });

      alert('KYC approved! Blue tick will be issued.');
      fetchPendingKYCs(); // Refresh
    } catch (error) {
      alert('Error approving KYC: ' + error.message);
    }
  };

  const rejectKYC = async (kycId) => {
    try {
      const reason = prompt('Enter rejection reason:');
      if (!reason) return;

      await API.patch(`/matrimonial/kyc/${kycId}/reject`, {
        reason,
      });

      alert('KYC rejected.');
      fetchPendingKYCs(); // Refresh
    } catch (error) {
      alert('Error rejecting KYC: ' + error.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="kyc-review">
      <h2>Pending KYC Verifications</h2>
      <table>
        <thead>
          <tr>
            <th>Profile</th>
            <th>Risk Score</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pendingKYCs.map((kyc) => (
            <tr key={kyc._id}>
              <td>{kyc.profileId}</td>
              <td>{kyc.riskScore}/100</td>
              <td>{kyc.status}</td>
              <td>
                <button onClick={() => approveKYC(kyc._id)}>Approve</button>
                <button onClick={() => rejectKYC(kyc._id)}>Reject</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 7. Integration Checklist

- [ ] Update API service to include new endpoints
- [ ] Create KYC verification component
- [ ] Add blue tick badge display to profile cards
- [ ] Implement horoscope matching display
- [ ] Create subscription plans component
- [ ] Add entitlement checking before profile view
- [ ] Create admin KYC review dashboard
- [ ] Update profile discovery to filter by entitlements
- [ ] Add subscription to user settings
- [ ] Implement payment gateway integration
- [ ] Test all flows end-to-end

---

## 8. Environment Variables

Add to `.env.local`:

```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_S3_BUCKET=your-bucket-name
REACT_APP_PAYMENT_KEY=razorpay-key
```

---

## Summary

All backend APIs are ready for integration. Frontend components can now:
1. Upload and verify KYC documents
2. Display blue tick badges
3. Show horoscope compatibility scores
4. Manage subscriptions and upgrades
5. Enforce entitlements for premium features
6. Admin review and approve KYC

Happy coding! 🚀
