/**
 * PaymentGateway.jsx
 * Phase 5D - Unified payment gateway handler (Razorpay & Stripe)
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './PaymentGateway.css';

const PaymentGateway = ({
  paymentDetails,
  amount,
  gateway = 'razorpay',
  loading = false,
  onSuccess,
  onError,
}) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('token');

  /**
   * Handle Razorpay payment
   */
  const handleRazorpayPayment = async () => {
    try {
      setProcessing(true);
      setError(null);

      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        const options = {
          key: paymentDetails.razorpayKeyId,
          amount: Math.round(amount * 100), // Amount in paise
          currency: 'INR',
          order_id: paymentDetails.razorpayOrderId,
          name: 'Malabarbazaar',
          description: 'Purchase from Malabarbazaar',
          handler: async (response) => {
            try {
              // Verify payment with backend
              await axios.post(
                '/api/checkout/verify-razorpay',
                {
                  paymentId: paymentDetails.paymentId,
                  razorpay_order_id: paymentDetails.razorpayOrderId,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );

              onSuccess({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
            } catch (err) {
              setError('Payment verification failed');
              onError?.(err.response?.data?.error || 'Payment verification failed');
            } finally {
              setProcessing(false);
            }
          },
          prefill: {
            contact: '', // Can be populated from user data
            email: '',
          },
          theme: {
            color: '#667eea',
          },
        };

        const rzp1 = new window.Razorpay(options);
        rzp1.open();
      };
      document.body.appendChild(script);
    } catch (err) {
      setError('Failed to initialize Razorpay');
      onError?.(err.message);
      setProcessing(false);
    }
  };

  /**
   * Handle Stripe payment
   */
  const handleStripePayment = async () => {
    try {
      setProcessing(true);
      setError(null);

      // Load Stripe script
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = async () => {
        const stripe = window.Stripe(paymentDetails.stripePublicKey);

        const result = await stripe.redirectToCheckout({
          sessionId: paymentDetails.stripePaymentIntentId,
        });

        if (result.error) {
          setError(result.error.message);
          onError?.(result.error.message);
          setProcessing(false);
        }
      };
      document.body.appendChild(script);
    } catch (err) {
      setError('Failed to initialize Stripe');
      onError?.(err.message);
      setProcessing(false);
    }
  };

  /**
   * Handle UPI payment
   */
  const handleUPIPayment = async () => {
    try {
      setProcessing(true);
      setError(null);

      // Show UPI apps for Android
      const upiString = `upi://pay?pa=merchant@upi&pn=Malabarbazaar&am=${amount}&tn=Purchase`;

      // For iOS and other devices, show QR code or fallback
      if (/Android/.test(navigator.userAgent)) {
        window.location.href = upiString;
      } else {
        // Show alternative payment method
        setError('UPI not available on this device. Please use Razorpay or Stripe.');
      }

      setProcessing(false);
    } catch (err) {
      setError('Failed to process UPI payment');
      onError?.(err.message);
      setProcessing(false);
    }
  };

  /**
   * Handle COD (Cash on Delivery)
   */
  const handleCODPayment = async () => {
    try {
      setProcessing(true);
      setError(null);

      // COD doesn't require payment gateway interaction
      onSuccess({
        paymentMethod: 'cod',
        status: 'pending_delivery',
      });

      setProcessing(false);
    } catch (err) {
      setError('Failed to process COD');
      onError?.(err.message);
      setProcessing(false);
    }
  };

  /**
   * Render payment UI based on gateway
   */
  const renderPaymentUI = () => {
    switch (gateway) {
      case 'razorpay':
        return (
          <div className="payment-razorpay">
            <div className="payment-info">
              <p>Amount: <strong>₹{amount.toFixed(2)}</strong></p>
              <p>Gateway: <strong>Razorpay</strong></p>
              <p className="text-secondary">You will be redirected to Razorpay payment page</p>
            </div>
            <button
              onClick={handleRazorpayPayment}
              disabled={processing || loading}
              className="btn-payment"
            >
              {processing ? 'Opening Razorpay...' : 'Pay with Razorpay'}
            </button>
          </div>
        );

      case 'stripe':
        return (
          <div className="payment-stripe">
            <div className="payment-info">
              <p>Amount: <strong>₹{amount.toFixed(2)}</strong></p>
              <p>Gateway: <strong>Stripe</strong></p>
              <p className="text-secondary">You will be redirected to Stripe checkout</p>
            </div>
            <button
              onClick={handleStripePayment}
              disabled={processing || loading}
              className="btn-payment"
            >
              {processing ? 'Opening Stripe...' : 'Pay with Stripe'}
            </button>
          </div>
        );

      case 'upi':
        return (
          <div className="payment-upi">
            <div className="payment-info">
              <p>Amount: <strong>₹{amount.toFixed(2)}</strong></p>
              <p>Method: <strong>UPI</strong></p>
              <p className="text-secondary">Select your UPI app to complete payment</p>
            </div>
            <button
              onClick={handleUPIPayment}
              disabled={processing || loading}
              className="btn-payment"
            >
              {processing ? 'Processing...' : 'Pay with UPI'}
            </button>
          </div>
        );

      case 'cod':
        return (
          <div className="payment-cod">
            <div className="payment-info">
              <p>Amount: <strong>₹{amount.toFixed(2)}</strong></p>
              <p>Method: <strong>Cash on Delivery</strong></p>
              <p className="text-secondary">Pay when you receive the package</p>
              <div className="cod-notice">
                <strong>Note:</strong> A small convenience charge may apply to COD orders.
              </div>
            </div>
            <button
              onClick={handleCODPayment}
              disabled={processing || loading}
              className="btn-payment"
            >
              {processing ? 'Processing...' : 'Confirm COD Payment'}
            </button>
          </div>
        );

      default:
        return (
          <div className="payment-default">
            <p>Payment gateway not supported</p>
          </div>
        );
    }
  };

  return (
    <div className="payment-gateway">
      <div className="payment-container">
        <h3>Complete Payment</h3>

        {error && (
          <div className="alert-error">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="close-btn">×</button>
          </div>
        )}

        {renderPaymentUI()}

        <div className="payment-security">
          <p className="security-text">🔒 Your payment information is secure and encrypted</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentGateway;
