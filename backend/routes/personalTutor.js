const express = require('express');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const TutorSession = require('../models/TutorSession');
const LearningProgress = require('../models/LearningProgress');
const QuizResult = require('../models/QuizResult');
const InterviewPractice = require('../models/InterviewPractice');
const {
  validateTutorSessionStart,
  validateLessonProgress,
  validateQuizSubmission,
  validateInterviewPractice,
} = require('../validations/tutorValidations');
const {
  generateAdaptiveLesson,
  generateQuiz,
  evaluateQuizAnswers,
  generateInterviewQuestions,
  evaluateInterviewResponse,
  analyzeWeakAreas,
  recommendNextTopic,
} = require('../services/tutorAIService');
const logger = require('../config/logger');

const router = express.Router();

// POST /api/tutor/sessions/start - Start a new tutoring session
router.post('/sessions/start', authenticate, async (req, res) => {
  try {
    const { error, value } = validateTutorSessionStart(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { subject, topic, difficulty, learningGoal } = value;
    const userEmail = req.user.email;

    // Fetch user's learning history to personalize session
    const previousProgress = await LearningProgress.find({ userEmail, subject })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const weakAreas = analyzeWeakAreas(previousProgress);

    // Generate adaptive lesson content
    const lessonContent = await generateAdaptiveLesson({
      subject,
      topic,
      difficulty,
      learningGoal,
      weakAreas,
      previousProgress,
    });

    const session = new TutorSession({
      sessionId: `session-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      userEmail,
      subject,
      topic,
      difficulty,
      learningGoal,
      lessonContent,
      weakAreas,
      startedAt: new Date(),
      status: 'in_progress',
    });

    await session.save();

    res.json({
      success: true,
      data: {
        session: {
          sessionId: session.sessionId,
          subject: session.subject,
          topic: session.topic,
          difficulty: session.difficulty,
          lessonContent: session.lessonContent,
          weakAreas: session.weakAreas,
        },
      },
    });
  } catch (error) {
    logger.error('Error starting tutor session:', error);
    res.status(500).json({ success: false, error: 'Failed to start tutoring session' });
  }
});

// GET /api/tutor/sessions/:sessionId - Get session details
router.get('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userEmail = req.user.email;

    const session = await TutorSession.findOne({ sessionId, userEmail }).lean();
    
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({ success: true, data: { session } });
  } catch (error) {
    logger.error('Error fetching session:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch session' });
  }
});

// POST /api/tutor/lessons/progress - Record lesson progress
router.post('/lessons/progress', authenticate, async (req, res) => {
  try {
    const { error, value } = validateLessonProgress(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { sessionId, lessonSection, timeSpent, comprehensionScore, notes } = value;
    const userEmail = req.user.email;

    // Verify session exists
    const session = await TutorSession.findOne({ sessionId, userEmail });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const progress = new LearningProgress({
      progressId: `progress-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      userEmail,
      sessionId,
      subject: session.subject,
      topic: session.topic,
      lessonSection,
      timeSpent,
      comprehensionScore,
      notes,
      recordedAt: new Date(),
    });

    await progress.save();

    // Update session progress
    session.progressRecords = session.progressRecords || [];
    session.progressRecords.push(progress.progressId);
    session.totalTimeSpent = (session.totalTimeSpent || 0) + timeSpent;
    await session.save();

    // Recommend next topic based on progress
    const recommendation = await recommendNextTopic({
      subject: session.subject,
      currentTopic: session.topic,
      comprehensionScore,
      weakAreas: session.weakAreas,
    });

    res.json({
      success: true,
      data: {
        progress,
        recommendation,
      },
    });
  } catch (error) {
    logger.error('Error recording lesson progress:', error);
    res.status(500).json({ success: false, error: 'Failed to record progress' });
  }
});

// POST /api/tutor/quiz/generate - Generate adaptive quiz
router.post('/quiz/generate', authenticate, async (req, res) => {
  try {
    const { sessionId, questionCount = 10, difficulty, topics } = req.body;
    const userEmail = req.user.email;

    const session = await TutorSession.findOne({ sessionId, userEmail });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Generate quiz based on session content and weak areas
    const quiz = await generateQuiz({
      subject: session.subject,
      topic: session.topic,
      difficulty: difficulty || session.difficulty,
      questionCount,
      weakAreas: session.weakAreas,
      topics,
    });

    res.json({
      success: true,
      data: { quiz },
    });
  } catch (error) {
    logger.error('Error generating quiz:', error);
    res.status(500).json({ success: false, error: 'Failed to generate quiz' });
  }
});

// POST /api/tutor/quiz/submit - Submit quiz answers
router.post('/quiz/submit', authenticate, async (req, res) => {
  try {
    const { error, value } = validateQuizSubmission(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { sessionId, quizId, answers } = value;
    const userEmail = req.user.email;

    const session = await TutorSession.findOne({ sessionId, userEmail });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Evaluate answers
    const evaluation = await evaluateQuizAnswers(quizId, answers);

    const quizResult = new QuizResult({
      resultId: `result-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      userEmail,
      sessionId,
      quizId,
      answers,
      score: evaluation.score,
      correct: evaluation.correct,
      wrong: evaluation.wrong,
      weakTopics: evaluation.weakTopics,
      detailedFeedback: evaluation.detailedFeedback,
      completedAt: new Date(),
    });

    await quizResult.save();

    // Update session weak areas
    if (evaluation.weakTopics && evaluation.weakTopics.length > 0) {
      session.weakAreas = [...new Set([...(session.weakAreas || []), ...evaluation.weakTopics])];
      await session.save();
    }

    res.json({
      success: true,
      data: {
        result: {
          score: evaluation.score,
          correct: evaluation.correct,
          wrong: evaluation.wrong,
          weakTopics: evaluation.weakTopics,
          detailedFeedback: evaluation.detailedFeedback,
        },
        insight: evaluation.insight,
      },
    });
  } catch (error) {
    logger.error('Error submitting quiz:', error);
    res.status(500).json({ success: false, error: 'Failed to submit quiz' });
  }
});

// POST /api/tutor/interview/generate - Generate interview questions
router.post('/interview/generate', authenticate, async (req, res) => {
  try {
    const { role, level, focusAreas, questionCount = 5 } = req.body;
    const userEmail = req.user.email;

    // Fetch user's progress to tailor questions
    const recentProgress = await LearningProgress.find({ userEmail })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const questions = await generateInterviewQuestions({
      role,
      level,
      focusAreas,
      questionCount,
      userProgress: recentProgress,
    });

    res.json({
      success: true,
      data: { questions },
    });
  } catch (error) {
    logger.error('Error generating interview questions:', error);
    res.status(500).json({ success: false, error: 'Failed to generate interview questions' });
  }
});

// POST /api/tutor/interview/practice - Submit interview practice response
router.post('/interview/practice', authenticate, async (req, res) => {
  try {
    const { error, value } = validateInterviewPractice(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { role, question, response, timeSpent } = value;
    const userEmail = req.user.email;

    // Evaluate interview response using AI
    const evaluation = await evaluateInterviewResponse({
      role,
      question,
      response,
    });

    const practice = new InterviewPractice({
      practiceId: `practice-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      userEmail,
      role,
      question,
      response,
      evaluation: {
        score: evaluation.score,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        sampleAnswer: evaluation.sampleAnswer,
      },
      timeSpent,
      completedAt: new Date(),
    });

    await practice.save();

    res.json({
      success: true,
      data: {
        evaluation: practice.evaluation,
        insight: evaluation.insight,
      },
    });
  } catch (error) {
    logger.error('Error recording interview practice:', error);
    res.status(500).json({ success: false, error: 'Failed to record interview practice' });
  }
});

// GET /api/tutor/dashboard - Get personalized learning dashboard
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;

    // Fetch all user data
    const sessions = await TutorSession.find({ userEmail })
      .sort({ startedAt: -1 })
      .limit(10)
      .lean();

    const recentProgress = await LearningProgress.find({ userEmail })
      .sort({ recordedAt: -1 })
      .limit(20)
      .lean();

    const quizResults = await QuizResult.find({ userEmail })
      .sort({ completedAt: -1 })
      .limit(10)
      .lean();

    const interviewPractices = await InterviewPractice.find({ userEmail })
      .sort({ completedAt: -1 })
      .limit(10)
      .lean();

    // Calculate statistics
    const totalSessions = sessions.length;
    const totalTimeSpent = sessions.reduce((sum, s) => sum + (s.totalTimeSpent || 0), 0);
    const avgQuizScore = quizResults.length
      ? quizResults.reduce((sum, q) => sum + q.score, 0) / quizResults.length
      : 0;
    const avgInterviewScore = interviewPractices.length
      ? interviewPractices.reduce((sum, i) => sum + i.evaluation.score, 0) / interviewPractices.length
      : 0;

    // Analyze weak areas across all activities
    const allWeakAreas = [
      ...sessions.flatMap(s => s.weakAreas || []),
      ...quizResults.flatMap(q => q.weakTopics || []),
    ];
    const weakAreaCounts = {};
    allWeakAreas.forEach(area => {
      weakAreaCounts[area] = (weakAreaCounts[area] || 0) + 1;
    });
    const topWeakAreas = Object.entries(weakAreaCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([area]) => area);

    res.json({
      success: true,
      data: {
        stats: {
          totalSessions,
          totalTimeSpent,
          avgQuizScore: Math.round(avgQuizScore),
          avgInterviewScore: Math.round(avgInterviewScore),
        },
        recentSessions: sessions.slice(0, 5),
        topWeakAreas,
        recentProgress: recentProgress.slice(0, 10),
        recentQuizzes: quizResults.slice(0, 5),
        recentInterviews: interviewPractices.slice(0, 5),
      },
    });
  } catch (error) {
    logger.error('Error fetching tutor dashboard:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard' });
  }
});

