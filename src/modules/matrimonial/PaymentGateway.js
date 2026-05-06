import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../../contexts/AppContext';
import { API_BASE_URL } from './constants';

const PaymentGateway = ({ subscriptionTier, amount, onSuccess, onCancel }) => {
  const { currentUser } = useApp();
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState(null);
  const [paymentSession, setPaymentSession] = useState(null);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleRazorpayPayment = async () => {
    setProcessing(true);
    setMessage('');

    try {
      // Create order on backend
      const response = await axios.post(
        `${API_BASE_URL}/api/matrimonial/subscription/payments/razorpay/create`,
        {
          subscriptionTier,
          amount,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      const { razorpayOrderId, razorpayKeyId } = response.data;
      setOrderId(razorpayOrderId);

      // Open Razorpay checkout
      const options = {
        key: razorpayKeyId,
        amount: Math.round(amount * 100), // Amount in paise
        currency: 'INR',
        name: 'NilaHub Matrimonial',
        description: `${subscriptionTier} Subscription`,
        order_id: razorpayOrderId,
        handler: async (response) => {
          await verifyRazorpayPayment(response);
        },
        prefill: {
          name: currentUser?.displayName || currentUser?.email,
          email: currentUser?.email,
          contact: currentUser?.phone || '',
        },
        notes: {
          subscriptionTier,
          userEmail: currentUser?.email,
        },
        theme: {
          color: '#FF6B6B',
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            setMessage('Payment cancelled');
          },
        },
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        setMessage('✗ Razorpay failed to load');
        setProcessing(false);
      }
    } catch (error) {
      setMessage(`✗ Payment setup failed: ${error.response?.data?.message || error.message}`);
      setProcessing(false);
    }
  };

  const verifyRazorpayPayment = async (response) => {
    try {
      const verifyResponse = await axios.post(
        `${API_BASE_URL}/api/matrimonial/subscription/payments/razorpay/verify`,
        {
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
          subscriptionTier,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      setMessage('✓ Payment successful! Subscription activated.');
      if (onSuccess) {
        onSuccess(verifyResponse.data);
      }
    } catch (error) {
      setMessage(`✗ Payment verification failed: ${error.response?.data?.message || error.message}`);
      setProcessing(false);
    }
  };

  const handleStripePayment = async () => {
    setProcessing(true);
    setMessage('');

    try {
      // Create Stripe payment session
      const response = await axios.post(
        `${API_BASE_URL}/api/matrimonial/subscription/payments/stripe/create`,
        {
          subscriptionTier,
          amount,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      const { clientSecret, sessionId } = response.data;
      setPaymentSession({ clientSecret, sessionId });

      // Redirect to Stripe checkout (in production)
      // For now, show a message
      setMessage('Stripe payment integration ready. Redirect to Stripe Checkout.');
    } catch (error) {
      setMessage(`✗ Stripe setup failed: ${error.response?.data?.message || error.message}`);
      setProcessing(false);
    }
  };

  const handleUPIPayment = async () => {
    setProcessing(true);
    setMessage('');

    try {
      // Create UPI payment session
      const response = await axios.post(
        `${API_BASE_URL}/api/matrimonial/subscription/payments/upi/create`,
        {
          subscriptionTier,
          amount,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      setMessage('✓ UPI payment initiated. Complete the payment on your phone.');
      // Start polling for payment status
      pollUPIStatus(response.data.transactionId);
    } catch (error) {
      setMessage(`✗ UPI setup failed: ${error.response?.data?.message || error.message}`);
      setProcessing(false);
    }
  };

  const pollUPIStatus = async (transactionId) => {
    let attempts = 0;
    const maxAttempts = 30; // Poll for 5 minutes

    const pollInterval = setInterval(async () => {
      attempts++;

      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/matrimonial/subscription/payments/upi/status`,
          {
            params: { transactionId },
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            },
          }
        );

        if (response.data.status === 'success') {
          clearInterval(pollInterval);
          setMessage('✓ UPI payment successful! Subscription activated.');
          if (onSuccess) {
            onSuccess(response.data);
          }
          setProcessing(false);
        } else if (response.data.status === 'failed') {
          clearInterval(pollInterval);
          setMessage('✗ UPI payment failed');
          setProcessing(false);
        }
      } catch (error) {
        console.error('Error polling UPI status:', error);
      }

      if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        setMessage('⏰ Payment confirmation timed out. Check your payment status.');
        setProcessing(false);
      }
    }, 10000); // Poll every 10 seconds
  };

  return (
    <div className="payment-gateway-container">
      <div className="payment-header">
        <h2>Complete Your Subscription</h2>
        <p>
          Tier: <strong>{subscriptionTier}</strong> | Amount:{' '}
          <strong>₹{amount}/month</strong>
        </p>
      </div>

      {message && (
        <div className={`message ${message.startsWith('✓') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="payment-methods">
        <h3>Select Payment Method</h3>

        <div className="method-options">
          <label className="method-option">
            <input
              type="radio"
              value="razorpay"
              checked={paymentMethod === 'razorpay'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              disabled={processing}
            />
            <div className="method-card razorpay">
              <div className="method-icon">💳</div>
              <div className="method-name">Razorpay</div>
              <div className="method-details">Cards, Wallets, UPI</div>
            </div>
          </label>

          <label className="method-option">
            <input
              type="radio"
              value="stripe"
              checked={paymentMethod === 'stripe'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              disabled={processing}
            />
            <div className="method-card stripe">
              <div className="method-icon">🔐</div>
              <div className="method-name">Stripe</div>
              <div className="method-details">International Cards</div>
            </div>
          </label>

          <label className="method-option">
            <input
              type="radio"
              value="upi"
              checked={paymentMethod === 'upi'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              disabled={processing}
            />
            <div className="method-card upi">
              <div className="method-icon">📱</div>
              <div className="method-name">UPI</div>
              <div className="method-details">Google Pay, PhonePe</div>
            </div>
          </label>
        </div>
      </div>

      <div className="payment-summary">
        <h3>Order Summary</h3>
        <div className="summary-item">
          <span>Subscription Tier</span>
          <span>{subscriptionTier}</span>
        </div>
        <div className="summary-item">
          <span>Duration</span>
          <span>1 Month</span>
        </div>
        <div className="summary-item">
          <span>Amount</span>
          <span>₹{amount}</span>
        </div>
        <div className="summary-item">
          <span>Tax (Applicable)</span>
          <span>Calculated at checkout</span>
        </div>
        <div className="summary-total">
          <span>Total</span>
          <span>₹{amount}</span>
        </div>
      </div>

      <div className="payment-actions">
        <button
          className="btn btn-primary"
          onClick={() => {
            if (paymentMethod === 'razorpay') handleRazorpayPayment();
            if (paymentMethod === 'stripe') handleStripePayment();
            if (paymentMethod === 'upi') handleUPIPayment();
          }}
          disabled={processing}
        >
          {processing ? '⏳ Processing...' : `Pay ₹${amount}`}
        </button>

        <button
          className="btn btn-outline"
          onClick={onCancel}
          disabled={processing}
        >
          Cancel
        </button>
      </div>

      <div className="payment-security">
        <h4>🔒 Security & Privacy</h4>
        <ul>
          <li>✓ 256-bit SSL encryption</li>
          <li>✓ PCI-DSS compliant</li>
          <li>✓ Your payment info is never stored</li>
          <li>✓ All transactions are verified</li>
        </ul>
      </div>

      <div className="payment-terms">
        <p>
          By clicking "Pay", you agree to our{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};

export default PaymentGateway;
