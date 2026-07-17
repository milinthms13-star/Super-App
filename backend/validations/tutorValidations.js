const Joi = require('joi');

const validateTutorSessionStart = (data) => {
  const schema = Joi.object({
    subject: Joi.string().required().min(2).max(100),
    topic: Joi.string().required().min(2).max(200),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').default('beginner'),
    learningGoal: Joi.string().optional().max(500),
  });

  return schema.validate(data);
};

const validateLessonProgress = (data) => {
  const schema = Joi.object({
    sessionId: Joi.string().required(),
    lessonSection: Joi.string().required().min(2).max(200),
    timeSpent: Joi.number().required().min(0).max(3600),
    comprehensionScore: Joi.number().optional().min(0).max(100),
    notes: Joi.string().optional().max(1000),
  });

  return schema.validate(data);
};

const validateQuizSubmission = (data) => {
  const schema = Joi.object({
    sessionId: Joi.string().optional(),
    quizId: Joi.string().required(),
    answers: Joi.array().items(
      Joi.object({
        questionId: Joi.string().required(),
        selectedAnswer: Joi.alternatives().try(
          Joi.number(),
          Joi.string(),
          Joi.array()
        ).required(),
        question: Joi.object().optional(),
      })
    ).min(1).required(),
  });

  return schema.validate(data);
};

const validateInterviewPractice = (data) => {
  const schema = Joi.object({
    role: Joi.string().required().min(2).max(100),
    question: Joi.string().required().min(10).max(1000),
    response: Joi.string().required().min(20).max(5000),
    timeSpent: Joi.number().optional().min(0).max(3600),
  });

  return schema.validate(data);
};

module.exports = {
  validateTutorSessionStart,
  validateLessonProgress,
  validateQuizSubmission,
  validateInterviewPractice,
};
