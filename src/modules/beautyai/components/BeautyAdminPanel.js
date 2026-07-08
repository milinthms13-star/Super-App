import React, { useState } from "react";
import {
  TIP_CATEGORIES,
  TIP_CATEGORY_LABELS,
  LANGUAGES,
  LANGUAGE_LABELS,
  USER_TIERS,
  TIER_LABELS,
  VALIDATION,
} from "../data/beautyaiConstants";
import "../NilaBeautyAI.css";

/**
 * BeautyAdminPanel Component
 * Admin controls for managing tips, subscription rules, and monitoring
 */

const BeautyAdminPanel = ({
  subscriptionRules,
  alerts = [],
  stats = null,
  onUpdateRules,
  onCreateTip,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState("overview"); // 'overview', 'tips', 'rules', 'alerts'
  const [editedRules, setEditedRules] = useState(subscriptionRules || {});
  const [newTip, setNewTip] = useState({
    title: "",
    text: "",
    category: TIP_CATEGORIES.GENERAL,
    language: LANGUAGES.EN,
  });
  const [errors, setErrors] = useState({});

  const validateTip = () => {
    const newErrors = {};

    if (!newTip.title || newTip.title.length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    }

    if (newTip.title.length > VALIDATION.TIP_TITLE_MAX) {
      newErrors.title = `Title must be less than ${VALIDATION.TIP_TITLE_MAX} characters`;
    }

    if (!newTip.text || newTip.text.length < 10) {
      newErrors.text = "Tip text must be at least 10 characters";
    }

    if (newTip.text.length > VALIDATION.TIP_TEXT_MAX) {
      newErrors.text = `Tip text must be less than ${VALIDATION.TIP_TEXT_MAX} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateTip = () => {
    if (!validateTip()) {
      return;
    }
    onCreateTip(newTip);
    setNewTip({
      title: "",
      text: "",
      category: TIP_CATEGORIES.GENERAL,
      language: LANGUAGES.EN,
    });
    setErrors({});
  };

  const handleRuleChange = (tier, field, value) => {
    setEditedRules({
      ...editedRules,
      [tier]: {
        ...editedRules[tier],
        [field]: value,
      },
    });
  };

  const handleSaveRules = () => {
    onUpdateRules(editedRules);
  };

  const renderOverview = () => {
    if (!stats) {
      return <p>Loading statistics...</p>;
    }

    return (
      <div className="admin-overview">
        <h4>Platform Statistics</h4>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Users</span>
            <span className="stat-value">{stats.totalUsers?.toLocaleString()}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Active Users</span>
            <span className="stat-value">{stats.activeUsers?.toLocaleString()}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Plans</span>
            <span className="stat-value">{stats.totalPlans?.toLocaleString()}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Selfies</span>
            <span className="stat-value">{stats.totalSelfies?.toLocaleString()}</span>
          </div>
        </div>

        {stats.popularConcerns && stats.popularConcerns.length > 0 && (
          <div className="popular-concerns">
            <h5>Top Concerns</h5>
            <ul>
              {stats.popularConcerns.map((item, idx) => (
                <li key={idx}>
                  <span className="concern-name">{item.concern}</span>
                  <span className="concern-count">{item.count} users</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {stats.recentActivity && (
          <div className="recent-activity">
            <h5>Last 24 Hours</h5>
            <div className="activity-stats">
              <div>Plans: <strong>{stats.recentActivity.last24h?.plans || 0}</strong></div>
              <div>Selfies: <strong>{stats.recentActivity.last24h?.selfies || 0}</strong></div>
              <div>Progress Logs: <strong>{stats.recentActivity.last24h?.progressLogs || 0}</strong></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTipCreator = () => (
    <div className="tip-creator">
      <h4>Create New Tip</h4>
      <div className="form-group">
        <label htmlFor="tip-title">Title *</label>
        <input
          id="tip-title"
          type="text"
          value={newTip.title}
          onChange={(e) => setNewTip({ ...newTip, title: e.target.value })}
          placeholder="e.g., Daily Sunscreen is Essential"
          maxLength={VALIDATION.TIP_TITLE_MAX}
        />
        {errors.title && <span className="error-message">{errors.title}</span>}
        <span className="char-count">
          {newTip.title.length} / {VALIDATION.TIP_TITLE_MAX}
        </span>
      </div>

      <div className="form-group">
        <label htmlFor="tip-text">Tip Content *</label>
        <textarea
          id="tip-text"
          value={newTip.text}
          onChange={(e) => setNewTip({ ...newTip, text: e.target.value })}
          placeholder="Enter the tip content..."
          rows={4}
          maxLength={VALIDATION.TIP_TEXT_MAX}
        />
        {errors.text && <span className="error-message">{errors.text}</span>}
        <span className="char-count">
          {newTip.text.length} / {VALIDATION.TIP_TEXT_MAX}
        </span>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="tip-category">Category</label>
          <select
            id="tip-category"
            value={newTip.category}
            onChange={(e) => setNewTip({ ...newTip, category: e.target.value })}
          >
            {Object.entries(TIP_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="tip-language">Language</label>
          <select
            id="tip-language"
            value={newTip.language}
            onChange={(e) => setNewTip({ ...newTip, language: e.target.value })}
          >
            {Object.entries(LANGUAGE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        className="create-tip-btn"
        onClick={handleCreateTip}
        disabled={isLoading}
      >
        {isLoading ? "Creating..." : "Create Tip"}
      </button>
    </div>
  );

  const renderSubscriptionRules = () => (
    <div className="subscription-rules">
      <h4>Subscription Rules</h4>
      {Object.values(USER_TIERS).map((tier) => (
        <div key={tier} className="tier-rules">
          <h5>{TIER_LABELS[tier]}</h5>
          <div className="rules-grid">
            <div className="rule-field">
              <label>Daily Analysis Limit</label>
              <input
                type="number"
                value={editedRules[tier]?.dailyAnalysisLimit || 0}
                onChange={(e) =>
                  handleRuleChange(tier, "dailyAnalysisLimit", parseInt(e.target.value, 10))
                }
                min="0"
              />
            </div>

            <div className="rule-field">
              <label>Plan Length (Days)</label>
              <input
                type="number"
                value={editedRules[tier]?.weeklyPlanLengthDays || 0}
                onChange={(e) =>
                  handleRuleChange(tier, "weeklyPlanLengthDays", parseInt(e.target.value, 10))
                }
                min="1"
              />
            </div>

            <div className="rule-field">
              <label>Premium Report</label>
              <input
                type="checkbox"
                checked={editedRules[tier]?.allowPremiumReport || false}
                onChange={(e) =>
                  handleRuleChange(tier, "allowPremiumReport", e.target.checked)
                }
              />
            </div>

            <div className="rule-field">
              <label>Dermatologist Referral</label>
              <input
                type="checkbox"
                checked={editedRules[tier]?.allowDermatologistReferral || false}
                onChange={(e) =>
                  handleRuleChange(tier, "allowDermatologistReferral", e.target.checked)
                }
              />
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="save-rules-btn"
        onClick={handleSaveRules}
        disabled={isLoading}
      >
        {isLoading ? "Saving..." : "Save Rules"}
      </button>
    </div>
  );

  const renderAlerts = () => (
    <div className="admin-alerts">
      <h4>System Alerts ({alerts.length})</h4>
      {alerts.length === 0 ? (
        <p className="no-alerts">No alerts at this time.</p>
      ) : (
        <ul className="alerts-list">
          {alerts.map((alert) => (
            <li key={alert._id} className={`alert-item severity-${alert.severity}`}>
              <div className="alert-header">
                <span className="alert-type">{alert.type}</span>
                <span className="alert-time">
                  {new Date(alert.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="alert-message">{alert.message}</div>
              {alert.userId && (
                <div className="alert-user">User: {alert.userId}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <section className="beauty-admin-panel">
      <div className="admin-header">
        <h3>🔧 Admin Panel</h3>
      </div>

      <div className="admin-tabs">
        <button
          type="button"
          className={activeTab === "overview" ? "active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          type="button"
          className={activeTab === "tips" ? "active" : ""}
          onClick={() => setActiveTab("tips")}
        >
          Create Tip
        </button>
        <button
          type="button"
          className={activeTab === "rules" ? "active" : ""}
          onClick={() => setActiveTab("rules")}
        >
          Subscription Rules
        </button>
        <button
          type="button"
          className={activeTab === "alerts" ? "active" : ""}
          onClick={() => setActiveTab("alerts")}
        >
          Alerts {alerts.length > 0 && <span className="badge">{alerts.length}</span>}
        </button>
      </div>

      <div className="admin-content">
        {activeTab === "overview" && renderOverview()}
        {activeTab === "tips" && renderTipCreator()}
        {activeTab === "rules" && renderSubscriptionRules()}
        {activeTab === "alerts" && renderAlerts()}
      </div>
    </section>
  );
};

export default BeautyAdminPanel;
