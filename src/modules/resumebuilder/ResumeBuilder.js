import React, { useState, useEffect, useMemo } from "react";
import "./ResumeBuilder.css";

const RESUME_TEMPLATES = [
  { id: "simple-ats", name: "Simple ATS Format", description: "Clean, ATS-friendly format", icon: "📄" },
  { id: "modern", name: "Modern Format", description: "Contemporary design with colors", icon: "🎨" },
  { id: "gulf", name: "Gulf Job Format", description: "Arabic-friendly, Gulf market optimized", icon: "🕌" },
  { id: "it", name: "IT Format", description: "Tech-focused with skills highlight", icon: "💻" },
  { id: "fresher", name: "Fresher Format", description: "Entry-level optimized", icon: "🌱" },
  { id: "government", name: "Government Job Format", description: "Formal, structured format", icon: "🏛️" }
];

const RESUME_TYPES = [
  { id: "professional", name: "Professional Resume", description: "Standard corporate format" },
  { id: "fresher", name: "Fresher Resume", description: "For recent graduates" },
  { id: "experienced", name: "Experienced Resume", description: "For professionals with experience" },
  { id: "gulf", name: "Gulf Job Resume", description: "GCC market optimized" },
  { id: "it", name: "IT Resume", description: "Technology focused" },
  { id: "accountant", name: "Accountant Resume", description: "Finance sector optimized" },
  { id: "driver", name: "Driver Resume", description: "Transportation sector" },
  { id: "nurse", name: "Nurse Resume", description: "Healthcare sector" },
  { id: "technician", name: "Technician Resume", description: "Technical trades" }
];

const COUNTRIES = [
  "India", "UAE", "Saudi Arabia", "Qatar", "Kuwait", "Oman", "Bahrain",
  "USA", "UK", "Canada", "Australia", "Germany", "Singapore"
];

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ml", name: "Malayalam", flag: "🇮🇳" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" }
];

