import React, { useMemo, useState } from "react";
import "./SkillLearningHub.css";

const COURSE_CATEGORIES = {
  itSoftware: {
    title: "IT and Software",
    courses: [
      "Python",
      "Java",
      ".NET",
      "Angular",
      "React",
      "Node.js",
      "AI Tools",
      "Cloud",
      "Cybersecurity",
      "Testing",
      "DevOps",
    ],
  },
  gulfSkills: {
    title: "Gulf Job Skills",
    courses: [
      "HVAC",
      "Electrical",
      "Plumbing",
      "Welding",
      "Safety Training",
      "Logistics",
      "Driving Theory",
      "Nursing Assistant",
      "Hotel Management",
    ],
  },
  examPrep: {
    title: "Government Exam Prep",
    courses: ["PSC", "SSC", "UPSC", "Banking", "Railway", "Police", "Kerala Govt Exams"],
  },
  freelanceSkills: {
    title: "Freelance Skills",
    courses: [
      "Graphic Design",
      "Video Editing",
      "Digital Marketing",
      "Content Writing",
      "SEO",
      "AI Prompt Engineering",
      "Social Media Management",
    ],
  },
  businessSkills: {
    title: "Business Skills",
    courses: ["GST", "Tally", "Accounting", "Entrepreneurship", "MSME Guidance", "Startup Basics"],
  },
};

const GOVT_PORTALS = [
  { name: "SWAYAM", description: "Government certified online courses." },
  { name: "NPTEL", description: "IIT-based technical certifications." },
  { name: "Skill India Digital Hub", description: "National skill ecosystem." },
  { name: "eSkill India", description: "NSDC free and paid skill courses." },
  { name: "DIKSHA", description: "Educational learning platform." },
  { name: "National Career Service", description: "Career guidance and training." },
  { name: "KASE Kerala", description: "Kerala Academy for Skills Excellence opportunities." },
];

const TRENDING_SKILLS = [
  "AI Prompt Engineering",
  "React + Node.js",
  "Tally + GST",
  "Nursing Assistant",
  "Gulf Safety Training",
  "DevOps",
];

const DAILY_TIPS = [
  "Practice 20 MCQs daily for steady exam progress.",
  "Use project-based learning for tech skills.",
  "Record one mock interview answer daily.",
  "Update certificates immediately in Skill Wallet.",
];

const INITIAL_RECOMMENDER = {
  education: "BCom",
  interests: "Accounting, GST",
  salaryTarget: "35000",
  destination: "India",
};

const INITIAL_MOCK_TEST = {
  category: "PSC",
  totalQuestions: "20",
  timerMinutes: "30",
};

const INITIAL_INTERVIEW = {
  track: "Software Developer",
  mode: "HR + Technical",
  voicePractice: true,
};

const INITIAL_RESUME = {
  fullName: "",
  topSkill: "",
  experienceYears: "",
  targetRole: "",
};

const INITIAL_CERTIFICATE = {
  title: "",
  issuer: "",
  completedOn: "",
  credentialId: "",
};

