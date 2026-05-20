export const mergeFilters = (currentFilters, newFilters) => ({
  ...currentFilters,
  ...newFilters,
});

export const scrollToSkillSection = (id) => {
  const node = document.getElementById(id);
  if (node) {
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

export const getCourseTrustScore = (course = {}) => {
  let score = 0;
  if (course.certificateAvailable) score += 25;
  if (course.jobLinked) score += 25;
  if (Number(course.rating || 0) >= 4.5) score += 20;
  if ((course.modules || []).length >= 2) score += 15;
  if (course.price === 0) score += 15;
  return Math.min(score, 100);
};

export const getReadinessLabel = (score) => {
  if (score >= 80) return "High value";
  if (score >= 55) return "Good value";
  return "Basic track";
};

export const validateCertificateUpload = ({ title, completedOn }, file) => {
  if (!title?.trim()) return "Certificate title is required.";
  if (!completedOn) return "Completed date is required.";
  if (file) {
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.type)) return "Upload PDF, JPG or PNG only.";
    if (file.size > 5 * 1024 * 1024) return "Certificate file must be below 5 MB.";
  }
  return "";
};

export const buildCareerPath = (form = {}) => {
  const interest = `${form.interests || ""}`.toLowerCase();
  const destination = form.destination || "India";
  const salary = Number(form.salaryTarget || 0);

  if (destination === "Gulf" || interest.includes("gulf") || interest.includes("hotel")) {
    return {
      title: "Gulf Job Readiness Track",
      summary: "Targets hospitality, service, safety and support roles in GCC countries.",
      timeline: "30-60 days",
      readiness: salary >= 40000 ? "Intermediate" : "Beginner friendly",
      focus: "Communication, certificate, interview prep",
      filters: { region: "Gulf", jobLinked: "true" },
      steps: [
        { title: "Choose job-linked course", description: "Start with a Gulf hospitality, support or safety track." },
        { title: "Upload certificates", description: "Store certificates in Skill Wallet for employer sharing." },
        { title: "Mock interview", description: "Practice HR questions and destination-specific readiness." },
      ],
    };
  }

  if (interest.includes("it") || interest.includes("react") || interest.includes("cloud") || interest.includes("software")) {
    return {
      title: "IT / Software Job Track",
      summary: "Targets developer, cloud support, helpdesk and DevOps entry roles.",
      timeline: "60-90 days",
      readiness: "Project-based",
      focus: "Portfolio and technical mock test",
      filters: { category: "it-software", jobLinked: "true" },
      steps: [
        { title: "Complete one core course", description: "Finish one React, cloud, or support course fully." },
        { title: "Build portfolio", description: "Create one practical project and attach it to resume." },
        { title: "Practice tests", description: "Take weekly MCQ and interview sessions." },
      ],
    };
  }

  if (interest.includes("psc") || interest.includes("gov") || interest.includes("bank")) {
    return {
      title: "Government Exam Fast Track",
      summary: "Targets Kerala PSC, banking, SSC and public sector exam preparation.",
      timeline: "90-180 days",
      readiness: "Daily practice required",
      focus: "Mock tests and syllabus coverage",
      filters: { category: "government-exams", isFree: "true" },
      steps: [
        { title: "Syllabus map", description: "Choose exam track and complete topic checklist." },
        { title: "Daily MCQ", description: "Practice 20-50 questions every day." },
        { title: "Weekly mock test", description: "Review score, weak topics and timing." },
      ],
    };
  }

  return {
    title: "Kerala Career Growth Track",
    summary: "Targets local jobs, freelancing, digital marketing, accounting and practical skills.",
    timeline: "30-75 days",
    readiness: "Beginner friendly",
    focus: "Practical skills plus certificate",
    filters: { region: "India", jobLinked: "true" },
    steps: [
      { title: "Pick one career goal", description: "Choose local job, freelance, business, or exam path." },
      { title: "Complete one course", description: "Finish lessons and upload certificate proof." },
      { title: "Create resume", description: "Generate resume and share to job and freelancer modules." },
    ],
  };
};
