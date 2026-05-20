export const EDUCATION_QUICK_ACTIONS = [
  {
    id: "tuition",
    icon: "T",
    title: "Book Tuition",
    description: "Find subject tutors quickly",
    targetSection: "home",
  },
  {
    id: "courses",
    icon: "C",
    title: "Skill Courses",
    description: "Job-ready courses and certificates",
    targetSection: "courses",
  },
  {
    id: "study-path",
    icon: "P",
    title: "AI Study Path",
    description: "Weekly plan for exams and goals",
    targetSection: "study-path",
  },
  {
    id: "scholarships",
    icon: "S",
    title: "Scholarships",
    description: "Government support and loans",
    targetSection: "government",
  },
  {
    id: "community",
    icon: "G",
    title: "Doubt Community",
    description: "Ask doubts and join groups",
    targetSection: "community",
  },
  {
    id: "career",
    icon: "R",
    title: "Career Support",
    description: "Resume, interview and job path",
    targetSection: "career",
  },
];

export const validateTuitionRequest = ({ subject, classLevel, contactPhone }) => {
  const errors = {};

  if (!String(subject || "").trim()) {
    errors.subject = "Please select a subject.";
  }
  if (!String(classLevel || "").trim()) {
    errors.classLevel = "Please select class/level.";
  }

  const phone = String(contactPhone || "").replace(/\D/g, "");
  if (phone && phone.length < 10) {
    errors.contactPhone = "Enter a valid mobile number.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const buildEducationStudyPath = ({ classLevel, goal, dailyHours, language }) => {
  const hours = Math.max(1, Math.min(Number(dailyHours || 2), 8));
  const normalizedGoal = String(goal || "learning goal");
  const isExam = /sslc|plus|exam|government/i.test(normalizedGoal);
  const isCareer = /coding|gulf|job|computer/i.test(normalizedGoal);

  const weekPlan = isExam
    ? [
        { day: "Monday", task: `Revise theory for ${hours} hour(s) and write short answers.` },
        { day: "Tuesday", task: "Practice previous-year questions and mark weak chapters." },
        { day: "Wednesday", task: "Prepare one-page notes for difficult topics." },
        { day: "Thursday", task: "Take a timed mini mock test." },
        { day: "Friday", task: "Review mistakes and rework weak concepts." },
        { day: "Saturday", task: "Full revision with formulas and definitions." },
        { day: "Sunday", task: "Light recap and next-week planning." },
      ]
    : isCareer
      ? [
          { day: "Monday", task: "Learn one core concept and take notes." },
          { day: "Tuesday", task: "Practice one guided lesson." },
          { day: "Wednesday", task: "Complete one worksheet or hands-on task." },
          { day: "Thursday", task: "Build one mini output for portfolio." },
          { day: "Friday", task: "Revise and take a self-test." },
          { day: "Saturday", task: "Update resume profile with progress." },
          { day: "Sunday", task: "Mock interview or speaking practice." },
        ]
      : [
          { day: "Monday", task: "Understand basics with examples." },
          { day: "Tuesday", task: "Practice guided questions." },
          { day: "Wednesday", task: "Revise using short notes." },
          { day: "Thursday", task: "Solve independent exercises." },
          { day: "Friday", task: "Ask doubts and clear confusion." },
          { day: "Saturday", task: "Take a mini test." },
          { day: "Sunday", task: "Review and plan next week." },
        ];

  return {
    title: `${classLevel || "Student"} - ${normalizedGoal} plan`,
    summary: `A ${language || "English"} friendly weekly plan using around ${hours} hour(s) daily.`,
    weekPlan,
  };
};

export const getCourseValueScore = (course = {}) => {
  let score = 50;
  if (course.duration) score += 10;
  if (Array.isArray(course.syllabus) && course.syllabus.length >= 4) score += 15;
  if (Array.isArray(course.outcomes) && course.outcomes.length >= 3) score += 15;
  if (/coding|digital|computer|english/i.test(course.title || "")) score += 10;
  return Math.min(score, 100);
};

export const getScholarshipDisclaimer = () =>
  "Scholarship deadlines and eligibility may change. Verify details on official government or institution portals before submitting documents.";
