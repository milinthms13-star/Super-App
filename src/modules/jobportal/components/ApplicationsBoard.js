import React from "react";
import { APPLICATION_STATUS_OPTIONS } from "../data/jobPortalConstants";

const normalizeStatus = (value = "") => {
  const lowered = String(value || "").toLowerCase();
  if (lowered === "interviewed") return "Interview";
  if (lowered === "hired") return "Selected";
  if (lowered === "shortlisted") return "Shortlisted";
  if (lowered === "rejected") return "Rejected";
  if (lowered === "viewed") return "Viewed";
  if (lowered === "applied") return "Applied";
  return value || "Applied";
};

const ApplicationsBoard = ({ applications, loading }) => (
  <section className="jp-panel">
    <div className="jp-panel-head">
      <h2>Application Tracking</h2>
      <p>Status stages: {APPLICATION_STATUS_OPTIONS.join(" -> ")}</p>
    </div>
    {loading ? <p>Loading application history...</p> : null}
    {!loading && applications.length === 0 ? <p>No applications yet. Apply to jobs and track progress here.</p> : null}
    {!loading && applications.length > 0 ? (
      <div className="jp-table">
        {applications.map((application) => (
          <div key={application._id} className="jp-row">
            <div>
              <strong>{application?.jobId?.title || "Job removed"}</strong>
              <p>{application?.jobId?.company || "Unknown company"} | {application?.jobId?.location || "N/A"}</p>
            </div>
            <div>
              <span className={`jp-status-chip jp-status-${normalizeStatus(application.status).toLowerCase()}`}>
                {normalizeStatus(application.status)}
              </span>
            </div>
            <div>
              <p>Applied: {application.appliedAt ? new Date(application.appliedAt).toLocaleDateString() : "N/A"}</p>
            </div>
          </div>
        ))}
      </div>
    ) : null}
  </section>
);

export default ApplicationsBoard;
