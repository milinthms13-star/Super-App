import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import { useApp } from "../../contexts/AppContext";
import { buildApiUrl } from "../../utils/api";
import { getStoredAuthToken } from "../../utils/auth";
import "./ResumeBuilder.css";

const LOCAL_DRAFTS_KEY = "resume_builder_local_drafts_v1";

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
  gccExperience: "",
  drivingLicense: "",
  expectedSalary: "",
  noticePeriod: "",
};

const SECTION_ITEMS = [
  { id: "builder", icon: "FORM", label: "Resume Builder" },
  { id: "templates", icon: "VIEW", label: "Templates" },
  { id: "ats", icon: "ATS", label: "ATS Checker" },
  { id: "optimizer", icon: "FIT", label: "Job Optimizer" },
  { id: "cover", icon: "CVR", label: "Cover Letter" },
  { id: "interview", icon: "Q&A", label: "Interview Prep" },
  { id: "library", icon: "SAVE", label: "My Resumes" },
];

const RESUME_TYPES = [
  { id: "professional", title: "Professional", description: "Balanced for most roles" },
  { id: "fresher", title: "Fresher", description: "Highlights potential and projects" },
  { id: "gulf", title: "Gulf Ready", description: "Includes GCC readiness details" },
  { id: "career-switch", title: "Career Switch", description: "Transferable skills focused" },
];

const TEMPLATE_OPTIONS = [
  { id: "simple-ats", name: "Simple ATS", icon: "ATS", description: "Clean and parser-friendly" },
  { id: "modern-professional", name: "Modern Professional", icon: "PRO", description: "Executive style layout" },
  { id: "creative-grid", name: "Creative Grid", icon: "ART", description: "Visual-first presentation" },
];

const COVER_LETTER_TYPES = [
  { id: "company", label: "Company" },
  { id: "startup", label: "Startup" },
  { id: "gulf", label: "Gulf Recruiter" },
];

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

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "with",
  "to",
  "of",
  "in",
  "is",
  "are",
  "on",
  "at",
  "from",
  "by",
  "this",
  "that",
  "as",
  "be",
  "will",
  "your",
  "our",
  "you",
]);

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
    return {
      degree: degree || line,
      institution: institution || "",
      year: year || "",
    };
  });

const parseProjects = (value = "") =>
  toLines(value).map((line) => {
    const [name = "", tech = "", summary = ""] = line.split("|").map((part) => part.trim());
    return {
      name: name || line,
      tech: tech || "",
      summary: summary || "",
    };
  });

const parseExperience = (value = "") =>
  toLines(value).map((line) => {
    const [role = "", company = "", duration = "", achievements = ""] = line
      .split("|")
      .map((part) => part.trim());

    const bullets = String(achievements || "")
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean);

    return {
      role: role || line,
      company: company || "",
      duration: duration || "",
      bullets: bullets.length > 0 ? bullets : [],
    };
  });

const buildResumeFromForm = (formData = {}, template = "simple-ats", resumeType = "professional", language = "en") => {
  const skills = toList(formData.skills);
  return {
    header: {
      fullName: clean(formData.name),
      targetJob: clean(formData.targetJob),
      location: clean(formData.location),
      preferredCountry: clean(formData.preferredCountry),
      email: clean(formData.email),
      phone: clean(formData.phone),
      linkedin: clean(formData.linkedin),
    },
    profile:
      clean(formData.summary) ||
      `Results-focused ${clean(formData.targetJob) || "professional"} with skills in ${skills
        .slice(0, 6)
        .join(", ")}.`,
    skills,
    education: parseEducation(formData.education),
    experience: parseExperience(formData.experience),
    projects: parseProjects(formData.projects),
    certifications: toList(formData.certifications),
    languages: toList(formData.languages),
    gulfProfile: {
      passportStatus: clean(formData.passportStatus),
      visaStatus: clean(formData.visaStatus),
      gccExperience: clean(formData.gccExperience),
      drivingLicense: clean(formData.drivingLicense),
      expectedSalary: clean(formData.expectedSalary),
      noticePeriod: clean(formData.noticePeriod),
    },
    template,
    resumeType,
    language,
  };
};

const parseAtsSuggestions = (items) => (Array.isArray(items) ? items.filter(Boolean) : []);

const buildLocalAtsReport = ({ resume = {}, jobDescription = "" }) => {
  const resumeText = formatResumeText(resume).toLowerCase();
  const jdKeywords = extractKeywords(jobDescription);
  const resumeKeywords = extractKeywords(resumeText);
  const matchedKeywords = jdKeywords.filter((keyword) => resumeKeywords.includes(keyword));
  const missingKeywords = jdKeywords.filter((keyword) => !resumeKeywords.includes(keyword));
  const keywordMatchPercent = jdKeywords.length > 0 ? Math.round((matchedKeywords.length / jdKeywords.length) * 100) : 0;

  const issues = [];
  const suggestions = [];
  const warnings = [];

  if (!clean(resume?.header?.email) && !clean(resume?.header?.phone)) {
    issues.push("Missing email or phone in resume header.");
    suggestions.push("Add at least one contact method.");
  }
  if (clean(resume?.profile).length < 60) {
    issues.push("Professional summary is too short.");
    suggestions.push("Write a stronger summary with measurable outcomes.");
  }
  if ((resume?.experience || []).length === 0) {
    issues.push("Experience section is empty.");
    suggestions.push("Add at least one experience block with 2-4 bullets.");
  }
  if (!/(\d+%|\d+\+|increased|reduced|improved|saved|grew|achieved)/i.test(resumeText)) {
    issues.push("No measurable achievement detected.");
    suggestions.push("Include numbers like %, savings, growth, or counts.");
  }
  if (keywordMatchPercent < 35 && jdKeywords.length > 0) {
    issues.push("Low keyword match with job description.");
    suggestions.push("Use role-specific keywords in summary and experience bullets.");
  }
  if (resumeText.split("\n").some((line) => line.length > 180)) {
    warnings.push("Some lines are too long for ATS parsing.");
    suggestions.push("Use short bullet points instead of long lines.");
  }

  let score = 100;
  score -= issues.length * 8;
  score -= warnings.length * 3;
  score = Math.max(30, Math.min(100, Math.round(score)));

  return {
    score,
    keywordMatchPercent,
    matchedKeywords,
    missingKeywords,
    issues,
    warnings,
    suggestions,
    checkedAt: new Date().toISOString(),
  };
};

