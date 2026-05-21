import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import EducationQuickActions from "./EducationQuickActions";
import EducationStudyPathBuilder from "./EducationStudyPathBuilder";
import {
  getCourseValueScore,
  getScholarshipDisclaimer,
  validateTuitionRequest,
} from "./educationUpgradeUtils";
import "./Education.css";
import "./EducationUpgrade.css";

const ENABLE_EDUCATION_360_DASHBOARD =
  String(process.env.REACT_APP_EDUCATION_360_DASHBOARD || "true").trim().toLowerCase() !== "false";
const ENABLE_EDUCATION_CANVA_STUDIO =
  String(process.env.REACT_APP_EDUCATION_CANVA_STUDIO || "true").trim().toLowerCase() !== "false";

const EDUCATION_SECTIONS = [
  {
    id: "home",
    title: "Overview",
    description: "Get a quick overview of tuition, courses, community and support",
    icon: "H",
  },
  {
    id: "dashboard-360",
    title: "360 Dashboard",
    description: "Role-based outcomes, risks and intervention signals",
    icon: "D",
  },
  {
    id: "courses",
    title: "Courses",
    description: "Browse skill courses, filter by level, view details and enroll",
    icon: "C",
  },
  {
    id: "my-learning",
    title: "My Learning",
    description: "Continue your enrolled courses and revisit progress",
    icon: "L",
  },
  {
    id: "community",
    title: "Community",
    description: "Study groups, doubt boards and student discussions",
    icon: "G",
  },
  {
    id: "career",
    title: "Career",
    description: "Resume help, interview prep and job pathways",
    icon: "R",
  },
  {
    id: "assessments",
    title: "Assessments",
    description: "Mock tests, weak areas and score insights",
    icon: "A",
  },
  {
    id: "certificates",
    title: "Certificates",
    description: "Upload and manage your skill certificates",
    icon: "F",
  },
  {
    id: "tuition-tracker",
    title: "Tuition Tracker",
    description: "Track tutor matching and request lifecycle",
    icon: "T",
  },
  {
    id: "government",
    title: "Government",
    description: "Scholarships, schemes and government support",
    icon: "S",
  },
  {
    id: "canva-studio",
    title: "Canva Studio",
    description: "Templates, multilingual variants and campaign sizes",
    icon: "V",
  },
  {
    id: "study-path",
    title: "Study Path",
    description: "Generate weekly study plans with smart guidance",
    icon: "P",
  },
].filter((section) => {
  if (section.id === "dashboard-360") return ENABLE_EDUCATION_360_DASHBOARD;
  if (section.id === "canva-studio") return ENABLE_EDUCATION_CANVA_STUDIO;
  return true;
});

const DEFAULT_ROLE_PROFILE = {
  primaryRole: "student",
  studentName: "",
  classLevel: "",
  targetExam: "",
  preferredLanguage: "English",
  careerGoal: "",
};

const TUITION_SUBJECTS = [
  "Mathematics",
  "Science",
  "English",
  "Social Studies",
  "Hindi",
  "Malayalam",
  "Physics",
  "Chemistry",
  "Biology",
];

const TUITION_CLASS_LEVELS = [
  "Class 8",
  "Class 9",
  "Class 10",
  "Plus One",
  "Plus Two",
  "College",
  "Job seeker",
];

const DEFAULT_SKILL_COURSES = [
  {
    id: "gulf-hotel-operations-pro",
    title: "Gulf Hotel Operations Pro",
    level: "Beginner",
    duration: "45 hours",
    price: "Free",
    amount: 0,
    description: "A Gulf-ready hospitality track for housekeeping, front desk, and guest relations careers.",
    syllabus: ["Gulf service culture", "Guest onboarding", "Communication templates", "Service basics"],
    outcomes: ["Job-readiness", "Interview confidence", "Customer service foundations"],
  },
  {
    id: "kerala-digital-marketing",
    title: "Kerala Digital Marketing Launchpad",
    level: "Intermediate",
    duration: "32 hours",
    price: "INR 1,200",
    amount: 1200,
    description: "Practical digital marketing training for Kerala entrepreneurs and freelancers.",
    syllabus: ["Marketing fundamentals", "Customer discovery", "Campaign setup", "Reporting basics"],
    outcomes: ["Portfolio-ready campaigns", "Freelance readiness", "Growth marketing skills"],
  },
  {
    id: "it-cloud-support-engineer",
    title: "IT Cloud Support Engineer",
    level: "Advanced",
    duration: "60 hours",
    price: "INR 2,500",
    amount: 2500,
    description: "Cloud support and helpdesk training with hands-on labs for global IT service desk roles.",
    syllabus: ["Cloud platform essentials", "Service desk practices", "Incident management", "Ticketing tools"],
    outcomes: ["Cloud support readiness", "Technical troubleshooting skills", "Global employability"],
  },
  {
    id: "hospitality-food-beverage",
    title: "Hospitality & Food Service Essentials",
    level: "Beginner",
    duration: "40 hours",
    price: "INR 800",
    amount: 800,
    description: "Entry-level hospitality training for food service and guest experience roles.",
    syllabus: ["Guest service standards", "Food safety basics", "Service flow", "Operations hygiene"],
    outcomes: ["Hospitality fundamentals", "Workplace readiness", "Service confidence"],
  },
  {
    id: "government-exam-psc-pro",
    title: "Kerala PSC & Banking Exam Fast Track",
    level: "Intermediate",
    duration: "50 hours",
    price: "Free",
    amount: 0,
    description: "Focused preparation for Kerala PSC, banking, and government career routes.",
    syllabus: ["Syllabus mapping", "Time management", "Daily mock planning", "Weak-area analysis"],
    outcomes: ["Structured exam strategy", "Mock test discipline", "Government exam confidence"],
  },
];

const DEFAULT_SCHOLARSHIPS = [
  {
    name: "Kerala State Merit Scholarship",
    amount: "INR 10,000/year",
    deadline: "June 30, 2026",
    eligibility: "Merit-based",
  },
  {
    name: "Central Government SC/ST Scholarship",
    amount: "INR 20,000/year",
    deadline: "July 15, 2026",
    eligibility: "SC/ST students",
  },
  {
    name: "Women Education Scholarship",
    amount: "INR 15,000/year",
    deadline: "August 10, 2026",
    eligibility: "Female students",
  },
];

const DEFAULT_GOVERNMENT_SCHEMES = [
  {
    title: "Scholarship Eligibility Checker",
    summary: "Find scholarships you qualify for based on category and academic level.",
  },
  {
    title: "Education Loan Assistance",
    summary: "Compare low-interest government education loans for tuition and hostel support.",
  },
  {
    title: "Skill Development Grants",
    summary: "Apply for government support to cover certified skill training programs.",
  },
];

const COMMUNITY_GROUPS = [
  {
    title: "Class 10 Mathematics Doubts",
    description: "23 active discussions | Moderated",
    action: "Join Discussion",
  },
  {
    title: "SSLC Exam Preparation",
    description: "156 members | Study partners available",
    action: "Join Group",
  },
  {
    title: "Spoken English Practice",
    description: "100 members | Live practice sessions",
    action: "Join Session",
  },
];

const CAREER_RESOURCES = [
  {
    title: "Resume and Interview Coaching",
    description: "Prepare a professional resume and practice interview questions.",
    action: "Start Coaching",
  },
  {
    title: "Job Pathways",
    description: "Explore career pathways for IT, marketing, teaching and government exams.",
    action: "Explore Jobs",
  },
  {
    title: "Skill Assessment",
    description: "Take a quick assessment to match your strengths with the best course.",
    action: "Take Assessment",
  },
];

const normalizeStringList = (values = []) =>
  [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean))];

const normalizeProgressMap = (progress = {}) => {
  if (!progress || typeof progress !== "object") {
    return {};
  }

  return Object.entries(progress).reduce((accumulator, [rawCourseId, rawProgress]) => {
    const courseId = String(rawCourseId || "").trim();
    const progressValue = Number(rawProgress);
    if (!courseId || !Number.isFinite(progressValue)) {
      return accumulator;
    }
    accumulator[courseId] = Math.max(0, Math.min(100, Math.round(progressValue)));
    return accumulator;
  }, {});
};

const normalizeRoleProfile = (profile = {}) => {
  const primaryRole = String(profile?.primaryRole || DEFAULT_ROLE_PROFILE.primaryRole).trim().toLowerCase();
  return {
    primaryRole: ["student", "parent", "tutor", "institute_admin"].includes(primaryRole)
      ? primaryRole
      : DEFAULT_ROLE_PROFILE.primaryRole,
    studentName: String(profile?.studentName || "").trim(),
    classLevel: String(profile?.classLevel || "").trim(),
    targetExam: String(profile?.targetExam || "").trim(),
    preferredLanguage: String(profile?.preferredLanguage || DEFAULT_ROLE_PROFILE.preferredLanguage).trim() || DEFAULT_ROLE_PROFILE.preferredLanguage,
    careerGoal: String(profile?.careerGoal || "").trim(),
  };
};

const normalizeEducationState = (state = {}) => ({
  enrolledCourseIds: normalizeStringList(state.enrolledCourseIds),
  appliedScholarships: normalizeStringList(state.appliedScholarships),
  joinedGroups: normalizeStringList(state.joinedGroups),
  courseProgress: normalizeProgressMap(state.courseProgress),
  roleProfile: normalizeRoleProfile(state.roleProfile || {}),
  interventionsDismissed: normalizeStringList(state.interventionsDismissed),
});

const EDUCATION_LOCAL_STATE_KEY = "education-module-state-v1";

const readEducationStateFromLocalStorage = () => {
  if (typeof window === "undefined") {
    return normalizeEducationState({});
  }

  try {
    const raw = window.localStorage.getItem(EDUCATION_LOCAL_STATE_KEY);
    if (!raw) {
      return normalizeEducationState({});
    }
    return normalizeEducationState(JSON.parse(raw));
  } catch (error) {
    return normalizeEducationState({});
  }
};

