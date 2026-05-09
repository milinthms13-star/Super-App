/**
 * PaymentMethods.jsx
 * Manage saved payment methods (cards, UPI, wallets)
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PaymentMethods.css';

const PaymentMethods = ({ userId }) => {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    methodType: 'card',
    cardNumber: '',
    cardHolderName: '',
    expiryMonth: '',
    expiryYear: '',
    upiId: '',
    walletProvider: '',
    cardBrand: 'unknown'
  });

  useEffect(() => {
    fetchPaymentMethods();
  }, [userId]);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/user/payment-methods', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMethods(response.data.data || []);
    } catch (err) {
      setError('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAddPaymentMethod = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const payload = {
        ...formData,
        expiryMonth: parseInt(formData.expiryMonth),
        expiryYear: parseInt(formData.expiryYear)
      };

      await axios.post('/api/user/payment-methods', payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      fetchPaymentMethods();
      setFormData({
        methodType: 'card',
        cardNumber: '',
        cardHolderName: '',
        expiryMonth: '',
        expiryYear: '',
        upiId: '',
        walletProvider: '',
        cardBrand: 'unknown'
      });
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add payment method');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this payment method?')) return;

    try {
      await axios.delete(`/api/user/payment-methods/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchPaymentMethods();
    } catch (err) {
      setError('Failed to delete payment method');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await axios.post(
        `/api/user/payment-methods/${id}/default`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchPaymentMethods();
    } catch (err) {
      setError('Failed to set default');
    }
  };

  const getMethodIcon = (methodType, cardBrand) => {
    if (methodType === 'card') {
      switch (cardBrand?.toLowerCase()) {
        case 'visa':
          return '💳';
        case 'mastercard':
          return '💳';
        case 'amex':
          return '💳';
        default:
          return '💳';
      }
    } else if (methodType === 'upi') {
      return '📱';
    } else if (methodType === 'wallet') {
      return '💰';
    }
    return '💳';
  };

  if (loading) return <div className="loading">Loading payment methods...</div>;

  return (
    <div className="payment-methods">
      <div className="methods-header">
        <h2>Payment Methods</h2>
        <button
          className="add-method-btn"
          onClick={() => setShowForm(!showForm)}
        >
          + Add Payment Method
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="method-form-card">
          <h3>Add Payment Method</h3>

          <form onSubmit={handleAddPaymentMethod}>
            <div className="form-group">
              <label>Payment Type *</label>
              <select
                name="methodType"
                value={formData.methodType}
                onChange={handleInputChange}
              >
                <option value="card">Credit/Debit Card</option>
                <option value="upi">UPI</option>
                <option value="wallet">Wallet</option>
              </select>
            </div>

            {formData.methodType === 'card' && (
              <>
                <div className="form-group">
                  <label>Card Number *</label>
                  <input
                    type="text"
                    name="cardNumber"
                    value={formData.cardNumber}
                    onChange={handleInputChange}
                    placeholder="Enter 13-19 digit card number"
                    maxLength="19"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Card Holder Name *</label>
                  <input
                    type="text"
                    name="cardHolderName"
                    value={formData.cardHolderName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Expiry Month *</label>
                    <select
                      name="expiryMonth"
                      value={formData.expiryMonth}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select month</option>
                      {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {String(i + 1).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Expiry Year *</label>
                    <select
                      name="expiryYear"
                      value={formData.expiryYear}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select year</option>
                      {[...Array(10)].map((_, i) => {
                        const year = new Date().getFullYear() + i;
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </>
            )}

            {formData.methodType === 'upi' && (
              <div className="form-group">
                <label>UPI ID *</label>
                <input
                  type="text"
                  name="upiId"
                  value={formData.upiId}
                  onChange={handleInputChange}
                  placeholder="username@bank"
                  required
                />
              </div>
            )}

            {formData.methodType === 'wallet' && (
              <div className="form-group">
                <label>Wallet Provider *</label>
                <select
                  name="walletProvider"
                  value={formData.walletProvider}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select wallet</option>
                  <option value="paytm">Paytm</option>
                  <option value="phonepe">PhonePe</option>
                  <option value="googlepay">Google Pay</option>
                  <option value="applepay">Apple Pay</option>
                </select>
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="save-btn">Add Method</button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="methods-list">
        {methods.length === 0 ? (
          <p className="no-data">No payment methods yet. Add one to get started.</p>
        ) : (
          methods.map((method) => (
            <div key={method._id} className="method-card">
              <div className="method-header">
                <span className="icon">{getMethodIcon(method.methodType, method.cardBrand)}</span>
                <div className="method-info">
                  <h4>{method.getDisplayName?.() || `${method.methodType.toUpperCase()}`}</h4>
                  {method.isDefault && <span className="default-badge">Default</span>}
                </div>
              </div>

              <div className="method-details">
                {method.methodType === 'card' && (
                  <p>Expires: {String(method.expiryMonth).padStart(2, '0')}/{method.expiryYear}</p>
                )}
                {method.methodType === 'upi' && (
                  <p>UPI: {method.upiId}</p>
                )}
                {method.methodType === 'wallet' && (
                  <p>Provider: {method.walletProvider}</p>
                )}
              </div>

              <div className="method-actions">
                {!method.isDefault && (
                  <button
                    className="action-btn"
                    onClick={() => handleSetDefault(method._id)}
                  >
                    Set as Default
                  </button>
                )}
                <button
                  className="action-btn delete"
                  onClick={() => handleDelete(method._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PaymentMethods;
