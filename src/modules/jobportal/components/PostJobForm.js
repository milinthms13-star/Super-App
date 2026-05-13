import React from "react";
import { JOB_TYPE_OPTIONS, KERALA_DISTRICTS } from "../data/jobPortalConstants";

const PostJobForm = ({ form, errors, onChange, onSubmit, saving, employerVerified }) => {
  const isGulf = form.type === "gulf";
  return (
    <section className="jp-panel">
      <div className="jp-panel-head">
        <h2>Post New Job</h2>
        <p>Production-safe validation with Gulf compliance checks.</p>
      </div>
      <form className="jp-form" onSubmit={onSubmit} noValidate>
        <div className="jp-grid-two">
          <div>
            <label htmlFor="jp-job-title">Job Title</label>
            <input id="jp-job-title" value={form.title} onChange={(e) => onChange("title", e.target.value)} />
            {errors.title ? <p className="jp-error-text">{errors.title}</p> : null}
          </div>
          <div>
            <label htmlFor="jp-job-company">Company</label>
            <input id="jp-job-company" value={form.company} onChange={(e) => onChange("company", e.target.value)} />
            {errors.company ? <p className="jp-error-text">{errors.company}</p> : null}
          </div>
        </div>

        <div className="jp-grid-two">
          <div>
            <label htmlFor="jp-job-type">Job Type</label>
            <select id="jp-job-type" value={form.type} onChange={(e) => onChange("type", e.target.value)}>
              <option value="">Select Type</option>
              {JOB_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {errors.type ? <p className="jp-error-text">{errors.type}</p> : null}
          </div>
          <div>
            <label htmlFor="jp-job-subtype">Subtype</label>
            <input id="jp-job-subtype" value={form.subtype} onChange={(e) => onChange("subtype", e.target.value)} placeholder="Remote, UAE, Delivery..." />
            {errors.subtype ? <p className="jp-error-text">{errors.subtype}</p> : null}
          </div>
        </div>

        <div className="jp-grid-two">
          <div>
            <label htmlFor="jp-job-location">Location</label>
            <input id="jp-job-location" value={form.location} onChange={(e) => onChange("location", e.target.value)} />
            {errors.location ? <p className="jp-error-text">{errors.location}</p> : null}
          </div>
          <div>
            <label htmlFor="jp-job-district">District (Kerala)</label>
            <select id="jp-job-district" value={form.district} onChange={(e) => onChange("district", e.target.value)}>
              <option value="">Select district</option>
              {KERALA_DISTRICTS.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="jp-grid-two">
          <div>
            <label htmlFor="jp-job-salary">Salary</label>
            <input id="jp-job-salary" value={form.salary} onChange={(e) => onChange("salary", e.target.value)} placeholder="45000/month or 8-12 LPA" />
            {errors.salary ? <p className="jp-error-text">{errors.salary}</p> : null}
          </div>
          <div>
            <label htmlFor="jp-job-experience">Experience</label>
            <input id="jp-job-experience" value={form.experience} onChange={(e) => onChange("experience", e.target.value)} placeholder="0-1 years, 3-5 years..." />
            {errors.experience ? <p className="jp-error-text">{errors.experience}</p> : null}
          </div>
        </div>

        <div className="jp-grid-two">
          <div>
            <label htmlFor="jp-job-mode">Work Mode</label>
            <select id="jp-job-mode" value={form.workMode} onChange={(e) => onChange("workMode", e.target.value)}>
              <option value="">Select mode</option>
              <option value="onsite">Onsite</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div>
            <label htmlFor="jp-job-kind">Employment Type</label>
            <select id="jp-job-kind" value={form.jobType} onChange={(e) => onChange("jobType", e.target.value)}>
              <option value="">Select employment type</option>
              <option value="fulltime">Full-time</option>
              <option value="parttime">Part-time</option>
              <option value="contract">Contract</option>
              <option value="freelance">Freelance</option>
              <option value="temporary">Temporary</option>
            </select>
          </div>
        </div>

        <label htmlFor="jp-job-skills">Skills (comma separated)</label>
        <input id="jp-job-skills" value={form.skills} onChange={(e) => onChange("skills", e.target.value)} />
        <label htmlFor="jp-job-benefits">Benefits (comma separated)</label>
        <input id="jp-job-benefits" value={form.benefits} onChange={(e) => onChange("benefits", e.target.value)} />

        <label htmlFor="jp-job-description">Description</label>
        <textarea id="jp-job-description" rows={5} value={form.description} onChange={(e) => onChange("description", e.target.value)} />
        {errors.description ? <p className="jp-error-text">{errors.description}</p> : null}

        <div className="jp-grid-two">
          <div>
            <label htmlFor="jp-contact-email">Contact Email</label>
            <input id="jp-contact-email" type="email" value={form.contactEmail} onChange={(e) => onChange("contactEmail", e.target.value)} />
            {errors.contactEmail ? <p className="jp-error-text">{errors.contactEmail}</p> : null}
          </div>
          <div>
            <label htmlFor="jp-contact-phone">Contact Phone</label>
            <input id="jp-contact-phone" value={form.contactPhone} onChange={(e) => onChange("contactPhone", e.target.value)} />
            {errors.contactPhone ? <p className="jp-error-text">{errors.contactPhone}</p> : null}
          </div>
        </div>

        {isGulf ? (
          <div className="jp-safety-box">
            <h4>Gulf Verification</h4>
            {!employerVerified ? <p className="jp-warning-text">Your employer profile must be verified before posting Gulf jobs.</p> : null}
            <div className="jp-grid-two">
              <div>
                <label htmlFor="jp-license">Agency License Number</label>
                <input id="jp-license" value={form.agencyLicenseNumber} onChange={(e) => onChange("agencyLicenseNumber", e.target.value)} />
                {errors.agencyLicenseNumber ? <p className="jp-error-text">{errors.agencyLicenseNumber}</p> : null}
              </div>
              <div>
                <label htmlFor="jp-visaType">Visa Type</label>
                <input id="jp-visaType" value={form.visaType} onChange={(e) => onChange("visaType", e.target.value)} />
                {errors.visaType ? <p className="jp-error-text">{errors.visaType}</p> : null}
              </div>
            </div>
            <label htmlFor="jp-contract-terms">Contract Terms</label>
            <textarea id="jp-contract-terms" rows={3} value={form.contractTerms} onChange={(e) => onChange("contractTerms", e.target.value)} />
            {errors.contractTerms ? <p className="jp-error-text">{errors.contractTerms}</p> : null}
            <div className="jp-grid-two">
              <label className="jp-checkbox-row">
                <input type="checkbox" checked={Boolean(form.accommodationProvided)} onChange={(e) => onChange("accommodationProvided", e.target.checked)} />
                Accommodation Provided
              </label>
              <label className="jp-checkbox-row">
                <input type="checkbox" checked={Boolean(form.medicalInsuranceProvided)} onChange={(e) => onChange("medicalInsuranceProvided", e.target.checked)} />
                Medical Insurance
              </label>
            </div>
          </div>
        ) : null}

        <div className="jp-grid-two">
          <label className="jp-checkbox-row">
            <input type="checkbox" checked={Boolean(form.isUrgent)} onChange={(e) => onChange("isUrgent", e.target.checked)} />
            Mark Urgent
          </label>
          <label className="jp-checkbox-row">
            <input type="checkbox" checked={Boolean(form.isFeatured)} onChange={(e) => onChange("isFeatured", e.target.checked)} />
            Featured Listing
          </label>
        </div>

        <button type="submit" className="jp-btn jp-btn-primary" disabled={saving}>
          {saving ? "Publishing..." : "Publish Job"}
        </button>
      </form>
    </section>
  );
};

export default PostJobForm;
