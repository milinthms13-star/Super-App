import React, { useState } from "react";
import "../NilaBeautyAI.css";

/**
 * BeautyConsent Component
 * Manages user consent for selfie analysis and plan generation
 */

const BeautyConsent = ({
  consentStatus,
  onGrantConsent,
  onRevokeConsent,
  isLoading = false,
}) => {
  const [showDetails, setShowDetails] = useState({
    selfieAnalysis: false,
    planGeneration: false,
  });

  const handleToggleConsent = (consentType, currentStatus) => {
    if (currentStatus) {
      if (window.confirm(
        "Are you sure you want to revoke this consent? This will prevent the feature from working."
      )) {
        onRevokeConsent(consentType);
      }
    } else {
      onGrantConsent(consentType);
    }
  };

  const toggleDetails = (section) => {
    setShowDetails({
      ...showDetails,
      [section]: !showDetails[section],
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not granted";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="beauty-consent">
      <div className="consent-header">
        <h3>Privacy & Consent Settings</h3>
        <p className="consent-description">
          Manage your data permissions for BeautyAI features. We respect your privacy and
          will only use your data as explicitly consented.
        </p>
        {consentStatus?.consentVersion && (
          <p className="consent-version">Consent Version: {consentStatus.consentVersion}</p>
        )}
      </div>

      <div className="consent-sections">
        {/* Selfie Analysis Consent */}
        <div className="consent-section">
          <div className="consent-item">
            <div className="consent-info">
              <h4>
                📸 Selfie Analysis
                <span className={`status-badge ${consentStatus?.selfieAnalysis?.granted ? "granted" : "not-granted"}`}>
                  {consentStatus?.selfieAnalysis?.granted ? "Granted" : "Not Granted"}
                </span>
              </h4>
              <p className="consent-summary">
                Allow us to analyze your uploaded selfies to provide personalized skin care
                recommendations.
              </p>
              {consentStatus?.selfieAnalysis?.granted && (
                <p className="consent-date">
                  Granted on: {formatDate(consentStatus.selfieAnalysis.grantedAt)}
                </p>
              )}
              <button
                type="button"
                className="details-toggle"
                onClick={() => toggleDetails("selfieAnalysis")}
              >
                {showDetails.selfieAnalysis ? "Hide" : "Show"} Details
              </button>
            </div>

            {showDetails.selfieAnalysis && (
              <div className="consent-details">
                <h5>What we collect:</h5>
                <ul>
                  <li>Your uploaded selfie image</li>
                  <li>Analysis metadata (skin type, detected concerns)</li>
                  <li>Timestamp of analysis</li>
                </ul>
                <h5>How we use it:</h5>
                <ul>
                  <li>To detect your skin type and concerns</li>
                  <li>To generate personalized recommendations</li>
                  <li>To track your skin progress over time</li>
                </ul>
                <h5>Your rights:</h5>
                <ul>
                  <li>You can delete your selfies at any time</li>
                  <li>You can revoke this consent at any time</li>
                  <li>Your images are stored securely and never shared</li>
                </ul>
              </div>
            )}

            <div className="consent-action">
              <button
                type="button"
                className={`consent-btn ${consentStatus?.selfieAnalysis?.granted ? "revoke" : "grant"}`}
                onClick={() =>
                  handleToggleConsent("selfieAnalysis", consentStatus?.selfieAnalysis?.granted)
                }
                disabled={isLoading}
              >
                {consentStatus?.selfieAnalysis?.granted ? "Revoke Consent" : "Grant Consent"}
              </button>
            </div>
          </div>
        </div>

        {/* Plan Generation Consent */}
        <div className="consent-section">
          <div className="consent-item">
            <div className="consent-info">
              <h4>
                📋 Beauty Plan Generation
                <span className={`status-badge ${consentStatus?.planGeneration?.granted ? "granted" : "not-granted"}`}>
                  {consentStatus?.planGeneration?.granted ? "Granted" : "Not Granted"}
                </span>
              </h4>
              <p className="consent-summary">
                Allow us to create and store personalized beauty care plans based on your
                preferences and analysis.
              </p>
              {consentStatus?.planGeneration?.granted && (
                <p className="consent-date">
                  Granted on: {formatDate(consentStatus.planGeneration.grantedAt)}
                </p>
              )}
              <button
                type="button"
                className="details-toggle"
                onClick={() => toggleDetails("planGeneration")}
              >
                {showDetails.planGeneration ? "Hide" : "Show"} Details
              </button>
            </div>

            {showDetails.planGeneration && (
              <div className="consent-details">
                <h5>What we collect:</h5>
                <ul>
                  <li>Your skin and hair type information</li>
                  <li>Selected concerns and preferences</li>
                  <li>Budget and event information</li>
                  <li>Generated beauty plans and routines</li>
                </ul>
                <h5>How we use it:</h5>
                <ul>
                  <li>To create customized beauty care plans</li>
                  <li>To recommend suitable products and routines</li>
                  <li>To track your plan adherence and progress</li>
                </ul>
                <h5>Your rights:</h5>
                <ul>
                  <li>You can delete your plans at any time</li>
                  <li>You can edit and customize any plan</li>
                  <li>You can revoke this consent at any time</li>
                </ul>
              </div>
            )}

            <div className="consent-action">
              <button
                type="button"
                className={`consent-btn ${consentStatus?.planGeneration?.granted ? "revoke" : "grant"}`}
                onClick={() =>
                  handleToggleConsent("planGeneration", consentStatus?.planGeneration?.granted)
                }
                disabled={isLoading}
              >
                {consentStatus?.planGeneration?.granted ? "Revoke Consent" : "Grant Consent"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="consent-footer">
        <p className="privacy-note">
          🔒 Your privacy is important to us. All data is encrypted and stored securely.
          We never share your personal information with third parties without your explicit consent.
        </p>
        <p className="contact-info">
          Have questions about your data? <a href="/support">Contact Support</a>
        </p>
      </div>
    </div>
  );
};

export default BeautyConsent;
