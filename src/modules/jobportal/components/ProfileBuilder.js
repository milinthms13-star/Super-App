import React from "react";

const ProfileBuilder = ({
  profileForm,
  onChange,
  onFileChange,
  onSubmit,
  saving,
  resumeScore,
}) => (
  <section className="jp-panel">
    <div className="jp-panel-head">
      <h2>Job Seeker Profile</h2>
      <p>Complete profile improves application visibility.</p>
      <span className="jp-score-pill">Resume Score: {resumeScore}%</span>
    </div>
    <form className="jp-form" onSubmit={onSubmit}>
      <div className="jp-grid-two">
        <div>
          <label htmlFor="jp-fullName">Full Name</label>
          <input id="jp-fullName" value={profileForm.fullName} onChange={(e) => onChange("fullName", e.target.value)} required />
        </div>
        <div>
          <label htmlFor="jp-email">Email</label>
          <input id="jp-email" type="email" value={profileForm.email} onChange={(e) => onChange("email", e.target.value)} required />
        </div>
      </div>
      <div className="jp-grid-two">
        <div>
          <label htmlFor="jp-phone">Phone</label>
          <input id="jp-phone" value={profileForm.phone} onChange={(e) => onChange("phone", e.target.value)} />
        </div>
        <div>
          <label htmlFor="jp-experience">Experience</label>
          <select id="jp-experience" value={profileForm.experience} onChange={(e) => onChange("experience", e.target.value)}>
            <option value="">Select</option>
            <option value="fresher">Fresher</option>
            <option value="0-1">0-1</option>
            <option value="1-3">1-3</option>
            <option value="3-5">3-5</option>
            <option value="5-10">5-10</option>
            <option value="10+">10+</option>
          </select>
        </div>
      </div>
      <label htmlFor="jp-skills">Skills (comma separated)</label>
      <input id="jp-skills" value={profileForm.skills} onChange={(e) => onChange("skills", e.target.value)} />

      <div className="jp-grid-two">
        <div>
          <label htmlFor="jp-expectedSalary">Expected Salary</label>
          <input id="jp-expectedSalary" value={profileForm.expectedSalary} onChange={(e) => onChange("expectedSalary", e.target.value)} />
        </div>
        <div>
          <label htmlFor="jp-availability">Availability</label>
          <select id="jp-availability" value={profileForm.availability} onChange={(e) => onChange("availability", e.target.value)}>
            <option value="immediate">Immediate</option>
            <option value="part-time">Part-time</option>
            <option value="remote-only">Remote only</option>
            <option value="gulf-ready">Gulf ready</option>
            <option value="notice-period">Notice period</option>
          </select>
        </div>
      </div>

      <label htmlFor="jp-prefLocations">Preferred Locations</label>
      <input id="jp-prefLocations" value={profileForm.preferredLocations} onChange={(e) => onChange("preferredLocations", e.target.value)} placeholder="Kochi, Trivandrum" />

      <div className="jp-grid-two">
        <div>
          <label htmlFor="jp-resume-file">Resume (PDF/DOC)</label>
          <input id="jp-resume-file" type="file" accept=".pdf,.doc,.docx" onChange={(e) => onFileChange("resume", e.target.files?.[0] || null)} />
        </div>
        <div>
          <label htmlFor="jp-video-file">Video Intro</label>
          <input id="jp-video-file" type="file" accept="video/*" onChange={(e) => onFileChange("videoIntro", e.target.files?.[0] || null)} />
        </div>
      </div>

      <div className="jp-grid-two">
        <div>
          <label htmlFor="jp-voice-file">Voice Resume</label>
          <input id="jp-voice-file" type="file" accept="audio/*" onChange={(e) => onFileChange("voiceResume", e.target.files?.[0] || null)} />
        </div>
        <div className="jp-checkbox-row">
          <input id="jp-gulf-ready" type="checkbox" checked={Boolean(profileForm.gulfReady)} onChange={(e) => onChange("gulfReady", e.target.checked)} />
          <label htmlFor="jp-gulf-ready">Open to verified Gulf jobs</label>
        </div>
      </div>

      <button type="submit" className="jp-btn jp-btn-primary" disabled={saving}>
        {saving ? "Saving..." : "Save Profile"}
      </button>
    </form>
  </section>
);

export default ProfileBuilder;