const formatResumeText = (resume = {}) => {
  const lines = [];
  const header = resume.header || {};

  lines.push(header.fullName || "Candidate");
  lines.push(header.targetJob || "");
  lines.push(
    [header.location, header.preferredCountry].filter(Boolean).join(", ")
  );
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

  lines.push("EDUCATION");
  (resume.education || []).forEach((item) => {
    lines.push([item.degree, item.institution, item.year].filter(Boolean).join(" | "));
  });
  lines.push("");

  lines.push("PROJECTS");
  (resume.projects || []).forEach((item) => {
    lines.push(`${item.name || ""} (${item.tech || ""})`.trim());
    if (item.summary) lines.push(`- ${item.summary}`);
  });
  lines.push("");

  lines.push("CERTIFICATIONS");
  (resume.certifications || []).forEach((item) => lines.push(`- ${item}`));
  lines.push("");

  lines.push("LANGUAGES");
  lines.push((resume.languages || []).join(", "));
  lines.push("");

  lines.push("GULF PROFILE");
  const gulf = resume.gulfProfile || {};
  lines.push(`Passport Status: ${gulf.passportStatus || "Not specified"}`);
  lines.push(`Visa Status: ${gulf.visaStatus || "Not specified"}`);
  lines.push(`GCC Experience: ${gulf.gccExperience || "Not specified"}`);
  lines.push(`Driving License: ${gulf.drivingLicense || "Not specified"}`);
  lines.push(`Expected Salary: ${gulf.expectedSalary || "Not specified"}`);
  lines.push(`Notice Period: ${gulf.noticePeriod || "Not specified"}`);

  return lines.filter((line) => line !== undefined && line !== null).join("\n");
};

const loadLocalDrafts = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_DRAFTS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const saveLocalDrafts = (drafts = []) => {
  localStorage.setItem(LOCAL_DRAFTS_KEY, JSON.stringify(drafts));
};

