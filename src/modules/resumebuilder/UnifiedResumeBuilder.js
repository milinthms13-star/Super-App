import React, { useState, useEffect, useCallback, useMemo } from "react";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import "./UnifiedResumeBuilder.css";

// Initial resume structure
const INITIAL_RESUME = {
  personalInfo: {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    website: "",
    summary: ""
  },
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  projects: [],
  languages: []
};

// Template definitions
const TEMPLATES = [
  { id: "professional", name: "Professional", description: "Clean ATS-friendly format", color: "#2563eb" },
  { id: "modern", name: "Modern", description: "Contemporary design with accent", color: "#7c3aed" },
  { id: "classic", name: "Classic", description: "Traditional business style", color: "#059669" },
  { id: "minimal", name: "Minimal", description: "Simple and elegant", color: "#0891b2" },
  { id: "creative", name: "Creative", description: "Bold and distinctive", color: "#dc2626" },
  { id: "executive", name: "Executive", description: "Senior leadership format", color: "#0f172a" }
];

const UnifiedResumeBuilder = () => {
  const [resume, setResume] = useState(INITIAL_RESUME);
  const [selectedTemplate, setSelectedTemplate] = useState("professional");
  const [savedResumes, setSavedResumes] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [resumeName, setResumeName] = useState("");
  const [activeTab, setActiveTab] = useState("info");
  const [previewMode, setPreviewMode] = useState(false);

  // Load saved resumes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("unified_resumes");
    if (saved) {
      try {
        setSavedResumes(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load resumes:", e);
      }
    }
  }, []);

  // Update personal info
  const updatePersonalInfo = useCallback((field, value) => {
    setResume(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value }
    }));
  }, []);

  // Add experience entry
  const addExperience = useCallback(() => {
    setResume(prev => ({
      ...prev,
      experience: [...prev.experience, {
        id: Date.now(),
        position: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        current: false,
        description: ""
      }]
    }));
  }, []);

  // Update experience entry
  const updateExperience = useCallback((id, field, value) => {
    setResume(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    }));
  }, []);

  // Remove experience entry
  const removeExperience = useCallback((id) => {
    setResume(prev => ({
      ...prev,
      experience: prev.experience.filter(exp => exp.id !== id)
    }));
  }, []);

  // Add education entry
  const addEducation = useCallback(() => {
    setResume(prev => ({
      ...prev,
      education: [...prev.education, {
        id: Date.now(),
        degree: "",
        institution: "",
        location: "",
        graduationDate: "",
        gpa: ""
      }]
    }));
  }, []);

  // Update education entry
  const updateEducation = useCallback((id, field, value) => {
    setResume(prev => ({
      ...prev,
      education: prev.education.map(edu =>
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    }));
  }, []);
  // Remove education entry
  const removeEducation = useCallback((id) => {
    setResume(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id)
    }));
  }, []);

  // Skills management
  const addSkill = useCallback((skill) => {
    if (skill && !resume.skills.includes(skill)) {
      setResume(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
    }
  }, [resume.skills]);

  const removeSkill = useCallback((skill) => {
    setResume(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  }, []);

  // Add project
  const addProject = useCallback(() => {
    setResume(prev => ({
      ...prev,
      projects: [...prev.projects, {
        id: Date.now(),
        name: "",
        description: "",
        technologies: "",
        link: ""
      }]
    }));
  }, []);

  // Update project
  const updateProject = useCallback((id, field, value) => {
    setResume(prev => ({
      ...prev,
      projects: prev.projects.map(proj =>
        proj.id === id ? { ...proj, [field]: value } : proj
      )
    }));
  }, []);

  // Remove project
  const removeProject = useCallback((id) => {
    setResume(prev => ({
      ...prev,
      projects: prev.projects.filter(proj => proj.id !== id)
    }));
  }, []);
  // Certifications and Languages management
  const addCertification = useCallback((cert) => {
    if (cert && !resume.certifications.includes(cert)) {
      setResume(prev => ({
        ...prev,
        certifications: [...prev.certifications, cert]
      }));
    }
  }, [resume.certifications]);

  const removeCertification = useCallback((cert) => {
    setResume(prev => ({
      ...prev,
      certifications: prev.certifications.filter(c => c !== cert)
    }));
  }, []);

  const addLanguage = useCallback((lang) => {
    if (lang && !resume.languages.includes(lang)) {
      setResume(prev => ({
        ...prev,
        languages: [...prev.languages, lang]
      }));
    }
  }, [resume.languages]);

  const removeLanguage = useCallback((lang) => {
    setResume(prev => ({
      ...prev,
      languages: prev.languages.filter(l => l !== lang)
    }));
  }, []);

  // Save resume
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
    localStorage.setItem("unified_resumes", JSON.stringify(updated));
    setShowSaveDialog(false);
    setResumeName("");
    alert(`Resume "${name}" saved successfully!`);
  }, [resume, selectedTemplate, savedResumes, resumeName]);

  // Load resume
  const loadResume = useCallback((resumeData) => {
    setResume(resumeData.resume);
    setSelectedTemplate(resumeData.template);
  }, []);
  // Delete resume
  const deleteResume = useCallback((id) => {
    const updated = savedResumes.filter(r => r.id !== id);
    setSavedResumes(updated);
    localStorage.setItem("unified_resumes", JSON.stringify(updated));
  }, [savedResumes]);

  // Export to PDF
  const exportToPDF = useCallback(() => {
    const doc = new jsPDF();
    const templateColor = TEMPLATES.find(t => t.id === selectedTemplate)?.color || "#2563eb";
    let y = 20;

    // Helper to add text with word wrap
    const addText = (text, x, yPos, maxWidth, fontSize = 10, isBold = false) => {
      doc.setFontSize(fontSize);
      doc.setFont(undefined, isBold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, yPos);
      return yPos + (lines.length * fontSize * 0.4);
    };

    // Header
    doc.setFillColor(templateColor);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, "bold");
    doc.text(resume.personalInfo.fullName || "Your Name", 20, 20);
    
    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    const contactInfo = [
      resume.personalInfo.email,
      resume.personalInfo.phone,
      resume.personalInfo.location
    ].filter(Boolean).join(" | ");
    doc.text(contactInfo, 20, 30);

    y = 50;
    doc.setTextColor(0, 0, 0);

    // Summary
    if (resume.personalInfo.summary) {
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.setTextColor(templateColor);
      doc.text("PROFESSIONAL SUMMARY", 20, y);
      y += 8;
      doc.setTextColor(0, 0, 0);
      y = addText(resume.personalInfo.summary, 20, y, 170);
      y += 10;
    }

    // Experience
    if (resume.experience.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.setTextColor(templateColor);
      doc.text("EXPERIENCE", 20, y);
      y += 8;
      doc.setTextColor(0, 0, 0);

      resume.experience.forEach(exp => {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text(exp.position || "Position", 20, y);
        y += 6;
        doc.setFontSize(10);
        doc.setFont(undefined, "normal");
        const expInfo = `${exp.company || ""} | ${exp.startDate || ""} - ${exp.current ? "Present" : exp.endDate || ""}`;
        doc.text(expInfo, 20, y);
        y += 6;
        if (exp.description) {
          y = addText(exp.description, 20, y, 170);
        }
        y += 8;
      });
    }
    // Education
    if (resume.education.length > 0) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.setTextColor(templateColor);
      doc.text("EDUCATION", 20, y);
      y += 8;
      doc.setTextColor(0, 0, 0);

      resume.education.forEach(edu => {
        doc.setFontSize(11);
        doc.setFont(undefined, "bold");
        doc.text(edu.degree || "Degree", 20, y);
        y += 6;
        doc.setFontSize(10);
        doc.setFont(undefined, "normal");
        doc.text(`${edu.institution || ""} | ${edu.graduationDate || ""}`, 20, y);
        y += 8;
      });
    }

    // Skills
    if (resume.skills.length > 0) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.setTextColor(templateColor);
      doc.text("SKILLS", 20, y);
      y += 8;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      const skillsText = resume.skills.join(", ");
      y = addText(skillsText, 20, y, 170);
    }

    // Projects
    if (resume.projects.length > 0) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.setTextColor(templateColor);
      doc.text("PROJECTS", 20, y);
      y += 8;
      doc.setTextColor(0, 0, 0);

      resume.projects.forEach(proj => {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(11);
        doc.setFont(undefined, "bold");
        doc.text(proj.name || "Project", 20, y);
        y += 6;
        doc.setFontSize(10);
        doc.setFont(undefined, "normal");
        if (proj.description) {
          y = addText(proj.description, 20, y, 170);
        }
        y += 8;
      });
    }

    doc.save(`${resume.personalInfo.fullName || "resume"}.pdf`);
  }, [resume, selectedTemplate]);
  // Export to Word
  const exportToWord = useCallback(async () => {
    const children = [];

    // Header
    children.push(
      new Paragraph({
        text: resume.personalInfo.fullName || "Your Name",
        heading: HeadingLevel.TITLE,
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
    if (resume.personalInfo.summary) {
      children.push(
        new Paragraph({
          text: "PROFESSIONAL SUMMARY",
          heading: HeadingLevel.HEADING_1
        })
      );
      children.push(new Paragraph({ text: resume.personalInfo.summary }));
      children.push(new Paragraph({ text: "" }));
    }

    // Experience
    if (resume.experience.length > 0) {
      children.push(
        new Paragraph({
          text: "EXPERIENCE",
          heading: HeadingLevel.HEADING_1
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
            text: `${exp.company || ""} | ${exp.startDate || ""} - ${exp.current ? "Present" : exp.endDate || ""}`
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
          heading: HeadingLevel.HEADING_1
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
            text: `${edu.institution || ""} | ${edu.graduationDate || ""}`
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
          heading: HeadingLevel.HEADING_1
        })
      );
      children.push(new Paragraph({ text: resume.skills.join(", ") }));
      children.push(new Paragraph({ text: "" }));
    }

    // Projects
    if (resume.projects.length > 0) {
      children.push(
        new Paragraph({
          text: "PROJECTS",
          heading: HeadingLevel.HEADING_1
        })
      );

      resume.projects.forEach(proj => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: proj.name || "Project", bold: true })
            ]
          })
        );
        if (proj.description) {
          children.push(new Paragraph({ text: proj.description }));
        }
        children.push(new Paragraph({ text: "" }));
      });
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

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    let completed = 0;
    let total = 7;

    if (resume.personalInfo.fullName) completed++;
    if (resume.personalInfo.email) completed++;
    if (resume.personalInfo.summary) completed++;
    if (resume.experience.length > 0) completed++;
    if (resume.education.length > 0) completed++;
    if (resume.skills.length > 0) completed++;
    if (resume.projects.length > 0 || resume.certifications.length > 0) completed++;

    return Math.round((completed / total) * 100);
  }, [resume]);

  return (
    <div className="unified-resume-builder">
      <header className="builder-header">
        <div className="header-content">
          <h1>🎯 Professional Resume Builder</h1>
          <p>Create stunning resumes in minutes - 100% free, no signup required</p>
          <div className="completion-bar">
            <div className="completion-fill" style={{ width: `${completionPercentage}%` }}></div>
            <span className="completion-text">{completionPercentage}% Complete</span>
          </div>
        </div>
      </header>
      <div className="builder-container">
        <div className="builder-sidebar">
          <nav className="builder-nav">
            <button
              className={`nav-button ${activeTab === "info" ? "active" : ""}`}
              onClick={() => setActiveTab("info")}
            >
              <span className="nav-icon">👤</span>
              <span>Personal Info</span>
            </button>
            <button
              className={`nav-button ${activeTab === "experience" ? "active" : ""}`}
              onClick={() => setActiveTab("experience")}
            >
              <span className="nav-icon">💼</span>
              <span>Experience</span>
            </button>
            <button
              className={`nav-button ${activeTab === "education" ? "active" : ""}`}
              onClick={() => setActiveTab("education")}
            >
              <span className="nav-icon">🎓</span>
              <span>Education</span>
            </button>
            <button
              className={`nav-button ${activeTab === "skills" ? "active" : ""}`}
              onClick={() => setActiveTab("skills")}
            >
              <span className="nav-icon">⚡</span>
              <span>Skills</span>
            </button>
            <button
              className={`nav-button ${activeTab === "projects" ? "active" : ""}`}
              onClick={() => setActiveTab("projects")}
            >
              <span className="nav-icon">🚀</span>
              <span>Projects</span>
            </button>
            <button
              className={`nav-button ${activeTab === "extras" ? "active" : ""}`}
              onClick={() => setActiveTab("extras")}
            >
              <span className="nav-icon">✨</span>
              <span>Extras</span>
            </button>
            <button
              className={`nav-button ${activeTab === "templates" ? "active" : ""}`}
              onClick={() => setActiveTab("templates")}
            >
              <span className="nav-icon">🎨</span>
              <span>Templates</span>
            </button>
            <button
              className={`nav-button ${activeTab === "saved" ? "active" : ""}`}
              onClick={() => setActiveTab("saved")}
            >
              <span className="nav-icon">💾</span>
              <span>Saved Resumes</span>
            </button>
          </nav>

          <div className="sidebar-actions">
            <button className="btn-action btn-primary" onClick={exportToPDF}>
              📄 Download PDF
            </button>
            <button className="btn-action btn-secondary" onClick={exportToWord}>
              📝 Download Word
            </button>
            <button className="btn-action btn-secondary" onClick={() => setShowSaveDialog(true)}>
              💾 Save Draft
            </button>
            <button className="btn-action btn-secondary" onClick={() => setPreviewMode(!previewMode)}>
              👁️ {previewMode ? "Edit Mode" : "Preview Mode"}
            </button>
          </div>
        </div>
        <div className="builder-main">
          {activeTab === "info" && (
            <PersonalInfoTab
              personalInfo={resume.personalInfo}
              onUpdate={updatePersonalInfo}
            />
          )}

          {activeTab === "experience" && (
            <ExperienceTab
              experience={resume.experience}
              onAdd={addExperience}
              onUpdate={updateExperience}
              onRemove={removeExperience}
            />
          )}

          {activeTab === "education" && (
            <EducationTab
              education={resume.education}
              onAdd={addEducation}
              onUpdate={updateEducation}
              onRemove={removeEducation}
            />
          )}

          {activeTab === "skills" && (
            <SkillsTab
              skills={resume.skills}
              onAdd={addSkill}
              onRemove={removeSkill}
            />
          )}

          {activeTab === "projects" && (
            <ProjectsTab
              projects={resume.projects}
              onAdd={addProject}
              onUpdate={updateProject}
              onRemove={removeProject}
            />
          )}

          {activeTab === "extras" && (
            <ExtrasTab
              certifications={resume.certifications}
              languages={resume.languages}
              onAddCertification={addCertification}
              onRemoveCertification={removeCertification}
              onAddLanguage={addLanguage}
              onRemoveLanguage={removeLanguage}
            />
          )}

          {activeTab === "templates" && (
            <TemplatesTab
              templates={TEMPLATES}
              selectedTemplate={selectedTemplate}
              onSelect={setSelectedTemplate}
            />
          )}

          {activeTab === "saved" && (
            <SavedResumesTab
              savedResumes={savedResumes}
              onLoad={loadResume}
              onDelete={deleteResume}
            />
          )}
        </div>

        <div className="builder-preview">
          <ResumePreview
            resume={resume}
            template={selectedTemplate}
            templates={TEMPLATES}
          />
        </div>
      </div>

      {showSaveDialog && (
        <SaveDialog
          resumeName={resumeName}
          onNameChange={setResumeName}
          onSave={saveResume}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}
    </div>
  );
};

