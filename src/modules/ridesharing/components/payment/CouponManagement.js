/**
 * CouponManagement.js
 * Coupon listing, validation, and application component
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CouponManagement.css';

const CouponManagement = ({ rideType = 'auto', rideAmount = 0, onCouponApply = null }) => {
  const [coupons, setCoupons] = useState([]);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [validationError, setValidationError] = useState('');

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    if (rideAmount > 0 && rideType) {
      fetchAvailableCoupons();
    }
  }, [rideAmount, rideType]);

  const fetchAvailableCoupons = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE}/api/ridesharing/phase3/coupon/available?rideType=${rideType}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCoupons(response.data.coupons || []);
    } catch (err) {
      console.error('Error fetching coupons:', err);
      setError('Failed to load available coupons');
    } finally {
      setLoading(false);
    }
  };

  const fetchCouponHistory = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/api/ridesharing/phase3/coupon/history?limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHistory(response.data.history || []);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('Failed to load coupon history');
    }
  };

  const handleValidateCoupon = async () => {
    try {
      setValidationError('');
      if (!couponCode.trim()) {
        setValidationError('Enter a coupon code');
        return;
      }

      if (rideAmount <= 0) {
        setValidationError('Invalid ride amount');
        return;
      }

      const response = await axios.post(
        `${API_BASE}/api/ridesharing/phase3/coupon/validate`,
        {
          code: couponCode,
          rideType,
          rideAmount
        }
      );

      if (response.data.valid) {
        setSelectedCoupon(response.data);
        setDiscount(response.data.discount);
      } else {
        setValidationError(response.data.message);
        setSelectedCoupon(null);
      }
    } catch (err) {
      setValidationError(err.response?.data?.message || 'Invalid coupon code');
      setSelectedCoupon(null);
    }
  };

  const handleApplyCoupon = async () => {
    try {
      if (!selectedCoupon) {
        setError('No coupon selected');
        return;
      }

      const response = await axios.post(
        `${API_BASE}/api/ridesharing/phase3/coupon/apply`,
        {
          code: selectedCoupon.couponCode,
          rideId: 'temp-' + Date.now(),
          rideAmount,
          rideType
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setAppliedCoupon({
          code: selectedCoupon.couponCode,
          discount: response.data.discount,
          originalAmount: response.data.originalAmount,
          finalAmount: response.data.finalAmount
        });

        setSuccessMessage(`Coupon applied! You save ₹${response.data.discount}`);

        // Notify parent component if callback provided
        if (onCouponApply) {
          onCouponApply({
            code: selectedCoupon.couponCode,
            discount: response.data.discount,
            finalAmount: response.data.finalAmount
          });
        }

        setTimeout(() => setSuccessMessage(''), 3000);
        setCouponCode('');
        setSelectedCoupon(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply coupon');
    }
  };

  const handleQuickApply = async (coupon) => {
    try {
      const couponCode = coupon.code.split(' - ')[0].trim();
      setCouponCode(couponCode);

      // Validate first
      const validateResponse = await axios.post(
        `${API_BASE}/api/ridesharing/phase3/coupon/validate`,
        {
          code: couponCode,
          rideType,
          rideAmount
        }
      );

      if (validateResponse.data.valid) {
        setSelectedCoupon(validateResponse.data);
        setDiscount(validateResponse.data.discount);

        // Auto-apply
        const applyResponse = await axios.post(
          `${API_BASE}/api/ridesharing/phase3/coupon/apply`,
          {
            code: couponCode,
            rideId: 'temp-' + Date.now(),
            rideAmount,
            rideType
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (applyResponse.data.success) {
          setAppliedCoupon({
            code: couponCode,
            discount: applyResponse.data.discount,
            originalAmount: applyResponse.data.originalAmount,
            finalAmount: applyResponse.data.finalAmount
          });

          setSuccessMessage(`Coupon applied! You save ₹${applyResponse.data.discount}`);

          if (onCouponApply) {
            onCouponApply({
              code: couponCode,
              discount: applyResponse.data.discount,
              finalAmount: applyResponse.data.finalAmount
            });
          }

          setTimeout(() => setSuccessMessage(''), 3000);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply coupon');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setSelectedCoupon(null);
    setDiscount(0);
  };

  const handleViewHistory = () => {
    setShowHistory(!showHistory);
    if (!showHistory) {
      fetchCouponHistory();
    }
  };

  if (loading && coupons.length === 0) {
    return <div className="coupon-loading">Loading offers...</div>;
  }

  return (
    <div className="coupon-container">
      {/* Header */}
      <div className="coupon-header">
        <h3>🎟️ Available Offers</h3>
        <button
          className="history-btn"
          onClick={handleViewHistory}
          title="View coupon history"
        >
          📋 History
        </button>
      </div>

      {/* Error & Success Messages */}
      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}

      {/* Applied Coupon Display */}
      {appliedCoupon && (
        <div className="applied-coupon-card">
          <div className="applied-content">
            <p className="applied-label">Coupon Applied</p>
            <div className="applied-info">
              <span className="applied-code">{appliedCoupon.code}</span>
              <span className="applied-discount">Save ₹{appliedCoupon.discount}</span>
            </div>
            <p className="applied-final">
              Final Amount: <strong>₹{appliedCoupon.finalAmount}</strong>
            </p>
          </div>
          <button
            className="remove-coupon-btn"
            onClick={handleRemoveCoupon}
            title="Remove coupon"
          >
            ✕
          </button>
        </div>
      )}

      {/* Manual Coupon Entry */}
      <div className="coupon-input-section">
        <div className="input-group">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder="Enter coupon code"
            className="coupon-input"
          />
          <button
            className="validate-btn"
            onClick={handleValidateCoupon}
            disabled={!couponCode.trim() || rideAmount <= 0}
          >
            Check
          </button>
        </div>

        {validationError && (
          <p className="validation-error">{validationError}</p>
        )}

        {selectedCoupon && !appliedCoupon && (
          <div className="coupon-detail">
            <p className="detail-description">{selectedCoupon.description}</p>
            <p className="detail-amount">
              Save <strong>₹{selectedCoupon.discount}</strong>
            </p>
            <button
              className="apply-btn"
              onClick={handleApplyCoupon}
            >
              Apply Coupon
            </button>
          </div>
        )}
      </div>

      {/* Available Coupons */}
      {coupons.length > 0 && !appliedCoupon && (
        <div className="coupons-list">
          <p className="list-title">Quick Options</p>
          {coupons.map((coupon, idx) => (
            <div key={idx} className="coupon-item">
              <div className="coupon-offer">
                <p className="offer-discount">{coupon.discount}</p>
                <p className="offer-description">{coupon.description}</p>
                <p className="offer-min">Min. ₹{coupon.minAmount}</p>
              </div>
              <button
                className="quick-apply-btn"
                onClick={() => handleQuickApply(coupon)}
              >
                Apply
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Coupon History */}
      {showHistory && (
        <div className="coupon-history">
          <h4>
            Your Coupon History
            <button
              className="close-history"
              onClick={() => setShowHistory(false)}
            >
              ✕
            </button>
          </h4>

          {history.length === 0 ? (
            <p className="no-history">No coupons used yet</p>
          ) : (
            <div className="history-list">
              {history.map((item, idx) => (
                <div key={idx} className="history-item">
                  <div className="history-code">
                    {item.couponId?.code || 'N/A'}
                  </div>
                  <div className="history-amount">
                    -₹{item.discountAmount}
                  </div>
                  <div className="history-date">
                    {new Date(item.usedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {coupons.length === 0 && !loading && !appliedCoupon && (
        <div className="no-coupons">
          <p>No coupons available for {rideType} rides</p>
          <p className="hint">Check back later for more offers!</p>
        </div>
      )}

      {/* Terms */}
      <div className="coupon-terms">
        <p className="terms-title">How to use</p>
        <ul>
          <li>Enter or select a coupon code above</li>
          <li>Maximum discount may apply</li>
          <li>One coupon per ride</li>
          <li>Cannot be combined with other offers</li>
          <li>Check expiry before using</li>
        </ul>
      </div>
    </div>
  );
};

export default CouponManagement;
