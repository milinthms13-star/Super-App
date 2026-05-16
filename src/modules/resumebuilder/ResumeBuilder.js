import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";
import { useApp } from "../../contexts/AppContext";
import { buildApiUrl } from "../../utils/api";
import { getStoredAuthToken } from "../../utils/auth";
import "./ResumeBuilder.css";

const LOCAL_DRAFTS_KEY = "resume_builder_local_drafts_v1";
const LOCAL_USAGE_KEY = "resume_builder_usage_v1";
const FREE_TEMPLATE_IDS = ["simple-ats", "modern-professional"];

const INITIAL_USAGE = { resumeGenerations: 0, atsChecks: 0 };

const INITIAL_FORM_DATA = {
  name: "",
  email: "",
  phone: "",
  location: "",
  targetJob: "",
  preferredCountry: "UAE",
  summary: "",
  skills: "",
  education: "",
  experience: "",
  projects: "",
  certifications: "",
  languages: "English, Malayalam",
  linkedin: "",
  passportStatus: "",
  visaStatus: "",
  currentVisaType: "",
  visaExpiry: "",
  transferableVisa: "",
  availableToRelocate: "Yes",
  preferredGulfCountry: "UAE",
  workPermitStatus: "",
  gccExperience: "",
  drivingLicense: "",
  drivingLicenseCountry: "",
  joiningAvailability: "",
  expectedSalary: "",
  noticePeriod: "",
  accommodationRequired: "No",
  industryCategory: "",
};

const SECTION_ITEMS = [
  { id: "upload", icon: "UP", label: "Resume Upload" },
  { id: "ai-builder", icon: "AI", label: "AI Builder" },
  { id: "templates", icon: "TMP", label: "Templates" },
  { id: "ats-score", icon: "ATS", label: "ATS Score" },
  { id: "job-match", icon: "FIT", label: "Job Match" },
  { id: "cover-letter", icon: "CVR", label: "Cover Letter" },
  { id: "linkedin", icon: "LNK", label: "LinkedIn" },
  { id: "recruiter-email", icon: "MAIL", label: "Recruiter Email" },
  { id: "interview-prep", icon: "QNA", label: "Interview Prep" },
  { id: "my-resumes", icon: "SAVE", label: "My Resumes" },
];

const WIZARD_STEPS = [
  { id: "start", label: "Start" },
  { id: "personal", label: "Personal Details" },
  { id: "career", label: "Career Details" },
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Skills" },
  { id: "gulf", label: "Gulf Details" },
  { id: "template", label: "Template" },
  { id: "ats", label: "ATS Check" },
  { id: "download", label: "Download" },
];

const TEMPLATE_OPTIONS = [
  { id: "simple-ats", name: "Simple ATS", icon: "ATS", description: "Clean parser-friendly format", premium: false },
  { id: "modern-professional", name: "Modern Professional", icon: "PRO", description: "Balanced executive look", premium: false },
  { id: "creative-grid", name: "Creative Grid", icon: "ART", description: "Visual-first layout", premium: true },
  { id: "gulf-blue-professional", name: "Gulf Blue Professional", icon: "GLF", description: "Middle East recruiter style", premium: true },
  { id: "uae-corporate", name: "UAE Corporate", icon: "UAE", description: "Corporate UAE resume pattern", premium: true },
  { id: "saudi-formal", name: "Saudi Formal", icon: "KSA", description: "Formal Saudi application style", premium: true },
  { id: "qatar-oman-clean", name: "Qatar/Oman Clean", icon: "QOM", description: "Simple GCC readable layout", premium: true },
  { id: "europe-ats", name: "Europe ATS", icon: "EUR", description: "EU ATS-focused formatting", premium: true },
  { id: "us-tech-resume", name: "US Tech Resume", icon: "UST", description: "US engineering style with impact bullets", premium: true },
  { id: "fresher-student", name: "Fresher Student", icon: "STD", description: "Internship and project-first resume", premium: true },
  { id: "executive-2page", name: "Executive 2-page", icon: "EXE", description: "Leadership and business outcomes", premium: true },
  { id: "nurse-healthcare", name: "Nurse / Healthcare", icon: "MED", description: "Clinical profile + certifications", premium: true },
  { id: "driver-technician-accountant", name: "Driver / Technician / Accountant", icon: "SKL", description: "Trade and operations roles", premium: true },
];

const COVER_LETTER_TYPES = [
  { id: "company", label: "Company" },
  { id: "startup", label: "Startup" },
  { id: "gulf", label: "Gulf Recruiter" },
];

const COUNTRIES = ["UAE", "Saudi Arabia", "Qatar", "Oman", "Kuwait", "Bahrain", "Europe", "USA", "India"];

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "for", "with", "to", "of", "in", "is", "are", "on", "at", "from", "by", "this", "that", "as", "be", "will", "your", "our", "you",
]);

const toList = (value = "") =>
  String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const toLines = (value = "") =>
  String(value || "")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

const clean = (value = "") => String(value || "").replace(/\s+/g, " ").trim();

const extractKeywords = (value = "") => {
  const words = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word) && !/^\d+$/.test(word));

  const counts = new Map();
  words.forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 24)
    .map(([keyword]) => keyword);
};

const parseEducation = (value = "") =>
  toLines(value).map((line) => {
    const [degree = "", institution = "", year = ""] = line.split("|").map((part) => part.trim());
    return { degree: degree || line, institution: institution || "", year: year || "" };
  });

const parseProjects = (value = "") =>
  toLines(value).map((line) => {
    const [name = "", tech = "", summary = ""] = line.split("|").map((part) => part.trim());
    return { name: name || line, tech: tech || "", summary: summary || "" };
  });

const parseExperience = (value = "") =>
  toLines(value).map((line) => {
    const [role = "", company = "", duration = "", achievements = ""] = line.split("|").map((part) => part.trim());
    const bullets = String(achievements || "")
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean);

    return { role: role || line, company: company || "", duration: duration || "", bullets: bullets.length > 0 ? bullets : [] };
  });

