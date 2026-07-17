/**
 * Question banks for quiz generation
 * Organized by subject, topic, and difficulty
 */

const questionBanks = {
  JavaScript: {
    'Variables and Data Types': {
      beginner: [
        {
          type: 'multiple-choice',
          question: 'Which keyword is used to declare a block-scoped variable in JavaScript?',
          options: ['var', 'let', 'const', 'function'],
          correctAnswer: 1,
          explanation: 'let is used to declare block-scoped variables that can be reassigned.',
        },
        {
          type: 'multiple-choice',
          question: 'What is the typeof null in JavaScript?',
          options: ['null', 'undefined', 'object', 'number'],
          correctAnswer: 2,
          explanation: 'typeof null returns "object" - this is a known quirk in JavaScript.',
        },
        {
          type: 'multiple-choice',
          question: 'Which of the following is NOT a primitive data type in JavaScript?',
          options: ['string', 'boolean', 'array', 'number'],
          correctAnswer: 2,
          explanation: 'Arrays are objects, not primitive types. Primitives include string, number, boolean, null, undefined, symbol, and bigint.',
        },
      ],
      intermediate: [
        {
          type: 'multiple-choice',
          question: 'What is the output of: console.log(typeof NaN)?',
          options: ['NaN', 'undefined', 'number', 'object'],
          correctAnswer: 2,
          explanation: 'NaN (Not-a-Number) is actually of type "number" in JavaScript.',
        },
      ],
      advanced: [
        {
          type: 'multiple-choice',
          question: 'What happens with: const obj = {}; Object.freeze(obj); obj.newProp = "test";',
          options: ['newProp is added', 'TypeError is thrown', 'SyntaxError', 'Silent failure'],
          correctAnswer: 3,
          explanation: 'In non-strict mode, assignment to frozen objects fails silently.',
        },
      ],
    },
    'Functions': {
      beginner: [
        {
          type: 'multiple-choice',
          question: 'How do you define a function in JavaScript?',
          options: ['def myFunc()', 'function myFunc()', 'function: myFunc()', 'myFunc function()'],
          correctAnswer: 1,
          explanation: 'Functions are declared using the function keyword followed by the name.',
        },
        {
          type: 'multiple-choice',
          question: 'What does a function return by default if no return statement is specified?',
          options: ['null', 'undefined', '0', 'false'],
          correctAnswer: 1,
          explanation: 'Functions return undefined by default when no explicit return is provided.',
        },
      ],
      intermediate: [
        {
          type: 'multiple-choice',
          question: 'What is a closure in JavaScript?',
          options: [
            'A way to close a file',
            'A function with access to its outer scope',
            'A type of loop',
            'An error handling mechanism'
          ],
          correctAnswer: 1,
          explanation: 'A closure is a function that has access to variables in its outer (lexical) scope.',
        },
      ],
    },
    'Async Programming': {
      intermediate: [
        {
          type: 'multiple-choice',
          question: 'What does async/await help with?',
          options: [
            'Making code run faster',
            'Writing asynchronous code that looks synchronous',
            'Compressing files',
            'Creating animations'
          ],
          correctAnswer: 1,
          explanation: 'async/await allows writing asynchronous code in a synchronous-looking style.',
        },
      ],
      advanced: [
        {
          type: 'multiple-choice',
          question: 'What happens if an async function throws an error?',
          options: [
            'The program crashes',
            'It returns a rejected Promise',
            'It returns undefined',
            'It logs to console'
          ],
          correctAnswer: 1,
          explanation: 'Async functions always return Promises. Thrown errors result in rejected Promises.',
        },
      ],
    },
  },

  Python: {
    'Basics': {
      beginner: [
        {
          type: 'multiple-choice',
          question: 'Which of the following is used to define a function in Python?',
          options: ['function', 'def', 'func', 'define'],
          correctAnswer: 1,
          explanation: 'In Python, functions are defined using the def keyword.',
        },
        {
          type: 'multiple-choice',
          question: 'What is the correct file extension for Python files?',
          options: ['.python', '.pt', '.py', '.pyt'],
          correctAnswer: 2,
          explanation: 'Python files use the .py extension.',
        },
      ],
    },
    'Data Structures': {
      beginner: [
        {
          type: 'multiple-choice',
          question: 'Which data structure is ordered and mutable in Python?',
          options: ['tuple', 'set', 'list', 'frozenset'],
          correctAnswer: 2,
          explanation: 'Lists are ordered and mutable (can be modified after creation).',
        },
      ],
      intermediate: [
        {
          type: 'multiple-choice',
          question: 'What is the time complexity of accessing an element in a dictionary?',
          options: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'],
          correctAnswer: 2,
          explanation: 'Dictionaries use hash tables, providing O(1) average-case lookup time.',
        },
      ],
    },
    'OOP': {
      intermediate: [
        {
          type: 'multiple-choice',
          question: 'What is the purpose of __init__ in Python classes?',
          options: [
            'To destroy an object',
            'To initialize an object',
            'To print an object',
            'To compare objects'
          ],
          correctAnswer: 1,
          explanation: '__init__ is the constructor method used to initialize object attributes.',
        },
      ],
    },
  },

  'Data Structures': {
    'Arrays': {
      beginner: [
        {
          type: 'multiple-choice',
          question: 'What is the time complexity of accessing an element by index in an array?',
          options: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'],
          correctAnswer: 2,
          explanation: 'Array access by index is O(1) - constant time operation.',
        },
      ],
      intermediate: [
        {
          type: 'multiple-choice',
          question: 'What is the time complexity of inserting an element at the beginning of an array?',
          options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
          correctAnswer: 2,
          explanation: 'Inserting at the beginning requires shifting all elements, making it O(n).',
        },
      ],
    },
    'Linked Lists': {
      intermediate: [
        {
          type: 'multiple-choice',
          question: 'What is an advantage of linked lists over arrays?',
          options: [
            'Faster access by index',
            'Better cache locality',
            'Dynamic size without reallocation',
            'Less memory usage'
          ],
          correctAnswer: 2,
          explanation: 'Linked lists can grow dynamically without needing to reallocate memory.',
        },
      ],
    },
  },

  'React': {
    'Components': {
      beginner: [
        {
          type: 'multiple-choice',
          question: 'What is a React component?',
          options: [
            'A CSS file',
            'A reusable piece of UI',
            'A database table',
            'A server endpoint'
          ],
          correctAnswer: 1,
          explanation: 'React components are reusable, independent pieces of UI.',
        },
      ],
      intermediate: [
        {
          type: 'multiple-choice',
          question: 'What hook is used to manage state in functional components?',
          options: ['useEffect', 'useState', 'useContext', 'useReducer'],
          correctAnswer: 1,
          explanation: 'useState is the primary hook for managing local state in functional components.',
        },
      ],
    },
  },

  'Accounting': {
    'Basics': {
      beginner: [
        {
          type: 'multiple-choice',
          question: 'What is the accounting equation?',
          options: [
            'Assets = Liabilities - Equity',
            'Assets = Liabilities + Equity',
            'Assets + Liabilities = Equity',
            'Assets - Equity = Liabilities'
          ],
          correctAnswer: 1,
          explanation: 'The fundamental accounting equation is Assets = Liabilities + Equity.',
        },
      ],
    },
    'GST': {
      intermediate: [
        {
          type: 'multiple-choice',
          question: 'What is the threshold for GST registration in India for services?',
          options: ['10 lakhs', '20 lakhs', '40 lakhs', '50 lakhs'],
          correctAnswer: 1,
          explanation: 'GST registration is mandatory for service providers with turnover exceeding 20 lakhs.',
        },
      ],
    },
  },
};

