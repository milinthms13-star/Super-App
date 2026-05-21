const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = {
      _id: '507f1f77bcf86cd799439011',
      id: '507f1f77bcf86cd799439011',
      email: 'test@example.com',
      name: 'Test User',
    };
    next();
  },
  authenticateToken: (req, _res, next) => {
    req.user = {
      _id: '507f1f77bcf86cd799439011',
      id: '507f1f77bcf86cd799439011',
      email: 'test@example.com',
      name: 'Test User',
    };
    next();
  },
}));

const jobportalRouter = require('./jobportal');
const Job = require('../models/Job');
const JobSeekerProfile = require('../models/JobSeekerProfile');
const EmployerProfile = require('../models/EmployerProfile');
const JobSavedJob = require('../models/JobSavedJob');
const JobApplication = require('../models/JobApplication');

describe('jobportal overview360 integration', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    });

    app = express();
    app.use(express.json());
    app.use('/api/jobportal', jobportalRouter);
  });

  beforeEach(async () => {
    await Promise.all([
      Job.deleteMany({}),
      JobSeekerProfile.deleteMany({}),
      EmployerProfile.deleteMany({}),
      JobSavedJob.deleteMany({}),
      JobApplication.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('returns marketplace, candidate, and employer insights', async () => {
    const hireManagerId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');

    await JobSeekerProfile.create({
      userId: hireManagerId,
      fullName: 'Test Candidate',
      email: 'test@example.com',
      phone: '+919999999999',
      skills: ['react', 'nodejs'],
      experience: '3-5',
      profileCompleteness: 82,
      jobAlerts: { enabled: true },
    });

    await EmployerProfile.create({
      userId: hireManagerId,
      companyName: 'Test Company',
      companyType: 'startup',
      industry: 'technology',
      location: 'Kochi',
      contactEmail: 'hr@test.com',
      contactPhone: '+919888888888',
      isVerified: true,
    });

    const job1 = await Job.create({
      title: 'Software Engineer',
      company: 'Test Company',
      location: 'Kochi',
      type: 'it',
      subtype: 'developer',
      salary: '30000',
      experience: '3-5',
      description: 'Build web applications using React and Node.',
      postedBy: hireManagerId,
      isActive: true,
      isUrgent: true,
      jobType: 'fulltime',
      workMode: 'onsite',
      contactEmail: 'hr@test.com',
      contactPhone: '+919888888888',
    });

    const job2 = await Job.create({
      title: 'Gulf Sales Specialist',
      company: 'Test Company',
      location: 'Dubai',
      type: 'gulf',
      subtype: 'sales',
      salary: '40000',
      experience: '1-3',
      description: 'Sales role for Gulf recruiters.',
      postedBy: hireManagerId,
      isActive: true,
      isUrgent: false,
      jobType: 'fulltime',
      workMode: 'onsite',
      contactEmail: 'hr@test.com',
      contactPhone: '+919888888888',
    });

    await JobSavedJob.create({ userId: hireManagerId, jobId: job1._id });
    await JobApplication.create({
      jobId: job1._id,
      applicantId: hireManagerId,
      status: 'Applied',
      matchScore: 85,
      name: 'Test Candidate',
      email: 'test@example.com',
      phone: '+919999999999',
      skills: ['react', 'nodejs'],
    });

    const response = await request(app).get('/api/jobportal/overview360');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.marketplace.totalActiveJobs).toBe(2);
    expect(response.body.data.marketplace.verifiedEmployers).toBe(1);
    expect(response.body.data.marketplace.gulfJobs).toBe(1);
    expect(response.body.data.marketplace.itJobs).toBe(1);
    expect(response.body.data.marketplace.urgentJobs).toBe(1);
    expect(response.body.data.candidate.profileCompleteness).toBe(82);
    expect(response.body.data.candidate.savedJobsCount).toBe(1);
    expect(response.body.data.candidate.applicationsCount).toBe(1);
    expect(response.body.data.employer.activeJobs).toBe(2);
    expect(response.body.data.employer.totalApplications).toBe(1);
    expect(response.body.data.employer.topJobs.length).toBeGreaterThanOrEqual(1);
  });
});
