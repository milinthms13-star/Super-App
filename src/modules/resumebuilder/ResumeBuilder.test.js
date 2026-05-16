import {
  parseResumeTextToFormData,
  extractKeywords,
  computeSectionCompleteness,
  buildLocalAtsReport,
  formatResumeText,
  rewriteSummaryLocal,
} from "./ResumeBuilder";

describe("ResumeBuilder helper functions", () => {
  test("parseResumeTextToFormData extracts contact details and summary", () => {
    const text = `John Doe\nEmail: john.doe@example.com\nPhone: +971 50 123 4567\nExperienced software engineer with delivery experience.`;
    const parsed = parseResumeTextToFormData(text);
    expect(parsed.name).toBe("John Doe");
    expect(parsed.email).toBe("john.doe@example.com");
    expect(parsed.phone).toBe("+971 50 123 4567");
    expect(parsed.summary).toContain("Experienced software engineer");
  });

  test("extractKeywords returns relevant terms and filters stop words", () => {
    const keywords = extractKeywords("Experienced in React, Node.js, AWS, and team delivery.");
    expect(keywords).toContain("react");
    expect(keywords).toContain("node");
    expect(keywords).not.toContain("and");
  });

  test("computeSectionCompleteness returns complete percent for a full resume", () => {
    const resume = {
      profile: "Experienced candidate with strong delivery experience across software development, team leadership, and client-facing projects.",
      skills: ["React", "Node"],
      education: [{ degree: "BSc" }],
      experience: [{ role: "Developer", company: "X", duration: "2 years", bullets: ["Built apps"] }],
      projects: [{ name: "Project A" }],
      certifications: ["Certified"],
    };

    const report = computeSectionCompleteness(resume);
    expect(report.percent).toBe(100);
    expect(report.completed).toBe(6);
    expect(report.total).toBe(6);
  });

  test("buildLocalAtsReport includes keyword matching and suggestions", () => {
    const resume = {
      header: { fullName: "John Doe", targetJob: "Developer", location: "UAE", email: "john@example.com" },
      profile: "Experienced software developer.",
      skills: ["React", "Node.js"],
      education: [{ degree: "BSc" }],
      experience: [{ role: "Developer", company: "X", duration: "2 years", bullets: ["Built applications"] }],
      projects: [{ name: "Project A" }],
      certifications: ["Certified"],
      languages: ["English"],
      gulfProfile: {},
    };
    const result = buildLocalAtsReport({ resume, jobDescription: "Looking for React and Node developers." });
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.missingKeywords).toEqual(expect.arrayContaining(["developers"]));
    expect(result.sectionCompleteness.percent).toBeGreaterThanOrEqual(80);
  });

  test("formatResumeText serializes resume sections into text", () => {
    const resume = {
      header: { fullName: "Jane Doe", targetJob: "Engineer", location: "UAE", email: "jane@example.com", phone: "12345", linkedin: "linkedin.com/in/jane" },
      profile: "Strong engineering profile.",
      skills: ["React", "TypeScript"],
      experience: [{ role: "Engineer", company: "X", duration: "3 years", bullets: ["Developed features"] }],
      gulfProfile: { visaStatus: "N/A", currentVisaType: "N/A", availableToRelocate: "Yes" },
    };
    const text = formatResumeText(resume);
    expect(text).toContain("Jane Doe");
    expect(text).toContain("SKILLS");
    expect(text).toContain("React, TypeScript");
  });

  test("rewriteSummaryLocal includes role and job description keywords", () => {
    const summary = rewriteSummaryLocal(
      { targetJob: "Software Engineer", skills: "React, Node.js" },
      "We need software development experience in React and AWS."
    );
    expect(summary).toContain("Software Engineer");
    expect(summary).toContain("React");
    expect(summary.toLowerCase()).toContain("software");
  });
});
