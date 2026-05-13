import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import { getStoredAuthToken } from "../../utils/auth";
import { jobPortalApi } from "./services/jobPortalApi";
import {
  APPLICATION_STATUS_OPTIONS,
  CAREER_TIP_RESPONSES,
  GOVERNMENT_PORTAL_LINKS,
  JOB_TYPE_OPTIONS,
  KERALA_DISTRICTS,
  QUICK_FILTERS,
} from "./data/jobPortalConstants";
import JobCard from "./components/JobCard";
import JobDetailsModal from "./components/JobDetailsModal";
import ProfileBuilder from "./components/ProfileBuilder";
import PostJobForm from "./components/PostJobForm";
import EmployerDashboard from "./components/EmployerDashboard";
import AIAssistant from "./components/AIAssistant";
import ApplicationsBoard from "./components/ApplicationsBoard";
import "./JobPortal.css";

const INITIAL_PROFILE_FORM = {
  fullName: "",
  email: "",
  phone: "",
  skills: "",
  experience: "",
  expectedSalary: "",
  preferredLocations: "",
  availability: "immediate",
  gulfReady: false,
};

const INITIAL_JOB_FORM = {
  title: "",
  company: "",
  location: "",
  district: "",
  type: "",
  subtype: "",
  salary: "",
  experience: "",
  skills: "",
  benefits: "",
  description: "",
  requirements: "",
  jobType: "",
  workMode: "",
  contactEmail: "",
  contactPhone: "",
  companyWebsite: "",
  isUrgent: false,
  isFeatured: false,
  agencyLicenseNumber: "",
  visaType: "",
  accommodationProvided: false,
  contractTerms: "",
  medicalInsuranceProvided: false,
  returnTicketProvided: false,
  overtimePolicy: "",
  warningNotes: "",
};

const normalizeStatus = (value = "") => {
  const lowered = String(value || "").toLowerCase();
  if (lowered === "interviewed") return "Interview";
  if (lowered === "hired") return "Selected";
  if (lowered === "shortlisted") return "Shortlisted";
  if (lowered === "rejected") return "Rejected";
  if (lowered === "viewed") return "Viewed";
  return "Applied";
};

