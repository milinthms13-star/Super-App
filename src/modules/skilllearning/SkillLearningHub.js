import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import { API_BASE_URL } from "../../utils/api";
import "./SkillLearningHub.css";

const COURSE_CATEGORIES = [
  { id: 'gulf-ready', title: 'Gulf Ready', description: 'Courses designed for Gulf job readiness and visa-linked skills.' },
  { id: 'kerala-career', title: 'Kerala Career', description: 'Regional career pathways for Kerala placements and freelance work.' },
  { id: 'it-software', title: 'IT & Software', description: 'Job-ready software, cloud and development tracks.' },
  { id: 'hospitality', title: 'Hospitality', description: 'Hotel, travel and service industry learning.' },
  { id: 'government-exams', title: 'Government Exams', description: 'PSC, SSC, banking and state career exam prep.' },
];

const GOVT_PORTALS = [
  { name: 'SWAYAM', description: 'India’s national online learning platform for certified courses.', url: 'https://swayam.gov.in', eligibility: 'All learners', status: 'Free / Paid', certificateValue: 'National certification, widely accepted' },
  { name: 'NPTEL', description: 'Technical and skill certification from top Indian institutes.', url: 'https://onlinecourses.nptel.ac.in', eligibility: 'Graduates / Professionals', status: 'Free / Paid', certificateValue: 'IIT certification, ideal for engineers' },
  { name: 'Skill India', description: 'NSDC-backed vocational training and placement support.', url: 'https://skillindia.gov.in', eligibility: 'Any Indian citizen', status: 'Free / Paid', certificateValue: 'Government-recognized vocational certificate' },
  { name: 'KASE', description: 'Kerala Academy for Skills Excellence for state skill development.', url: 'https://kase.in', eligibility: 'Kerala residents', status: 'Free / Paid', certificateValue: 'Kerala government endorsed certification' },
  { name: 'NCS', description: 'National Career Service for job matching and course recommendations.', url: 'https://www.ncs.gov.in', eligibility: 'Job seekers', status: 'Free', certificateValue: 'Job matching & government support' },
];

const TRENDING_SKILLS = [
  'AI Prompt Engineering',
  'React + Node.js',
  'Tally + GST',
  'Nursing Assistant',
  'Gulf Safety Training',
  'DevOps',
];

const DAILY_TIPS = [
  'Practice 20 MCQs daily for steady exam progress.',
  'Use project-based learning for tech skills.',
  'Record one mock interview answer daily.',
  'Update certificates immediately in Skill Wallet.',
];

const DEFAULT_FILTERS = {
  query: '',
  category: '',
  level: '',
  language: '',
  region: '',
  isFree: '',
  certificateAvailable: '',
  jobLinked: '',
};

const INITIAL_MOCK_TEST = {
  category: 'Gulf Ready',
  totalQuestions: '10',
  timerMinutes: '30',
};

const INITIAL_INTERVIEW = {
  track: 'Software Developer',
  mode: 'HR + Technical',
  voicePractice: true,
};

const INITIAL_RESUME = {
  fullName: '',
  topSkill: '',
  experienceYears: '0',
  targetRole: '',
};

const INITIAL_CERTIFICATE = {
  title: '',
  issuer: '',
  completedOn: '',
  credentialId: '',
};

const BASE_API_PATH = `${API_BASE_URL}/appdata/skilllearning`;

