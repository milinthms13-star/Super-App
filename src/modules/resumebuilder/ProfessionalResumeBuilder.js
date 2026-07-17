import React, { useState, useEffect, useCallback, useMemo } from "react";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import {
  calculateATSScore,
  analyzeKeywordMatch,
  generateContentSuggestions,
  generateCoverLetter,
  parseResumeText,
  getActionItems
} from "./ResumeEnhancementUtils";
import "./ProfessionalResumeBuilder.css";

const INITIAL_RESUME = {
  personalInfo: {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    portfolio: ""
  },
  summary: "",
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  projects: [],
  languages: []
};

const TEMPLATES = [
  { id: "modern", name: "Modern Professional", description: "Clean and contemporary", free: true },
  { id: "classic", name: "Classic ATS", description: "Traditional ATS-friendly", free: true },
  { id: "creative", name: "Creative", description: "Stand out design", free: true },
  { id: "minimal", name: "Minimal", description: "Simple and elegant", free: true },
  { id: "executive", name: "Executive", description: "Senior leadership", free: true }
];

const STEPS = [
  { id: "personal", label: "Personal Info", icon: "👤" },
  { id: "summary", label: "Summary", icon: "📝" },
  { id: "experience", label: "Experience", icon: "💼" },
  { id: "education", label: "Education", icon: "🎓" },
  { id: "skills", label: "Skills", icon: "⚡" },
  { id: "extras", label: "Extras", icon: "✨" },
  { id: "optimize", label: "Optimize", icon: "🎯" },
  { id: "template", label: "Template", icon: "🎨" },
  { id: "preview", label: "Preview", icon: "👁️" }
];

