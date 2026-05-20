import React from "react";
import { ROLE_PRESETS } from "./resumeBuilderUpgradeUtils";

const ResumeRolePresetPanel = ({ onApply = () => {} }) => (
  <div className="resume-role-preset-panel">
    <div className="section-header compact">
      <h3>Role-Wise Quick Fill</h3>
      <p>Add recruiter-friendly skill sets and experience bullets instantly.</p>
    </div>
    <div className="resume-role-preset-grid">
      {Object.entries(ROLE_PRESETS).map(([key, preset]) => (
        <button key={key} type="button" onClick={() => onApply(key)}>
          {preset.label}
        </button>
      ))}
    </div>
  </div>
);

export default ResumeRolePresetPanel;
