import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import {
  cancelSubscription,
  createSubscription,
  getCurrentSubscription,
  requestSubscriptionRefund,
} from "./api.js";

const SUBSCRIPTION_TIERS = [
  {
    name: "Free",
    tier: "free",
    price: 0,
    billingCycle: "monthly",
    features: [
      "50 profile views/month",
      "5 interest requests/month",
      "Basic matching",
      "See who liked you",
    ],
    badge: "FREE",
    color: "#999",
  },
  {
    name: "Gold",
    tier: "gold",
    price: 499,
    billingCycle: "monthly",
    features: [
      "500 profile views/month",
      "50 interest requests/month",
      "Horoscope matching",
      "Direct messaging",
      "Priority in search",
    ],
    badge: "GOLD",
    color: "#d4af37",
  },
  {
    name: "Premium",
    tier: "premium",
    price: 999,
    billingCycle: "monthly",
    features: [
      "2000 profile views/month",
      "500 interest requests/month",
      "Horoscope matching",
      "High message limits",
      "Video call feature",
      "Top priority search",
    ],
    badge: "PREMIUM",
    color: "#c0c0c0",
  },
  {
    name: "VIP",
    tier: "vip",
    price: 2999,
    billingCycle: "monthly",
    features: [
      "Unlimited profile views",
      "Unlimited interest requests",
      "Unlimited messaging",
      "Video call feature",
      "Highest priority search",
      "Priority support",
    ],
    badge: "VIP",
    color: "#e5b000",
  },
];

const SubscriptionManagement = ({ onSubscriptionChange }) => {
  const { currentUser } = useApp();
  const [currentSubscription, setCurrentSubscription] = useState({ tier: "free", isActive: true });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const currentTierData = useMemo(
    () => SUBSCRIPTION_TIERS.find((entry) => entry.tier === currentSubscription?.tier),
    [currentSubscription?.tier]
  );

  const loadCurrentSubscription = async () => {
    setLoading(true);
    try {
      const response = await getCurrentSubscription();
      setCurrentSubscription(response?.data || { tier: "free", isActive: true });
      setMessage("");
    } catch (_error) {
      setCurrentSubscription({ tier: "free", isActive: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentSubscription();
  }, []);

  const handleSubscribe = async (tier, billingCycle = "monthly") => {
    if (tier === "free") {
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const profileId =
        currentUser?.matrimonialProfileId || currentUser?.matrimonialProfile?._id || "";
      const response = await createSubscription(tier, billingCycle, profileId);
      const nextSubscription = response?.data || null;
      setCurrentSubscription(nextSubscription || currentSubscription);
      setMessage("Subscription initiated. Complete payment to activate your plan.");

      if (onSubscriptionChange) {
        onSubscriptionChange(nextSubscription || { tier, isActive: false });
      }
    } catch (error) {
      setMessage(`Subscription failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!currentSubscription?.subscriptionId) {
      setMessage("No active subscription found.");
      return;
    }

    setLoading(true);
    try {
      await cancelSubscription(currentSubscription.subscriptionId, "User requested cancellation");
      setCurrentSubscription({ tier: "free", isActive: true });
      setShowCancelConfirm(false);
      setMessage("Subscription cancelled. Free plan is active now.");
      if (onSubscriptionChange) {
        onSubscriptionChange({ tier: "free", isActive: true });
      }
    } catch (error) {
      setMessage(`Cancellation failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!currentSubscription?.subscriptionId) {
      setMessage("No active subscription found.");
      return;
    }

    setLoading(true);
    try {
      const response = await requestSubscriptionRefund(
        currentSubscription.subscriptionId,
        "Customer request"
      );
      setCurrentSubscription(response?.data || currentSubscription);
      setMessage("Refund request submitted.");
    } catch (error) {
      setMessage(`Refund failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="subscription-management-container">
      <div className="subscription-header">
        <h2>Subscription Plans</h2>
        <p>Choose the plan that fits your needs.</p>
      </div>

      {message && (
        <div className={`message ${message.toLowerCase().includes("failed") ? "error" : "success"}`}>
          {message}
        </div>
      )}

      <div className="current-subscription-banner">
        <h3>Current Plan: {currentTierData?.name || "Free"}</h3>
        {currentSubscription?.endDate ? (
          <p>Valid until: {new Date(currentSubscription.endDate).toLocaleDateString()}</p>
        ) : null}
        {currentSubscription?.isActive && currentSubscription?.tier !== "free" ? (
          <div className="subscription-actions">
            <button
              className="btn btn-outline"
              onClick={() => setShowCancelConfirm(true)}
              disabled={loading}
            >
              Cancel Subscription
            </button>
            <button className="btn btn-outline" onClick={handleRefund} disabled={loading}>
              Request Refund
            </button>
          </div>
        ) : null}
      </div>

      {showCancelConfirm ? (
        <div className="cancel-confirm-modal">
          <div className="modal-content">
            <h3>Cancel subscription?</h3>
            <p>You will lose paid features immediately.</p>
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={handleCancel} disabled={loading}>
                {loading ? "Cancelling..." : "Yes, cancel"}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setShowCancelConfirm(false)}
                disabled={loading}
              >
                Keep plan
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="subscription-plans-grid">
        {SUBSCRIPTION_TIERS.map((tier) => {
          const isCurrentTier = tier.tier === currentSubscription?.tier;
          return (
            <div
              key={tier.tier}
              className={`plan-card ${isCurrentTier ? "current-plan" : ""}`}
              style={{ borderColor: isCurrentTier ? tier.color : "#ddd" }}
            >
              <div className="plan-header" style={{ backgroundColor: tier.color }}>
                <div className="plan-badge">{tier.badge}</div>
                <h3>{tier.name}</h3>
              </div>
              <div className="plan-price">
                <div className="price-main">
                  INR {tier.price}
                  {tier.price > 0 ? <span className="price-period">/{tier.billingCycle}</span> : null}
                </div>
              </div>
              <div className="plan-features">
                <h4>Features</h4>
                <ul>
                  {tier.features.map((feature) => (
                    <li key={`${tier.tier}-${feature}`}>{feature}</li>
                  ))}
                </ul>
              </div>
              <div className="plan-action">
                {isCurrentTier ? (
                  <button className="btn btn-outline" disabled>
                    Current plan
                  </button>
                ) : tier.tier === "free" ? (
                  <button className="btn btn-outline" onClick={handleCancel} disabled={loading}>
                    Switch to free
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleSubscribe(tier.tier, tier.billingCycle)}
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Subscribe"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="subscription-footer">
        <button className="btn btn-outline" onClick={loadCurrentSubscription} disabled={loading}>
          Refresh Subscription
        </button>
      </div>
    </div>
  );
};

export default SubscriptionManagement;