// POST /api/tutor/sessions/:sessionId/complete - Complete a session
router.post('/sessions/:sessionId/complete', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userEmail = req.user.email;

    const session = await TutorSession.findOne({ sessionId, userEmail });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    session.status = 'completed';
    session.completedAt = new Date();
    await session.save();

    // Generate session summary and recommendations
    const summary = {
      sessionId: session.sessionId,
      subject: session.subject,
      topic: session.topic,
      totalTimeSpent: session.totalTimeSpent || 0,
      progressRecordsCount: session.progressRecords?.length || 0,
      weakAreas: session.weakAreas || [],
    };

    const recommendation = await recommendNextTopic({
      subject: session.subject,
      currentTopic: session.topic,
      weakAreas: session.weakAreas,
    });

    res.json({
      success: true,
      data: {
        summary,
        recommendation,
      },
    });
  } catch (error) {
    logger.error('Error completing session:', error);
    res.status(500).json({ success: false, error: 'Failed to complete session' });
  }
});

// GET /api/tutor/progress/analytics - Get detailed progress analytics
router.get('/progress/analytics', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { subject, days = 30 } = req.query;

    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - Number(days));

    let filter = { userEmail, recordedAt: { $gte: dateFilter } };
    if (subject) {
      filter.subject = subject;
    }

    const progressData = await LearningProgress.find(filter)
      .sort({ recordedAt: 1 })
      .lean();

    const quizData = await QuizResult.find({
      userEmail,
      completedAt: { $gte: dateFilter },
    })
      .sort({ completedAt: 1 })
      .lean();

    // Calculate trends
    const dailyTimeSpent = {};
    const comprehensionTrend = [];
    const quizScoreTrend = [];

    progressData.forEach(p => {
      const date = p.recordedAt.toISOString().split('T')[0];
      dailyTimeSpent[date] = (dailyTimeSpent[date] || 0) + p.timeSpent;
      comprehensionTrend.push({
        date: p.recordedAt,
        score: p.comprehensionScore,
        topic: p.topic,
      });
    });

    quizData.forEach(q => {
      quizScoreTrend.push({
        date: q.completedAt,
        score: q.score,
      });
    });

    res.json({
      success: true,
      data: {
        dailyTimeSpent,
        comprehensionTrend,
        quizScoreTrend,
        totalSessions: progressData.length,
        totalQuizzes: quizData.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching progress analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
