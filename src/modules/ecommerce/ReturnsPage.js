import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useApp } from "../../contexts/AppContext";
import { formatDisplayDate, isItemReturnEligible, getReturnWindowText } from "../../utils/ecommerceHelpers";
import { sanitizeText } from "../../utils/xssProtection";
import "../../styles/Ecommerce.css";

const RETURN_REASONS = [
  { value: "damaged", label: "Damaged" },
  { value: "not_satisfied", label: "Not Satisfied" },
  { value: "wrong_item", label: "Wrong Item" },
];

const getReturnStatusLabel = (returnRequest) => {
  const refundStatus = String(returnRequest?.refundStatus || "").toLowerCase();
  const status = String(returnRequest?.status || "").toLowerCase();

  if (refundStatus === "completed") {
    return "Refund Completed";
  }

  if (refundStatus === "approved" || status === "approved") {
    return "Return Approved";
  }

  if (refundStatus === "rejected" || status === "rejected") {
    return "Return Rejected";
  }

  return "Pending Review";
};

const getReturnItemKey = (orderId, itemId) => `${String(orderId)}::${String(itemId)}`;

const ReturnsPage = ({ onContinueShopping }) => {
  const { orders, requestItemReturn } = useApp();
  const [returnForms, setReturnForms] = useState({});
  const [submittingMap, setSubmittingMap] = useState({});
  const [feedbackMap, setFeedbackMap] = useState({});
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [returnConfirmData, setReturnConfirmData] = useState(null);

  const orderItems = useMemo(
    () =>
      orders.flatMap((order) =>
        (order.items || []).map((item) => ({
          ...item,
          orderId: order.id,
          orderAmount: order.amount,
          orderCreatedAt: order.createdAt,
          orderStatus: order.status,
        }))
      ),
    [orders]
  );

  const eligibleItems = orderItems.filter((item) => isItemReturnEligible(item));
  const requestedItems = orderItems.filter((item) => item.returnRequest);

  const getFormState = (itemKey) =>
    returnForms[itemKey] || {
      reason: "damaged",
      details: "",
    };

  const setFormField = (itemKey, field, value) => {
    setReturnForms((current) => ({
      ...current,
      [itemKey]: {
        ...getFormState(itemKey),
        [field]: value,
      },
    }));
  };

  const handleSubmitReturn = async (item) => {
    const itemKey = getReturnItemKey(item.orderId, item.id);
    const form = getFormState(itemKey);
    
    // Show confirmation modal instead of directly submitting
    setReturnConfirmData({ item, form, itemKey });
    setShowReturnConfirm(true);
  };

  const handleConfirmReturn = async () => {
    if (!returnConfirmData) return;
    
    const { item, form, itemKey } = returnConfirmData;
    setShowReturnConfirm(false);
    setSubmittingMap((current) => ({ ...current, [itemKey]: true }));
    setFeedbackMap((current) => ({ ...current, [itemKey]: "" }));

    try {
      if (!form.reason) {
        throw new Error("Please select a return reason.");
      }

      if (!form.details.trim()) {
        throw new Error("Please provide details about the issue.");
      }

      await requestItemReturn(item.orderId, item.id, {
        reason: form.reason,
        details: form.details.trim(),
      });
      
      setFeedbackMap((current) => ({
        ...current,
        [itemKey]: "✓ Return request submitted. Refund review is now pending.",
      }));
      
      // Clear form on success
      setReturnForms((current) => {
        const next = { ...current };
        delete next[itemKey];
        return next;
      });
    } catch (error) {
      let errorMessage = "Could not submit the return request right now.";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error("Return submission error:", error);
      
      setFeedbackMap((current) => ({
        ...current,
        [itemKey]: `✗ ${errorMessage}`,
      }));
    } finally {
      setSubmittingMap((current) => ({ ...current, [itemKey]: false }));
      setReturnConfirmData(null);
    }
  };

  return (
    <div className="ecommerce-container">
      <div className="ecommerce-header">
        <h1>Returns & Refunds</h1>
        <p>
          Request a return for damaged items or if you are not satisfied, based on each batch
          return policy.
        </p>
      </div>

      <div className="ecommerce-header-actions">
        <button type="button" className="btn btn-outline" onClick={onContinueShopping}>
          Back to GlobeMart
        </button>
      </div>

      <section className="returns-section">
        <div className="section-heading">
          <h3>Eligible For Return</h3>
          <p>Only items with return-enabled stock batches and an active return window appear here.</p>
        </div>

        {eligibleItems.length === 0 ? (
          <div className="seller-empty-state">
            <h4>No eligible items right now</h4>
            <p>Return-enabled purchases inside the allowed period will appear here.</p>
          </div>
        ) : (
          <div className="returns-grid">
            {eligibleItems.map((item) => {
              const itemKey = getReturnItemKey(item.orderId, item.id);
              const form = getFormState(itemKey);
              return (
                <article className="return-card" key={`${item.orderId}-${item.id}`}>
                  <div className="return-card-top">
                    <div>
                      <h4>{sanitizeText(item.name)}</h4>
                      <p>
                        Order {String(item.orderId).slice(0, 8)} ·{" "}
                        {formatDisplayDate(item.orderCreatedAt)}
                      </p>
                    </div>
                    <span className="listing-status listing-status-approved">Eligible</span>
                  </div>

                  <div className="return-meta">
                    <span>{sanitizeText(item.category) || "GlobeMart item"}</span>
                    <span>{item.batchLabel ? `Batch ${sanitizeText(item.batchLabel)}` : "Batch info not available"}</span>
                    <span>
                      {item.batchLocation || item.location
                        ? `Dispatch from ${sanitizeText(item.batchLocation || item.location)}`
                        : "Dispatch location not available"}
                    </span>
                    <span>{getReturnWindowText(item)}</span>
                  </div>

                  <div className="return-form">
                    <label className="seller-field">
                      <span>Reason</span>
                      <select
                        value={form.reason}
                        onChange={(event) => setFormField(itemKey, "reason", event.target.value)}
                      >
                        {RETURN_REASONS.map((reason) => (
                          <option key={reason.value} value={reason.value}>
                            {reason.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="seller-field">
                      <span>Issue Details (max 500 characters)</span>
                      <textarea
                        value={form.details}
                        onChange={(event) => setFormField(itemKey, "details", event.target.value.slice(0, 500))}
                        placeholder="Share what happened so the refund can be reviewed quickly."
                        rows="4"
                        maxLength={500}
                        aria-label={`Issue details for ${sanitizeText(item.name)} (${form.details.length}/500 characters)`}
                      />
                      <small style={{ color: form.details.length > 450 ? "#d32f2f" : "#999" }}>
                        {form.details.length}/500 characters
                      </small>
                    </label>
                  </div>

                  <div className="seller-card-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleSubmitReturn(item)}
                      disabled={Boolean(submittingMap[itemKey])}
                    >
                      {submittingMap[itemKey] ? "Submitting..." : "Request Return & Refund"}
                    </button>
                  </div>

                  {feedbackMap[itemKey] && <p className="seller-form-message">{feedbackMap[itemKey]}</p>}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="returns-section">
        <div className="section-heading">
          <h3>Submitted Requests</h3>
          <p>Track the latest return and refund status for each requested item.</p>
        </div>

        {requestedItems.length === 0 ? (
          <div className="seller-empty-state">
            <h4>No return requests yet</h4>
            <p>Your submitted refund requests will appear here.</p>
          </div>
        ) : (
          <div className="returns-grid">
            {requestedItems.map((item) => (
              <article className="return-card return-card-requested" key={`${item.orderId}-${item.id}`}>
                <div className="return-card-top">
                  <div>
                    <h4>{sanitizeText(item.name)}</h4>
                    <p>
                      Order {String(item.orderId).slice(0, 8)} ·{" "}
                      {formatDisplayDate(item.orderCreatedAt)}
                    </p>
                  </div>
                  <span className="listing-status listing-status-returned">
                    {getReturnStatusLabel(item.returnRequest)}
                  </span>
                </div>

                <div className="return-meta">
                  <span>{item.batchLabel ? `Batch ${sanitizeText(item.batchLabel)}` : "Batch info not available"}</span>
                  <span>
                    {item.batchLocation || item.location
                      ? `Dispatch from ${sanitizeText(item.batchLocation || item.location)}`
                      : "Dispatch location not available"}
                  </span>
                  <span>
                    Reason: {String(item.returnRequest?.reason || "").replace(/_/g, " ") || "Not shared"}
                  </span>
                  <span>Requested on {formatDisplayDate(item.returnRequest?.requestedAt)}</span>
                </div>

                {item.returnRequest?.details && (
                  <p className="moderation-note">{sanitizeText(item.returnRequest.details)}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="seller-card-actions">
        <button type="button" className="btn btn-outline" onClick={onContinueShopping}>
          Back to Dashboard
        </button>
      </div>

      {/* Return Confirmation Modal */}
      {showReturnConfirm && returnConfirmData && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="return-confirm-title" aria-describedby="return-confirm-desc">
          <div className="modal-content">
            <div className="modal-header">
              <h2 id="return-confirm-title">Confirm Return Request</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowReturnConfirm(false)}
                aria-label="Close return confirmation dialog"
              >
                ×
              </button>
            </div>

            <div className="modal-body" id="return-confirm-desc">
              <div className="return-confirm-section">
                <h3>Product</h3>
                <p className="return-confirm-detail">
                  <strong>{sanitizeText(returnConfirmData.item.name)}</strong>
                </p>
                <p className="return-confirm-detail">
                  Order: {String(returnConfirmData.item.orderId).slice(0, 8)}
                </p>
              </div>

              <div className="return-confirm-section">
                <h3>Return Reason</h3>
                <p className="return-confirm-detail">
                  {RETURN_REASONS.find(r => r.value === returnConfirmData.form.reason)?.label}
                </p>
              </div>

              {returnConfirmData.form.details && (
                <div className="return-confirm-section">
                  <h3>Details</h3>
                  <p className="return-confirm-detail">
                    {sanitizeText(returnConfirmData.form.details)}
                  </p>
                </div>
              )}

              <div className="return-confirm-note">
                <p>
                  Once submitted, our team will review your request within 5-7 business days. 
                  Approved refunds will be processed to your original payment method.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowReturnConfirm(false)}
              >
                Edit Return
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmReturn}
                disabled={submittingMap[returnConfirmData.itemKey]}
              >
                {submittingMap[returnConfirmData.itemKey]
                  ? "Submitting..."
                  : "Confirm Return Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ReturnsPage.propTypes = {
  onContinueShopping: PropTypes.func.isRequired,
};

export default ReturnsPage;
