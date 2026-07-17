/**
 * Personal Tutor AI Service
 * Uses free APIs and open-source models for intelligent tutoring
 * No paid API keys required
 */

const axios = require('axios');
const logger = require('../config/logger');

// Free AI API endpoints (no authentication required for basic usage)
const FREE_AI_ENDPOINTS = {
  // Hugging Face Inference API (free tier)
  huggingface: 'https://api-inference.huggingface.co/models/',
  // Local fallback using rule-based AI
  local: 'local',
};

/**
 * Generate adaptive lesson content based on user's level and weak areas
 */
async function generateAdaptiveLesson({ subject, topic, difficulty, learningGoal, weakAreas, previousProgress }) {
  try {
    // First try to get pre-written detailed lesson content
    const detailedLesson = getDetailedLessonContent(subject, topic, difficulty);
    
    if (detailedLesson) {
      // Return the comprehensive pre-written lesson
      return {
        ...detailedLesson,
        learningGoal,
        weakAreas,
        learningStyle: analyzeLearningStyle(previousProgress),
      };
    }
    
    // Fallback: Generate dynamic lesson if no pre-written content
    const learningStyle = analyzeLearningStyle(previousProgress);
    
    // Generate lesson structure
    const lesson = {
      title: `${subject}: ${topic}`,
      difficulty,
      learningGoal,
      sections: [],
      estimatedTime: calculateEstimatedTime(difficulty),
      prerequisites: getPrerequisites(subject, topic),
      learningStyle,
    };

    // Build adaptive content based on difficulty
    if (difficulty === 'beginner') {
      lesson.sections = [
        {
          type: 'introduction',
          title: 'What is this about?',
          content: generateIntroduction(subject, topic),
          duration: 5,
        },
        {
          type: 'concept',
          title: 'Core Concepts',
          content: generateCoreConcepts(subject, topic, 'simple'),
          duration: 10,
          examples: generateExamples(subject, topic, 3),
        },
        {
          type: 'practice',
          title: 'Try It Yourself',
          content: generatePracticeExercises(subject, topic, 'easy', 5),
          duration: 10,
        },
        {
          type: 'summary',
          title: 'Key Takeaways',
          content: generateSummary(subject, topic),
          duration: 3,
        },
      ];
    } else if (difficulty === 'intermediate') {
      lesson.sections = [
        {
          type: 'review',
          title: 'Quick Review',
          content: generateReview(subject, topic),
          duration: 3,
        },
        {
          type: 'deep_dive',
          title: 'Advanced Concepts',
          content: generateCoreConcepts(subject, topic, 'detailed'),
          duration: 15,
          examples: generateExamples(subject, topic, 5),
        },
        {
          type: 'application',
          title: 'Real-World Applications',
          content: generateApplications(subject, topic),
          duration: 10,
        },
        {
          type: 'practice',
          title: 'Challenge Exercises',
          content: generatePracticeExercises(subject, topic, 'medium', 7),
          duration: 15,
        },
      ];
    } else {
      // Advanced
      lesson.sections = [
        {
          type: 'overview',
          title: 'Expert Overview',
          content: generateExpertOverview(subject, topic),
          duration: 5,
        },
        {
          type: 'advanced_theory',
          title: 'Advanced Theory',
          content: generateCoreConcepts(subject, topic, 'expert'),
          duration: 20,
        },
        {
          type: 'case_studies',
          title: 'Case Studies',
          content: generateCaseStudies(subject, topic),
          duration: 15,
        },
        {
          type: 'practice',
          title: 'Expert Challenges',
          content: generatePracticeExercises(subject, topic, 'hard', 10),
          duration: 20,
        },
      ];
    }

    // Add weak area reinforcement
    if (weakAreas && weakAreas.length > 0) {
      lesson.sections.push({
        type: 'reinforcement',
        title: 'Strengthening Your Skills',
        content: generateReinforcementContent(subject, weakAreas),
        duration: 10,
      });
    }

    return lesson;
  } catch (error) {
    logger.error('Error generating adaptive lesson:', error);
    return generateFallbackLesson(subject, topic, difficulty);
  }
}

