const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const DiaryEntry = require('../models/DiaryEntry');
const jwt = require('jsonwebtoken');

const mockUser = { _id: 'testuser123', id: 'testuser123' };

let mockToken;

beforeAll(async () => {
  mockToken = jwt.sign(mockUser, process.env.JWT_SECRET || 'testsecret');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/testdb');
});

afterEach(async () => {
  await DiaryEntry.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('Diary API', () => {
  test('GET /api/diary - fetch entries (authenticated)', async () => {
    const entry = new DiaryEntry({
      userId: mockUser._id,
      title: 'Test Entry',
      content: 'Test content'
    });
    await entry.save();

    const res = await request(app)
      .get('/api/diary')
      .set('Cookie', `auth=${mockToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  test('GET /api/diary - unauthorized', async () => {
    const res = await request(app).get('/api/diary');
    expect(res.status).toBe(401);
  });

  test('POST /api/diary - create entry', async () => {
    const entryData = {
      title: 'New Entry',
      content: 'New content',
      mood: 'happy'
    };

    const res = await request(app)
      .post('/api/diary')
      .set('Cookie', `auth=${mockToken}`)
      .send(entryData);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('New Entry');
  });

  test('POST /api/diary - validation error', async () => {
    const res = await request(app)
      .post('/api/diary')
      .set('Cookie', `auth=${mockToken}`)
      .send({});  // missing title/content

    expect(res.status).toBe(400);
  });

  test('GET /api/diary/tags - fetch tags', async () => {
    await DiaryEntry.create([
      { userId: mockUser._id, title: 'Test', content: 'Test', tags: ['tag1'] },
      { userId: mockUser._id, title: 'Test2', content: 'Test2', tags: ['tag1', 'tag2'] }
    ]);

    const res = await request(app)
      .get('/api/diary/tags')
      .set('Cookie', `auth=${mockToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some(t => t.name === 'tag1')).toBe(true);
  });

  test('GET /api/diary/mood-stats - fetch stats', async () => {
    await DiaryEntry.create([
      { userId: mockUser._id, title: 'Happy', content: 'Happy', mood: 'happy' },
      { userId: mockUser._id, title: 'Sad', content: 'Sad', mood: 'sad' }
    ]);

    const res = await request(app)
      .get('/api/diary/mood-stats')
      .set('Cookie', `auth=${mockToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('DELETE /api/diary/:id - delete entry', async () => {
    const entry = await DiaryEntry.create({
      userId: mockUser._id,
      title: 'To Delete',
      content: 'Delete me'
    });

    const res = await request(app)
      .delete(`/api/diary/${entry._id}`)
      .set('Cookie', `auth=${mockToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const deleted = await DiaryEntry.findById(entry._id);
    expect(deleted).toBeNull();
  });
});

module.exports = { mockUser };

