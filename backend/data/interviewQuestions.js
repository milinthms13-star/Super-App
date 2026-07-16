/**
 * Interview question banks for practice
 * Organized by role, level, and category
 */

const interviewQuestions = {
  'Software Developer': {
    beginner: {
      behavioral: [
        {
          text: 'Tell me about yourself and your journey into software development.',
          hints: ['Focus on relevant experience', 'Mention key projects', 'Show passion for coding'],
          keyPoints: ['Background', 'Technical skills', 'Career goals'],
        },
        {
          text: 'Why do you want to work as a software developer?',
          hints: ['Be genuine', 'Mention problem-solving', 'Talk about continuous learning'],
          keyPoints: ['Passion', 'Interest in technology', 'Growth mindset'],
        },
        {
          text: 'Describe a challenging bug you fixed.',
          hints: ['Use STAR method', 'Explain the debugging process', 'Mention tools used'],
          keyPoints: ['Problem identification', 'Debugging approach', 'Solution', 'Learning'],
        },
      ],
      technical: [
        {
          text: 'Explain the difference between var, let, and const in JavaScript.',
          hints: ['Discuss scope', 'Talk about hoisting', 'Mention mutability'],
          keyPoints: ['Block vs function scope', 'Reassignment', 'Hoisting behavior'],
        },
        {
          text: 'What is the difference between == and === in JavaScript?',
          hints: ['Type coercion', 'Strict equality', 'Best practices'],
          keyPoints: ['Type checking', 'Value checking', 'When to use each'],
        },
        {
          text: 'What is a callback function?',
          hints: ['Function as argument', 'Asynchronous operations', 'Examples'],
          keyPoints: ['Definition', 'Use cases', 'Example code'],
        },
      ],
      situational: [
        {
          text: 'How would you handle receiving negative feedback on your code during a review?',
          hints: ['Show openness to learning', 'Collaboration mindset', 'Growth from feedback'],
          keyPoints: ['Receptiveness', 'Learning attitude', 'Team collaboration'],
        },
      ],
      'problem-solving': [
        {
          text: 'How would you reverse a string in your preferred programming language?',
          hints: ['Discuss multiple approaches', 'Consider edge cases', 'Mention time complexity'],
          keyPoints: ['Algorithm', 'Implementation', 'Edge cases'],
        },
      ],
    },
    intermediate: {
      behavioral: [
        {
          text: 'Tell me about a time when you had to learn a new technology quickly for a project.',
          hints: ['STAR method', 'Show adaptability', 'Mention resources used'],
          keyPoints: ['Situation', 'Learning approach', 'Application', 'Outcome'],
        },
        {
          text: 'Describe a situation where you disagreed with a technical decision. How did you handle it?',
          hints: ['Professional disagreement', 'Data-driven arguments', 'Team collaboration'],
          keyPoints: ['Context', 'Your perspective', 'Discussion', 'Resolution'],
        },
      ],
      technical: [
        {
          text: 'Explain the concept of closures in JavaScript with an example.',
          hints: ['Lexical scope', 'Private variables', 'Practical use cases'],
          keyPoints: ['Definition', 'How it works', 'Common patterns', 'Example'],
        },
        {
          text: 'What is the difference between SQL and NoSQL databases? When would you use each?',
          hints: ['Data structure', 'Scalability', 'Use cases', 'Trade-offs'],
          keyPoints: ['Structured vs unstructured', 'ACID vs BASE', 'Use cases'],
        },
        {
          text: 'Explain RESTful API design principles.',
          hints: ['HTTP methods', 'Resource naming', 'Status codes', 'Statelessness'],
          keyPoints: ['REST constraints', 'Best practices', 'Common patterns'],
        },
      ],
      situational: [
        {
          text: 'Your team is behind schedule on a project. What would you do?',
          hints: ['Communication', 'Prioritization', 'Problem-solving'],
          keyPoints: ['Assessment', 'Action plan', 'Stakeholder communication'],
        },
      ],
      'problem-solving': [
        {
          text: 'Design a function to detect if a linked list has a cycle.',
          hints: ['Two-pointer technique', 'Time and space complexity', 'Edge cases'],
          keyPoints: ['Algorithm', 'Implementation', 'Complexity analysis'],
        },
      ],
    },
    advanced: {
      technical: [
        {
          text: 'Explain the event loop in JavaScript and how asynchronous operations work.',
          hints: ['Call stack', 'Task queue', 'Microtasks', 'Macrotasks'],
          keyPoints: ['Event loop phases', 'Promise queue', 'Callback queue'],
        },
        {
          text: 'How would you optimize the performance of a React application?',
          hints: ['Code splitting', 'Memoization', 'Virtual DOM', 'Bundle size'],
          keyPoints: ['React.memo', 'useMemo', 'Lazy loading', 'Profiling'],
        },
      ],
    },
  },

  'Data Scientist': {
    beginner: {
      behavioral: [
        {
          text: 'What interests you about data science?',
          hints: ['Passion for data', 'Problem-solving', 'Impact'],
          keyPoints: ['Interest in analytics', 'Learning journey', 'Career goals'],
        },
      ],
      technical: [
        {
          text: 'Explain the difference between supervised and unsupervised learning.',
          hints: ['Labeled vs unlabeled data', 'Use cases', 'Algorithms'],
          keyPoints: ['Definitions', 'Examples', 'When to use each'],
        },
        {
          text: 'What is the purpose of train-test split in machine learning?',
          hints: ['Overfitting', 'Generalization', 'Model evaluation'],
          keyPoints: ['Training', 'Validation', 'Testing'],
        },
      ],
    },
    intermediate: {
      technical: [
        {
          text: 'Explain the bias-variance tradeoff.',
          hints: ['Underfitting', 'Overfitting', 'Model complexity'],
          keyPoints: ['Bias definition', 'Variance definition', 'Balance'],
        },
        {
          text: 'How would you handle missing data in a dataset?',
          hints: ['Imputation techniques', 'Deletion', 'Domain knowledge'],
          keyPoints: ['Assessment', 'Methods', 'Impact on analysis'],
        },
      ],
    },
  },

  'Product Manager': {
    beginner: {
      behavioral: [
        {
          text: 'Why do you want to be a Product Manager?',
          hints: ['User focus', 'Strategy', 'Cross-functional work'],
          keyPoints: ['Motivation', 'Skills', 'Experience'],
        },
        {
          text: 'Tell me about a product you love and why.',
          hints: ['User experience', 'Problem it solves', 'Features'],
          keyPoints: ['Product analysis', 'User perspective', 'Business value'],
        },
      ],
      situational: [
        {
          text: 'How would you prioritize features for a product with limited resources?',
          hints: ['Impact vs effort', 'User needs', 'Business goals'],
          keyPoints: ['Framework', 'Stakeholders', 'Decision criteria'],
        },
      ],
    },
    intermediate: {
      behavioral: [
        {
          text: 'Describe a time when you had to make a decision with incomplete information.',
          hints: ['STAR method', 'Risk assessment', 'Data gathering'],
          keyPoints: ['Context', 'Decision process', 'Outcome', 'Learning'],
        },
      ],
      situational: [
        {
          text: 'Two key stakeholders have conflicting priorities. How do you handle it?',
          hints: ['Communication', 'Data-driven', 'Win-win solutions'],
          keyPoints: ['Understanding needs', 'Mediation', 'Decision framework'],
        },
      ],
    },
  },

  'Marketing Manager': {
    beginner: {
      behavioral: [
        {
          text: 'What do you think makes a successful marketing campaign?',
          hints: ['Target audience', 'Message', 'Channels', 'Metrics'],
          keyPoints: ['Strategy', 'Execution', 'Measurement'],
        },
      ],
      situational: [
        {
          text: 'How would you market a new product launch?',
          hints: ['Research', 'Positioning', 'Channels', 'Timeline'],
          keyPoints: ['Target audience', 'Strategy', 'Tactics', 'KPIs'],
        },
      ],
    },
  },

  'UI/UX Designer': {
    beginner: {
      behavioral: [
        {
          text: 'Walk me through your design process.',
          hints: ['Research', 'Ideation', 'Prototyping', 'Testing'],
          keyPoints: ['User research', 'Design', 'Iteration', 'Validation'],
        },
      ],
      technical: [
        {
          text: 'What is the difference between UI and UX?',
          hints: ['Visual vs experience', 'Scope', 'Goals'],
          keyPoints: ['UI definition', 'UX definition', 'How they work together'],
        },
      ],
    },
  },

  'Accountant': {
    beginner: {
      behavioral: [
        {
          text: 'Why did you choose accounting as a career?',
          hints: ['Interest in numbers', 'Business impact', 'Career stability'],
          keyPoints: ['Motivation', 'Skills', 'Goals'],
        },
      ],
      technical: [
        {
          text: 'Explain the difference between accounts payable and accounts receivable.',
          hints: ['Money owed vs money owed to you', 'Balance sheet', 'Cash flow'],
          keyPoints: ['Definitions', 'Impact on business', 'Management'],
        },
        {
          text: 'What are the three main financial statements?',
          hints: ['Income statement', 'Balance sheet', 'Cash flow'],
          keyPoints: ['Purpose of each', 'How they relate', 'Key metrics'],
        },
      ],
    },
  },
};

/**
 * Get interview questions for a specific role, level, and category
 */
function getQuestions(role, level, category) {
  const roleQuestions = interviewQuestions[role];
  if (!roleQuestions) return getDefaultQuestions(role, category);

  const levelQuestions = roleQuestions[level];
  if (!levelQuestions) return getDefaultQuestions(role, category);

  const categoryQuestions = levelQuestions[category];
  return categoryQuestions || getDefaultQuestions(role, category);
}

/**
 * Get default questions if specific ones not found
 */
function getDefaultQuestions(role, category) {
  const defaults = {
    behavioral: [
      {
        text: `Tell me about yourself and your experience relevant to ${role}.`,
        hints: ['Be concise', 'Focus on relevant experience', 'Show enthusiasm'],
        keyPoints: ['Background', 'Key achievements', 'Career goals'],
      },
      {
        text: 'What is your greatest strength?',
        hints: ['Be specific', 'Give examples', 'Relate to role'],
        keyPoints: ['Strength', 'Evidence', 'Application'],
      },
      {
        text: 'Describe a challenging project you worked on.',
        hints: ['Use STAR method', 'Show problem-solving', 'Highlight results'],
        keyPoints: ['Challenge', 'Actions', 'Outcome'],
      },
    ],
    technical: [
      {
        text: `What are the key skills required for a ${role}?`,
        hints: ['Technical skills', 'Soft skills', 'Industry knowledge'],
        keyPoints: ['Core competencies', 'Tools', 'Best practices'],
      },
    ],
    situational: [
      {
        text: 'How do you handle tight deadlines and pressure?',
        hints: ['Prioritization', 'Time management', 'Communication'],
        keyPoints: ['Approach', 'Examples', 'Results'],
      },
    ],
    'problem-solving': [
      {
        text: `Describe your approach to solving complex problems in ${role}.`,
        hints: ['Systematic approach', 'Analysis', 'Implementation'],
        keyPoints: ['Problem analysis', 'Solution design', 'Execution'],
      },
    ],
  };

  return defaults[category] || defaults.behavioral;
}

/**
 * Get all questions for a role
 */
function getAllQuestionsForRole(role) {
  const roleQuestions = interviewQuestions[role];
  if (!roleQuestions) return [];

  const allQuestions = [];
  Object.keys(roleQuestions).forEach(level => {
    Object.keys(roleQuestions[level]).forEach(category => {
      allQuestions.push(...roleQuestions[level][category]);
    });
  });

  return allQuestions;
}

module.exports = {
  getQuestions,
  getAllQuestionsForRole,
  interviewQuestions,
};
