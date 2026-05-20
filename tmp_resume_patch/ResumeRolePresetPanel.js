// src/modules/resumebuilder/ResumeRolePresetPanel.js
import React from 'react';
import { ROLE_PRESETS } from './resumeBuilderUpgradeUtils';

const ResumeRolePresetPanel = ({ onApply }) => (
  <div className="resume-role-preset-panel">
    <div className="section-header compact">
      <h3>Role-wise quick fill</h3>
      <p>Use this to quickly add recruiter-friendly skills and bullet examples.</p>
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
