import React from "react";
import { TIER_LABELS, USER_TIERS } from "../data/beautyaiConstants";
import "../NilaBeautyAI.css";

/**
 * BeautyUsageStats Component
 * Displays user's quota usage and feature availability
 */

const BeautyUsageStats = ({ usageStatus, featureFlags, onUpgrade }) => {
  if (!usageStatus) {
    return (
      <div className="beauty-usage-stats loading">
        <p>Loading usage statistics...</p>
      </div>
    );
  }

  const { tier, analyzeSelfie, plan, progressLog } = usageStatus;

  const getUsagePercentage = (used, limit) => {
    if (!limit || limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return "#f44336";
    if (percentage >= 75) return "#ff9800";
    if (percentage >= 50) return "#ffc107";
    return "#4caf50";
  };

  const formatNextReset = (dateKey) => {
    if (!dateKey) return "Unknown";
    const parts = dateKey.split("-");
    if (parts.length !== 3) return dateKey;
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isFreeUser = tier === USER_TIERS.FREE;

  return (
    <div className="beauty-usage-stats">
      <div className="usage-header">
        <h3>
          Usage Statistics
          <span className={`tier-badge tier-${tier}`}>
            {TIER_LABELS[tier] || tier}
          </span>
        </h3>
      </div>

      <div className="usage-items">
        {/* Selfie Analysis */}
        {analyzeSelfie && (
          <div className="usage-item">
            <div className="usage-info">
              <h4>📸 Selfie Analysis</h4>
              <div className="usage-numbers">
                <span className="used">{analyzeSelfie.used || 0}</span>
                <span className="separator">/</span>
                <span className="limit">{analyzeSelfie.limit || 0}</span>
                <span className="label">today</span>
              </div>
            </div>
            <div className="usage-bar">
              <div
                className="usage-fill"
                style={{
                  width: `${getUsagePercentage(analyzeSelfie.used, analyzeSelfie.limit)}%`,
                  backgroundColor: getUsageColor(
                    getUsagePercentage(analyzeSelfie.used, analyzeSelfie.limit)
                  ),
                }}
              />
            </div>
            <div className="usage-meta">
              <span className="remaining">
                {analyzeSelfie.remaining || 0} remaining
              </span>
              <span className="reset">
                Resets: {formatNextReset(analyzeSelfie.dateKey)}
              </span>
            </div>
          </div>
        )}

        {/* Plan Generation */}
        {plan && (
          <div className="usage-item">
            <div className="usage-info">
              <h4>📋 Beauty Plans</h4>
              <div className="usage-numbers">
                <span className="used">{plan.used || 0}</span>
                <span className="separator">/</span>
                <span className="limit">{plan.limit || 0}</span>
                <span className="label">today</span>
              </div>
            </div>
            <div className="usage-bar">
              <div
                className="usage-fill"
                style={{
                  width: `${getUsagePercentage(plan.used, plan.limit)}%`,
                  backgroundColor: getUsageColor(
                    getUsagePercentage(plan.used, plan.limit)
                  ),
                }}
              />
            </div>
            <div className="usage-meta">
              <span className="remaining">{plan.remaining || 0} remaining</span>
              <span className="reset">Resets: {formatNextReset(plan.dateKey)}</span>
            </div>
          </div>
        )}

        {/* Progress Logs */}
        {progressLog && (
          <div className="usage-item">
            <div className="usage-info">
              <h4>📊 Progress Logs</h4>
              <div className="usage-numbers">
                <span className="used">{progressLog.used || 0}</span>
                <span className="separator">/</span>
                <span className="limit">{progressLog.limit || 0}</span>
                <span className="label">today</span>
              </div>
            </div>
            <div className="usage-bar">
              <div
                className="usage-fill"
                style={{
                  width: `${getUsagePercentage(progressLog.used, progressLog.limit)}%`,
                  backgroundColor: getUsageColor(
                    getUsagePercentage(progressLog.used, progressLog.limit)
                  ),
                }}
              />
            </div>
            <div className="usage-meta">
              <span className="remaining">{progressLog.remaining || 0} remaining</span>
              <span className="reset">Resets: {formatNextReset(progressLog.dateKey)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Feature Availability */}
      {featureFlags && (
        <div className="feature-availability">
          <h4>Available Features</h4>
          <ul className="feature-list">
            <li className={featureFlags.selfieAnalysis ? "available" : "unavailable"}>
              <span className="feature-icon">
                {featureFlags.selfieAnalysis ? "✓" : "✗"}
              </span>
              <span className="feature-name">Selfie Analysis</span>
            </li>
            <li className={featureFlags.planGeneration ? "available" : "unavailable"}>
              <span className="feature-icon">
                {featureFlags.planGeneration ? "✓" : "✗"}
              </span>
              <span className="feature-name">Plan Generation</span>
            </li>
            <li className={featureFlags.progressTracking ? "available" : "unavailable"}>
              <span className="feature-icon">
                {featureFlags.progressTracking ? "✓" : "✗"}
              </span>
              <span className="feature-name">Progress Tracking</span>
            </li>
            <li className={featureFlags.premiumReports ? "available" : "unavailable"}>
              <span className="feature-icon">
                {featureFlags.premiumReports ? "✓" : "✗"}
              </span>
              <span className="feature-name">Premium Reports</span>
              {!featureFlags.premiumReports && isFreeUser && (
                <span className="upgrade-badge">Premium</span>
              )}
            </li>
            <li className={featureFlags.dermatologistReferral ? "available" : "unavailable"}>
              <span className="feature-icon">
                {featureFlags.dermatologistReferral ? "✓" : "✗"}
              </span>
              <span className="feature-name">Dermatologist Referral</span>
              {!featureFlags.dermatologistReferral && isFreeUser && (
                <span className="upgrade-badge">Premium</span>
              )}
            </li>
          </ul>
        </div>
      )}

      {/* Upgrade Prompt */}
      {isFreeUser && onUpgrade && (
        <div className="upgrade-prompt">
          <div className="upgrade-content">
            <h4>🌟 Unlock Premium Features</h4>
            <p>
              Get unlimited selfie analysis, longer beauty plans, premium reports, and
              dermatologist referrals with Premium!
            </p>
            <button type="button" className="upgrade-btn" onClick={onUpgrade}>
              Upgrade to Premium
            </button>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="usage-tips">
        <h4>💡 Usage Tips</h4>
        <ul>
          <li>Daily limits reset at midnight in your timezone</li>
          <li>Save your favorite plans for quick access</li>
          <li>Track progress daily for best results</li>
          {isFreeUser && <li>Upgrade to Premium for unlimited access</li>}
        </ul>
      </div>
    </div>
  );
};

export default BeautyUsageStats;
