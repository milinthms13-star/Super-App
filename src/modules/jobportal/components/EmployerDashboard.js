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
  const totalApplications = Number(stats.totalApplications || 0);
  const viewedRate = totalApplications ? Math.round(((stats.viewed || 0) / totalApplications) * 100) : 0;
  const shortlistedRate = totalApplications ? Math.round(((stats.shortlisted || 0) / totalApplications) * 100) : 0;
  const interviewRate = totalApplications ? Math.round(((stats.interview || 0) / totalApplications) * 100) : 0;
  const selectedRate = totalApplications ? Math.round(((stats.selected || 0) / totalApplications) * 100) : 0;
  const funnelBlocks = [
    { id: "applied", label: "Applied", count: stats.applied || totalApplications, rate: 100 },
    { id: "viewed", label: "Viewed", count: stats.viewed || 0, rate: viewedRate },
    { id: "shortlisted", label: "Shortlisted", count: stats.shortlisted || 0, rate: shortlistedRate },
    { id: "interview", label: "Interview", count: stats.interview || 0, rate: interviewRate },
    { id: "selected", label: "Selected", count: stats.selected || 0, rate: selectedRate },
  ];
  const getBlockTone = (rate) => {
    if (rate >= 65) return "high";
    if (rate >= 30) return "medium";
    return "low";
  };

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
        <article><h3>{stats.averageMatchScore || 0}%</h3><p>Avg Match Score</p></article>
      </div>
      <div className="jp-funnel-grid" aria-label="Hiring funnel">
        {funnelBlocks.map((block) => (
          <article key={block.id} className={`jp-funnel-card ${getBlockTone(block.rate)}`}>
            <p>{block.label}</p>
            <h3>{block.count}</h3>
            <span>{block.rate}% conversion</span>
          </article>
        ))}
      </div>

      <h3>Your Jobs</h3>
      {loading ? <p>Loading employer jobs...</p> : null}
      {!loading && jobs.length === 0 ? (
        <div className="jp-empty-state">
          <h4>No jobs posted yet</h4>
          <p>Create your first role and use Canva-ready creative cards to boost response quality.</p>
        </div>
      ) : null}
      {!loading && jobs.length > 0 ? (
        <div className="jp-table">
          {jobs.map((job) => (
            <div key={job._id} className={`jp-row ${selectedJobId === job._id ? "jp-row-active" : ""}`}>
              <div>
                <strong>{job.title}</strong>
                <p>{job.location} | {job.salary}</p>
                {(job.topMatchScore || job.avgMatchScore) ? (
                  <p>Top Match: {job.topMatchScore || 0}% | Avg Match: {job.avgMatchScore || 0}%</p>
                ) : null}
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
                    {Number.isFinite(Number(application?.matchScore)) && Number(application?.matchScore) > 0 ? (
                      <p>AI Match: {Math.round(Number(application.matchScore))}%</p>
                    ) : null}
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
