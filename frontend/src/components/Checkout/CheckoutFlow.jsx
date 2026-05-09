/**
 * CheckoutFlow.jsx
 * Phase 5D - Main checkout flow orchestrator
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CartReview from './CartReview';
import AddressSelector from './AddressSelector';
import PaymentMethodSelector from './PaymentMethodSelector';
import OrderSummary from './OrderSummary';
import PaymentGateway from './PaymentGateway';
import OrderConfirmation from './OrderConfirmation';
import './CheckoutFlow.css';

const CheckoutFlow = ({ cart = [], onOrderComplete }) => {
  const [step, setStep] = useState(1); // 1: Cart, 2: Address, 3: Payment, 4: Confirmation
  const [formData, setFormData] = useState({
    deliveryAddress: null,
    paymentMethod: null,
    paymentGateway: 'razorpay',
    couponCode: '',
  });

  const [order, setOrder] = useState(null);
  const [payment, setPayment] = useState(null);
  const [cartSummary, setCartSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('token');

  // Validate cart on mount
  useEffect(() => {
    if (cart.length > 0) {
      validateCart();
    }
  }, [cart]);

  /**
   * Validate cart and calculate totals
   */
  const validateCart = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        '/api/checkout/validate-cart',
        {
          items: cart,
          couponCode: formData.couponCode,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setCartSummary(response.data.data);
        setError(null);
      } else {
        setError(response.data.errors?.join(', '));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to validate cart');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Move to next step
   */
  const goToNextStep = () => {
    if (step < 4) {
      setStep(step + 1);
    }
  };

  /**
   * Move to previous step
   */
  const goToPreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  /**
   * Handle address selection
   */
  const handleAddressSelect = (address) => {
    setFormData(prev => ({
      ...prev,
      deliveryAddress: address,
    }));
    goToNextStep();
  };

  /**
   * Handle payment method selection
   */
  const handlePaymentMethodSelect = (method, gateway) => {
    setFormData(prev => ({
      ...prev,
      paymentMethod: method,
      paymentGateway: gateway,
    }));
    createOrder();
  };

  /**
   * Create order
   */
  const createOrder = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        '/api/checkout/create-order',
        {
          items: cart,
          deliveryAddress: formData.deliveryAddress._id,
          paymentMethod: formData.paymentMethod,
          paymentGateway: formData.paymentGateway,
          couponCode: formData.couponCode,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setOrder(response.data.data);
        setError(null);
        goToNextStep();
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Initialize payment
   */
  const initializePayment = async (orderId) => {
    try {
      setLoading(true);
      const response = await axios.post(
        '/api/checkout/initialize-payment',
        {
          orderId,
          gateway: formData.paymentGateway,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setPayment(response.data.data);
        setError(null);
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle successful payment
   */
  const handlePaymentSuccess = async (paymentData) => {
    try {
      setLoading(true);

      // Verify payment with backend
      const verifyEndpoint =
        formData.paymentGateway === 'razorpay'
          ? '/api/checkout/verify-razorpay'
          : '/api/checkout/verify-stripe';

      const response = await axios.post(
        verifyEndpoint,
        {
          paymentId: payment.paymentId,
          ...paymentData,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setError(null);
        goToNextStep(); // Move to confirmation
        if (onOrderComplete) {
          onOrderComplete(order);
        }
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Payment verification failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Render step indicator
   */
  const renderStepIndicator = () => (
    <div className="checkout-steps">
      <div className={`step ${step >= 1 ? 'active' : ''}`}>
        <span className="step-number">1</span>
        <span className="step-label">Cart</span>
      </div>
      <div className="step-connector" />
      <div className={`step ${step >= 2 ? 'active' : ''}`}>
        <span className="step-number">2</span>
        <span className="step-label">Address</span>
      </div>
      <div className="step-connector" />
      <div className={`step ${step >= 3 ? 'active' : ''}`}>
        <span className="step-number">3</span>
        <span className="step-label">Payment</span>
      </div>
      <div className="step-connector" />
      <div className={`step ${step >= 4 ? 'active' : ''}`}>
        <span className="step-number">4</span>
        <span className="step-label">Confirm</span>
      </div>
    </div>
  );

  // Error display
  if (error && step !== 4) {
    return (
      <div className="checkout-container">
        <div className="error-box">
          <h3>Checkout Error</h3>
          <p>{error}</p>
          <button onClick={() => window.location.href = '/cart'} className="btn-primary">
            Back to Cart
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      {renderStepIndicator()}

      <div className="checkout-content">
        {/* Step 1: Cart Review */}
        {step === 1 && (
          <div className="checkout-section">
            <CartReview
              cart={cart}
              summary={cartSummary}
              loading={loading}
              onCouponApply={(couponCode) => {
                setFormData(prev => ({ ...prev, couponCode }));
                validateCart();
              }}
              onProceed={goToNextStep}
            />
          </div>
        )}

        {/* Step 2: Address Selection */}
        {step === 2 && (
          <div className="checkout-section">
            <AddressSelector
              onSelect={handleAddressSelect}
              onBack={goToPreviousStep}
            />
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <div className="checkout-section">
            <PaymentMethodSelector
              order={order}
              cartSummary={cartSummary}
              loading={loading}
              onPaymentInitiate={async (method, gateway) => {
                setFormData(prev => ({
                  ...prev,
                  paymentMethod: method,
                  paymentGateway: gateway,
                }));
                await initializePayment(order.orderId);
              }}
              onBack={goToPreviousStep}
            />

            {payment && (
              <PaymentGateway
                paymentDetails={payment}
                amount={order.amount}
                gateway={formData.paymentGateway}
                loading={loading}
                onSuccess={handlePaymentSuccess}
                onError={(err) => setError(err)}
              />
            )}
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && order && (
          <div className="checkout-section">
            <OrderConfirmation order={order} />
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="checkout-navigation">
        {step > 1 && step < 4 && (
          <button onClick={goToPreviousStep} className="btn-secondary">
            Previous
          </button>
        )}
        {step < 4 && (
          <button
            onClick={step === 1 ? goToNextStep : undefined}
            disabled={loading || !cartSummary}
            className="btn-primary"
          >
            {loading ? 'Processing...' : step === 1 ? 'Continue to Address' : 'Continue'}
          </button>
        )}
      </div>
    </div>
  );
};

export default CheckoutFlow;
