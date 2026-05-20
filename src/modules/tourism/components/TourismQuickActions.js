import React from "react";
import { TOURISM_QUICK_ACTIONS } from "../tourismUpgradeUtils";

const TourismQuickActions = ({ onApplyQuickAction }) => (
  <section className="tourism-quick-actions-card">
    <div>
      <p className="tourism-kicker">Start Fast</p>
      <h3>Pick a trip intent</h3>
      <p>Choose a common flow first. You can still refine with full filters.</p>
    </div>

    <div className="tourism-quick-actions-grid">
      {TOURISM_QUICK_ACTIONS.map((action) => (
        <button key={action.id} type="button" onClick={() => onApplyQuickAction(action)}>
          <strong>{action.label}</strong>
        </button>
      ))}
    </div>
  </section>
);

export default TourismQuickActions;