/**
 * Get questions for a specific subject, topic, and difficulty
 */
function getQuestions(subject, topic, difficulty) {
  const subjectBank = questionBanks[subject];
  if (!subjectBank) return [];

  const topicBank = subjectBank[topic];
  if (!topicBank) return [];

  const questions = topicBank[difficulty];
  return questions || [];
}

/**
 * Get all questions for a subject
 */
function getAllQuestionsForSubject(subject) {
  const subjectBank = questionBanks[subject];
  if (!subjectBank) return [];

  const allQuestions = [];
  Object.keys(subjectBank).forEach(topic => {
    Object.keys(subjectBank[topic]).forEach(difficulty => {
      allQuestions.push(...subjectBank[topic][difficulty]);
    });
  });

  return allQuestions;
}

// Import specialized question banks
const { getCAQuestions, getCASubjects, getCALevels } = require('./caQuestionBank');
const { 
  getCivilServicesQuestions, 
  getCivilServicesSubjects, 
  getCivilServicesLevels 
} = require('./civilServicesQuestionBank');

/**
 * Unified function to get questions from any bank
 */
function getQuestionsByDomain(domain, level, subject, difficulty) {
  if (domain === 'CA') {
    return getCAQuestions(level, subject, difficulty);
  } else if (domain === 'Civil Services') {
    return getCivilServicesQuestions(level, subject, difficulty);
  } else {
    // Default to programming questions
    return getQuestions(subject, level, difficulty);
  }
}

/**
 * Get subjects for a specific domain and level
 */
function getSubjectsByDomain(domain, level) {
  if (domain === 'CA') {
    return getCASubjects(level);
  } else if (domain === 'Civil Services') {
    return getCivilServicesSubjects(level);
  } else {
    return Object.keys(questionBanks[level] || {});
  }
}

/**
 * Get levels for a specific domain
 */
function getLevelsByDomain(domain) {
  if (domain === 'CA') {
    return getCALevels();
  } else if (domain === 'Civil Services') {
    return getCivilServicesLevels();
  } else {
    return Object.keys(questionBanks);
  }
}

module.exports = {
  getQuestions,
  getAllQuestionsForSubject,
  questionBanks,
  getQuestionsByDomain,
  getSubjectsByDomain,
  getLevelsByDomain,
};
