import React from "react";
import { TOURISM_QUICK_ACTIONS } from "../tourismUpgradeUtils";

const TourismQuickActions = ({ onApplyQuickAction }) => (
  <section className="tourism-quick-actions-card">
    <div>
      <p className="tourism-eyebrow">Start fast</p>
      <h3>What trip do you want?</h3>
      <p>Choose a popular flow first. Advanced filters can stay below.</p>
    </div>

    <div className="tourism-quick-actions-grid">
      {TOURISM_QUICK_ACTIONS.map((action) => (
        <button key={action.id} type="button" onClick={() => onApplyQuickAction(action)}>
          <span>{action.icon}</span>
          <strong>{action.label}</strong>
        </button>
      ))}
    </div>
  </section>
);

export default TourismQuickActions;
