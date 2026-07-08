// Course categories
const COURSE_CATEGORIES = [
  'IT & Software',
  'Digital Marketing',
  'Hospitality',
  'Government Exams',
  'Language Skills',
  'Career Development',
];

// Static course catalog (fallback if database is empty)
const COURSE_CATALOG = [
  {
    courseId: 'gulf-hotel-operations-pro',
    id: 'gulf-hotel-operations-pro',
    title: 'Gulf Hotel Operations Pro',
    level: 'Beginner',
    duration: '45 hours',
    price: 0,
    description: 'A Gulf-ready hospitality track for housekeeping, front desk, and guest relations careers.',
    modules: [
      {
        title: 'Gulf Service Culture',
        description: 'Understanding Gulf hospitality standards',
        lessons: [
          { title: 'Introduction to Gulf Hospitality', duration: '30 mins' },
          { title: 'Cultural Sensitivity', duration: '45 mins' },
        ],
        order: 1,
      },
      {
        title: 'Guest Onboarding',
        description: 'Check-in and guest services',
        lessons: [
          { title: 'Check-in Procedures', duration: '1 hour' },
          { title: 'Guest Communication', duration: '45 mins' },
        ],
        order: 2,
      },
    ],
    certificateAvailable: true,
    jobLinked: true,
    category: 'Hospitality',
    tags: ['hospitality', 'gulf', 'hotel', 'operations'],
    published: true,
  },
  {
    courseId: 'kerala-digital-marketing',
    id: 'kerala-digital-marketing',
    title: 'Kerala Digital Marketing Launchpad',
    level: 'Intermediate',
    duration: '32 hours',
    price: 1200,
    description: 'Practical digital marketing training for Kerala entrepreneurs and freelancers.',
    modules: [
      {
        title: 'Marketing Fundamentals',
        lessons: [
          { title: 'Digital Marketing Basics', duration: '1 hour' },
          { title: 'Target Audience Research', duration: '45 mins' },
        ],
        order: 1,
      },
    ],
    certificateAvailable: true,
    jobLinked: true,
    category: 'Digital Marketing',
    tags: ['marketing', 'digital', 'kerala', 'freelance'],
    published: true,
  },
  {
    courseId: 'it-cloud-support-engineer',
    id: 'it-cloud-support-engineer',
    title: 'IT Cloud Support Engineer',
    level: 'Advanced',
    duration: '60 hours',
    price: 2500,
    description: 'Cloud support and helpdesk training with hands-on labs for global IT service desk roles.',
    modules: [
      {
        title: 'Cloud Platform Essentials',
        lessons: [
          { title: 'AWS Fundamentals', duration: '2 hours' },
          { title: 'Azure Basics', duration: '2 hours' },
        ],
        order: 1,
      },
    ],
    certificateAvailable: true,
    jobLinked: true,
    category: 'IT & Software',
    tags: ['it', 'cloud', 'aws', 'azure', 'support'],
    published: true,
  },
];

// Question banks by category
const QUESTION_BANKS = {
  'Gulf Ready': [
    {
      id: 'q1',
      question: 'What is the primary language spoken in most Gulf countries for business?',
      options: ['Hindi', 'English', 'Arabic', 'Malayalam'],
      correctAnswer: 2,
      category: 'Gulf Ready',
    },
    {
      id: 'q2',
      question: 'Which of these is a common hospitality standard in Gulf hotels?',
      options: ['Casual dress code', 'Strict punctuality', 'Flexible schedules', 'Informal service'],
      correctAnswer: 1,
      category: 'Gulf Ready',
    },
    {
      id: 'q3',
      question: 'What is the typical work week structure in Gulf countries?',
      options: ['Monday-Friday', 'Sunday-Thursday', 'Tuesday-Saturday', 'Monday-Saturday'],
      correctAnswer: 1,
      category: 'Gulf Ready',
    },
  ],
  'Kerala Career': [
    {
      id: 'q4',
      question: 'Which sector has the most job opportunities in Kerala?',
      options: ['Manufacturing', 'IT & Services', 'Agriculture', 'Mining'],
      correctAnswer: 1,
      category: 'Kerala Career',
    },
  ],
  'IT & Software': [
    {
      id: 'q5',
      question: 'What does API stand for in software development?',
      options: ['Application Program Interface', 'Automated Programming Interface', 'Application Processing Integration', 'Advanced Program Integration'],
      correctAnswer: 0,
      category: 'IT & Software',
    },
  ],
};

// Government portals for scholarships and certifications
const GOVT_PORTALS = [
  {
    name: 'National Scholarship Portal',
    url: 'https://scholarships.gov.in/',
    description: 'Central government scholarships',
  },
  {
    name: 'Kerala Education Department',
    url: 'https://education.kerala.gov.in/',
    description: 'State education schemes',
  },
];

// Helper functions
const getSkillLearningCourses = (filters = {}) => {
  let courses = [...COURSE_CATALOG];
  
  if (filters.category) {
    courses = courses.filter(c => c.category === filters.category);
  }
  
  if (filters.level) {
    courses = courses.filter(c => c.level === filters.level);
  }
  
  return courses;
};

const getCourseById = (courseId) => {
  return COURSE_CATALOG.find(c => c.courseId === courseId || c.id === courseId);
};

const getQuestionBank = (category = 'Gulf Ready') => {
  return QUESTION_BANKS[category] || [];
};

const evaluateTestAnswers = (category, answers) => {
  const questions = getQuestionBank(category);
  let correct = 0;
  let wrong = 0;
  const weakAreas = [];

  answers.forEach(answer => {
    const question = questions.find(q => q.id === answer.questionId);
    if (question) {
      if (question.correctAnswer === answer.selectedIndex) {
        correct++;
      } else {
        wrong++;
        weakAreas.push(question.category);
      }
    }
  });

  const total = answers.length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;

  return {
    score,
    correct,
    wrong,
    weakAreas: [...new Set(weakAreas)],
  };
};

module.exports = {
  COURSE_CATEGORIES,
  COURSE_CATALOG,
  QUESTION_BANKS,
  GOVT_PORTALS,
  getSkillLearningCourses,
  getCourseById,
  getQuestionBank,
  evaluateTestAnswers,
};
