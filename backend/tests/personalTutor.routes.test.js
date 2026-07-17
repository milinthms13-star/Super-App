const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const TutorSession = require('../models/TutorSession');
const LearningProgress = require('../models/LearningProgress');
const QuizResult = require('../models/QuizResult');
const InterviewPractice = require('../models/InterviewPractice');

describe('Personal Tutor Routes', () => {
  let authToken;
  let testSessionId;

  beforeAll(async () => {
    authToken = 'test-token-123';
  });

  afterAll(async () => {
    await TutorSession.deleteMany({ userEmail: 'test@tutor.com' });
    await LearningProgress.deleteMany({ userEmail: 'test@tutor.com' });
    await QuizResult.deleteMany({ userEmail: 'test@tutor.com' });
    await InterviewPractice.deleteMany({ userEmail: 'test@tutor.com' });
    await mongoose.connection.close();
  });

  describe('POST /api/tutor/sessions/start', () => {
    it('should start a new tutoring session', async () => {
      const sessionData = {
        subject: 'JavaScript',
        topic: 'Closures',
        difficulty: 'intermediate',
        learningGoal: 'Master closures and lexical scope',
      };

      const response = await request(app)
        .post('/api/tutor/sessions/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sessionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.session).toHaveProperty('sessionId');
      expect(response.body.data.session.subject).toBe('JavaScript');
      expect(response.body.data.session.topic).toBe('Closures');

      testSessionId = response.body.data.session.sessionId;
    });

    it('should require subject and topic', async () => {
      await request(app)
        .post('/api/tutor/sessions/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ subject: 'JavaScript' })
        .expect(400);
    });
  });

  describe('GET /api/tutor/sessions/:sessionId', () => {
    it('should get session details', async () => {
      const response = await request(app)
        .get(`/api/tutor/sessions/${testSessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.session.sessionId).toBe(testSessionId);
    });

    it('should return 404 for non-existent session', async () => {
      await request(app)
        .get('/api/tutor/sessions/non-existent-session')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /api/tutor/lessons/progress', () => {
    it('should record lesson progress', async () => {
      const progressData = {
        sessionId: testSessionId,
        lessonSection: 'Introduction to Closures',
        timeSpent: 300,
        comprehensionScore: 85,
        notes: 'Great lesson!',
      };

      const response = await request(app)
        .post('/api/tutor/lessons/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .send(progressData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.progress).toHaveProperty('progressId');
      expect(response.body.data.recommendation).toBeDefined();
    });

    it('should require valid sessionId', async () => {
      const progressData = {
        sessionId: 'invalid-session',
        lessonSection: 'Test',
        timeSpent: 100,
      };

      await request(app)
        .post('/api/tutor/lessons/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .send(progressData)
        .expect(404);
    });
  });

  describe('POST /api/tutor/quiz/generate', () => {
    it('should generate a quiz', async () => {
      const response = await request(app)
        .post('/api/tutor/quiz/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: testSessionId,
          questionCount: 5,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quiz).toHaveProperty('quizId');
      expect(response.body.data.quiz.questions).toHaveLength(5);
    });
  });

  describe('POST /api/tutor/quiz/submit', () => {
    let quizId;

    beforeAll(async () => {
      const quizResponse = await request(app)
        .post('/api/tutor/quiz/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sessionId: testSessionId, questionCount: 3 });
      
      quizId = quizResponse.body.data.quiz.quizId;
    });

    it('should submit quiz and get evaluation', async () => {
      const quizData = {
        sessionId: testSessionId,
        quizId,
        answers: [
          { questionId: 'q1', selectedAnswer: 0, question: { id: 'q1', correctAnswer: 0, points: 5 } },
          { questionId: 'q2', selectedAnswer: 1, question: { id: 'q2', correctAnswer: 2, points: 5 } },
        ],
      };

      const response = await request(app)
        .post('/api/tutor/quiz/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send(quizData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.result).toHaveProperty('score');
      expect(response.body.data.result).toHaveProperty('correct');
      expect(response.body.data.result).toHaveProperty('wrong');
      expect(response.body.data.insight).toBeDefined();
    });

    it('should require at least one answer', async () => {
      await request(app)
        .post('/api/tutor/quiz/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sessionId: testSessionId, quizId, answers: [] })
        .expect(400);
    });
  });

  describe('POST /api/tutor/interview/generate', () => {
    it('should generate interview questions', async () => {
      const params = {
        role: 'Software Developer',
        level: 'beginner',
        focusAreas: 'JavaScript, React',
        questionCount: 3,
      };

      const response = await request(app)
        .post('/api/tutor/interview/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(params)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.questions).toHaveLength(3);
      expect(response.body.data.questions[0]).toHaveProperty('question');
    });
  });

  describe('POST /api/tutor/interview/practice', () => {
    it('should evaluate interview response', async () => {
      const practiceData = {
        role: 'Software Developer',
        question: 'Tell me about yourself',
        response: 'I am a passionate software developer with 3 years of experience in JavaScript and React. I have worked on several projects involving complex state management and API integration. I achieved a 30% performance improvement in my last project by optimizing rendering.',
        timeSpent: 180,
      };

      const response = await request(app)
        .post('/api/tutor/interview/practice')
        .set('Authorization', `Bearer ${authToken}`)
        .send(practiceData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.evaluation).toHaveProperty('score');
      expect(response.body.data.evaluation).toHaveProperty('strengths');
      expect(response.body.data.evaluation).toHaveProperty('improvements');
      expect(response.body.data.insight).toBeDefined();
    });

    it('should require minimum response length', async () => {
      const practiceData = {
        role: 'Software Developer',
        question: 'Tell me about yourself',
        response: 'I am a developer',
        timeSpent: 60,
      };

      await request(app)
        .post('/api/tutor/interview/practice')
        .set('Authorization', `Bearer ${authToken}`)
        .send(practiceData)
        .expect(400);
    });
  });

  describe('GET /api/tutor/dashboard', () => {
    it('should return personalized dashboard', async () => {
      const response = await request(app)
        .get('/api/tutor/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('stats');
      expect(response.body.data).toHaveProperty('recentSessions');
      expect(response.body.data).toHaveProperty('topWeakAreas');
    });
  });

  describe('POST /api/tutor/sessions/:sessionId/complete', () => {
    it('should complete a session', async () => {
      const response = await request(app)
        .post(`/api/tutor/sessions/${testSessionId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toHaveProperty('sessionId');
      expect(response.body.data.recommendation).toBeDefined();
    });
  });

  describe('GET /api/tutor/progress/analytics', () => {
    it('should return progress analytics', async () => {
      const response = await request(app)
        .get('/api/tutor/progress/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ days: 30 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dailyTimeSpent');
      expect(response.body.data).toHaveProperty('comprehensionTrend');
      expect(response.body.data).toHaveProperty('quizScoreTrend');
    });

    it('should filter analytics by subject', async () => {
      const response = await request(app)
        .get('/api/tutor/progress/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ days: 30, subject: 'JavaScript' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
