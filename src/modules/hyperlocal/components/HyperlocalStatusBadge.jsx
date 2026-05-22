import React from "react";

const STATUS_CLASS = {
  success: "hyperlocal-status-badge-success",
  warning: "hyperlocal-status-badge-warning",
  neutral: "hyperlocal-status-badge-neutral",
  danger: "hyperlocal-status-badge-danger",
};

const HyperlocalStatusBadge = ({ label, tone = "neutral" }) => {
  return <span className={`hyperlocal-status-badge ${STATUS_CLASS[tone] || STATUS_CLASS.neutral}`}>{label}</span>;
};

export default HyperlocalStatusBadge;
