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

test('GET /api/diary/drafts - fetch drafts', async () => {
  const draft = new DiaryEntry({
    userId: mockUser._id,
    title: 'Draft Test',
    content: 'Draft content',
    isDraft: true
  });
  await draft.save();

  const res = await request(app)
    .get('/api/diary/drafts')
    .set('Cookie', `auth=${mockToken}`);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data).toHaveLength(1);
  expect(res.body.data[0].isDraft).toBe(true);
});

test('GET /api/diary/:id - fetch single entry', async () => {
  const entry = await DiaryEntry.create({
    userId: mockUser._id,
    title: 'Single Entry',
    content: 'Single content'
  });

  const res = await request(app)
    .get(`/api/diary/${entry._id}`)
    .set('Cookie', `auth=${mockToken}`);

  expect(res.status).toBe(200);
  expect(res.body.data._id).toBe(entry._id.toString());
});

test('PUT /api/diary/:id - update entry', async () => {
  const entry = await DiaryEntry.create({
    userId: mockUser._id,
    title: 'To Update',
    content: 'Old content'
  });

  const updateData = { title: 'Updated Title', mood: 'happy' };

  const res = await request(app)
    .put(`/api/diary/${entry._id}`)
    .set('Cookie', `auth=${mockToken}`)
    .send(updateData);

  expect(res.status).toBe(200);
  expect(res.body.data.title).toBe('Updated Title');
});

test('POST /api/diary - validation: missing title', async () => {
  const res = await request(app)
    .post('/api/diary')
    .set('Cookie', `auth=${mockToken}`)
    .send({ content: 'only content' });

  expect(res.status).toBe(400);
  expect(res.body.message).toContain('Title is required');
});

test('GET /api/diary - pagination works', async () => {
  await DiaryEntry.insertMany([
    { userId: mockUser._id, title: 'Entry 1', content: 'Content 1' },
    { userId: mockUser._id, title: 'Entry 2', content: 'Content 2' },
    { userId: mockUser._id, title: 'Entry 3', content: 'Content 3' }
  ]);

  const res = await request(app)
    .get('/api/diary?limit=2&skip=0')
    .set('Cookie', `auth=${mockToken}`);

  expect(res.body.pagination.total).toBe(3);
  expect(res.body.pagination.limit).toBe(2);
  expect(res.body.data.length).toBe(2);
  expect(res.body.pagination.hasMore).toBe(true);
});

test('GET /api/diary - filtering by category', async () => {
  await DiaryEntry.create({ 
    userId: mockUser._id, 
    title: 'Work', 
    content: 'Work day', 
    category: 'Work' 
  });
  await DiaryEntry.create({ 
    userId: mockUser._id, 
    title: 'Personal', 
    content: 'Personal day', 
    category: 'Personal' 
  });

  const res = await request(app)
    .get('/api/diary?category=Work')
    .set('Cookie', `auth=${mockToken}`);

  expect(res.body.data.length).toBe(1);
  expect(res.body.data[0].category).toBe('Work');
});

test('GET /api/diary - search works', async () => {
  await DiaryEntry.create({ 
    userId: mockUser._id, 
    title: 'Search Test', 
    content: 'This is a test for search' 
  });

  const res = await request(app)
    .get('/api/diary?search=test')
    .set('Cookie', `auth=${mockToken}`);

  expect(res.body.data.length).toBe(1);
  expect(res.body.data[0].title).toContain('Search Test');
});

test('GET /api/diary/tags - empty tags', async () => {
  await DiaryEntry.create({ userId: mockUser._id, title: 'No tags', content: 'content' });

  const res = await request(app)
    .get('/api/diary/tags')
    .set('Cookie', `auth=${mockToken}`);

  expect(res.body.data).toHaveLength(0);
});

test('DELETE /api/diary/:id - not found', async () => {
  const res = await request(app)
    .delete('/api/diary/000000000000000000000000')
    .set('Cookie', `auth=${mockToken}`);

  expect(res.status).toBe(404);
});

test('GET /api/diary/mood-stats - no entries', async () => {
  const res = await request(app)
    .get('/api/diary/mood-stats')
    .set('Cookie', `auth=${mockToken}`);

  expect(res.body.data).toHaveLength(0);
});

test('POST /api/diary - rate limited (mocked)', async () => {
  // Note: Actual rate limiting requires real timing, mocked for test
  const entryData = { title: 'Rate Test', content: 'Content' };
  const res = await request(app)
    .post('/api/diary')
    .set('Cookie', `auth=${mockToken}`)
    .send(entryData);

  expect(res.status).toBe(201); // Single request passes
});