const writeEducationStateToLocalStorage = (state) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(EDUCATION_LOCAL_STATE_KEY, JSON.stringify(normalizeEducationState(state)));
  } catch (error) {
    // Ignore local storage failures and keep in-memory state.
  }
};

const parseCourseAmount = (price) => {
  const raw = String(price || '')
    .replace(/[^0-9.]/g, '')
    .trim();
  return Number(raw || 0);
};

const formatInr = (amount = 0) => {
  const numericAmount = Number(amount || 0);
  if (!numericAmount) {
    return "Free";
  }

  return `INR ${numericAmount.toLocaleString("en-IN")}`;
};

const buildClientIdempotencyKey = (scope = "") =>
  `${scope}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeCatalogCourse = (course = {}) => {
  const modules = Array.isArray(course.modules) ? course.modules : [];
  const lessonTitles = modules
    .flatMap((moduleItem) =>
      Array.isArray(moduleItem?.lessons)
        ? moduleItem.lessons.map((lesson) => String(lesson?.title || "").trim())
        : []
    )
    .filter(Boolean);
  const moduleTitles = modules
    .map((moduleItem) => String(moduleItem?.title || "").trim())
    .filter(Boolean);
  const syllabus = lessonTitles.length ? lessonTitles : moduleTitles;

  return {
    ...course,
    id: String(course.id || "").trim(),
    title: String(course.title || "Skill Course").trim(),
    level: String(course.level || "Beginner").trim(),
    duration: String(course.duration || "Self paced").trim(),
    amount: Math.max(0, Number(course.price || 0)),
    price: formatInr(course.price || 0),
    description: String(course.description || "Structured learning track.").trim(),
    syllabus: syllabus.length ? syllabus : ["Core concepts", "Practice sessions", "Assessment checkpoints"],
    outcomes: [
      course.certificateAvailable ? "Certificate support" : "",
      course.jobLinked ? "Career and placement alignment" : "",
      "Guided learning pathway",
    ].filter(Boolean),
  };
};

const buildStudyAssistantResponse = (query) => {
  const normalized = query.toLowerCase();

  if (normalized.includes("study plan") || normalized.includes("schedule")) {
    return "Try a 45-10 cycle: study 45 minutes, break 10 minutes, and review once before sleep.";
  }

  if (normalized.includes("exam") || normalized.includes("revision")) {
    return "For exam revision, start with previous year questions, then summarize weak topics in one-page notes.";
  }

  if (normalized.includes("english") || normalized.includes("speaking")) {
    return "Practice aloud for 15 minutes daily, record yourself twice a week, and track one improvement goal each session.";
  }

  if (normalized.includes("coding") || normalized.includes("programming")) {
    return "For coding growth, solve one basic problem daily, then build one mini project each week to retain concepts.";
  }

  return "Break the topic into basics, examples, and practice. If you share your class level and target exam, you can get a tighter study path.";
};

const Education = () => {
  const { currentUser, apiCall } = useApp();
  const [activeSection, setActiveSection] = useState("home");
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(TUITION_SUBJECTS[0]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [tuitionClassLevel, setTuitionClassLevel] = useState(TUITION_CLASS_LEVELS[2]);
  const [tuitionContactPhone, setTuitionContactPhone] = useState("");
  const [tuitionErrors, setTuitionErrors] = useState({});
  const [scholarshipQuery, setScholarshipQuery] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [learningPath, setLearningPath] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [weakAreas, setWeakAreas] = useState([]);
  const [questionCategory, setQuestionCategory] = useState("Gulf Ready");
  const [questionBank, setQuestionBank] = useState([]);
  const [testAnswers, setTestAnswers] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [walletShareText, setWalletShareText] = useState("");
  const [certificateForm, setCertificateForm] = useState({
    title: "",
    issuer: "",
    completedOn: "",
    credentialId: "",
  });
  const [certificateFile, setCertificateFile] = useState(null);
  const [tuitionRequests, setTuitionRequests] = useState([]);
  const [tuitionMatchesByRequest, setTuitionMatchesByRequest] = useState({});
  const [tuitionStatusUpdateBusy, setTuitionStatusUpdateBusy] = useState(false);
  const [skillCourses, setSkillCourses] = useState(DEFAULT_SKILL_COURSES);
  const [scholarshipCatalog, setScholarshipCatalog] = useState(DEFAULT_SCHOLARSHIPS);
  const [governmentSchemes, setGovernmentSchemes] = useState(DEFAULT_GOVERNMENT_SCHEMES);
  const [joinedGroups, setJoinedGroups] = useState([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [appliedScholarships, setAppliedScholarships] = useState([]);
  const [courseProgress, setCourseProgress] = useState({});
  const [roleProfile, setRoleProfile] = useState(DEFAULT_ROLE_PROFILE);
  const [interventionsDismissed, setInterventionsDismissed] = useState([]);
  const [outcomeMetrics, setOutcomeMetrics] = useState({});
  const [kpiHealth, setKpiHealth] = useState({});
  const [interventions, setInterventions] = useState([]);
  const [canvaToolkit, setCanvaToolkit] = useState({
    templates: [],
    campaignSizes: [],
    translationTargets: [],
    suggestedCampaigns: [],
  });
  const [sessionDraftsByRequest, setSessionDraftsByRequest] = useState({});
  const [roleProfileSaving, setRoleProfileSaving] = useState(false);
  const [certificateVerificationBusy, setCertificateVerificationBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [tuitionLoading, setTuitionLoading] = useState(false);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const isAuthenticated = Boolean(currentUser?.id || currentUser?.email);

  useEffect(() => {
    const isValidSection = EDUCATION_SECTIONS.some((section) => section.id === activeSection);
    if (!isValidSection) {
      setActiveSection("home");
    }
  }, [activeSection]);

  const applyEducationState = useCallback((nextState) => {
    const normalizedState = normalizeEducationState(nextState);
    setEnrolledCourseIds(normalizedState.enrolledCourseIds);
    setAppliedScholarships(normalizedState.appliedScholarships);
    setJoinedGroups(normalizedState.joinedGroups);
    setCourseProgress(normalizedState.courseProgress);
    setRoleProfile(normalizedState.roleProfile);
    setInterventionsDismissed(normalizedState.interventionsDismissed);
    writeEducationStateToLocalStorage(normalizedState);
    return normalizedState;
  }, []);

  const buildStateSnapshot = useCallback(() => ({
    enrolledCourseIds,
    appliedScholarships,
    joinedGroups,
    courseProgress,
    roleProfile,
    interventionsDismissed,
  }), [
    enrolledCourseIds,
    appliedScholarships,
    joinedGroups,
    courseProgress,
    roleProfile,
    interventionsDismissed,
  ]);

  useEffect(() => {
    const shouldSyncFromBackend = Boolean(currentUser?.id || currentUser?.email) && typeof apiCall === "function";
    if (!shouldSyncFromBackend) {
      applyEducationState(readEducationStateFromLocalStorage());
      return undefined;
    }

    let isMounted = true;
    setSyncInProgress(true);

    const loadBackendState = async () => {
      try {
        const response = await apiCall("/app-data/education/state", "GET");
        const remoteState = normalizeEducationState(response?.data?.state || response?.state || {});
        if (isMounted) {
          applyEducationState(remoteState);
        }
      } catch (error) {
        if (isMounted) {
          setStatusMessage("Unable to load your education progress from the account.");
        }
      } finally {
        if (isMounted) {
          setSyncInProgress(false);
        }
      }
    };

    void loadBackendState();

    return () => {
      isMounted = false;
    };
  }, [apiCall, applyEducationState, currentUser?.email, currentUser?.id]);

  useEffect(() => {
    const canFetchCourses = isAuthenticated && typeof apiCall === "function";
    if (!canFetchCourses) {
      setSkillCourses(DEFAULT_SKILL_COURSES);
      return undefined;
    }

    let isMounted = true;
    setCoursesLoading(true);

    const loadSkillCourses = async () => {
      try {
        const response = await apiCall("/app-data/skilllearning/courses", "GET");
        const courses = Array.isArray(response?.data?.courses)
          ? response.data.courses.map(normalizeCatalogCourse).filter((course) => course.id)
          : [];
        if (isMounted && courses.length) {
          setSkillCourses(courses);
        }
      } catch (error) {
        if (isMounted) {
          setSkillCourses(DEFAULT_SKILL_COURSES);
        }
      } finally {
        if (isMounted) {
          setCoursesLoading(false);
        }
      }
    };

    void loadSkillCourses();

    return () => {
      isMounted = false;
    };
  }, [apiCall, isAuthenticated]);

  useEffect(() => {
    const canFetchAssessmentData = isAuthenticated && typeof apiCall === "function";
    if (!canFetchAssessmentData) {
      setLearningPath([]);
      setRecommendations([]);
      setWeakAreas([]);
      setQuestionBank([]);
      setCertificates([]);
      setWalletShareText("");
      setTuitionRequests([]);
      setOutcomeMetrics({});
      setKpiHealth({});
      setInterventions([]);
      setCanvaToolkit({
        templates: [],
        campaignSizes: [],
        translationTargets: [],
        suggestedCampaigns: [],
      });
      return undefined;
    }

    let isMounted = true;
    setAssessmentsLoading(true);
    setCertificatesLoading(true);
    setTuitionLoading(true);

    const loadAssessmentData = async () => {
      try {
        const [
          pathResponse,
          questionsResponse,
          certificatesResponse,
          walletResponse,
          tuitionResponse,
          overviewResponse,
          canvaKitResponse,
          kpisResponse,
        ] = await Promise.allSettled([
          apiCall("/app-data/education/learning-path", "GET"),
          apiCall(`/app-data/skilllearning/questions?category=${encodeURIComponent(questionCategory)}`, "GET"),
          apiCall("/app-data/skilllearning/certificates", "GET"),
          apiCall("/app-data/skilllearning/wallet", "GET"),
          apiCall("/app-data/education/tuition/requests", "GET"),
          ENABLE_EDUCATION_360_DASHBOARD
            ? apiCall("/app-data/education/overview360", "GET")
            : Promise.resolve({ data: { state: buildStateSnapshot(), outcomeMetrics: {}, interventions: [] } }),
          ENABLE_EDUCATION_CANVA_STUDIO
            ? apiCall("/app-data/education/canva-kit", "GET")
            : Promise.resolve({ data: { canvaToolkit: { templates: [], campaignSizes: [], translationTargets: [], suggestedCampaigns: [] } } }),
          ENABLE_EDUCATION_360_DASHBOARD
            ? apiCall("/app-data/education/kpis", "GET")
            : Promise.resolve({ data: { metrics: {}, kpiHealth: {} } }),
        ]);

        if (isMounted) {
          const hasFailure = [
            pathResponse,
            questionsResponse,
            certificatesResponse,
            walletResponse,
            tuitionResponse,
            overviewResponse,
            canvaKitResponse,
            kpisResponse,
          ]
            .some((result) => result.status === "rejected");
          const pathData = pathResponse.status === "fulfilled" ? pathResponse.value?.data : null;
          const questionsData = questionsResponse.status === "fulfilled" ? questionsResponse.value?.data : null;
          const certificatesData =
            certificatesResponse.status === "fulfilled" ? certificatesResponse.value?.data : null;
          const walletData = walletResponse.status === "fulfilled" ? walletResponse.value?.data : null;
          const tuitionData = tuitionResponse.status === "fulfilled" ? tuitionResponse.value?.data : null;
          const overviewData = overviewResponse.status === "fulfilled" ? overviewResponse.value?.data : null;
          const canvaData = canvaKitResponse.status === "fulfilled" ? canvaKitResponse.value?.data : null;
          const kpiData = kpisResponse.status === "fulfilled" ? kpisResponse.value?.data : null;

          setLearningPath(Array.isArray(pathData?.path) ? pathData.path : []);
          setRecommendations(Array.isArray(pathData?.recommendations) ? pathData.recommendations : []);
          setWeakAreas(Array.isArray(pathData?.weakAreas) ? pathData.weakAreas : []);
          setQuestionBank(Array.isArray(questionsData?.questions) ? questionsData.questions : []);
          setCertificates(Array.isArray(certificatesData?.certificates) ? certificatesData.certificates : []);
          setWalletShareText(String(walletData?.shareText || ""));
          setTuitionRequests(Array.isArray(tuitionData?.requests) ? tuitionData.requests : []);
          if (overviewData?.state) {
            applyEducationState(overviewData.state);
          }
          setOutcomeMetrics(overviewData?.outcomeMetrics && typeof overviewData.outcomeMetrics === "object"
            ? overviewData.outcomeMetrics
            : {});
          setKpiHealth(kpiData?.kpiHealth && typeof kpiData.kpiHealth === "object" ? kpiData.kpiHealth : {});
          setInterventions(Array.isArray(overviewData?.interventions) ? overviewData.interventions : []);
          const toolkit = canvaData?.canvaToolkit || overviewData?.canvaToolkit || {};
          setCanvaToolkit({
            templates: Array.isArray(toolkit?.templates) ? toolkit.templates : [],
            campaignSizes: Array.isArray(toolkit?.campaignSizes) ? toolkit.campaignSizes : [],
            translationTargets: Array.isArray(toolkit?.translationTargets) ? toolkit.translationTargets : [],
            suggestedCampaigns: Array.isArray(toolkit?.suggestedCampaigns) ? toolkit.suggestedCampaigns : [],
          });

          if (hasFailure) {
            setStatusMessage((currentMessage) =>
              currentMessage || "Some education widgets could not refresh. Please try again shortly."
            );
          }
        }
      } catch (error) {
        if (isMounted) {
          setQuestionBank([]);
        }
      } finally {
        if (isMounted) {
          setAssessmentsLoading(false);
          setCertificatesLoading(false);
          setTuitionLoading(false);
        }
      }
    };

    void loadAssessmentData();

    return () => {
      isMounted = false;
    };
  }, [apiCall, applyEducationState, isAuthenticated, questionCategory]);

  useEffect(() => {
    const canFetchSupportData = isAuthenticated && typeof apiCall === "function";
    if (!canFetchSupportData) {
      setScholarshipCatalog(DEFAULT_SCHOLARSHIPS);
      setGovernmentSchemes(DEFAULT_GOVERNMENT_SCHEMES);
      return undefined;
    }

    let isMounted = true;

    const loadSupportData = async () => {
      try {
        const response = await apiCall("/app-data/education/discovery", "GET");
        const scholarships = Array.isArray(response?.data?.scholarships)
          ? response.data.scholarships
          : [];
        const schemes = Array.isArray(response?.data?.governmentSchemes)
          ? response.data.governmentSchemes
          : [];

        if (isMounted && scholarships.length) {
          setScholarshipCatalog(scholarships);
        }
        if (isMounted && schemes.length) {
          setGovernmentSchemes(schemes);
        }
      } catch (error) {
        if (isMounted) {
          setScholarshipCatalog(DEFAULT_SCHOLARSHIPS);
          setGovernmentSchemes(DEFAULT_GOVERNMENT_SCHEMES);
        }
      }
    };

    void loadSupportData();

    return () => {
      isMounted = false;
    };
  }, [apiCall, isAuthenticated]);

  const persistEducationState = useCallback(async (nextState, successMessage = "") => {
    const normalizedState = applyEducationState(nextState);
    const shouldSyncToBackend = Boolean(currentUser?.id || currentUser?.email) && typeof apiCall === "function";

    if (!shouldSyncToBackend) {
      setStatusMessage(successMessage || "Saved locally. Sign in to sync education progress.");
      return;
    }

    setSyncInProgress(true);
    try {
      const response = await apiCall("/app-data/education/state", "PATCH", normalizedState);
      const syncedState = normalizeEducationState(response?.data?.state || response?.state || normalizedState);
      applyEducationState(syncedState);
      if (successMessage) {
        setStatusMessage(successMessage);
      }
    } catch (error) {
      setStatusMessage("Unable to save education progress right now.");
    } finally {
      setSyncInProgress(false);
    }
  }, [apiCall, applyEducationState, currentUser?.email, currentUser?.id]);

  const filteredCourses = useMemo(() => {
    const query = courseSearchQuery.toLowerCase().trim();
    return skillCourses.filter((course) =>
      course.title.toLowerCase().includes(query) ||
      course.level.toLowerCase().includes(query) ||
      course.description.toLowerCase().includes(query)
    );
  }, [courseSearchQuery, skillCourses]);

  const filteredScholarships = useMemo(() => {
    const query = scholarshipQuery.toLowerCase().trim();
    return scholarshipCatalog.filter((scholarship) =>
      String(scholarship?.name || "").toLowerCase().includes(query) ||
      String(scholarship?.eligibility || "").toLowerCase().includes(query)
    );
  }, [scholarshipCatalog, scholarshipQuery]);

  const enrolledCourses = useMemo(
    () => skillCourses.filter((course) => enrolledCourseIds.includes(course.id)),
    [enrolledCourseIds, skillCourses]
  );
  const educationPulse = useMemo(() => {
    const progressValues = Object.values(courseProgress || {});
    const avgProgress = progressValues.length
      ? Math.round(progressValues.reduce((sum, value) => sum + Number(value || 0), 0) / progressValues.length)
      : 0;
    const completionSignal = enrolledCourseIds.length
      ? Math.max(avgProgress, Math.min(100, enrolledCourseIds.length * 20))
      : 0;

    return [
      {
        label: "Skill Courses",
        value: skillCourses.length,
        helper: "Career-focused programs",
      },
      {
        label: "My Enrollments",
        value: enrolledCourseIds.length,
        helper: "Courses in progress",
      },
      {
        label: "Community Groups",
        value: joinedGroups.length,
        helper: "Peer circles joined",
      },
      {
        label: "Scholarship Drafts",
        value: appliedScholarships.length,
        helper: "Applications tracked",
      },
      {
        label: "Learning Momentum",
        value: `${completionSignal}%`,
        helper: "Progress indicator",
      },
      {
        label: "Readiness Score",
        value: `${Number(outcomeMetrics?.readinessScore || 0)}%`,
        helper: "360 performance score",
      },
    ];
  }, [
    appliedScholarships.length,
    courseProgress,
    enrolledCourseIds.length,
    joinedGroups.length,
    outcomeMetrics?.readinessScore,
    skillCourses.length,
  ]);

  const viewCourseDetails = (course) => {
    setSelectedCourse(course);
    setActiveSection("course-detail");
  };

  const handleAiQuery = () => {
    if (!aiQuery.trim()) {
      setAiResponse("Enter a question to get guidance.");
      return;
    }

    setAiResponse(buildStudyAssistantResponse(aiQuery));
  };

  const loadRazorpayScript = () => new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Razorpay can only be loaded in the browser.'));
      return;
    }

    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error('Unable to load Razorpay checkout script.'));
    document.body.appendChild(script);
  });

  const verifyRazorpayPayment = async ({
    paymentRecordId,
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
  }) => {
    if (!paymentRecordId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      throw new Error('Missing Razorpay verification details.');
    }

    const verificationResponse = await apiCall('/checkout/verify-razorpay', 'POST', {
      paymentId: paymentRecordId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!verificationResponse?.data?.success) {
      throw new Error('Payment verification failed.');
    }

    return verificationResponse.data;
  };

  const openRazorpayCheckout = async (paymentDetails, enrollmentId, courseTitle) => {
    setPaymentError('');
    setPaymentInProgress(true);

    if (!paymentDetails || paymentDetails.gateway !== 'razorpay') {
      setPaymentInProgress(false);
      throw new Error('Unsupported payment gateway.');
    }
    if (!enrollmentId) {
      setPaymentInProgress(false);
      throw new Error('Enrollment confirmation id is missing.');
    }

    const Razorpay = await loadRazorpayScript();
    if (!Razorpay) {
      setPaymentInProgress(false);
      throw new Error('Razorpay checkout library failed to load.');
    }

    return new Promise((resolve, reject) => {
      const options = {
        key: paymentDetails.razorpayKeyId,
        amount: Math.round((paymentDetails.amount || 0) * 100),
        currency: paymentDetails.currency || 'INR',
        order_id: paymentDetails.razorpayOrderId,
        name: `Education Enrollment: ${courseTitle}`,
        description: `Pay for ${courseTitle}`,
        prefill: {
          email: currentUser?.email || '',
          name: currentUser?.name || currentUser?.fullName || '',
        },
        notes: paymentDetails.notes || {},
        handler: async (response) => {
          try {
            await verifyRazorpayPayment({
              paymentRecordId: paymentDetails.paymentId,
              ...response,
            });
            const confirmResponse = await apiCall(
              `/app-data/education/enroll/${enrollmentId}/confirm-payment`,
              "POST",
              {
                paymentId: String(paymentDetails.paymentId || ""),
                razorpay_order_id: response?.razorpay_order_id,
                razorpay_payment_id: response?.razorpay_payment_id,
                razorpay_signature: response?.razorpay_signature,
              }
            );
            const confirmedState = normalizeEducationState(
              confirmResponse?.data?.state || confirmResponse?.state || {}
            );
            applyEducationState(confirmedState);
            setStatusMessage(`Payment successful for ${courseTitle}. Enrollment is confirmed.`);
            resolve(response);
          } catch (verifyError) {
            setPaymentError(verifyError.message || 'Payment verification failed.');
            reject(verifyError);
          } finally {
            setPaymentInProgress(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentInProgress(false);
            setStatusMessage('Payment was cancelled. Your enrollment is pending.');
            reject(new Error('Payment cancelled.'));
          },
        },
      };

      const checkout = new Razorpay(options);
      checkout.open();
    });
  };

  const persistEducationAction = async (endpoint, payload, nextState, successMessage) => {
    const normalizedState = normalizeEducationState(nextState);
    const shouldSyncToBackend = isAuthenticated && typeof apiCall === 'function';

    if (!shouldSyncToBackend) {
      applyEducationState(normalizedState);
      setStatusMessage(successMessage || 'Saved locally. Sign in to sync with your account.');
      return;
    }

    setSyncInProgress(true);
    try {
      const response = await apiCall(endpoint, 'POST', payload);
      const syncedState = normalizeEducationState(response?.data?.state || response?.state || normalizedState);
      applyEducationState(syncedState);
      setStatusMessage(successMessage);
    } catch (error) {
      setStatusMessage(`Unable to sync right now. ${successMessage}`);
    } finally {
      setSyncInProgress(false);
    }
  };

  const handleTuitionBooking = async () => {
    const validation = validateTuitionRequest({
      subject: selectedSubject,
      classLevel: tuitionClassLevel,
      contactPhone: tuitionContactPhone,
    });
    if (!validation.isValid) {
      setTuitionErrors(validation.errors);
      setStatusMessage("Please correct the tuition request details.");
      return;
    }

    setTuitionErrors({});
    const successMessage = `Tuition request submitted for ${selectedSubject}. A tutor will contact you soon.`;
    const nextState = buildStateSnapshot();

    if (!isAuthenticated || typeof apiCall !== 'function') {
      setStatusMessage(successMessage);
      return;
    }

    setSyncInProgress(true);
    try {
      const response = await apiCall('/app-data/education/tuition', 'POST', {
        subject: selectedSubject,
        classLevel: tuitionClassLevel,
        contactPhone: tuitionContactPhone,
        preferredMode: "online",
        preferredTime: "",
        details: `Tuition request from ${currentUser?.email || 'guest'} for ${selectedSubject} (${tuitionClassLevel})`,
      });
      const requestRecord = response?.data?.tuitionRequest || null;
      const tutorMatches = Array.isArray(response?.data?.tutorMatches) ? response.data.tutorMatches : [];
      if (requestRecord?.requestId) {
        setTuitionRequests((current) => [requestRecord, ...current]);
        setTuitionMatchesByRequest((current) => ({
          ...current,
          [requestRecord.requestId]: tutorMatches,
        }));
      }
      applyEducationState(nextState);
      setStatusMessage(successMessage);
    } catch (error) {
      applyEducationState(nextState);
      setStatusMessage(`${successMessage} Saved locally; account sync pending.`);
    } finally {
      setSyncInProgress(false);
    }
  };

  const handleCourseEnroll = async (course) => {
    if (enrolledCourseIds.includes(course.id)) {
      setStatusMessage(`You are already enrolled in ${course.title}.`);
      return;
    }

    const nextState = {
      ...buildStateSnapshot(),
      enrolledCourseIds: [...enrolledCourseIds, course.id],
      courseProgress: {
        ...courseProgress,
        [course.id]: Math.max(5, Number(courseProgress?.[course.id] || 0)),
      },
    };

    if (!isAuthenticated || typeof apiCall !== 'function') {
      void persistEducationState(nextState, `${course.title} added to My Learning.`);
      return;
    }

    const amount = Math.max(0, Number(course.amount ?? parseCourseAmount(course.price)));
    setSyncInProgress(true);
    setPaymentError('');

    try {
      const response = await apiCall('/app-data/education/enroll', 'POST', {
        courseId: course.id,
        courseTitle: course.title,
        amount,
        paymentMethod: 'upi',
        paymentGateway: 'razorpay',
      });
      const serverState = normalizeEducationState(response?.data?.state || response?.state || {});
      const enrollmentId = String(response?.data?.enrollment?.enrollmentId || "");
      const shouldPayNow = Boolean(response?.data?.requiresPayment && response?.data?.paymentDetails && amount > 0);

      if (shouldPayNow) {
        if (!enrollmentId) {
          throw new Error("Enrollment id missing for payment confirmation.");
        }
        setStatusMessage(`Starting payment for ${course.title}.`);
        await openRazorpayCheckout(response.data.paymentDetails, enrollmentId, course.title);
      } else {
        applyEducationState(serverState.enrolledCourseIds.length ? serverState : nextState);
        setStatusMessage(`${course.title} added to My Learning.`);
      }
    } catch (error) {
      const message = error?.message || 'Unable to enroll right now.';
      setStatusMessage(`Could not complete enrollment for ${course.title}. ${message}`);
      setPaymentError(message);
    } finally {
      setSyncInProgress(false);
    }
  };

  const handleScholarshipApply = async (scholarshipName) => {
    if (appliedScholarships.includes(scholarshipName)) {
      setStatusMessage(`You have already applied for ${scholarshipName}.`);
      return;
    }

    const nextState = {
      ...buildStateSnapshot(),
      appliedScholarships: [...appliedScholarships, scholarshipName],
    };

    if (!isAuthenticated || typeof apiCall !== 'function') {
      void persistEducationState(nextState, `Application draft created for ${scholarshipName}.`);
      return;
    }

    await persistEducationAction(
      '/app-data/education/scholarship',
      { scholarshipName },
      nextState,
      `Application draft created for ${scholarshipName}.`
    );
  };

  const handleJoinCommunityGroup = async (groupTitle) => {
    if (joinedGroups.includes(groupTitle)) {
      setStatusMessage(`You are already a member of ${groupTitle}.`);
      return;
    }

    const nextState = {
      ...buildStateSnapshot(),
      joinedGroups: [...joinedGroups, groupTitle],
    };

    if (!isAuthenticated || typeof apiCall !== 'function') {
      void persistEducationState(nextState, `You have joined ${groupTitle}.`);
      return;
    }

    await persistEducationAction(
      '/app-data/education/group',
      { groupTitle },
      nextState,
      `You have joined ${groupTitle}.`
    );
  };

  const handleCourseProgressUpdate = async (courseId, delta) => {
    if (isAuthenticated && typeof apiCall === "function") {
      try {
        const response = await apiCall("/app-data/education/progress/event", "POST", {
          courseId,
          eventType: "progress_adjustment",
          progressDelta: delta,
        });
        const syncedState = normalizeEducationState(response?.data?.state || response?.state || {});
        applyEducationState(syncedState);
        const nextValue = Number(syncedState?.courseProgress?.[courseId] || 0);
        setStatusMessage(`Progress updated to ${nextValue}% for this course.`);
        return;
      } catch (error) {
        // Fall back to local+state sync patch below.
      }
    }

    const currentValue = Number(courseProgress?.[courseId] || 0);
    const nextValue = Math.max(0, Math.min(100, currentValue + delta));
    const nextState = {
      ...buildStateSnapshot(),
      courseProgress: {
        ...courseProgress,
        [courseId]: nextValue,
      },
    };
    await persistEducationState(nextState, `Progress updated to ${nextValue}% for this course.`);
  };

  const handleTestAnswerChange = (questionId, selectedIndex) => {
    setTestAnswers((current) => ({
      ...current,
      [questionId]: selectedIndex,
    }));
  };

  const handleSubmitAssessment = async () => {
    if (!isAuthenticated || typeof apiCall !== "function") {
      setStatusMessage("Sign in to submit assessment results.");
      return;
    }
    const answers = Object.entries(testAnswers).map(([id, selectedIndex]) => ({
      id,
      selectedIndex: Number(selectedIndex),
    }));
    if (!answers.length) {
      setStatusMessage("Please answer at least one question before submitting.");
      return;
    }

    setAssessmentsLoading(true);
    try {
      const response = await apiCall("/app-data/skilllearning/tests/submit", "POST", {
        category: questionCategory,
        answers,
      });
      setTestResult(response?.data?.result || null);
      const weakAreaList = Array.isArray(response?.data?.result?.weakAreas) ? response.data.result.weakAreas : [];
      setWeakAreas(weakAreaList);
      setStatusMessage(response?.data?.insight || "Assessment submitted successfully.");
      setTestAnswers({});
    } catch (error) {
      setStatusMessage("Failed to submit assessment. Please try again.");
    } finally {
      setAssessmentsLoading(false);
    }
  };

  const handleCertificateFieldChange = (field, value) => {
    setCertificateForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleRoleProfileChange = (field, value) => {
    setRoleProfile((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSaveRoleProfile = async () => {
    if (!isAuthenticated || typeof apiCall !== "function") {
      setStatusMessage("Sign in to save your profile preferences.");
      return;
    }
    setRoleProfileSaving(true);
    try {
      const response = await apiCall("/app-data/education/profile", "PATCH", {
        ...roleProfile,
        idempotencyKey: buildClientIdempotencyKey("education-profile"),
      });
      const syncedState = normalizeEducationState(response?.data?.state || response?.state || buildStateSnapshot());
      applyEducationState(syncedState);
      setStatusMessage("Role profile updated successfully.");
    } catch (error) {
      setStatusMessage("Unable to update role profile right now.");
    } finally {
      setRoleProfileSaving(false);
    }
  };

  const handleDismissIntervention = async (interventionId) => {
    const nextDismissed = [...new Set([...(interventionsDismissed || []), interventionId])];
    const nextState = {
      ...buildStateSnapshot(),
      interventionsDismissed: nextDismissed,
    };
    setInterventions((current) => current.filter((item) => item.id !== interventionId));
    await persistEducationState(nextState, "Intervention dismissed.");
  };

  const handleCertificateVerificationUpdate = async (certificateId, verificationStatus) => {
    if (!isAuthenticated || typeof apiCall !== "function") {
      setStatusMessage("Sign in to update certificate verification.");
      return;
    }
    setCertificateVerificationBusy(true);
    try {
      const response = await apiCall(
        `/app-data/skilllearning/certificates/${certificateId}/verification`,
        "PATCH",
        {
          verificationStatus,
          verificationNote: verificationStatus === "rejected"
            ? "Needs verification proof."
            : "Verified for profile trust score.",
          idempotencyKey: buildClientIdempotencyKey(`education-cert-${certificateId}`),
        }
      );
      const updatedCertificate = response?.data?.certificate || null;
      if (updatedCertificate?.certificateId) {
        setCertificates((current) => current.map((certificate) =>
          certificate.certificateId === updatedCertificate.certificateId
            ? updatedCertificate
            : certificate
        ));
      }
      setStatusMessage(`Certificate marked as ${verificationStatus}.`);
    } catch (error) {
      setStatusMessage("Failed to update certificate verification.");
    } finally {
      setCertificateVerificationBusy(false);
    }
  };

  const handleSessionDraftChange = (requestId, field, value) => {
    setSessionDraftsByRequest((current) => ({
      ...current,
      [requestId]: {
        scheduledAt: current?.[requestId]?.scheduledAt || "",
        durationMinutes: current?.[requestId]?.durationMinutes || 60,
        agenda: current?.[requestId]?.agenda || "",
        [field]: value,
      },
    }));
  };

  const handleCreateTuitionSession = async (requestId) => {
    if (!isAuthenticated || typeof apiCall !== "function") {
      setStatusMessage("Sign in to schedule tuition sessions.");
      return;
    }
    const draft = sessionDraftsByRequest?.[requestId] || {};
    if (!draft.scheduledAt) {
      setStatusMessage("Select a session schedule before creating a tuition session.");
      return;
    }
    setTuitionStatusUpdateBusy(true);
    try {
      const response = await apiCall(`/app-data/education/tuition/${requestId}/sessions`, "POST", {
        scheduledAt: draft.scheduledAt,
        durationMinutes: Number(draft.durationMinutes || 60),
        agenda: draft.agenda || "",
        idempotencyKey: buildClientIdempotencyKey(`education-session-create-${requestId}`),
      });
      const updatedRequest = response?.data?.tuitionRequest;
      if (updatedRequest?.requestId) {
        setTuitionRequests((current) =>
          current.map((request) => (request.requestId === updatedRequest.requestId ? updatedRequest : request))
        );
      }
      setStatusMessage("Tuition session scheduled.");
    } catch (error) {
      setStatusMessage("Failed to schedule tuition session.");
    } finally {
      setTuitionStatusUpdateBusy(false);
    }
  };

  const handleSessionAttendanceUpdate = async (requestId, sessionId, attendanceStatus) => {
    if (!isAuthenticated || typeof apiCall !== "function") {
      setStatusMessage("Sign in to update tuition session attendance.");
      return;
    }
    setTuitionStatusUpdateBusy(true);
    try {
      const response = await apiCall(
        `/app-data/education/tuition/${requestId}/sessions/${sessionId}`,
        "PATCH",
        {
          attendanceStatus,
          idempotencyKey: buildClientIdempotencyKey(`education-session-update-${requestId}-${sessionId}`),
        }
      );
      const updatedRequest = response?.data?.tuitionRequest;
      if (updatedRequest?.requestId) {
        setTuitionRequests((current) =>
          current.map((request) => (request.requestId === updatedRequest.requestId ? updatedRequest : request))
        );
      }
      setStatusMessage(`Session marked as ${attendanceStatus}.`);
    } catch (error) {
      setStatusMessage("Failed to update session attendance.");
    } finally {
      setTuitionStatusUpdateBusy(false);
    }
  };

  const handleUploadCertificate = async () => {
    if (!isAuthenticated || typeof apiCall !== "function") {
      setStatusMessage("Sign in to upload certificates.");
      return;
    }
    if (!certificateForm.title.trim() || !certificateForm.completedOn) {
      setStatusMessage("Title and completion date are required for certificate upload.");
      return;
    }

    const formData = new FormData();
    formData.append("title", certificateForm.title.trim());
    formData.append("issuer", certificateForm.issuer.trim());
    formData.append("completedOn", certificateForm.completedOn);
    formData.append("credentialId", certificateForm.credentialId.trim());
    if (certificateFile) {
      formData.append("certificateFile", certificateFile);
    }

    setCertificatesLoading(true);
    try {
      const response = await apiCall("/app-data/skilllearning/certificates/upload", "POST", formData);
      if (response?.data?.certificate) {
        setCertificates((current) => [response.data.certificate, ...current]);
      }
      setCertificateForm({
        title: "",
        issuer: "",
        completedOn: "",
        credentialId: "",
      });
      setCertificateFile(null);
      setStatusMessage("Certificate uploaded successfully.");
    } catch (error) {
      setStatusMessage("Unable to upload certificate right now.");
    } finally {
      setCertificatesLoading(false);
    }
  };

  const handleTuitionStatusUpdate = async (requestId, nextStatus, note = "") => {
    if (!isAuthenticated || typeof apiCall !== "function") {
      setStatusMessage("Sign in to update tuition request status.");
      return;
    }
    setTuitionStatusUpdateBusy(true);
    try {
      const response = await apiCall(`/app-data/education/tuition/${requestId}/status`, "PATCH", {
        status: nextStatus,
        note,
      });
      const updatedRequest = response?.data?.tuitionRequest;
      if (updatedRequest?.requestId) {
        setTuitionRequests((current) =>
          current.map((request) => (request.requestId === updatedRequest.requestId ? updatedRequest : request))
        );
      }
      setStatusMessage(`Tuition request moved to ${nextStatus.replace(/_/g, " ")}.`);
    } catch (error) {
      setStatusMessage("Failed to update tuition request status.");
    } finally {
      setTuitionStatusUpdateBusy(false);
    }
  };

  return (
    <div className="education-shell">
      {statusMessage && (
        <section className="education-status-banner" role="status" aria-live="polite">
          <p>{statusMessage}</p>
          <button type="button" className="education-status-dismiss" onClick={() => setStatusMessage("")}>Dismiss</button>
        </section>
      )}
      {syncInProgress && (
        <section className="education-sync-banner" role="status" aria-live="polite">
          Syncing education progress...
        </section>
      )}
      {paymentInProgress && (
        <section className="education-sync-banner" role="status" aria-live="polite">
          Completing payment...
        </section>
      )}
      {paymentError && (
        <section className="education-status-banner education-status-error" role="alert" aria-live="assertive">
          <p>{paymentError}</p>
          <button type="button" className="education-status-dismiss" onClick={() => setPaymentError("")}>Dismiss</button>
        </section>
      )}

      <section className="education-hero">
        <div className="education-hero-copy">
          <h1>Education ecosystem for tuition, skills, scholarships, and student support in one place.</h1>
          <p>
            Connect students, parents, tutors, and institutes in one learning platform with guided assistance and community features.
          </p>
          <div className="education-hero-actions">
            <button type="button" className="education-primary-button" onClick={() => setActiveSection("home")}>Home</button>
            <button type="button" className="education-secondary-button" onClick={() => setActiveSection("courses")}>Browse Courses</button>
          </div>
          <div className="education-hero-tags">
            <span>CBSE/ICSE/Kerala syllabus</span>
            <span>Job-oriented skills</span>
            <span>Study abroad guidance</span>
            <span>Government scholarships</span>
          </div>
        </div>
        <aside className="education-hero-metrics" aria-label="Learning dashboard pulse">
          <h2>Learning Pulse</h2>
          <p>Track your activity and stay consistent across courses, community, and support programs.</p>
          <div className="education-pulse-grid">
            {educationPulse.map((item) => (
              <article key={item.label} className="education-pulse-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.helper}</small>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <EducationQuickActions
        onAction={(action) => {
          setActiveSection(action.targetSection);
          if (action.id === "tuition") {
            setStatusMessage("Select subject, class level and phone, then request tuition.");
          }
        }}
      />

      <section className="education-nav">
        {EDUCATION_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            data-testid={`education-nav-${section.id}`}
            className={`education-nav-item ${activeSection === section.id ? "active" : ""}`}
            onClick={() => setActiveSection(section.id)}
          >
            <span className="education-nav-icon">{section.icon}</span>
            <strong>{section.title}</strong>
            <span>{section.description}</span>
          </button>
        ))}
      </section>

      {activeSection === "home" && (
        <section className="education-section">
          <div className="education-section-heading">
            <h2>Learning at a glance</h2>
            <p>Find tuition, skill courses, career guidance, community support, or scholarships from one hub.</p>
          </div>
          <div className="education-home-grid">
            <div className="education-course-card">
              <h3>Start with Skill Courses</h3>
              <p>Choose from beginner to advanced programs that are built for employability.</p>
              <button type="button" className="education-primary-button" onClick={() => setActiveSection("courses")}>Browse Courses</button>
            </div>
            <div className="education-course-card">
              <h3>Book Subject Tuition</h3>
              <label className="education-field" htmlFor="tuition-subject-select">
                <span>Select subject</span>
                <select
                  id="tuition-subject-select"
                  value={selectedSubject}
                  onChange={(event) => setSelectedSubject(event.target.value)}
                >
                  {TUITION_SUBJECTS.map((subject) => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
                {tuitionErrors.subject ? <small className="education-field-error">{tuitionErrors.subject}</small> : null}
              </label>
              <label className="education-field" htmlFor="tuition-class-level-select">
                <span>Class / level</span>
                <select
                  id="tuition-class-level-select"
                  value={tuitionClassLevel}
                  onChange={(event) => setTuitionClassLevel(event.target.value)}
                >
                  {TUITION_CLASS_LEVELS.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
                {tuitionErrors.classLevel ? <small className="education-field-error">{tuitionErrors.classLevel}</small> : null}
              </label>
              <label className="education-field" htmlFor="tuition-contact-phone-input">
                <span>Contact phone (optional)</span>
                <input
                  id="tuition-contact-phone-input"
                  type="tel"
                  placeholder="Enter parent/student phone"
                  value={tuitionContactPhone}
                  onChange={(event) => setTuitionContactPhone(event.target.value)}
                />
                {tuitionErrors.contactPhone ? <small className="education-field-error">{tuitionErrors.contactPhone}</small> : null}
              </label>
              <button type="button" className="education-secondary-button" onClick={handleTuitionBooking}>Request Tuition</button>
            </div>
            <div className="education-course-card">
              <h3>Prepare for Government Support</h3>
              <p>Search scholarships, loan assistance and education grants for students.</p>
              <button type="button" className="education-secondary-button" onClick={() => setActiveSection("government")}>View Support</button>
            </div>
            <div className="education-course-card">
              <h3>Career Growth</h3>
              <p>Access resume help, interview coaching and job readiness plans.</p>
              <button type="button" className="education-secondary-button" onClick={() => setActiveSection("career")}>Explore Career</button>
            </div>
          </div>
        </section>
      )}

      {activeSection === "dashboard-360" && (
        <section className="education-section">
          <div className="education-section-heading">
            <h2>Education 360 Dashboard</h2>
            <p>Role-aware profile, readiness score, and intervention queue.</p>
          </div>
          <div className="education-home-grid">
            <div className="education-course-card">
              <h3>Role Profile</h3>
              <div className="education-study-path-form">
                <label className="education-field" htmlFor="role-primary">
                  <span>Primary role</span>
                  <select
                    id="role-primary"
                    value={roleProfile.primaryRole}
                    onChange={(event) => handleRoleProfileChange("primaryRole", event.target.value)}
                  >
                    <option value="student">Student</option>
                    <option value="parent">Parent</option>
                    <option value="tutor">Tutor</option>
                    <option value="institute_admin">Institute Admin</option>
                  </select>
                </label>
                <label className="education-field" htmlFor="role-student-name">
                  <span>Student name</span>
                  <input
                    id="role-student-name"
                    type="text"
                    value={roleProfile.studentName}
                    onChange={(event) => handleRoleProfileChange("studentName", event.target.value)}
                  />
                </label>
                <label className="education-field" htmlFor="role-class-level">
                  <span>Class level</span>
                  <input
                    id="role-class-level"
                    type="text"
                    value={roleProfile.classLevel}
                    onChange={(event) => handleRoleProfileChange("classLevel", event.target.value)}
                  />
                </label>
                <label className="education-field" htmlFor="role-target-exam">
                  <span>Target exam</span>
                  <input
                    id="role-target-exam"
                    type="text"
                    value={roleProfile.targetExam}
                    onChange={(event) => handleRoleProfileChange("targetExam", event.target.value)}
                  />
                </label>
                <label className="education-field" htmlFor="role-language">
                  <span>Preferred language</span>
                  <input
                    id="role-language"
                    type="text"
                    value={roleProfile.preferredLanguage}
                    onChange={(event) => handleRoleProfileChange("preferredLanguage", event.target.value)}
                  />
                </label>
                <label className="education-field" htmlFor="role-career-goal">
                  <span>Career goal</span>
                  <input
                    id="role-career-goal"
                    type="text"
                    value={roleProfile.careerGoal}
                    onChange={(event) => handleRoleProfileChange("careerGoal", event.target.value)}
                  />
                </label>
              </div>
              <div className="education-course-actions">
                <button
                  type="button"
                  className="education-primary-button"
                  disabled={roleProfileSaving}
                  onClick={handleSaveRoleProfile}
                >
                  Save Role Profile
                </button>
              </div>
            </div>
            <div className="education-course-card">
              <h3>Outcome Metrics</h3>
              <p><strong>Readiness Score:</strong> {Number(outcomeMetrics?.readinessScore || 0)}%</p>
              <p><strong>Average Course Progress:</strong> {Number(outcomeMetrics?.avgCourseProgress || 0)}%</p>
              <p><strong>Latest Test Score:</strong> {Number(outcomeMetrics?.latestTestScore || 0)}%</p>
              <p><strong>Tuition Completion:</strong> {Number(outcomeMetrics?.tuitionCompletionRate || 0)}%</p>
              <p><strong>Scholarship Conversion:</strong> {Number(outcomeMetrics?.scholarshipConversionRate || 0)}%</p>
              <p><strong>Certificate Verification:</strong> {Number(outcomeMetrics?.certificationVerificationRate || 0)}%</p>
              <p><strong>KPI Health - Readiness:</strong> {String(kpiHealth?.readiness || "unknown")}</p>
              <p><strong>KPI Health - Progress:</strong> {String(kpiHealth?.progress || "unknown")}</p>
              <p><strong>KPI Health - Tuition:</strong> {String(kpiHealth?.tuition || "unknown")}</p>
              <p><strong>KPI Health - Certificates:</strong> {String(kpiHealth?.certificates || "unknown")}</p>
            </div>
          </div>
          <div className="education-courses-grid">
            {interventions.length === 0 ? (
              <div className="education-empty-state">
                <h3>No active interventions</h3>
                <p>Your learning workflow looks healthy right now.</p>
              </div>
            ) : null}
            {interventions.map((item) => (
              <article key={item.id} className="education-course-card">
                <h3>{item.title}</h3>
                <p><strong>Severity:</strong> {item.severity}</p>
                <p>{item.description}</p>
                <div className="education-course-actions">
                  <button type="button" className="education-primary-button">
                    {item.action}
                  </button>
                  <button
                    type="button"
                    className="education-secondary-button"
                    onClick={() => handleDismissIntervention(item.id)}
                  >
                    Dismiss
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeSection === "courses" && (
        <section className="education-section">
          <div className="education-section-heading">
            <h2>Skill Courses Hub</h2>
            <p>Learn job-ready skills with certificates and placement support.</p>
          </div>
          <div className="education-search-bar">
            <label className="education-field" htmlFor="education-course-search">
              <span>Search courses</span>
              <input
                id="education-course-search"
                type="text"
                placeholder="Search by course name, level, or topic"
                value={courseSearchQuery}
                onChange={(event) => setCourseSearchQuery(event.target.value)}
              />
            </label>
          </div>
          {coursesLoading ? <p>Loading course catalog...</p> : null}
          <div className="education-courses-grid">
            {!coursesLoading && filteredCourses.length === 0 ? (
              <div className="education-empty-state">
                <h3>No courses found</h3>
                <p>Try a different keyword or clear the filters.</p>
              </div>
            ) : null}
            {filteredCourses.map((course) => (
              <div key={course.id} className="education-course-card">
                <h3>{course.title}</h3>
                <span>{course.level} | {course.duration}</span>
                <strong>{course.price}</strong>
                <div className="education-course-value-row">
                  <span>Course value score</span>
                  <strong>{getCourseValueScore(course)}%</strong>
                </div>
                <p>{course.description}</p>
                <div className="education-course-actions">
                  <button
                    type="button"
                    className="education-secondary-button"
                    onClick={() => viewCourseDetails(course)}
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    className="education-primary-button"
                    data-testid={`education-enroll-${course.id}`}
                    onClick={() => handleCourseEnroll(course)}
                  >
                    {enrolledCourseIds.includes(course.id) ? "Continue" : "Enroll Now"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeSection === "canva-studio" && (
        <section className="education-section">
          <div className="education-section-heading">
            <h2>Canva Studio for Education</h2>
            <p>Template toolkit, localization targets, and social campaign sizes for 360 outreach.</p>
          </div>
          <div className="education-home-grid">
            <div className="education-course-card">
              <h3>Translation Targets</h3>
              <p>
                {(Array.isArray(canvaToolkit.translationTargets) && canvaToolkit.translationTargets.length)
                  ? canvaToolkit.translationTargets.join(", ")
                  : "English, Malayalam, Hindi"}
              </p>
              <p>Use translated versions for student, parent, and institute communication packs.</p>
            </div>
            <div className="education-course-card">
              <h3>Campaign Sizes</h3>
              <ul>
                {(canvaToolkit.campaignSizes || []).map((item) => (
                  <li key={`${item.platform}-${item.dimensions}`}>
                    <strong>{item.platform}:</strong> {item.dimensions}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="education-courses-grid">
            {(canvaToolkit.templates || []).map((template) => (
              <article key={template.templateId} className="education-course-card">
                <h3>{template.title}</h3>
                <p>{template.useCase}</p>
                <p><strong>Recommended size:</strong> {template.recommendedSize}</p>
              </article>
            ))}
          </div>
          <div className="education-courses-grid">
            {(canvaToolkit.suggestedCampaigns || []).map((campaign) => (
              <article key={campaign.campaignId} className="education-course-card">
                <h3>{campaign.title}</h3>
                <p>{campaign.message}</p>
                <p><strong>Audience:</strong> {campaign.targetAudience}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeSection === "study-path" && (
        <section className="education-section">
          <EducationStudyPathBuilder
            onApplyPath={(path) => setStatusMessage(`${path.title} added to your study workflow.`)}
          />
        </section>
      )}

      {activeSection === "community" && (
        <section className="education-section">
          <div className="education-section-heading">
            <h2>Student Community</h2>
            <p>Safe moderated forums for doubt clearing, notes sharing, and study groups.</p>
          </div>
          <div className="education-community-grid">
            {COMMUNITY_GROUPS.map((group) => {
              const isJoined = joinedGroups.includes(group.title);
              return (
                <div key={group.title} className="education-forum-card">
                  <h3>{group.title}</h3>
                  <span>{group.description}</span>
                  <button
                    type="button"
                    className="education-secondary-button"
                    data-testid={`education-community-${group.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    onClick={() => handleJoinCommunityGroup(group.title)}
                  >
                    {isJoined ? "Joined" : group.action}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {activeSection === "my-learning" && (
        <section className="education-section">
          <div className="education-section-heading">
            <h2>My Learning</h2>
            <p>Access your enrolled courses, progress, and upcoming lessons.</p>
          </div>
          {enrolledCourses.length === 0 ? (
            <div className="education-empty-state">
              <h3>No enrolled courses yet</h3>
              <p>Browse courses and enroll to continue learning from this section.</p>
              <button type="button" className="education-primary-button" onClick={() => setActiveSection("courses")}>Browse Courses</button>
            </div>
          ) : (
            <div className="education-courses-grid">
              {enrolledCourses.map((course) => (
                <div key={course.id} className="education-course-card">
                  <h3>{course.title}</h3>
                  <span>{course.level} | {course.duration}</span>
                  <strong>{course.price}</strong>
                  <div className="education-progress-block">
                    <div className="education-progress-row">
                      <span>Progress</span>
                      <strong>{Math.max(0, Math.min(100, Number(courseProgress?.[course.id] || 0)))}%</strong>
                    </div>
                    <div className="education-progress-track" aria-hidden="true">
                      <span
                        className="education-progress-fill"
                        style={{ width: `${Math.max(0, Math.min(100, Number(courseProgress?.[course.id] || 0)))}%` }}
                      />
                    </div>
                  </div>
                  <div className="education-course-actions">
                    <button
                      type="button"
                      className="education-secondary-button"
                      onClick={() => handleCourseProgressUpdate(course.id, 10)}
                    >
                      +10% Lesson Done
                    </button>
                    <button
                      type="button"
                      className="education-secondary-button"
                      onClick={() => handleCourseProgressUpdate(course.id, -5)}
                    >
                      -5% Revisit
                    </button>
                  </div>
                  <div className="education-course-actions">
                    <button type="button" className="education-secondary-button" onClick={() => viewCourseDetails(course)}>
                      View Course
                    </button>
                    <button
                      type="button"
                      className="education-primary-button"
                      onClick={() => {
                        viewCourseDetails(course);
                        setStatusMessage(`Continue learning ${course.title}.`);
                      }}
                    >
                      Continue Learning
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeSection === "course-detail" && (
        <section className="education-section education-course-detail">
          <div className="education-section-heading">
            <h2>{selectedCourse ? selectedCourse.title : "Course Detail"}</h2>
            <p>Course details, syllabus, outcomes, and next steps.</p>
          </div>
          {selectedCourse ? (
            <div className="education-course-detail-grid">
              <div className="education-course-detail-card">
                <h3>About this course</h3>
                <p>{selectedCourse.description}</p>
                <ul>
                  {(Array.isArray(selectedCourse.syllabus) ? selectedCourse.syllabus : []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="education-course-detail-card">
                <h3>What you will gain</h3>
                <ul>
                  {(Array.isArray(selectedCourse.outcomes) ? selectedCourse.outcomes : []).map((outcome) => (
                    <li key={outcome}>{outcome}</li>
                  ))}
                </ul>
                <p><strong>Duration:</strong> {selectedCourse.duration}</p>
                <p><strong>Level:</strong> {selectedCourse.level}</p>
                <p><strong>Price:</strong> {selectedCourse.price}</p>
                {enrolledCourseIds.includes(selectedCourse.id) ? (
                  <p><strong>Your Progress:</strong> {Math.max(0, Math.min(100, Number(courseProgress?.[selectedCourse.id] || 0)))}%</p>
                ) : null}
                <div className="education-course-actions">
                  <button type="button" className="education-secondary-button" onClick={() => setActiveSection("courses")}>
                    Back to Courses
                  </button>
                  <button type="button" className="education-primary-button" onClick={() => handleCourseEnroll(selectedCourse)}>
                    {enrolledCourseIds.includes(selectedCourse.id) ? "Enrolled" : "Enroll in Course"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="education-empty-state">
              <p>Select a course to see its details.</p>
              <button type="button" className="education-secondary-button" onClick={() => setActiveSection("courses")}>Back to Courses</button>
            </div>
          )}
        </section>
      )}

      {activeSection === "career" && (
        <section className="education-section">
          <div className="education-section-heading">
            <h2>Career Support</h2>
            <p>Get career guidance, resume help, interview preparation and placement readiness.</p>
          </div>
          {recommendations.length ? (
            <div className="education-course-card">
              <h3>Recommended tracks for you</h3>
              <ul>
                {recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {learningPath.length ? (
            <div className="education-course-card">
              <h3>Personalized next steps</h3>
              <ul>
                {learningPath.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {weakAreas.length ? (
            <div className="education-course-card">
              <h3>Weak areas to improve</h3>
              <p>{weakAreas.join(", ")}</p>
            </div>
          ) : null}
          <div className="education-career-grid">
            {CAREER_RESOURCES.map((resource) => (
              <div key={resource.title} className="education-course-card">
                <h3>{resource.title}</h3>
                <p>{resource.description}</p>
                <button
                  type="button"
                  className="education-primary-button"
                  onClick={() => setStatusMessage(`${resource.title} has been added to your support queue.`)}
                >
                  {resource.action}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeSection === "assessments" && (
        <section className="education-section">
          <div className="education-section-heading">
            <h2>Assessments & Mock Tests</h2>
            <p>Attempt timed mock questions, view score insights and track weak topics.</p>
          </div>
          <div className="education-course-card">
            <label className="education-field" htmlFor="education-assessment-category">
              <span>Question category</span>
              <select
                id="education-assessment-category"
                value={questionCategory}
                onChange={(event) => {
                  setQuestionCategory(event.target.value);
                  setTestAnswers({});
                  setTestResult(null);
                }}
              >
                <option>Gulf Ready</option>
                <option>Kerala Career</option>
                <option>IT & Software</option>
                <option>Hospitality</option>
                <option>Government Exams</option>
              </select>
            </label>
          </div>
          {assessmentsLoading ? <p>Loading assessment questions...</p> : null}
          <div className="education-courses-grid">
            {questionBank.map((question) => (
              <article key={question.id} className="education-course-card">
                <h3>{question.question}</h3>
                <div className="education-study-path-form">
                  {(Array.isArray(question.options) ? question.options : []).map((option, index) => (
                    <label key={`${question.id}-${index}`} className="education-field">
                      <span>
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          checked={Number(testAnswers?.[question.id]) === index}
                          onChange={() => handleTestAnswerChange(question.id, index)}
                        />{" "}
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <div className="education-course-actions">
            <button type="button" className="education-primary-button" onClick={handleSubmitAssessment}>
              Submit Assessment
            </button>
          </div>
          {testResult ? (
            <div className="education-course-card">
              <h3>Latest Score</h3>
              <p><strong>Score:</strong> {testResult.score}%</p>
              <p><strong>Correct:</strong> {testResult.correct} | <strong>Wrong:</strong> {testResult.wrong}</p>
              <p><strong>Weak areas:</strong> {Array.isArray(testResult.weakAreas) && testResult.weakAreas.length ? testResult.weakAreas.join(", ") : "None"}</p>
            </div>
          ) : null}
        </section>
      )}

      {activeSection === "certificates" && (
        <section className="education-section">
          <div className="education-section-heading">
            <h2>Certificates Wallet</h2>
            <p>Upload your certificates and keep a verified record for career opportunities.</p>
          </div>
          <div className="education-course-card">
            <div className="education-study-path-form">
              <label className="education-field" htmlFor="certificate-title">
                <span>Certificate title</span>
                <input
                  id="certificate-title"
                  type="text"
                  value={certificateForm.title}
                  onChange={(event) => handleCertificateFieldChange("title", event.target.value)}
                />
              </label>
              <label className="education-field" htmlFor="certificate-issuer">
                <span>Issuer</span>
                <input
                  id="certificate-issuer"
                  type="text"
                  value={certificateForm.issuer}
                  onChange={(event) => handleCertificateFieldChange("issuer", event.target.value)}
                />
              </label>
              <label className="education-field" htmlFor="certificate-completed-on">
                <span>Completed on</span>
                <input
                  id="certificate-completed-on"
                  type="date"
                  value={certificateForm.completedOn}
                  onChange={(event) => handleCertificateFieldChange("completedOn", event.target.value)}
                />
              </label>
              <label className="education-field" htmlFor="certificate-credential-id">
                <span>Credential ID</span>
                <input
                  id="certificate-credential-id"
                  type="text"
                  value={certificateForm.credentialId}
                  onChange={(event) => handleCertificateFieldChange("credentialId", event.target.value)}
                />
              </label>
              <label className="education-field" htmlFor="certificate-file">
                <span>Certificate file (optional)</span>
                <input
                  id="certificate-file"
                  type="file"
                  onChange={(event) => setCertificateFile(event.target.files?.[0] || null)}
                />
              </label>
            </div>
            <div className="education-course-actions">
              <button type="button" className="education-primary-button" onClick={handleUploadCertificate}>
                Upload Certificate
              </button>
            </div>
          </div>
          {certificatesLoading ? <p>Loading certificates...</p> : null}
          {walletShareText ? (
            <div className="education-course-card">
              <h3>Share-ready profile summary</h3>
              <p>{walletShareText}</p>
            </div>
          ) : null}
          <div className="education-courses-grid">
            {certificates.map((certificate) => (
              <article key={certificate.certificateId || certificate._id} className="education-course-card">
                <h3>{certificate.title}</h3>
                <p><strong>Issuer:</strong> {certificate.issuer || "Training Partner"}</p>
                <p><strong>Completed:</strong> {String(certificate.completedOn || "").slice(0, 10)}</p>
                <p><strong>Credential ID:</strong> {certificate.credentialId || "N/A"}</p>
                <p><strong>Verification:</strong> {String(certificate.verificationStatus || "uploaded")}</p>
                {certificate.verificationNote ? (
                  <p><strong>Note:</strong> {certificate.verificationNote}</p>
                ) : null}
                <div className="education-course-actions">
                  <button
                    type="button"
                    className="education-secondary-button"
                    disabled={certificateVerificationBusy}
                    onClick={() => handleCertificateVerificationUpdate(certificate.certificateId, "verified")}
                  >
                    Mark Verified
                  </button>
                  <button
                    type="button"
                    className="education-secondary-button"
                    disabled={certificateVerificationBusy}
                    onClick={() => handleCertificateVerificationUpdate(certificate.certificateId, "rejected")}
                  >
                    Mark Rejected
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeSection === "tuition-tracker" && (
        <section className="education-section">
          <div className="education-section-heading">
            <h2>Tuition Request Tracker</h2>
            <p>Track every tuition request from submission to completion.</p>
          </div>
          {tuitionLoading ? <p>Loading tuition requests...</p> : null}
          {!tuitionLoading && tuitionRequests.length === 0 ? (
            <div className="education-empty-state">
              <h3>No tuition requests yet</h3>
              <p>Submit a tuition request from the Overview section.</p>
            </div>
          ) : null}
          <div className="education-courses-grid">
            {tuitionRequests.map((request) => {
              const status = String(request.status || "submitted");
              const matches = tuitionMatchesByRequest[request.requestId] || [];
              const sessionDraft = sessionDraftsByRequest?.[request.requestId] || {
                scheduledAt: "",
                durationMinutes: 60,
                agenda: "",
              };
              const sessions = Array.isArray(request.sessions) ? request.sessions : [];
              const statusActions = {
                submitted: [{ status: "matched", label: "Mark Matched", note: "Tutor shortlist reviewed." }],
                matched: [{ status: "trial_scheduled", label: "Schedule Trial", note: "Trial session scheduled." }],
                trial_scheduled: [{ status: "trial_completed", label: "Mark Trial Complete", note: "Trial session completed." }],
                trial_completed: [{ status: "booked", label: "Mark Booked", note: "Tuition package booked." }],
                booked: [{ status: "in_progress", label: "Start Tuition", note: "Tuition sessions started." }],
                in_progress: [{ status: "completed", label: "Mark Completed", note: "Tuition goals achieved." }],
              };
              const nextActions = statusActions[status] || [];
              return (
                <article key={request.requestId} className="education-course-card">
                  <h3>{request.subject} - {request.classLevel || "General"}</h3>
                  <p><strong>Status:</strong> {status.replace(/_/g, " ")}</p>
                  <p><strong>Mode:</strong> {request.preferredMode || "online"}</p>
                  <p><strong>Priority:</strong> {request.priority || "normal"}</p>
                  {request.assignedTutor?.name ? (
                    <p><strong>Tutor:</strong> {request.assignedTutor.name}</p>
                  ) : null}
                  {matches.length ? (
                    <div className="education-course-card">
                      <h4>Suggested tutors</h4>
                      <ul>
                        {matches.map((tutor) => (
                          <li key={tutor.tutorId}>{tutor.name} ({tutor.matchScore}% match)</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="education-course-actions">
                    {nextActions.map((action) => (
                      <button
                        key={`${request.requestId}-${action.status}`}
                        type="button"
                        className="education-secondary-button"
                        disabled={tuitionStatusUpdateBusy}
                        onClick={() => handleTuitionStatusUpdate(request.requestId, action.status, action.note)}
                      >
                        {action.label}
                      </button>
                    ))}
                    {status !== "cancelled" && status !== "completed" ? (
                      <button
                        type="button"
                        className="education-secondary-button"
                        disabled={tuitionStatusUpdateBusy}
                        onClick={() => handleTuitionStatusUpdate(request.requestId, "cancelled", "Request cancelled by learner.")}
                      >
                        Cancel Request
                      </button>
                    ) : null}
                  </div>
                  <div className="education-course-card">
                    <h4>Tuition Sessions</h4>
                    <div className="education-study-path-form">
                      <label className="education-field" htmlFor={`session-at-${request.requestId}`}>
                        <span>Schedule</span>
                        <input
                          id={`session-at-${request.requestId}`}
                          type="datetime-local"
                          value={sessionDraft.scheduledAt}
                          onChange={(event) => handleSessionDraftChange(request.requestId, "scheduledAt", event.target.value)}
                        />
                      </label>
                      <label className="education-field" htmlFor={`session-duration-${request.requestId}`}>
                        <span>Duration (minutes)</span>
                        <input
                          id={`session-duration-${request.requestId}`}
                          type="number"
                          min="15"
                          max="240"
                          value={sessionDraft.durationMinutes}
                          onChange={(event) => handleSessionDraftChange(request.requestId, "durationMinutes", event.target.value)}
                        />
                      </label>
                      <label className="education-field" htmlFor={`session-agenda-${request.requestId}`}>
                        <span>Agenda</span>
                        <input
                          id={`session-agenda-${request.requestId}`}
                          type="text"
                          value={sessionDraft.agenda}
                          onChange={(event) => handleSessionDraftChange(request.requestId, "agenda", event.target.value)}
                        />
                      </label>
                    </div>
                    <div className="education-course-actions">
                      <button
                        type="button"
                        className="education-primary-button"
                        disabled={tuitionStatusUpdateBusy}
                        onClick={() => handleCreateTuitionSession(request.requestId)}
                      >
                        Add Session
                      </button>
                    </div>
                    {sessions.length ? (
                      <ul>
                        {sessions.map((session) => (
                          <li key={session.sessionId}>
                            {String(session.scheduledAt || "").slice(0, 16).replace("T", " ")} | {session.durationMinutes} mins | {session.attendanceStatus}
                            <div className="education-course-actions">
                              <button
                                type="button"
                                className="education-secondary-button"
                                disabled={tuitionStatusUpdateBusy}
                                onClick={() => handleSessionAttendanceUpdate(request.requestId, session.sessionId, "attended")}
                              >
                                Attended
                              </button>
                              <button
                                type="button"
                                className="education-secondary-button"
                                disabled={tuitionStatusUpdateBusy}
                                onClick={() => handleSessionAttendanceUpdate(request.requestId, session.sessionId, "missed")}
                              >
                                Missed
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No sessions scheduled yet.</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {activeSection === "government" && (
        <section className="education-section">
          <div className="education-section-heading">
            <h2>Government Support</h2>
            <p>Find scholarships, education loans, and government scheme assistance.</p>
          </div>
          <div className="education-scholarship-search">
            <label className="education-field" htmlFor="education-scholarship-search">
              <span>Search scholarships or schemes</span>
              <input
                id="education-scholarship-search"
                type="text"
                placeholder="Search scholarships or schemes"
                value={scholarshipQuery}
                onChange={(event) => setScholarshipQuery(event.target.value)}
              />
            </label>
          </div>
          <p className="education-safety-note">{getScholarshipDisclaimer()}</p>
          <div className="education-scholarships-list">
            {filteredScholarships.map((scholarship) => {
              const isApplied = appliedScholarships.includes(scholarship.name);
              return (
                <div key={scholarship.name} className="education-scholarship-card">
                  <h3>{scholarship.name}</h3>
                  <span>Amount: {scholarship.amount}</span>
                  <span>Deadline: {scholarship.deadline}</span>
                  <span>Eligibility: {scholarship.eligibility}</span>
                  <button
                    type="button"
                    className="education-primary-button"
                    data-testid={`education-scholarship-${scholarship.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    onClick={() => handleScholarshipApply(scholarship.name)}
                  >
                    {isApplied ? "Applied" : "Apply Now"}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="education-government-grid">
            {governmentSchemes.map((scheme) => (
              <div key={scheme.title} className="education-course-card">
                <h3>{scheme.title}</h3>
                <p>{scheme.summary}</p>
                <button
                  type="button"
                  className="education-secondary-button"
                  onClick={() => setStatusMessage(`${scheme.title} opened in assisted mode.`)}
                >
                  Learn More
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="education-ai-assistant">
        <div className="education-section-heading">
          <h2>Study Assistant</h2>
          <p>Ask doubts, get explanations, generate notes, and create study plans.</p>
        </div>
        <div className="education-ai-chat">
          <label className="education-field" htmlFor="education-ai-input">
            <span>Ask your question</span>
            <input
              id="education-ai-input"
              type="text"
              placeholder="Ask anything about your studies"
              value={aiQuery}
              onChange={(event) => setAiQuery(event.target.value)}
            />
          </label>
          <button type="button" onClick={handleAiQuery}>Ask Assistant</button>
          {aiResponse && <p className="education-ai-response">{aiResponse}</p>}
        </div>
      </section>

      <section className="education-exam-prep">
        <div className="education-section-heading">
          <h2>Exam Preparation Hub</h2>
          <p>Resources for SSLC, Plus Two, PSC, Bank exams, and competitive tests.</p>
        </div>
        <div className="education-exam-grid">
          <div className="education-exam-card">
            <h3>SSLC Preparation</h3>
            <span>Mock tests | Study materials</span>
            <button type="button" className="education-secondary-button" onClick={() => setStatusMessage("SSLC prep list added to your dashboard.")}>Start Prep</button>
          </div>
          <div className="education-exam-card">
            <h3>NEET/JEE Support</h3>
            <span>Basic concepts | Practice questions</span>
            <button type="button" className="education-secondary-button" onClick={() => setStatusMessage("NEET/JEE prep list added to your dashboard.")}>Start Prep</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Education;
