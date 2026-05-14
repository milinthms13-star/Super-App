const COURSE_CATEGORIES = [
  { id: 'gulf-ready', title: 'Gulf Ready', description: 'Courses designed for Gulf job readiness and visa-linked skills.' },
  { id: 'kerala-career', title: 'Kerala Career', description: 'Regional learning pathways for Kerala placement and entrepreneurship.' },
  { id: 'it-software', title: 'IT & Software', description: 'Job-ready software, cloud and development courses.' },
  { id: 'hospitality', title: 'Hospitality', description: 'Hotel, travel and customer service career tracks.' },
  { id: 'government-exams', title: 'Government Exams', description: 'PSC, SSC, banking and public sector exam preparation.' },
];

const COURSE_CATALOG = [
  {
    id: 'gulf-hotel-operations-pro',
    title: 'Gulf Hotel Operations Pro',
    category: 'gulf-ready',
    level: 'Beginner',
    duration: '45 hours',
    language: 'English / Malayalam',
    price: 0,
    certificateAvailable: true,
    jobLinked: true,
    region: 'Gulf',
    totalModules: 8,
    rating: 4.7,
    tags: ['hotel', 'customer service', 'gulf', 'front desk'],
    description:
      'A Gulf-ready hospitality track for housekeeping, front desk, and guest relations careers with Kerala placement insights.',
    modules: [
      {
        title: 'Introduction to Gulf Hospitality',
        duration: '5h',
        lessons: [
          { title: 'Gulf service culture', videoUrl: 'https://www.youtube.com/embed/3Q0ixTqdyto' },
          { title: 'Job roles and expectations', videoUrl: 'https://www.youtube.com/embed/T2vX9xQJsfA' },
        ],
      },
      {
        title: 'Front Desk Fundamentals',
        duration: '6h',
        lessons: [
          { title: 'Guest onboarding', videoUrl: 'https://www.youtube.com/embed/4Wb4J6FLfI4' },
          { title: 'Communication templates', videoUrl: 'https://www.youtube.com/embed/4wUiotcGMww' },
        ],
      },
    ],
  },
  {
    id: 'kerala-digital-marketing',
    title: 'Kerala Digital Marketing Launchpad',
    category: 'kerala-career',
    level: 'Intermediate',
    duration: '32 hours',
    language: 'Malayalam / English',
    price: 1200,
    certificateAvailable: true,
    jobLinked: true,
    region: 'India',
    totalModules: 6,
    rating: 4.6,
    tags: ['digital marketing', 'freelancer', 'social media', 'ads'],
    description:
      'Practical digital marketing training for Kerala entrepreneurs, freelancers and local MSMEs.',
    modules: [
      {
        title: 'Digital marketing foundations',
        duration: '7h',
        lessons: [
          { title: 'Marketing fundamentals', videoUrl: 'https://www.youtube.com/embed/NG0K7Vx1E8U' },
          { title: 'Customer discovery', videoUrl: 'https://www.youtube.com/embed/hgnRqcDaZlA' },
        ],
      },
      {
        title: 'Campaigns, tools and reporting',
        duration: '8h',
        lessons: [
          { title: 'Facebook & Instagram ads', videoUrl: 'https://www.youtube.com/embed/4JrTFvmGBko' },
          { title: 'Performance reporting', videoUrl: 'https://www.youtube.com/embed/uaF1uxDONsY' },
        ],
      },
    ],
  },
  {
    id: 'it-cloud-support-engineer',
    title: 'IT Cloud Support Engineer',
    category: 'it-software',
    level: 'Advanced',
    duration: '60 hours',
    language: 'English',
    price: 2500,
    certificateAvailable: true,
    jobLinked: true,
    region: 'India/Gulf',
    totalModules: 9,
    rating: 4.8,
    tags: ['cloud', 'support', 'aws', 'azure', 'devops'],
    description:
      'Cloud support and helpdesk training with hands-on labs for global IT service desk roles.',
    modules: [
      {
        title: 'Cloud platform essentials',
        duration: '8h',
        lessons: [
          { title: 'AWS vs Azure vs Google Cloud', videoUrl: 'https://www.youtube.com/embed/4x15gzjLb84' },
          { title: 'Service desk best practices', videoUrl: 'https://www.youtube.com/embed/OjsMbRTJkUM' },
        ],
      },
      {
        title: 'Technical support workflows',
        duration: '7h',
        lessons: [
          { title: 'Incident management', videoUrl: 'https://www.youtube.com/embed/kK7L4t0f4CE' },
          { title: 'Ticketing tools', videoUrl: 'https://www.youtube.com/embed/eqE0b3zqRdw' },
        ],
      },
    ],
  },
  {
    id: 'hospitality-food-beverage',
    title: 'Hospitality & Food Service Essentials',
    category: 'hospitality',
    level: 'Beginner',
    duration: '40 hours',
    language: 'English / Malayalam',
    price: 800,
    certificateAvailable: true,
    jobLinked: true,
    region: 'India',
    totalModules: 5,
    rating: 4.5,
    tags: ['hospitality', 'food service', 'housekeeping', 'customer service'],
    description:
      'Entry-level hospitality track covering food service, housekeeping, and guest experience for Kerala and India roles.',
    modules: [
      {
        title: 'Guest service standards',
        duration: '5h',
        lessons: [
          { title: 'Service excellence', videoUrl: 'https://www.youtube.com/embed/MfWbSMm90Y4' },
          { title: 'Handling feedback', videoUrl: 'https://www.youtube.com/embed/EG0lt4t7eNU' },
        ],
      },
      {
        title: 'Food safety and operations',
        duration: '6h',
        lessons: [
          { title: 'Food safety basics', videoUrl: 'https://www.youtube.com/embed/j-6Xr9gcWmQ' },
          { title: 'Service flow', videoUrl: 'https://www.youtube.com/embed/E9BzTtYh7t8' },
        ],
      },
    ],
  },
  {
    id: 'government-exam-psc-pro',
    title: 'Kerala PSC & Banking Exam Fast Track',
    category: 'government-exams',
    level: 'Intermediate',
    duration: '50 hours',
    language: 'Malayalam / English',
    price: 0,
    certificateAvailable: false,
    jobLinked: true,
    region: 'India',
    totalModules: 7,
    rating: 4.4,
    tags: ['psc', 'banking', 'ssc', 'exam preparation', 'government'],
    description:
      'Focused test-prep course for Kerala PSC, banking exams and central government career routes.',
    modules: [
      {
        title: 'Exam strategy and syllabus',
        duration: '7h',
        lessons: [
          { title: 'Syllabus mapping', videoUrl: 'https://www.youtube.com/embed/27rUSXAhVe4' },
          { title: 'Time management', videoUrl: 'https://www.youtube.com/embed/1wiIpj4mnq4' },
        ],
      },
      {
        title: 'Practice and mock review',
        duration: '6h',
        lessons: [
          { title: 'Daily mock planning', videoUrl: 'https://www.youtube.com/embed/3j8m6M3hxE0' },
          { title: 'Weak area analysis', videoUrl: 'https://www.youtube.com/embed/Ia3Vg1oA_mo' },
        ],
      },
    ],
  },
];

const QUESTION_BANK = [
  {
    id: 'q-gulf-1',
    category: 'Gulf Ready',
    question: 'Which document is most important for Gulf hotel job interviews?',
    options: ['Passport copy', 'Bank statement', 'Driving licence', 'Rental agreement'],
    answer: 0,
    topic: 'documents',
  },
  {
    id: 'q-gulf-2',
    category: 'Gulf Ready',
    question: 'What is the usual probation period for Gulf hospitality jobs?',
    options: ['1 month', '3 months', '6 months', '12 months'],
    answer: 1,
    topic: 'employment terms',
  },
  {
    id: 'q-kerala-1',
    category: 'Kerala Career',
    question: 'Which skill is best for freelance digital gig work in Kerala?',
    options: ['Graphic design', 'Heavy machinery', 'Legal drafting', 'Hospitality'],
    answer: 0,
    topic: 'freelancing',
  },
  {
    id: 'q-it-1',
    category: 'IT & Software',
    question: 'Which is a common cloud support responsibility?',
    options: ['Database engineering', 'Server monitoring', 'Interior design', 'Tax filing'],
    answer: 1,
    topic: 'cloud support',
  },
  {
    id: 'q-hospitality-1',
    category: 'Hospitality',
    question: 'What is the preferred greeting for a hotel guest in Kerala?',
    options: ['Good evening', 'Vanakkam', 'Konnichiwa', 'Bonjour'],
    answer: 1,
    topic: 'guest service',
  },
  {
    id: 'q-govt-1',
    category: 'Government Exams',
    question: 'Which exam is a state-level career entry point in Kerala?',
    options: ['Kerala PSC', 'GATE', 'CAT', 'GRE'],
    answer: 0,
    topic: 'government exams',
  },
];

