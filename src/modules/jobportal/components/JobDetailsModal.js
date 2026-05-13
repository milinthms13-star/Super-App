import React, { useEffect, useMemo, useState } from "react";
import { GULF_SAFETY_CHECKLIST } from "../data/jobPortalConstants";

const JobDetailsModal = ({
  job,
  open,
  hasApplied,
  onClose,
  onApply,
  onSaveToggle,
  isSaved,
  onReportFakeJob,
  submitting,
}) => {
  const [coverLetter, setCoverLetter] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [availability, setAvailability] = useState("immediate");
  const [resumeFile, setResumeFile] = useState(null);
  const [reportReason, setReportReason] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setCoverLetter("");
      setExpectedSalary("");
      setAvailability("immediate");
      setResumeFile(null);
      setReportReason("");
    }
  }, [open]);

  const whatsappLink = useMemo(() => {
    const phone = String(job?.contactPhone || "").replace(/[^\d+]/g, "");
    if (!phone) return "";
    const message = encodeURIComponent(`Hi, I am interested in "${job?.title || "this role"}".`);
    return `https://wa.me/${phone.replace("+", "")}?text=${message}`;
  }, [job]);

  if (!open || !job) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    onApply(job._id || job.id, {
      coverLetter,
      expectedSalary,
      availability,
      resumeFile,
    });
  };

  return (
    <div className="jp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="jp-job-title">
      <div className="jp-modal">
        <header className="jp-modal-head">
          <h2 id="jp-job-title">{job.title}</h2>
          <button type="button" className="jp-icon-btn" onClick={onClose} aria-label="Close dialog">
            x
          </button>
        </header>
        <section className="jp-modal-body">
          <p><strong>{job.company}</strong> | {job.location}</p>
          <p>{job.salary} | {job.experience} | {(job.workMode || "onsite").toUpperCase()}</p>
          <p>{job.description}</p>

          {(job.skills || []).length ? (
            <div className="jp-chip-row">
              {job.skills.map((skill) => (
                <span key={skill} className="jp-chip">{skill}</span>
              ))}
            </div>
          ) : null}

          {job.type === "gulf" ? (
            <div className="jp-safety-box">
              <h4>Gulf Job Safety Checklist</h4>
              <ul>
                {GULF_SAFETY_CHECKLIST.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="jp-warning-text">License: {job?.gulfSafetyChecklist?.agencyLicenseNumber || "Not provided"}</p>
            </div>
          ) : null}

          <form className="jp-apply-form" onSubmit={handleSubmit}>
            <label htmlFor="jp-cover-letter">Cover Letter</label>
            <textarea
              id="jp-cover-letter"
              rows={4}
              value={coverLetter}
              onChange={(event) => setCoverLetter(event.target.value)}
              placeholder="Why are you a strong fit for this role?"
            />

            <div className="jp-grid-two">
              <div>
                <label htmlFor="jp-expected-salary">Expected Salary</label>
                <input
                  id="jp-expected-salary"
                  value={expectedSalary}
                  onChange={(event) => setExpectedSalary(event.target.value)}
                  placeholder="e.g. 45000/month"
                />
              </div>
              <div>
                <label htmlFor="jp-availability">Availability</label>
                <select
                  id="jp-availability"
                  value={availability}
                  onChange={(event) => setAvailability(event.target.value)}
                >
                  <option value="immediate">Immediate</option>
                  <option value="15-days">15 Days</option>
                  <option value="30-days">30 Days</option>
                  <option value="notice-period">Notice Period</option>
                </select>
              </div>
            </div>

            <label htmlFor="jp-resume-upload">Resume Upload</label>
            <input
              id="jp-resume-upload"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(event) => setResumeFile(event.target.files?.[0] || null)}
            />

            <div className="jp-card-actions jp-sticky-apply">
              <button type="button" className="jp-btn jp-btn-muted" onClick={() => onSaveToggle(job._id || job.id)}>
                {isSaved ? "Saved" : "Save Job"}
              </button>
              <button type="submit" className="jp-btn jp-btn-primary" disabled={hasApplied || submitting}>
                {hasApplied ? "Applied" : submitting ? "Applying..." : "Apply Now"}
              </button>
            </div>
          </form>

          <div className="jp-support-row">
            {whatsappLink ? (
              <a className="jp-btn jp-btn-muted" href={whatsappLink} target="_blank" rel="noreferrer">
                WhatsApp Contact
              </a>
            ) : null}
            <input
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              placeholder="Report fake job reason"
              aria-label="Report fake job reason"
            />
            <button
              type="button"
              className="jp-btn jp-btn-danger"
              onClick={() => onReportFakeJob(job._id || job.id, reportReason)}
            >
              Report Fake Job
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default JobDetailsModal;
