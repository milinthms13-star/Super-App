import React from "react";
import { QUICK_RESUME_ACTIONS } from "./resumeBuilderUpgradeUtils";

const ResumeQuickStart = ({ onAction = () => {} }) => (
  <section className="resume-quick-start-panel">
    <div>
      <p className="resume-eyebrow">Start Faster</p>
      <h2>Create a job-ready resume in minutes</h2>
      <p>Choose your goal and we will pre-fill the right format, template, and sections.</p>
    </div>
    <div className="resume-quick-action-grid">
      {QUICK_RESUME_ACTIONS.map((item) => (
        <button key={item.id} type="button" className="resume-quick-action-card" onClick={() => onAction(item.id)}>
          <span>{item.icon}</span>
          <strong>{item.title}</strong>
          <small>{item.subtitle}</small>
        </button>
      ))}
    </div>
  </section>
);

export default ResumeQuickStart;
