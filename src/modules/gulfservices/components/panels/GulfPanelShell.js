import React from "react";

const GulfPanelShell = ({
  activePane,
  selectedCountry,
  setSelectedCountry,
  availableCountries,
  availableJobCategories,
  jobFilters,
  setJobFilters,
  filteredJobs,
  selectedJob,
  setSelectedJob,
  submitJobApplication,
  jobApplicationForm,
  setJobApplicationForm,
  handleInputChange,
  handleFileChange,
  loading,
  submitVisa,
  visaForm,
  setVisaForm,
  submitAttestation,
  attestationForm,
  setAttestationForm,
  dashboard,
  loadDashboard,
  submitTrackRequest,
  trackRequest,
  setTrackRequest,
  trackResult,
  setLoading,
  reportEmergency,
  showMessage,
  supportPhone,
  setActiveModal,
  handleServiceSelection,
  serviceCategories,
  recruiters,
  fallbackRecruiters,
}) => {
  if (activePane === "jobs") {
    return (
      <section className="gulf-services-panel gulf-services-action-panel">
        <div className="gulf-services-panel-left">
          <div className="gulf-services-card gulf-services-card-featured">
            <h2>Gulf Jobs & Application Center</h2>
            <p>
              Filter by country, category and salary, then choose a verified recruiter-backed opportunity
              to apply.
            </p>
          </div>
          <div className="gulf-services-job-filters">
            <label>
              Country
              <select value={selectedCountry} onChange={(event) => setSelectedCountry(event.target.value)}>
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
            <div className="gulf-services-salary-range">
              <label>
                Min salary
                <input name="salaryMin" value={jobFilters.salaryMin} onChange={handleInputChange(setJobFilters)} placeholder="2000" />
              </label>
              <label>
                Max salary
                <input name="salaryMax" value={jobFilters.salaryMax} onChange={handleInputChange(setJobFilters)} placeholder="4000" />
              </label>
            </div>
          </div>
          <div className="gulf-services-job-list">
            {filteredJobs.length ? (
              filteredJobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  className={`gulf-services-job-card ${selectedJob?.id === job.id ? "selected" : ""}`}
                  onClick={() => setSelectedJob(job)}
                >
                  <strong>{job.title}</strong>
                  <span>{job.company}</span>
                  <p>{job.summary}</p>
                </button>
              ))
            ) : (
              <div className="gulf-services-card">
                <p>No jobs found for this filter. Try changing the category or country.</p>
              </div>
            )}
          </div>
        </div>
        <div className="gulf-services-panel-right">
          {selectedJob ? (
            <article className="gulf-services-card gulf-services-job-detail">
              <h3>{selectedJob.title}</h3>
              <p>{selectedJob.description || selectedJob.summary}</p>
              <div className="gulf-services-job-meta">
                <span>{selectedJob.company}</span>
                <span>{selectedJob.country}</span>
                <span>₹{selectedJob.salary?.min} - ₹{selectedJob.salary?.max}</span>
              </div>
              <form className="gulf-services-form" onSubmit={submitJobApplication}>
                <h4>Apply for this job</h4>
                <label>
                  Full name
                  <input name="fullName" value={jobApplicationForm.fullName} onChange={handleInputChange(setJobApplicationForm)} required />
                </label>
                <label>
                  Email
                  <input name="email" value={jobApplicationForm.email} onChange={handleInputChange(setJobApplicationForm)} type="email" required />
                </label>
                <label>
                  Phone
                  <input name="phone" value={jobApplicationForm.phone} onChange={handleInputChange(setJobApplicationForm)} required />
                </label>
                <label>
                  Experience (years)
                  <input name="experience" value={jobApplicationForm.experience} onChange={handleInputChange(setJobApplicationForm)} type="number" min="0" />
                </label>
                <label>
                  Current company
                  <input name="currentCompany" value={jobApplicationForm.currentCompany} onChange={handleInputChange(setJobApplicationForm)} />
                </label>
                <label>
                  Expected salary
                  <input name="expectedSalary" value={jobApplicationForm.expectedSalary} onChange={handleInputChange(setJobApplicationForm)} type="number" />
                </label>
                <label>
                  Availability (days)
                  <input
                    name="availabilityDays"
                    value={jobApplicationForm.availabilityDays}
                    onChange={handleInputChange(setJobApplicationForm)}
                    type="number"
                    min="15"
                  />
                </label>
                <label>
                  Upload CV
                  <input name="cvFile" type="file" accept=".pdf,.doc,.docx" onChange={(event) => handleFileChange(event, setJobApplicationForm)} />
                </label>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Submit Application
                </button>
              </form>
            </article>
          ) : (
            <div className="gulf-services-card">
              <h3>Select a job from the left to view details and apply.</h3>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (activePane === "visa") {
    return (
      <section className="gulf-services-panel gulf-services-action-panel">
        <div className="gulf-services-card">
          <h2>Visa Enquiry and Tracking</h2>
          <p>Submit your visa details, upload documents, and track the request from your Gulf Services dashboard.</p>
          <form className="gulf-services-form" onSubmit={submitVisa}>
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
              <input name="currentLocation" value={visaForm.currentLocation} onChange={handleInputChange(setVisaForm)} required />
            </label>
            <label>
              Additional message
              <textarea name="message" value={visaForm.message} onChange={handleInputChange(setVisaForm)} rows="4" />
            </label>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Submit visa enquiry
            </button>
          </form>
        </div>
      </section>
    );
  }

  if (activePane === "attestation") {
    return (
      <section className="gulf-services-panel gulf-services-action-panel">
        <div className="gulf-services-card">
          <h2>Document Attestation Request</h2>
          <p>Upload your document and receive full tracking for MEA, embassy and HRD verification.</p>
          <form className="gulf-services-form" onSubmit={submitAttestation}>
            <label>
              Full name
              <input name="fullName" value={attestationForm.fullName} onChange={handleInputChange(setAttestationForm)} required />
            </label>
            <label>
              Email
              <input name="email" type="email" value={attestationForm.email} onChange={handleInputChange(setAttestationForm)} required />
            </label>
            <label>
              Phone
              <input name="phone" value={attestationForm.phone} onChange={handleInputChange(setAttestationForm)} required />
            </label>
            <label>
              Document type
              <select name="documentType" value={attestationForm.documentType} onChange={handleInputChange(setAttestationForm)}>
                <option value="degree">Degree</option>
                <option value="marriage">Marriage Certificate</option>
                <option value="birth">Birth Certificate</option>
                <option value="police_clearance">PCC</option>
                <option value="character">Character Certificate</option>
              </select>
            </label>
            <label>
              Document name
              <input name="documentName" value={attestationForm.documentName} onChange={handleInputChange(setAttestationForm)} required />
            </label>
            <label>
              Country
              <select name="country" value={attestationForm.country} onChange={handleInputChange(setAttestationForm)}>
                {availableCountries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Urgency
              <select name="urgency" value={attestationForm.urgency} onChange={handleInputChange(setAttestationForm)}>
                <option value="standard">Standard</option>
                <option value="expedited">Expedited</option>
                <option value="emergency">Emergency</option>
              </select>
            </label>
            <label>
              Upload document
              <input
                name="documentFile"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => handleFileChange(e, setAttestationForm)}
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Submit request
            </button>
          </form>
        </div>
      </section>
    );
  }

  if (activePane === "dashboard") {
    return (
      <section className="gulf-services-panel gulf-services-action-panel">
        <div className="gulf-services-card">
          <h2>My Gulf Services Dashboard</h2>
          <p>Track all open visa enquiries, applications, attestations, and service requests from one place.</p>
          {dashboard ? (
            <div className="gulf-services-dashboard-summary">
              <div>
                <strong>Pending actions</strong>
                <p>{dashboard.pendingActions}</p>
              </div>
              <div>
                <strong>Visa requests</strong>
                <p>{dashboard.visaRequests.length}</p>
              </div>
              <div>
                <strong>Job applications</strong>
                <p>{dashboard.jobApplications.length}</p>
              </div>
              <div>
                <strong>Attestations</strong>
                <p>{dashboard.attestations.length}</p>
              </div>
            </div>
          ) : (
            <div>
              <button type="button" className="btn btn-primary" onClick={loadDashboard} disabled={loading}>
                Load dashboard
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (activePane === "tracking") {
    return (
      <section className="gulf-services-panel gulf-services-action-panel">
        <div className="gulf-services-card">
          <h2>Track Request</h2>
          <form className="gulf-services-form" onSubmit={submitTrackRequest}>
            <label>
              Type
              <select
                name="type"
                value={trackRequest.type}
                onChange={(event) => setTrackRequest((prev) => ({ ...prev, type: event.target.value }))}
              >
                <option value="visa">Visa</option>
                <option value="attestation">Attestation</option>
              </select>
            </label>
            <label>
              Request ID
              <input name="requestId" value={trackRequest.requestId} onChange={handleInputChange(setTrackRequest)} required />
            </label>
            <label>
              Email used for request
              <input
                name="email"
                type="email"
                value={trackRequest.email}
                onChange={handleInputChange(setTrackRequest)}
                required
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Track request
            </button>
          </form>
          {trackResult && (
            <div className="gulf-services-tracking-result">
              <h3>Status: {trackResult.status || "Unknown"}</h3>
              {trackResult.timeline && (
                <div className="gulf-services-timeline">
                  {trackResult.timeline.map((entry, idx) => (
                    <div key={idx} className="gulf-services-timeline-entry">
                      <span className="gulf-services-timeline-status">{entry.status}</span>
                      <span className="gulf-services-timeline-date">{new Date(entry.date).toLocaleDateString()}</span>
                      <p>{entry.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (activePane === "emergency") {
    return (
      <section className="gulf-services-panel gulf-services-action-panel">
        <div className="gulf-services-card gulf-services-card-emergency">
          <h2>🚨 Emergency Support</h2>
          <p>Passport lost, visa expired, or urgent Gulf crisis? Get immediate help.</p>
          <form
            className="gulf-services-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setLoading(true);
              try {
                const response = await reportEmergency({
                  issueType: "Urgent Gulf Support",
                  description: "Emergency support requested from frontend.",
                  phone: visaForm.phone || "",
                  country: selectedCountry,
                  message: "Please contact me urgently for Gulf emergency support.",
                });
                showMessage(response.message || "Emergency support requested. We will contact you shortly.");
              } catch (error) {
                showMessage(error?.response?.data?.message || "Unable to submit emergency request.");
              } finally {
                setLoading(false);
              }
            }}
          >
            <label>
              Country
              <select name="country" value={selectedCountry} onChange={(event) => setSelectedCountry(event.target.value)}>
                {availableCountries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Your phone
              <input value={visaForm.phone} onChange={(event) => setVisaForm((prev) => ({ ...prev, phone: event.target.value }))} required />
            </label>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Notify support team now
            </button>
            <button type="button" className="btn btn-outline" onClick={() => window.open(`tel:${supportPhone}`)}>
              📞 Call 24/7 Emergency Line
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="gulf-services-features">
      <div className="gulf-services-notice">
        <div>
          <strong>Trusted Gulf Support Platform</strong>
          <p>
            Your complete ecosystem for visa, jobs, attestation, travel and emergency support with verified
            Gulf partners.
          </p>
        </div>
        <div className="gulf-services-notice-actions">
          <button type="button" className="btn btn-primary" onClick={() => setActiveModal("visa")}>
            Start Visa Support
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setActiveModal("jobs")}>
            Explore Gulf Jobs
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setActiveModal("lead")}>
            Request Callback
          </button>
        </div>
      </div>

      <h2 style={{ marginTop: "40px", marginBottom: "20px" }}>All Gulf Services</h2>
      <div className="gulf-services-grid">
        {serviceCategories.map((service) => (
          <button
            type="button"
            key={service.id}
            className="gulf-services-card gulf-services-action-card"
            onClick={() => handleServiceSelection(service.id)}
          >
            <span className="gulf-services-icon">{service.icon}</span>
            <h3>{service.title}</h3>
            <p>{service.desc}</p>
          </button>
        ))}
      </div>

      <div className="gulf-services-trust-section">
        <h2>Why Choose Our Platform?</h2>
        <div className="gulf-services-trust-grid">
          <div className="gulf-services-card">
            <strong>✓ Verified Agencies</strong>
            <p>Only govt-registered Gulf agencies with valid licenses and public reviews.</p>
          </div>
          <div className="gulf-services-card">
            <strong>✓ No Advance Fees</strong>
            <p>We warn against any recruiter demanding upfront payments.</p>
          </div>
          <div className="gulf-services-card">
            <strong>✓ Fraud Protection</strong>
            <p>Report fake jobs/recruiters and get verified opportunities only.</p>
          </div>
          <div className="gulf-services-card">
            <strong>✓ Document Safety</strong>
            <p>Your documents are encrypted and handled by certified partners.</p>
          </div>
          <div className="gulf-services-card">
            <strong>✓ Full Tracking</strong>
            <p>Real-time status updates for visa, attestation and applications.</p>
          </div>
          <div className="gulf-services-card">
            <strong>✓ 24/7 Support</strong>
            <p>Emergency helpline and WhatsApp support for urgent cases.</p>
          </div>
        </div>
      </div>

      <div className="gulf-services-fraud-banner">
        <h3>⚠️ Fraud Warning</h3>
        <p>
          <strong>Do NOT send money to unknown accounts.</strong> No legitimate Gulf recruiter or agency asks for
          advance payment, registration fees, or deposits before employment.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => setActiveModal("fraud")}>
          Report Fraud
        </button>
      </div>

      <div className="gulf-services-recruiter-panel">
        <h2>Verified Recruiters on Our Platform</h2>
        <div className="gulf-services-job-list">
          {(recruiters.length ? recruiters : fallbackRecruiters).map((recruiter) => (
            <article key={recruiter.id} className="gulf-services-card gulf-services-recruiter-card">
              <div className="gulf-services-recruiter-header">
                <strong>{recruiter.name}</strong>
                {recruiter.verified && <span className="gulf-services-badge-verified">✓ Verified</span>}
              </div>
              <span>{recruiter.country}</span>
              <p>License: {recruiter.licenseNumber}</p>
              <p>
                {recruiter.successCases} successful placements • {recruiter.rating}★ ({recruiter.reviews} reviews)
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GulfPanelShell;