const ResumeBuilder = () => {
  const [activeSection, setActiveSection] = useState("create");
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    education: "",
    experience: "",
    skills: "",
    targetJob: "",
    preferredCountry: "India",
    summary: ""
  });

  const [selectedTemplate, setSelectedTemplate] = useState("simple-ats");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [jobDescription, setJobDescription] = useState("");
  const [atsScore, setAtsScore] = useState(null);
  const [generatedResume, setGeneratedResume] = useState(null);
  const [coverLetter, setCoverLetter] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [interviewPrep, setInterviewPrep] = useState(null);

  const navigationSections = [
    { id: "create", label: "AI Resume Creation", icon: "🤖" },
    { id: "templates", label: "Resume Templates", icon: "📄" },
    { id: "ats", label: "ATS Score Checker", icon: "📊" },
    { id: "optimize", label: "Job Optimizer", icon: "🎯" },
    { id: "cover", label: "Cover Letter", icon: "✉️" },
    { id: "multilingual", label: "Multilingual", icon: "🌍" },
    { id: "interview", label: "Interview Prep", icon: "🎤" }
  ];

  const handleInputChange = (field, value) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const generateResume = async (type = "professional") => {
    setIsGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      const resume = {
        type,
        template: selectedTemplate,
        language: selectedLanguage,
        content: {
          personalInfo: userData,
          summary: `Dynamic ${type} professional with expertise in ${userData.skills}. Seeking ${userData.targetJob} position in ${userData.preferredCountry}.`,
          experience: userData.experience,
          education: userData.education,
          skills: userData.skills.split(',').map(s => s.trim()),
          generatedAt: new Date().toISOString()
        }
      };
      setGeneratedResume(resume);
      setIsGenerating(false);
    }, 2000);
  };

  const checkATSScore = () => {
    // Simulate ATS scoring
    const score = Math.floor(Math.random() * 40) + 60; // 60-100
    const feedback = {
      score,
      keywords: ["JavaScript", "React", "Node.js"],
      issues: ["Missing contact information", "Weak summary"],
      suggestions: ["Add more quantifiable achievements", "Include relevant keywords"]
    };
    setAtsScore(feedback);
  };

  const optimizeForJob = () => {
    if (!jobDescription) return;

    // Simulate job optimization
    const optimizedResume = {
      ...generatedResume,
      optimized: true,
      jobKeywords: ["leadership", "team management", "project delivery"],
      improvedSummary: `Results-driven professional with proven track record in ${jobDescription.substring(0, 50)}...`
    };
    setGeneratedResume(optimizedResume);
  };

  const generateCoverLetter = (type = "company") => {
    const letter = {
      type,
      content: `Dear Hiring Manager,

I am writing to express my interest in the ${userData.targetJob} position at your esteemed organization. With my background in ${userData.skills}, I am confident in my ability to contribute effectively to your team.

${userData.summary}

I would welcome the opportunity to discuss how my skills and experience align with your needs.

Best regards,
${userData.name}`
    };
    setCoverLetter(letter);
  };

  const generateInterviewPrep = () => {
    const prep = {
      questions: [
        "Tell me about yourself",
        "What are your strengths and weaknesses?",
        `Why do you want to work in ${userData.preferredCountry}?`,
        "Where do you see yourself in 5 years?"
      ],
      tips: [
        "Research the company thoroughly",
        "Prepare examples using STAR method",
        "Practice common technical questions",
        "Prepare questions for the interviewer"
      ],
      mockInterview: "Practice session available",
      skillCourses: ["Communication Skills", "Technical Interview Prep", "Behavioral Interview Training"]
    };
    setInterviewPrep(prep);
  };

  const downloadResume = (format = "pdf") => {
    // Simulate download
    alert(`Downloading resume as ${format.toUpperCase()}...`);
  };

  const shareResume = (method) => {
    // Simulate sharing
    alert(`Sharing resume via ${method}...`);
  };

  return (
    <div className="resume-builder-shell">
      <div className="resume-builder-hero">
        <div className="resume-builder-hero-copy">
          <h1>AI Resume Builder</h1>
          <p>Create professional resumes with AI assistance. ATS-optimized, job-specific, and ready for global opportunities.</p>
          <div className="resume-builder-hero-tags">
            <span>🤖 AI-Powered</span>
            <span>📊 ATS-Optimized</span>
            <span>🌍 Global Ready</span>
            <span>💼 Job-Specific</span>
          </div>
        </div>
        <div className="resume-builder-hero-visual">
          <div className="resume-preview-card">
            <div className="resume-header">
              <h3>{userData.name || "Your Name"}</h3>
              <p>{userData.targetJob || "Target Position"}</p>
            </div>
            <div className="resume-skills">
              {(userData.skills || "Skills will appear here").split(',').slice(0, 3).map((skill, i) => (
                <span key={i} className="skill-tag">{skill.trim()}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="resume-builder-nav">
        {navigationSections.map(section => (
          <button
            key={section.id}
            className={`resume-builder-nav-item ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => setActiveSection(section.id)}
          >
            <span>{section.icon}</span>
            <span>{section.label}</span>
          </button>
        ))}
      </div>

      <div className="resume-builder-content">
        {activeSection === "create" && (
          <div className="resume-builder-section">
            <div className="section-header">
              <h2>🤖 AI Resume Creation</h2>
              <p>Enter your details and let AI create the perfect resume for your target job</p>
            </div>

            <div className="resume-form-grid">
              <div className="form-section">
                <h3>Personal Information</h3>
                <div className="form-fields">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={userData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={userData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={userData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Location (City, Country)"
                    value={userData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Professional Details</h3>
                <div className="form-fields">
                  <textarea
                    placeholder="Education (Degree, University, Year)"
                    value={userData.education}
                    onChange={(e) => handleInputChange("education", e.target.value)}
                    rows={3}
                  />
                  <textarea
                    placeholder="Work Experience (Company, Role, Duration)"
                    value={userData.experience}
                    onChange={(e) => handleInputChange("experience", e.target.value)}
                    rows={4}
                  />
                  <input
                    type="text"
                    placeholder="Skills (comma-separated)"
                    value={userData.skills}
                    onChange={(e) => handleInputChange("skills", e.target.value)}
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Job Target</h3>
                <div className="form-fields">
                  <input
                    type="text"
                    placeholder="Target Job Title"
                    value={userData.targetJob}
                    onChange={(e) => handleInputChange("targetJob", e.target.value)}
                  />
                  <select
                    value={userData.preferredCountry}
                    onChange={(e) => handleInputChange("preferredCountry", e.target.value)}
                  >
                    {COUNTRIES.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  <textarea
                    placeholder="Professional Summary (optional)"
                    value={userData.summary}
                    onChange={(e) => handleInputChange("summary", e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="resume-types-grid">
              <h3>Choose Resume Type</h3>
              {RESUME_TYPES.map(type => (
                <button
                  key={type.id}
                  className="resume-type-card"
                  onClick={() => generateResume(type.id)}
                  disabled={isGenerating}
                >
                  <h4>{type.name}</h4>
                  <p>{type.description}</p>
                  {isGenerating ? <div className="loading-spinner">Generating...</div> : <span>✨ Generate</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeSection === "templates" && (
          <div className="resume-builder-section">
            <div className="section-header">
              <h2>📄 Resume Templates</h2>
              <p>Choose from professionally designed templates optimized for different job markets</p>
            </div>

            <div className="templates-grid">
              {RESUME_TEMPLATES.map(template => (
                <div
                  key={template.id}
                  className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <div className="template-icon">{template.icon}</div>
                  <h4>{template.name}</h4>
                  <p>{template.description}</p>
                  {selectedTemplate === template.id && <span className="selected-badge">Selected</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === "ats" && (
          <div className="resume-builder-section">
            <div className="section-header">
              <h2>📊 ATS Score Checker</h2>
              <p>Get your resume scored for ATS compatibility and optimization suggestions</p>
            </div>

            <div className="ats-checker">
              <button className="primary-button" onClick={checkATSScore}>
                Check ATS Score
              </button>

              {atsScore && (
                <div className="ats-results">
                  <div className="score-display">
                    <div className="score-circle" style={{'--score': atsScore.score}}>
                      <span className="score-number">{atsScore.score}</span>
                      <span className="score-label">ATS Score</span>
                    </div>
                  </div>

                  <div className="ats-feedback">
                    <div className="feedback-section">
                      <h4>✅ Keywords Found</h4>
                      <div className="keyword-tags">
                        {atsScore.keywords.map((keyword, i) => (
                          <span key={i} className="keyword-tag">{keyword}</span>
                        ))}
                      </div>
                    </div>

                    <div className="feedback-section">
                      <h4>⚠️ Issues Found</h4>
                      <ul>
                        {atsScore.issues.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="feedback-section">
                      <h4>💡 Suggestions</h4>
                      <ul>
                        {atsScore.suggestions.map((suggestion, i) => (
                          <li key={i}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === "optimize" && (
          <div className="resume-builder-section">
            <div className="section-header">
              <h2>🎯 Job-Based Resume Optimizer</h2>
              <p>Paste a job description to optimize your resume for that specific position</p>
            </div>

            <div className="job-optimizer">
              <textarea
                placeholder="Paste the job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={8}
              />

              <button
                className="primary-button"
                onClick={optimizeForJob}
                disabled={!jobDescription || !generatedResume}
              >
                Optimize Resume for This Job
              </button>

              {generatedResume?.optimized && (
                <div className="optimization-results">
                  <h4>✅ Resume Optimized!</h4>
                  <div className="optimized-content">
                    <h5>Added Keywords:</h5>
                    <div className="keyword-tags">
                      {generatedResume.jobKeywords.map((keyword, i) => (
                        <span key={i} className="keyword-tag">{keyword}</span>
                      ))}
                    </div>
                    <h5>Improved Summary:</h5>
                    <p>{generatedResume.improvedSummary}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === "cover" && (
          <div className="resume-builder-section">
            <div className="section-header">
              <h2>✉️ Cover Letter Generator</h2>
              <p>Generate professional cover letters for different application methods</p>
            </div>

            <div className="cover-letter-types">
              <button className="secondary-button" onClick={() => generateCoverLetter("company")}>
                Company Application
              </button>
              <button className="secondary-button" onClick={() => generateCoverLetter("gulf")}>
                Gulf Job Application
              </button>
              <button className="secondary-button" onClick={() => generateCoverLetter("email")}>
                Email Application
              </button>
              <button className="secondary-button" onClick={() => generateCoverLetter("linkedin")}>
                LinkedIn Message
              </button>
            </div>

            {coverLetter && (
              <div className="cover-letter-preview">
                <h4>{coverLetter.type} Cover Letter</h4>
                <div className="letter-content">
                  {coverLetter.content.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
                <div className="letter-actions">
                  <button className="primary-button" onClick={() => downloadResume("pdf")}>
                    Download PDF
                  </button>
                  <button className="secondary-button" onClick={() => shareResume("email")}>
                    Email to Employer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === "multilingual" && (
          <div className="resume-builder-section">
            <div className="section-header">
              <h2>🌍 Multilingual Resume</h2>
              <p>Create resumes in multiple languages for global job markets</p>
            </div>

            <div className="language-selector">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  className={`language-button ${selectedLanguage === lang.code ? 'active' : ''}`}
                  onClick={() => setSelectedLanguage(lang.code)}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </button>
              ))}
            </div>

            <div className="multilingual-features">
              <div className="feature-card">
                <h4>🇮🇳 Malayalam Support</h4>
                <p>Get guidance on Malayalam resume formatting and local job market requirements</p>
              </div>
              <div className="feature-card">
                <h4>🇸🇦 Arabic-Friendly Format</h4>
                <p>Gulf job resumes with Arabic text support and right-to-left formatting</p>
              </div>
              <div className="feature-card">
                <h4>🌍 Cultural Adaptation</h4>
                <p>AI adapts resume content for different cultural contexts and job markets</p>
              </div>
            </div>
          </div>
        )}

        {activeSection === "interview" && (
          <div className="resume-builder-section">
            <div className="section-header">
              <h2>🎤 Interview Preparation</h2>
              <p>Get ready for your dream job with AI-powered interview preparation</p>
            </div>

            <div className="interview-prep">
              <button className="primary-button" onClick={generateInterviewPrep}>
                Prepare for {userData.targetJob || "Your Target Job"}
              </button>

              {interviewPrep && (
                <div className="interview-content">
                  <div className="interview-section">
                    <h4>Common Interview Questions</h4>
                    <ul>
                      {interviewPrep.questions.map((question, i) => (
                        <li key={i}>{question}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="interview-section">
                    <h4>Preparation Tips</h4>
                    <ul>
                      {interviewPrep.tips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="interview-section">
                    <h4>Recommended Skill Courses</h4>
                    <div className="course-tags">
                      {interviewPrep.skillCourses.map((course, i) => (
                        <span key={i} className="course-tag">{course}</span>
                      ))}
                    </div>
                  </div>

                  <div className="interview-actions">
                    <button className="primary-button">
                      Start Mock Interview
                    </button>
                    <button className="secondary-button">
                      View Skill Courses
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {generatedResume && (
        <div className="resume-actions-bar">
          <div className="download-options">
            <button onClick={() => downloadResume("pdf")}>📄 PDF Download</button>
            <button onClick={() => downloadResume("word")}>📝 Word Download</button>
          </div>
          <div className="share-options">
            <button onClick={() => shareResume("whatsapp")}>📱 WhatsApp</button>
            <button onClick={() => shareResume("email")}>✉️ Email</button>
            <button onClick={() => shareResume("profile")}>💾 Save to Profile</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeBuilder;