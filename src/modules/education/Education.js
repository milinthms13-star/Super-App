import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import "./Education.css";

const EDUCATION_SECTIONS = [
  {
    id: "home",
    title: "Overview",
    description: "Get a quick overview of tuition, courses, community and support",
    icon: "H",
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
    id: "government",
    title: "Government",
    description: "Scholarships, schemes and government support",
    icon: "S",
  },
];

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

const SKILL_COURSES = [
  {
    id: "spoken-english",
    title: "Spoken English",
    level: "Beginner",
    duration: "3 months",
    price: "INR 2,999",
    description: "Build confidence, fluency and spoken skills for school, college, and interviews.",
    syllabus: ["Everyday conversation", "Pronunciation practice", "Grammar basics", "Mock speaking tests"],
    outcomes: ["Improved confidence", "Interview readiness", "Better classroom performance"],
  },
  {
    id: "computer-basics",
    title: "Computer Basics",
    level: "Beginner",
    duration: "2 months",
    price: "INR 1,999",
    description: "Learn essential computer skills, MS Office, email, and internet basics for students.",
    syllabus: ["PC fundamentals", "Word processing", "Spreadsheets", "Email and internet safety"],
    outcomes: ["Basic office skills", "Online learning readiness", "Homework productivity"],
  },
  {
    id: "coding-fundamentals",
    title: "Coding Fundamentals",
    level: "Intermediate",
    duration: "6 months",
    price: "INR 9,999",
    description: "Understand programming logic, Python basics and problem solving for future careers.",
    syllabus: ["Variables and flow control", "Functions", "Data structures", "Project building"],
    outcomes: ["Coding confidence", "Problem solving", "Portfolio project"],
  },
  {
    id: "digital-marketing",
    title: "Digital Marketing",
    level: "Advanced",
    duration: "4 months",
    price: "INR 7,999",
    description: "Master digital marketing fundamentals including social media, ads and content strategy.",
    syllabus: ["Social media marketing", "Search marketing", "Content planning", "Campaign analytics"],
    outcomes: ["Digital marketing skills", "Portfolio-ready campaigns", "Job preparation"],
  },
];

const SCHOLARSHIPS = [
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

const GOVERNMENT_SCHEMES = [
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

const STORAGE_PREFIX = "education";

const getStorageKey = (currentUser, suffix) => {
  const userId = currentUser?.id || currentUser?.email || "guest";
  return `${STORAGE_PREFIX}:${suffix}:${userId}`;
};

const readList = (key) => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const writeList = (key, values) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(values));
  } catch (error) {
    // Ignore local storage quota failures and keep UI functional.
  }
};

const normalizeStringList = (values = []) =>
  [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean))];

const normalizeEducationState = (state = {}) => ({
  enrolledCourseIds: normalizeStringList(state.enrolledCourseIds),
  appliedScholarships: normalizeStringList(state.appliedScholarships),
  joinedGroups: normalizeStringList(state.joinedGroups),
});

const readEducationStateFromStorage = ({
  enrollmentStorageKey,
  scholarshipStorageKey,
  communityStorageKey,
}) =>
  normalizeEducationState({
    enrolledCourseIds: readList(enrollmentStorageKey),
    appliedScholarships: readList(scholarshipStorageKey),
    joinedGroups: readList(communityStorageKey),
  });

