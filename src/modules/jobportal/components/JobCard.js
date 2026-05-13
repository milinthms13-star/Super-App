import React from "react";

const JobCard = ({ job, isSaved, hasApplied, onOpen, onSaveToggle, onApply }) => {
  const jobId = job?._id || job?.id;
  return (
    <article className="jp-job-card">
      <div className="jp-job-card-head">
        <h3>{job?.title || "Untitled Role"}</h3>
        <div className="jp-job-badges">
          {job?.isVerified ? <span className="jp-badge jp-badge-verified">Verified</span> : null}
          {job?.isUrgent ? <span className="jp-badge jp-badge-urgent">Urgent</span> : null}
        </div>
      </div>
      <p className="jp-company">{job?.company || "Unknown Company"}</p>
      <p className="jp-meta-line">{job?.location || "Location N/A"} | {job?.salary || "Salary N/A"}</p>
      <p className="jp-meta-line">{job?.experience || "Experience N/A"} | {(job?.workMode || "onsite").toUpperCase()}</p>
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
