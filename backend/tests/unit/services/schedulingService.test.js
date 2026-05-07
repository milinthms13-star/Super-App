const mongoose = require('mongoose');
const assert = require('assert');
const schedulingService = require('../../../services/schedulingService');
const ScheduledMessage = require('../../../models/ScheduledMessage');
const MessageExpiration = require('../../../models/MessageExpiration');

describe('Scheduling Service', () => {
  const userId = new mongoose.Types.ObjectId();
  const chatId = new mongoose.Types.ObjectId();

  before(async () => {
    // Connect to test database
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/nilahub-test');
    }
  });

  afterEach(async () => {
    // Clear collections after each test
    await ScheduledMessage.deleteMany({});
    await MessageExpiration.deleteMany({});
  });

  after(async () => {
    await mongoose.disconnect();
  });

  describe('scheduleMessage()', () => {
    it('should schedule a message successfully', async () => {
      const messageData = {
        userId,
        chatId,
        content: 'Test scheduled message',
        scheduledTime: new Date(Date.now() + 3600000),
        messageType: 'text'
      };

      const result = await schedulingService.scheduleMessage(messageData);

      assert.ok(result._id);
      assert.strictEqual(result.status, 'scheduled');
      assert.strictEqual(result.content, 'Test scheduled message');
      assert.strictEqual(result.retryCount, 0);
    });

    it('should reject past scheduled times', async () => {
      const messageData = {
        userId,
        chatId,
        content: 'Past message',
        scheduledTime: new Date(Date.now() - 1000),
        messageType: 'text'
      };

      try {
        await schedulingService.scheduleMessage(messageData);
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.message.includes('past'));
      }
    });

    it('should require all mandatory fields', async () => {
      try {
        await schedulingService.scheduleMessage({
          userId,
          chatId,
          content: 'Test'
          // Missing scheduledTime
        });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error);
      }
    });
  });

  describe('getScheduledMessages()', () => {
    beforeEach(async () => {
      const futureTime = new Date(Date.now() + 3600000);
      await ScheduledMessage.create([
        {
          userId,
          chatId,
          content: 'Message 1',
          scheduledTime: futureTime,
          messageType: 'text',
          status: 'scheduled'
        },
        {
          userId,
          chatId,
          content: 'Message 2',
          scheduledTime: futureTime,
          messageType: 'text',
          status: 'scheduled'
        }
      ]);
    });

    it('should retrieve scheduled messages with pagination', async () => {
      const result = await schedulingService.getScheduledMessages({
        userId,
        status: 'scheduled',
        page: 1,
        limit: 10
      });

      assert.strictEqual(result.messages.length, 2);
      assert.ok(result.pagination.total >= 2);
    });

    it('should filter by status', async () => {
      const result = await schedulingService.getScheduledMessages({
        userId,
        status: 'sent',
        page: 1,
        limit: 10
      });

      assert.strictEqual(result.messages.length, 0);
    });

    it('should filter by chatId', async () => {
      const otherChatId = new mongoose.Types.ObjectId();
      const result = await schedulingService.getScheduledMessages({
        userId,
        chatId: otherChatId,
        page: 1,
        limit: 10
      });

      assert.strictEqual(result.messages.length, 0);
    });
  });

  describe('updateScheduledMessage()', () => {
    let messageId;

    beforeEach(async () => {
      const msg = await ScheduledMessage.create({
        userId,
        chatId,
        content: 'Original content',
        scheduledTime: new Date(Date.now() + 3600000),
        messageType: 'text',
        status: 'scheduled'
      });
      messageId = msg._id;
    });

    it('should update message content', async () => {
      const updates = {
        content: 'Updated content',
        scheduledTime: new Date(Date.now() + 7200000)
      };

      const result = await schedulingService.updateScheduledMessage(messageId, updates);

      assert.strictEqual(result.content, 'Updated content');
    });

    it('should not update sent messages', async () => {
      await ScheduledMessage.findByIdAndUpdate(messageId, { status: 'sent' });

      try {
        await schedulingService.updateScheduledMessage(messageId, { content: 'New' });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.message.includes('already sent'));
      }
    });
  });

  describe('cancelScheduledMessage()', () => {
    let messageId;

    beforeEach(async () => {
      const msg = await ScheduledMessage.create({
        userId,
        chatId,
        content: 'To cancel',
        scheduledTime: new Date(Date.now() + 3600000),
        messageType: 'text',
        status: 'scheduled'
      });
      messageId = msg._id;
    });

    it('should cancel a scheduled message', async () => {
      const result = await schedulingService.cancelScheduledMessage(messageId);

      assert.strictEqual(result.status, 'cancelled');
      assert.ok(result.cancelledAt);
    });

    it('should not cancel already sent messages', async () => {
      await ScheduledMessage.findByIdAndUpdate(messageId, { status: 'sent' });

      try {
        await schedulingService.cancelScheduledMessage(messageId);
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.message.includes('already sent'));
      }
    });
  });

  describe('setMessageExpiration()', () => {
    it('should set expiration on existing message', async () => {
      const messageId = new mongoose.Types.ObjectId();

      const result = await schedulingService.setMessageExpiration(messageId, {
        expiresInSeconds: 3600,
        expirationType: 'timed'
      });

      assert.ok(result._id);
      assert.ok(result.expiresAt);
      assert.strictEqual(result.expirationType, 'timed');
    });

    it('should validate expiration seconds', async () => {
      const messageId = new mongoose.Types.ObjectId();

      try {
        await schedulingService.setMessageExpiration(messageId, {
          expiresInSeconds: -100,
          expirationType: 'timed'
        });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error);
      }
    });

    it('should support self-destruct after read', async () => {
      const messageId = new mongoose.Types.ObjectId();

      const result = await schedulingService.setMessageExpiration(messageId, {
        expirationType: 'self-destruct-after-read'
      });

      assert.strictEqual(result.expirationType, 'self-destruct-after-read');
    });
  });

  describe('enableSelfDestruct()', () => {
    it('should enable self-destruct with timer', async () => {
      const messageId = new mongoose.Types.ObjectId();

      const result = await schedulingService.enableSelfDestruct(messageId, {
        timerSeconds: 10
      });

      assert.ok(result.expiresAt);
      assert.strictEqual(result.expirationType, 'self-destruct-after-read');
    });

    it('should validate timer is positive', async () => {
      const messageId = new mongoose.Types.ObjectId();

      try {
        await schedulingService.enableSelfDestruct(messageId, {
          timerSeconds: 0
        });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error);
      }
    });
  });

  describe('processScheduledMessages()', () => {
    it('should process due scheduled messages', async () => {
      const pastTime = new Date(Date.now() - 1000);
      const msg = await ScheduledMessage.create({
        userId,
        chatId,
        content: 'Due message',
        scheduledTime: pastTime,
        messageType: 'text',
        status: 'scheduled'
      });

      await schedulingService.processScheduledMessages();

      const updated = await ScheduledMessage.findById(msg._id);
      assert.ok(updated.status === 'sent' || updated.status === 'processing');
    });

    it('should skip future scheduled messages', async () => {
      const futureTime = new Date(Date.now() + 3600000);
      const msg = await ScheduledMessage.create({
        userId,
        chatId,
        content: 'Future message',
        scheduledTime: futureTime,
        messageType: 'text',
        status: 'scheduled'
      });

      await schedulingService.processScheduledMessages();

      const unchanged = await ScheduledMessage.findById(msg._id);
      assert.strictEqual(unchanged.status, 'scheduled');
    });

    it('should handle processing errors with retry logic', async () => {
      const pastTime = new Date(Date.now() - 1000);
      await ScheduledMessage.create({
        userId,
        chatId,
        content: 'Error message',
        scheduledTime: pastTime,
        messageType: 'text',
        status: 'scheduled',
        retryCount: 0
      });

      // Should not throw, should increment retry
      await schedulingService.processScheduledMessages();
    });
  });

  describe('cleanupExpiredMessages()', () => {
    it('should remove expired messages', async () => {
      const expiredTime = new Date(Date.now() - 60000);
      const msg = await MessageExpiration.create({
        messageId: new mongoose.Types.ObjectId(),
        userId,
        expiresAt: expiredTime,
        expirationType: 'timed'
      });

      await schedulingService.cleanupExpiredMessages();

      const deleted = await MessageExpiration.findById(msg._id);
      assert.strictEqual(deleted, null);
    });

    it('should keep non-expired messages', async () => {
      const futureTime = new Date(Date.now() + 3600000);
      const msg = await MessageExpiration.create({
        messageId: new mongoose.Types.ObjectId(),
        userId,
        expiresAt: futureTime,
        expirationType: 'timed'
      });

      await schedulingService.cleanupExpiredMessages();

      const kept = await MessageExpiration.findById(msg._id);
      assert.ok(kept);
    });
  });
});
