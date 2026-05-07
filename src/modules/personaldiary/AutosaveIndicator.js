import React from "react";
import "./AutosaveIndicator.css";

const AutosaveIndicator = ({ status, lastSaveTime, versionNumber }) => {
  return (
    <div className={`autosave-indicator ${status}`}>
      <div className="indicator-content">
        {status === "saving" && (
          <>
            <span className="spinner">⏳</span>
            <span className="text">Auto-saving...</span>
          </>
        )}
        {status === "saved" && (
          <>
            <span className="icon">✓</span>
            <span className="text">
              Saved
              {versionNumber && ` (v${versionNumber})`}
              {lastSaveTime && ` • ${lastSaveTime}`}
            </span>
          </>
        )}
        {status === "error" && (
          <>
            <span className="icon">⚠</span>
            <span className="text">Save failed - retrying...</span>
          </>
        )}
        {status === "offline" && (
          <>
            <span className="icon">📡</span>
            <span className="text">Offline - changes will sync when online</span>
          </>
        )}
      </div>
    </div>
  );
};

export default AutosaveIndicator;
