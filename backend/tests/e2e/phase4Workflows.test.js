const mongoose = require('mongoose');
const assert = require('assert');
const schedulingService = require('../../../services/schedulingService');
const bookmarkPollService = require('../../../services/bookmarkPollService');
const backupRestoreService = require('../../../services/backupRestoreService');
const optimizationService = require('../../../services/optimizationService');
const dataManagementService = require('../../../services/dataManagementService');

describe('Phase 4 E2E Workflows', () => {
  const userId = new mongoose.Types.ObjectId();
  const chatId = new mongoose.Types.ObjectId();

  before(async () => {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/nilahub-test');
    }
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  after(async () => {
    await mongoose.disconnect();
  });

  describe('Workflow 1: Schedule Message → Execute → Track', () => {
    it('should complete full scheduling workflow', async () => {
      // Step 1: Schedule a message
      const scheduledMsg = await schedulingService.scheduleMessage({
        userId,
        chatId,
        content: 'Meeting reminder',
        scheduledTime: new Date(Date.now() + 600000),
        messageType: 'text'
      });

      assert.strictEqual(scheduledMsg.status, 'scheduled');
      assert.ok(scheduledMsg._id);

      // Step 2: Verify message is in scheduled list
      const list = await schedulingService.getScheduledMessages({
        userId,
        status: 'scheduled'
      });

      assert.ok(list.messages.some(m => m._id.toString() === scheduledMsg._id.toString()));

      // Step 3: Update the scheduled message
      const updated = await schedulingService.updateScheduledMessage(scheduledMsg._id, {
        content: 'Updated meeting reminder'
      });

      assert.strictEqual(updated.content, 'Updated meeting reminder');

      // Step 4: Set expiration
      const expiration = await schedulingService.setMessageExpiration(scheduledMsg._id, {
        expiresInSeconds: 300,
        expirationType: 'timed'
      });

      assert.ok(expiration.expiresAt);

      // Step 5: Verify in list again
      const finalList = await schedulingService.getScheduledMessages({
        userId,
        status: 'scheduled'
      });

      assert.ok(finalList.messages.length > 0);
    });

    it('should handle schedule → cancel workflow', async () => {
      const scheduled = await schedulingService.scheduleMessage({
        userId,
        chatId,
        content: 'To be cancelled',
        scheduledTime: new Date(Date.now() + 3600000),
        messageType: 'text'
      });

      const cancelled = await schedulingService.cancelScheduledMessage(scheduled._id);

      assert.strictEqual(cancelled.status, 'cancelled');
      assert.ok(cancelled.cancelledAt);
    });
  });

  describe('Workflow 2: Create Poll → Vote → View Results → Close', () => {
    it('should complete full poll lifecycle', async () => {
      // Step 1: Create poll
      const poll = await bookmarkPollService.createPoll({
        chatId,
        userId,
        question: 'What is your favorite programming language?',
        options: ['JavaScript', 'Python', 'Go', 'Rust'],
        pollConfig: {
          pollType: 'single-choice',
          isAnonymous: false
        }
      });

      assert.ok(poll._id);
      assert.strictEqual(poll.totalVotes, 0);
      assert.strictEqual(poll.isClosed, false);

      // Step 2: Users vote
      const voters = [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId()
      ];

      await bookmarkPollService.votePoll({
        pollId: poll._id,
        userId: voters[0],
        selectedOptions: [0]
      });

      await bookmarkPollService.votePoll({
        pollId: poll._id,
        userId: voters[1],
        selectedOptions: [0]
      });

      await bookmarkPollService.votePoll({
        pollId: poll._id,
        userId: voters[2],
        selectedOptions: [1]
      });

      await bookmarkPollService.votePoll({
        pollId: poll._id,
        userId: voters[3],
        selectedOptions: [2]
      });

      // Step 3: Get results
      const results = await bookmarkPollService.getPollResults(poll._id);

      assert.strictEqual(results.totalVotes, 4);
      assert.strictEqual(results.options[0].votes, 2);
      assert.strictEqual(results.options[0].percentage, 50);
      assert.strictEqual(results.options[1].votes, 1);
      assert.strictEqual(results.options[2].votes, 1);

      // Step 4: Close poll
      const closed = await bookmarkPollService.closePoll(poll._id);

      assert.strictEqual(closed.isClosed, true);

      // Step 5: Verify no more votes accepted
      try {
        await bookmarkPollService.votePoll({
          pollId: poll._id,
          userId: new mongoose.Types.ObjectId(),
          selectedOptions: [0]
        });
        assert.fail('Should have rejected vote on closed poll');
      } catch (error) {
        assert.ok(error.message.includes('closed'));
      }
    });
  });

  describe('Workflow 3: Bookmark Messages → Organize → Search', () => {
    it('should complete bookmark management workflow', async () => {
      // Step 1: Bookmark multiple messages
      const msg1 = await bookmarkPollService.bookmarkMessage({
        userId,
        messageId: new mongoose.Types.ObjectId(),
        tag: 'work',
        messageContent: 'Project deadline',
        notes: 'Important project'
      });

      const msg2 = await bookmarkPollService.bookmarkMessage({
        userId,
        messageId: new mongoose.Types.ObjectId(),
        tag: 'personal',
        messageContent: 'Birthday party details',
        notes: 'Friend birthday'
      });

      const msg3 = await bookmarkPollService.bookmarkMessage({
        userId,
        messageId: new mongoose.Types.ObjectId(),
        tag: 'work',
        messageContent: 'Meeting notes',
        notes: 'Team sync'
      });

      // Step 2: Organize bookmarks
      await bookmarkPollService.updateBookmark(msg1._id, {
        star: true,
        folder: 'Urgent'
      });

      // Step 3: Get all bookmarks
      const all = await bookmarkPollService.getBookmarks({
        userId,
        page: 1,
        limit: 10
      });

      assert.strictEqual(all.bookmarks.length, 3);

      // Step 4: Filter by tag
      const workItems = await bookmarkPollService.getBookmarks({
        userId,
        tag: 'work',
        page: 1,
        limit: 10
      });

      assert.strictEqual(workItems.bookmarks.length, 2);

      // Step 5: Search bookmarks
      const search = await bookmarkPollService.searchBookmarks({
        userId,
        query: 'project',
        page: 1,
        limit: 10
      });

      assert.strictEqual(search.length, 1);
      assert.ok(search[0].messageContent.includes('project'));

      // Step 6: Remove a bookmark
      await bookmarkPollService.unbookmarkMessage(msg2._id, userId);

      const remaining = await bookmarkPollService.getBookmarks({
        userId,
        page: 1,
        limit: 10
      });

      assert.strictEqual(remaining.bookmarks.length, 2);
    });
  });

  describe('Workflow 4: Create Backup → Export → Restore', () => {
    it('should complete backup and restore workflow', async () => {
      // Step 1: Create backup
      const backup = await backupRestoreService.createBackup({
        userId,
        chatId,
        backupType: 'single-chat'
      });

      assert.ok(backup._id);
      assert.ok(backup.status === 'completed' || backup.status === 'in-progress');

      // Step 2: List backups
      const backups = await backupRestoreService.getBackups({
        userId,
        page: 1,
        limit: 10
      });

      assert.ok(backups.backups.length > 0);

      // Step 3: Export as JSON
      const jsonExport = await backupRestoreService.exportChatAsJSON({
        userId,
        chatId
      });

      assert.ok(jsonExport);

      // Step 4: Export as CSV
      const csvExport = await backupRestoreService.exportChatAsCSV({
        userId,
        chatId
      });

      assert.ok(csvExport);

      // Step 5: Restore from backup (if completed)
      if (backup.status === 'completed') {
        const restore = await backupRestoreService.restoreChatFromBackup({
          userId,
          backupId: backup._id
        });

        assert.ok(restore._id);
        assert.ok(restore.status === 'pending' || restore.status === 'in-progress');
      }
    });
  });

  describe('Workflow 5: Performance Optimization → Metrics → Analysis', () => {
    it('should complete optimization workflow', async () => {
      // Step 1: Enable optimizations
      const config = await optimizationService.enableDeltaSync();

      assert.ok(config);

      // Step 2: Record metrics
      await optimizationService.recordMetric({
        userId,
        eventType: 'message-send',
        duration: 150,
        chatId
      });

      await optimizationService.recordMetric({
        userId,
        eventType: 'read-receipt',
        duration: 75,
        chatId
      });

      // Step 3: Get performance metrics
      const perfMetrics = await optimizationService.getPerformanceMetrics({
        userId,
        timeframe: '24h'
      });

      assert.ok(perfMetrics);

      // Step 4: Get latency stats
      const latencyStats = await optimizationService.getLatencyStats({
        userId,
        chatId
      });

      assert.ok(latencyStats);

      // Step 5: Detect duplicates
      const isDuplicate = await optimizationService.detectDuplicates({
        userId,
        chatId,
        clientMessageId: 'msg-123'
      });

      assert.ok(typeof isDuplicate === 'boolean');
    });
  });

  describe('Workflow 6: Data Analysis → Retention Policy → Archive & Purge', () => {
    it('should complete data management workflow', async () => {
      // Step 1: Get statistics
      const stats = await dataManagementService.getDetailedStatistics({
        userId
      });

      assert.ok(typeof stats.totalMessages === 'number');
      assert.ok(typeof stats.totalChats === 'number');

      // Step 2: Get most active chats
      const activeChats = await dataManagementService.getMostActiveChats({
        userId,
        limit: 10
      });

      assert.ok(Array.isArray(activeChats));

      // Step 3: Get trends
      const trends = await dataManagementService.getMessageTrends({
        userId,
        timeframe: 'month'
      });

      assert.ok(Array.isArray(trends));

      // Step 4: Set retention policy
      const policy = await dataManagementService.setRetentionPolicy({
        userId,
        messageRetentionDays: 365,
        autoDeleteMode: 'soft-delete'
      });

      assert.ok(policy._id);

      // Step 5: Get retention policy
      const retrieved = await dataManagementService.getRetentionPolicy({
        userId
      });

      assert.strictEqual(retrieved.userId.toString(), userId.toString());

      // Step 6: Export user data (GDPR)
      const gdprExport = await dataManagementService.exportUserData({
        userId
      });

      assert.ok(gdprExport);
      assert.ok(gdprExport.user);
      assert.ok(gdprExport.statistics);
    });
  });

  describe('Workflow 7: Multi-Feature Complex Scenario', () => {
    it('should handle complex workflow with multiple features', async () => {
      // Scenario: Schedule important messages, bookmark them, create poll, track stats

      // Step 1: Schedule multiple messages
      const msg1 = await schedulingService.scheduleMessage({
        userId,
        chatId,
        content: 'Important announcement',
        scheduledTime: new Date(Date.now() + 3600000),
        messageType: 'text'
      });

      const msg2 = await schedulingService.scheduleMessage({
        userId,
        chatId,
        content: 'Team sync reminder',
        scheduledTime: new Date(Date.now() + 7200000),
        messageType: 'text'
      });

      // Step 2: Bookmark the messages
      await bookmarkPollService.bookmarkMessage({
        userId,
        messageId: msg1._id,
        tag: 'critical',
        notes: 'Review before sending'
      });

      await bookmarkPollService.bookmarkMessage({
        userId,
        messageId: msg2._id,
        tag: 'important',
        notes: 'Include all team members'
      });

      // Step 3: Create a poll for the announcement
      const poll = await bookmarkPollService.createPoll({
        chatId,
        userId,
        question: 'Did everyone receive the announcement?',
        options: ['Yes', 'No', 'Need clarification'],
        pollConfig: { pollType: 'single-choice' }
      });

      // Step 4: Record votes
      await bookmarkPollService.votePoll({
        pollId: poll._id,
        userId: new mongoose.Types.ObjectId(),
        selectedOptions: [0]
      });

      // Step 5: Set expiration on bookmarked messages
      await schedulingService.setMessageExpiration(msg1._id, {
        expiresInSeconds: 7200,
        expirationType: 'timed'
      });

      // Step 6: Get statistics
      const stats = await dataManagementService.getDetailedStatistics({
        userId
      });

      assert.ok(typeof stats.totalMessages === 'number');

      // Step 7: Set retention policy
      const policy = await dataManagementService.setRetentionPolicy({
        userId,
        messageRetentionDays: 90,
        autoDeleteMode: 'soft-delete'
      });

      assert.ok(policy._id);

      // Step 8: Export all data
      const export_data = await dataManagementService.exportUserData({
        userId
      });

      assert.ok(export_data.user);

      console.log('✅ Complex multi-feature workflow completed successfully');
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should handle concurrent operations gracefully', async () => {
      const promises = [
        schedulingService.scheduleMessage({
          userId,
          chatId,
          content: 'Msg 1',
          scheduledTime: new Date(Date.now() + 3600000),
          messageType: 'text'
        }),
        schedulingService.scheduleMessage({
          userId,
          chatId,
          content: 'Msg 2',
          scheduledTime: new Date(Date.now() + 7200000),
          messageType: 'text'
        }),
        bookmarkPollService.createPoll({
          chatId,
          userId,
          question: 'Question?',
          options: ['A', 'B'],
          pollConfig: { pollType: 'single-choice' }
        })
      ];

      const results = await Promise.all(promises);

      assert.strictEqual(results.length, 3);
      assert.ok(results[0]._id);
      assert.ok(results[1]._id);
      assert.ok(results[2]._id);
    });

    it('should rollback on transaction failure', async () => {
      try {
        // Attempt invalid operation
        await schedulingService.scheduleMessage({
          userId,
          chatId,
          // Missing required fields
        });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error);
      }

      // Verify no partial state
      const list = await schedulingService.getScheduledMessages({
        userId,
        page: 1,
        limit: 10
      });

      assert.strictEqual(list.messages.length, 0);
    });
  });
});