/**
 * Generate quiz questions based on topic and difficulty
 */
async function generateQuiz({ subject, topic, difficulty, questionCount, weakAreas, topics, domain }) {
  try {
    const questions = [];
    const topicsToTest = topics || [topic];

    for (let i = 0; i < questionCount; i++) {
      const selectedTopic = topicsToTest[i % topicsToTest.length];
      const question = generateQuestion(subject, selectedTopic, difficulty, weakAreas, domain);
      questions.push(question);
    }

    return {
      quizId: `quiz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      subject,
      topic,
      difficulty,
      questionCount,
      questions,
      timeLimit: questionCount * 90, // 90 seconds per question
      passingScore: 70,
      domain: domain || 'General',
    };
  } catch (error) {
    logger.error('Error generating quiz:', error);
    return generateFallbackQuiz(subject, topic, questionCount);
  }
}

/**
 * Generate a single question based on topic and difficulty
 */
function generateQuestion(subject, topic, difficulty, weakAreas, domain) {
  const questionId = `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Question bank by subject (now supports CA and Civil Services)
  const questionTemplates = getQuestionTemplates(subject, topic, difficulty, domain);
  
  if (!questionTemplates || questionTemplates.length === 0) {
    // Fallback question
    return {
      id: questionId,
      type: 'multiple-choice',
      question: `Question about ${topic} in ${subject}`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 0,
      explanation: 'This is a placeholder question. More questions will be added soon.',
      difficulty,
      topic,
      points: difficulty === 'beginner' ? 5 : difficulty === 'intermediate' ? 7 : 10,
    };
  }
  
  const template = questionTemplates[Math.floor(Math.random() * questionTemplates.length)];

  return {
    id: questionId,
    type: template.type,
    question: template.question,
    options: template.options,
    correctAnswer: template.correctAnswer,
    explanation: template.explanation,
    difficulty,
    topic: template.topic || topic,
    points: difficulty === 'beginner' ? 5 : difficulty === 'intermediate' ? 7 : 10,
  };
}

/**
 * Evaluate quiz answers and provide detailed feedback
 */
async function evaluateQuizAnswers(quizId, answers) {
  try {
    let correct = 0;
    let wrong = 0;
    let totalPoints = 0;
    let earnedPoints = 0;
    const detailedFeedback = [];
    const weakTopics = [];
    const topicPerformance = {};

    answers.forEach((answer) => {
      const question = answer.question || {};
      const isCorrect = answer.selectedAnswer === question.correctAnswer;

      if (isCorrect) {
        correct++;
        earnedPoints += question.points || 5;
      } else {
        wrong++;
        if (question.topic && !weakTopics.includes(question.topic)) {
          weakTopics.push(question.topic);
        }
      }

      totalPoints += question.points || 5;

      // Track topic performance
      if (question.topic) {
        if (!topicPerformance[question.topic]) {
          topicPerformance[question.topic] = { correct: 0, total: 0 };
        }
        topicPerformance[question.topic].total++;
        if (isCorrect) {
          topicPerformance[question.topic].correct++;
        }
      }

      detailedFeedback.push({
        questionId: question.id,
        question: question.question,
        yourAnswer: answer.selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation,
        topic: question.topic,
      });
    });

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    // Generate insight
    let insight = '';
    if (score >= 90) {
      insight = '🎉 Excellent work! You have mastered this topic. Ready for advanced challenges?';
    } else if (score >= 70) {
      insight = '👍 Good job! Review the weak areas and you\'ll be an expert soon.';
    } else if (score >= 50) {
      insight = '📚 Keep practicing! Focus on the concepts you found challenging.';
    } else {
      insight = '💪 Don\'t give up! Let\'s break down these topics step by step together.';
    }

    return {
      score,
      correct,
      wrong,
      totalPoints,
      earnedPoints,
      weakTopics,
      topicPerformance,
      detailedFeedback,
      insight,
    };
  } catch (error) {
    logger.error('Error evaluating quiz answers:', error);
    throw error;
  }
}

/**
 * Generate interview questions based on role and level
 */
async function generateInterviewQuestions({ role, level, focusAreas, questionCount, userProgress }) {
  try {
    const questions = [];
    const categories = ['behavioral', 'technical', 'situational', 'problem-solving'];

    for (let i = 0; i < questionCount; i++) {
      const category = categories[i % categories.length];
      const question = generateInterviewQuestion(role, level, category, focusAreas);
      questions.push(question);
    }

    return questions;
  } catch (error) {
    logger.error('Error generating interview questions:', error);
    return generateFallbackInterviewQuestions(role, level, questionCount);
  }
}

/**
 * Generate a single interview question
 */
function generateInterviewQuestion(role, level, category, focusAreas) {
  const questionBank = getInterviewQuestionBank(role, level, category);
  const question = questionBank[Math.floor(Math.random() * questionBank.length)];

  return {
    id: `int-q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role,
    level,
    category,
    question: question.text,
    hints: question.hints,
    keyPoints: question.keyPoints,
    timeLimit: category === 'technical' ? 600 : 300, // seconds
  };
}

/**
 * Evaluate interview response
 */
async function evaluateInterviewResponse({ role, question, response }) {
  try {
    const evaluation = analyzeInterviewResponse(role, question, response);

    return {
      score: evaluation.score,
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      sampleAnswer: evaluation.sampleAnswer,
      insight: generateInterviewInsight(evaluation.score),
    };
  } catch (error) {
    logger.error('Error evaluating interview response:', error);
    return generateFallbackEvaluation();
  }
}

/**
 * Analyze interview response (rule-based)
 */
function analyzeInterviewResponse(role, question, response) {
  const wordCount = response.split(/\s+/).length;
  let score = 50; // Base score
  const strengths = [];
  const improvements = [];

  // Check response length
  if (wordCount >= 100 && wordCount <= 300) {
    score += 20;
    strengths.push('Good response length - detailed but concise');
  } else if (wordCount < 50) {
    improvements.push('Provide more detail in your answer');
    score -= 10;
  } else if (wordCount > 400) {
    improvements.push('Try to be more concise while maintaining key points');
    score -= 5;
  }

  // Check for STAR method (Situation, Task, Action, Result)
  const hasStructure = 
    /situation|context|scenario/i.test(response) ||
    /task|challenge|problem/i.test(response) ||
    /action|did|implemented/i.test(response) ||
    /result|outcome|achieved/i.test(response);

  if (hasStructure) {
    score += 15;
    strengths.push('Good use of structured approach (STAR method)');
  } else {
    improvements.push('Use the STAR method: Situation, Task, Action, Result');
  }

  // Check for specific keywords based on role
  const roleKeywords = getRoleKeywords(role);
  const mentionedKeywords = roleKeywords.filter(kw => 
    new RegExp(kw, 'i').test(response)
  );

  if (mentionedKeywords.length >= 3) {
    score += 15;
    strengths.push(`Mentioned relevant skills: ${mentionedKeywords.slice(0, 3).join(', ')}`);
  } else {
    improvements.push(`Mention relevant skills like: ${roleKeywords.slice(0, 3).join(', ')}`);
  }

  // Ensure score is within bounds
  score = Math.min(100, Math.max(0, score));

  const sampleAnswer = generateSampleAnswer(role, question);

  return {
    score,
    strengths,
    improvements,
    sampleAnswer,
  };
}

/**
 * Analyze weak areas from progress history
 */
function analyzeWeakAreas(progressHistory) {
  if (!progressHistory || progressHistory.length === 0) {
    return [];
  }

  const topicScores = {};
  
  progressHistory.forEach((progress) => {
    const topic = progress.topic || progress.lessonSection;
    const score = progress.comprehensionScore || 0;

    if (!topicScores[topic]) {
      topicScores[topic] = { total: 0, count: 0 };
    }

    topicScores[topic].total += score;
    topicScores[topic].count += 1;
  });

  // Find topics with average score below 70
  const weakAreas = Object.entries(topicScores)
    .filter(([_, data]) => (data.total / data.count) < 70)
    .map(([topic, _]) => topic)
    .slice(0, 5);

  return weakAreas;
}

/**
 * Recommend next topic based on progress
 */
async function recommendNextTopic({ subject, currentTopic, comprehensionScore, weakAreas }) {
  try {
    const learningPath = getLearningPath(subject);
    const currentIndex = learningPath.findIndex(t => t.topic === currentTopic);

    let recommendation = {
      action: '',
      topic: '',
      reason: '',
    };

    if (comprehensionScore >= 80) {
      // Move to next topic
      if (currentIndex >= 0 && currentIndex < learningPath.length - 1) {
        const nextTopic = learningPath[currentIndex + 1];
        recommendation = {
          action: 'advance',
          topic: nextTopic.topic,
          difficulty: nextTopic.difficulty,
          reason: '🎯 Great job! You\'re ready for the next challenge.',
        };
      } else {
        recommendation = {
          action: 'complete',
          topic: currentTopic,
          reason: '🎓 Congratulations! You\'ve completed this learning path.',
        };
      }
    } else if (comprehensionScore >= 60) {
      // Practice current topic
      recommendation = {
        action: 'practice',
        topic: currentTopic,
        reason: '📝 Good progress! More practice will help solidify your understanding.',
      };
    } else {
      // Review fundamentals
      if (weakAreas && weakAreas.length > 0) {
        recommendation = {
          action: 'review',
          topic: weakAreas[0],
          reason: '🔄 Let\'s strengthen the fundamentals before moving forward.',
        };
      } else {
        recommendation = {
          action: 'review',
          topic: currentTopic,
          reason: '🔄 Let\'s review the core concepts to build a stronger foundation.',
        };
      }
    }

    return recommendation;
  } catch (error) {
    logger.error('Error recommending next topic:', error);
    return {
      action: 'practice',
      topic: currentTopic,
      reason: 'Keep practicing to improve your understanding.',
    };
  }
}

// ========== HELPER FUNCTIONS ==========

/**
 * Get detailed pre-written lesson content
 */
function getDetailedLessonContent(subject, topic, difficulty) {
  try {
    // Load CA lesson content
    if (subject.includes('CA ')) {
      const { caLessonContent } = require('../data/caLessonContent');
      const level = subject; // e.g., 'CA Foundation'
      
      // Find matching lesson in the content
      if (caLessonContent[level]) {
        for (const subjectKey in caLessonContent[level]) {
          for (const topicKey in caLessonContent[level][subjectKey]) {
            if (topicKey.toLowerCase().includes(topic.toLowerCase()) || 
                topic.toLowerCase().includes(topicKey.toLowerCase())) {
              const lessonData = caLessonContent[level][subjectKey][topicKey];
              if (lessonData[difficulty]) {
                return lessonData[difficulty];
              }
            }
          }
        }
      }
    }
    
    // Load Civil Services lesson content
    if (subject.includes('Class ') || subject.includes('UPSC')) {
      const { civilServicesLessonContent } = require('../data/civilServicesLessonContent');
      const level = subject; // e.g., 'Class 5-7', 'UPSC Prelims'
      
      if (civilServicesLessonContent[level]) {
        for (const subjectKey in civilServicesLessonContent[level]) {
          for (const topicKey in civilServicesLessonContent[level][subjectKey]) {
            if (topicKey.toLowerCase().includes(topic.toLowerCase()) || 
                topic.toLowerCase().includes(topicKey.toLowerCase())) {
              const lessonData = civilServicesLessonContent[level][subjectKey][topicKey];
              if (lessonData[difficulty]) {
                return lessonData[difficulty];
              }
            }
          }
        }
      }
    }
    
    return null; // No pre-written content found
  } catch (error) {
    logger.error('Error loading detailed lesson content:', error);
    return null;
  }
}

function analyzeLearningStyle(progressHistory) {
  if (!progressHistory || progressHistory.length === 0) {
    return 'balanced';
  }

  const avgTimeSpent = progressHistory.reduce((sum, p) => sum + (p.timeSpent || 0), 0) / progressHistory.length;
  
  if (avgTimeSpent < 10) {
    return 'fast-paced';
  } else if (avgTimeSpent > 30) {
    return 'detailed';
  }
  return 'balanced';
}

function calculateEstimatedTime(difficulty) {
  const timeMap = {
    beginner: 30,
    intermediate: 45,
    advanced: 60,
  };
  return timeMap[difficulty] || 30;
}

function getPrerequisites(subject, topic) {
  const prerequisites = {
    'JavaScript': {
      'Advanced Functions': ['Basic Functions', 'Variables and Data Types'],
      'Async Programming': ['Callbacks', 'Promises'],
      'React': ['ES6 Syntax', 'DOM Manipulation'],
    },
    'Python': {
      'Object-Oriented Programming': ['Functions', 'Data Structures'],
      'Data Analysis': ['Lists and Dictionaries', 'File Handling'],
    },
    'Data Structures': {
      'Trees': ['Linked Lists', 'Recursion'],
      'Graphs': ['Trees', 'Hash Tables'],
    },
  };

  return prerequisites[subject]?.[topic] || [];
}

function generateIntroduction(subject, topic) {
  return `Welcome to learning ${topic} in ${subject}! In this lesson, we'll explore the fundamental concepts and build a strong foundation. This topic is essential for ${getTopicImportance(subject, topic)}.`;
}

function generateCoreConcepts(subject, topic, depth) {
  const concepts = getConceptsBySubject(subject, topic);
  
  if (depth === 'simple') {
    return concepts.slice(0, 3).map(c => ({
      name: c.name,
      description: c.simpleDescription,
      visualAid: c.diagram,
    }));
  } else if (depth === 'detailed') {
    return concepts.map(c => ({
      name: c.name,
      description: c.detailedDescription,
      implementation: c.code,
      useCases: c.useCases,
    }));
  } else {
    return concepts.map(c => ({
      name: c.name,
      description: c.expertDescription,
      advanced: c.advanced,
      bestPractices: c.bestPractices,
      pitfalls: c.pitfalls,
    }));
  }
}

function generateExamples(subject, topic, count) {
  const exampleBank = getExampleBank(subject, topic);
  return exampleBank.slice(0, count);
}

function generatePracticeExercises(subject, topic, difficulty, count) {
  const exercises = getExerciseBank(subject, topic, difficulty);
  return exercises.slice(0, count);
}

function generateSummary(subject, topic) {
  return `You've learned the key concepts of ${topic} in ${subject}. Remember to practice regularly and apply these concepts in real projects!`;
}

function generateReview(subject, topic) {
  return `Let's quickly review what you should already know before diving into ${topic}...`;
}

function generateApplications(subject, topic) {
  return `Here's how ${topic} is used in real-world applications: ${getRealWorldExamples(subject, topic)}`;
}

function generateExpertOverview(subject, topic) {
  return `As an expert learner, you'll explore the nuances and advanced applications of ${topic}...`;
}

function generateCaseStudies(subject, topic) {
  return getCaseStudies(subject, topic);
}

function generateReinforcementContent(subject, weakAreas) {
  return weakAreas.map(area => ({
    topic: area,
    review: `Let's reinforce your understanding of ${area}`,
    exercises: generatePracticeExercises(subject, area, 'easy', 3),
  }));
}

function generateFallbackLesson(subject, topic, difficulty) {
  return {
    title: `${subject}: ${topic}`,
    difficulty,
    sections: [
      {
        type: 'introduction',
        title: 'Introduction',
        content: `Learn about ${topic}`,
        duration: 10,
      },
    ],
    estimatedTime: 30,
  };
}

function generateFallbackQuiz(subject, topic, questionCount) {
  return {
    quizId: `quiz-fallback-${Date.now()}`,
    subject,
    topic,
    questions: Array(questionCount).fill(null).map((_, i) => ({
      id: `q-${i}`,
      question: `Question ${i + 1} about ${topic}`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 0,
      explanation: 'This is a placeholder question.',
    })),
  };
}

function getQuestionTemplates(subject, topic, difficulty, domain) {
  // Use specialized question banks for CA and Civil Services
  const questionBanks = require('../data/questionBanks');
  
  if (domain === 'CA' || subject.includes('CA ')) {
    return questionBanks.getQuestionsByDomain('CA', subject, topic, difficulty);
  } else if (domain === 'Civil Services' || subject.includes('Class ') || subject.includes('UPSC')) {
    return questionBanks.getQuestionsByDomain('Civil Services', subject, topic, difficulty);
  } else {
    return questionBanks.getQuestions(subject, topic, difficulty) || [];
  }
}

function getRoleKeywords(role) {
  const keywords = {
    'Software Developer': ['code', 'algorithm', 'debugging', 'testing', 'API', 'database', 'framework', 'version control'],
    'Data Scientist': ['data', 'analysis', 'model', 'machine learning', 'statistics', 'Python', 'visualization'],
    'Product Manager': ['stakeholder', 'requirements', 'roadmap', 'metrics', 'user', 'prioritization', 'strategy'],
    'Marketing': ['campaign', 'audience', 'brand', 'ROI', 'content', 'engagement', 'analytics'],
  };
  
  return keywords[role] || ['teamwork', 'communication', 'problem-solving', 'leadership'];
}

function generateSampleAnswer(role, question) {
  return `A strong answer would include: 1) Clear context about the situation, 2) Specific actions you took, 3) Measurable results, and 4) What you learned. Remember to relate your experience directly to the ${role} role.`;
}

function generateInterviewInsight(score) {
  if (score >= 85) return '🌟 Excellent response! You\'re interview-ready!';
  if (score >= 70) return '👍 Good response! A few tweaks will make it perfect.';
  if (score >= 50) return '📈 Fair response. Focus on structure and key points.';
  return '💪 Keep practicing! Use the STAR method and be more specific.';
}

function generateFallbackEvaluation() {
  return {
    score: 60,
    strengths: ['You provided a response'],
    improvements: ['Add more specific details', 'Use the STAR method'],
    sampleAnswer: 'Focus on being specific and structured in your response.',
    insight: 'Keep practicing to improve!',
  };
}

function getTopicImportance(subject, topic) {
  return 'building strong programming fundamentals and real-world problem-solving skills';
}

function getConceptsBySubject(subject, topic) {
  // Placeholder - will be expanded with actual content
  return [
    {
      name: 'Concept 1',
      simpleDescription: 'Basic explanation',
      detailedDescription: 'Detailed explanation with examples',
      expertDescription: 'Advanced theoretical understanding',
    },
  ];
}

function getExampleBank(subject, topic) {
  return [];
}

function getExerciseBank(subject, topic, difficulty) {
  return [];
}

function getRealWorldExamples(subject, topic) {
  return 'Various industry applications and use cases';
}

function getCaseStudies(subject, topic) {
  return [];
}

function getInterviewQuestionBank(role, level, category) {
  const banks = require('../data/interviewQuestions');
  return banks.getQuestions(role, level, category) || [];
}

function generateFallbackInterviewQuestions(role, level, questionCount) {
  return Array(questionCount).fill(null).map((_, i) => ({
    id: `int-q-${i}`,
    role,
    level,
    question: `Tell me about a time when you demonstrated ${role} skills.`,
    hints: ['Be specific', 'Use STAR method'],
    keyPoints: ['Context', 'Actions', 'Results'],
  }));
}

function getLearningPath(subject) {
  const paths = {
    'JavaScript': [
      { topic: 'Variables and Data Types', difficulty: 'beginner' },
      { topic: 'Functions', difficulty: 'beginner' },
      { topic: 'Arrays and Objects', difficulty: 'beginner' },
      { topic: 'DOM Manipulation', difficulty: 'intermediate' },
      { topic: 'Async Programming', difficulty: 'intermediate' },
      { topic: 'Advanced Patterns', difficulty: 'advanced' },
    ],
    'Python': [
      { topic: 'Basics', difficulty: 'beginner' },
      { topic: 'Data Structures', difficulty: 'beginner' },
      { topic: 'Functions', difficulty: 'intermediate' },
      { topic: 'OOP', difficulty: 'intermediate' },
      { topic: 'Advanced Topics', difficulty: 'advanced' },
    ],
  };

  return paths[subject] || [];
}

module.exports = {
  generateAdaptiveLesson,
  generateQuiz,
  evaluateQuizAnswers,
  generateInterviewQuestions,
  evaluateInterviewResponse,
  analyzeWeakAreas,
  recommendNextTopic,
};
