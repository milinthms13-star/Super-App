import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { jobPortalApi } from "./services/jobPortalApi";
import jobPortalAuthStorage from "./services/jobPortalAuthStorage";
import jobPortalOfflineQueue from "./services/jobPortalOfflineQueue";
import jobPortalNotifications from "./services/jobPortalNotifications";
import jobPortalTelemetry from "./services/jobPortalTelemetry";
import {
  APPLICATION_STATUS_OPTIONS,
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
import JobPortalOverview360 from "./components/JobPortalOverview360";
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

const normalizeSkillsText = (value = "") =>
  String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const calculateSkillMatchScore = (jobSkills = [], candidateSkills = []) => {
  const normalizedJobSkills = Array.isArray(jobSkills)
    ? jobSkills.map((skill) => String(skill || "").trim().toLowerCase()).filter(Boolean)
    : [];

  if (!candidateSkills.length && !normalizedJobSkills.length) return 50;
  if (!candidateSkills.length) return 45;
  const matched = normalizedJobSkills.filter((skill) => candidateSkills.includes(skill));
  return Math.min(100, 50 + Array.from(new Set(matched)).length * 15);
};

const ASSISTANT_QUICK_PROMPTS = [
  { id: "resume", label: "Resume Tune-up", text: "Review my profile and suggest resume improvements for IT jobs." },
  { id: "interview", label: "Interview Prep", text: "Give me 5 interview prep steps for my current skill profile." },
  { id: "fraud", label: "Fraud Check", text: "How can I verify if a Gulf job posting is safe and genuine?" },
  { id: "salary", label: "Salary Strategy", text: "Help me negotiate expected salary for my experience level." },
];

const HERO_COPY = {
  en: {
    title: "Design-led 360 Hiring Hub",
    subtitle: "Discover, trust, apply, and grow with branded candidate and employer journeys.",
  },
  ml: {
    title: "Malayalam 360 Hiring Hub",
    subtitle: "Discover trusted jobs and apply with confidence.",
  },
  hi: {
    title: "Hindi 360 Hiring Hub",
    subtitle: "Find verified opportunities and grow faster.",
  },
};

const JobPortal = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useApp();
  jobPortalAuthStorage.initialize();
  const token = jobPortalAuthStorage.getToken();
  const isAuthenticated = Boolean(token);
  const currentEmail = String(user?.email || "").toLowerCase();
  const applyAbortRef = useRef(null);
  const profileAbortRef = useRef(null);

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
  const [applyUploadProgress, setApplyUploadProgress] = useState(0);

  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [savedJobs, setSavedJobs] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);

  const [profileForm, setProfileForm] = useState(INITIAL_PROFILE_FORM);
  const [profileFiles, setProfileFiles] = useState({ resume: null, videoIntro: null, voiceResume: null });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileUploadProgress, setProfileUploadProgress] = useState(0);
  const [jobAlertsEnabled, setJobAlertsEnabled] = useState(true);

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
  const [assistantSending, setAssistantSending] = useState(false);
  const [assistantProvider, setAssistantProvider] = useState("fallback");
  const [uiLanguage, setUiLanguage] = useState("en");
  const [aiSkillInput, setAiSkillInput] = useState("");
  const [assistantMessages, setAssistantMessages] = useState([
    {
      id: "boot",
      role: "bot",
      content: "Career Tips Assistant is ready. Ask for resume, interview, or Gulf job safety guidance.",
    },
  ]);

  const [toasts, setToasts] = useState([]);
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState("");
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [queueSize, setQueueSize] = useState(jobPortalOfflineQueue.size());
  const [queueSyncing, setQueueSyncing] = useState(false);

  const pushToast = useCallback((type, message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((current) => [{ id, type, message }, ...current].slice(0, 4));
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 3500);
  }, []);

  const enqueueOfflineAction = useCallback(
    async (type, payload) => {
      jobPortalOfflineQueue.enqueue({ type, payload });
      setQueueSize(jobPortalOfflineQueue.size());
      await jobPortalTelemetry.sendEvent(
        jobPortalApi,
        "offline_action_queued",
        { actionType: type },
        "mobile"
      );
    },
    []
  );

  const executeQueuedAction = useCallback(async (item) => {
    if (!item?.type) return;
    if (item.type === "save_job") {
      await jobPortalApi.saveJob(item.payload.jobId);
      return;
    }
    if (item.type === "unsave_job") {
      await jobPortalApi.removeSavedJob(item.payload.jobId);
      return;
    }
    if (item.type === "report_job") {
      await jobPortalApi.reportJob(item.payload.jobId, { reason: item.payload.reason });
      return;
    }
    if (item.type === "apply_job") {
      const formData = new FormData();
      formData.append("skills", String(item.payload.skills || ""));
      formData.append("name", String(item.payload.name || ""));
      formData.append("email", String(item.payload.email || ""));
      formData.append("phone", String(item.payload.phone || ""));
      if (item.payload.coverLetter) formData.append("coverLetter", item.payload.coverLetter);
      if (item.payload.expectedSalary) formData.append("expectedSalary", item.payload.expectedSalary);
      if (item.payload.availability) formData.append("availability", item.payload.availability);
      await jobPortalApi.applyJob(item.payload.jobId, formData);
    }
  }, []);

  const flushOfflineQueue = useCallback(async () => {
    if (!isAuthenticated || !isOnline || queueSyncing) return;
    setQueueSyncing(true);
    const result = await jobPortalOfflineQueue.drain(executeQueuedAction);
    setQueueSize(jobPortalOfflineQueue.size());
    setQueueSyncing(false);
    if (result.processed > 0) {
      pushToast("success", `Synced ${result.processed} offline action(s).`);
    }
    await jobPortalTelemetry.sendEvent(
      jobPortalApi,
      "offline_queue_flushed",
      { processed: result.processed, failed: result.failed, remaining: result.remaining },
      "mobile"
    );
  }, [executeQueuedAction, isAuthenticated, isOnline, pushToast, queueSyncing]);

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    setJobsError("");
    jobPortalTelemetry.mark("jobportal_load_jobs_start");
    try {
      const params = {
        q: filters.q || undefined,
        location: filters.location || undefined,
        type: filters.type || undefined,
        district: filters.district || undefined,
        quickFilter: filters.quickFilter !== "all" ? filters.quickFilter : undefined,
        applicantSkills: aiSkillInput || profileForm.skills || undefined,
      };
      const response = await jobPortalApi.getJobs(params);
      setJobs(Array.isArray(response?.data) ? response.data : []);
      const loadDuration = jobPortalTelemetry.measure("jobportal_load_jobs_start");
      if (loadDuration !== null) {
        jobPortalTelemetry.sendEvent(jobPortalApi, "screen_view", { tab: "home", loadDuration }, "mobile");
      }
    } catch (error) {
      setJobs([]);
      setJobsError(error?.response?.data?.message || "Unable to load jobs.");
      jobPortalTelemetry.sendEvent(
        jobPortalApi,
        "api_error",
        { route: "jobs", message: error?.message || "unknown_error" },
        "mobile"
      );
    } finally {
      setJobsLoading(false);
    }
  }, [aiSkillInput, filters, profileForm.skills]);

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
      setJobAlertsEnabled(profile?.jobAlerts?.enabled !== false);
      setAiSkillInput((current) =>
        current || (Array.isArray(profile.skills) ? profile.skills.join(", ") : "")
      );
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

  const loadOverview360 = useCallback(async () => {
    if (!isAuthenticated) return;
    setOverviewLoading(true);
    setOverviewError("");
    try {
      const response = await jobPortalApi.getOverview360();
      setOverviewData(response?.data || null);
    } catch (error) {
      setOverviewError(error?.response?.data?.message || "Unable to load job portal 360 data.");
      setOverviewData(null);
    } finally {
      setOverviewLoading(false);
    }
  }, [isAuthenticated]);

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
    if (activeTab === "overview360") {
      loadOverview360();
    }
    if (isAuthenticated) {
      jobPortalTelemetry.sendEvent(jobPortalApi, "screen_view", { tab: activeTab }, "mobile");
    }
  }, [activeTab, isAuthenticated, loadEmployerData, loadOverview360]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    flushOfflineQueue();
  }, [flushOfflineQueue, isAuthenticated, isOnline]);

  useEffect(() => {
    if (!isAuthenticated || !isOnline || queueSyncing || queueSize !== 0) return;
    loadSavedJobs();
    loadApplications();
  }, [isAuthenticated, isOnline, loadApplications, loadSavedJobs, queueSize, queueSyncing]);

  useEffect(() => {
    if (!isAuthenticated) return;
    jobPortalNotifications
      .registerDevice(jobPortalApi)
      .then((result) => {
        if (result?.success) {
          jobPortalTelemetry.sendEvent(
            jobPortalApi,
            "notification_registered",
            { permission: result.permission },
            "mobile"
          );
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = String(params.get("tab") || "").trim();
    const jobIdParam = String(params.get("jobId") || "").trim();
    const validTabs = new Set(["home", "overview360", "applications", "saved", "profile", "employer"]);
    if (tabParam && validTabs.has(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
    if (jobIdParam) {
      openJobDetails(jobIdParam);
      jobPortalTelemetry.sendEvent(
        jobPortalApi,
        "deep_link_open",
        { tab: tabParam || activeTab, jobId: jobIdParam },
        "mobile"
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("tab") !== activeTab) {
      params.set("tab", activeTab);
      navigate({ search: params.toString() }, { replace: true });
    }
  }, [activeTab, location.search, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!["home", "overview360", "applications"].includes(activeTab)) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      if (activeTab === "overview360") {
        loadOverview360();
      } else if (activeTab === "applications") {
        loadApplications();
      } else {
        loadJobs();
      }
      jobPortalTelemetry.sendEvent(jobPortalApi, "background_refresh", { tab: activeTab }, "mobile");
    }, 45000);
    return () => window.clearInterval(timer);
  }, [activeTab, isAuthenticated, loadApplications, loadJobs, loadOverview360]);

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

  const candidateSkills = useMemo(
    () => normalizeSkillsText(aiSkillInput || profileForm.skills || ""),
    [aiSkillInput, profileForm.skills]
  );

  const getJobMatchScore = useCallback(
    (job) => {
      if (Number.isFinite(Number(job?.aiMatchScore))) {
        return Math.max(0, Math.min(100, Number(job.aiMatchScore)));
      }
      return calculateSkillMatchScore(job?.skills, candidateSkills);
    },
    [candidateSkills]
  );
  const heroCopy = HERO_COPY[uiLanguage] || HERO_COPY.en;

  const displayedJobs = useMemo(() => {
    const jobsCopy = [...jobs];
    return jobsCopy.sort((a, b) => {
      const featuredDelta = Number(Boolean(b?.isFeatured)) - Number(Boolean(a?.isFeatured));
      if (featuredDelta !== 0) return featuredDelta;
      return getJobMatchScore(b) - getJobMatchScore(a);
    });
  }, [getJobMatchScore, jobs]);

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
    const normalizedJobId = String(jobId || "");
    try {
      if (savedJobIds.has(normalizedJobId)) {
        await jobPortalApi.removeSavedJob(normalizedJobId);
        pushToast("success", "Removed from saved jobs.");
      } else {
        await jobPortalApi.saveJob(normalizedJobId);
        pushToast("success", "Job saved.");
      }
      loadSavedJobs();
    } catch (error) {
      const canQueue = !isOnline || !error?.response;
      if (canQueue) {
        const actionType = savedJobIds.has(normalizedJobId) ? "unsave_job" : "save_job";
        await enqueueOfflineAction(actionType, { jobId: normalizedJobId });
        pushToast("success", "Saved action queued. It will sync when connection returns.");
      } else {
        pushToast("error", error?.response?.data?.message || "Unable to update saved jobs.");
      }
      await jobPortalTelemetry.sendEvent(
        jobPortalApi,
        "api_error",
        { route: "saved-jobs", message: error?.message || "save_failed" },
        "mobile"
      );
    }
  };

  const applyForJob = async (jobId, payload = null) => {
    if (!isAuthenticated) {
      pushToast("error", "Login required to apply.");
      return;
    }
    setApplySubmitting(true);
    setApplyUploadProgress(0);
    try {
      const normalizedJobId = String(jobId || "");
      const queuedPayload = {
        jobId: normalizedJobId,
        coverLetter: String(payload?.coverLetter || ""),
        expectedSalary: String(payload?.expectedSalary || ""),
        availability: String(payload?.availability || ""),
        skills: aiSkillInput || profileForm.skills || "",
        name: profileForm.fullName || user?.name || "",
        email: profileForm.email || currentEmail || "",
        phone: profileForm.phone || "",
      };
      if (!isOnline) {
        if (payload?.resumeFile) {
          pushToast("error", "Offline apply with file upload is not supported. Retry when online.");
          setApplySubmitting(false);
          return;
        }
        await enqueueOfflineAction("apply_job", queuedPayload);
        pushToast("success", "Application queued. It will sync automatically when online.");
        setApplySubmitting(false);
        return;
      }

      const formData = new FormData();
      if (payload?.coverLetter) formData.append("coverLetter", payload.coverLetter);
      if (payload?.expectedSalary) formData.append("expectedSalary", payload.expectedSalary);
      if (payload?.availability) formData.append("availability", payload.availability);
      if (payload?.resumeFile) formData.append("resume", payload.resumeFile);
      formData.append("skills", queuedPayload.skills);
      formData.append("name", queuedPayload.name);
      formData.append("email", queuedPayload.email);
      formData.append("phone", queuedPayload.phone);
      applyAbortRef.current = new AbortController();
      await jobPortalApi.applyJob(normalizedJobId, formData, {
        signal: applyAbortRef.current.signal,
        onUploadProgress: (event) => {
          const total = Number(event?.total || 0);
          const loaded = Number(event?.loaded || 0);
          if (total > 0) {
            setApplyUploadProgress(Math.round((loaded / total) * 100));
          }
        },
      });
      pushToast("success", "Application submitted successfully.");
      setApplyUploadProgress(100);
      loadApplications();
    } catch (error) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
        pushToast("error", "Application upload cancelled.");
      } else if (!isOnline || !error?.response) {
        if (payload?.resumeFile) {
          pushToast("error", "Network issue detected. File-based applications cannot be queued offline.");
        } else {
          await enqueueOfflineAction("apply_job", {
            jobId: String(jobId || ""),
            coverLetter: String(payload?.coverLetter || ""),
            expectedSalary: String(payload?.expectedSalary || ""),
            availability: String(payload?.availability || ""),
            skills: aiSkillInput || profileForm.skills || "",
            name: profileForm.fullName || user?.name || "",
            email: profileForm.email || currentEmail || "",
            phone: profileForm.phone || "",
          });
          pushToast("success", "Application queued due to network issue.");
        }
      } else {
        pushToast("error", error?.response?.data?.message || "Unable to submit application.");
      }
      await jobPortalTelemetry.sendEvent(
        jobPortalApi,
        "api_error",
        { route: "apply", message: error?.message || "apply_failed" },
        "mobile"
      );
    } finally {
      applyAbortRef.current = null;
      setApplySubmitting(false);
      setApplyUploadProgress(0);
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
      if (!isOnline || !error?.response) {
        await enqueueOfflineAction("report_job", { jobId: String(jobId || ""), reason: String(reason || "").trim() });
        pushToast("success", "Report queued. It will be submitted automatically when online.");
      } else {
        pushToast("error", error?.response?.data?.message || "Unable to report this job.");
      }
      await jobPortalTelemetry.sendEvent(
        jobPortalApi,
        "api_error",
        { route: "report", message: error?.message || "report_failed" },
        "mobile"
      );
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
    setProfileUploadProgress(0);
    try {
      const formData = new FormData();
      Object.entries(profileForm).forEach(([key, value]) => {
        if (typeof value === "boolean") formData.append(key, String(value));
        else formData.append(key, value || "");
      });
      if (profileFiles.resume) formData.append("resume", profileFiles.resume);
      if (profileFiles.videoIntro) formData.append("videoIntro", profileFiles.videoIntro);
      if (profileFiles.voiceResume) formData.append("voiceResume", profileFiles.voiceResume);
      profileAbortRef.current = new AbortController();
      await jobPortalApi.updateProfile(formData, {
        signal: profileAbortRef.current.signal,
        onUploadProgress: (event) => {
          const total = Number(event?.total || 0);
          const loaded = Number(event?.loaded || 0);
          if (total > 0) {
            setProfileUploadProgress(Math.round((loaded / total) * 100));
          }
        },
      });
      setProfileFiles({ resume: null, videoIntro: null, voiceResume: null });
      pushToast("success", "Profile updated.");
      setProfileUploadProgress(100);
      loadProfile();
      await jobPortalApi.updateNotificationPreferences({ enabled: jobAlertsEnabled });
    } catch (error) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
        pushToast("error", "Profile upload cancelled.");
      } else {
        pushToast("error", error?.response?.data?.message || "Unable to update profile.");
      }
      await jobPortalTelemetry.sendEvent(
        jobPortalApi,
        "api_error",
        { route: "profile", message: error?.message || "profile_update_failed" },
        "mobile"
      );
    } finally {
      profileAbortRef.current = null;
      setProfileSaving(false);
      setProfileUploadProgress(0);
    }
  };

  const cancelApplyUpload = () => {
    if (applyAbortRef.current) {
      applyAbortRef.current.abort();
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

  const sendAssistantMessage = async (promptText = "") => {
    const question = String(promptText || assistantInput || "").trim();
    if (!question) return;
    if (!isAuthenticated) {
      pushToast("error", "Login required to use AI assistant.");
      return;
    }
    const userMessage = { id: `u-${Date.now()}`, role: "user", content: question };
    setAssistantMessages((current) => [...current, userMessage]);
    setAssistantInput("");
    setAssistantSending(true);
    try {
      const response = await jobPortalApi.chatAssistant({
        message: question,
      });
      const result = response?.data || {};
      const nextStepsText = Array.isArray(result?.nextSteps) && result.nextSteps.length
        ? `Next steps: ${result.nextSteps.map((step, index) => `${index + 1}. ${step}`).join(" ")}`
        : "";
      const alertsText = Array.isArray(result?.safetyAlerts) && result.safetyAlerts.length
        ? `Safety alerts: ${result.safetyAlerts.join(" | ")}`
        : "";
      const botText = [String(result?.answer || "").trim(), nextStepsText, alertsText].filter(Boolean).join("\n\n");
      const botMessage = {
        id: `b-${Date.now() + 1}`,
        role: "bot",
        content: botText || "I could not generate a response right now. Please try again.",
      };
      setAssistantProvider(result?.provider || "fallback");
      setAssistantMessages((current) => [...current, botMessage]);
      if (result?.provider === "openai") {
        jobPortalNotifications.showNotification({
          title: "NilaJobs Assistant",
          body: "Your AI guidance is ready.",
        });
      }
    } catch (error) {
      const fallbackMessage = {
        id: `b-${Date.now() + 1}`,
        role: "bot",
        content:
          "I could not reach the AI service right now. Update your profile skills and apply to roles with 60%+ match for better outcomes.",
      };
      setAssistantProvider("fallback");
      setAssistantMessages((current) => [...current, fallbackMessage]);
      pushToast("error", error?.response?.data?.message || "Unable to connect AI assistant.");
      await jobPortalTelemetry.sendEvent(
        jobPortalApi,
        "api_error",
        { route: "assistant", message: error?.message || "assistant_failed" },
        "mobile"
      );
    } finally {
      setAssistantSending(false);
    }
  };
  const handleAssistantQuickPrompt = (promptText) => {
    setAssistantInput(promptText);
    sendAssistantMessage(promptText);
  };

  return (
    <div className="jp-shell">
      <header className="jp-topbar">
        <div>
          <h1>{heroCopy.title}</h1>
          <p>{heroCopy.subtitle}</p>
        </div>
        <div className="jp-topbar-actions">
          <span className={`jp-network-pill ${isOnline ? "online" : "offline"}`}>
            {isOnline ? "Online" : "Offline"}
          </span>
          <div className="jp-language-switch" role="tablist" aria-label="Language switch">
            {["en", "ml", "hi"].map((language) => (
              <button
                key={language}
                type="button"
                className={`jp-language-btn ${uiLanguage === language ? "active" : ""}`}
                onClick={() => setUiLanguage(language)}
              >
                {language.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" className="jp-btn jp-btn-muted" onClick={() => setAssistantOpen(true)}>
            Career Tips Assistant
          </button>
        </div>
      </header>

      <nav className="jp-nav" aria-label="Job portal navigation">
        {[
          { id: "home", label: "Home" },
          { id: "overview360", label: "360 Dashboard" },
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
            <section className="jp-panel jp-brand-hero">
              <div>
                <h2>{heroCopy.title}</h2>
                <p>{heroCopy.subtitle}</p>
              </div>
              <div className="jp-hero-pills">
                <span>Verified trust layer</span>
                <span>AI-powered matching</span>
                <span>Employer funnel analytics</span>
              </div>
            </section>
            <section className="jp-panel jp-ai-panel">
              <div className="jp-panel-head">
                <h2>AI Job Match</h2>
                <p>Enter your skills to rank jobs by fit score and improve employer shortlisting quality.</p>
              </div>
              <textarea
                className="jp-ai-input"
                value={aiSkillInput}
                onChange={(event) => setAiSkillInput(event.target.value)}
                placeholder="React, Node.js, Tally, Sales, CRM, Arabic..."
              />
              <p className="jp-muted-text">
                Current matching skills: {candidateSkills.length ? candidateSkills.join(", ") : "Add skills for match scoring"}
              </p>
            </section>

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
              {!jobsLoading && !jobsError && displayedJobs.length === 0 ? (
                <div className="jp-empty-state">
                  <h4>No jobs found for current filters</h4>
                  <p>Try switching job type, clearing district filter, or adding broader skills in AI Match.</p>
                </div>
              ) : null}
              <div className="jp-job-grid">
                {displayedJobs.map((job) => {
                  const jobId = String(job?._id || job?.id || "");
                  return (
                    <JobCard
                      key={jobId}
                      job={job}
                      matchScore={getJobMatchScore(job)}
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

        {activeTab === "overview360" ? (
          <JobPortalOverview360
            data={overviewData}
            loading={overviewLoading}
            error={overviewError}
            onRefresh={loadOverview360}
          />
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
            {!savedLoading && savedJobs.length === 0 ? (
              <div className="jp-empty-state">
                <h4>No saved jobs yet</h4>
                <p>Save interesting roles first, then compare trust score, salary, and match quality here.</p>
              </div>
            ) : null}
            <div className="jp-job-grid">
              {savedJobs.map((job) => {
                const jobId = String(job?._id || job?.id || "");
                return (
                  <JobCard
                    key={jobId}
                    job={job}
                    matchScore={getJobMatchScore(job)}
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
            uploadProgress={profileUploadProgress}
            jobAlertsEnabled={jobAlertsEnabled}
            onToggleJobAlerts={setJobAlertsEnabled}
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
          uploadProgress={applyUploadProgress}
          onCancelApply={cancelApplyUpload}
        />
      ) : null}

      {assistantOpen ? (
        <AIAssistant
          messages={assistantMessages}
          input={assistantInput}
          onInputChange={setAssistantInput}
          onSend={sendAssistantMessage}
          quickPrompts={ASSISTANT_QUICK_PROMPTS}
          onQuickPrompt={handleAssistantQuickPrompt}
          onClose={() => setAssistantOpen(false)}
          isSending={assistantSending}
          provider={assistantProvider}
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

      {isAuthenticated && queueSize > 0 ? (
        <div className="jp-offline-pill" role="status" aria-live="polite">
          {queueSyncing ? "Syncing offline actions..." : `${queueSize} offline action(s) pending sync`}
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

