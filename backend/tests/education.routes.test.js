const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const EducationState = require('../models/EducationState');
const EducationEnrollment = require('../models/EducationEnrollment');
const SkillCourse = require('../models/SkillCourse');
const User = require('../models/User');

describe('Education Routes', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      email: 'test@education.com',
      name: 'Test User',
      password: 'hashedpassword',
    });

    // Mock auth token
    authToken = 'test-token-123';
  });

  afterAll(async () => {
    await User.deleteMany({ email: 'test@education.com' });
    await EducationState.deleteMany({ userEmail: 'test@education.com' });
    await EducationEnrollment.deleteMany({ userEmail: 'test@education.com' });
    await mongoose.connection.close();
  });

  describe('GET /api/education/state', () => {
    it('should return education state for authenticated user', async () => {
      const response = await request(app)
        .get('/api/education/state')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.state).toHaveProperty('enrolledCourseIds');
      expect(response.body.data.state).toHaveProperty('appliedScholarships');
      expect(response.body.data.state).toHaveProperty('roleProfile');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/education/state')
        .expect(401);
    });
  });

  describe('PATCH /api/education/state', () => {
    it('should update education state', async () => {
      const updateData = {
        enrolledCourseIds: ['course-1'],
        appliedScholarships: ['scholarship-1'],
        courseProgress: { 'course-1': 50 },
      };

      const response = await request(app)
        .patch('/api/education/state')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.state.enrolledCourseIds).toContain('course-1');
      expect(response.body.data.state.appliedScholarships).toContain('scholarship-1');
    });

    it('should validate state data', async () => {
      const invalidData = {
        courseProgress: { 'course-1': 150 }, // Invalid: > 100
      };

      await request(app)
        .patch('/api/education/state')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('POST /api/education/enroll', () => {
    it('should enroll in a free course', async () => {
      const enrollmentData = {
        courseId: 'test-course-1',
        courseTitle: 'Test Course',
        amount: 0,
        paymentMethod: 'none',
        paymentGateway: 'none',
      };

      const response = await request(app)
        .post('/api/education/enroll')
        .set('Authorization', `Bearer ${authToken}`)
        .send(enrollmentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enrollment.status).toBe('enrolled');
      expect(response.body.data.requiresPayment).toBe(false);
    });

    it('should create payment order for paid course', async () => {
      const enrollmentData = {
        courseId: 'test-course-2',
        courseTitle: 'Paid Course',
        amount: 1000,
        paymentMethod: 'upi',
        paymentGateway: 'razorpay',
      };

      const response = await request(app)
        .post('/api/education/enroll')
        .set('Authorization', `Bearer ${authToken}`)
        .send(enrollmentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.requiresPayment).toBe(true);
      expect(response.body.data.paymentDetails).toHaveProperty('razorpayOrderId');
    });

    it('should prevent duplicate enrollment', async () => {
      const enrollmentData = {
        courseId: 'test-course-1',
        courseTitle: 'Test Course',
        amount: 0,
      };

      // First enrollment
      await request(app)
        .post('/api/education/enroll')
        .set('Authorization', `Bearer ${authToken}`)
        .send(enrollmentData)
        .expect(200);

      // Second enrollment (should fail)
      const response = await request(app)
        .post('/api/education/enroll')
        .set('Authorization', `Bearer ${authToken}`)
        .send(enrollmentData)
        .expect(400);

      expect(response.body.error).toContain('Already enrolled');
    });
  });

  describe('GET /api/education/discovery', () => {
    it('should return scholarships and government schemes', async () => {
      const response = await request(app)
        .get('/api/education/discovery')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('scholarships');
      expect(response.body.data).toHaveProperty('governmentSchemes');
      expect(Array.isArray(response.body.data.scholarships)).toBe(true);
    });
  });

  describe('GET /api/education/overview360', () => {
    it('should return 360 dashboard data', async () => {
      const response = await request(app)
        .get('/api/education/overview360')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('outcomeMetrics');
      expect(response.body.data).toHaveProperty('interventions');
      expect(response.body.data).toHaveProperty('canvaToolkit');
    });
  });
});
