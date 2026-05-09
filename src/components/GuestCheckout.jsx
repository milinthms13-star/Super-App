/**
 * GuestCheckout.jsx
 * Simplified checkout for guest users
 * Features: No password required, post-purchase conversion prompt, address management
 */

import React, { useState } from 'react';
import axios from 'axios';
import './GuestCheckout.css';

const GuestCheckout = ({ cartItems = [], onSuccess, onError }) => {
  const [step, setStep] = useState('guest-info'); // guest-info | shipping | payment | confirmation
  const [loading, setLoading] = useState(false);
  const [guestId, setGuestId] = useState('');
  const [error, setError] = useState('');

  // Guest info
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  // Shipping
  const [address, setAddress] = useState({
    fullName: '',
    phoneNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India'
  });

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [orderNotes, setOrderNotes] = useState('');

  // Order details
  const [orderId, setOrderId] = useState('');
  const [conversionUrl, setConversionUrl] = useState('');

  // Validation
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone) => /^[6-9]\d{9}$/.test(phone);
  const validatePincode = (pincode) => /^\d{6}$/.test(pincode);

  // Step 1: Create guest session
  const handleCreateGuestSession = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(guestEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!validatePhone(guestPhone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/checkout/guest/create', {
        email: guestEmail,
        phoneNumber: guestPhone
      });

      setGuestId(response.data.data.guestId);
      setStep('shipping');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create guest session');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Update shipping address
  const handleUpdateAddress = async (e) => {
    e.preventDefault();
    setError('');

    const { fullName, phoneNumber, addressLine1, city, state, pincode } = address;

    if (!fullName || !phoneNumber || !addressLine1 || !city || !state || !pincode) {
      setError('Please fill in all required fields');
      return;
    }

    if (!validatePincode(pincode)) {
      setError('Please enter a valid 6-digit pincode');
      return;
    }

    setLoading(true);

    try {
      await axios.put(`/api/checkout/guest/${guestId}/address`, address);
      setStep('payment');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update address');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Place order
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const orderData = {
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
          category: item.category
        })),
        shippingAddress: address,
        paymentMethod,
        totalAmount: cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
        orderNotes,
        shippingCharges: 50,
        taxAmount: cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0) * 0.1
      };

      const response = await axios.post(
        `/api/checkout/guest/${guestId}/place-order`,
        orderData
      );

      setOrderId(response.data.data.orderId);
      setConversionUrl(response.data.data.conversionPrompt?.conversionUrl);
      setStep('confirmation');
      onSuccess?.(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.1;
  const shipping = 50;
  const total = subtotal + tax + shipping;

  return (
    <div className="guest-checkout-container">
      <div className="guest-checkout-card">
        <h1 className="guest-checkout-title">Guest Checkout</h1>
        <p className="guest-checkout-subtitle">Fast & secure checkout without account</p>

        {error && <div className="guest-error-message">{error}</div>}

        {step === 'guest-info' && (
          <form onSubmit={handleCreateGuestSession} className="guest-form">
            <h2 className="guest-section-title">Your Contact Information</h2>
            <p className="guest-section-desc">We'll use these to process your order</p>

            <div className="guest-form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="guest-form-group">
              <label htmlFor="phone">Phone Number *</label>
              <div className="guest-phone-input">
                <span className="guest-country-code">+91</span>
                <input
                  id="phone"
                  type="tel"
                  placeholder="98765 43210"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength="10"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="guest-info-box">
              <svg className="guest-info-icon" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <p>Your order confirmation will be sent to this email and phone number</p>
            </div>

            <button type="submit" disabled={loading} className="guest-submit-btn">
              {loading ? 'Processing...' : 'Continue to Shipping'}
            </button>
          </form>
        )}

        {step === 'shipping' && (
          <form onSubmit={handleUpdateAddress} className="guest-form">
            <h2 className="guest-section-title">Shipping Address</h2>

            <div className="guest-form-group">
              <label htmlFor="fullName">Full Name *</label>
              <input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={address.fullName}
                onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                disabled={loading}
                required
              />
            </div>

            <div className="guest-form-group">
              <label htmlFor="phoneNumber">Phone Number *</label>
              <input
                id="phoneNumber"
                type="tel"
                placeholder="98765 43210"
                value={address.phoneNumber}
                onChange={(e) => setAddress({ ...address, phoneNumber: e.target.value })}
                maxLength="10"
                disabled={loading}
                required
              />
            </div>

            <div className="guest-form-group">
              <label htmlFor="addressLine1">Address Line 1 *</label>
              <input
                id="addressLine1"
                type="text"
                placeholder="House No., Building Name"
                value={address.addressLine1}
                onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })}
                disabled={loading}
                required
              />
            </div>

            <div className="guest-form-group">
              <label htmlFor="addressLine2">Address Line 2 (Optional)</label>
              <input
                id="addressLine2"
                type="text"
                placeholder="Road Name, Area, Colony"
                value={address.addressLine2}
                onChange={(e) => setAddress({ ...address, addressLine2: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="guest-form-row">
              <div className="guest-form-group">
                <label htmlFor="city">City *</label>
                <input
                  id="city"
                  type="text"
                  placeholder="Mumbai"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  disabled={loading}
                  required
                />
              </div>

              <div className="guest-form-group">
                <label htmlFor="state">State *</label>
                <input
                  id="state"
                  type="text"
                  placeholder="Maharashtra"
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  disabled={loading}
                  required
                />
              </div>

              <div className="guest-form-group">
                <label htmlFor="pincode">Pincode *</label>
                <input
                  id="pincode"
                  type="text"
                  placeholder="400001"
                  value={address.pincode}
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                  maxLength="6"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="guest-form-actions">
              <button type="button" onClick={() => setStep('guest-info')} className="guest-back-btn">
                Back
              </button>
              <button type="submit" disabled={loading} className="guest-submit-btn">
                {loading ? 'Processing...' : 'Continue to Payment'}
              </button>
            </div>
          </form>
        )}

        {step === 'payment' && (
          <form onSubmit={handlePlaceOrder} className="guest-form">
            <h2 className="guest-section-title">Payment Method</h2>

            <div className="guest-payment-options">
              <label className="guest-payment-option">
                <input
                  type="radio"
                  value="razorpay"
                  checked={paymentMethod === 'razorpay'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={loading}
                />
                <span>💳 Credit/Debit Card</span>
              </label>
              <label className="guest-payment-option">
                <input
                  type="radio"
                  value="upi"
                  checked={paymentMethod === 'upi'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={loading}
                />
                <span>📱 UPI</span>
              </label>
              <label className="guest-payment-option">
                <input
                  type="radio"
                  value="wallet"
                  checked={paymentMethod === 'wallet'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={loading}
                />
                <span>💰 Digital Wallet</span>
              </label>
              <label className="guest-payment-option">
                <input
                  type="radio"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={loading}
                />
                <span>🚚 Cash on Delivery</span>
              </label>
            </div>

            <div className="guest-form-group">
              <label htmlFor="orderNotes">Order Notes (Optional)</label>
              <textarea
                id="orderNotes"
                placeholder="Add any special instructions..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                disabled={loading}
                rows="3"
              ></textarea>
            </div>

            <h2 className="guest-section-title">Order Summary</h2>
            <div className="guest-order-summary">
              <div className="guest-summary-row">
                <span>Subtotal ({cartItems.length} items)</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="guest-summary-row">
                <span>Shipping</span>
                <span>₹{shipping.toFixed(2)}</span>
              </div>
              <div className="guest-summary-row">
                <span>Tax (10%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div className="guest-summary-row guest-total">
                <span>Total Amount</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="guest-form-actions">
              <button type="button" onClick={() => setStep('shipping')} className="guest-back-btn">
                Back
              </button>
              <button type="submit" disabled={loading} className="guest-submit-btn">
                {loading ? 'Processing...' : `Complete Order (₹${total.toFixed(2)})`}
              </button>
            </div>
          </form>
        )}

        {step === 'confirmation' && (
          <div className="guest-confirmation">
            <div className="guest-success-icon">✓</div>
            <h2>Order Confirmed!</h2>
            <p>Thank you for your purchase</p>

            <div className="guest-confirmation-details">
              <div className="guest-detail-item">
                <span className="guest-detail-label">Order ID</span>
                <span className="guest-detail-value">{orderId}</span>
              </div>
              <div className="guest-detail-item">
                <span className="guest-detail-label">Email Confirmation</span>
                <span className="guest-detail-value">{guestEmail}</span>
              </div>
              <div className="guest-detail-item">
                <span className="guest-detail-label">Total Amount</span>
                <span className="guest-detail-value">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="guest-conversion-prompt">
              <h3>Save Your Details for Next Time</h3>
              <p>Create an account to save your address and payment methods for faster checkout</p>
              <button
                onClick={() => {
                  window.location.href = conversionUrl;
                }}
                className="guest-conversion-btn"
              >
                Create Account & Save Details
              </button>
            </div>

            <button onClick={() => window.location.href = '/'} className="guest-continue-btn">
              Continue Shopping
            </button>
          </div>
        )}
      </div>

      {/* Order Summary Sidebar */}
      {step !== 'confirmation' && (
        <div className="guest-sidebar">
          <div className="guest-sidebar-summary">
            <h3>Order Summary</h3>
            <div className="guest-summary-items">
              {cartItems.map((item, idx) => (
                <div key={idx} className="guest-summary-item">
                  <span>{item.name} x{item.quantity}</span>
                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="guest-summary-breakdown">
              <div>Subtotal: ₹{subtotal.toFixed(2)}</div>
              <div>Shipping: ₹{shipping.toFixed(2)}</div>
              <div>Tax: ₹{tax.toFixed(2)}</div>
              <div className="guest-summary-total">Total: ₹{total.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestCheckout;
