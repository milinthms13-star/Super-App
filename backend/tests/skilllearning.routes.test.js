const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const SkillCourse = require('../models/SkillCourse');
const SkillCertificate = require('../models/SkillCertificate');
const SkillTestResult = require('../models/SkillTestResult');

describe('Skill Learning Routes', () => {
  let authToken;

  beforeAll(async () => {
    authToken = 'test-token-123';

    // Create test course
    await SkillCourse.create({
      courseId: 'test-skill-course-1',
      title: 'Test Skill Course',
      level: 'Beginner',
      duration: '10 hours',
      price: 500,
      description: 'Test course description',
      published: true,
      category: 'IT & Software',
    });
  });

  afterAll(async () => {
    await SkillCourse.deleteMany({ courseId: /^test-/ });
    await SkillCertificate.deleteMany({ userEmail: 'test@education.com' });
    await SkillTestResult.deleteMany({ userEmail: 'test@education.com' });
    await mongoose.connection.close();
  });

  describe('GET /api/skilllearning/courses', () => {
    it('should return list of published courses', async () => {
      const response = await request(app)
        .get('/api/skilllearning/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.courses)).toBe(true);
      expect(response.body.data.courses.length).toBeGreaterThan(0);
    });

    it('should filter courses by category', async () => {
      const response = await request(app)
        .get('/api/skilllearning/courses?category=IT & Software')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.courses.every(c => c.category === 'IT & Software')).toBe(true);
    });

    it('should filter courses by level', async () => {
      const response = await request(app)
        .get('/api/skilllearning/courses?level=Beginner')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.courses.every(c => c.level === 'Beginner')).toBe(true);
    });
  });

  describe('GET /api/skilllearning/courses/:courseId', () => {
    it('should return course details', async () => {
      const response = await request(app)
        .get('/api/skilllearning/courses/test-skill-course-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.course.courseId).toBe('test-skill-course-1');
    });

    it('should return 404 for non-existent course', async () => {
      await request(app)
        .get('/api/skilllearning/courses/non-existent-course')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/skilllearning/questions', () => {
    it('should return question bank for category', async () => {
      const response = await request(app)
        .get('/api/skilllearning/questions?category=Gulf Ready')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.questions)).toBe(true);
    });
  });

  describe('POST /api/skilllearning/tests/submit', () => {
    it('should evaluate and save test results', async () => {
      const testData = {
        category: 'Gulf Ready',
        answers: [
          { questionId: 'q1', selectedIndex: 2 },
          { questionId: 'q2', selectedIndex: 1 },
        ],
      };

      const response = await request(app)
        .post('/api/skilllearning/tests/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.result).toHaveProperty('score');
      expect(response.body.data.result).toHaveProperty('correct');
      expect(response.body.data.result).toHaveProperty('wrong');
    });

    it('should require at least one answer', async () => {
      const testData = {
        category: 'Gulf Ready',
        answers: [],
      };

      await request(app)
        .post('/api/skilllearning/tests/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData)
        .expect(400);
    });
  });

  describe('POST /api/skilllearning/certificates/upload', () => {
    it('should upload certificate without file', async () => {
      const certData = {
        title: 'Test Certificate',
        issuer: 'Test Issuer',
        completedOn: new Date().toISOString(),
        credentialId: 'TEST-123',
      };

      const response = await request(app)
        .post('/api/skilllearning/certificates/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', certData.title)
        .field('issuer', certData.issuer)
        .field('completedOn', certData.completedOn)
        .field('credentialId', certData.credentialId)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.certificate).toHaveProperty('certificateId');
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/skilllearning/certificates/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', 'Te') // Too short
        .expect(400);
    });
  });

  describe('GET /api/skilllearning/certificates', () => {
    it('should return user certificates', async () => {
      const response = await request(app)
        .get('/api/skilllearning/certificates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.certificates)).toBe(true);
    });
  });

  describe('GET /api/skilllearning/wallet', () => {
    it('should return wallet data with share text', async () => {
      const response = await request(app)
        .get('/api/skilllearning/wallet')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('shareText');
      expect(Array.isArray(response.body.data.courses)).toBe(true);
      expect(Array.isArray(response.body.data.certificates)).toBe(true);
    });
  });
});