const parseResumeTextToFormData = (text = "") => {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return {};

  const allText = lines.join("\n");
  const emailMatch = allText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  const phoneMatch = allText.match(/(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?(?:\d[\d\s-]{5,14}\d)/g);
  const inferredName = lines[0] && !/resume|curriculum vitae|cv/i.test(lines[0]) ? lines[0] : lines[1] || "";
  const summaryLines = lines.slice(1, 4).filter((line) => !/^\s*(email|phone|mobile|linkedin|github|address):?/i.test(line));

  return {
    name: clean(inferredName),
    email: clean(emailMatch?.[0] || ""),
    phone: clean(phoneMatch?.[0] || ""),
    summary: clean(summaryLines.join(" ")),
  };
};

const rewriteSummaryLocal = (formData = {}, jobDescription = "") => {
  const role = clean(formData.targetJob) || "professional";
  const skills = toList(formData.skills).slice(0, 6);
  const keywords = extractKeywords(jobDescription).slice(0, 4);
  return `Results-driven ${role} with hands-on experience in ${skills.join(", ") || "operations and delivery"}. Proven ability to execute high-quality outcomes in fast-paced environments${keywords.length ? `, with strong alignment to ${keywords.join(", ")}` : ""}.`;
};

const rewriteExperienceLocal = (experienceText = "") =>
  parseExperience(experienceText)
    .map((item) => {
      const bullets = (item.bullets || []).slice(0, 4).map((bullet, index) => {
        if (/(\d+%|\d+\+|improved|reduced|increased|saved|achieved)/i.test(bullet)) return bullet;
        return index === 0 ? `${bullet} and improved turnaround time by 20%.` : `${bullet} with clear quality and SLA focus.`;
      });
      return `${item.role || "Role"} | ${item.company || "Company"} | ${item.duration || "Duration"} | ${bullets.join(", ")}`;
    })
    .join("\n");

const inferRoleSkills = (roleText = "") => {
  const role = clean(roleText).toLowerCase();
  if (/accountant|finance/.test(role)) return ["Tally", "GST filing", "Bookkeeping", "MS Excel", "Reconciliation"];
  if (/driver/.test(role)) return ["Route planning", "Defensive driving", "Fleet safety", "Vehicle maintenance"];
  if (/technician|electrician|mechanic/.test(role)) return ["Preventive maintenance", "Troubleshooting", "Safety compliance", "Tool handling"];
  if (/nurse|healthcare/.test(role)) return ["Patient care", "Clinical documentation", "Infection control", "Emergency response"];
  if (/software|developer|engineer|tech/.test(role)) return ["JavaScript", "React", "APIs", "Problem solving", "System design"];
  return ["Communication", "Teamwork", "Problem solving", "Execution", "Documentation"];
};

const buildResumeFromForm = (formData = {}, template = "simple-ats", resumeType = "professional", language = "en") => ({
  header: {
    fullName: clean(formData.name),
    targetJob: clean(formData.targetJob),
    location: clean(formData.location),
    preferredCountry: clean(formData.preferredCountry),
    email: clean(formData.email),
    phone: clean(formData.phone),
    linkedin: clean(formData.linkedin),
  },
  profile: clean(formData.summary) || rewriteSummaryLocal(formData, ""),
  skills: toList(formData.skills),
  education: parseEducation(formData.education),
  experience: parseExperience(formData.experience),
  projects: parseProjects(formData.projects),
  certifications: toList(formData.certifications),
  languages: toList(formData.languages),
  gulfProfile: {
    passportStatus: clean(formData.passportStatus),
    visaStatus: clean(formData.visaStatus),
    currentVisaType: clean(formData.currentVisaType),
    visaExpiry: clean(formData.visaExpiry),
    transferableVisa: clean(formData.transferableVisa),
    availableToRelocate: clean(formData.availableToRelocate),
    preferredGulfCountry: clean(formData.preferredGulfCountry),
    workPermitStatus: clean(formData.workPermitStatus),
    gccExperience: clean(formData.gccExperience),
    drivingLicense: clean(formData.drivingLicense),
    drivingLicenseCountry: clean(formData.drivingLicenseCountry),
    joiningAvailability: clean(formData.joiningAvailability),
    expectedSalary: clean(formData.expectedSalary),
    noticePeriod: clean(formData.noticePeriod),
    accommodationRequired: clean(formData.accommodationRequired),
    industryCategory: clean(formData.industryCategory),
  },
  template,
  resumeType,
  language,
});

const computeSectionCompleteness = (resume = {}) => {
  const checks = {
    profile: Boolean(clean(resume.profile).length >= 60),
    skills: Array.isArray(resume.skills) && resume.skills.length > 0,
    education: Array.isArray(resume.education) && resume.education.length > 0,
    experience: Array.isArray(resume.experience) && resume.experience.length > 0,
    projects: Array.isArray(resume.projects) && resume.projects.length > 0,
    certifications: Array.isArray(resume.certifications) && resume.certifications.length > 0,
  };
  const completed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  return { checks, completed, total, percent: Math.round((completed / total) * 100) };
};

const formatResumeText = (resume = {}) => {
  const lines = [];
  const header = resume.header || {};
  lines.push(header.fullName || "Candidate");
  lines.push(header.targetJob || "");
  lines.push([header.location, header.preferredCountry].filter(Boolean).join(", "));
  lines.push([header.email, header.phone].filter(Boolean).join(" | "));
  lines.push(header.linkedin || "");
  lines.push("");
  lines.push("PROFILE");
  lines.push(resume.profile || "");
  lines.push("");
  lines.push("SKILLS");
  lines.push((resume.skills || []).join(", "));
  lines.push("");
  lines.push("EXPERIENCE");
  (resume.experience || []).forEach((item) => {
    lines.push(`${item.role || ""} | ${item.company || ""} | ${item.duration || ""}`.replace(/\s+\|/g, " |"));
    (item.bullets || []).forEach((bullet) => lines.push(`- ${bullet}`));
  });
  lines.push("");
  lines.push("GULF PROFILE");
  const gulf = resume.gulfProfile || {};
  lines.push(`Visa Status: ${gulf.visaStatus || "N/A"}`);
  lines.push(`Current Visa Type: ${gulf.currentVisaType || "N/A"}`);
  lines.push(`Relocation: ${gulf.availableToRelocate || "N/A"}`);
  return lines.join("\n");
};

const buildLocalAtsReport = ({ resume = {}, jobDescription = "" }) => {
  const resumeText = formatResumeText(resume).toLowerCase();
  const jdKeywords = extractKeywords(jobDescription);
  const resumeKeywords = extractKeywords(resumeText);
  const matchedKeywords = jdKeywords.filter((keyword) => resumeKeywords.includes(keyword));
  const missingKeywords = jdKeywords.filter((keyword) => !resumeKeywords.includes(keyword));
  const keywordMatchPercent = jdKeywords.length ? Math.round((matchedKeywords.length / jdKeywords.length) * 100) : 0;
  const sectionCompleteness = computeSectionCompleteness(resume);
  const suggestions = [];
  if (clean(resume.profile).length < 60) suggestions.push("Strengthen your summary with outcomes.");
  if (keywordMatchPercent < 35) suggestions.push("Add missing keywords from the job description.");
  if (sectionCompleteness.percent < 70) suggestions.push("Complete missing resume sections.");
  return {
    score: Math.max(30, Math.min(100, 52 + Math.round(keywordMatchPercent * 0.5) + Math.round(sectionCompleteness.percent * 0.35))),
    keywordMatchPercent,
    matchedKeywords,
    missingKeywords,
    issues: [],
    warnings: [],
    suggestions,
    sectionCompleteness,
    checkedAt: new Date().toISOString(),
  };
};

const loadLocalDrafts = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_DRAFTS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const saveLocalDrafts = (drafts = []) => localStorage.setItem(LOCAL_DRAFTS_KEY, JSON.stringify(drafts));
const loadLocalUsage = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_USAGE_KEY) || "{}");
    return { resumeGenerations: Number(parsed?.resumeGenerations || 0), atsChecks: Number(parsed?.atsChecks || 0) };
  } catch (_error) {
    return { ...INITIAL_USAGE };
  }
};
const saveLocalUsage = (usage) => localStorage.setItem(LOCAL_USAGE_KEY, JSON.stringify(usage));

