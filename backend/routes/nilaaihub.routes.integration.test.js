const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const nilaaihubRouter = require('./nilaaihubRoutes');

describe('Nila AI Hub routes integration', () => {
  let app;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/nilaaihub', nilaaihubRouter);
  });

  test('GET /api/nilaaihub/recommendations/trending returns recommendations', async () => {
    const response = await request(app).get('/api/nilaaihub/recommendations/trending').expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0]).toHaveProperty('title');
    expect(response.body.data[0]).toHaveProperty('description');
  });

  test('POST /api/nilaaihub/ai-chat/init initializes a chat session for guest users', async () => {
    const response = await request(app).post('/api/nilaaihub/ai-chat/init').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('sessionId');
    expect(response.body.data).toHaveProperty('status', 'active');
  });

  test('POST /api/nilaaihub/ai-chat/message responds with assistant content', async () => {
    const initResponse = await request(app).post('/api/nilaaihub/ai-chat/init').expect(200);
    const sessionId = initResponse.body.data.sessionId;

    const response = await request(app)
      .post('/api/nilaaihub/ai-chat/message')
      .send({ sessionId, message: 'I need help with a Gulf visa', context: { topic: 'Gulf visa guidance' } })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('response');
    expect(response.body.data).toHaveProperty('suggestedActions');
    expect(Array.isArray(response.body.data.suggestedActions)).toBe(true);
  });
});
