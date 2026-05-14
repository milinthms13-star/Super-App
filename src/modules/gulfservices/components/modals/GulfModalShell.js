import React from "react";
import GulfModal from "../GulfModal";

const GulfModalShell = ({
  activeModal,
  closeModal,
  loading,
  submitVisa,
  visaForm,
  setVisaForm,
  submitJobApplication,
  selectedCountry,
  setSelectedCountry,
  availableCountries,
  availableJobCategories,
  jobFilters,
  setJobFilters,
  filteredJobs,
  selectedJob,
  setSelectedJob,
  getRecruiterDetails,
  jobApplicationForm,
  setJobApplicationForm,
  handleInputChange,
  handleFileChange,
  submitAttestation,
  attestationForm,
  setAttestationForm,
  submitLead,
  leadForm,
  setLeadForm,
  supportWhatsapp,
  submitFraudReport,
  fraudForm,
  setFraudForm,
}) => {
  if (!activeModal) return null;

  if (activeModal === "visa") {
    return (
      <GulfModal activeModal={activeModal}>
        <div className="gulf-services-modal-content">
          <button
            type="button"
            className="gulf-services-modal-close"
            aria-label="Close visa support dialog"
            onClick={closeModal}
          >
            ✕
          </button>
          <h2>Visa Enquiry & Support</h2>
          <form className="gulf-services-form" onSubmit={submitVisa}>
            <div className="gulf-services-form-grid">
              <label>
                Full name
                <input name="fullName" value={visaForm.fullName} onChange={handleInputChange(setVisaForm)} required />
              </label>
              <label>
                Email
                <input name="email" type="email" value={visaForm.email} onChange={handleInputChange(setVisaForm)} required />
              </label>
              <label>
                Phone
                <input name="phone" value={visaForm.phone} onChange={handleInputChange(setVisaForm)} required />
              </label>
              <label>
                Country
                <select name="country" value={visaForm.country} onChange={handleInputChange(setVisaForm)}>
                  {availableCountries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Visa type
                <select name="visaType" value={visaForm.visaType} onChange={handleInputChange(setVisaForm)}>
                  <option value="Visit">Visit</option>
                  <option value="Employment">Employment</option>
                  <option value="Family">Family</option>
                  <option value="Student">Student</option>
                  <option value="Business">Business</option>
                </select>
              </label>
              <label>
                Urgency
                <select name="urgency" value={visaForm.urgency} onChange={handleInputChange(setVisaForm)}>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
              </label>
              <label>
                Current location
                <input
                  name="currentLocation"
                  value={visaForm.currentLocation}
                  onChange={handleInputChange(setVisaForm)}
                  required
                />
              </label>
              <label className="full-width">
                Additional message
                <textarea name="message" value={visaForm.message} onChange={handleInputChange(setVisaForm)} rows="3" />
              </label>
            </div>
            <div className="gulf-services-form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Submit visa enquiry
              </button>
              <button type="button" className="btn btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => window.open(`https://wa.me/${supportWhatsapp}?text=I%20need%20visa%20support`, "_blank")}
              >
                WhatsApp Support
              </button>
            </div>
          </form>
        </div>
      </GulfModal>
    );
  }

  if (activeModal === "jobs") {
    return (
      <GulfModal activeModal={activeModal} size="large">
        <div className="gulf-services-modal-content gulf-services-modal-large">
          <button
            type="button"
            className="gulf-services-modal-close"
            aria-label="Close jobs dialog"
            onClick={closeModal}
          >
            ✕
          </button>
          <h2>Gulf Jobs & Verified Applications</h2>
          <div className="gulf-services-modal-grid">
            <div className="gulf-services-modal-filters">
              <h3>Filters</h3>
              <label>
                Country
                <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)}>
                  {availableCountries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Category
                <select name="category" value={jobFilters.category} onChange={handleInputChange(setJobFilters)}>
                  <option value="">All categories</option>
                  {availableJobCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Min salary (₹)
                <input name="salaryMin" type="number" value={jobFilters.salaryMin} onChange={handleInputChange(setJobFilters)} />
              </label>
              <label>
                Max salary (₹)
                <input name="salaryMax" type="number" value={jobFilters.salaryMax} onChange={handleInputChange(setJobFilters)} />
              </label>
              <label>
                Visa type
                <select name="visaType" value={jobFilters.visaType} onChange={handleInputChange(setJobFilters)}>
                  <option value="">Any</option>
                  <option value="Employment">Employment</option>
                  <option value="Family">Family</option>
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={jobFilters.accommodation === true}
                  onChange={(e) =>
                    setJobFilters((prev) => ({ ...prev, accommodation: e.target.checked ? true : null }))
                  }
                />
                Accommodation provided
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={jobFilters.food === true}
                  onChange={(e) => setJobFilters((prev) => ({ ...prev, food: e.target.checked ? true : null }))}
                />
                Food provided
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={jobFilters.urgentOnly}
                  onChange={(e) => setJobFilters((prev) => ({ ...prev, urgentOnly: e.target.checked }))}
                />
                Urgent hiring only
              </label>
            </div>
            <div className="gulf-services-modal-jobs">
              <div className="gulf-services-job-list">
                {filteredJobs.length ? (
                  filteredJobs.map((job) => (
                    <button
                      key={job.id}
                      type="button"
                      className={`gulf-services-job-card ${selectedJob?.id === job.id ? "selected" : ""}`}
                      onClick={() => setSelectedJob(job)}
                    >
                      <div className="gulf-services-job-card-header">
                        <strong>{job.title}</strong>
                        {job.urgentHiring && <span className="gulf-services-tag-urgent">Urgent</span>}
                      </div>
                      <span>{job.company}</span>
                      <p>{job.summary}</p>
                      <div className="gulf-services-job-meta">
                        <span>₹{job.salary?.min}-{job.salary?.max}</span>
                        <span>{job.country}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="gulf-services-card">
                    <p>No jobs found for this filter.</p>
                  </div>
                )}
              </div>
              {selectedJob && (
                <div className="gulf-services-job-detail-modal">
                  <h3>{selectedJob.title}</h3>
                  <p className="gulf-services-company">{selectedJob.company}</p>
                  <div className="gulf-services-job-details">
                    <p>
                      <strong>Description:</strong> {selectedJob.description}
                    </p>
                    <p>
                      <strong>Location:</strong> {selectedJob.country}
                    </p>
                    <p>
                      <strong>Salary:</strong> ₹{selectedJob.salary?.min} - ₹{selectedJob.salary?.max}
                    </p>
                    <p>
                      <strong>Experience:</strong> {selectedJob.experience} years
                    </p>
                    {selectedJob.recruiter && getRecruiterDetails(selectedJob.recruiter) && (
                      <div className="gulf-services-recruiter-info">
                        <strong>Verified Recruiter:</strong>
                        <p>{getRecruiterDetails(selectedJob.recruiter).name}</p>
                        <p>License: {getRecruiterDetails(selectedJob.recruiter).licenseNumber}</p>
                      </div>
                    )}
                  </div>
                  <form className="gulf-services-form" onSubmit={submitJobApplication}>
                    <h4>Apply Now</h4>
                    <div className="gulf-services-form-grid">
                      <input
                        name="fullName"
                        placeholder="Full name"
                        value={jobApplicationForm.fullName}
                        onChange={handleInputChange(setJobApplicationForm)}
                        required
                      />
                      <input
                        name="email"
                        type="email"
                        placeholder="Email"
                        value={jobApplicationForm.email}
                        onChange={handleInputChange(setJobApplicationForm)}
                        required
                      />
                      <input
                        name="phone"
                        placeholder="Phone"
                        value={jobApplicationForm.phone}
                        onChange={handleInputChange(setJobApplicationForm)}
                        required
                      />
                      <input
                        name="experience"
                        type="number"
                        placeholder="Experience (years)"
                        value={jobApplicationForm.experience}
                        onChange={handleInputChange(setJobApplicationForm)}
                        min="0"
                      />
                      <input
                        name="currentCompany"
                        placeholder="Current company"
                        value={jobApplicationForm.currentCompany}
                        onChange={handleInputChange(setJobApplicationForm)}
                      />
                      <input
                        name="expectedSalary"
                        type="number"
                        placeholder="Expected salary"
                        value={jobApplicationForm.expectedSalary}
                        onChange={handleInputChange(setJobApplicationForm)}
                      />
                      <input
                        name="availabilityDays"
                        type="number"
                        placeholder="Availability (days)"
                        value={jobApplicationForm.availabilityDays}
                        onChange={handleInputChange(setJobApplicationForm)}
                        min="15"
                      />
                      <label className="full-width">
                        Upload CV
                        <input
                          name="cvFile"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => handleFileChange(e, setJobApplicationForm)}
                        />
                      </label>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      Apply for this job
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </GulfModal>
    );
  }

  if (activeModal === "attestation") {
    return (
      <GulfModal activeModal={activeModal}>
        <div className="gulf-services-modal-content">
          <button
            type="button"
            className="gulf-services-modal-close"
            aria-label="Close attestation dialog"
            onClick={closeModal}
          >
            ✕
          </button>
          <h2>Document Attestation Request</h2>
          <form className="gulf-services-form" onSubmit={submitAttestation}>
            <div className="gulf-services-form-grid">
              <input
                name="fullName"
                placeholder="Full name"
                value={attestationForm.fullName}
                onChange={handleInputChange(setAttestationForm)}
                required
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                value={attestationForm.email}
                onChange={handleInputChange(setAttestationForm)}
                required
              />
              <input
                name="phone"
                placeholder="Phone"
                value={attestationForm.phone}
                onChange={handleInputChange(setAttestationForm)}
                required
              />
              <select name="documentType" value={attestationForm.documentType} onChange={handleInputChange(setAttestationForm)}>
                <option value="degree">Degree</option>
                <option value="marriage">Marriage Certificate</option>
                <option value="birth">Birth Certificate</option>
                <option value="police_clearance">PCC</option>
                <option value="character">Character Certificate</option>
              </select>
              <input
                name="documentName"
                placeholder="Document name"
                value={attestationForm.documentName}
                onChange={handleInputChange(setAttestationForm)}
                required
              />
              <select name="country" value={attestationForm.country} onChange={handleInputChange(setAttestationForm)}>
                {availableCountries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              <select name="urgency" value={attestationForm.urgency} onChange={handleInputChange(setAttestationForm)}>
                <option value="standard">Standard</option>
                <option value="expedited">Expedited</option>
                <option value="emergency">Emergency</option>
              </select>
              <label className="full-width">
                Upload document
                <input
                  name="documentFile"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => handleFileChange(e, setAttestationForm)}
                />
              </label>
            </div>
            <div className="gulf-services-form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Submit request
              </button>
              <button type="button" className="btn btn-secondary" onClick={closeModal}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </GulfModal>
    );
  }

  if (activeModal === "lead") {
    return (
      <GulfModal activeModal={activeModal}>
        <div className="gulf-services-modal-content">
          <button
            type="button"
            className="gulf-services-modal-close"
            aria-label="Close callback dialog"
            onClick={closeModal}
          >
            ✕
          </button>
          <h2>Request Gulf Support Callback</h2>
          <form className="gulf-services-form" onSubmit={submitLead}>
            <div className="gulf-services-form-grid">
              <input
                name="fullName"
                placeholder="Full name"
                value={leadForm.fullName}
                onChange={handleInputChange(setLeadForm)}
                required
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                value={leadForm.email}
                onChange={handleInputChange(setLeadForm)}
                required
              />
              <input name="phone" placeholder="Phone" value={leadForm.phone} onChange={handleInputChange(setLeadForm)} required />
              <select name="serviceType" value={leadForm.serviceType} onChange={handleInputChange(setLeadForm)}>
                <option value="visa">Visa Support</option>
                <option value="jobs">Gulf Jobs</option>
                <option value="attestation">Document Attestation</option>
                <option value="travel">Travel Support</option>
                <option value="medical">Medical/PCC</option>
                <option value="emergency">Emergency Help</option>
              </select>
              <select name="country" value={leadForm.country} onChange={handleInputChange(setLeadForm)}>
                {availableCountries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              <label className="full-width">
                Tell us more
                <textarea
                  name="message"
                  placeholder="Your inquiry"
                  value={leadForm.message}
                  onChange={handleInputChange(setLeadForm)}
                  rows="4"
                />
              </label>
            </div>
            <div className="gulf-services-form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Request callback
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => window.open(`https://wa.me/${supportWhatsapp}`, "_blank")}
              >
                Contact WhatsApp
              </button>
            </div>
          </form>
        </div>
      </GulfModal>
    );
  }

  if (activeModal === "fraud") {
    return (
      <GulfModal activeModal={activeModal}>
        <div className="gulf-services-modal-content">
          <button
            type="button"
            className="gulf-services-modal-close"
            aria-label="Close fraud dialog"
            onClick={closeModal}
          >
            ✕
          </button>
          <h2>Report Fraudulent Recruitment</h2>
          <div className="gulf-services-fraud-warning">
            ⚠️ <strong>No legitimate recruiter asks for advance fees.</strong> Report suspicious offers here.
          </div>
          <form className="gulf-services-form" onSubmit={submitFraudReport}>
            <div className="gulf-services-form-grid">
              <input
                name="phone"
                placeholder="Your phone"
                value={fraudForm.phone}
                onChange={handleInputChange(setFraudForm)}
                required
              />
              <input
                name="recruiterId"
                placeholder="Recruiter/Company name"
                value={fraudForm.recruiterId}
                onChange={handleInputChange(setFraudForm)}
              />
              <label className="full-width">
                Describe the fraud issue
                <textarea
                  name="issueDescription"
                  placeholder="What happened?"
                  value={fraudForm.issueDescription}
                  onChange={handleInputChange(setFraudForm)}
                  rows="4"
                  required
                />
              </label>
            </div>
            <div className="gulf-services-form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Report fraud
              </button>
              <button type="button" className="btn btn-secondary" onClick={closeModal}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </GulfModal>
    );
  }

  return null;
};

export default GulfModalShell;
