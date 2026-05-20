import React from "react";
import { EDUCATION_QUICK_ACTIONS } from "./educationUpgradeUtils";

const EducationQuickActions = ({ onAction }) => (
  <section className="education-quick-actions" aria-label="Education quick actions">
    {EDUCATION_QUICK_ACTIONS.map((action) => (
      <button
        key={action.id}
        type="button"
        className="education-quick-action-card"
        onClick={() => onAction(action)}
      >
        <span className="education-quick-icon">{action.icon}</span>
        <strong>{action.title}</strong>
        <small>{action.description}</small>
      </button>
    ))}
  </section>
);

export default EducationQuickActions;
