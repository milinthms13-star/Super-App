const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const assert = require('assert');
const jwt = require('jsonwebtoken');

// Setup
const setupApp = () => {
  const app = express();
  app.use(express.json());

  // Mock auth middleware
  app.use((req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token && token !== 'invalid') {
      req.user = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        email: 'test@example.com',
        role: 'admin'
      };
    }
    next();
  });

  // Mock routes
  app.use('/api/messaging/v4/scheduled', require('../../routes/schedulingRoutes'));
  app.use('/api/messaging/v4/bookmarks', require('../../routes/bookmarkPollRoutes'));
  app.use('/api/messaging/v4/backups', require('../../routes/backupRestoreRoutes'));
  app.use('/api/messaging/v4/optimize', require('../../routes/optimizationRoutes'));
  app.use('/api/messaging/v4', require('../../routes/dataManagementRoutes'));

  return app;
};

describe('Phase 4 Integration Tests', () => {
  let app;
  const userId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
  const chatId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439010');
  const authToken = 'valid-token';

  before(async () => {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/nilahub-test');
    }
    app = setupApp();
  });

  afterEach(async () => {
    // Cleanup test data
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  after(async () => {
    await mongoose.disconnect();
  });

  describe('Feature 11: Message Scheduling Routes', () => {
    describe('POST /api/messaging/v4/scheduled', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/messaging/v4/scheduled')
          .send({
            chatId,
            content: 'Test',
            scheduledTime: new Date(Date.now() + 3600000)
          });

        assert.strictEqual(response.status, 401);
      });

      it('should schedule a message with valid token', async () => {
        const response = await request(app)
          .post('/api/messaging/v4/scheduled')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            chatId: chatId.toString(),
            content: 'Scheduled message',
            scheduledTime: new Date(Date.now() + 3600000),
            messageType: 'text'
          });

        assert.strictEqual(response.status, 201);
        assert.ok(response.body.data._id);
        assert.strictEqual(response.body.data.status, 'scheduled');
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/messaging/v4/scheduled')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            chatId: chatId.toString()
            // Missing content and scheduledTime
          });

        assert.strictEqual(response.status, 400);
      });
    });

    describe('GET /api/messaging/v4/scheduled', () => {
      it('should list scheduled messages with authentication', async () => {
        const response = await request(app)
          .get('/api/messaging/v4/scheduled')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ page: 1, limit: 10 });

        assert.strictEqual(response.status, 200);
        assert.ok(response.body.messages);
      });

      it('should filter by status', async () => {
        const response = await request(app)
          .get('/api/messaging/v4/scheduled')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ status: 'scheduled', page: 1, limit: 10 });

        assert.strictEqual(response.status, 200);
      });
    });

    describe('POST /api/messaging/v4/scheduled/messages/:id/expire', () => {
      it('should set message expiration', async () => {
        const messageId = new mongoose.Types.ObjectId();

        const response = await request(app)
          .post(`/api/messaging/v4/scheduled/messages/${messageId}/expire`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            expiresInSeconds: 3600,
            expirationType: 'timed'
          });

        assert.strictEqual(response.status, 201);
        assert.ok(response.body.data.expiresAt);
      });

      it('should validate expiration seconds', async () => {
        const messageId = new mongoose.Types.ObjectId();

        const response = await request(app)
          .post(`/api/messaging/v4/scheduled/messages/${messageId}/expire`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            expiresInSeconds: -100,
            expirationType: 'timed'
          });

        assert.strictEqual(response.status, 400);
      });
    });
  });

  describe('Feature 12: Bookmark & Poll Routes', () => {
    describe('POST /api/messaging/v4/bookmarks', () => {
      it('should create a bookmark', async () => {
        const messageId = new mongoose.Types.ObjectId();

        const response = await request(app)
          .post('/api/messaging/v4/bookmarks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            messageId: messageId.toString(),
            tag: 'important'
          });

        assert.strictEqual(response.status, 201);
        assert.strictEqual(response.body.data.tag, 'important');
      });

      it('should prevent duplicate bookmarks', async () => {
        const messageId = new mongoose.Types.ObjectId();

        await request(app)
          .post('/api/messaging/v4/bookmarks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            messageId: messageId.toString(),
            tag: 'important'
          });

        const response = await request(app)
          .post('/api/messaging/v4/bookmarks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            messageId: messageId.toString(),
            tag: 'urgent'
          });

        assert.strictEqual(response.status, 400);
      });
    });

    describe('POST /api/messaging/v4/bookmarks/polls', () => {
      it('should create a poll', async () => {
        const response = await request(app)
          .post('/api/messaging/v4/bookmarks/polls')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            chatId: chatId.toString(),
            question: 'What is your preference?',
            options: ['Option A', 'Option B'],
            pollConfig: {
              pollType: 'single-choice',
              isAnonymous: false
            }
          });

        assert.strictEqual(response.status, 201);
        assert.ok(response.body.data._id);
        assert.strictEqual(response.body.data.totalVotes, 0);
      });

      it('should require at least 2 options', async () => {
        const response = await request(app)
          .post('/api/messaging/v4/bookmarks/polls')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            chatId: chatId.toString(),
            question: 'Question?',
            options: ['Only One'],
            pollConfig: { pollType: 'single-choice' }
          });

        assert.strictEqual(response.status, 400);
      });
    });

    describe('POST /api/messaging/v4/bookmarks/polls/:id/vote', () => {
      let pollId;

      beforeEach(async () => {
        const res = await request(app)
          .post('/api/messaging/v4/bookmarks/polls')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            chatId: chatId.toString(),
            question: 'Vote?',
            options: ['Yes', 'No'],
            pollConfig: { pollType: 'single-choice' }
          });

        pollId = res.body.data._id;
      });

      it('should record a vote', async () => {
        const response = await request(app)
          .post(`/api/messaging/v4/bookmarks/polls/${pollId}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            selectedOptions: [0]
          });

        assert.strictEqual(response.status, 201);
        assert.deepStrictEqual(response.body.data.selectedOptions, [0]);
      });
    });
  });

  describe('Feature 14: Optimization Routes', () => {
    describe('POST /api/messaging/v4/optimize/batching/reset', () => {
      it('should enable optimizations', async () => {
        const response = await request(app)
          .post('/api/messaging/v4/optimize/batching/reset')
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        assert.strictEqual(response.status, 200);
        assert.ok(response.body.message);
      });
    });

    describe('GET /api/messaging/v4/optimize/stats', () => {
      it('should retrieve performance metrics', async () => {
        const response = await request(app)
          .get('/api/messaging/v4/optimize/stats')
          .set('Authorization', `Bearer ${authToken}`)
          .query({});

        assert.strictEqual(response.status, 200);
        assert.ok(response.body);
      });
    });

    describe('POST /api/messaging/v4/optimize/delta-sync/reset', () => {
      it('should record heartbeat', async () => {
        const response = await request(app)
          .post('/api/messaging/v4/optimize/delta-sync/reset')
          .set('Authorization', `Bearer ${authToken}`);

        assert.strictEqual(response.status, 200);
      });
    });
  });

  describe('Feature 15: Data Management Routes', () => {
    describe('GET /api/messaging/v4/statistics/detailed', () => {
      it('should retrieve detailed statistics', async () => {
        const response = await request(app)
          .get('/api/messaging/v4/statistics/detailed')
          .set('Authorization', `Bearer ${authToken}`);

        assert.strictEqual(response.status, 200);
        assert.ok(response.body.data);
        assert.ok(typeof response.body.data.totalMessages === 'number');
      });
    });

    describe('POST /api/messaging/v4/retention-policy', () => {
      it('should set retention policy', async () => {
        const response = await request(app)
          .post('/api/messaging/v4/retention-policy')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            messageRetentionDays: 365,
            autoDeleteMode: 'soft-delete'
          });

        assert.strictEqual(response.status, 201);
        assert.ok(response.body.data._id);
      });

      it('should validate retention days', async () => {
        const response = await request(app)
          .post('/api/messaging/v4/retention-policy')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            messageRetentionDays: -1,
            autoDeleteMode: 'soft-delete'
          });

        assert.strictEqual(response.status, 400);
      });
    });

    describe('POST /api/messaging/v4/data/export', () => {
      it('should export user data', async () => {
        const response = await request(app)
          .post('/api/messaging/v4/data/export')
          .set('Authorization', `Bearer ${authToken}`);

        assert.strictEqual(response.status, 200);
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for missing authentication', async () => {
      const response = await request(app)
        .get('/api/messaging/v4/statistics/detailed');

      assert.strictEqual(response.status, 401);
    });

    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/messaging/v4/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      assert.strictEqual(response.status, 404);
    });

    it('should handle invalid JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/messaging/v4/scheduled')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      assert.ok(response.status >= 400);
    });
  });

  describe('Cross-Feature Integration', () => {
    it('should handle scheduling and expiration together', async () => {
      // Schedule a message
      const schedRes = await request(app)
        .post('/api/messaging/v4/scheduled')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chatId: chatId.toString(),
          content: 'Self-destruct message',
          scheduledTime: new Date(Date.now() + 3600000),
          messageType: 'text'
        });

      assert.strictEqual(schedRes.status, 201);
      const messageId = schedRes.body.data._id;

      // Set expiration
      const expireRes = await request(app)
        .post(`/api/messaging/v4/scheduled/messages/${messageId}/expire`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          expiresInSeconds: 600,
          expirationType: 'self-destruct-after-read'
        });

      assert.strictEqual(expireRes.status, 201);
      assert.strictEqual(expireRes.body.data.expirationType, 'self-destruct-after-read');
    });

    it('should track statistics across features', async () => {
      // Create various items
      await request(app)
        .post('/api/messaging/v4/scheduled')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chatId: chatId.toString(),
          content: 'Test',
          scheduledTime: new Date(Date.now() + 3600000),
          messageType: 'text'
        });

      // Get statistics
      const response = await request(app)
        .get('/api/messaging/v4/statistics/detailed')
        .set('Authorization', `Bearer ${authToken}`);

      assert.strictEqual(response.status, 200);
    });
  });
});
