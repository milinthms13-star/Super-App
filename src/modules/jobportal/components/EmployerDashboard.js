import React from "react";
import { APPLICATION_STATUS_OPTIONS } from "../data/jobPortalConstants";

const EmployerDashboard = ({
  dashboard,
  loading,
  selectedJobId,
  onSelectJob,
  applicationsByJob,
  updatingApplicationId,
  onUpdateStatus,
}) => {
  const stats = dashboard?.stats || {};
  const jobs = dashboard?.jobs || [];
  const currentApplications = selectedJobId ? applicationsByJob[selectedJobId] || [] : [];

  return (
    <section className="jp-panel">
      <div className="jp-panel-head">
        <h2>Employer Dashboard</h2>
        <p>Real analytics, applicant moderation and interview stage tracking.</p>
      </div>

      <div className="jp-stats-grid">
        <article><h3>{stats.activeJobs || 0}</h3><p>Active Jobs</p></article>
        <article><h3>{stats.totalApplications || 0}</h3><p>Total Applications</p></article>
        <article><h3>{stats.shortlisted || 0}</h3><p>Shortlisted</p></article>
        <article><h3>{stats.selected || 0}</h3><p>Selected</p></article>
      </div>

      <h3>Your Jobs</h3>
      {loading ? <p>Loading employer jobs...</p> : null}
      {!loading && jobs.length === 0 ? <p>No jobs posted yet.</p> : null}
      {!loading && jobs.length > 0 ? (
        <div className="jp-table">
          {jobs.map((job) => (
            <div key={job._id} className={`jp-row ${selectedJobId === job._id ? "jp-row-active" : ""}`}>
              <div>
                <strong>{job.title}</strong>
                <p>{job.location} | {job.salary}</p>
              </div>
              <div>
                <span className="jp-row-count">{job.applicationCount || 0} applicants</span>
              </div>
              <div>
                <button type="button" className="jp-btn jp-btn-muted" onClick={() => onSelectJob(job._id)}>
                  Manage Applicants
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {selectedJobId ? (
        <>
          <h3>Applicants for Selected Job</h3>
          {currentApplications.length === 0 ? <p>No applications for this job yet.</p> : null}
          {currentApplications.length > 0 ? (
            <div className="jp-table">
              {currentApplications.map((application) => (
                <div key={application._id} className="jp-row">
                  <div>
                    <strong>{application?.applicantId?.name || "Applicant"}</strong>
                    <p>{application?.applicantId?.email || "No email available"}</p>
                  </div>
                  <div>
                    <label htmlFor={`status-${application._id}`} className="jp-inline-label">Status</label>
                    <select
                      id={`status-${application._id}`}
                      value={application.status || "Applied"}
                      onChange={(event) => onUpdateStatus(application._id, event.target.value)}
                      disabled={updatingApplicationId === application._id}
                    >
                      {APPLICATION_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p>Applied: {application.appliedAt ? new Date(application.appliedAt).toLocaleDateString() : "N/A"}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
};

export default EmployerDashboard;
