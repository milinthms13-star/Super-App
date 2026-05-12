import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useApp } from "../../contexts/AppContext";
import "./JobPortal.css";

const JOB_CATEGORIES = {
  local: {
    name: "Local Jobs",
    icon: "🏪",
    subcategories: [
      "Shops", "Hospitals", "Hotels", "Supermarkets", "Delivery Jobs",
      "Office Staff", "Driver Jobs", "Sales Jobs", "Helper Jobs"
    ]
  },
  gulf: {
    name: "Gulf Jobs",
    icon: "✈️",
    countries: ["UAE", "Qatar", "Saudi", "Kuwait", "Oman", "Bahrain"],
    categories: [
      "Nurse", "Electrician", "Plumber", "Driver", "Accountant",
      "Civil Engineer", "Hotel Staff", "IT Professional", "Teacher"
    ]
  },
  it: {
    name: "IT Jobs",
    icon: "💻",
    types: ["Remote Jobs", "Startup Jobs", "Developer Jobs"],
    skills: [
      "UI/UX Designer", "QA Engineer", "DevOps Engineer", "AI/ML Engineer",
      "Angular Developer", ".NET Developer", "React Developer", "Node.js Developer"
    ]
  },
  gig: {
    name: "Gig Jobs",
    icon: "💼",
    types: [
      "Freelancers", "Daily Wage", "Event Workers", "Home Services",
      "Part-time Work", "Student Jobs", "Temporary Staffing"
    ]
  }
};

const SAMPLE_JOBS = [
  {
    id: 1,
    title: "Senior React Developer",
    company: "TechCorp Solutions",
    location: "Kochi, Kerala",
    type: "it",
    subtype: "Remote Jobs",
    salary: "₹8-12 LPA",
    experience: "3-5 years",
    skills: ["React", "JavaScript", "Node.js"],
    posted: "2 days ago",
    urgent: true,
    verified: true,
    description: "Looking for an experienced React developer to join our growing team...",
    benefits: ["Remote Work", "Health Insurance", "Flexible Hours"]
  },
  {
    id: 2,
    title: "Registered Nurse",
    company: "Al Zahra Hospital",
    location: "Dubai, UAE",
    type: "gulf",
    subtype: "UAE",
    salary: "AED 8,000-12,000/month",
    experience: "2+ years",
    skills: ["Nursing", "Patient Care", "Medical Records"],
    posted: "1 day ago",
    urgent: false,
    verified: true,
    description: "Excellent opportunity for nurses in Dubai with competitive salary...",
    benefits: ["Free Accommodation", "Flight Tickets", "Medical Insurance"]
  },
  {
    id: 3,
    title: "Delivery Rider",
    company: "Nila Hyperlocal",
    location: "Trivandrum, Kerala",
    type: "local",
    subtype: "Delivery Jobs",
    salary: "₹15,000-25,000/month",
    experience: "Fresher",
    skills: ["Bike Riding", "Local Area Knowledge"],
    posted: "3 hours ago",
    urgent: true,
    verified: true,
    description: "Join our delivery team and earn while helping local businesses...",
    benefits: ["Incentives", "Fuel Allowance", "Flexible Hours"]
  },
  {
    id: 4,
    title: "Freelance Graphic Designer",
    company: "Various Clients",
    location: "Remote",
    type: "gig",
    subtype: "Freelancers",
    salary: "₹500-2,000/project",
    experience: "1-3 years",
    skills: ["Photoshop", "Illustrator", "Figma"],
    posted: "1 week ago",
    urgent: false,
    verified: false,
    description: "Create stunning visuals for various clients and businesses...",
    benefits: ["Flexible Schedule", "Multiple Projects", "Portfolio Building"]
  }
];