const ResumeBuilder = () => {
  const { user } = useApp();
  const [activeSection, setActiveSection] = useState("builder");
  const [template, setTemplate] = useState("simple-ats");
  const [resumeType, setResumeType] = useState("professional");
  const [language, setLanguage] = useState("en");
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState({});

  const [resumeData, setResumeData] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [atsReport, setAtsReport] = useState(null);
  const [coverLetterType, setCoverLetterType] = useState("company");
  const [coverLetter, setCoverLetter] = useState(null);
  const [interviewPrep, setInterviewPrep] = useState(null);

  const [draftName, setDraftName] = useState("");
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [savedResumes, setSavedResumes] = useState([]);

  const [busyKey, setBusyKey] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });

  const token = getStoredAuthToken();
  const isAuthenticated = Boolean(token);

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      name: current.name || user?.name || "",
      email: current.email || user?.email || "",
    }));
  }, [user?.email, user?.name]);

  const pushStatus = useCallback((type, message) => {
    setStatus({ type, message });
  }, []);

  const getHeaders = useCallback(() => {
    const authToken = getStoredAuthToken();
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  }, []);

  const request = useCallback(
    async (method, path, payload) => {
      const response = await axios({
        method,
        url: buildApiUrl(path),
        data: payload,
        headers: getHeaders(),
      });
      return response.data;
    },
    [getHeaders]
  );

  const validateForm = useCallback(() => {
    const errors = {};
    if (!clean(formData.name)) errors.name = "Name is required.";
    if (!clean(formData.targetJob)) errors.targetJob = "Target job is required.";
    if (!clean(formData.skills)) errors.skills = "At least one skill is required.";
    if (!clean(formData.email) && !clean(formData.phone)) {
      errors.contact = "Email or phone is required.";
    }
    if (clean(formData.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(formData.email))) {
      errors.email = "Enter a valid email address.";
    }
    if (clean(formData.phone) && !/^[+\d\s()-]{7,20}$/.test(clean(formData.phone))) {
      errors.phone = "Enter a valid phone number.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const previewResume = useMemo(
    () => resumeData || buildResumeFromForm(formData, template, resumeType, language),
    [formData, language, resumeData, resumeType, template]
  );

  const completeness = useMemo(() => {
    const checks = [
      Boolean(clean(previewResume.profile).length >= 60),
      (previewResume.skills || []).length > 0,
      (previewResume.education || []).length > 0,
      (previewResume.experience || []).length > 0,
      (previewResume.projects || []).length > 0,
      (previewResume.certifications || []).length > 0,
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [previewResume]);

  const loadResumes = useCallback(async () => {
    if (!isAuthenticated) {
      const localDrafts = loadLocalDrafts();
      setSavedResumes(localDrafts);
      return;
    }

    try {
      const result = await request("get", "/resumebuilder/my-resumes");
      setSavedResumes(Array.isArray(result?.resumes) ? result.resumes : []);
    } catch (error) {
      pushStatus("error", error?.response?.data?.message || "Unable to load saved resumes.");
      setSavedResumes([]);
    }
  }, [isAuthenticated, pushStatus, request]);

  useEffect(() => {
    loadResumes();
  }, [loadResumes]);

  const handleInputChange = (field) => (event) => {
    const value = event?.target?.value ?? "";
    setFormData((current) => ({ ...current, [field]: value }));
    if (formErrors[field] || formErrors.contact) {
      setFormErrors((current) => ({ ...current, [field]: "", contact: "" }));
    }
  };

  const withBusy = useCallback(async (key, fn) => {
    setBusyKey(key);
    try {
      await fn();
    } finally {
      setBusyKey("");
    }
  }, []);

  const handleGenerateResume = useCallback(async () => {
    if (!validateForm()) {
      pushStatus("error", "Fix required fields before generating.");
      return;
    }

    if (!isAuthenticated) {
      setResumeData(buildResumeFromForm(formData, template, resumeType, language));
      pushStatus("success", "Draft resume generated locally. Login to use AI-enhanced generation.");
      return;
    }

    await withBusy("generate", async () => {
      try {
        const result = await request("post", "/resumebuilder/generate", {
          formData,
          template,
          resumeType,
          language,
        });
        setResumeData(result?.resume || null);
        pushStatus("success", "Resume generated successfully.");
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to generate resume.");
      }
    });
  }, [formData, isAuthenticated, language, pushStatus, request, resumeType, template, validateForm, withBusy]);

  const handleAtsCheck = useCallback(async () => {
    const resumePayload = resumeData || buildResumeFromForm(formData, template, resumeType, language);

    if (!isAuthenticated) {
      setAtsReport(buildLocalAtsReport({ resume: resumePayload, jobDescription }));
      pushStatus("success", "ATS report generated locally. Login for AI-backed scoring.");
      return;
    }

    await withBusy("ats", async () => {
      try {
        const result = await request("post", "/resumebuilder/ats-check", {
          resume: resumePayload,
          jobDescription,
        });
        setAtsReport(result?.report || null);
        pushStatus("success", "ATS report generated.");
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to check ATS score.");
      }
    });
  }, [
    formData,
    isAuthenticated,
    jobDescription,
    language,
    pushStatus,
    request,
    resumeData,
    resumeType,
    template,
    withBusy,
  ]);

  const handleOptimizeResume = useCallback(async () => {
    const resumePayload = resumeData || buildResumeFromForm(formData, template, resumeType, language);
    if (!clean(jobDescription)) {
      pushStatus("error", "Paste a job description to optimize.");
      return;
    }

    if (!isAuthenticated) {
      const missingKeywords = buildLocalAtsReport({ resume: resumePayload, jobDescription }).missingKeywords.slice(0, 6);
      const localOptimized = {
        ...resumePayload,
        profile: `${clean(resumePayload.profile)} ${missingKeywords.join(", ")}`.trim(),
        optimization: { appliedKeywords: missingKeywords },
      };
      setResumeData(localOptimized);
      setAtsReport(buildLocalAtsReport({ resume: localOptimized, jobDescription }));
      pushStatus("success", "Resume optimized locally. Login for AI rewriting.");
      return;
    }

    await withBusy("optimize", async () => {
      try {
        const result = await request("post", "/resumebuilder/optimize", {
          resume: resumePayload,
          jobDescription,
        });
        setResumeData(result?.resume || resumePayload);
        if (result?.report) setAtsReport(result.report);
        pushStatus("success", "Resume optimized for target job.");
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to optimize resume.");
      }
    });
  }, [
    formData,
    isAuthenticated,
    jobDescription,
    language,
    pushStatus,
    request,
    resumeData,
    resumeType,
    template,
    withBusy,
  ]);

  const handleCoverLetter = useCallback(async () => {
    const resumePayload = resumeData || buildResumeFromForm(formData, template, resumeType, language);

    if (!isAuthenticated) {
      const name = clean(formData.name) || "Candidate";
      const role = clean(formData.targetJob) || "the role";
      const topSkills = (resumePayload.skills || []).slice(0, 4);
      setCoverLetter({
        type: coverLetterType,
        content: `Dear Hiring Manager,\n\nI am applying for the ${role} role. I bring hands-on experience in ${topSkills.join(
          ", "
        )} and a track record of delivering measurable outcomes.\n\nI would value the opportunity to discuss how I can contribute to your team.\n\nSincerely,\n${name}`,
        highlights: topSkills,
      });
      pushStatus("success", "Cover letter generated locally. Login for AI-enhanced writing.");
      return;
    }

    await withBusy("cover-letter", async () => {
      try {
        const result = await request("post", "/resumebuilder/cover-letter", {
          formData,
          resume: resumePayload,
          type: coverLetterType,
          jobDescription,
        });
        setCoverLetter(result?.letter || null);
        pushStatus("success", "Cover letter generated.");
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to generate cover letter.");
      }
    });
  }, [
    coverLetterType,
    formData,
    isAuthenticated,
    jobDescription,
    language,
    pushStatus,
    request,
    resumeData,
    resumeType,
    template,
    withBusy,
  ]);

  const handleInterviewPrep = useCallback(async () => {
    if (!isAuthenticated) {
      const skills = toList(formData.skills).slice(0, 4);
      setInterviewPrep({
        questions: [
          `Tell me about your experience related to ${formData.targetJob || "this role"}.`,
          `Describe a project where you used ${skills[0] || "your key skill"}.`,
          "How do you manage deadlines under pressure?",
          "What is one measurable result you achieved recently?",
        ],
        tips: [
          "Use STAR format in each answer.",
          "Show impact using numbers and business outcomes.",
          "Tailor examples to the target role and job description.",
        ],
        skillCourses: skills,
      });
      pushStatus("success", "Interview prep generated locally. Login for AI coaching.");
      return;
    }

    await withBusy("interview", async () => {
      try {
        const result = await request("post", "/resumebuilder/interview-prep", {
          targetJob: formData.targetJob,
          jobDescription,
          experience: formData.experience,
          skills: formData.skills,
        });
        setInterviewPrep(result?.prep || null);
        pushStatus("success", "Interview prep generated.");
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to generate interview prep.");
      }
    });
  }, [formData.experience, formData.skills, formData.targetJob, isAuthenticated, jobDescription, pushStatus, request, withBusy]);

  const persistLocalDraft = useCallback(
    (resumeId = "") => {
      const drafts = loadLocalDrafts();
      const now = new Date().toISOString();
      const id = resumeId || selectedResumeId || `local-${Date.now()}`;
      const name = clean(draftName) || `${clean(formData.name) || "Untitled"} Resume`;
      const draftPayload = {
        _id: id,
        id,
        name,
        resumeType,
        template,
        language,
        formData,
        resumeData: previewResume,
        updatedAt: now,
        createdAt: now,
        atsHistory: atsReport?.score ? [{ score: atsReport.score, checkedAt: now }] : [],
        source: "local",
      };

      const next = drafts.filter((item) => String(item?._id || item?.id) !== id);
      next.unshift(draftPayload);
      saveLocalDrafts(next);
      setSavedResumes(next);
      setSelectedResumeId(id);
      pushStatus("success", "Draft saved locally.");
    },
    [
      atsReport?.score,
      draftName,
      formData,
      language,
      previewResume,
      pushStatus,
      resumeType,
      selectedResumeId,
      template,
    ]
  );

  const handleSaveDraft = useCallback(async () => {
    if (!validateForm()) {
      pushStatus("error", "Fix required fields before saving.");
      return;
    }

    if (!isAuthenticated) {
      persistLocalDraft();
      return;
    }

    await withBusy("save", async () => {
      const payload = {
        name: clean(draftName) || `${clean(formData.name) || "Untitled"} Resume`,
        resumeType,
        template,
        language,
        formData,
        resumeData: previewResume,
        atsScore: atsReport?.score,
      };

      try {
        if (selectedResumeId) {
          await request("put", `/resumebuilder/my-resumes/${selectedResumeId}`, payload);
        } else {
          const result = await request("post", "/resumebuilder/my-resumes", payload);
          setSelectedResumeId(result?.resume?._id || result?.resume?.id || "");
        }
        await loadResumes();
        pushStatus("success", "Resume draft saved.");
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to save draft.");
      }
    });
  }, [
    atsReport?.score,
    draftName,
    formData,
    isAuthenticated,
    language,
    loadResumes,
    persistLocalDraft,
    previewResume,
    pushStatus,
    request,
    resumeType,
    selectedResumeId,
    template,
    validateForm,
    withBusy,
  ]);

  const openDraft = useCallback((record) => {
    const data = record?.formData || INITIAL_FORM_DATA;
    setFormData((current) => ({ ...current, ...INITIAL_FORM_DATA, ...data }));
    setResumeData(record?.resumeData || null);
    setTemplate(record?.template || "simple-ats");
    setResumeType(record?.resumeType || "professional");
    setLanguage(record?.language || "en");
    setDraftName(record?.name || "");
    setSelectedResumeId(record?._id || record?.id || "");
    const latestAts = Array.isArray(record?.atsHistory) ? record.atsHistory[record.atsHistory.length - 1] : null;
    if (latestAts?.score) {
      setAtsReport((current) => ({ ...(current || {}), score: latestAts.score }));
    }
    setActiveSection("builder");
    pushStatus("success", "Draft loaded.");
  }, [pushStatus]);

  const deleteDraft = useCallback(
    async (record) => {
      const recordId = record?._id || record?.id || "";
      if (!recordId) return;

      if (!isAuthenticated || String(recordId).startsWith("local-")) {
        const next = loadLocalDrafts().filter((item) => String(item?._id || item?.id) !== String(recordId));
        saveLocalDrafts(next);
        setSavedResumes(next);
        if (selectedResumeId === recordId) setSelectedResumeId("");
        pushStatus("success", "Draft deleted.");
        return;
      }

      await withBusy(`delete-${recordId}`, async () => {
        try {
          await request("delete", `/resumebuilder/my-resumes/${recordId}`);
          await loadResumes();
          if (selectedResumeId === recordId) setSelectedResumeId("");
          pushStatus("success", "Draft deleted.");
        } catch (error) {
          pushStatus("error", error?.response?.data?.message || "Failed to delete draft.");
        }
      });
    },
    [isAuthenticated, loadResumes, pushStatus, request, selectedResumeId, withBusy]
  );

  const duplicateDraft = useCallback(
    async (record) => {
      const recordId = record?._id || record?.id || "";
      if (!recordId) return;

      if (!isAuthenticated || String(recordId).startsWith("local-")) {
        const drafts = loadLocalDrafts();
        const now = new Date().toISOString();
        const duplicateId = `local-${Date.now()}`;
        const duplicated = {
          ...record,
          _id: duplicateId,
          id: duplicateId,
          name: `${record?.name || "Untitled"} (Copy)`,
          updatedAt: now,
          createdAt: now,
          source: "local",
        };
        drafts.unshift(duplicated);
        saveLocalDrafts(drafts);
        setSavedResumes(drafts);
        pushStatus("success", "Draft duplicated.");
        return;
      }

      await withBusy(`duplicate-${recordId}`, async () => {
        try {
          await request("post", `/resumebuilder/my-resumes/${recordId}/duplicate`);
          await loadResumes();
          pushStatus("success", "Draft duplicated.");
        } catch (error) {
          pushStatus("error", error?.response?.data?.message || "Failed to duplicate draft.");
        }
      });
    },
    [isAuthenticated, loadResumes, pushStatus, request, withBusy]
  );

  const exportPdf = useCallback(() => {
    const resume = previewResume;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const left = 44;
    const width = 510;
    const pageHeight = doc.internal.pageSize.height;
    let y = 44;

    const addLine = (text = "", size = 11, bold = false, extraGap = 4) => {
      const safeText = String(text || "");
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(safeText, width);
      lines.forEach((line) => {
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 44;
        }
        doc.text(line, left, y);
        y += size + 4;
      });
      y += extraGap;
    };

    addLine(resume?.header?.fullName || "Candidate", 16, true, 2);
    addLine(resume?.header?.targetJob || "", 12, false, 2);
    addLine(
      [resume?.header?.location, resume?.header?.preferredCountry].filter(Boolean).join(", "),
      10
    );
    addLine(
      [resume?.header?.email, resume?.header?.phone, resume?.header?.linkedin].filter(Boolean).join(" | "),
      10
    );

    addLine("PROFILE", 12, true, 2);
    addLine(resume?.profile || "", 10, false, 8);

    addLine("SKILLS", 12, true, 2);
    addLine((resume?.skills || []).join(", "), 10, false, 8);

    addLine("EXPERIENCE", 12, true, 2);
    (resume?.experience || []).forEach((item) => {
      addLine(`${item.role || ""} | ${item.company || ""} | ${item.duration || ""}`, 10, true, 2);
      (item.bullets || []).forEach((bullet) => addLine(`- ${bullet}`, 10, false, 1));
      y += 3;
    });

    addLine("EDUCATION", 12, true, 2);
    (resume?.education || []).forEach((item) => {
      addLine([item.degree, item.institution, item.year].filter(Boolean).join(" | "), 10, false, 2);
    });
    y += 4;

    addLine("PROJECTS", 12, true, 2);
    (resume?.projects || []).forEach((item) => {
      addLine(`${item.name || ""} (${item.tech || ""})`, 10, true, 1);
      if (item.summary) addLine(`- ${item.summary}`, 10, false, 2);
    });

    addLine("CERTIFICATIONS", 12, true, 2);
    (resume?.certifications || []).forEach((item) => addLine(`- ${item}`, 10, false, 1));

    doc.save(`${clean(resume?.header?.fullName || "resume").replace(/\s+/g, "_")}_resume.pdf`);
    pushStatus("success", "PDF downloaded.");
  }, [previewResume, pushStatus]);

  const exportDoc = useCallback(() => {
    const filename = `${clean(previewResume?.header?.fullName || "resume").replace(/\s+/g, "_")}_resume.doc`;
    const content = formatResumeText(previewResume);
    const blob = new Blob([content], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    pushStatus("success", "DOC file downloaded.");
  }, [previewResume, pushStatus]);

  const shareWhatsApp = useCallback(() => {
    const resumeText = encodeURIComponent(
      `Resume: ${previewResume?.header?.fullName || "Candidate"}\n${previewResume?.header?.targetJob || ""}\n\n${formatResumeText(
        previewResume
      ).slice(0, 1400)}`
    );
    window.open(`https://wa.me/?text=${resumeText}`, "_blank", "noopener,noreferrer");
  }, [previewResume]);

  const copySummary = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatResumeText(previewResume));
      pushStatus("success", "Resume copied to clipboard.");
    } catch (_error) {
      pushStatus("error", "Clipboard copy failed.");
    }
  }, [previewResume, pushStatus]);

  const renderPreview = () => {
    const header = previewResume?.header || {};
    const gulf = previewResume?.gulfProfile || {};

    return (
      <div className={`resume-live-preview template-${template}`}>
        <div className="preview-head">
          <h3>{header.fullName || "Your Name"}</h3>
          <p>{header.targetJob || "Target Role"}</p>
          <p className="preview-meta">
            {[header.location, header.preferredCountry].filter(Boolean).join(", ")}
          </p>
          <p className="preview-meta">{[header.email, header.phone].filter(Boolean).join(" | ")}</p>
        </div>

        <div className="preview-block">
          <h4>Profile</h4>
          <p>{previewResume.profile || "Professional summary will appear here."}</p>
        </div>

        <div className="preview-block">
          <h4>Skills</h4>
          <div className="resume-skills">
            {(previewResume.skills || []).map((skill) => (
              <span key={skill} className="skill-tag">
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="preview-block">
          <h4>Experience</h4>
          {(previewResume.experience || []).length === 0 ? (
            <p className="preview-empty">Add experience entries as: Role | Company | Duration | achievements</p>
          ) : (
            (previewResume.experience || []).map((item, index) => (
              <div key={`${item.role}-${index}`} className="preview-item">
                <strong>{item.role}</strong>
                <p>{[item.company, item.duration].filter(Boolean).join(" | ")}</p>
                {(item.bullets || []).length > 0 && (
                  <ul>
                    {item.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>

        <div className="preview-block">
          <h4>Education</h4>
          {(previewResume.education || []).map((item, index) => (
            <p key={`${item.degree}-${index}`} className="preview-inline-item">
              {[item.degree, item.institution, item.year].filter(Boolean).join(" | ")}
            </p>
          ))}
        </div>

        <div className="preview-block">
          <h4>Projects</h4>
          {(previewResume.projects || []).map((item, index) => (
            <div key={`${item.name}-${index}`} className="preview-item">
              <strong>{item.name}</strong>
              <p>{item.tech}</p>
              <p>{item.summary}</p>
            </div>
          ))}
        </div>

        <div className="preview-block">
          <h4>Certifications</h4>
          <p>{(previewResume.certifications || []).join(", ") || "No certifications added yet."}</p>
        </div>

        {resumeType === "gulf" && (
          <div className="preview-block">
            <h4>Gulf Readiness</h4>
            <p>Passport: {gulf.passportStatus || "Not specified"}</p>
            <p>Visa: {gulf.visaStatus || "Not specified"}</p>
            <p>GCC Experience: {gulf.gccExperience || "Not specified"}</p>
            <p>Driving License: {gulf.drivingLicense || "Not specified"}</p>
            <p>Expected Salary: {gulf.expectedSalary || "Not specified"}</p>
            <p>Notice Period: {gulf.noticePeriod || "Not specified"}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="resume-builder-shell">
      <section className="resume-builder-hero">
        <div className="resume-builder-hero-copy">
          <h1>AI Resume Builder for Global and Gulf Jobs</h1>
          <p>
            Build once, optimize for each role, check ATS fit, generate cover letters, and save multiple resume
            versions.
          </p>
          <div className="resume-builder-hero-tags">
            <span>ATS-Ready</span>
            <span>Gulf Hiring Fields</span>
            <span>PDF + DOC Export</span>
            <span>Draft Library</span>
          </div>
        </div>
        <div className="resume-builder-hero-visual">
          <div className="resume-preview-card">
            <div className="resume-header">
              <h3>{previewResume?.header?.fullName || "Candidate Name"}</h3>
              <p>{previewResume?.header?.targetJob || "Target Job Role"}</p>
            </div>
            <div className="resume-skills">
              {(previewResume?.skills || []).slice(0, 3).map((skill) => (
                <span key={skill} className="skill-tag">
                  {skill}
                </span>
              ))}
            </div>
            <p className="mini-score">Profile Completion: {completeness}%</p>
          </div>
        </div>
      </section>

      <nav className="resume-builder-nav" aria-label="Resume builder sections">
        {SECTION_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`resume-builder-nav-item ${activeSection === item.id ? "active" : ""}`}
            onClick={() => setActiveSection(item.id)}
            aria-pressed={activeSection === item.id}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {status?.message && (
        <div className={`resume-alert ${status.type === "error" ? "error" : "success"}`}>{status.message}</div>
      )}

      <div className="resume-builder-content">
        {activeSection === "builder" && (
          <section className="resume-builder-section">
            <div className="section-header">
              <h2>Resume Information</h2>
              <p>Use one line per entry. Format for experience: Role | Company | Duration | achievement1, achievement2</p>
            </div>

            <div className="resume-form-grid">
              <div className="form-section">
                <h3>Core Details</h3>
                <div className="form-fields">
                  <label htmlFor="rb-name">Full Name *</label>
                  <input id="rb-name" value={formData.name} onChange={handleInputChange("name")} />
                  {formErrors.name ? <p className="field-error">{formErrors.name}</p> : null}

                  <label htmlFor="rb-email">Email</label>
                  <input id="rb-email" value={formData.email} onChange={handleInputChange("email")} />
                  {formErrors.email ? <p className="field-error">{formErrors.email}</p> : null}

                  <label htmlFor="rb-phone">Phone</label>
                  <input id="rb-phone" value={formData.phone} onChange={handleInputChange("phone")} />
                  {formErrors.phone ? <p className="field-error">{formErrors.phone}</p> : null}
                  {formErrors.contact ? <p className="field-error">{formErrors.contact}</p> : null}

                  <label htmlFor="rb-location">Location</label>
                  <input id="rb-location" value={formData.location} onChange={handleInputChange("location")} />

                  <label htmlFor="rb-target-job">Target Job *</label>
                  <input id="rb-target-job" value={formData.targetJob} onChange={handleInputChange("targetJob")} />
                  {formErrors.targetJob ? <p className="field-error">{formErrors.targetJob}</p> : null}

                  <label htmlFor="rb-country">Preferred Country</label>
                  <select id="rb-country" value={formData.preferredCountry} onChange={handleInputChange("preferredCountry")}>
                    <option value="UAE">UAE</option>
                    <option value="Saudi Arabia">Saudi Arabia</option>
                    <option value="Qatar">Qatar</option>
                    <option value="Oman">Oman</option>
                    <option value="Kuwait">Kuwait</option>
                    <option value="Bahrain">Bahrain</option>
                    <option value="India">India</option>
                  </select>

                  <label htmlFor="rb-linkedin">LinkedIn</label>
                  <input id="rb-linkedin" value={formData.linkedin} onChange={handleInputChange("linkedin")} />
                </div>
              </div>

              <div className="form-section">
                <h3>Resume Sections</h3>
                <div className="form-fields">
                  <label htmlFor="rb-summary">Summary</label>
                  <textarea id="rb-summary" rows={4} value={formData.summary} onChange={handleInputChange("summary")} />

                  <label htmlFor="rb-skills">Skills * (comma/new line separated)</label>
                  <textarea id="rb-skills" rows={4} value={formData.skills} onChange={handleInputChange("skills")} />
                  {formErrors.skills ? <p className="field-error">{formErrors.skills}</p> : null}

                  <label htmlFor="rb-experience">Experience (Role | Company | Duration | achievements)</label>
                  <textarea
                    id="rb-experience"
                    rows={6}
                    value={formData.experience}
                    onChange={handleInputChange("experience")}
                  />

                  <label htmlFor="rb-education">Education (Degree | Institution | Year)</label>
                  <textarea id="rb-education" rows={4} value={formData.education} onChange={handleInputChange("education")} />

                  <label htmlFor="rb-projects">Projects (Name | Tech | Summary)</label>
                  <textarea id="rb-projects" rows={4} value={formData.projects} onChange={handleInputChange("projects")} />

                  <label htmlFor="rb-certifications">Certifications</label>
                  <textarea
                    id="rb-certifications"
                    rows={3}
                    value={formData.certifications}
                    onChange={handleInputChange("certifications")}
                  />

                  <label htmlFor="rb-languages">Languages</label>
                  <input id="rb-languages" value={formData.languages} onChange={handleInputChange("languages")} />
                </div>
              </div>

              <div className="form-section">
                <h3>Gulf Job Details</h3>
                <div className="form-fields">
                  <label htmlFor="rb-passport">Passport Status</label>
                  <input id="rb-passport" value={formData.passportStatus} onChange={handleInputChange("passportStatus")} />

                  <label htmlFor="rb-visa">Visa Status</label>
                  <input id="rb-visa" value={formData.visaStatus} onChange={handleInputChange("visaStatus")} />

                  <label htmlFor="rb-gcc-exp">GCC Experience</label>
                  <input id="rb-gcc-exp" value={formData.gccExperience} onChange={handleInputChange("gccExperience")} />

                  <label htmlFor="rb-license">Driving License</label>
                  <input id="rb-license" value={formData.drivingLicense} onChange={handleInputChange("drivingLicense")} />

                  <label htmlFor="rb-salary">Expected Salary</label>
                  <input id="rb-salary" value={formData.expectedSalary} onChange={handleInputChange("expectedSalary")} />

                  <label htmlFor="rb-notice">Notice Period</label>
                  <input id="rb-notice" value={formData.noticePeriod} onChange={handleInputChange("noticePeriod")} />

                  <label htmlFor="rb-language-select">Resume Language</label>
                  <select id="rb-language-select" value={language} onChange={(event) => setLanguage(event.target.value)}>
                    <option value="en">English</option>
                    <option value="ml">Malayalam</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="resume-types-grid">
              <h3>Choose Resume Type</h3>
              {RESUME_TYPES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="resume-type-card"
                  aria-pressed={resumeType === item.id}
                  onClick={() => setResumeType(item.id)}
                >
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                  <span>{resumeType === item.id ? "Selected" : "Select"}</span>
                </button>
              ))}
            </div>

            <div className="builder-actions">
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Draft name (example: Gulf Resume v2)"
              />
              <button type="button" className="primary-button" onClick={handleGenerateResume} disabled={busyKey === "generate"}>
                {busyKey === "generate" ? "Generating..." : "Generate Resume"}
              </button>
              <button type="button" className="secondary-button" onClick={handleSaveDraft} disabled={busyKey === "save"}>
                {busyKey === "save" ? "Saving..." : "Save Draft"}
              </button>
            </div>

            {renderPreview()}
          </section>
        )}

        {activeSection === "templates" && (
          <section className="resume-builder-section">
            <div className="section-header">
              <h2>Template Selection</h2>
              <p>Template changes instantly apply to the live preview and exported resume style.</p>
            </div>
            <div className="templates-grid">
              {TEMPLATE_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`template-card ${template === item.id ? "selected" : ""}`}
                  onClick={() => setTemplate(item.id)}
                  aria-pressed={template === item.id}
                >
                  <div className="template-icon">{item.icon}</div>
                  <h4>{item.name}</h4>
                  <p>{item.description}</p>
                  {template === item.id ? <span className="selected-badge">Selected</span> : null}
                </button>
              ))}
            </div>
            {renderPreview()}
          </section>
        )}

        {activeSection === "ats" && (
          <section className="resume-builder-section ats-checker">
            <div className="section-header">
              <h2>ATS Score & Diagnostics</h2>
              <p>Check keyword fit, section completeness, formatting warnings, and missing must-have details.</p>
            </div>
            <textarea
              rows={8}
              placeholder="Paste target job description for accurate ATS matching..."
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
            />
            <div className="ats-actions">
              <button type="button" className="primary-button" onClick={handleAtsCheck} disabled={busyKey === "ats"}>
                {busyKey === "ats" ? "Checking..." : "Run ATS Check"}
              </button>
            </div>

            {atsReport && (
              <div className="ats-results">
                <div className="score-display">
                  <div className="score-circle" style={{ "--score": atsReport.score }}>
                    <span className="score-number">{atsReport.score}</span>
                    <span className="score-label">ATS Score</span>
                  </div>
                  <p>Keyword Match: {atsReport.keywordMatchPercent || 0}%</p>
                </div>
                <div className="ats-feedback">
                  <div className="feedback-section">
                    <h4>Matched Keywords</h4>
                    <div className="keyword-tags">
                      {parseAtsSuggestions(atsReport.matchedKeywords).map((item) => (
                        <span key={item} className="keyword-tag">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="feedback-section">
                    <h4>Missing Keywords</h4>
                    <div className="keyword-tags">
                      {parseAtsSuggestions(atsReport.missingKeywords).map((item) => (
                        <span key={item} className="keyword-tag">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="feedback-section">
                    <h4>Issues</h4>
                    <ul>
                      {parseAtsSuggestions(atsReport.issues).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="feedback-section">
                    <h4>Warnings</h4>
                    <ul>
                      {parseAtsSuggestions(atsReport.warnings).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="feedback-section">
                    <h4>Suggestions</h4>
                    <ul>
                      {parseAtsSuggestions(atsReport.suggestions).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeSection === "optimizer" && (
          <section className="resume-builder-section">
            <div className="section-header">
              <h2>Job-Specific Resume Optimizer</h2>
              <p>Optimizes your profile and experience bullets against a target job description.</p>
            </div>
            <div className="job-optimizer">
              <textarea
                rows={9}
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste the full job description here..."
              />
              <button
                type="button"
                className="primary-button"
                onClick={handleOptimizeResume}
                disabled={busyKey === "optimize"}
              >
                {busyKey === "optimize" ? "Optimizing..." : "Optimize Resume"}
              </button>
            </div>
            {resumeData?.optimization && (
              <div className="optimization-results">
                <h4>Optimization Applied</h4>
                <div className="optimized-content">
                  <h5>Applied Keywords</h5>
                  <p>{(resumeData.optimization.appliedKeywords || []).join(", ") || "No additional keywords returned."}</p>
                  {atsReport?.score ? <p>Updated ATS Score: {atsReport.score}</p> : null}
                </div>
              </div>
            )}
            {renderPreview()}
          </section>
        )}

        {activeSection === "cover" && (
          <section className="resume-builder-section">
            <div className="section-header">
              <h2>Cover Letter Generator</h2>
              <p>Create a role-specific cover letter with resume highlights.</p>
            </div>

            <div className="cover-letter-types">
              {COVER_LETTER_TYPES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`secondary-button ${coverLetterType === item.id ? "active-type" : ""}`}
                  onClick={() => setCoverLetterType(item.id)}
                  aria-pressed={coverLetterType === item.id}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="job-optimizer">
              <textarea
                rows={7}
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Optional: paste job description to improve letter quality."
              />
              <button type="button" className="primary-button" onClick={handleCoverLetter} disabled={busyKey === "cover-letter"}>
                {busyKey === "cover-letter" ? "Generating..." : "Generate Cover Letter"}
              </button>
            </div>

            {coverLetter && (
              <div className="cover-letter-preview">
                <h4>{COVER_LETTER_TYPES.find((item) => item.id === coverLetterType)?.label} Letter</h4>
                <div className="letter-content">
                  {String(coverLetter.content || "")
                    .split(/\n+/)
                    .filter(Boolean)
                    .map((line, index) => (
                      <p key={`${line}-${index}`}>{line}</p>
                    ))}
                </div>
                <div className="keyword-tags">
                  {(coverLetter.highlights || []).map((highlight) => (
                    <span key={highlight} className="keyword-tag">
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {activeSection === "interview" && (
          <section className="resume-builder-section interview-prep">
            <div className="section-header">
              <h2>Interview Preparation</h2>
              <p>Generate role-specific questions, tips, and skill practice topics.</p>
            </div>
            <button type="button" className="primary-button" onClick={handleInterviewPrep} disabled={busyKey === "interview"}>
              {busyKey === "interview" ? "Preparing..." : "Generate Interview Prep"}
            </button>
            {interviewPrep && (
              <div className="interview-content">
                <div className="interview-section">
                  <h4>Questions</h4>
                  <ul>
                    {(interviewPrep.questions || []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="interview-section">
                  <h4>Tips</h4>
                  <ul>
                    {(interviewPrep.tips || []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="interview-section">
                  <h4>Skill Practice</h4>
                  <div className="course-tags">
                    {(interviewPrep.skillCourses || []).map((item) => (
                      <span key={item} className="course-tag">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeSection === "library" && (
          <section className="resume-builder-section">
            <div className="section-header">
              <h2>My Resumes</h2>
              <p>Open, duplicate, delete, and continue editing saved drafts.</p>
            </div>
            {!isAuthenticated ? (
              <p className="library-note">You are not logged in. Drafts are being saved to local storage on this device.</p>
            ) : null}
            <div className="saved-resume-grid">
              {savedResumes.length === 0 ? (
                <p className="library-note">No resumes saved yet.</p>
              ) : (
                savedResumes.map((item) => {
                  const itemId = item?._id || item?.id || "";
                  const isSelected = selectedResumeId === itemId;
                  return (
                    <article key={itemId} className={`saved-resume-card ${isSelected ? "selected" : ""}`}>
                      <h4>{item.name || "Untitled Resume"}</h4>
                      <p>{item.resumeType || "professional"} • {item.template || "simple-ats"}</p>
                      <p className="saved-meta">
                        Updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "Unknown"}
                      </p>
                      <div className="saved-actions">
                        <button type="button" className="secondary-button" onClick={() => openDraft(item)}>
                          Open
                        </button>
                        <button type="button" className="secondary-button" onClick={() => duplicateDraft(item)}>
                          Duplicate
                        </button>
                        <button type="button" className="secondary-button danger" onClick={() => deleteDraft(item)}>
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        )}
      </div>

      <aside className="resume-actions-bar" aria-label="Resume actions">
        <div className="download-options">
          <button type="button" onClick={exportPdf}>
            Download PDF
          </button>
          <button type="button" onClick={exportDoc}>
            Download DOC
          </button>
        </div>
        <div className="share-options">
          <button type="button" onClick={copySummary}>
            Copy Resume Text
          </button>
          <button type="button" onClick={shareWhatsApp}>
            Share on WhatsApp
          </button>
        </div>
      </aside>
    </div>
  );
};

export default ResumeBuilder;
