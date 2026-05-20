import React from "react";

const MATRIMONIAL_QUICK_ACTIONS = [
  {
    key: "create-profile",
    icon: "Profile",
    title: "Create Profile",
    subtitle: "Add basic, family and preference details",
    targetTab: "profile",
  },
  {
    key: "discover",
    icon: "Match",
    title: "Find Matches",
    subtitle: "View best verified matches first",
    targetTab: "discover",
  },
  {
    key: "horoscope",
    icon: "Star",
    title: "Horoscope Match",
    subtitle: "Check star, rashi and compatibility",
    targetTab: "horoscope",
  },
  {
    key: "interests",
    icon: "Inbox",
    title: "Interests",
    subtitle: "Track sent and received interests",
    targetTab: "interests",
  },
];

const MatrimonialQuickActions = ({ onAction, completion = 0, isVerified = false }) => (
  <section className="matrimonial-quick-actions-panel">
    <div className="matrimonial-quick-header">
      <div>
        <span className="matrimonial-eyebrow">SoulMatch</span>
        <h2>Find trusted matches faster</h2>
        <p>Complete profile, verify identity, set privacy and contact only genuine matches.</p>
      </div>
      <div className="matrimonial-profile-score-card">
        <strong>{completion}%</strong>
        <span>Profile completed</span>
        <small>{isVerified ? "Blue tick verified" : "Verify profile to build trust"}</small>
      </div>
    </div>

    <div className="matrimonial-quick-grid">
      {MATRIMONIAL_QUICK_ACTIONS.map((action) => (
        <button
          key={action.key}
          type="button"
          className="matrimonial-quick-action-card"
          onClick={() => onAction?.(action.targetTab)}
        >
          <span className="matrimonial-quick-icon">{action.icon}</span>
          <strong>{action.title}</strong>
          <small>{action.subtitle}</small>
        </button>
      ))}
    </div>
  </section>
);

export default MatrimonialQuickActions;