// Personal Info Tab Component
const PersonalInfoTab = ({ personalInfo, onUpdate }) => {
  return (
    <div className="tab-content">
      <h2>Personal Information</h2>
      <p className="tab-description">Let's start with your basic contact details</p>

      <div className="form-grid">
        <div className="form-group full-width">
          <label>Full Name *</label>
          <input
            type="text"
            value={personalInfo.fullName}
            onChange={(e) => onUpdate("fullName", e.target.value)}
            placeholder="John Doe"
          />
        </div>

        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            value={personalInfo.email}
            onChange={(e) => onUpdate("email", e.target.value)}
            placeholder="john.doe@email.com"
          />
        </div>

        <div className="form-group">
          <label>Phone *</label>
          <input
            type="tel"
            value={personalInfo.phone}
            onChange={(e) => onUpdate("phone", e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
        </div>

        <div className="form-group">
          <label>Location</label>
          <input
            type="text"
            value={personalInfo.location}
            onChange={(e) => onUpdate("location", e.target.value)}
            placeholder="New York, NY"
          />
        </div>

        <div className="form-group">
          <label>LinkedIn</label>
          <input
            type="text"
            value={personalInfo.linkedin}
            onChange={(e) => onUpdate("linkedin", e.target.value)}
            placeholder="linkedin.com/in/johndoe"
          />
        </div>

        <div className="form-group">
          <label>Website/Portfolio</label>
          <input
            type="text"
            value={personalInfo.website}
            onChange={(e) => onUpdate("website", e.target.value)}
            placeholder="www.johndoe.com"
          />
        </div>

        <div className="form-group full-width">
          <label>Professional Summary</label>
          <textarea
            rows={5}
            value={personalInfo.summary}
            onChange={(e) => onUpdate("summary", e.target.value)}
            placeholder="Write a brief summary about yourself, your experience, and career goals (2-3 sentences)..."
          />
          <small className="form-hint">
            Tip: Focus on your key achievements and what makes you unique
          </small>
        </div>
      </div>
    </div>
  );
};

// Experience Tab Component
const ExperienceTab = ({ experience, onAdd, onUpdate, onRemove }) => {
  return (
    <div className="tab-content">
      <div className="tab-header">
        <div>
          <h2>Work Experience</h2>
          <p className="tab-description">Add your professional experience</p>
        </div>
        <button className="btn-add" onClick={onAdd}>
          + Add Experience
        </button>
      </div>

      {experience.length === 0 ? (
        <div className="empty-state">
          <p>No experience added yet. Click "Add Experience" to get started!</p>
        </div>
      ) : (
        <div className="items-list">
          {experience.map((exp) => (
            <div key={exp.id} className="item-card">
              <div className="item-header">
                <h3>{exp.position || "Position Title"}</h3>
                <button
                  className="btn-remove"
                  onClick={() => onRemove(exp.id)}
                >
                  ✕
                </button>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Position *</label>
                  <input
                    type="text"
                    value={exp.position}
                    onChange={(e) => onUpdate(exp.id, "position", e.target.value)}
                    placeholder="Software Engineer"
                  />
                </div>

                <div className="form-group">
                  <label>Company *</label>
                  <input
                    type="text"
                    value={exp.company}
                    onChange={(e) => onUpdate(exp.id, "company", e.target.value)}
                    placeholder="Tech Corp"
                  />
                </div>

                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={exp.location}
                    onChange={(e) => onUpdate(exp.id, "location", e.target.value)}
                    placeholder="San Francisco, CA"
                  />
                </div>

                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="text"
                    value={exp.startDate}
                    onChange={(e) => onUpdate(exp.id, "startDate", e.target.value)}
                    placeholder="Jan 2020"
                  />
                </div>

                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="text"
                    value={exp.endDate}
                    onChange={(e) => onUpdate(exp.id, "endDate", e.target.value)}
                    placeholder="Dec 2022"
                    disabled={exp.current}
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={exp.current}
                      onChange={(e) => onUpdate(exp.id, "current", e.target.checked)}
                    />
                    Currently working here
                  </label>
                </div>

                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    rows={4}
                    value={exp.description}
                    onChange={(e) => onUpdate(exp.id, "description", e.target.value)}
                    placeholder="• Developed and maintained web applications&#10;• Collaborated with cross-functional teams&#10;• Improved system performance by 30%"
                  />
                  <small className="form-hint">
                    Use bullet points to list your achievements and responsibilities
                  </small>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Education Tab Component
const EducationTab = ({ education, onAdd, onUpdate, onRemove }) => {
  return (
    <div className="tab-content">
      <div className="tab-header">
        <div>
          <h2>Education</h2>
          <p className="tab-description">Add your educational background</p>
        </div>
        <button className="btn-add" onClick={onAdd}>
          + Add Education
        </button>
      </div>

      {education.length === 0 ? (
        <div className="empty-state">
          <p>No education added yet. Click "Add Education" to get started!</p>
        </div>
      ) : (
        <div className="items-list">
          {education.map((edu) => (
            <div key={edu.id} className="item-card">
              <div className="item-header">
                <h3>{edu.degree || "Degree Name"}</h3>
                <button
                  className="btn-remove"
                  onClick={() => onRemove(edu.id)}
                >
                  ✕
                </button>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Degree *</label>
                  <input
                    type="text"
                    value={edu.degree}
                    onChange={(e) => onUpdate(edu.id, "degree", e.target.value)}
                    placeholder="Bachelor of Science in Computer Science"
                  />
                </div>

                <div className="form-group">
                  <label>Institution *</label>
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={(e) => onUpdate(edu.id, "institution", e.target.value)}
                    placeholder="University Name"
                  />
                </div>

                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={edu.location}
                    onChange={(e) => onUpdate(edu.id, "location", e.target.value)}
                    placeholder="Boston, MA"
                  />
                </div>

                <div className="form-group">
                  <label>Graduation Date</label>
                  <input
                    type="text"
                    value={edu.graduationDate}
                    onChange={(e) => onUpdate(edu.id, "graduationDate", e.target.value)}
                    placeholder="May 2020"
                  />
                </div>

                <div className="form-group">
                  <label>GPA (Optional)</label>
                  <input
                    type="text"
                    value={edu.gpa}
                    onChange={(e) => onUpdate(edu.id, "gpa", e.target.value)}
                    placeholder="3.8/4.0"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Skills Tab Component
const SkillsTab = ({ skills, onAdd, onRemove }) => {
  const [skillInput, setSkillInput] = React.useState("");

  const handleAdd = () => {
    if (skillInput.trim()) {
      onAdd(skillInput.trim());
      setSkillInput("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleAdd();
    }
  };

  return (
    <div className="tab-content">
      <h2>Skills</h2>
      <p className="tab-description">Add your technical and professional skills</p>

      <div className="skills-input-group">
        <input
          type="text"
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="e.g., JavaScript, Project Management, Communication"
        />
        <button className="btn-add" onClick={handleAdd}>
          Add Skill
        </button>
      </div>

      {skills.length === 0 ? (
        <div className="empty-state">
          <p>No skills added yet. Start adding your skills!</p>
        </div>
      ) : (
        <div className="tags-container">
          {skills.map((skill, index) => (
            <div key={index} className="tag">
              <span>{skill}</span>
              <button onClick={() => onRemove(skill)}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="suggestions-box">
        <h4>💡 Skill Categories to Consider:</h4>
        <ul>
          <li><strong>Technical:</strong> Programming languages, software, tools</li>
          <li><strong>Soft Skills:</strong> Leadership, communication, teamwork</li>
          <li><strong>Languages:</strong> English (Native), Spanish (Fluent)</li>
          <li><strong>Certifications:</strong> AWS Certified, PMP, etc.</li>
        </ul>
      </div>
    </div>
  );
};

// Projects Tab Component
const ProjectsTab = ({ projects, onAdd, onUpdate, onRemove }) => {
  return (
    <div className="tab-content">
      <div className="tab-header">
        <div>
          <h2>Projects</h2>
          <p className="tab-description">Showcase your notable projects</p>
        </div>
        <button className="btn-add" onClick={onAdd}>
          + Add Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <p>No projects added yet. Highlight your best work!</p>
        </div>
      ) : (
        <div className="items-list">
          {projects.map((proj) => (
            <div key={proj.id} className="item-card">
              <div className="item-header">
                <h3>{proj.name || "Project Name"}</h3>
                <button
                  className="btn-remove"
                  onClick={() => onRemove(proj.id)}
                >
                  ✕
                </button>
              </div>

              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Project Name *</label>
                  <input
                    type="text"
                    value={proj.name}
                    onChange={(e) => onUpdate(proj.id, "name", e.target.value)}
                    placeholder="E-commerce Platform"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Technologies Used</label>
                  <input
                    type="text"
                    value={proj.technologies}
                    onChange={(e) => onUpdate(proj.id, "technologies", e.target.value)}
                    placeholder="React, Node.js, MongoDB"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Project Link (Optional)</label>
                  <input
                    type="text"
                    value={proj.link}
                    onChange={(e) => onUpdate(proj.id, "link", e.target.value)}
                    placeholder="https://github.com/username/project"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    rows={4}
                    value={proj.description}
                    onChange={(e) => onUpdate(proj.id, "description", e.target.value)}
                    placeholder="Describe the project, your role, and key achievements..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Extras Tab Component
const ExtrasTab = ({ certifications, languages, onAddCertification, onRemoveCertification, onAddLanguage, onRemoveLanguage }) => {
  const [certInput, setCertInput] = React.useState("");
  const [langInput, setLangInput] = React.useState("");

  const handleAddCert = () => {
    if (certInput.trim()) {
      onAddCertification(certInput.trim());
      setCertInput("");
    }
  };

  const handleAddLang = () => {
    if (langInput.trim()) {
      onAddLanguage(langInput.trim());
      setLangInput("");
    }
  };

  return (
    <div className="tab-content">
      <h2>Additional Information</h2>
      <p className="tab-description">Add certifications and languages</p>

      <div className="extras-section">
        <h3>Certifications</h3>
        <div className="skills-input-group">
          <input
            type="text"
            value={certInput}
            onChange={(e) => setCertInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddCert()}
            placeholder="e.g., AWS Certified Solutions Architect"
          />
          <button className="btn-add" onClick={handleAddCert}>
            Add
          </button>
        </div>

        {certifications.length > 0 && (
          <div className="tags-container">
            {certifications.map((cert, index) => (
              <div key={index} className="tag">
                <span>{cert}</span>
                <button onClick={() => onRemoveCertification(cert)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="extras-section">
        <h3>Languages</h3>
        <div className="skills-input-group">
          <input
            type="text"
            value={langInput}
            onChange={(e) => setLangInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddLang()}
            placeholder="e.g., English (Native), Spanish (Fluent)"
          />
          <button className="btn-add" onClick={handleAddLang}>
            Add
          </button>
        </div>

        {languages.length > 0 && (
          <div className="tags-container">
            {languages.map((lang, index) => (
              <div key={index} className="tag">
                <span>{lang}</span>
                <button onClick={() => onRemoveLanguage(lang)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Templates Tab Component
const TemplatesTab = ({ templates, selectedTemplate, onSelect }) => {
  return (
    <div className="tab-content">
      <h2>Choose Your Template</h2>
      <p className="tab-description">Select a professional template for your resume</p>

      <div className="templates-grid">
        {templates.map((template) => (
          <div
            key={template.id}
            className={`template-card ${selectedTemplate === template.id ? "selected" : ""}`}
            onClick={() => onSelect(template.id)}
          >
            <div
              className="template-preview"
              style={{ borderTop: `4px solid ${template.color}` }}
            >
              <div className="template-preview-header" style={{ backgroundColor: template.color }}>
                <div className="preview-name">Your Name</div>
              </div>
              <div className="template-preview-body">
                <div className="preview-section"></div>
                <div className="preview-section"></div>
                <div className="preview-section"></div>
              </div>
            </div>
            <div className="template-info">
              <h3>{template.name}</h3>
              <p>{template.description}</p>
            </div>
            {selectedTemplate === template.id && (
              <div className="template-badge">✓ Selected</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Saved Resumes Tab Component
const SavedResumesTab = ({ savedResumes, onLoad, onDelete }) => {
  return (
    <div className="tab-content">
      <h2>Saved Resumes</h2>
      <p className="tab-description">Load or delete your saved resume drafts</p>

      {savedResumes.length === 0 ? (
        <div className="empty-state">
          <p>No saved resumes yet. Save your current resume to access it later!</p>
        </div>
      ) : (
        <div className="saved-resumes-list">
          {savedResumes.map((resume) => (
            <div key={resume.id} className="saved-resume-card">
              <div className="saved-resume-info">
                <h3>{resume.name}</h3>
                <p className="saved-resume-date">
                  Saved on {new Date(resume.createdAt).toLocaleDateString()}
                </p>
                <p className="saved-resume-template">
                  Template: {resume.template}
                </p>
              </div>
              <div className="saved-resume-actions">
                <button
                  className="btn-action btn-primary"
                  onClick={() => onLoad(resume)}
                >
                  Load
                </button>
                <button
                  className="btn-action btn-danger"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this resume?")) {
                      onDelete(resume.id);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Resume Preview Component
const ResumePreview = ({ resume, template, templates }) => {
  const templateColor = templates.find(t => t.id === template)?.color || "#2563eb";

  return (
    <div className="resume-preview-container">
      <div className="preview-header-bar">
        <h3>Live Preview</h3>
      </div>
      <div className="resume-preview" style={{ borderTop: `6px solid ${templateColor}` }}>
        {/* Header */}
        <div className="preview-personal-header" style={{ backgroundColor: `${templateColor}15` }}>
          <h1 style={{ color: templateColor }}>
            {resume.personalInfo.fullName || "Your Name"}
          </h1>
          <div className="preview-contact-info">
            {resume.personalInfo.email && <span>✉ {resume.personalInfo.email}</span>}
            {resume.personalInfo.phone && <span>📞 {resume.personalInfo.phone}</span>}
            {resume.personalInfo.location && <span>📍 {resume.personalInfo.location}</span>}
          </div>
          {(resume.personalInfo.linkedin || resume.personalInfo.website) && (
            <div className="preview-links">
              {resume.personalInfo.linkedin && <span>🔗 {resume.personalInfo.linkedin}</span>}
              {resume.personalInfo.website && <span>🌐 {resume.personalInfo.website}</span>}
            </div>
          )}
        </div>

        {/* Summary */}
        {resume.personalInfo.summary && (
          <div className="preview-section">
            <h2 style={{ color: templateColor }}>Professional Summary</h2>
            <p>{resume.personalInfo.summary}</p>
          </div>
        )}

        {/* Experience */}
        {resume.experience.length > 0 && (
          <div className="preview-section">
            <h2 style={{ color: templateColor }}>Experience</h2>
            {resume.experience.map((exp) => (
              <div key={exp.id} className="preview-item">
                <div className="preview-item-header">
                  <h3>{exp.position}</h3>
                  <span className="preview-date">
                    {exp.startDate} - {exp.current ? "Present" : exp.endDate}
                  </span>
                </div>
                <div className="preview-item-subheader">
                  <strong>{exp.company}</strong>
                  {exp.location && <span> • {exp.location}</span>}
                </div>
                {exp.description && (
                  <div className="preview-description">
                    {exp.description.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Education */}
        {resume.education.length > 0 && (
          <div className="preview-section">
            <h2 style={{ color: templateColor }}>Education</h2>
            {resume.education.map((edu) => (
              <div key={edu.id} className="preview-item">
                <div className="preview-item-header">
                  <h3>{edu.degree}</h3>
                  <span className="preview-date">{edu.graduationDate}</span>
                </div>
                <div className="preview-item-subheader">
                  <strong>{edu.institution}</strong>
                  {edu.location && <span> • {edu.location}</span>}
                  {edu.gpa && <span> • GPA: {edu.gpa}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        {resume.skills.length > 0 && (
          <div className="preview-section">
            <h2 style={{ color: templateColor }}>Skills</h2>
            <div className="preview-skills">
              {resume.skills.map((skill, index) => (
                <span key={index} className="preview-skill-tag" style={{ borderColor: templateColor }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {resume.projects.length > 0 && (
          <div className="preview-section">
            <h2 style={{ color: templateColor }}>Projects</h2>
            {resume.projects.map((proj) => (
              <div key={proj.id} className="preview-item">
                <h3>{proj.name}</h3>
                {proj.technologies && (
                  <div className="preview-technologies">
                    <strong>Technologies:</strong> {proj.technologies}
                  </div>
                )}
                {proj.link && (
                  <div className="preview-link">
                    <strong>Link:</strong> {proj.link}
                  </div>
                )}
                {proj.description && <p>{proj.description}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Certifications */}
        {resume.certifications.length > 0 && (
          <div className="preview-section">
            <h2 style={{ color: templateColor }}>Certifications</h2>
            <ul className="preview-list">
              {resume.certifications.map((cert, index) => (
                <li key={index}>{cert}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Languages */}
        {resume.languages.length > 0 && (
          <div className="preview-section">
            <h2 style={{ color: templateColor }}>Languages</h2>
            <div className="preview-languages">
              {resume.languages.join(" • ")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Save Dialog Component
const SaveDialog = ({ resumeName, onNameChange, onSave, onCancel }) => {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Save Resume</h3>
        <p>Give your resume a name to save it for later</p>
        <input
          type="text"
          placeholder="e.g., Software Engineer Resume"
          value={resumeName}
          onChange={(e) => onNameChange(e.target.value)}
          autoFocus
        />
        <div className="modal-actions">
          <button className="btn-action btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-action btn-primary" onClick={onSave}>
            Save Resume
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnifiedResumeBuilder;