const GOVT_PORTALS = [
  {
    name: 'SWAYAM',
    description: 'India’s national online learning platform for certified courses.',
    url: 'https://swayam.gov.in',
  },
  {
    name: 'NPTEL',
    description: 'Technical and skill certification from top Indian institutes.',
    url: 'https://onlinecourses.nptel.ac.in',
  },
  {
    name: 'Skill India',
    description: 'NSDC-backed vocational training and placement support.',
    url: 'https://skillindia.gov.in',
  },
  {
    name: 'KASE',
    description: 'Kerala Academy for Skills Excellence for state-level skill development.',
    url: 'https://kase.in',
  },
  {
    name: 'NCS',
    description: 'National Career Service for job matching and course recommendations.',
    url: 'https://www.ncs.gov.in',
  },
];

const sampleSkills = [
  'Gulf hospitality',
  'Kerala digital marketing',
  'Cloud support',
  'Food service',
  'PSC practice',
  'Freelancing',
];

function normalizeText(value = '') {
  return String(value).trim().toLowerCase();
}

function getSkillLearningCourses(filters = {}) {
  const normalizedQuery = normalizeText(filters.query);

  return COURSE_CATALOG.filter((course) => {
    if (filters.category && course.category !== filters.category) {
      return false;
    }

    if (filters.level && normalizeText(course.level) !== normalizeText(filters.level)) {
      return false;
    }

    if (filters.language && normalizeText(course.language).indexOf(normalizeText(filters.language)) === -1) {
      return false;
    }

    if (filters.region && normalizeText(course.region).indexOf(normalizeText(filters.region)) === -1) {
      return false;
    }

    if (filters.isFree === true && course.price > 0) {
      return false;
    }

    if (filters.isFree === false && course.price === 0) {
      return false;
    }

    if (normalizedQuery) {
      const text = [course.title, course.description, course.tags.join(' '), course.category].join(' ').toLowerCase();
      if (!text.includes(normalizedQuery)) {
        return false;
      }
    }

    return true;
  });
}

function getCourseById(courseId) {
  return COURSE_CATALOG.find((course) => course.id === courseId) || null;
}

function getSkillRecommendations({ education, interests, salaryTarget, destination }) {
  const scores = COURSE_CATALOG.map((course) => {
    let score = 0;
    if (destination && normalizeText(course.region).includes(normalizeText(destination))) score += 3;
    if (salaryTarget && Number(salaryTarget) >= 15000 && course.tags.includes('cloud')) score += 2;
    if (education && normalizeText(education).includes('graduate') && course.category === 'it-software') score += 2;
    if (interests && normalizeText(interests).split(/[,\s]+/).some((term) => course.tags.includes(normalizeText(term)))) score += 2;
    if (course.price === 0) score += 1;
    return { course, score };
  });

  return scores
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0)
    .slice(0, 5)
    .map((item) => item.course.title);
}

function getQuestionBank(category) {
  const normalizedCategory = normalizeText(category);
  const filtered = QUESTION_BANK.filter(
    (question) => normalizeText(question.category).indexOf(normalizedCategory) !== -1
  );
  return filtered.length ? filtered : QUESTION_BANK;
}

module.exports = {
  COURSE_CATEGORIES,
  COURSE_CATALOG,
  GOVT_PORTALS,
  QUESTION_BANK,
  getSkillLearningCourses,
  getCourseById,
  getSkillRecommendations,
  getQuestionBank,
};
