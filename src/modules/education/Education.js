import React, { useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import "./Education.css";

const EDUCATION_SECTIONS = [
  {
    id: "home",
    title: "Overview",
    description: "Get a quick overview of tuition, courses, community and support",
    icon: "🏠",
  },
  {
    id: "courses",
    title: "Courses",
    description: "Browse skill courses, filter by level, view details and enroll",
    icon: "🎓",
  },
  {
    id: "my-learning",
    title: "My Learning",
    description: "Continue your enrolled courses and revisit progress",
    icon: "📘",
  },
  {
    id: "community",
    title: "Community",
    description: "Study groups, doubt boards and student discussions",
    icon: "👥",
  },
  {
    id: "career",
    title: "Career",
    description: "Resume help, interview prep and job pathways",
    icon: "💼",
  },
  {
    id: "government",
    title: "Government",
    description: "Scholarships, schemes and government support",
    icon: "🏛️",
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
    price: "₹2,999",
    description: "Build confidence, fluency and spoken skills for school, college, and interviews.",
    syllabus: ["Everyday conversation", "Pronunciation practice", "Grammar basics", "Mock speaking tests"],
    outcomes: ["Improved confidence", "Interview readiness", "Better classroom performance"],
  },
  {
    id: "computer-basics",
    title: "Computer Basics",
    level: "Beginner",
    duration: "2 months",
    price: "₹1,999",
    description: "Learn essential computer skills, MS Office, email, and internet basics for students.",
    syllabus: ["PC fundamentals", "Word processing", "Spreadsheets", "Email and internet safety"],
    outcomes: ["Basic office skills", "Online learning readiness", "Homework productivity"],
  },
  {
    id: "coding-fundamentals",
    title: "Coding Fundamentals",
    level: "Intermediate",
    duration: "6 months",
    price: "₹9,999",
    description: "Understand programming logic, Python basics and problem solving for future careers.",
    syllabus: ["Variables and flow control", "Functions", "Data structures", "Project building"],
    outcomes: ["Coding confidence", "Problem solving", "Portfolio project"],
  },
  {
    id: "digital-marketing",
    title: "Digital Marketing",
    level: "Advanced",
    duration: "4 months",
    price: "₹7,999",
    description: "Master digital marketing fundamentals including social media, ads and content strategy.",
    syllabus: ["Social media marketing", "Search marketing", "Content planning", "Campaign analytics"],
    outcomes: ["Digital marketing skills", "Portfolio-ready campaigns", "Job preparation"],
  },
];

const SCHOLARSHIPS = [
  {
    name: "Kerala State Merit Scholarship",
    amount: "₹10,000/year",
    deadline: "June 30, 2026",
    eligibility: "Merit-based",
  },
  {
    name: "Central Government SC/ST Scholarship",
    amount: "₹20,000/year",
    deadline: "July 15, 2026",
    eligibility: "SC/ST students",
  },
  {
    name: "Women Education Scholarship",
    amount: "₹15,000/year",
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
    description: "23 active discussions • Moderated",
    action: "Join Discussion",
  },
  {
    title: "SSLC Exam Preparation",
    description: "156 members • Study partners available",
    action: "Join Group",
  },
  {
    title: "Spoken English Practice",
    description: "100 members • Live practice sessions",
    action: "Join Session",
  },
];

const CAREER_RESOURCES = [
  {
    title: "Resume & Interview Coaching",
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

const Education = () => {
  const { currentUser } = useApp();
  const [activeSection, setActiveSection] = useState("home");
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("Mathematics");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [scholarshipQuery, setScholarshipQuery] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");

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

  const handleAiQuery = () => {
    if (!aiQuery.trim()) return;
    setAiResponse(
      `AI Study Assistant: Here's help for "${aiQuery}". This is a demo response. In a real app, this would connect to an AI service.`
    );
  };

  const handleTuitionBooking = (subject) => {
    alert(`Demo: Booked tuition for ${subject}. In real app, this would open booking flow.`);
  };

  const handleCourseEnroll = (courseTitle) => {
    alert(`Demo: Enrolled in ${courseTitle}. In real app, this would process payment and create learning access.`);
  };

  const handleScholarshipApply = (scholarshipName) => {
    alert(`Demo: Applied for ${scholarshipName}. In real app, this would guide through the application process.`);
  };

  return (
    <div className="education-shell">
      <section className="education-hero">
        <div className="education-hero-copy">
          <h1>Education Ecosystem — tuition, skills, scholarships, study abroad, and student support in one place.</h1>
          <p>
            Connect students, parents, tutors, and institutes in a comprehensive learning platform with AI assistance and community features.
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
            <p>Find the right tuition, skill course, career guidance, community support, or government scholarship from one hub.</p>
          </div>
          <div className="education-home-grid">
            <div className="education-course-card">
              <h3>Start with Skill Courses</h3>
              <p>Choose from beginner to advanced programs that are built for employability.</p>
              <button type="button" className="education-primary-button" onClick={() => setActiveSection("courses")}>Browse Courses</button>
            </div>
            <div className="education-course-card">
              <h3>Prepare for Government Support</h3>
              <p>Search scholarships, loan assistance and education grants for students.</p>
              <button type="button" className="education-secondary-button" onClick={() => setActiveSection("government")}>View Support</button>
            </div>
            <div className="education-course-card">
              <h3>Join the Community</h3>
              <p>Get help in doubt forums, study groups and peer sessions.</p>
              <button type="button" className="education-secondary-button" onClick={() => setActiveSection("community")}>Join Community</button>
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
            <label className="education-field">
              <span>Search courses</span>
              <input
                type="text"
                placeholder="Search by course name, level, or topic"
                value={courseSearchQuery}
                onChange={(e) => setCourseSearchQuery(e.target.value)}
              />
            </label>
          </div>
          <div className="education-courses-grid">
            {filteredCourses.map((course) => (
              <div key={course.id} className="education-course-card">
                <h3>{course.title}</h3>
                <span>{course.level} • {course.duration}</span>
                <strong>{course.price}</strong>
                <p>{course.description}</p>
                <div className="education-course-actions">
                  <button
                    type="button"
                    className="education-secondary-button"
                    onClick={() => {
                      setSelectedCourse(course);
                      setActiveSection("course-detail");
                    }}
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    className="education-primary-button"
                    onClick={() => handleCourseEnroll(course.title)}
                  >
                    Enroll Now
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
            <div className="education-forum-card">
              <h3>Class 10 Mathematics Doubts</h3>
              <span>23 active discussions • Moderated</span>
              <button type="button" className="education-secondary-button">Join Discussion</button>
            </div>
            <div className="education-forum-card">
              <h3>SSLC Exam Preparation</h3>
              <span>156 members • Study partners available</span>
              <button type="button" className="education-secondary-button">Join Group</button>
            </div>
          </div>
        </section>
      )}

      {activeSection === "my-learning" && (
        <section className="education-section">
          <div className="education-section-heading">
            <h2>My Learning</h2>
            <p>Access your enrolled courses, progress, and upcoming lessons.</p>
          </div>
          <div className="education-courses-grid">
            {SKILL_COURSES.map((course) => (
              <div key={course.id} className="education-course-card">
                <h3>{course.title}</h3>
                <span>{course.level} • {course.duration}</span>
                <strong>{course.price}</strong>
                <div className="education-course-actions">
                  <button
                    type="button"
                    className="education-secondary-button"
                    onClick={() => {
                      setSelectedCourse(course);
                      setActiveSection("course-detail");
                    }}
                  >
                    View Course
                  </button>
                  <button
                    type="button"
                    className="education-primary-button"
                    onClick={() => alert(`Continue learning ${course.title}.`)}
                  >
                    Continue Learning
                  </button>
                </div>
              </div>
            ))}
          </div>
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
                <h3>What you'll gain</h3>
                <ul>
                  {selectedCourse.outcomes.map((outcome) => (
                    <li key={outcome}>{outcome}</li>
                  ))}
                </ul>
                <p><strong>Duration:</strong> {selectedCourse.duration}</p>
                <p><strong>Level:</strong> {selectedCourse.level}</p>
                <p><strong>Price:</strong> {selectedCourse.price}</p>
                <div className="education-course-actions">
                  <button
                    type="button"
                    className="education-secondary-button"
                    onClick={() => setActiveSection("courses")}
                  >
                    Back to Courses
                  </button>
                  <button
                    type="button"
                    className="education-primary-button"
                    onClick={() => handleCourseEnroll(selectedCourse.title)}
                  >
                    Enroll in Course
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="education-course-detail-card">
              <p>Select a course to see its details.</p>
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
                <button type="button" className="education-primary-button">{resource.action}</button>
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
            <input
              type="text"
              placeholder="Search scholarships or schemes..."
              value={scholarshipQuery}
              onChange={(e) => setScholarshipQuery(e.target.value)}
            />
          </div>
          <div className="education-scholarships-list">
            {filteredScholarships.map((scholarship) => (
              <div key={scholarship.name} className="education-scholarship-card">
                <h3>{scholarship.name}</h3>
                <span>Amount: {scholarship.amount}</span>
                <span>Deadline: {scholarship.deadline}</span>
                <span>Eligibility: {scholarship.eligibility}</span>
                <button type="button" className="education-primary-button" onClick={() => handleScholarshipApply(scholarship.name)}>
                  Apply Now
                </button>
              </div>
            ))}
          </div>
          <div className="education-government-grid">
            {GOVERNMENT_SCHEMES.map((scheme) => (
              <div key={scheme.title} className="education-course-card">
                <h3>{scheme.title}</h3>
                <p>{scheme.summary}</p>
                <button type="button" className="education-secondary-button">Learn More</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="education-ai-assistant">
        <div className="education-section-heading">
          <h2>AI Study Assistant</h2>
          <p>Ask doubts, get explanations, generate notes, and create study plans.</p>
        </div>
        <div className="education-ai-chat">
          <input
            type="text"
            placeholder="Ask me anything about your studies..."
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
          />
          <button type="button" onClick={handleAiQuery}>Ask AI</button>
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
            <span>Mock tests • Study materials</span>
            <button type="button" className="education-secondary-button">Start Prep</button>
          </div>
          <div className="education-exam-card">
            <h3>NEET/JEE Support</h3>
            <span>Basic concepts • Practice questions</span>
            <button type="button" className="education-secondary-button">Start Prep</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Education;