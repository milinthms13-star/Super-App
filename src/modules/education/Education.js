import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import "./Education.css";

const EDUCATION_SECTIONS = [
  {
    id: "tuition",
    title: "Online Tuition",
    description: "Local + online tutor marketplace for classes 1-12",
    icon: "📚",
    features: ["Subject-wise tutors", "One-to-one live classes", "Demo booking", "Progress reports"],
  },
  {
    id: "courses",
    title: "Skill Courses",
    description: "Job-oriented learning with certificates",
    icon: "🎓",
    features: ["Spoken English", "Coding", "Digital Marketing", "Placement support"],
  },
  {
    id: "community",
    title: "Student Community",
    description: "Safe moderated forums and study groups",
    icon: "👥",
    features: ["Doubt posting", "Notes sharing", "Study partners", "Daily GK"],
  },
  {
    id: "abroad",
    title: "Study Abroad",
    description: "Guidance for international education",
    icon: "✈️",
    features: ["Country selection", "College finder", "Visa support", "Education loans"],
  },
  {
    id: "scholarships",
    title: "Scholarship Finder",
    description: "Government and merit scholarships",
    icon: "🏆",
    features: ["Eligibility checker", "Deadline alerts", "Document guidance"],
  },
];

const TUITION_SUBJECTS = [
  "Mathematics", "Science", "English", "Social Studies", "Hindi", "Malayalam", "Physics", "Chemistry", "Biology"
];

const SKILL_COURSES = [
  { title: "Spoken English", level: "Beginner", duration: "3 months", price: "₹2,999" },
  { title: "Computer Basics", level: "Beginner", duration: "2 months", price: "₹1,999" },
  { title: "Coding Fundamentals", level: "Intermediate", duration: "6 months", price: "₹9,999" },
  { title: "Digital Marketing", level: "Advanced", duration: "4 months", price: "₹7,999" },
];

const SCHOLARSHIPS = [
  { name: "Kerala State Merit Scholarship", amount: "₹10,000/year", deadline: "June 30, 2026", eligibility: "Merit-based" },
  { name: "Central Government SC/ST Scholarship", amount: "₹20,000/year", deadline: "July 15, 2026", eligibility: "SC/ST students" },
  { name: "Women Education Scholarship", amount: "₹15,000/year", deadline: "August 10, 2026", eligibility: "Female students" },
];

const Education = () => {
  const { currentUser } = useApp();
  const [activeSection, setActiveSection] = useState("tuition");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("Mathematics");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [scholarshipQuery, setScholarshipQuery] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");

  const filteredScholarships = useMemo(() => {
    return SCHOLARSHIPS.filter(scholarship =>
      scholarship.name.toLowerCase().includes(scholarshipQuery.toLowerCase()) ||
      scholarship.eligibility.toLowerCase().includes(scholarshipQuery.toLowerCase())
    );
  }, [scholarshipQuery]);

  const handleAiQuery = () => {
    if (!aiQuery.trim()) return;
    // Mock AI response
    setAiResponse(`AI Study Assistant: Here's help for "${aiQuery}". This is a demo response. In a real app, this would connect to an AI service.`);
  };

  const handleTuitionBooking = (subject) => {
    alert(`Demo: Booked tuition for ${subject}. In real app, this would open booking flow.`);
  };

  const handleCourseEnroll = (course) => {
    alert(`Demo: Enrolled in ${course}. In real app, this would process payment.`);
  };

  const handleScholarshipApply = (scholarship) => {
    alert(`Demo: Applied for ${scholarship}. In real app, this would guide through application.`);
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
            <button type="button" className="education-primary-button" onClick={() => setActiveSection("tuition")}>
              Find a Tutor
            </button>
            <button type="button" className="education-secondary-button" onClick={() => setActiveSection("courses")}>
              Browse Courses
            </button>
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

      {activeSection === "tuition" && (
        <section className="education-section">
          <div className="education-section-heading">
            <h2>Online Tuition Marketplace</h2>
            <p>Find verified tutors for classes 1-12 with live classes and progress tracking.</p>
          </div>
          <div className="education-tuition-grid">
            <div className="education-filter-card">
              <label className="education-field">
                <span>Subject</span>
                <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                  {TUITION_SUBJECTS.map((subject) => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="education-primary-button" onClick={() => handleTuitionBooking(selectedSubject)}>
                Book Demo Class
              </button>
            </div>
            <div className="education-tutors-list">
              <div className="education-tutor-card">
                <strong>Ms. Priya Nair</strong>
                <span>Mathematics Expert • 8 years experience</span>
                <span>₹800/month • 4.9 ⭐ (156 reviews)</span>
                <button type="button" className="education-secondary-button">Contact Tutor</button>
              </div>
              <div className="education-tutor-card">
                <strong>Mr. Rajesh Kumar</strong>
                <span>Science Teacher • Kerala Syllabus</span>
                <span>₹750/month • 4.8 ⭐ (89 reviews)</span>
                <button type="button" className="education-secondary-button">Contact Tutor</button>
              </div>
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
          <div className="education-courses-grid">
            {SKILL_COURSES.map((course) => (
              <div key={course.title} className="education-course-card">
                <h3>{course.title}</h3>
                <span>{course.level} • {course.duration}</span>
                <strong>{course.price}</strong>
                <button type="button" className="education-primary-button" onClick={() => handleCourseEnroll(course.title)}>
                  Enroll Now
                </button>
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

      {activeSection === "abroad" && (
        <section className="education-section">
          <div className="education-section-heading">
            <h2>Study Abroad Guidance</h2>
            <p>Get expert help for international education in Canada, UK, Australia, and more.</p>
          </div>
          <div className="education-abroad-grid">
            <div className="education-country-card">
              <h3>🇨🇦 Canada</h3>
              <span>IELTS required • Education loans available</span>
              <button type="button" className="education-primary-button">Get Guidance</button>
            </div>
            <div className="education-country-card">
              <h3>🇬🇧 UK</h3>
              <span>PTE accepted • Scholarship opportunities</span>
              <button type="button" className="education-primary-button">Get Guidance</button>
            </div>
          </div>
        </section>
      )}

      {activeSection === "scholarships" && (
        <section className="education-section">
          <div className="education-section-heading">
            <h2>Scholarship Finder</h2>
            <p>Discover government and merit scholarships with eligibility checking.</p>
          </div>
          <div className="education-scholarship-search">
            <input
              type="text"
              placeholder="Search scholarships by name or eligibility..."
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