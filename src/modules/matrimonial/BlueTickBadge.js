import React, { useEffect, useMemo, useState } from "react";
import { getBlueTickStatus, requestBlueTickManualReview } from "./api.js";

const BlueTickBadge = ({ profileId, onUpdate }) => {
  const [tickStatus, setTickStatus] = useState("not_issued");
  const [eligibilityScore, setEligibilityScore] = useState(0);
  const [requirementsMet, setRequirementsMet] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const missingRequirements = useMemo(() => {
    const missing = [];
    if (!requirementsMet.kycVerified) missing.push("KYC not verified");
    if (!requirementsMet.noFraudReports) missing.push("Fraud or trust flags present");
    if (!requirementsMet.activeProfile) missing.push("Profile is not active enough");
    if (!requirementsMet.completeProfile) missing.push("Complete your profile details");
    if (!requirementsMet.profileAge3Months) missing.push("Profile age should be at least 3 months");
    if (!requirementsMet.noUserComplaints) missing.push("Too many user complaints");
    if (!requirementsMet.passwordSecurityPassed) missing.push("Security check not passed");
    return missing;
  }, [requirementsMet]);

  const loadStatus = async () => {
    if (!profileId) {
      return;
    }

    setLoading(true);
    try {
      const response = await getBlueTickStatus(profileId);
      const data = response?.data || {};
      setTickStatus(data.status || "not_issued");
      setEligibilityScore(Number(data.eligibilityScore || 0));
      setRequirementsMet(data.requirementsMet || {});
      setMessage("");
    } catch (error) {
      setMessage(`Failed to check status: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const requestManualReview = async () => {
    if (!profileId) {
      return;
    }

    setLoading(true);
    try {
      const response = await requestBlueTickManualReview(profileId);
      setTickStatus(response?.data?.status || "pending_review");
      setMessage("Manual review requested. Our team will review your profile.");
      onUpdate?.(response?.data || {});
    } catch (error) {
      setMessage(`Request failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [profileId]);

  return (
    <div className="blue-tick-container">
      <div className="blue-tick-header">
        <h3>Blue Tick Verification</h3>
      </div>

      {message ? (
        <div className={`message ${message.toLowerCase().includes("failed") ? "error" : "success"}`}>
          {message}
        </div>
      ) : null}

      <div className="eligibility-score">
        <div className="score-bar">
          <div className="score-fill" style={{ width: `${Math.min(eligibilityScore, 100)}%` }} />
        </div>
        <span className="score-text">Eligibility score: {eligibilityScore}/100</span>
      </div>

      <div className={`status-badge status-${tickStatus}`}>
        <span className="status-text">Status: {tickStatus.replace(/_/g, " ")}</span>
      </div>

      <div className="requirements-section">
        <button
          type="button"
          className="btn btn-outline toggle-details"
          onClick={() => setShowDetails((current) => !current)}
        >
          {showDetails ? "Hide checklist" : "Show checklist"}
        </button>

        {showDetails ? (
          <div className="requirements-detail">
            <h4>Eligibility Checklist</h4>
            {missingRequirements.length === 0 ? (
              <p>All required checks are complete.</p>
            ) : (
              <ul className="requirements-list">
                {missingRequirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      <div className="tick-actions">
        <button className="btn btn-secondary" onClick={loadStatus} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh status"}
        </button>
        {tickStatus !== "approved" && eligibilityScore >= 40 ? (
          <button className="btn btn-primary" onClick={requestManualReview} disabled={loading}>
            {loading ? "Submitting..." : "Request manual review"}
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default BlueTickBadge;