const writeEducationStateToStorage = (
  {
    enrollmentStorageKey,
    scholarshipStorageKey,
    communityStorageKey,
  },
  state
) => {
  const normalizedState = normalizeEducationState(state);
  writeList(enrollmentStorageKey, normalizedState.enrolledCourseIds);
  writeList(scholarshipStorageKey, normalizedState.appliedScholarships);
  writeList(communityStorageKey, normalizedState.joinedGroups);
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
  const [scholarshipQuery, setScholarshipQuery] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [joinedGroups, setJoinedGroups] = useState([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [appliedScholarships, setAppliedScholarships] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [syncInProgress, setSyncInProgress] = useState(false);

  const enrollmentStorageKey = useMemo(() => getStorageKey(currentUser, "enrollments"), [currentUser]);
  const scholarshipStorageKey = useMemo(() => getStorageKey(currentUser, "scholarships"), [currentUser]);
  const communityStorageKey = useMemo(() => getStorageKey(currentUser, "community"), [currentUser]);
  const localStateKeys = useMemo(
    () => ({
      enrollmentStorageKey,
      scholarshipStorageKey,
      communityStorageKey,
    }),
    [communityStorageKey, enrollmentStorageKey, scholarshipStorageKey]
  );

  const applyEducationState = useCallback((nextState) => {
    const normalizedState = normalizeEducationState(nextState);
    setEnrolledCourseIds(normalizedState.enrolledCourseIds);
    setAppliedScholarships(normalizedState.appliedScholarships);
    setJoinedGroups(normalizedState.joinedGroups);
    writeEducationStateToStorage(localStateKeys, normalizedState);
    return normalizedState;
  }, [localStateKeys]);

  useEffect(() => {
    const localState = readEducationStateFromStorage(localStateKeys);
    setEnrolledCourseIds(localState.enrolledCourseIds);
    setAppliedScholarships(localState.appliedScholarships);
    setJoinedGroups(localState.joinedGroups);

    const shouldSyncFromBackend = Boolean(currentUser?.id || currentUser?.email) && typeof apiCall === "function";
    if (!shouldSyncFromBackend) {
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
        if (isMounted && localState.enrolledCourseIds.length === 0) {
          setStatusMessage("Education progress loaded locally. Account sync will resume when backend is available.");
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
  }, [apiCall, applyEducationState, currentUser?.email, currentUser?.id, localStateKeys]);

  const persistEducationState = useCallback(async (nextState, successMessage = "") => {
    const normalizedState = applyEducationState(nextState);
    const shouldSyncToBackend = Boolean(currentUser?.id || currentUser?.email) && typeof apiCall === "function";

    if (!shouldSyncToBackend) {
      if (successMessage) {
        setStatusMessage(successMessage);
      }
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
      if (successMessage) {
        setStatusMessage(`${successMessage} Saved locally; account sync pending.`);
      } else {
        setStatusMessage("Saved locally; account sync pending.");
      }
    } finally {
      setSyncInProgress(false);
    }
  }, [apiCall, applyEducationState, currentUser?.email, currentUser?.id]);

  const filteredCourses = useMemo(() => {
    const query = courseSearchQuery.toLowerCase().trim();
    return SKILL_COURSES.filter((course) =>
      course.title.toLowerCase().includes(query) ||
      course.level.toLowerCase().includes(query) ||
      course.description.toLowerCase().includes(query)
    );
  }, [courseSearchQuery]);

  const filteredScholarships = useMemo(() => {
    const query = scholarshipQuery.toLowerCase().trim();
    return SCHOLARSHIPS.filter((scholarship) =>
      scholarship.name.toLowerCase().includes(query) ||
      scholarship.eligibility.toLowerCase().includes(query)
    );
  }, [scholarshipQuery]);

  const enrolledCourses = useMemo(
    () => SKILL_COURSES.filter((course) => enrolledCourseIds.includes(course.id)),
    [enrolledCourseIds]
  );

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

  const handleTuitionBooking = () => {
    setStatusMessage(`Tuition request submitted for ${selectedSubject}. A tutor will contact you soon.`);
  };

  const handleCourseEnroll = (course) => {
    if (enrolledCourseIds.includes(course.id)) {
      setStatusMessage(`You are already enrolled in ${course.title}.`);
      return;
    }

    const nextState = {
      enrolledCourseIds: [...enrolledCourseIds, course.id],
      appliedScholarships,
      joinedGroups,
    };
    void persistEducationState(nextState, `${course.title} added to My Learning.`);
  };

  const handleScholarshipApply = (scholarshipName) => {
    if (appliedScholarships.includes(scholarshipName)) {
      setStatusMessage(`You have already applied for ${scholarshipName}.`);
      return;
    }

    const nextState = {
      enrolledCourseIds,
      appliedScholarships: [...appliedScholarships, scholarshipName],
      joinedGroups,
    };
    void persistEducationState(nextState, `Application draft created for ${scholarshipName}.`);
  };

  const handleJoinCommunityGroup = (groupTitle) => {
    if (joinedGroups.includes(groupTitle)) {
      setStatusMessage(`You are already a member of ${groupTitle}.`);
      return;
    }

    const nextState = {
      enrolledCourseIds,
      appliedScholarships,
      joinedGroups: [...joinedGroups, groupTitle],
    };
    void persistEducationState(nextState, `You have joined ${groupTitle}.`);
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
      </section>

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
          <div className="education-courses-grid">
            {filteredCourses.map((course) => (
              <div key={course.id} className="education-course-card">
                <h3>{course.title}</h3>
                <span>{course.level} | {course.duration}</span>
                <strong>{course.price}</strong>
                <p>{course.description}</p>
                <div className="education-course-actions">
                  <button type="button" className="education-secondary-button" onClick={() => viewCourseDetails(course)}>
                    View Details
                  </button>
                  <button
                    type="button"
                    className="education-primary-button"
                    data-testid={`education-enroll-${course.id}`}
                    onClick={() => handleCourseEnroll(course)}
                  >
                    {enrolledCourseIds.includes(course.id) ? "Enrolled" : "Enroll Now"}
                  </button>
                </div>
              </div>
            ))}
          </div>
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
                  {selectedCourse.syllabus.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="education-course-detail-card">
                <h3>What you will gain</h3>
                <ul>
                  {selectedCourse.outcomes.map((outcome) => (
                    <li key={outcome}>{outcome}</li>
                  ))}
                </ul>
                <p><strong>Duration:</strong> {selectedCourse.duration}</p>
                <p><strong>Level:</strong> {selectedCourse.level}</p>
                <p><strong>Price:</strong> {selectedCourse.price}</p>
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
            {GOVERNMENT_SCHEMES.map((scheme) => (
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
