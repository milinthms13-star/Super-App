import React from "react";

const JobCard = ({ job, isSaved, hasApplied, onOpen, onSaveToggle, onApply, matchScore }) => {
  const jobId = job?._id || job?.id;
  const normalizedScore = Number.isFinite(Number(matchScore)) ? Math.max(0, Math.min(100, Number(matchScore))) : null;
  const trustScore = Math.max(
    20,
    Math.min(
      100,
      (job?.isVerified ? 72 : 42) +
        (job?.isFeatured ? 8 : 0) +
        (job?.gulfSafetyChecklist?.agencyLicenseNumber ? 10 : 0)
    )
  );
  const trustLabel = trustScore >= 75 ? "High Trust" : trustScore >= 55 ? "Medium Trust" : "Low Trust";
  return (
    <article className="jp-job-card">
      <div className="jp-job-card-head">
        <h3>{job?.title || "Untitled Role"}</h3>
        <div className="jp-job-badges">
          {normalizedScore !== null ? <span className="jp-badge jp-badge-match">Match {Math.round(normalizedScore)}%</span> : null}
          {job?.isVerified ? <span className="jp-badge jp-badge-verified">Verified</span> : null}
          {job?.isUrgent ? <span className="jp-badge jp-badge-urgent">Urgent</span> : null}
        </div>
      </div>
      <p className="jp-company">{job?.company || "Unknown Company"}</p>
      <p className="jp-meta-line">{job?.location || "Location N/A"} | {job?.salary || "Salary N/A"}</p>
      <p className="jp-meta-line">{job?.experience || "Experience N/A"} | {(job?.workMode || "onsite").toUpperCase()}</p>
      <div className="jp-trust-row">
        <span className={`jp-trust-pill ${trustScore >= 75 ? "high" : trustScore >= 55 ? "medium" : "low"}`}>
          {trustLabel} {trustScore}%
        </span>
        {job?.type === "gulf" ? <span className="jp-status-chip">Gulf Safety Enabled</span> : null}
      </div>
      <div className="jp-card-actions">
        <button type="button" className="jp-btn jp-btn-muted" onClick={() => onOpen(jobId)}>
          Details
        </button>
        <button
          type="button"
          className="jp-btn jp-btn-muted"
          onClick={() => onSaveToggle(jobId)}
          aria-pressed={Boolean(isSaved)}
        >
          {isSaved ? "Saved" : "Save"}
        </button>
        <button type="button" className="jp-btn jp-btn-primary" onClick={() => onApply(jobId)} disabled={Boolean(hasApplied)}>
          {hasApplied ? "Applied" : "Apply"}
        </button>
      </div>
    </article>
  );
};

export default JobCard;
