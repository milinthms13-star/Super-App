import React from "react";

const HyperlocalMetricCard = ({ label, value, helper = "", trend = "" }) => {
  return (
    <article className="hyperlocal-metric-card">
      <p className="hyperlocal-metric-label">{label}</p>
      <p className="hyperlocal-metric-value">{value}</p>
      {helper ? <p className="hyperlocal-metric-helper">{helper}</p> : null}
      {trend ? <p className="hyperlocal-metric-trend">{trend}</p> : null}
    </article>
  );
};

export default HyperlocalMetricCard;