const JobPortal = () => {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState("home");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterSalary, setFilterSalary] = useState("");
  const [filterExperience, setFilterExperience] = useState("");
  const [jobs, setJobs] = useState(SAMPLE_JOBS);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [showJobDetails, setShowJobDetails] = useState(null);
  const [showProfileBuilder, setShowProfileBuilder] = useState(false);
  const [showEmployerDashboard, setShowEmployerDashboard] = useState(false);
  const [showPostJob, setShowPostJob] = useState(false);
  const [showApplications, setShowApplications] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    resume: null,
    skills: [],
    experience: "",
    expectedSalary: "",
    languages: ["English"],
    portfolio: "",
    videoIntro: null,
    voiceResume: null,
    availability: "immediate",
    gulfReady: false
  });

  const [employerProfile, setEmployerProfile] = useState({
    companyName: "",
    industry: "",
    location: "",
    website: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
    isVerified: false
  });

  const [newJob, setNewJob] = useState({
    title: "",
    company: "",
    location: "",
    type: "",
    subtype: "",
    salary: "",
    experience: "",
    skills: "",
    description: "",
    benefits: "",
    requirements: "",
    isUrgent: false,
    isFeatured: false
  });

  const [aiAssistant, setAiAssistant] = useState({
    isOpen: false,
    messages: [
      {
        type: "bot",
        content: "Hi! I'm your AI Career Assistant. I can help you with resume optimization, interview preparation, salary negotiation, and career guidance. What would you like to know?"
      }
    ],
    currentMessage: ""
  });

  // Load data from localStorage or API
  useEffect(() => {
    const savedProfile = localStorage.getItem('jobSeekerProfile');
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
    }

    const savedEmployerProfile = localStorage.getItem('employerProfile');
    if (savedEmployerProfile) {
      setEmployerProfile(JSON.parse(savedEmployerProfile));
    }

    const savedAppliedJobs = localStorage.getItem('appliedJobs');
    if (savedAppliedJobs) {
      setAppliedJobs(JSON.parse(savedAppliedJobs));
    }

    const savedSavedJobs = localStorage.getItem('savedJobs');
    if (savedSavedJobs) {
      setSavedJobs(JSON.parse(savedSavedJobs));
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('jobSeekerProfile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('employerProfile', JSON.stringify(employerProfile));
  }, [employerProfile]);

  useEffect(() => {
    localStorage.setItem('appliedJobs', JSON.stringify(appliedJobs));
  }, [appliedJobs]);

  useEffect(() => {
    localStorage.setItem('savedJobs', JSON.stringify(savedJobs));
  }, [savedJobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = !searchQuery ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLocation = !filterLocation ||
        job.location.toLowerCase().includes(filterLocation.toLowerCase());

      const matchesSalary = !filterSalary ||
        job.salary.toLowerCase().includes(filterSalary.toLowerCase());

      const matchesExperience = !filterExperience ||
        job.experience.toLowerCase().includes(filterExperience.toLowerCase());

      return matchesSearch && matchesLocation && matchesSalary && matchesExperience;
    });
  }, [jobs, searchQuery, filterLocation, filterSalary, filterExperience]);

  const handleApplyJob = useCallback((jobId) => {
    if (!appliedJobs.includes(jobId)) {
      setAppliedJobs(prev => [...prev, jobId]);
      alert("Application submitted successfully! We'll notify you of any updates.");
    }
  }, [appliedJobs]);

  const handleSaveJob = useCallback((jobId) => {
    if (!savedJobs.includes(jobId)) {
      setSavedJobs(prev => [...prev, jobId]);
    } else {
      setSavedJobs(prev => prev.filter(id => id !== jobId));
    }
  }, [savedJobs]);

  const handleProfileUpdate = useCallback((field, value) => {
    setUserProfile(prev => ({ ...prev, [field]: value }));
  }, []);

  const calculateResumeScore = useCallback(() => {
    let score = 0;
    if (userProfile.resume) score += 20;
    if (userProfile.skills.length > 0) score += 20;
    if (userProfile.experience) score += 20;
    if (userProfile.portfolio) score += 15;
    if (userProfile.videoIntro) score += 15;
    if (userProfile.languages.length > 1) score += 10;
    return Math.min(score, 100);
  }, [userProfile]);

  const handlePostJob = useCallback(() => {
    if (!newJob.title || !newJob.company || !newJob.location) {
      alert("Please fill in all required fields");
      return;
    }

    const job = {
      ...newJob,
      id: Date.now(),
      postedBy: user?.id || 'employer',
      posted: "Just now",
      verified: employerProfile.isVerified,
      skills: newJob.skills.split(',').map(s => s.trim()),
      benefits: newJob.benefits.split(',').map(b => b.trim()),
      applicationCount: 0,
      viewCount: 0
    };

    setJobs(prev => [job, ...prev]);
    setNewJob({
      title: "",
      company: "",
      location: "",
      type: "",
      subtype: "",
      salary: "",
      experience: "",
      skills: "",
      description: "",
      benefits: "",
      requirements: "",
      isUrgent: false,
      isFeatured: false
    });
    setShowPostJob(false);
    alert("Job posted successfully!");
  }, [newJob, employerProfile.isVerified, user]);

  const handleAIAssistantMessage = useCallback(() => {
    if (!aiAssistant.currentMessage.trim()) return;

    const userMessage = {
      type: "user",
      content: aiAssistant.currentMessage
    };

    setAiAssistant(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      currentMessage: ""
    }));

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "Based on your profile, I recommend focusing on React and Node.js skills for better job opportunities.",
        "Your resume score could be improved by adding more quantifiable achievements.",
        "For Gulf jobs, consider getting IELTS certification and relevant work experience.",
        "Remote IT jobs are growing rapidly. Consider upskilling in cloud technologies like AWS or Azure.",
        "Networking is key! Connect with professionals on LinkedIn in your target industry."
      ];

      const aiResponse = {
        type: "bot",
        content: responses[Math.floor(Math.random() * responses.length)]
      };

      setAiAssistant(prev => ({
        ...prev,
        messages: [...prev.messages, aiResponse]
      }));
    }, 1000);
  }, [aiAssistant.currentMessage]);

  const renderHomeScreen = () => (
    <div className="job-portal-home">
      <div className="job-portal-hero">
        <h1>Find Your Dream Job</h1>
        <p>Local + Gulf + IT + Gig Jobs in One Place</p>
        <div className="search-section">
          <input
            type="text"
            placeholder="Search jobs, skills, companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button className="search-btn" onClick={() => setShowAIAssistant(true)}>
            🤖 AI Assistant
          </button>
        </div>
      </div>

      <div className="quick-filters">
        <button className="filter-btn active">All Jobs</button>
        <button className="filter-btn">Remote Jobs</button>
        <button className="filter-btn">Gulf Jobs</button>
        <button className="filter-btn">Urgent Hiring</button>
        <button className="filter-btn">High Salary</button>
      </div>

      <div className="job-categories-grid">
        {Object.entries(JOB_CATEGORIES).map(([key, category]) => (
          <div
            key={key}
            className="category-card"
            onClick={() => setSelectedCategory(key)}
          >
            <div className="category-icon">{category.icon}</div>
            <h3>{category.name}</h3>
            <p>{category.subcategories?.length || category.countries?.length || category.types?.length || 0} options available</p>
          </div>
        ))}
      </div>

      <div className="featured-jobs">
        <h2>Featured Jobs</h2>
        <div className="jobs-grid">
          {filteredJobs.slice(0, 6).map(job => (
            <div key={job.id} className="job-card" onClick={() => setShowJobDetails(job)}>
              <div className="job-header">
                <h4>{job.title}</h4>
                {job.verified && <span className="verified-badge">✓ Verified</span>}
                {job.urgent && <span className="urgent-badge">⚡ Urgent</span>}
              </div>
              <p className="company">{job.company}</p>
              <p className="location">📍 {job.location}</p>
              <p className="salary">💰 {job.salary}</p>
              <div className="job-actions">
                <button
                  className={`save-btn ${savedJobs.includes(job.id) ? 'saved' : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleSaveJob(job.id); }}
                >
                  {savedJobs.includes(job.id) ? '❤️ Saved' : '🤍 Save'}
                </button>
                <button
                  className={`apply-btn ${appliedJobs.includes(job.id) ? 'applied' : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleApplyJob(job.id); }}
                  disabled={appliedJobs.includes(job.id)}
                >
                  {appliedJobs.includes(job.id) ? '✅ Applied' : 'Apply Now'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCategoryView = () => {
    if (!selectedCategory) return null;

    const category = JOB_CATEGORIES[selectedCategory];
    const categoryJobs = filteredJobs.filter(job => job.type === selectedCategory);

    return (
      <div className="category-view">
        <div className="category-header">
          <button className="back-btn" onClick={() => setSelectedCategory(null)}>← Back</button>
          <h2>{category.icon} {category.name}</h2>
        </div>

        <div className="subcategories">
          {category.subcategories && (
            <div className="subcategory-grid">
              {category.subcategories.map(sub => (
                <button key={sub} className="subcategory-btn">{sub}</button>
              ))}
            </div>
          )}

          {category.countries && (
            <div className="countries-grid">
              {category.countries.map(country => (
                <button key={country} className="country-btn">🇦🇪 {country}</button>
              ))}
            </div>
          )}

          {category.types && (
            <div className="types-grid">
              {category.types.map(type => (
                <button key={type} className="type-btn">{type}</button>
              ))}
            </div>
          )}
        </div>

        <div className="category-jobs">
          <h3>Available Jobs</h3>
          <div className="jobs-list">
            {categoryJobs.map(job => (
              <div key={job.id} className="job-list-item" onClick={() => setShowJobDetails(job)}>
                <div className="job-info">
                  <h4>{job.title}</h4>
                  <p>{job.company} • {job.location}</p>
                  <p>{job.salary} • {job.experience}</p>
                </div>
                <div className="job-meta">
                  <span className="posted">{job.posted}</span>
                  {job.urgent && <span className="urgent">Urgent</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderProfileBuilder = () => (
    <div className="profile-builder">
      <div className="profile-header">
        <h2>Build Your Profile</h2>
        <div className="resume-score">
          <div className="score-circle">
            <span>{calculateResumeScore()}%</span>
          </div>
          <p>Resume Score</p>
        </div>
      </div>

      <div className="profile-form">
        <div className="form-section">
          <h3>Basic Information</h3>
          <input
            type="text"
            placeholder="Full Name"
            value={userProfile.name}
            onChange={(e) => handleProfileUpdate('name', e.target.value)}
          />
          <input
            type="email"
            placeholder="Email"
            value={userProfile.email}
            onChange={(e) => handleProfileUpdate('email', e.target.value)}
          />
          <input
            type="tel"
            placeholder="Phone"
            value={userProfile.phone}
            onChange={(e) => handleProfileUpdate('phone', e.target.value)}
          />
        </div>

        <div className="form-section">
          <h3>Resume & Documents</h3>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => handleProfileUpdate('resume', e.target.files[0])}
          />
          <input
            type="file"
            accept="video/*"
            onChange={(e) => handleProfileUpdate('videoIntro', e.target.files[0])}
          />
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => handleProfileUpdate('voiceResume', e.target.files[0])}
          />
        </div>

        <div className="form-section">
          <h3>Skills & Experience</h3>
          <input
            type="text"
            placeholder="Skills (comma separated)"
            value={userProfile.skills.join(', ')}
            onChange={(e) => handleProfileUpdate('skills', e.target.value.split(', '))}
          />
          <select
            value={userProfile.experience}
            onChange={(e) => handleProfileUpdate('experience', e.target.value)}
          >
            <option value="">Select Experience</option>
            <option value="Fresher">Fresher</option>
            <option value="0-1 years">0-1 years</option>
            <option value="1-3 years">1-3 years</option>
            <option value="3-5 years">3-5 years</option>
            <option value="5+ years">5+ years</option>
          </select>
          <input
            type="text"
            placeholder="Expected Salary"
            value={userProfile.expectedSalary}
            onChange={(e) => handleProfileUpdate('expectedSalary', e.target.value)}
          />
        </div>

        <div className="form-section">
          <h3>Availability</h3>
          <select
            value={userProfile.availability}
            onChange={(e) => handleProfileUpdate('availability', e.target.value)}
          >
            <option value="immediate">Immediate Joiner</option>
            <option value="part-time">Part-time Only</option>
            <option value="remote">Remote Only</option>
            <option value="gulf-ready">Gulf Ready</option>
          </select>
          <label>
            <input
              type="checkbox"
              checked={userProfile.gulfReady}
              onChange={(e) => handleProfileUpdate('gulfReady', e.target.checked)}
            />
            Ready for Gulf Jobs
          </label>
        </div>

        <button className="save-profile-btn">Save Profile</button>
      </div>
    </div>
  );

  const renderJobDetails = () => {
    if (!showJobDetails) return null;

    const job = showJobDetails;
    return (
      <div className="job-details-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h2>{job.title}</h2>
            <button className="close-btn" onClick={() => setShowJobDetails(null)}>×</button>
          </div>

          <div className="job-details-content">
            <div className="job-meta">
              <p className="company">🏢 {job.company}</p>
              <p className="location">📍 {job.location}</p>
              <p className="salary">💰 {job.salary}</p>
              <p className="experience">👨‍💼 {job.experience}</p>
            </div>

            <div className="job-description">
              <h3>Job Description</h3>
              <p>{job.description}</p>
            </div>

            <div className="job-requirements">
              <h3>Requirements</h3>
              <div className="skills-list">
                {job.skills.map(skill => (
                  <span key={skill} className="skill-tag">{skill}</span>
                ))}
              </div>
            </div>

            <div className="job-benefits">
              <h3>Benefits</h3>
              <ul>
                {job.benefits.map(benefit => (
                  <li key={benefit}>{benefit}</li>
                ))}
              </ul>
            </div>

            <div className="job-actions">
              <button
                className={`apply-btn ${appliedJobs.includes(job.id) ? 'applied' : ''}`}
                onClick={() => handleApplyJob(job.id)}
                disabled={appliedJobs.includes(job.id)}
              >
                {appliedJobs.includes(job.id) ? '✅ Applied' : '🚀 Apply Now'}
              </button>
              <button
                className={`save-btn ${savedJobs.includes(job.id) ? 'saved' : ''}`}
                onClick={() => handleSaveJob(job.id)}
              >
                {savedJobs.includes(job.id) ? '❤️ Saved' : '🤍 Save Job'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEmployerDashboard = () => (
    <div className="employer-dashboard">
      <div className="dashboard-header">
        <h2>Employer Dashboard</h2>
        <button className="post-job-btn" onClick={() => setShowPostJob(true)}>+ Post New Job</button>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>{jobs.filter(job => job.postedBy === (user?.id || 'employer')).length}</h3>
          <p>Active Jobs</p>
        </div>
        <div className="stat-card">
          <h3>{appliedJobs.length * 3}</h3>
          <p>Total Applications</p>
        </div>
        <div className="stat-card">
          <h3>{Math.floor(appliedJobs.length * 0.3)}</h3>
          <p>Shortlisted</p>
        </div>
        <div className="stat-card">
          <h3>{Math.floor(appliedJobs.length * 0.1)}</h3>
          <p>Hired</p>
        </div>
      </div>

      <div className="posted-jobs">
        <h3>Your Posted Jobs</h3>
        <div className="jobs-table">
          {jobs.filter(job => job.postedBy === (user?.id || 'employer')).slice(0, 3).map(job => (
            <div key={job.id} className="job-row">
              <div className="job-info">
                <h4>{job.title}</h4>
                <p>{job.location} • {job.applicationCount || Math.floor(Math.random() * 20)} applications</p>
              </div>
              <div className="job-status">
                <span className="status active">Active</span>
              </div>
              <div className="job-actions">
                <button className="view-btn">View</button>
                <button className="edit-btn">Edit</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPostJob = () => (
    <div className="profile-builder">
      <div className="profile-header">
        <h2>Post New Job</h2>
      </div>

      <div className="profile-form">
        <div className="form-section">
          <h3>Job Details</h3>
          <input
            type="text"
            placeholder="Job Title"
            value={newJob.title}
            onChange={(e) => setNewJob(prev => ({ ...prev, title: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Company Name"
            value={newJob.company}
            onChange={(e) => setNewJob(prev => ({ ...prev, company: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Location"
            value={newJob.location}
            onChange={(e) => setNewJob(prev => ({ ...prev, location: e.target.value }))}
          />
          <select
            value={newJob.type}
            onChange={(e) => setNewJob(prev => ({ ...prev, type: e.target.value }))}
          >
            <option value="">Select Job Type</option>
            <option value="local">Local Jobs</option>
            <option value="gulf">Gulf Jobs</option>
            <option value="it">IT Jobs</option>
            <option value="gig">Gig Jobs</option>
          </select>
          <input
            type="text"
            placeholder="Subtype (e.g., Remote Jobs, UAE, etc.)"
            value={newJob.subtype}
            onChange={(e) => setNewJob(prev => ({ ...prev, subtype: e.target.value }))}
          />
        </div>

        <div className="form-section">
          <h3>Compensation & Requirements</h3>
          <input
            type="text"
            placeholder="Salary Range"
            value={newJob.salary}
            onChange={(e) => setNewJob(prev => ({ ...prev, salary: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Experience Required"
            value={newJob.experience}
            onChange={(e) => setNewJob(prev => ({ ...prev, experience: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Required Skills (comma separated)"
            value={newJob.skills}
            onChange={(e) => setNewJob(prev => ({ ...prev, skills: e.target.value }))}
          />
        </div>

        <div className="form-section">
          <h3>Job Description & Benefits</h3>
          <textarea
            placeholder="Job Description"
            value={newJob.description}
            onChange={(e) => setNewJob(prev => ({ ...prev, description: e.target.value }))}
            rows="4"
          />
          <input
            type="text"
            placeholder="Benefits (comma separated)"
            value={newJob.benefits}
            onChange={(e) => setNewJob(prev => ({ ...prev, benefits: e.target.value }))}
          />
        </div>

        <div className="form-section">
          <h3>Additional Options</h3>
          <label>
            <input
              type="checkbox"
              checked={newJob.isUrgent}
              onChange={(e) => setNewJob(prev => ({ ...prev, isUrgent: e.target.checked }))}
            />
            Mark as Urgent Hiring
          </label>
          <label>
            <input
              type="checkbox"
              checked={newJob.isFeatured}
              onChange={(e) => setNewJob(prev => ({ ...prev, isFeatured: e.target.checked }))}
            />
            Featured Job Listing
          </label>
        </div>

        <div className="job-actions">
          <button className="save-profile-btn" onClick={handlePostJob}>Post Job</button>
          <button className="save-profile-btn" onClick={() => setShowPostJob(false)} style={{ background: '#666' }}>Cancel</button>
        </div>
      </div>
    </div>
  );

  const renderAIAssistant = () => (
    <div className="job-details-modal">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>🤖 AI Career Assistant</h2>
          <button className="close-btn" onClick={() => setShowAIAssistant(false)}>×</button>
        </div>

        <div className="ai-chat-messages" style={{ maxHeight: '400px', overflowY: 'auto', padding: '1rem' }}>
          {aiAssistant.messages.map((msg, index) => (
            <div key={index} className={`ai-message ${msg.type}`} style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              borderRadius: '10px',
              background: msg.type === 'bot' ? '#f0f0f0' : '#667eea',
              color: msg.type === 'bot' ? '#333' : 'white',
              textAlign: msg.type === 'bot' ? 'left' : 'right'
            }}>
              {msg.content}
            </div>
          ))}
        </div>

        <div className="ai-chat-input" style={{ padding: '1rem', borderTop: '1px solid #e9ecef' }}>
          <input
            type="text"
            placeholder="Ask me anything about your career..."
            value={aiAssistant.currentMessage}
            onChange={(e) => setAiAssistant(prev => ({ ...prev, currentMessage: e.target.value }))}
            onKeyPress={(e) => e.key === 'Enter' && handleAIAssistantMessage()}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '25px',
              marginRight: '0.5rem'
            }}
          />
          <button
            onClick={handleAIAssistantMessage}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              cursor: 'pointer'
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="job-portal-shell">
      <div className="job-portal-nav">
        <button
          className={`nav-tab ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => { setActiveTab('home'); setSelectedCategory(null); setShowProfileBuilder(false); setShowEmployerDashboard(false); setShowPostJob(false); }}
        >
          🏠 Home
        </button>
        <button
          className={`nav-tab ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => { setActiveTab('jobs'); setSelectedCategory(null); setShowProfileBuilder(false); setShowEmployerDashboard(false); setShowPostJob(false); }}
        >
          💼 Jobs
        </button>
        <button
          className={`nav-tab ${activeTab === 'applications' ? 'active' : ''}`}
          onClick={() => { setActiveTab('applications'); setShowProfileBuilder(false); setShowEmployerDashboard(false); setShowPostJob(false); }}
        >
          📋 Applications
        </button>
        <button
          className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => { setActiveTab('profile'); setShowProfileBuilder(true); setShowEmployerDashboard(false); setShowPostJob(false); }}
        >
          👤 Profile
        </button>
        <button
          className={`nav-tab ${activeTab === 'employer' ? 'active' : ''}`}
          onClick={() => { setActiveTab('employer'); setShowEmployerDashboard(true); setShowProfileBuilder(false); setShowPostJob(false); }}
        >
          🏢 Employer
        </button>
      </div>

      <div className="job-portal-content">
        {activeTab === 'home' && !selectedCategory && !showProfileBuilder && !showEmployerDashboard && !showPostJob && renderHomeScreen()}
        {selectedCategory && renderCategoryView()}
        {showProfileBuilder && renderProfileBuilder()}
        {showEmployerDashboard && renderEmployerDashboard()}
        {showPostJob && renderPostJob()}
      </div>

      {showJobDetails && renderJobDetails()}
      {showAIAssistant && renderAIAssistant()}
    </div>
  );
};

export default JobPortal;