const TEMPLATE_THEME = {
  "simple-ats": { primary: "#1d4ed8" },
  "modern-professional": { primary: "#0f172a" },
  "creative-grid": { primary: "#7c3aed" },
  "gulf-blue-professional": { primary: "#0f3c73" },
  "uae-corporate": { primary: "#0b4f3c" },
  "saudi-formal": { primary: "#14532d" },
  "qatar-oman-clean": { primary: "#7a1c3d" },
  "europe-ats": { primary: "#1e3a8a" },
  "us-tech-resume": { primary: "#111827" },
  "fresher-student": { primary: "#4338ca" },
  "executive-2page": { primary: "#111827" },
  "nurse-healthcare": { primary: "#0f766e" },
  "driver-technician-accountant": { primary: "#374151" },
};

const hexToRgb = (hex = "#1d4ed8") => {
  const safe = hex.replace("#", "");
  const n = Number.parseInt(safe, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
};

const ResumeBuilder = () => {
  const { user } = useApp();
  const [activeSection, setActiveSection] = useState("upload");
  const [wizardStep, setWizardStep] = useState(0);
  const [template, setTemplate] = useState("simple-ats");
  const [resumeType, setResumeType] = useState("professional");
  const [language, setLanguage] = useState("en");
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [resumeData, setResumeData] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [atsReport, setAtsReport] = useState(null);
  const [coverLetterType, setCoverLetterType] = useState("company");
  const [coverLetter, setCoverLetter] = useState(null);
  const [interviewPrep, setInterviewPrep] = useState(null);
  const [linkedInProfile, setLinkedInProfile] = useState("");
  const [recruiterEmail, setRecruiterEmail] = useState("");
  const [draftName, setDraftName] = useState("");
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [savedResumes, setSavedResumes] = useState([]);
  const [uploadedResumeName, setUploadedResumeName] = useState("");
  const [usageStats, setUsageStats] = useState(INITIAL_USAGE);
  const [busyKey, setBusyKey] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });

  const token = getStoredAuthToken();
  const isAuthenticated = Boolean(token);

  const hasPremiumAccess = useMemo(() => {
    const rawPlan = String(user?.planName || user?.subscriptionPlan || user?.subscriptionStatus || "").toLowerCase();
    return Boolean(user?.isPremium || rawPlan.includes("premium") || rawPlan.includes("pro") || rawPlan.includes("active"));
  }, [user?.isPremium, user?.planName, user?.subscriptionPlan, user?.subscriptionStatus]);

  const pushStatus = useCallback((type, message) => setStatus({ type, message }), []);
  const canUseTemplate = useCallback((templateId) => hasPremiumAccess || FREE_TEMPLATE_IDS.includes(templateId), [hasPremiumAccess]);

  useEffect(() => {
    setFormData((current) => ({ ...current, name: current.name || user?.name || "", email: current.email || user?.email || "" }));
  }, [user?.email, user?.name]);
  useEffect(() => setUsageStats(loadLocalUsage()), []);

  const updateUsage = useCallback((patch = {}) => {
    setUsageStats((current) => {
      const next = {
        resumeGenerations: Number(current.resumeGenerations || 0) + Number(patch.resumeGenerations || 0),
        atsChecks: Number(current.atsChecks || 0) + Number(patch.atsChecks || 0),
      };
      saveLocalUsage(next);
      return next;
    });
  }, []);

  const getHeaders = useCallback(() => {
    const authToken = getStoredAuthToken();
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  }, []);
  const request = useCallback(
    async (method, path, payload) => {
      const response = await axios({ method, url: buildApiUrl(path), data: payload, headers: getHeaders() });
      return response.data;
    },
    [getHeaders]
  );

  const validateForm = useCallback(() => {
    if (!clean(formData.name)) return false;
    if (!clean(formData.targetJob)) return false;
    if (!clean(formData.skills)) return false;
    if (!clean(formData.email) && !clean(formData.phone)) return false;
    return true;
  }, [formData]);

  const previewResume = useMemo(() => resumeData || buildResumeFromForm(formData, template, resumeType, language), [formData, language, resumeData, resumeType, template]);
  const completeness = useMemo(() => computeSectionCompleteness(previewResume).percent, [previewResume]);
  const roleSuggestions = useMemo(() => inferRoleSkills(formData.targetJob), [formData.targetJob]);
  const missingSkills = useMemo(() => {
    const jd = extractKeywords(jobDescription);
    const existing = new Set(extractKeywords(`${formData.skills} ${formData.summary} ${formData.experience}`));
    return jd.filter((keyword) => !existing.has(keyword)).slice(0, 10);
  }, [formData.experience, formData.skills, formData.summary, jobDescription]);

  const withBusy = useCallback(async (key, fn) => {
    setBusyKey(key);
    try {
      await fn();
    } finally {
      setBusyKey("");
    }
  }, []);

  const loadResumes = useCallback(async () => {
    if (!isAuthenticated) {
      setSavedResumes(loadLocalDrafts());
      return;
    }
    try {
      const result = await request("get", "/resumebuilder/my-resumes");
      setSavedResumes(Array.isArray(result?.resumes) ? result.resumes : []);
    } catch (_error) {
      setSavedResumes([]);
    }
  }, [isAuthenticated, request]);
  useEffect(() => {
    loadResumes();
  }, [loadResumes]);

  const handleInputChange = (field) => (event) => {
    const value = event?.target?.value ?? "";
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const chooseTemplate = useCallback(
    (templateId) => {
      if (!canUseTemplate(templateId)) {
        pushStatus("error", "This template is premium.");
        return;
      }
      setTemplate(templateId);
      pushStatus("success", `Template changed to ${TEMPLATE_OPTIONS.find((item) => item.id === templateId)?.name || templateId}.`);
    },
    [canUseTemplate, pushStatus]
  );

  const handleUploadResume = useCallback(
    (event) => {
      const file = event?.target?.files?.[0];
      if (!file) return;
      setUploadedResumeName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const parsed = parseResumeTextToFormData(String(e?.target?.result || ""));
        setFormData((current) => ({ ...current, ...parsed }));
        pushStatus("success", "Resume uploaded and basic details auto-filled.");
      };
      reader.readAsText(file);
    },
    [pushStatus]
  );

  const handleRoleWiseGeneration = useCallback(() => {
    const suggested = inferRoleSkills(formData.targetJob);
    setFormData((current) => ({ ...current, skills: [...new Set([...toList(current.skills), ...suggested])].join(", "), summary: rewriteSummaryLocal(current, jobDescription) }));
    pushStatus("success", "Role-wise generation applied.");
  }, [formData.targetJob, jobDescription, pushStatus]);

  const handleGulfStyle = useCallback(() => {
    setResumeType("gulf");
    chooseTemplate("gulf-blue-professional");
    setFormData((current) => ({ ...current, summary: `${rewriteSummaryLocal(current, jobDescription)} Gulf-ready profile with visa and relocation clarity.` }));
  }, [chooseTemplate, jobDescription]);

  const handleGenerateResume = useCallback(async () => {
    if (!validateForm()) {
      pushStatus("error", "Please fill name, target role, skills, and at least email or phone before generating.");
      return;
    }
    if (!hasPremiumAccess && usageStats.resumeGenerations >= 1) {
      pushStatus("error", "Free limit reached: 1 resume generation.");
      return;
    }

    if (!isAuthenticated) {
      setResumeData(buildResumeFromForm(formData, template, resumeType, language));
      updateUsage({ resumeGenerations: 1 });
      pushStatus("success", "Resume generated locally.");
      return;
    }

    await withBusy("generate", async () => {
      try {
        const result = await request("post", "/resumebuilder/generate", { formData, template, resumeType, language });
        setResumeData(result?.resume || null);
        updateUsage({ resumeGenerations: 1 });
        pushStatus("success", "Resume generated.");
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Generate failed.");
      }
    });
  }, [formData, hasPremiumAccess, isAuthenticated, language, pushStatus, request, resumeType, template, updateUsage, usageStats.resumeGenerations, validateForm, withBusy]);

  const handleAtsCheck = useCallback(async () => {
    if (!clean(jobDescription)) {
      pushStatus("error", "Paste a job description before running ATS check.");
      return;
    }
    if (!hasPremiumAccess && usageStats.atsChecks >= 1) {
      pushStatus("error", "Free limit reached: 1 ATS check.");
      return;
    }
    const resumePayload = resumeData || buildResumeFromForm(formData, template, resumeType, language);

    if (!isAuthenticated) {
      setAtsReport(buildLocalAtsReport({ resume: resumePayload, jobDescription }));
      updateUsage({ atsChecks: 1 });
      return;
    }

    await withBusy("ats", async () => {
      try {
        const result = await request("post", "/resumebuilder/ats-check", { resume: resumePayload, jobDescription });
        setAtsReport(result?.report || null);
        updateUsage({ atsChecks: 1 });
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "ATS check failed.");
      }
    });
  }, [formData, hasPremiumAccess, isAuthenticated, jobDescription, language, pushStatus, request, resumeData, resumeType, template, updateUsage, usageStats.atsChecks, withBusy]);

  const handleOptimizeResume = useCallback(async () => {
    if (!clean(jobDescription)) {
      pushStatus("error", "Paste a job description before improving the resume.");
      return;
    }
    const resumePayload = resumeData || buildResumeFromForm(formData, template, resumeType, language);
    if (!isAuthenticated) {
      const local = buildLocalAtsReport({ resume: resumePayload, jobDescription });
      const optimized = {
        ...resumePayload,
        profile: `${clean(resumePayload.profile)} ${local.missingKeywords.slice(0, 6).join(", ")}`.trim(),
      };
      setResumeData(optimized);
      setAtsReport(buildLocalAtsReport({ resume: optimized, jobDescription }));
      return;
    }
    await withBusy("optimize", async () => {
      try {
        const result = await request("post", "/resumebuilder/optimize", { resume: resumePayload, jobDescription });
        setResumeData(result?.resume || resumePayload);
        if (result?.report) setAtsReport(result.report);
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Resume optimization failed.");
      }
    });
  }, [formData, isAuthenticated, jobDescription, language, pushStatus, request, resumeData, resumeType, template, updateUsage, withBusy]);

  const handleCoverLetter = useCallback(async () => {
    const resumePayload = resumeData || buildResumeFromForm(formData, template, resumeType, language);
    if (!isAuthenticated) {
      const topSkills = (resumePayload.skills || []).slice(0, 4);
      setCoverLetter({
        type: coverLetterType,
        content: `Dear Hiring Manager,\n\nI am applying for the ${formData.targetJob || "role"}. I bring experience in ${topSkills.join(", ")}.\n\nSincerely,\n${formData.name || "Candidate"}`,
        highlights: topSkills,
      });
      return;
    }
    await withBusy("cover-letter", async () => {
      try {
        const result = await request("post", "/resumebuilder/cover-letter", { formData, resume: resumePayload, type: coverLetterType, jobDescription });
        setCoverLetter(result?.letter || null);
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Cover letter generation failed.");
      }
    });
  }, [coverLetterType, formData, isAuthenticated, jobDescription, language, pushStatus, request, resumeData, resumeType, template, withBusy]);

  const handleLinkedInGenerate = useCallback(() => {
    const header = previewResume?.header || {};
    const topSkills = (previewResume?.skills || []).slice(0, 8).join(" | ");
    setLinkedInProfile(`${header.targetJob || "Professional"} | ${header.preferredCountry || "Global"} | ${topSkills}\n\n${previewResume?.profile || ""}`);
  }, [previewResume]);
  const handleRecruiterEmail = useCallback(() => {
    const header = previewResume?.header || {};
    const gulf = previewResume?.gulfProfile || {};
    setRecruiterEmail(`Subject: Application - ${header.targetJob || "Role"}\n\nDear Recruiter,\n\nI am interested in the ${header.targetJob || "position"} role.\nVisa: ${gulf.visaStatus || "N/A"} | Type: ${gulf.currentVisaType || "N/A"}\nRelocation: ${gulf.availableToRelocate || "Yes"}\n\nRegards,\n${header.fullName || "Candidate"}`);
  }, [previewResume]);

  const handleInterviewPrep = useCallback(async () => {
    if (!clean(formData.targetJob)) {
      pushStatus("error", "Add a target role before generating interview prep.");
      return;
    }
    if (!isAuthenticated) {
      setInterviewPrep({
        questions: [`Tell me about your experience related to ${formData.targetJob || "this role"}.`, "How do you handle deadlines?"],
        tips: ["Use STAR format.", "Quantify impact."],
      });
      return;
    }
    await withBusy("interview", async () => {
      try {
        const result = await request("post", "/resumebuilder/interview-prep", { targetJob: formData.targetJob, jobDescription, experience: formData.experience, skills: formData.skills });
        setInterviewPrep(result?.prep || null);
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Interview prep generation failed.");
      }
    });
  }, [formData.experience, formData.skills, formData.targetJob, isAuthenticated, jobDescription, pushStatus, request, withBusy]);

  const persistLocalDraft = useCallback(() => {
    const drafts = loadLocalDrafts();
    const id = selectedResumeId || `local-${Date.now()}`;
    const payload = { _id: id, id, name: clean(draftName) || `${clean(formData.name) || "Untitled"} Resume`, resumeType, template, language, formData, resumeData: previewResume, jobDescription, updatedAt: new Date().toISOString() };
    const next = drafts.filter((item) => String(item?._id || item?.id) !== id);
    next.unshift(payload);
    saveLocalDrafts(next);
    setSavedResumes(next);
    setSelectedResumeId(id);
  }, [draftName, formData, jobDescription, language, previewResume, resumeType, selectedResumeId, template]);

  const handleSaveDraft = useCallback(async () => {
    if (!validateForm()) {
      pushStatus("error", "Please fill name, target role, skills, and at least email or phone before saving.");
      return;
    }
    if (!isAuthenticated) {
      persistLocalDraft();
      return;
    }
    await withBusy("save", async () => {
      const payload = { name: clean(draftName) || `${clean(formData.name) || "Untitled"} Resume`, resumeType, template, language, formData, resumeData: previewResume, atsScore: atsReport?.score };
      try {
        if (selectedResumeId) {
          await request("put", `/resumebuilder/my-resumes/${selectedResumeId}`, payload);
        } else {
          const result = await request("post", "/resumebuilder/my-resumes", payload);
          setSelectedResumeId(result?.resume?._id || result?.resume?.id || "");
        }
        await loadResumes();
      } catch (_error) {}
    });
  }, [atsReport?.score, draftName, formData, isAuthenticated, language, loadResumes, persistLocalDraft, previewResume, request, resumeType, selectedResumeId, template, validateForm, withBusy]);

  const openDraft = useCallback((record) => {
    setFormData((current) => ({ ...current, ...INITIAL_FORM_DATA, ...(record?.formData || {}) }));
    setResumeData(record?.resumeData || null);
    setTemplate(record?.template || "simple-ats");
    setResumeType(record?.resumeType || "professional");
    setLanguage(record?.language || "en");
    setDraftName(record?.name || "");
    setSelectedResumeId(record?._id || record?.id || "");
    setJobDescription(record?.jobDescription || "");
    setActiveSection("ai-builder");
  }, []);

  const deleteDraft = useCallback(async (record) => {
    const recordId = record?._id || record?.id || "";
    if (!recordId) return;
    if (!isAuthenticated || String(recordId).startsWith("local-")) {
      const next = loadLocalDrafts().filter((item) => String(item?._id || item?.id) !== String(recordId));
      saveLocalDrafts(next);
      setSavedResumes(next);
      return;
    }
    await withBusy(`delete-${recordId}`, async () => {
      await request("delete", `/resumebuilder/my-resumes/${recordId}`);
      await loadResumes();
    });
  }, [isAuthenticated, loadResumes, request, withBusy]);

  const duplicateDraft = useCallback(async (record) => {
    const recordId = record?._id || record?.id || "";
    if (!recordId) return;
    if (!isAuthenticated || String(recordId).startsWith("local-")) {
      const drafts = loadLocalDrafts();
      const duplicateId = `local-${Date.now()}`;
      drafts.unshift({ ...record, _id: duplicateId, id: duplicateId, name: `${record?.name || "Untitled"} (Copy)`, updatedAt: new Date().toISOString() });
      saveLocalDrafts(drafts);
      setSavedResumes(drafts);
      return;
    }
    await withBusy(`duplicate-${recordId}`, async () => {
      await request("post", `/resumebuilder/my-resumes/${recordId}/duplicate`);
      await loadResumes();
    });
  }, [isAuthenticated, loadResumes, request, withBusy]);

  const renameDraft = useCallback(async (record) => {
    const recordId = record?._id || record?.id || "";
    if (!recordId) return;
    const nextName = window.prompt("Enter a new resume name", clean(record?.name) || "Untitled Resume");
    if (nextName === null) return;
    const normalizedName = clean(nextName);
    if (!normalizedName) return;
    if (!isAuthenticated || String(recordId).startsWith("local-")) {
      const next = loadLocalDrafts().map((item) => (String(item?._id || item?.id) === String(recordId) ? { ...item, name: normalizedName, updatedAt: new Date().toISOString() } : item));
      saveLocalDrafts(next);
      setSavedResumes(next);
      return;
    }
    await withBusy(`rename-${recordId}`, async () => {
      await request("put", `/resumebuilder/my-resumes/${recordId}`, { name: normalizedName });
      await loadResumes();
    });
  }, [isAuthenticated, loadResumes, request, withBusy]);

  const exportPdf = useCallback(() => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const theme = TEMPLATE_THEME[template] || TEMPLATE_THEME["simple-ats"];
    const rgb = hexToRgb(theme.primary);
    let y = 44;

    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.rect(0, 0, 595, 64, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(17);
    doc.text(previewResume?.header?.fullName || "Candidate", 44, 34);
    doc.setFontSize(11);
    doc.text(previewResume?.header?.targetJob || "Resume", 44, 50);
    doc.setTextColor(30, 41, 59);
    y = 84;

    formatResumeText(previewResume).split("\n").forEach((line) => {
      const wrapped = doc.splitTextToSize(line || " ", 510);
      wrapped.forEach((segment) => {
        if (y > 790) {
          doc.addPage();
          y = 44;
        }
        if (/^[A-Z ]+$/.test(segment)) {
          doc.setTextColor(rgb.r, rgb.g, rgb.b);
          doc.setFontSize(11);
        } else {
          doc.setTextColor(30, 41, 59);
          doc.setFontSize(10);
        }
        doc.text(segment, 44, y);
        y += 13;
      });
    });
    doc.save(`${clean(previewResume?.header?.fullName || "resume").replace(/\s+/g, "_")}_${template}.pdf`);
  }, [previewResume, template]);

  const exportDoc = useCallback(async () => {
    const theme = TEMPLATE_THEME[template] || TEMPLATE_THEME["simple-ats"];
    const headingColor = theme.primary.replace("#", "");
    const docFile = new Document({
      sections: [{
        properties: {},
        children: formatResumeText(previewResume)
          .split("\n")
          .map((line) => new Paragraph({
            children: [new TextRun({
              text: line || " ",
              color: /^[A-Z ]+$/.test(line) ? headingColor : undefined,
              bold: /^[A-Z ]+$/.test(line),
            })],
          })),
      }],
    });
    const blob = await Packer.toBlob(docFile);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${clean(previewResume?.header?.fullName || "resume").replace(/\s+/g, "_")}_${template}.docx`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [previewResume, template]);

  const copyText = useCallback(async (text) => {
    await navigator.clipboard.writeText(text);
  }, []);

  const renderPreview = () => (
    <div className={`resume-live-preview template-${template}`}>
      <div className="preview-head">
        <h3>{previewResume?.header?.fullName || "Your Name"}</h3>
        <p>{previewResume?.header?.targetJob || "Target Role"}</p>
        <p className="preview-meta">{[previewResume?.header?.location, previewResume?.header?.preferredCountry].filter(Boolean).join(", ")}</p>
      </div>
      <div className="preview-block">
        <h4>Profile</h4>
        <p>{previewResume?.profile || "Professional summary will appear here."}</p>
      </div>
      <div className="preview-block">
        <h4>Skills</h4>
        <div className="resume-skills">{(previewResume?.skills || []).map((skill) => <span key={skill} className="skill-tag">{skill}</span>)}</div>
      </div>
    </div>
  );

  const stepProgress = Math.round(((wizardStep + 1) / WIZARD_STEPS.length) * 100);

  return (
    <div className="resume-builder-shell">
      <section className="resume-builder-hero">
        <div className="resume-builder-hero-copy">
          <h1>AI Resume Builder 360 for Global and Gulf Jobs</h1>
          <p>Wizard-first workflow with ATS, job match, and recruiter-ready outputs.</p>
          <div className="resume-builder-hero-tags">
            <span>Resume Upload Parser</span>
            <span>Gulf 360 Fields</span>
            <span>ATS + Job Match</span>
            <span>LinkedIn + Recruiter Email</span>
          </div>
          <p className="plan-notice">{hasPremiumAccess ? "Premium unlocked." : "Free plan: 1 resume, 1 ATS check, 2 templates."}</p>
        </div>
        <div className="resume-builder-hero-visual">
          <div className="resume-preview-card">
            <div className="resume-header">
              <h3>{previewResume?.header?.fullName || "Candidate Name"}</h3>
              <p>{previewResume?.header?.targetJob || "Target Job Role"}</p>
            </div>
            <div className="resume-skills">{(previewResume?.skills || []).slice(0, 3).map((skill) => <span key={skill} className="skill-tag">{skill}</span>)}</div>
            <p className="mini-score">Profile Completion: {completeness}%</p>
            <p className="mini-score">Wizard Progress: {stepProgress}%</p>
          </div>
        </div>
      </section>

      <nav className="resume-builder-nav" aria-label="Resume builder sections">
        {SECTION_ITEMS.map((item) => (
          <button key={item.id} type="button" className={`resume-builder-nav-item ${activeSection === item.id ? "active" : ""}`} onClick={() => setActiveSection(item.id)} aria-pressed={activeSection === item.id}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {status?.message ? <div className={`resume-alert ${status.type === "error" ? "error" : "success"}`}>{status.message}</div> : null}

      <div className="resume-builder-content">
        {activeSection === "upload" && (
          <section className="resume-builder-section">
            <div className="section-header">
              <h2>Quick Start</h2>
              <p>Upload old resume, paste JD, choose country and role, then start builder.</p>
            </div>
            <div className="resume-form-grid">
              <div className="form-section">
                <div className="form-fields">
                  <label htmlFor="rb-upload">Upload old resume</label>
                  <input id="rb-upload" type="file" onChange={handleUploadResume} />
                  {uploadedResumeName ? <p className="library-note">Uploaded: {uploadedResumeName}</p> : null}
                  <label htmlFor="rb-jd">Paste job description</label>
                  <textarea id="rb-jd" rows={7} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
                  <label htmlFor="rb-country-start">Target country</label>
                  <select id="rb-country-start" value={formData.preferredCountry} onChange={handleInputChange("preferredCountry")}>{COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}</select>
                  <label htmlFor="rb-role-start">Target role</label>
                  <input id="rb-role-start" value={formData.targetJob} onChange={handleInputChange("targetJob")} />
                  <button type="button" className="primary-button" onClick={() => { setActiveSection("ai-builder"); setWizardStep(1); }}>Build My Resume</button>
                </div>
              </div>
              <div className="form-section">
                <div className="form-fields">
                  <p className="library-note">Suggested skills: {roleSuggestions.join(", ")}</p>
                  <p className="library-note">Missing skills from JD: {missingSkills.length ? missingSkills.join(", ") : "Not enough JD data yet."}</p>
                  <div className="inline-actions">
                    <button type="button" className="secondary-button" onClick={handleRoleWiseGeneration}>Role-wise Generation</button>
                    <button type="button" className="secondary-button" onClick={handleGulfStyle}>Gulf Recruiter Style</button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeSection === "ai-builder" && (
          <section className="resume-builder-section">
            <div className="section-header">
              <h2>Step-by-Step AI Builder</h2>
              <p>Start -> Personal Details -> Career Details -> Experience -> Skills -> Gulf Details -> Template -> ATS Check -> Download</p>
            </div>
            <div className="wizard-steps-row">{WIZARD_STEPS.map((item, index) => <button key={item.id} type="button" className={`wizard-step-pill ${wizardStep === index ? "active" : ""}`} onClick={() => setWizardStep(index)}>{index + 1}. {item.label}</button>)}</div>
            <div className="wizard-progress-track"><div className="wizard-progress-bar" style={{ width: `${stepProgress}%` }} /></div>

            {wizardStep === 0 ? (
              <div className="wizard-step-card form-fields">
                <h3>Getting Started</h3>
                <p>Follow the builder to complete your resume step-by-step. Add personal details, career goals, experience, and Gulf-ready fields before generating the final resume.</p>
                <div className="inline-actions">
                  <button type="button" className="primary-button" onClick={() => setWizardStep(1)}>Continue to Personal Details</button>
                </div>
              </div>
            ) : null}
            {wizardStep === 1 ? (
              <div className="wizard-step-card form-fields">
                <h3>Personal Details</h3>
                <label>Full Name *</label><input value={formData.name} onChange={handleInputChange("name")} />
                <label>Email</label><input value={formData.email} onChange={handleInputChange("email")} />
                <label>Phone</label><input value={formData.phone} onChange={handleInputChange("phone")} />
                <label>Location</label><input value={formData.location} onChange={handleInputChange("location")} />
                <label>LinkedIn</label><input value={formData.linkedin} onChange={handleInputChange("linkedin")} />
              </div>
            ) : null}

            {wizardStep === 2 ? (
              <div className="wizard-step-card form-fields">
                <h3>Career Details</h3>
                <label>Target Role *</label><input value={formData.targetJob} onChange={handleInputChange("targetJob")} />
                <label>Industry Category</label><input value={formData.industryCategory} onChange={handleInputChange("industryCategory")} />
                <label>Summary</label><textarea rows={5} value={formData.summary} onChange={handleInputChange("summary")} />
                <div className="inline-actions"><button type="button" className="secondary-button" onClick={() => setFormData((current) => ({ ...current, summary: rewriteSummaryLocal(current, jobDescription) }))}>AI Rewrite Summary</button></div>
              </div>
            ) : null}

            {wizardStep === 3 ? (
              <div className="wizard-step-card form-fields">
                <h3>Experience</h3>
                <label>Experience (Role | Company | Duration | achievements)</label>
                <textarea rows={8} value={formData.experience} onChange={handleInputChange("experience")} />
                <button type="button" className="secondary-button" onClick={() => setFormData((current) => ({ ...current, experience: rewriteExperienceLocal(current.experience) }))}>AI Rewrite Experience Bullets</button>
              </div>
            ) : null}

            {wizardStep === 4 ? (
              <div className="wizard-step-card form-fields">
                <h3>Skills</h3>
                <label>Skills *</label><textarea rows={4} value={formData.skills} onChange={handleInputChange("skills")} />
                <label>Education (Degree | Institution | Year)</label><textarea rows={4} value={formData.education} onChange={handleInputChange("education")} />
                <label>Projects (Name | Tech | Summary)</label><textarea rows={4} value={formData.projects} onChange={handleInputChange("projects")} />
                <label>Certifications</label><textarea rows={3} value={formData.certifications} onChange={handleInputChange("certifications")} />
                <label>Languages</label><input value={formData.languages} onChange={handleInputChange("languages")} />
                <p className="library-note">Missing skill suggestions: {missingSkills.length ? missingSkills.join(", ") : "None"}</p>
              </div>
            ) : null}

            {wizardStep === 5 ? (
              <div className="wizard-step-card form-fields">
                <h3>Gulf Details</h3>
                <label>Visa Status</label><input value={formData.visaStatus} onChange={handleInputChange("visaStatus")} />
                <label>Current Visa Type</label><input value={formData.currentVisaType} onChange={handleInputChange("currentVisaType")} />
                <label>Visa Expiry</label><input type="date" value={formData.visaExpiry} onChange={handleInputChange("visaExpiry")} />
                <label>Transferable Visa</label><select value={formData.transferableVisa} onChange={handleInputChange("transferableVisa")}><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option></select>
                <label>Available to Relocate</label><select value={formData.availableToRelocate} onChange={handleInputChange("availableToRelocate")}><option value="Yes">Yes</option><option value="No">No</option></select>
                <label>Preferred Gulf Country</label><select value={formData.preferredGulfCountry} onChange={handleInputChange("preferredGulfCountry")}><option value="UAE">UAE</option><option value="Saudi Arabia">Saudi Arabia</option><option value="Qatar">Qatar</option><option value="Oman">Oman</option></select>
                <label>Work Permit Status</label><input value={formData.workPermitStatus} onChange={handleInputChange("workPermitStatus")} />
                <label>Driving License Country</label><input value={formData.drivingLicenseCountry} onChange={handleInputChange("drivingLicenseCountry")} />
                <label>Joining Availability</label><input value={formData.joiningAvailability} onChange={handleInputChange("joiningAvailability")} />
                <label>Accommodation Required</label><select value={formData.accommodationRequired} onChange={handleInputChange("accommodationRequired")}><option value="No">No</option><option value="Yes">Yes</option></select>
              </div>
            ) : null}

            {wizardStep === 6 ? (
              <div className="wizard-step-card">
                <h3>Template</h3>
                <div className="templates-grid">{TEMPLATE_OPTIONS.map((item) => <button key={item.id} type="button" className={`template-card ${template === item.id ? "selected" : ""} ${!canUseTemplate(item.id) ? "locked" : ""}`} onClick={() => chooseTemplate(item.id)}><div className="template-icon">{item.icon}</div><h4>{item.name}</h4><p>{item.description}</p>{!canUseTemplate(item.id) ? <span className="template-lock">Premium</span> : null}</button>)}</div>
              </div>
            ) : null}

            {wizardStep === 7 ? (
              <div className="wizard-step-card">
                <h3>ATS Check</h3>
                <textarea rows={7} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
                <div className="inline-actions">
                  <button type="button" className="primary-button" onClick={handleAtsCheck} disabled={busyKey === "ats"}>{busyKey === "ats" ? "Checking..." : "Run ATS Check"}</button>
                  <button type="button" className="secondary-button" onClick={handleOptimizeResume} disabled={busyKey === "optimize"}>{busyKey === "optimize" ? "Improving..." : "Auto Improve ATS Score"}</button>
                </div>
                {atsReport ? <p className="library-note">ATS Score: {atsReport.score} | Keyword Match: {atsReport.keywordMatchPercent || 0}%</p> : null}
              </div>
            ) : null}

            {wizardStep === 8 ? (
              <div className="wizard-step-card">
                <h3>Download</h3>
                <div className="inline-actions">
                  <button type="button" className="primary-button" onClick={handleGenerateResume} disabled={busyKey === "generate"}>{busyKey === "generate" ? "Generating..." : "Generate Resume"}</button>
                  <button type="button" className="secondary-button" onClick={handleSaveDraft} disabled={busyKey === "save"}>{busyKey === "save" ? "Saving..." : "Save Draft"}</button>
                  <button type="button" className="secondary-button" onClick={exportPdf}>Download PDF</button>
                  <button type="button" className="secondary-button" onClick={exportDoc}>Download DOCX</button>
                </div>
              </div>
            ) : null}

            <div className="wizard-nav-actions">
              <button type="button" className="secondary-button" onClick={() => setWizardStep((current) => Math.max(0, current - 1))} disabled={wizardStep === 0}>Previous</button>
              <button type="button" className="secondary-button" onClick={() => setWizardStep((current) => Math.min(WIZARD_STEPS.length - 1, current + 1))} disabled={wizardStep === WIZARD_STEPS.length - 1}>Next</button>
            </div>
            {renderPreview()}
          </section>
        )}

        {activeSection === "templates" && (
          <section className="resume-builder-section">
            <div className="section-header"><h2>Template Library</h2><p>All major global and Gulf templates are now available.</p></div>
            <div className="templates-grid">{TEMPLATE_OPTIONS.map((item) => <button key={item.id} type="button" className={`template-card ${template === item.id ? "selected" : ""} ${!canUseTemplate(item.id) ? "locked" : ""}`} onClick={() => chooseTemplate(item.id)}><div className="template-icon">{item.icon}</div><h4>{item.name}</h4><p>{item.description}</p>{!canUseTemplate(item.id) ? <span className="template-lock">Premium</span> : null}</button>)}</div>
            {renderPreview()}
          </section>
        )}

        {activeSection === "ats-score" && (
          <section className="resume-builder-section ats-checker">
            <div className="section-header"><h2>ATS Score</h2><p>Check keyword fit and improve instantly.</p></div>
            <textarea rows={8} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
            <div className="ats-actions">
              <button type="button" className="primary-button" onClick={handleAtsCheck} disabled={busyKey === "ats"}>{busyKey === "ats" ? "Checking..." : "Run ATS Check"}</button>
              <button type="button" className="secondary-button" onClick={handleOptimizeResume} disabled={busyKey === "optimize"}>{busyKey === "optimize" ? "Optimizing..." : "Auto ATS Score Improvement"}</button>
            </div>
            {atsReport ? <p className="library-note">ATS Score: {atsReport.score} | Match: {atsReport.keywordMatchPercent || 0}% | Missing: {(atsReport.missingKeywords || []).slice(0, 10).join(", ")}</p> : null}
          </section>
        )}

        {activeSection === "job-match" && (
          <section className="resume-builder-section">
            <div className="section-header"><h2>Job Match</h2><p>Keyword and skill matching against target JD.</p></div>
            <div className="job-optimizer">
              <textarea rows={9} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
              <button type="button" className="primary-button" onClick={handleOptimizeResume} disabled={busyKey === "optimize"}>{busyKey === "optimize" ? "Optimizing..." : "Optimize Resume For Job"}</button>
            </div>
            <div className="optimization-results"><h4>Missing Skill Suggestions</h4><p>{missingSkills.length ? missingSkills.join(", ") : "No missing skills detected."}</p></div>
            {renderPreview()}
          </section>
        )}

        {activeSection === "cover-letter" && (
          <section className="resume-builder-section">
            <div className="section-header"><h2>Cover Letter</h2><p>Generate role-specific cover letters.</p></div>
            <div className="cover-letter-types">{COVER_LETTER_TYPES.map((item) => <button key={item.id} type="button" className={`secondary-button ${coverLetterType === item.id ? "active-type" : ""}`} onClick={() => setCoverLetterType(item.id)}>{item.label}</button>)}</div>
            <button type="button" className="primary-button" onClick={handleCoverLetter} disabled={busyKey === "cover-letter"}>{busyKey === "cover-letter" ? "Generating..." : "Generate Cover Letter"}</button>
            {coverLetter ? <textarea rows={10} value={coverLetter.content || ""} onChange={() => {}} readOnly /> : null}
          </section>
        )}

        {activeSection === "linkedin" && (
          <section className="resume-builder-section">
            <div className="section-header"><h2>LinkedIn Generator</h2><p>Generate headline and About section.</p></div>
            <div className="inline-actions">
              <button type="button" className="primary-button" onClick={handleLinkedInGenerate}>Generate LinkedIn Profile</button>
              <button type="button" className="secondary-button" onClick={() => copyText(linkedInProfile)} disabled={!linkedInProfile}>Copy LinkedIn Text</button>
            </div>
            <textarea rows={12} value={linkedInProfile} onChange={(e) => setLinkedInProfile(e.target.value)} />
          </section>
        )}

        {activeSection === "recruiter-email" && (
          <section className="resume-builder-section">
            <div className="section-header"><h2>Recruiter Email Generator</h2><p>Create recruiter outreach email from your resume profile.</p></div>
            <div className="inline-actions">
              <button type="button" className="primary-button" onClick={handleRecruiterEmail}>Generate Recruiter Email</button>
              <button type="button" className="secondary-button" onClick={() => copyText(recruiterEmail)} disabled={!recruiterEmail}>Copy Email</button>
            </div>
            <textarea rows={12} value={recruiterEmail} onChange={(e) => setRecruiterEmail(e.target.value)} />
          </section>
        )}

        {activeSection === "interview-prep" && (
          <section className="resume-builder-section interview-prep">
            <div className="section-header"><h2>Interview Prep</h2><p>Generate interview questions and tips.</p></div>
            <button type="button" className="primary-button" onClick={handleInterviewPrep} disabled={busyKey === "interview"}>{busyKey === "interview" ? "Preparing..." : "Generate Interview Prep"}</button>
            {interviewPrep ? (
              <div className="interview-content">
                <div className="interview-section"><h4>Questions</h4><ul>{(interviewPrep.questions || []).map((item) => <li key={item}>{item}</li>)}</ul></div>
                <div className="interview-section"><h4>Tips</h4><ul>{(interviewPrep.tips || []).map((item) => <li key={item}>{item}</li>)}</ul></div>
              </div>
            ) : null}
          </section>
        )}

        {activeSection === "my-resumes" && (
          <section className="resume-builder-section">
            <div className="section-header"><h2>My Resumes</h2><p>Open, duplicate, rename, delete, and continue editing drafts.</p></div>
            <div className="saved-resume-grid">
              {savedResumes.length === 0 ? <p className="library-note">No resumes saved yet.</p> : savedResumes.map((item) => {
                const itemId = item?._id || item?.id || "";
                const isSelected = selectedResumeId === itemId;
                return (
                  <article key={itemId} className={`saved-resume-card ${isSelected ? "selected" : ""}`}>
                    <h4>{item.name || "Untitled Resume"}</h4>
                    <p>{item.resumeType || "professional"} - {item.template || "simple-ats"}</p>
                    <p className="saved-meta">Updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "Unknown"}</p>
                    <div className="saved-actions">
                      <button type="button" className="secondary-button" onClick={() => openDraft(item)}>Open</button>
                      <button type="button" className="secondary-button" onClick={() => duplicateDraft(item)}>Duplicate</button>
                      <button type="button" className="secondary-button" onClick={() => renameDraft(item)}>Rename</button>
                      <button type="button" className="secondary-button danger" onClick={() => deleteDraft(item)}>Delete</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <aside className="resume-actions-bar" aria-label="Resume actions">
        <div className="download-options">
          <button type="button" onClick={exportPdf}>Download PDF</button>
          <button type="button" onClick={exportDoc}>Download Word (.docx)</button>
        </div>
        <div className="share-options">
          <button type="button" onClick={() => copyText(formatResumeText(previewResume))}>Copy Resume Text</button>
        </div>
      </aside>
    </div>
  );
};

export { toList, toLines, clean, extractKeywords, parseResumeTextToFormData, rewriteSummaryLocal, rewriteExperienceLocal, inferRoleSkills, buildResumeFromForm, computeSectionCompleteness, formatResumeText, buildLocalAtsReport };
export default ResumeBuilder;