const SkillLearningHub = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("itSoftware");
  const [courseProgress] = useState({
    "React": 48,
    "GST": 25,
    "PSC": 62,
  });
  const [watchHistory, setWatchHistory] = useState([
    { id: "vh-1", title: "React Hooks Crash Course", progress: 62, provider: "YouTube Playlist" },
    { id: "vh-2", title: "KSEB Electrical Safety Basics", progress: 31, provider: "Live Class Recording" },
  ]);
  const [mockTestForm, setMockTestForm] = useState(INITIAL_MOCK_TEST);
  const [mockTestResult, setMockTestResult] = useState(null);
  const [interviewForm, setInterviewForm] = useState(INITIAL_INTERVIEW);
  const [interviewFeedback, setInterviewFeedback] = useState("");
  const [recommenderForm, setRecommenderForm] = useState(INITIAL_RECOMMENDER);
  const [recommendations, setRecommendations] = useState([]);
  const [resumeForm, setResumeForm] = useState(INITIAL_RESUME);
  const [resumeSummary, setResumeSummary] = useState("");
  const [certificateForm, setCertificateForm] = useState(INITIAL_CERTIFICATE);
  const [skillWallet, setSkillWallet] = useState([
    {
      id: "cert-1",
      title: "Tally Prime Fundamentals",
      issuer: "eSkill India",
      completedOn: "2026-04-20",
      credentialId: "ESK-TLY-7782",
    },
  ]);

  const allCourses = useMemo(
    () =>
      Object.values(COURSE_CATEGORIES)
        .flatMap((category) => category.courses)
        .filter((course) => course.toLowerCase().includes(searchTerm.toLowerCase())),
    [searchTerm]
  );

  const selectedCategoryCourses = useMemo(
    () => COURSE_CATEGORIES[selectedCategory]?.courses || [],
    [selectedCategory]
  );

  const dashboardStats = useMemo(() => {
    const progressValues = Object.values(courseProgress);
    const avgProgress = progressValues.length
      ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
      : 0;
    return {
      continueLearning: watchHistory.length,
      recommendedCourses: allCourses.length,
      govtCertifications: GOVT_PORTALS.length,
      upcomingExams: 4,
      interviewPractice: 3,
      avgProgress,
    };
  }, [allCourses.length, courseProgress, watchHistory.length]);

  const handleMockTestStart = (event) => {
    event.preventDefault();
    const totalQuestions = Number(mockTestForm.totalQuestions || 0);
    const timerMinutes = Number(mockTestForm.timerMinutes || 0);
    if (!totalQuestions || !timerMinutes) {
      setMockTestResult({ error: "Enter valid question count and timer." });
      return;
    }

    const attempted = Math.max(1, totalQuestions - Math.floor(Math.random() * 3));
    const correct = Math.max(0, attempted - Math.floor(Math.random() * 6));
    const score = Math.round((correct / totalQuestions) * 100);
    const rank = score >= 85 ? "A" : score >= 65 ? "B" : "C";

    setMockTestResult({
      category: mockTestForm.category,
      score,
      attempted,
      correct,
      rank,
      insight:
        score >= 80
          ? "Strong prep level. Continue revision tests."
          : "Focus on weak sections and retake within 48 hours.",
    });
  };

  const handleInterviewPractice = (event) => {
    event.preventDefault();
    const feedback = `${interviewForm.track}: good structure in answers, improve concise storytelling and metrics-based examples.`;
    setInterviewFeedback(feedback);
  };

  const handleSkillRecommendation = (event) => {
    event.preventDefault();
    const destination = recommenderForm.destination.toLowerCase();
    const interests = recommenderForm.interests.toLowerCase();
    const results = [];

    if (interests.includes("account") || interests.includes("gst")) {
      results.push("Tally", "GST", "Accounting Interview Prep");
    }
    if (interests.includes("dev") || interests.includes("software") || interests.includes("react")) {
      results.push("React", "Node.js", "Cloud Fundamentals", "Coding Interview Practice");
    }
    if (destination.includes("gulf")) {
      results.push("HVAC", "Safety Training", "Logistics Basics");
    } else {
      results.push("PSC/SSC Strategy", "Business Communication");
    }
    if (Number(recommenderForm.salaryTarget || 0) >= 50000) {
      results.push("Advanced Certification Track", "Portfolio Projects");
    }

    setRecommendations(Array.from(new Set(results)).slice(0, 8));
  };

  const handleBuildResume = (event) => {
    event.preventDefault();
    if (!resumeForm.fullName.trim() || !resumeForm.topSkill.trim() || !resumeForm.targetRole.trim()) {
      setResumeSummary("Enter name, top skill, and target role.");
      return;
    }

    setResumeSummary(
      `${resumeForm.fullName} | ${resumeForm.targetRole} | Top skill: ${resumeForm.topSkill} | Experience: ${resumeForm.experienceYears || "0"} years. Resume draft generated and linked to Job + Freelancer modules.`
    );
  };

  const handleAddCertificate = (event) => {
    event.preventDefault();
    if (!certificateForm.title.trim() || !certificateForm.issuer.trim() || !certificateForm.completedOn) {
      return;
    }

    setSkillWallet((current) => [
      {
        id: `cert-${Date.now().toString().slice(-5)}`,
        ...certificateForm,
      },
      ...current,
    ]);
    setCertificateForm(INITIAL_CERTIFICATE);
  };

  const handleResumeWatching = (video) => {
    setWatchHistory((current) => [
      {
        ...video,
        id: `vh-${Date.now().toString().slice(-5)}`,
      },
      ...current,
    ].slice(0, 8));
  };

  return (
    <div className="skillhub-page">
      <section className="skillhub-hero">
        <div>
          <p className="skillhub-kicker">Nila Skill Hub</p>
          <h1>Learning Platform, Career Growth Hub and Certification Center</h1>
          <p className="skillhub-subtitle">
            Build job-ready pathways for Kerala and Gulf-focused users with courses, mock tests,
            interview prep, and government learning awareness.
          </p>
        </div>
        <div className="skillhub-hero-actions">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search skills, exams, or certifications..."
          />
          <div className="skillhub-chip-row">
            <span>Continue Learning</span>
            <span>Govt Certifications</span>
            <span>Interview Practice</span>
            <span>Daily Skill Tips</span>
          </div>
        </div>
      </section>

      <section className="skillhub-section">
        <div className="skillhub-section-header">
          <h2>Dashboard</h2>
          <p>Daily learning and career growth summary.</p>
        </div>
        <div className="skillhub-stats-grid">
          <article className="skillhub-stat-card">
            <h3>{dashboardStats.continueLearning}</h3>
            <p>Continue Learning</p>
          </article>
          <article className="skillhub-stat-card">
            <h3>{dashboardStats.recommendedCourses}</h3>
            <p>Recommended Courses</p>
          </article>
          <article className="skillhub-stat-card">
            <h3>{dashboardStats.govtCertifications}</h3>
            <p>Govt Free Certifications</p>
          </article>
          <article className="skillhub-stat-card">
            <h3>{dashboardStats.upcomingExams}</h3>
            <p>Upcoming Exams</p>
          </article>
          <article className="skillhub-stat-card">
            <h3>{dashboardStats.interviewPractice}</h3>
            <p>Interview Practice Tracks</p>
          </article>
          <article className="skillhub-stat-card">
            <h3>{dashboardStats.avgProgress}%</h3>
            <p>Average Course Progress</p>
          </article>
        </div>
      </section>

      <section className="skillhub-section">
        <div className="skillhub-section-header">
          <h2>Main Categories</h2>
          <p>From IT careers to Gulf-ready skill tracks.</p>
        </div>
        <div className="skillhub-category-tabs">
          {Object.entries(COURSE_CATEGORIES).map(([key, category]) => (
            <button
              key={key}
              type="button"
              className={selectedCategory === key ? "active" : ""}
              onClick={() => setSelectedCategory(key)}
            >
              {category.title}
            </button>
          ))}
        </div>
        <div className="skillhub-tag-grid">
          {selectedCategoryCourses.map((course) => (
            <button
              key={course}
              type="button"
              onClick={() =>
                handleResumeWatching({
                  title: `${course} Learning Playlist`,
                  progress: 5,
                  provider: "YouTube Embedded",
                })
              }
            >
              {course}
            </button>
          ))}
        </div>
      </section>

      <section className="skillhub-dual-grid">
        <article className="skillhub-panel">
          <h2>Video Learning and Watch History</h2>
          <p>Supports YouTube embeds, playlist learning, and resume watching workflow.</p>
          <ul className="skillhub-list">
            {watchHistory.map((item) => (
              <li key={item.id}>
                {item.title} | {item.provider} | Progress {item.progress}%
              </li>
            ))}
          </ul>
        </article>

        <article className="skillhub-panel">
          <h2>Daily Skill Tips and Trending Skills</h2>
          <h3>Trending</h3>
          <div className="skillhub-chip-row">
            {TRENDING_SKILLS.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
          <h3>Daily Tips</h3>
          <ul className="skillhub-list">
            {DAILY_TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="skillhub-dual-grid">
        <article className="skillhub-panel">
          <h2>Mock Tests</h2>
          <form className="skillhub-form" onSubmit={handleMockTestStart}>
            <label>
              Category
              <select
                value={mockTestForm.category}
                onChange={(event) =>
                  setMockTestForm((current) => ({ ...current, category: event.target.value }))
                }
              >
                <option value="PSC">PSC</option>
                <option value="SSC">SSC</option>
                <option value="UPSC">UPSC</option>
                <option value="Banking">Banking</option>
                <option value="Software">Software</option>
              </select>
            </label>
            <label>
              Total questions
              <input
                type="number"
                value={mockTestForm.totalQuestions}
                onChange={(event) =>
                  setMockTestForm((current) => ({
                    ...current,
                    totalQuestions: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Timer (minutes)
              <input
                type="number"
                value={mockTestForm.timerMinutes}
                onChange={(event) =>
                  setMockTestForm((current) => ({
                    ...current,
                    timerMinutes: event.target.value,
                  }))
                }
              />
            </label>
            <button type="submit">Start mock test</button>
          </form>
          {mockTestResult ? (
            <div className="skillhub-result">
              {mockTestResult.error ? (
                <p className="skillhub-error">{mockTestResult.error}</p>
              ) : (
                <>
                  <p>
                    Score: <strong>{mockTestResult.score}%</strong> | Rank: {mockTestResult.rank}
                  </p>
                  <p>
                    Attempted {mockTestResult.attempted} | Correct {mockTestResult.correct}
                  </p>
                  <p>{mockTestResult.insight}</p>
                </>
              )}
            </div>
          ) : null}
        </article>

        <article className="skillhub-panel">
          <h2>Interview Preparation</h2>
          <form className="skillhub-form" onSubmit={handleInterviewPractice}>
            <label>
              Track
              <input
                type="text"
                value={interviewForm.track}
                onChange={(event) =>
                  setInterviewForm((current) => ({ ...current, track: event.target.value }))
                }
              />
            </label>
            <label>
              Mode
              <select
                value={interviewForm.mode}
                onChange={(event) =>
                  setInterviewForm((current) => ({ ...current, mode: event.target.value }))
                }
              >
                <option value="HR + Technical">HR + Technical</option>
                <option value="HR Only">HR Only</option>
                <option value="Technical Only">Technical Only</option>
                <option value="Coding + Technical">Coding + Technical</option>
              </select>
            </label>
            <label className="skillhub-checkbox">
              <input
                type="checkbox"
                checked={interviewForm.voicePractice}
                onChange={(event) =>
                  setInterviewForm((current) => ({
                    ...current,
                    voicePractice: event.target.checked,
                  }))
                }
              />
              Voice-based practice enabled
            </label>
            <button type="submit">Run AI mock interview</button>
          </form>
          {interviewFeedback ? <p className="skillhub-status">{interviewFeedback}</p> : null}
        </article>
      </section>

      <section className="skillhub-dual-grid">
        <article className="skillhub-panel">
          <h2>AI Skill Recommender</h2>
          <form className="skillhub-form" onSubmit={handleSkillRecommendation}>
            <label>
              Education
              <input
                type="text"
                value={recommenderForm.education}
                onChange={(event) =>
                  setRecommenderForm((current) => ({ ...current, education: event.target.value }))
                }
              />
            </label>
            <label>
              Interests
              <input
                type="text"
                value={recommenderForm.interests}
                onChange={(event) =>
                  setRecommenderForm((current) => ({ ...current, interests: event.target.value }))
                }
              />
            </label>
            <label>
              Salary target
              <input
                type="number"
                value={recommenderForm.salaryTarget}
                onChange={(event) =>
                  setRecommenderForm((current) => ({ ...current, salaryTarget: event.target.value }))
                }
              />
            </label>
            <label>
              Gulf or India preference
              <select
                value={recommenderForm.destination}
                onChange={(event) =>
                  setRecommenderForm((current) => ({ ...current, destination: event.target.value }))
                }
              >
                <option value="India">India</option>
                <option value="Gulf">Gulf</option>
              </select>
            </label>
            <button type="submit">Generate career path</button>
          </form>
          {recommendations.length > 0 ? (
            <div className="skillhub-chip-row">
              {recommendations.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ) : null}
        </article>

        <article className="skillhub-panel">
          <h2>AI Resume Builder</h2>
          <form className="skillhub-form" onSubmit={handleBuildResume}>
            <label>
              Full name
              <input
                type="text"
                value={resumeForm.fullName}
                onChange={(event) =>
                  setResumeForm((current) => ({ ...current, fullName: event.target.value }))
                }
              />
            </label>
            <label>
              Top skill
              <input
                type="text"
                value={resumeForm.topSkill}
                onChange={(event) =>
                  setResumeForm((current) => ({ ...current, topSkill: event.target.value }))
                }
              />
            </label>
            <label>
              Experience years
              <input
                type="number"
                value={resumeForm.experienceYears}
                onChange={(event) =>
                  setResumeForm((current) => ({
                    ...current,
                    experienceYears: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Target role
              <input
                type="text"
                value={resumeForm.targetRole}
                onChange={(event) =>
                  setResumeForm((current) => ({ ...current, targetRole: event.target.value }))
                }
              />
            </label>
            <button type="submit">Build resume summary</button>
          </form>
          {resumeSummary ? <p className="skillhub-status">{resumeSummary}</p> : null}
        </article>
      </section>

      <section className="skillhub-dual-grid">
        <article className="skillhub-panel">
          <h2>Certification Tracking and Skill Wallet</h2>
          <form className="skillhub-form" onSubmit={handleAddCertificate}>
            <label>
              Certificate title
              <input
                type="text"
                value={certificateForm.title}
                onChange={(event) =>
                  setCertificateForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </label>
            <label>
              Issuer
              <input
                type="text"
                value={certificateForm.issuer}
                onChange={(event) =>
                  setCertificateForm((current) => ({ ...current, issuer: event.target.value }))
                }
              />
            </label>
            <label>
              Completed on
              <input
                type="date"
                value={certificateForm.completedOn}
                onChange={(event) =>
                  setCertificateForm((current) => ({
                    ...current,
                    completedOn: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Credential id
              <input
                type="text"
                value={certificateForm.credentialId}
                onChange={(event) =>
                  setCertificateForm((current) => ({
                    ...current,
                    credentialId: event.target.value,
                  }))
                }
              />
            </label>
            <button type="submit">Add certificate</button>
          </form>
          <ul className="skillhub-list">
            {skillWallet.map((item) => (
              <li key={item.id}>
                {item.title} | {item.issuer} | {item.completedOn} | {item.credentialId}
              </li>
            ))}
          </ul>
        </article>

        <article className="skillhub-panel">
          <h2>Government Free Learning Portals</h2>
          <ul className="skillhub-list">
            {GOVT_PORTALS.map((portal) => (
              <li key={portal.name}>
                <strong>{portal.name}</strong> - {portal.description}
              </li>
            ))}
          </ul>
          <p className="skillhub-note">
            Kerala focus: integrate KASE-driven training, placements, and government programs.
          </p>
        </article>
      </section>

      <section className="skillhub-section">
        <div className="skillhub-section-header">
          <h2>Ecosystem Integrations and Monetization</h2>
          <p>Learning -> earning -> placement loop inside your super app.</p>
        </div>
        <div className="skillhub-card-grid">
          <article className="skillhub-card">
            <h3>Module Integrations</h3>
            <ul>
              <li>Job Portal: learn then apply</li>
              <li>Freelancer Module: skill to income path</li>
              <li>Business Services: entrepreneurship and MSME tracks</li>
              <li>Loan Support: skill loan guidance</li>
              <li>Messaging + Reminder: mentor chats and study reminders</li>
            </ul>
          </article>
          <article className="skillhub-card">
            <h3>Revenue Model</h3>
            <ul>
              <li>Freemium: basic free + premium certifications</li>
              <li>Lead generation for institutes and coaching centers</li>
              <li>Placement commission from recruiters</li>
              <li>Sponsored and featured courses</li>
            </ul>
          </article>
          <article className="skillhub-card">
            <h3>High Value Add-ons</h3>
            <ul>
              <li>Live classes: Zoom/Meet/webinar rooms</li>
              <li>Community learning and peer doubt support</li>
              <li>Skill wallet with badges and achievements</li>
              <li>AI career path builder for Kerala + Gulf tracks</li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
};

export default SkillLearningHub;