const ProfessionalResumeBuilder = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [resume, setResume] = useState(INITIAL_RESUME);
  const [selectedTemplate, setSelectedTemplate] = useState("modern");
  const [savedResumes, setSavedResumes] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [resumeName, setResumeName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [importText, setImportText] = useState("");

  // Calculate ATS score and suggestions in real-time
  const atsScore = useMemo(() => 
    calculateATSScore(resume, jobDescription), 
    [resume, jobDescription]
  );

  const keywordAnalysis = useMemo(() => 
    analyzeKeywordMatch(resume, jobDescription),
    [resume, jobDescription]
  );

  const contentSuggestions = useMemo(() => 
    generateContentSuggestions(resume, jobDescription),
    [resume, jobDescription]
  );

  const actionItems = useMemo(() => 
    getActionItems(atsScore.score),
    [atsScore.score]
  );

  // Load saved resumes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("professional_resumes");
    if (saved) {
      try {
        setSavedResumes(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load resumes:", e);
      }
    }
  }, []);

  const updateResume = useCallback((section, data) => {
    setResume(prev => ({
      ...prev,
      [section]: data
    }));
  }, []);

  const addArrayItem = useCallback((section, item) => {
    setResume(prev => ({
      ...prev,
      [section]: [...prev[section], item]
    }));
  }, []);

  const updateArrayItem = useCallback((section, index, data) => {
    setResume(prev => ({
      ...prev,
      [section]: prev[section].map((item, i) => i === index ? data : item)
    }));
  }, []);

  const removeArrayItem = useCallback((section, index) => {
    setResume(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index)
    }));
  }, []);

  const saveResume = useCallback(() => {
    const name = resumeName || `Resume ${new Date().toLocaleDateString()}`;
    const resumeData = {
      id: Date.now(),
      name,
      resume,
      template: selectedTemplate,
      createdAt: new Date().toISOString()
    };

    const updated = [...savedResumes, resumeData];
    setSavedResumes(updated);
    localStorage.setItem("professional_resumes", JSON.stringify(updated));
    setShowSaveDialog(false);
    setResumeName("");
    alert(`Resume "${name}" saved successfully!`);
  }, [resume, selectedTemplate, savedResumes, resumeName]);

  const loadResume = useCallback((resumeData) => {
    setResume(resumeData.resume);
    setSelectedTemplate(resumeData.template);
  }, []);

  const deleteResume = useCallback((id) => {
    const updated = savedResumes.filter(r => r.id !== id);
    setSavedResumes(updated);
    localStorage.setItem("professional_resumes", JSON.stringify(updated));
  }, [savedResumes]);

  const exportToPDF = useCallback(() => {
    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text(resume.personalInfo.fullName || "Your Name", 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    const contactInfo = [
      resume.personalInfo.email,
      resume.personalInfo.phone,
      resume.personalInfo.location
    ].filter(Boolean).join(" | ");
    doc.text(contactInfo, 20, y);
    y += 15;

    // Summary
    if (resume.summary) {
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("PROFESSIONAL SUMMARY", 20, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      const summaryLines = doc.splitTextToSize(resume.summary, 170);
      doc.text(summaryLines, 20, y);
      y += summaryLines.length * 5 + 10;
    }

    // Experience
    if (resume.experience.length > 0) {
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("EXPERIENCE", 20, y);
      y += 7;

      resume.experience.forEach(exp => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(11);
        doc.setFont(undefined, "bold");
        doc.text(exp.position || "Position", 20, y);
        y += 6;
        doc.setFontSize(10);
        doc.setFont(undefined, "normal");
        doc.text(`${exp.company || "Company"} | ${exp.startDate || ""} - ${exp.endDate || "Present"}`, 20, y);
        y += 6;
        if (exp.description) {
          const descLines = doc.splitTextToSize(exp.description, 170);
          doc.text(descLines, 20, y);
          y += descLines.length * 5 + 5;
        }
      });
      y += 5;
    }

    // Education
    if (resume.education.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("EDUCATION", 20, y);
      y += 7;

      resume.education.forEach(edu => {
        doc.setFontSize(11);
        doc.setFont(undefined, "bold");
        doc.text(edu.degree || "Degree", 20, y);
        y += 6;
        doc.setFontSize(10);
        doc.setFont(undefined, "normal");
        doc.text(`${edu.institution || "Institution"} | ${edu.year || ""}`, 20, y);
        y += 8;
      });
    }

    // Skills
    if (resume.skills.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("SKILLS", 20, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      const skillsText = resume.skills.join(", ");
      const skillsLines = doc.splitTextToSize(skillsText, 170);
      doc.text(skillsLines, 20, y);
    }

    doc.save(`${resume.personalInfo.fullName || "resume"}.pdf`);
  }, [resume]);

  const exportToWord = useCallback(async () => {
    const children = [];

    // Header
    children.push(
      new Paragraph({
        text: resume.personalInfo.fullName || "Your Name",
        heading: "Heading1",
        alignment: AlignmentType.CENTER
      })
    );

    const contactInfo = [
      resume.personalInfo.email,
      resume.personalInfo.phone,
      resume.personalInfo.location
    ].filter(Boolean).join(" | ");

    children.push(
      new Paragraph({
        text: contactInfo,
        alignment: AlignmentType.CENTER
      })
    );

    children.push(new Paragraph({ text: "" }));

    // Summary
    if (resume.summary) {
      children.push(
        new Paragraph({
          text: "PROFESSIONAL SUMMARY",
          heading: "Heading2"
        })
      );
      children.push(new Paragraph({ text: resume.summary }));
      children.push(new Paragraph({ text: "" }));
    }

    // Experience
    if (resume.experience.length > 0) {
      children.push(
        new Paragraph({
          text: "EXPERIENCE",
          heading: "Heading2"
        })
      );

      resume.experience.forEach(exp => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: exp.position || "Position", bold: true })
            ]
          })
        );
        children.push(
          new Paragraph({
            text: `${exp.company || "Company"} | ${exp.startDate || ""} - ${exp.endDate || "Present"}`
          })
        );
        if (exp.description) {
          children.push(new Paragraph({ text: exp.description }));
        }
        children.push(new Paragraph({ text: "" }));
      });
    }

    // Education
    if (resume.education.length > 0) {
      children.push(
        new Paragraph({
          text: "EDUCATION",
          heading: "Heading2"
        })
      );

      resume.education.forEach(edu => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: edu.degree || "Degree", bold: true })
            ]
          })
        );
        children.push(
          new Paragraph({
            text: `${edu.institution || "Institution"} | ${edu.year || ""}`
          })
        );
      });
      children.push(new Paragraph({ text: "" }));
    }

    // Skills
    if (resume.skills.length > 0) {
      children.push(
        new Paragraph({
          text: "SKILLS",
          heading: "Heading2"
        })
      );
      children.push(new Paragraph({ text: resume.skills.join(", ") }));
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: children
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${resume.personalInfo.fullName || "resume"}.docx`);
  }, [resume]);

  const handleGenerateCoverLetter = useCallback(() => {
    const letter = generateCoverLetter(resume, jobDescription, companyName);
    setCoverLetter(letter);
    setShowCoverLetter(true);
  }, [resume, jobDescription, companyName]);

  const handleImportResume = useCallback(() => {
    if (importText.trim()) {
      const parsed = parseResumeText(importText);
      setResume(prev => ({
        ...prev,
        personalInfo: { ...prev.personalInfo, ...parsed.personalInfo },
        summary: parsed.summary || prev.summary,
        skills: parsed.skills.length > 0 ? parsed.skills : prev.skills,
        experience: parsed.experience.length > 0 ? parsed.experience : prev.experience,
        education: parsed.education.length > 0 ? parsed.education : prev.education
      }));
      setImportText("");
      alert("Resume imported! Review and edit the extracted information.");
    }
  }, [importText]);

  const applySuggestion = useCallback((suggestion) => {
    if (suggestion.type === 'summary' && suggestion.content) {
      setResume(prev => ({ ...prev, summary: suggestion.content }));
    } else if (suggestion.type === 'skills' && suggestion.content) {
      const newSkills = suggestion.content.split(',').map(s => s.trim());
      setResume(prev => ({
        ...prev,
        skills: [...new Set([...prev.skills, ...newSkills])]
      }));
    }
    alert("Suggestion applied! You can customize it further.");
  }, []);

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="professional-resume-builder">
      <header className="builder-header">
        <h1>Professional Resume Builder</h1>
        <p>Create your perfect resume in minutes - completely free</p>
      </header>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="steps-navigation">
        {STEPS.map((step, index) => (
          <button
            key={step.id}
            className={`step-button ${currentStep === index ? "active" : ""} ${currentStep > index ? "completed" : ""}`}
            onClick={() => setCurrentStep(index)}
          >
            <span className="step-icon">{step.icon}</span>
            <span className="step-label">{step.label}</span>
          </button>
        ))}
      </div>

      <div className="builder-content">
        <div className="builder-form">
          {/* Personal Info Step */}
          {currentStep === 0 && (
            <PersonalInfoForm
              data={resume.personalInfo}
              onChange={(data) => updateResume("personalInfo", data)}
            />
          )}

          {/* Summary Step */}
          {currentStep === 1 && (
            <SummaryForm
              data={resume.summary}
              onChange={(data) => updateResume("summary", data)}
            />
          )}

          {/* Experience Step */}
          {currentStep === 2 && (
            <ExperienceForm
              data={resume.experience}
              onAdd={(item) => addArrayItem("experience", item)}
              onUpdate={(index, item) => updateArrayItem("experience", index, item)}
              onRemove={(index) => removeArrayItem("experience", index)}
            />
          )}

          {/* Education Step */}
          {currentStep === 3 && (
            <EducationForm
              data={resume.education}
              onAdd={(item) => addArrayItem("education", item)}
              onUpdate={(index, item) => updateArrayItem("education", index, item)}
              onRemove={(index) => removeArrayItem("education", index)}
            />
          )}

          {/* Skills Step */}
          {currentStep === 4 && (
            <SkillsForm
              data={resume.skills}
              onChange={(data) => updateResume("skills", data)}
            />
          )}

          {/* Extras Step */}
          {currentStep === 5 && (
            <ExtrasForm
              certifications={resume.certifications}
              projects={resume.projects}
              languages={resume.languages}
              onUpdateCertifications={(data) => updateResume("certifications", data)}
              onUpdateProjects={(data) => updateResume("projects", data)}
              onUpdateLanguages={(data) => updateResume("languages", data)}
            />
          )}

          {/* Optimize Step - NEW */}
          {currentStep === 6 && (
            <div className="form-section">
              <h2>Resume Optimization</h2>
              <div className="optimization-dashboard">
                {/* ATS Score Card */}
                <div className="score-card">
                  <div className="score-circle">
                    <svg width="120" height="120" viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        r="54"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="54"
                        fill="none"
                        stroke={atsScore.score >= 80 ? "#10b981" : atsScore.score >= 60 ? "#f59e0b" : "#ef4444"}
                        strokeWidth="8"
                        strokeDasharray={`${(atsScore.score / 100) * 339} 339`}
                        strokeLinecap="round"
                        transform="rotate(-90 60 60)"
                      />
                    </svg>
                    <div className="score-text">
                      <span className="score-number">{atsScore.score}</span>
                      <span className="score-label">ATS Score</span>
                    </div>
                  </div>
                  <p className="score-level">{atsScore.level}</p>
                </div>

                {/* Job Description Input */}
                <div className="job-description-input">
                  <label>Paste Job Description (Optional but Recommended)</label>
                  <textarea
                    rows={6}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here to get keyword matching and optimization suggestions..."
                  />
                  {keywordAnalysis.matchPercent > 0 && (
                    <div className="keyword-match">
                      <span>Keyword Match: {keywordAnalysis.matchPercent}%</span>
                      <div className="keyword-bar">
                        <div 
                          className="keyword-fill" 
                          style={{ 
                            width: `${keywordAnalysis.matchPercent}%`,
                            background: keywordAnalysis.matchPercent >= 70 ? '#10b981' : keywordAnalysis.matchPercent >= 40 ? '#f59e0b' : '#ef4444'
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Issues */}
                {atsScore.issues.length > 0 && (
                  <div className="optimization-section issues">
                    <h3>⚠️ Issues to Fix</h3>
                    <ul>
                      {atsScore.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggestions */}
                {atsScore.suggestions.length > 0 && (
                  <div className="optimization-section suggestions">
                    <h3>💡 Suggestions</h3>
                    <ul>
                      {atsScore.suggestions.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Items */}
                <div className="optimization-section action-items">
                  <h3>✅ Action Items</h3>
                  <ul>
                    {actionItems.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Missing Keywords */}
                {keywordAnalysis.missingKeywords.length > 0 && (
                  <div className="optimization-section keywords">
                    <h3>🔑 Missing Keywords</h3>
                    <div className="keyword-chips">
                      {keywordAnalysis.missingKeywords.map((keyword, i) => (
                        <span key={i} className="keyword-chip missing">{keyword}</span>
                      ))}
                    </div>
                    <p className="keyword-hint">Consider adding these keywords naturally in your summary or experience</p>
                  </div>
                )}

                {/* Matched Keywords */}
                {keywordAnalysis.matchedKeywords.length > 0 && (
                  <div className="optimization-section keywords">
                    <h3>✓ Matched Keywords</h3>
                    <div className="keyword-chips">
                      {keywordAnalysis.matchedKeywords.map((keyword, i) => (
                        <span key={i} className="keyword-chip matched">{keyword}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Suggestions */}
                {contentSuggestions.length > 0 && (
                  <div className="optimization-section ai-suggestions">
                    <h3>🤖 AI-Powered Content Suggestions</h3>
                    {contentSuggestions.map((suggestion, i) => (
                      <div key={i} className="suggestion-card">
                        <h4>{suggestion.title}</h4>
                        <p className="suggestion-content">{suggestion.content}</p>
                        <p className="suggestion-action">{suggestion.action}</p>
                        <button 
                          className="btn-secondary"
                          onClick={() => applySuggestion(suggestion)}
                        >
                          Apply Suggestion
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Import Resume */}
                <div className="optimization-section import-resume">
                  <h3>📋 Import from Existing Resume</h3>
                  <textarea
                    rows={6}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Paste your existing resume text here to extract information..."
                  />
                  <button 
                    className="btn-primary"
                    onClick={handleImportResume}
                    disabled={!importText.trim()}
                  >
                    Import & Parse Resume
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Template Step */}
          {currentStep === 7 && (
            <TemplateSelector
              templates={TEMPLATES}
              selected={selectedTemplate}
              onSelect={setSelectedTemplate}
            />
          )}

          {/* Preview Step */}
          {currentStep === 8 && (
            <div className="preview-actions">
              <h2>Your Resume is Ready!</h2>
              
              {/* Final Score Display */}
              <div className="final-score">
                <div className="score-badge" style={{
                  background: atsScore.score >= 80 ? '#10b981' : atsScore.score >= 60 ? '#f59e0b' : '#ef4444'
                }}>
                  <span className="score-number">{atsScore.score}</span>
                  <span className="score-label">Final ATS Score</span>
                </div>
                <p className="score-message">
                  {atsScore.score >= 80 && "Excellent! Your resume is ATS-optimized and ready to submit."}
                  {atsScore.score >= 60 && atsScore.score < 80 && "Good resume! Consider the optimization suggestions for better results."}
                  {atsScore.score < 60 && "Your resume needs improvement. Review the issues and suggestions."}
                </p>
              </div>

              <div className="action-buttons">
                <button className="btn-primary" onClick={exportToPDF}>
                  📄 Download PDF
                </button>
                <button className="btn-primary" onClick={exportToWord}>
                  📝 Download Word
                </button>
                <button className="btn-secondary" onClick={() => setShowSaveDialog(true)}>
                  💾 Save Draft
                </button>
              </div>

              {/* Cover Letter Generator */}
              <div className="cover-letter-section">
                <h3>Generate Cover Letter</h3>
                <div className="form-group">
                  <label>Company Name (Optional)</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g., Google, Microsoft"
                  />
                </div>
                <button 
                  className="btn-primary" 
                  onClick={handleGenerateCoverLetter}
                >
                  ✉️ Generate Cover Letter
                </button>
              </div>

              {savedResumes.length > 0 && (
                <div className="saved-resumes">
                  <h3>Saved Resumes</h3>
                  {savedResumes.map(r => (
                    <div key={r.id} className="saved-resume-item">
                      <span>{r.name}</span>
                      <div>
                        <button onClick={() => loadResume(r)}>Load</button>
                        <button onClick={() => deleteResume(r.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="navigation-buttons">
            <button
              className="btn-secondary"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              ← Previous
            </button>
            <button
              className="btn-primary"
              onClick={nextStep}
              disabled={currentStep === STEPS.length - 1}
            >
              Next →
            </button>
          </div>
        </div>

        <div className="builder-preview">
          <div className="preview-score-badge">
            <span className="preview-score-number">{atsScore.score}</span>
            <span className="preview-score-label">ATS Score</span>
            <span className="preview-score-level">{atsScore.level}</span>
          </div>
          <ResumePreview resume={resume} template={selectedTemplate} />
        </div>
      </div>

      {showSaveDialog && (
        <div className="modal-overlay" onClick={() => setShowSaveDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Save Resume</h3>
            <input
              type="text"
              placeholder="Enter resume name"
              value={resumeName}
              onChange={(e) => setResumeName(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={saveResume}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showCoverLetter && (
        <div className="modal-overlay" onClick={() => setShowCoverLetter(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h3>Your Cover Letter</h3>
            <textarea
              rows={20}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              className="cover-letter-text"
            />
            <div className="modal-actions">
              <button 
                className="btn-secondary" 
                onClick={() => {
                  navigator.clipboard.writeText(coverLetter);
                  alert("Cover letter copied to clipboard!");
                }}
              >
                📋 Copy to Clipboard
              </button>
              <button className="btn-secondary" onClick={() => setShowCoverLetter(false)}>
                Close
              </button>
              <button 
                className="btn-primary"
                onClick={() => {
                  const blob = new Blob([coverLetter], { type: 'text/plain' });
                  saveAs(blob, `${resume.personalInfo.fullName || 'cover-letter'}_cover_letter.txt`);
                }}
              >
                💾 Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Form Components
const PersonalInfoForm = ({ data, onChange }) => {
  const handleChange = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="form-section">
      <h2>Personal Information</h2>
      <div className="form-grid">
        <div className="form-group">
          <label>Full Name *</label>
          <input
            type="text"
            value={data.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            placeholder="John Doe"
          />
        </div>
        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="john@example.com"
          />
        </div>
        <div className="form-group">
          <label>Phone *</label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
        </div>
        <div className="form-group">
          <label>Location</label>
          <input
            type="text"
            value={data.location}
            onChange={(e) => handleChange("location", e.target.value)}
            placeholder="City, Country"
          />
        </div>
        <div className="form-group">
          <label>LinkedIn</label>
          <input
            type="text"
            value={data.linkedin}
            onChange={(e) => handleChange("linkedin", e.target.value)}
            placeholder="linkedin.com/in/johndoe"
          />
        </div>
        <div className="form-group">
          <label>Portfolio/Website</label>
          <input
            type="text"
            value={data.portfolio}
            onChange={(e) => handleChange("portfolio", e.target.value)}
            placeholder="www.johndoe.com"
          />
        </div>
      </div>
    </div>
  );
};

const SummaryForm = ({ data, onChange }) => {
  return (
    <div className="form-section">
      <h2>Professional Summary</h2>
      <p className="form-hint">Write 2-3 sentences highlighting your key strengths and career goals</p>
      <div className="form-group">
        <textarea
          rows={6}
          value={data}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Results-driven professional with 5+ years of experience in..."
        />
      </div>
    </div>
  );
};

const ExperienceForm = ({ data, onAdd, onUpdate, onRemove }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newExperience, setNewExperience] = useState({
    position: "",
    company: "",
    startDate: "",
    endDate: "",
    description: ""
  });

  const handleAdd = () => {
    if (newExperience.position && newExperience.company) {
      onAdd(newExperience);
      setNewExperience({
        position: "",
        company: "",
        startDate: "",
        endDate: "",
        description: ""
      });
      setIsAdding(false);
    }
  };

  return (
    <div className="form-section">
      <h2>Work Experience</h2>
      {data.map((exp, index) => (
        <div key={index} className="experience-item">
          <h3>{exp.position} at {exp.company}</h3>
          <p className="date-range">{exp.startDate} - {exp.endDate || "Present"}</p>
          <p>{exp.description}</p>
          <button className="btn-danger-small" onClick={() => onRemove(index)}>Remove</button>
        </div>
      ))}

      {isAdding ? (
        <div className="add-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Position *</label>
              <input
                type="text"
                value={newExperience.position}
                onChange={(e) => setNewExperience({ ...newExperience, position: e.target.value })}
                placeholder="Software Engineer"
              />
            </div>
            <div className="form-group">
              <label>Company *</label>
              <input
                type="text"
                value={newExperience.company}
                onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })}
                placeholder="Tech Corp"
              />
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="text"
                value={newExperience.startDate}
                onChange={(e) => setNewExperience({ ...newExperience, startDate: e.target.value })}
                placeholder="Jan 2020"
              />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input
                type="text"
                value={newExperience.endDate}
                onChange={(e) => setNewExperience({ ...newExperience, endDate: e.target.value })}
                placeholder="Present"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              rows={4}
              value={newExperience.description}
              onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })}
              placeholder="Describe your responsibilities and achievements..."
            />
          </div>
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleAdd}>Add Experience</button>
          </div>
        </div>
      ) : (
        <button className="btn-add" onClick={() => setIsAdding(true)}>+ Add Experience</button>
      )}
    </div>
  );
};

const EducationForm = ({ data, onAdd, onRemove }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newEducation, setNewEducation] = useState({
    degree: "",
    institution: "",
    year: ""
  });

  const handleAdd = () => {
    if (newEducation.degree && newEducation.institution) {
      onAdd(newEducation);
      setNewEducation({ degree: "", institution: "", year: "" });
      setIsAdding(false);
    }
  };

  return (
    <div className="form-section">
      <h2>Education</h2>
      {data.map((edu, index) => (
        <div key={index} className="education-item">
          <h3>{edu.degree}</h3>
          <p>{edu.institution} | {edu.year}</p>
          <button className="btn-danger-small" onClick={() => onRemove(index)}>Remove</button>
        </div>
      ))}

      {isAdding ? (
        <div className="add-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Degree *</label>
              <input
                type="text"
                value={newEducation.degree}
                onChange={(e) => setNewEducation({ ...newEducation, degree: e.target.value })}
                placeholder="Bachelor of Science in Computer Science"
              />
            </div>
            <div className="form-group">
              <label>Institution *</label>
              <input
                type="text"
                value={newEducation.institution}
                onChange={(e) => setNewEducation({ ...newEducation, institution: e.target.value })}
                placeholder="University Name"
              />
            </div>
            <div className="form-group">
              <label>Year</label>
              <input
                type="text"
                value={newEducation.year}
                onChange={(e) => setNewEducation({ ...newEducation, year: e.target.value })}
                placeholder="2020"
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleAdd}>Add Education</button>
          </div>
        </div>
      ) : (
        <button className="btn-add" onClick={() => setIsAdding(true)}>+ Add Education</button>
      )}
    </div>
  );
};

const SkillsForm = ({ data, onChange }) => {
  const [skillInput, setSkillInput] = useState("");

  const addSkill = () => {
    if (skillInput.trim() && !data.includes(skillInput.trim())) {
      onChange([...data, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const removeSkill = (index) => {
    onChange(data.filter((_, i) => i !== index));
  };

  return (
    <div className="form-section">
      <h2>Skills</h2>
      <p className="form-hint">Add your key skills one at a time</p>
      <div className="skills-input">
        <input
          type="text"
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && addSkill()}
          placeholder="e.g., JavaScript, Project Management"
        />
        <button className="btn-primary" onClick={addSkill}>Add</button>
      </div>
      <div className="skills-list">
        {data.map((skill, index) => (
          <span key={index} className="skill-tag">
            {skill}
            <button onClick={() => removeSkill(index)}>×</button>
          </span>
        ))}
      </div>
    </div>
  );
};

const ExtrasForm = ({ certifications, projects, languages, onUpdateCertifications, onUpdateProjects, onUpdateLanguages }) => {
  const [certInput, setCertInput] = useState("");
  const [projInput, setProjInput] = useState("");
  const [langInput, setLangInput] = useState("");

  const addItem = (input, data, updateFn, setInput) => {
    if (input.trim() && !data.includes(input.trim())) {
      updateFn([...data, input.trim()]);
      setInput("");
    }
  };

  const removeItem = (index, data, updateFn) => {
    updateFn(data.filter((_, i) => i !== index));
  };

  return (
    <div className="form-section">
      <h2>Additional Information</h2>
      
      <div className="extras-subsection">
        <h3>Certifications</h3>
        <div className="skills-input">
          <input
            type="text"
            value={certInput}
            onChange={(e) => setCertInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addItem(certInput, certifications, onUpdateCertifications, setCertInput)}
            placeholder="e.g., AWS Certified Solutions Architect"
          />
          <button className="btn-primary" onClick={() => addItem(certInput, certifications, onUpdateCertifications, setCertInput)}>
            Add
          </button>
        </div>
        <div className="skills-list">
          {certifications.map((cert, index) => (
            <span key={index} className="skill-tag">
              {cert}
              <button onClick={() => removeItem(index, certifications, onUpdateCertifications)}>×</button>
            </span>
          ))}
        </div>
      </div>

      <div className="extras-subsection">
        <h3>Projects</h3>
        <div className="skills-input">
          <input
            type="text"
            value={projInput}
            onChange={(e) => setProjInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addItem(projInput, projects, onUpdateProjects, setProjInput)}
            placeholder="e.g., E-commerce Platform"
          />
          <button className="btn-primary" onClick={() => addItem(projInput, projects, onUpdateProjects, setProjInput)}>
            Add
          </button>
        </div>
        <div className="skills-list">
          {projects.map((proj, index) => (
            <span key={index} className="skill-tag">
              {proj}
              <button onClick={() => removeItem(index, projects, onUpdateProjects)}>×</button>
            </span>
          ))}
        </div>
      </div>

      <div className="extras-subsection">
        <h3>Languages</h3>
        <div className="skills-input">
          <input
            type="text"
            value={langInput}
            onChange={(e) => setLangInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addItem(langInput, languages, onUpdateLanguages, setLangInput)}
            placeholder="e.g., English (Native)"
          />
          <button className="btn-primary" onClick={() => addItem(langInput, languages, onUpdateLanguages, setLangInput)}>
            Add
          </button>
        </div>
        <div className="skills-list">
          {languages.map((lang, index) => (
            <span key={index} className="skill-tag">
              {lang}
              <button onClick={() => removeItem(index, languages, onUpdateLanguages)}>×</button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const TemplateSelector = ({ templates, selected, onSelect }) => {
  return (
    <div className="form-section">
      <h2>Choose Template</h2>
      <div className="templates-grid">
        {templates.map(template => (
          <div
            key={template.id}
            className={`template-card ${selected === template.id ? "selected" : ""}`}
            onClick={() => onSelect(template.id)}
          >
            <div className="template-preview">
              <div className={`template-visual template-${template.id}`}></div>
            </div>
            <h3>{template.name}</h3>
            <p>{template.description}</p>
            {template.free && <span className="badge-free">FREE</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

const ResumePreview = ({ resume, template }) => {
  return (
    <div className={`resume-preview template-${template}`}>
      <div className="preview-header">
        <h1>{resume.personalInfo.fullName || "Your Name"}</h1>
        <div className="preview-contact">
          {resume.personalInfo.email && <span>{resume.personalInfo.email}</span>}
          {resume.personalInfo.phone && <span>{resume.personalInfo.phone}</span>}
          {resume.personalInfo.location && <span>{resume.personalInfo.location}</span>}
        </div>
        {(resume.personalInfo.linkedin || resume.personalInfo.portfolio) && (
          <div className="preview-links">
            {resume.personalInfo.linkedin && <span>{resume.personalInfo.linkedin}</span>}
            {resume.personalInfo.portfolio && <span>{resume.personalInfo.portfolio}</span>}
          </div>
        )}
      </div>

      {resume.summary && (
        <div className="preview-section">
          <h2>Professional Summary</h2>
          <p>{resume.summary}</p>
        </div>
      )}

      {resume.experience.length > 0 && (
        <div className="preview-section">
          <h2>Experience</h2>
          {resume.experience.map((exp, index) => (
            <div key={index} className="preview-item">
              <div className="preview-item-header">
                <h3>{exp.position}</h3>
                <span className="date-range">{exp.startDate} - {exp.endDate || "Present"}</span>
              </div>
              <h4>{exp.company}</h4>
              {exp.description && <p>{exp.description}</p>}
            </div>
          ))}
        </div>
      )}

      {resume.education.length > 0 && (
        <div className="preview-section">
          <h2>Education</h2>
          {resume.education.map((edu, index) => (
            <div key={index} className="preview-item">
              <h3>{edu.degree}</h3>
              <h4>{edu.institution} {edu.year && `| ${edu.year}`}</h4>
            </div>
          ))}
        </div>
      )}

      {resume.skills.length > 0 && (
        <div className="preview-section">
          <h2>Skills</h2>
          <div className="preview-skills">
            {resume.skills.map((skill, index) => (
              <span key={index} className="preview-skill-tag">{skill}</span>
            ))}
          </div>
        </div>
      )}

      {resume.certifications.length > 0 && (
        <div className="preview-section">
          <h2>Certifications</h2>
          <ul>
            {resume.certifications.map((cert, index) => (
              <li key={index}>{cert}</li>
            ))}
          </ul>
        </div>
      )}

      {resume.projects.length > 0 && (
        <div className="preview-section">
          <h2>Projects</h2>
          <ul>
            {resume.projects.map((proj, index) => (
              <li key={index}>{proj}</li>
            ))}
          </ul>
        </div>
      )}

      {resume.languages.length > 0 && (
        <div className="preview-section">
          <h2>Languages</h2>
          <div className="preview-languages">
            {resume.languages.join(", ")}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalResumeBuilder;
