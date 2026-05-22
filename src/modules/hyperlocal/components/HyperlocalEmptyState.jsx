import React from "react";

const HyperlocalEmptyState = ({ title, subtitle = "", compact = false }) => {
  return (
    <div className={`hyperlocal-empty-card${compact ? " hyperlocal-empty-card-compact" : ""}`}>
      <p className="hyperlocal-empty-title">{title}</p>
      {subtitle ? <p className="hyperlocal-empty-subtitle">{subtitle}</p> : null}
    </div>
  );
};

export default HyperlocalEmptyState;