const JobPortal = () => {
  const { user } = useApp();
  const token = getStoredAuthToken();
  const isAuthenticated = Boolean(token);
  const currentEmail = String(user?.email || "").toLowerCase();

  const [activeTab, setActiveTab] = useState("home");
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState("");
  const [filters, setFilters] = useState({
    q: "",
    location: "",
    type: "",
    district: "",
    quickFilter: "all",
  });

  const [selectedJob, setSelectedJob] = useState(null);
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [applySubmitting, setApplySubmitting] = useState(false);

  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [savedJobs, setSavedJobs] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);

  const [profileForm, setProfileForm] = useState(INITIAL_PROFILE_FORM);
  const [profileFiles, setProfileFiles] = useState({ resume: null, videoIntro: null, voiceResume: null });
  const [profileSaving, setProfileSaving] = useState(false);

  const [employerProfile, setEmployerProfile] = useState(null);
  const [employerDashboard, setEmployerDashboard] = useState(null);
  const [employerLoading, setEmployerLoading] = useState(false);
  const [applicationsByJob, setApplicationsByJob] = useState({});
  const [selectedEmployerJobId, setSelectedEmployerJobId] = useState("");
  const [updatingApplicationId, setUpdatingApplicationId] = useState("");

  const [postJobForm, setPostJobForm] = useState(INITIAL_JOB_FORM);
  const [postJobErrors, setPostJobErrors] = useState({});
  const [postingJob, setPostingJob] = useState(false);

  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantMessages, setAssistantMessages] = useState([
    {
      id: "boot",
      role: "bot",
      content: "Career Tips Assistant is ready. Ask for resume, interview, or Gulf job safety guidance.",
    },
  ]);

  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((type, message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((current) => [{ id, type, message }, ...current].slice(0, 4));
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 3500);
  }, []);

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    setJobsError("");
    try {
      const params = {
        q: filters.q || undefined,
        location: filters.location || undefined,
        type: filters.type || undefined,
        district: filters.district || undefined,
        quickFilter: filters.quickFilter !== "all" ? filters.quickFilter : undefined,
      };
      const response = await jobPortalApi.getJobs(params);
      setJobs(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      setJobs([]);
      setJobsError(error?.response?.data?.message || "Unable to load jobs.");
    } finally {
      setJobsLoading(false);
    }
  }, [filters]);

  const loadApplications = useCallback(async () => {
    if (!isAuthenticated) return;
    setApplicationsLoading(true);
    try {
      const response = await jobPortalApi.getMyApplications();
      setApplications(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      pushToast("error", error?.response?.data?.message || "Unable to load applications.");
    } finally {
      setApplicationsLoading(false);
    }
  }, [isAuthenticated, pushToast]);

  const loadSavedJobs = useCallback(async () => {
    if (!isAuthenticated) return;
    setSavedLoading(true);
    try {
      const response = await jobPortalApi.getSavedJobs();
      setSavedJobs(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      pushToast("error", error?.response?.data?.message || "Unable to load saved jobs.");
    } finally {
      setSavedLoading(false);
    }
  }, [isAuthenticated, pushToast]);

  const loadProfile = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await jobPortalApi.getProfile();
      const profile = response?.data || {};
      setProfileForm({
        fullName: profile.fullName || user?.name || "",
        email: profile.email || currentEmail || "",
        phone: profile.phone || "",
        skills: Array.isArray(profile.skills) ? profile.skills.join(", ") : "",
        experience: profile.experience || "",
        expectedSalary: profile.expectedSalary || "",
        preferredLocations: Array.isArray(profile.preferredLocations) ? profile.preferredLocations.join(", ") : "",
        availability: profile.availability || "immediate",
        gulfReady: Boolean(profile.gulfReady),
      });
    } catch (error) {
      pushToast("error", error?.response?.data?.message || "Unable to load profile.");
    }
  }, [currentEmail, isAuthenticated, pushToast, user?.name]);

  const loadEmployerData = useCallback(async () => {
    if (!isAuthenticated) return;
    setEmployerLoading(true);
    try {
      const [profileRes, dashboardRes] = await Promise.all([
        jobPortalApi.getEmployerProfile(),
        jobPortalApi.getEmployerDashboard(),
      ]);
      setEmployerProfile(profileRes?.data || null);
      setEmployerDashboard(dashboardRes?.data || null);
    } catch (error) {
      pushToast("error", error?.response?.data?.message || "Unable to load employer dashboard.");
    } finally {
      setEmployerLoading(false);
    }
  }, [isAuthenticated, pushToast]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadApplications();
    loadSavedJobs();
    loadProfile();
  }, [isAuthenticated, loadApplications, loadProfile, loadSavedJobs]);

  useEffect(() => {
    if (activeTab === "employer") {
      loadEmployerData();
    }
  }, [activeTab, loadEmployerData]);

  const savedJobIds = useMemo(
    () => new Set(savedJobs.map((job) => String(job?._id || job?.id || ""))),
    [savedJobs]
  );
  const appliedJobIds = useMemo(
    () => new Set(applications.map((application) => String(application?.jobId?._id || application?.jobId || ""))),
    [applications]
  );

  const resumeScore = useMemo(() => {
    let score = 0;
    if (profileForm.fullName) score += 15;
    if (profileForm.email) score += 10;
    if (profileForm.phone) score += 10;
    if (profileForm.skills) score += 20;
    if (profileForm.experience) score += 15;
    if (profileForm.expectedSalary) score += 10;
    if (profileForm.preferredLocations) score += 10;
    if (profileFiles.resume) score += 10;
    return Math.min(score, 100);
  }, [profileFiles.resume, profileForm]);

  const openJobDetails = async (jobId) => {
    try {
      const response = await jobPortalApi.getJob(jobId);
      setSelectedJob(response?.data || null);
      setJobModalOpen(true);
    } catch (error) {
      pushToast("error", error?.response?.data?.message || "Unable to load job details.");
    }
  };

  const toggleSaveJob = async (jobId) => {
    if (!isAuthenticated) {
      pushToast("error", "Login required to save jobs.");
      return;
    }
    try {
      if (savedJobIds.has(String(jobId))) {
        await jobPortalApi.removeSavedJob(jobId);
        pushToast("success", "Removed from saved jobs.");
      } else {
        await jobPortalApi.saveJob(jobId);
        pushToast("success", "Job saved.");
      }
      loadSavedJobs();
    } catch (error) {
      pushToast("error", error?.response?.data?.message || "Unable to update saved jobs.");
    }
  };

  const applyForJob = async (jobId, payload = null) => {
    if (!isAuthenticated) {
      pushToast("error", "Login required to apply.");
      return;
    }
    setApplySubmitting(true);
    try {
      const formData = new FormData();
      if (payload?.coverLetter) formData.append("coverLetter", payload.coverLetter);
      if (payload?.expectedSalary) formData.append("expectedSalary", payload.expectedSalary);
      if (payload?.availability) formData.append("availability", payload.availability);
      if (payload?.resumeFile) formData.append("resume", payload.resumeFile);
      await jobPortalApi.applyJob(jobId, formData);
      pushToast("success", "Application submitted successfully.");
      loadApplications();
    } catch (error) {
      pushToast("error", error?.response?.data?.message || "Unable to submit application.");
    } finally {
      setApplySubmitting(false);
    }
  };

  const reportFakeJob = async (jobId, reason) => {
    if (!isAuthenticated) {
      pushToast("error", "Login required to report jobs.");
      return;
    }
    if (!String(reason || "").trim()) {
      pushToast("error", "Please add a reason before reporting.");
      return;
    }
    try {
      await jobPortalApi.reportJob(jobId, { reason });
      pushToast("success", "Report submitted to moderation.");
    } catch (error) {
      pushToast("error", error?.response?.data?.message || "Unable to report this job.");
    }
  };

  const updateProfileField = (field, value) => setProfileForm((current) => ({ ...current, [field]: value }));

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) {
      pushToast("error", "Login required.");
      return;
    }
    setProfileSaving(true);
    try {
      const formData = new FormData();
      Object.entries(profileForm).forEach(([key, value]) => {
        if (typeof value === "boolean") formData.append(key, String(value));
        else formData.append(key, value || "");
      });
      if (profileFiles.resume) formData.append("resume", profileFiles.resume);
      if (profileFiles.videoIntro) formData.append("videoIntro", profileFiles.videoIntro);
      if (profileFiles.voiceResume) formData.append("voiceResume", profileFiles.voiceResume);
      await jobPortalApi.updateProfile(formData);
      setProfileFiles({ resume: null, videoIntro: null, voiceResume: null });
      pushToast("success", "Profile updated.");
      loadProfile();
    } catch (error) {
      pushToast("error", error?.response?.data?.message || "Unable to update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const validatePostJob = (form) => {
    const errors = {};
    if (!form.title.trim()) errors.title = "Title is required.";
    if (!form.company.trim()) errors.company = "Company name is required.";
    if (!form.location.trim()) errors.location = "Location is required.";
    if (!form.type) errors.type = "Job type is required.";
    if (!form.subtype.trim()) errors.subtype = "Subtype is required.";
    if (!form.salary.trim()) errors.salary = "Salary is required.";
    if (!form.experience.trim()) errors.experience = "Experience is required.";
    if (!form.description.trim() || form.description.trim().length < 30) errors.description = "Description must be at least 30 characters.";
    if (!/^\S+@\S+\.\S+$/.test(form.contactEmail || "")) errors.contactEmail = "Valid contact email is required.";
    if (!/^\+?[0-9][0-9\s-]{7,14}$/.test(form.contactPhone || "")) errors.contactPhone = "Valid contact phone is required.";
    if (form.type === "gulf") {
      if (!form.agencyLicenseNumber.trim()) errors.agencyLicenseNumber = "License number is required for Gulf jobs.";
      if (!form.visaType.trim()) errors.visaType = "Visa type is required for Gulf jobs.";
      if (!form.contractTerms.trim()) errors.contractTerms = "Contract terms are required for Gulf jobs.";
    }
    return errors;
  };

  const handlePostJob = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) {
      pushToast("error", "Login required.");
      return;
    }
    const nextErrors = validatePostJob(postJobForm);
    setPostJobErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setPostingJob(true);
    try {
      await jobPortalApi.createJob(postJobForm);
      pushToast("success", "Job posted successfully.");
      setPostJobForm({ ...INITIAL_JOB_FORM, contactEmail: postJobForm.contactEmail, contactPhone: postJobForm.contactPhone });
      loadJobs();
      loadEmployerData();
    } catch (error) {
      pushToast("error", error?.response?.data?.message || "Unable to post this job.");
    } finally {
      setPostingJob(false);
    }
  };

  const loadApplicationsForEmployerJob = async (jobId) => {
    try {
      const response = await jobPortalApi.getJobApplications(jobId);
      const list = Array.isArray(response?.data) ? response.data : [];
      setApplicationsByJob((current) => ({ ...current, [jobId]: list }));
      setSelectedEmployerJobId(jobId);
    } catch (error) {
      pushToast("error", error?.response?.data?.message || "Unable to load applicants.");
    }
  };

  const updateApplicantStatus = async (applicationId, status) => {
    try {
      setUpdatingApplicationId(applicationId);
      await jobPortalApi.updateApplicationStatus(applicationId, { status });
      if (selectedEmployerJobId) {
        await loadApplicationsForEmployerJob(selectedEmployerJobId);
      }
      loadEmployerData();
      pushToast("success", `Application moved to ${status}.`);
    } catch (error) {
      pushToast("error", error?.response?.data?.message || "Unable to update application status.");
    } finally {
      setUpdatingApplicationId("");
    }
  };

  const sendAssistantMessage = () => {
    const question = String(assistantInput || "").trim();
    if (!question) return;
    const userMessage = { id: `u-${Date.now()}`, role: "user", content: question };
    const answer = CAREER_TIP_RESPONSES[(assistantMessages.length + question.length) % CAREER_TIP_RESPONSES.length];
    const botMessage = { id: `b-${Date.now() + 1}`, role: "bot", content: answer };
    setAssistantMessages((current) => [...current, userMessage, botMessage]);
    setAssistantInput("");
  };

  return (
    <div className="jp-shell">
      <header className="jp-topbar">
        <div>
          <h1>Job Portal</h1>
          <p>Live jobs, real applications, employer moderation and Gulf safety checks.</p>
        </div>
        <div className="jp-topbar-actions">
          <button type="button" className="jp-btn jp-btn-muted" onClick={() => setAssistantOpen(true)}>
            Career Tips Assistant
          </button>
        </div>
      </header>

      <nav className="jp-nav" aria-label="Job portal navigation">
        {[
          { id: "home", label: "Home" },
          { id: "applications", label: "Applications" },
          { id: "saved", label: "Saved Jobs" },
          { id: "profile", label: "Profile" },
          { id: "employer", label: "Employer" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`jp-nav-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="jp-content">
        {activeTab === "home" ? (
          <>
            <section className="jp-panel">
              <div className="jp-filter-grid">
                <input
                  value={filters.q}
                  onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                  placeholder="Search title, company, skills..."
                  aria-label="Search jobs"
                />
                <input
                  value={filters.location}
                  onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Location"
                  aria-label="Filter by location"
                />
                <select
                  value={filters.type}
                  onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
                  aria-label="Filter by job type"
                >
                  <option value="">All job types</option>
                  {JOB_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select
                  value={filters.district}
                  onChange={(event) => setFilters((current) => ({ ...current, district: event.target.value }))}
                  aria-label="Filter by district"
                >
                  <option value="">All districts</option>
                  {KERALA_DISTRICTS.map((district) => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>
              <div className="jp-quick-filters">
                {QUICK_FILTERS.map((quickFilter) => (
                  <button
                    key={quickFilter.id}
                    type="button"
                    className={`jp-chip-btn ${filters.quickFilter === quickFilter.id ? "active" : ""}`}
                    onClick={() => setFilters((current) => ({ ...current, quickFilter: quickFilter.id }))}
                  >
                    {quickFilter.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="jp-panel">
              <h2>Live Job Listings</h2>
              {jobsLoading ? <p>Loading jobs...</p> : null}
              {jobsError ? <p className="jp-error-text">{jobsError}</p> : null}
              {!jobsLoading && !jobsError && jobs.length === 0 ? <p>No jobs found for current filters.</p> : null}
              <div className="jp-job-grid">
                {jobs.map((job) => {
                  const jobId = String(job?._id || job?.id || "");
                  return (
                    <JobCard
                      key={jobId}
                      job={job}
                      isSaved={savedJobIds.has(jobId)}
                      hasApplied={appliedJobIds.has(jobId)}
                      onOpen={openJobDetails}
                      onSaveToggle={toggleSaveJob}
                      onApply={(id) => applyForJob(id, {})}
                    />
                  );
                })}
              </div>
            </section>

            <section className="jp-panel">
              <h2>Free Government Job Portals</h2>
              <ul className="jp-link-list">
                {GOVERNMENT_PORTAL_LINKS.map((link) => (
                  <li key={link.url}>
                    <a href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}

        {activeTab === "applications" ? (
          <ApplicationsBoard applications={applications} loading={applicationsLoading} />
        ) : null}

        {activeTab === "saved" ? (
          <section className="jp-panel">
            <div className="jp-panel-head">
              <h2>Saved Jobs</h2>
              <p>Track shortlisted opportunities here.</p>
            </div>
            {savedLoading ? <p>Loading saved jobs...</p> : null}
            {!savedLoading && savedJobs.length === 0 ? <p>No saved jobs yet.</p> : null}
            <div className="jp-job-grid">
              {savedJobs.map((job) => {
                const jobId = String(job?._id || job?.id || "");
                return (
                  <JobCard
                    key={jobId}
                    job={job}
                    isSaved
                    hasApplied={appliedJobIds.has(jobId)}
                    onOpen={openJobDetails}
                    onSaveToggle={toggleSaveJob}
                    onApply={(id) => applyForJob(id, {})}
                  />
                );
              })}
            </div>
          </section>
        ) : null}

        {activeTab === "profile" ? (
          <ProfileBuilder
            profileForm={profileForm}
            onChange={updateProfileField}
            onFileChange={(field, file) => setProfileFiles((current) => ({ ...current, [field]: file }))}
            onSubmit={saveProfile}
            saving={profileSaving}
            resumeScore={resumeScore}
          />
        ) : null}

        {activeTab === "employer" ? (
          <>
            <PostJobForm
              form={postJobForm}
              errors={postJobErrors}
              onChange={(field, value) => setPostJobForm((current) => ({ ...current, [field]: value }))}
              onSubmit={handlePostJob}
              saving={postingJob}
              employerVerified={Boolean(employerProfile?.isVerified)}
            />
            <EmployerDashboard
              dashboard={employerDashboard}
              loading={employerLoading}
              selectedJobId={selectedEmployerJobId}
              onSelectJob={loadApplicationsForEmployerJob}
              applicationsByJob={applicationsByJob}
              updatingApplicationId={updatingApplicationId}
              onUpdateStatus={updateApplicantStatus}
            />
          </>
        ) : null}
      </main>

      {jobModalOpen ? (
        <JobDetailsModal
          open={jobModalOpen}
          job={selectedJob}
          hasApplied={appliedJobIds.has(String(selectedJob?._id || selectedJob?.id || ""))}
          onClose={() => setJobModalOpen(false)}
          onApply={applyForJob}
          onSaveToggle={toggleSaveJob}
          isSaved={savedJobIds.has(String(selectedJob?._id || selectedJob?.id || ""))}
          onReportFakeJob={reportFakeJob}
          submitting={applySubmitting}
        />
      ) : null}

      {assistantOpen ? (
        <AIAssistant
          messages={assistantMessages}
          input={assistantInput}
          onInputChange={setAssistantInput}
          onSend={sendAssistantMessage}
          onClose={() => setAssistantOpen(false)}
        />
      ) : null}

      <div className="jp-toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`jp-toast jp-toast-${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>

      {!isAuthenticated ? (
        <div className="jp-auth-hint">
          Login to apply, save jobs, track applications, and use employer tools.
        </div>
      ) : null}

      {activeTab === "applications" && applications.length > 0 ? (
        <div className="jp-status-footer">
          Status legend: {APPLICATION_STATUS_OPTIONS.join(" | ")}. Current top status:{" "}
          {normalizeStatus(applications[0]?.status)}
        </div>
      ) : null}
    </div>
  );
};

export default JobPortal;
