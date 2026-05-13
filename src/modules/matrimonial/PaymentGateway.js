import React, { useEffect, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import {
  checkUPIPaymentStatus,
  createRazorpayOrder,
  createUPIPaymentSession,
  verifyRazorpayPayment,
} from "./api.js";

const formatInr = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(amount || 0)
  );

const PaymentGateway = ({ subscriptionTier, amount, onSuccess, onCancel }) => {
  const { currentUser } = useApp();
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleRazorpayPayment = async () => {
    setProcessing(true);
    setMessage("");

    try {
      const response = await createRazorpayOrder(
        subscriptionTier,
        amount,
        currentUser?.matrimonialProfileId || ""
      );
      const { razorpayOrderId, razorpayKeyId } = response || {};

      if (!razorpayOrderId || !razorpayKeyId) {
        setMessage("Payment setup is unavailable. Try again later.");
        setProcessing(false);
        return;
      }

      const options = {
        key: razorpayKeyId,
        amount: Math.round(Number(amount || 0) * 100),
        currency: "INR",
        name: "NilaHub Matrimonial",
        description: `${subscriptionTier} subscription`,
        order_id: razorpayOrderId,
        handler: async (rzpResponse) => {
          try {
            const verifyResponse = await verifyRazorpayPayment(
              rzpResponse.razorpay_payment_id,
              rzpResponse.razorpay_order_id,
              rzpResponse.razorpay_signature,
              subscriptionTier
            );
            setMessage("Payment successful. Subscription activated.");
            setProcessing(false);
            onSuccess?.(verifyResponse);
          } catch (error) {
            setMessage(`Payment verification failed: ${error.response?.data?.message || error.message}`);
            setProcessing(false);
          }
        },
        prefill: {
          name: currentUser?.displayName || currentUser?.name || currentUser?.email || "",
          email: currentUser?.email || "",
          contact: currentUser?.phone || "",
        },
        notes: {
          subscriptionTier,
          userEmail: currentUser?.email || "",
        },
        theme: {
          color: "#ff6b6b",
        },
        modal: {
          ondismiss: () => {
            setMessage("Payment cancelled.");
            setProcessing(false);
          },
        },
      };

      if (!window.Razorpay) {
        setMessage("Razorpay failed to load.");
        setProcessing(false);
        return;
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      setMessage(`Payment setup failed: ${error.response?.data?.message || error.message}`);
      setProcessing(false);
    }
  };

  const pollUPIStatus = async (transactionId) => {
    let attempts = 0;
    const maxAttempts = 30;

    const intervalId = setInterval(async () => {
      attempts += 1;
      try {
        const statusResponse = await checkUPIPaymentStatus(transactionId);
        const status = String(statusResponse?.status || "").toLowerCase();
        if (status === "success") {
          clearInterval(intervalId);
          setProcessing(false);
          setMessage("UPI payment successful. Subscription activated.");
          onSuccess?.(statusResponse);
          return;
        }
        if (status === "failed") {
          clearInterval(intervalId);
          setProcessing(false);
          setMessage("UPI payment failed.");
          return;
        }
      } catch (_error) {
        // Continue polling until timeout.
      }

      if (attempts >= maxAttempts) {
        clearInterval(intervalId);
        setProcessing(false);
        setMessage("Payment confirmation timed out. Please check payment history.");
      }
    }, 10000);
  };

  const handleUPIPayment = async () => {
    setProcessing(true);
    setMessage("");

    try {
      const response = await createUPIPaymentSession(
        subscriptionTier,
        amount,
        currentUser?.matrimonialProfileId || ""
      );
      if (!response?.transactionId) {
        setMessage("UPI setup failed.");
        setProcessing(false);
        return;
      }
      setMessage("UPI payment initiated. Complete payment in your UPI app.");
      await pollUPIStatus(response.transactionId);
    } catch (error) {
      setMessage(`UPI setup failed: ${error.response?.data?.message || error.message}`);
      setProcessing(false);
    }
  };

  const submitPayment = () => {
    if (paymentMethod === "upi") {
      handleUPIPayment();
      return;
    }
    handleRazorpayPayment();
  };

  return (
    <div className="payment-gateway-container">
      <div className="payment-header">
        <h2>Complete Your Subscription</h2>
        <p>
          Tier: <strong>{subscriptionTier}</strong> | Amount: <strong>{formatInr(amount)}/month</strong>
        </p>
      </div>

      {message ? (
        <div className={`message ${message.toLowerCase().includes("failed") ? "error" : "success"}`}>
          {message}
        </div>
      ) : null}

      <div className="payment-methods">
        <h3>Select Payment Method</h3>
        <div className="method-options">
          <label className="method-option">
            <input
              type="radio"
              value="razorpay"
              checked={paymentMethod === "razorpay"}
              onChange={(event) => setPaymentMethod(event.target.value)}
              disabled={processing}
            />
            <div className="method-card razorpay">
              <div className="method-name">Razorpay</div>
              <div className="method-details">Cards, Wallets, UPI</div>
            </div>
          </label>

          <label className="method-option">
            <input
              type="radio"
              value="upi"
              checked={paymentMethod === "upi"}
              onChange={(event) => setPaymentMethod(event.target.value)}
              disabled={processing}
            />
            <div className="method-card upi">
              <div className="method-name">UPI</div>
              <div className="method-details">Google Pay, PhonePe, BHIM</div>
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
          <span>1 month</span>
        </div>
        <div className="summary-total">
          <span>Total</span>
          <span>{formatInr(amount)}</span>
        </div>
      </div>

      <div className="payment-actions">
        <button className="btn btn-primary" onClick={submitPayment} disabled={processing}>
          {processing ? "Processing..." : `Pay ${formatInr(amount)}`}
        </button>
        <button className="btn btn-outline" onClick={onCancel} disabled={processing}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PaymentGateway;