const SkillLearningHub = () => {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [categories, setCategories] = useState(COURSE_CATEGORIES);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseDetailLoading, setCourseDetailLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({ continueLearning: 0, recommendedCourses: 0, govtCertifications: 0, upcomingExams: 0, interviewPractice: 0, avgProgress: 0 });
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [watchHistory, setWatchHistory] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [mockTestForm, setMockTestForm] = useState(INITIAL_MOCK_TEST);
  const [mockTestResult, setMockTestResult] = useState(null);
  const [testNotification, setTestNotification] = useState('');
  const [interviewForm, setInterviewForm] = useState(INITIAL_INTERVIEW);
  const [interviewFeedback, setInterviewFeedback] = useState('');
  const [recommenderForm, setRecommenderForm] = useState({ education: 'BCom', interests: 'Accounting, GST', salaryTarget: '35000', destination: 'India' });
  const [recommendations, setRecommendations] = useState([]);
  const [resumeForm, setResumeForm] = useState(INITIAL_RESUME);
  const [resumeSummary, setResumeSummary] = useState('');
  const [certificateForm, setCertificateForm] = useState(INITIAL_CERTIFICATE);
  const [skillWallet, setSkillWallet] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [govtPortals, setGovtPortals] = useState(GOVT_PORTALS);
  const [uploading, setUploading] = useState(false);
  const [certificateFile, setCertificateFile] = useState(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [courseFiltersOpen, setCourseFiltersOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('gulf-ready');

  const fetchCourses = async () => {
    setCourseLoading(true);
    try {
      const params = {
        query: filters.query || undefined,
        category: filters.category || undefined,
        level: filters.level || undefined,
        language: filters.language || undefined,
        region: filters.region || undefined,
        isFree: filters.isFree || undefined,
        certificateAvailable: filters.certificateAvailable || undefined,
        jobLinked: filters.jobLinked || undefined,
      };
      const response = await axios.get(`${BASE_API_PATH}/courses`, { params });
      const responseData = response?.data?.data || {};
      setCourses(responseData.courses || []);
      setCategories(responseData.categories || COURSE_CATEGORIES);
      if (!selectedCourseId && Array.isArray(responseData.courses) && responseData.courses.length) {
        setSelectedCourseId(responseData.courses[0].id);
      }
    } catch (error) {
      console.error('Failed to load courses', error);
    } finally {
      setCourseLoading(false);
    }
  };

  const fetchCourseDetail = async (courseId) => {
    if (!courseId) return;
    setCourseDetailLoading(true);
    try {
      const response = await axios.get(`${BASE_API_PATH}/courses/${encodeURIComponent(courseId)}`);
      setSelectedCourse(response?.data?.data?.course || null);
    } catch (error) {
      console.error('Failed to load course detail', error);
      setSelectedCourse(null);
    } finally {
      setCourseDetailLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${BASE_API_PATH}/dashboard`);
      const data = response?.data?.data || {};
      setDashboardStats(data.dashboardStats || dashboardStats);
      setEnrolledCourses(data.enrolled || []);
      setWatchHistory(data.recent || []);
    } catch (error) {
      console.error('Failed to load dashboard', error);
    }
  };

  const fetchCertificates = async () => {
    try {
      const response = await axios.get(`${BASE_API_PATH}/certificates`);
      setCertificates(response?.data?.data?.certificates || []);
      setGovtPortals(response?.data?.data?.govtPortals || GOVT_PORTALS);
    } catch (error) {
      console.error('Failed to load certificates', error);
    }
  };

  const fetchWallet = async () => {
    try {
      const response = await axios.get(`${BASE_API_PATH}/wallet`);
      setSkillWallet(response?.data?.data?.certificates || []);
    } catch (error) {
      console.error('Failed to load wallet', error);
    }
  };

  const fetchQuestions = async (category) => {
    try {
      const response = await axios.get(`${BASE_API_PATH}/questions`, {
        params: { category: category || mockTestForm.category },
      });
      setQuestions(response?.data?.data?.questions || []);
    } catch (error) {
      console.error('Failed to load question bank', error);
      setQuestions([]);
    }
  };

  useEffect(() => {
    void fetchCourses();
    void fetchDashboard();
    void fetchCertificates();
    void fetchWallet();
  }, []);

  useEffect(() => {
    void fetchCourses();
  }, [filters]);

  useEffect(() => {
    if (selectedCourseId) {
      void fetchCourseDetail(selectedCourseId);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    void fetchQuestions(mockTestForm.category);
  }, [mockTestForm.category]);

  const selectedCategoryMeta = categories.find((category) => category.id === selectedCategory) || categories[0] || COURSE_CATEGORIES[0];

  const filteredCourses = useMemo(() => {
    if (!filters.query) return courses;
    const term = filters.query.toLowerCase();
    return courses.filter((course) => {
      const searchable = [course.title, course.description, (course.tags || []).join(' '), course.category].join(' ').toLowerCase();
      return searchable.includes(term);
    });
  }, [courses, filters.query]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({ ...current, [key]: current[key] === value ? '' : value }));
  };

  const handleEnroll = async (courseId) => {
    if (!courseId) return;
    setIsEnrolling(true);
    try {
      await axios.post(`${BASE_API_PATH}/course-enroll`, { courseId });
      await fetchDashboard();
    } catch (error) {
      console.error('Enrollment failed', error);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleMockTestSubmit = async (event) => {
    event.preventDefault();
    const answers = questions.map((question) => ({ id: question.id, selectedIndex: selectedAnswers[question.id] }));
    try {
      const response = await axios.post(`${BASE_API_PATH}/tests/submit`, {
        category: mockTestForm.category,
        answers,
      });
      setMockTestResult(response.data.data.result);
      setTestNotification(response.data.data.insight || 'Mock test completed.');
    } catch (error) {
      console.error('Test submit failed', error);
      setTestNotification('Unable to submit test. Please try again.');
    }
  };

  const handleAnswerSelect = (questionId, optionIndex) => {
    setSelectedAnswers((current) => ({ ...current, [questionId]: optionIndex }));
  };

  const handleCertificateUpload = async (event) => {
    event.preventDefault();
    if (!certificateForm.title || !certificateForm.completedOn) {
      return;
    }

    const formData = new FormData();
    formData.append('title', certificateForm.title);
    formData.append('issuer', certificateForm.issuer);
    formData.append('completedOn', certificateForm.completedOn);
    formData.append('credentialId', certificateForm.credentialId);
    if (certificateFile) {
      formData.append('certificateFile', certificateFile);
    }

    setUploading(true);
    try {
      await axios.post(`${BASE_API_PATH}/certificates/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCertificateForm(INITIAL_CERTIFICATE);
      setCertificateFile(null);
      await fetchCertificates();
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setUploading(false);
    }
  };

  const handleBuildResume = (event) => {
    event.preventDefault();
    if (!resumeForm.fullName || !resumeForm.topSkill || !resumeForm.targetRole) {
      setResumeSummary('Please fill in the required fields to build a download-ready resume.');
      return;
    }
    setResumeSummary(
      `${resumeForm.fullName} is a ${resumeForm.experienceYears}-year experienced professional targeting ${resumeForm.targetRole} with strength in ${resumeForm.topSkill}. Resume ready for ATS and job portal export.`
    );
  };

  const handleDownloadResume = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFontSize(22);
    doc.text(resumeForm.fullName || 'Resume', 40, 60);
    doc.setFontSize(12);
    doc.text(`Target Role: ${resumeForm.targetRole}`, 40, 90);
    doc.text(`Top Skill: ${resumeForm.topSkill}`, 40, 110);
    doc.text(`Experience: ${resumeForm.experienceYears} years`, 40, 130);
    doc.text('Summary:', 40, 170);
    doc.text(resumeSummary || 'A highly motivated candidate with career-focused skills and training.', 40, 190, { maxWidth: 520 });
    doc.save(`${resumeForm.fullName || 'resume'}.pdf`);
  };

  const categoryTabs = categories.length ? categories : COURSE_CATEGORIES;
  const selectedCategoryCourses = filteredCourses.filter((course) => course.category === selectedCategoryMeta.id);

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
            placeholder="Search courses, skills, or topics..."
            value={filters.query}
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
          />
          <div className="skillhub-chip-row">
            <span>{dashboardStats.continueLearning} active tracks</span>
            <span>{dashboardStats.govtCertifications} government portals</span>
            <span>{dashboardStats.upcomingExams} mock tracks</span>
            <span>{dashboardStats.avgProgress}% avg progress</span>
          </div>
        </div>
      </section>

      <section className="skillhub-section">
        <div className="skillhub-section-header">
          <h2>Course Catalog</h2>
          <p>Search, filter, and choose from Kerala + Gulf focused career tracks.</p>
        </div>
        <div className="skillhub-filter-row">
          {categoryTabs.map((category) => (
            <button
              key={category.id}
              type="button"
              className={selectedCategory === category.id ? 'active' : ''}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.title}
            </button>
          ))}
        </div>
        <div className="skillhub-filter-row skillhub-subfilters">
          <select value={filters.level} onChange={(event) => setFilters((current) => ({ ...current, level: event.target.value }))}>
            <option value="">All levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
          <select value={filters.language} onChange={(event) => setFilters((current) => ({ ...current, language: event.target.value }))}>
            <option value="">All languages</option>
            <option value="English">English</option>
            <option value="Malayalam">Malayalam</option>
            <option value="English / Malayalam">English / Malayalam</option>
          </select>
          <select value={filters.region} onChange={(event) => setFilters((current) => ({ ...current, region: event.target.value }))}>
            <option value="">All regions</option>
            <option value="India">India</option>
            <option value="Gulf">Gulf</option>
            <option value="India/Gulf">India/Gulf</option>
          </select>
          <button type="button" className={filters.isFree === 'true' ? 'active' : ''} onClick={() => setFilters((current) => ({ ...current, isFree: current.isFree === 'true' ? '' : 'true' }))}>
            Free only
          </button>
          <button type="button" className={filters.certificateAvailable === 'true' ? 'active' : ''} onClick={() => setFilters((current) => ({ ...current, certificateAvailable: current.certificateAvailable === 'true' ? '' : 'true' }))}>
            Certificate
          </button>
          <button type="button" className={filters.jobLinked === 'true' ? 'active' : ''} onClick={() => setFilters((current) => ({ ...current, jobLinked: current.jobLinked === 'true' ? '' : 'true' }))}>
            Job-linked
          </button>
        </div>
        <div className="skillhub-course-grid">
          {courseLoading ? (
            <div className="skillhub-status">Loading courses...</div>
          ) : filteredCourses.length ? (
            filteredCourses.map((course) => {
              const progress = course.progress || enrolledCourses.some((enrolled) => enrolled.id === course.id) ? 35 : 0;
              return (
                <article key={course.id} className="skillhub-course-card">
                  <div className="skillhub-course-card-header">
                    <div>
                      <h3>{course.title}</h3>
                      <p>{course.description}</p>
                    </div>
                    <span className="skillhub-badge">{course.jobLinked ? 'Job-linked' : 'Career'}</span>
                  </div>
                  <div className="skillhub-course-details">
                    <span>{course.level}</span>
                    <span>{course.language}</span>
                    <span>{course.duration}</span>
                    <span>{course.price === 0 ? 'Free' : `₹${course.price}`}</span>
                  </div>
                  <div className="skillhub-progress-bar">
                    <div className="skillhub-progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="skillhub-course-actions">
                    <button type="button" onClick={() => setSelectedCourseId(course.id)}>
                      View course
                    </button>
                    <button type="button" className="secondary" onClick={() => handleEnroll(course.id)} disabled={isEnrolling}>
                      {enrolledCourses.some((enrolled) => enrolled.id === course.id) ? 'Enrolled' : 'Enroll'}
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="skillhub-status">No courses found. Adjust your filters or try a broader search.</div>
          )}
        </div>
      </section>

      <section className="skillhub-section">
        <div className="skillhub-section-header">
          <h2>Course Detail</h2>
          <p>Select a course card to view modules, lessons, and certification details.</p>
        </div>
        {courseDetailLoading ? (
          <div className="skillhub-status">Loading course detail...</div>
        ) : selectedCourse ? (
          <div className="skillhub-course-detail">
            <div className="skillhub-course-detail-main">
              <div className="skillhub-course-player">
                <iframe
                  title="Course intro"
                  src={selectedCourse?.modules?.[0]?.lessons?.[0]?.videoUrl || 'https://www.youtube.com/embed/dQw4w9WgXcQ'}
                  allowFullScreen
                />
              </div>
              <div>
                <h3>{selectedCourse.title}</h3>
                <p>{selectedCourse.description}</p>
                <div className="skillhub-course-details">
                  <span>{selectedCourse.level}</span>
                  <span>{selectedCourse.language}</span>
                  <span>{selectedCourse.duration}</span>
                  <span>{selectedCourse.certificateAvailable ? 'Certificate included' : 'No certificate'}</span>
                </div>
                <div className="skillhub-course-actions">
                  <button type="button" onClick={() => handleEnroll(selectedCourse.id)} disabled={isEnrolling}>
                    {enrolledCourses.some((enrolled) => enrolled.id === selectedCourse.id) ? 'Already Enrolled' : 'Enroll in this course'}
                  </button>
                  <span className="skillhub-tag">{selectedCourse.region}</span>
                </div>
              </div>
            </div>
            <div className="skillhub-course-modules">
              {selectedCourse.modules?.map((module, index) => (
                <article key={module.title} className="skillhub-panel">
                  <h3>{`${index + 1}. ${module.title}`}</h3>
                  <p>{module.duration}</p>
                  <ul className="skillhub-list">
                    {module.lessons.map((lesson) => (
                      <li key={lesson.title}>{lesson.title}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="skillhub-status">Select a course to explore details.</div>
        )}
      </section>

      <section className="skillhub-dual-grid">
        <article className="skillhub-panel">
          <h2>Mock Test Practice</h2>
          <form className="skillhub-form" onSubmit={handleMockTestSubmit}>
            <label>
              Category
              <select
                value={mockTestForm.category}
                onChange={(event) => setMockTestForm((current) => ({ ...current, category: event.target.value }))}
              >
                <option value="Gulf Ready">Gulf Ready</option>
                <option value="Kerala Career">Kerala Career</option>
                <option value="IT & Software">IT & Software</option>
                <option value="Hospitality">Hospitality</option>
                <option value="Government Exams">Government Exams</option>
              </select>
            </label>
            <label>
              Total questions
              <input
                type="number"
                min="1"
                value={mockTestForm.totalQuestions}
                onChange={(event) => setMockTestForm((current) => ({ ...current, totalQuestions: event.target.value }))}
              />
            </label>
            <label>
              Timer (minutes)
              <input
                type="number"
                min="10"
                value={mockTestForm.timerMinutes}
                onChange={(event) => setMockTestForm((current) => ({ ...current, timerMinutes: event.target.value }))}
              />
            </label>
            <button type="submit">Submit test answers</button>
          </form>
          {questions.length ? (
            <div className="skillhub-question-bank">
              {questions.slice(0, Number(mockTestForm.totalQuestions) || questions.length).map((question, index) => (
                <div key={question.id} className="skillhub-question-card">
                  <p>
                    <strong>{index + 1}.</strong> {question.question}
                  </p>
                  <div className="skillhub-question-options">
                    {question.options.map((option, optionIndex) => (
                      <label key={option} className="skillhub-radio-label">
                        <input
                          type="radio"
                          name={question.id}
                          checked={selectedAnswers[question.id] === optionIndex}
                          onChange={() => handleAnswerSelect(question.id, optionIndex)}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="skillhub-note">Select a category and question count to see mock test questions.</p>
          )}
          {mockTestResult ? (
            <div className="skillhub-result">
              <p>
                Score: <strong>{mockTestResult.score}%</strong> | Correct: {mockTestResult.correct} | Wrong: {mockTestResult.wrong}
              </p>
              <p>{testNotification}</p>
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
                onChange={(event) => setResumeForm((current) => ({ ...current, fullName: event.target.value }))}
              />
            </label>
            <label>
              Top skill
              <input
                type="text"
                value={resumeForm.topSkill}
                onChange={(event) => setResumeForm((current) => ({ ...current, topSkill: event.target.value }))}
              />
            </label>
            <label>
              Experience years
              <input
                type="number"
                min="0"
                value={resumeForm.experienceYears}
                onChange={(event) => setResumeForm((current) => ({ ...current, experienceYears: event.target.value }))}
              />
            </label>
            <label>
              Target role
              <input
                type="text"
                value={resumeForm.targetRole}
                onChange={(event) => setResumeForm((current) => ({ ...current, targetRole: event.target.value }))}
              />
            </label>
            <button type="submit">Generate resume draft</button>
          </form>
          {resumeSummary ? (
            <div className="skillhub-result">
              <p>{resumeSummary}</p>
              <button type="button" onClick={handleDownloadResume}>Download PDF</button>
            </div>
          ) : null}
        </article>
      </section>

      <section className="skillhub-dual-grid">
        <article className="skillhub-panel">
          <h2>Certification Tracking and Skill Wallet</h2>
          <form className="skillhub-form" onSubmit={handleCertificateUpload}>
            <label>
              Certificate title
              <input
                type="text"
                value={certificateForm.title}
                onChange={(event) => setCertificateForm((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
            <label>
              Issuer
              <input
                type="text"
                value={certificateForm.issuer}
                onChange={(event) => setCertificateForm((current) => ({ ...current, issuer: event.target.value }))}
              />
            </label>
            <label>
              Completed on
              <input
                type="date"
                value={certificateForm.completedOn}
                onChange={(event) => setCertificateForm((current) => ({ ...current, completedOn: event.target.value }))}
              />
            </label>
            <label>
              Credential id
              <input
                type="text"
                value={certificateForm.credentialId}
                onChange={(event) => setCertificateForm((current) => ({ ...current, credentialId: event.target.value }))}
              />
            </label>
            <label>
              Upload file
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(event) => setCertificateFile(event.target.files?.[0] || null)}
              />
            </label>
            <button type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload certificate'}</button>
          </form>
          <ul className="skillhub-list">
            {certificates.length ? certificates.map((item) => (
              <li key={item.certificateId || item.id}>
                <strong>{item.title}</strong> | {item.issuer} | {new Date(item.completedOn).toLocaleDateString()} | {item.credentialId}
              </li>
            )) : <li>No uploaded certificates yet.</li>}
          </ul>
        </article>

        <article className="skillhub-panel">
          <h2>Government Free Learning Portals</h2>
          <div className="skillhub-table-wrap">
            <table className="skillhub-table">
              <thead>
                <tr>
                  <th>Portal</th>
                  <th>Status</th>
                  <th>Eligibility</th>
                  <th>Certificate Value</th>
                </tr>
              </thead>
              <tbody>
                {govtPortals.map((portal) => (
                  <tr key={portal.name}>
                    <td><a href={portal.url} target="_blank" rel="noreferrer">{portal.name}</a></td>
                    <td>{portal.status}</td>
                    <td>{portal.eligibility}</td>
                    <td>{portal.certificateValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="skillhub-note">
            Kerala and Gulf career directions included. Use these verified portals for eligibility, certificate value, and free/paid learning.
          </p>
        </article>
      </section>

      <section className="skillhub-section">
        <div className="skillhub-section-header">
          <h2>Ecosystem Integrations and Monetization</h2>
          <p>Learning → earning → job pathway in your platform.</p>
        </div>
        <div className="skillhub-card-grid">
          <article className="skillhub-card">
            <h3>Module Integrations</h3>
            <ul>
              <li>Job portal and placement support</li>
              <li>Freelancer portfolio and project showcase</li>
              <li>Business services for micro-entrepreneurs</li>
              <li>Study reminders and live class scheduling</li>
            </ul>
          </article>
          <article className="skillhub-card">
            <h3>Revenue Model</h3>
            <ul>
              <li>Free course lead capture plus paid certification upsell</li>
              <li>Institute onboarding and sponsored course listings</li>
              <li>Conversion-based placement referral fees</li>
              <li>Premium mentor booking and live batches</li>
            </ul>
          </article>
          <article className="skillhub-card">
            <h3>High Value Add-ons</h3>
            <ul>
              <li>Live classes, doubt clearing chat, and mentor booking</li>
              <li>Job portal integration with Gulf and Kerala demand mapping</li>
              <li>Certificate wallet with verification links and share cards</li>
              <li>AI-driven career path builder with salary and region preference</li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
};

export default SkillLearningHub;
