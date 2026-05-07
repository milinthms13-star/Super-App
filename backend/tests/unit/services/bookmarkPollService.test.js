const mongoose = require('mongoose');
const assert = require('assert');
const bookmarkPollService = require('../../../services/bookmarkPollService');
const MessageBookmark = require('../../../models/MessageBookmark');
const Poll = require('../../../models/Poll');
const PollVote = require('../../../models/PollVote');

describe('Bookmark Poll Service', () => {
  const userId = new mongoose.Types.ObjectId();
  const chatId = new mongoose.Types.ObjectId();
  const messageId = new mongoose.Types.ObjectId();

  before(async () => {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/nilahub-test');
    }
  });

  afterEach(async () => {
    await MessageBookmark.deleteMany({});
    await Poll.deleteMany({});
    await PollVote.deleteMany({});
  });

  after(async () => {
    await mongoose.disconnect();
  });

  describe('Bookmark Operations', () => {
    describe('bookmarkMessage()', () => {
      it('should bookmark a message successfully', async () => {
        const result = await bookmarkPollService.bookmarkMessage({
          userId,
          messageId,
          tag: 'important'
        });

        assert.ok(result._id);
        assert.strictEqual(result.tag, 'important');
        assert.strictEqual(result.userId.toString(), userId.toString());
      });

      it('should prevent duplicate bookmarks', async () => {
        await bookmarkPollService.bookmarkMessage({
          userId,
          messageId,
          tag: 'important'
        });

        try {
          await bookmarkPollService.bookmarkMessage({
            userId,
            messageId,
            tag: 'important'
          });
          assert.fail('Should have thrown error for duplicate');
        } catch (error) {
          assert.ok(error.message.includes('already bookmarked'));
        }
      });

      it('should support optional notes and folder', async () => {
        const result = await bookmarkPollService.bookmarkMessage({
          userId,
          messageId,
          tag: 'important',
          notes: 'Follow up tomorrow',
          folder: 'Work'
        });

        assert.strictEqual(result.notes, 'Follow up tomorrow');
        assert.strictEqual(result.folder, 'Work');
      });
    });

    describe('unbookmarkMessage()', () => {
      let bookmarkId;

      beforeEach(async () => {
        const bookmark = await bookmarkPollService.bookmarkMessage({
          userId,
          messageId,
          tag: 'important'
        });
        bookmarkId = bookmark._id;
      });

      it('should remove a bookmark', async () => {
        const result = await bookmarkPollService.unbookmarkMessage(bookmarkId, userId);

        assert.ok(result.acknowledged);
      });

      it('should verify user ownership before removing', async () => {
        const otherUserId = new mongoose.Types.ObjectId();

        try {
          await bookmarkPollService.unbookmarkMessage(bookmarkId, otherUserId);
          assert.fail('Should have thrown error');
        } catch (error) {
          assert.ok(error.message.includes('not found'));
        }
      });
    });

    describe('getBookmarks()', () => {
      beforeEach(async () => {
        await MessageBookmark.create([
          {
            userId,
            messageId: new mongoose.Types.ObjectId(),
            messageContent: 'Bookmark 1',
            tag: 'work'
          },
          {
            userId,
            messageId: new mongoose.Types.ObjectId(),
            messageContent: 'Bookmark 2',
            tag: 'personal'
          },
          {
            userId,
            messageId: new mongoose.Types.ObjectId(),
            messageContent: 'Bookmark 3',
            tag: 'work'
          }
        ]);
      });

      it('should retrieve all bookmarks with pagination', async () => {
        const result = await bookmarkPollService.getBookmarks({
          userId,
          page: 1,
          limit: 10
        });

        assert.strictEqual(result.bookmarks.length, 3);
      });

      it('should filter by tag', async () => {
        const result = await bookmarkPollService.getBookmarks({
          userId,
          tag: 'work',
          page: 1,
          limit: 10
        });

        assert.strictEqual(result.bookmarks.length, 2);
        assert.ok(result.bookmarks.every(b => b.tag === 'work'));
      });

      it('should support pagination', async () => {
        const page1 = await bookmarkPollService.getBookmarks({
          userId,
          page: 1,
          limit: 2
        });

        assert.strictEqual(page1.bookmarks.length, 2);

        const page2 = await bookmarkPollService.getBookmarks({
          userId,
          page: 2,
          limit: 2
        });

        assert.strictEqual(page2.bookmarks.length, 1);
      });
    });

    describe('searchBookmarks()', () => {
      beforeEach(async () => {
        await MessageBookmark.create([
          {
            userId,
            messageId: new mongoose.Types.ObjectId(),
            messageContent: 'Meeting notes about project',
            tag: 'work'
          },
          {
            userId,
            messageId: new mongoose.Types.ObjectId(),
            messageContent: 'Recipe for cake',
            tag: 'personal'
          }
        ]);
      });

      it('should search bookmarks by content', async () => {
        const result = await bookmarkPollService.searchBookmarks({
          userId,
          query: 'project',
          page: 1,
          limit: 10
        });

        assert.strictEqual(result.length, 1);
        assert.ok(result[0].messageContent.includes('project'));
      });

      it('should return empty for non-matching query', async () => {
        const result = await bookmarkPollService.searchBookmarks({
          userId,
          query: 'nonexistent',
          page: 1,
          limit: 10
        });

        assert.strictEqual(result.length, 0);
      });
    });

    describe('updateBookmark()', () => {
      let bookmarkId;

      beforeEach(async () => {
        const bookmark = await MessageBookmark.create({
          userId,
          messageId,
          messageContent: 'Test',
          tag: 'work'
        });
        bookmarkId = bookmark._id;
      });

      it('should update bookmark metadata', async () => {
        const result = await bookmarkPollService.updateBookmark(bookmarkId, {
          tag: 'urgent',
          notes: 'Updated notes'
        });

        assert.strictEqual(result.tag, 'urgent');
        assert.strictEqual(result.notes, 'Updated notes');
      });

      it('should update star status', async () => {
        const result = await bookmarkPollService.updateBookmark(bookmarkId, {
          star: true
        });

        assert.strictEqual(result.star, true);
      });
    });
  });

  describe('Poll Operations', () => {
    describe('createPoll()', () => {
      it('should create a poll with valid options', async () => {
        const result = await bookmarkPollService.createPoll({
          chatId,
          userId,
          question: 'What is your favorite color?',
          options: ['Red', 'Blue', 'Green'],
          pollConfig: {
            pollType: 'single-choice',
            isAnonymous: false
          }
        });

        assert.ok(result._id);
        assert.strictEqual(result.question, 'What is your favorite color?');
        assert.strictEqual(result.options.length, 3);
        assert.strictEqual(result.totalVotes, 0);
        assert.strictEqual(result.isClosed, false);
      });

      it('should require minimum 2 options', async () => {
        try {
          await bookmarkPollService.createPoll({
            chatId,
            userId,
            question: 'Question',
            options: ['Option 1'],
            pollConfig: { pollType: 'single-choice' }
          });
          assert.fail('Should have thrown error');
        } catch (error) {
          assert.ok(error.message.includes('at least 2 options'));
        }
      });

      it('should support multiple choice polls', async () => {
        const result = await bookmarkPollService.createPoll({
          chatId,
          userId,
          question: 'Select all that apply',
          options: ['A', 'B', 'C'],
          pollConfig: {
            pollType: 'multiple-choice',
            allowMultipleVotes: true
          }
        });

        assert.strictEqual(result.pollConfig.allowMultipleVotes, true);
      });

      it('should support optional expiration', async () => {
        const expiresAt = new Date(Date.now() + 3600000);

        const result = await bookmarkPollService.createPoll({
          chatId,
          userId,
          question: 'Time limited poll',
          options: ['Yes', 'No'],
          pollConfig: {
            pollType: 'single-choice',
            expiresAt
          }
        });

        assert.ok(result.pollConfig.expiresAt);
      });
    });

    describe('votePoll()', () => {
      let pollId;

      beforeEach(async () => {
        const poll = await bookmarkPollService.createPoll({
          chatId,
          userId: new mongoose.Types.ObjectId(),
          question: 'Color preference?',
          options: ['Red', 'Blue', 'Green'],
          pollConfig: { pollType: 'single-choice' }
        });
        pollId = poll._id;
      });

      it('should record a vote', async () => {
        const result = await bookmarkPollService.votePoll({
          pollId,
          userId,
          selectedOptions: [0]
        });

        assert.ok(result._id);
        assert.deepStrictEqual(result.selectedOptions, [0]);
      });

      it('should prevent duplicate votes in single-choice', async () => {
        await bookmarkPollService.votePoll({
          pollId,
          userId,
          selectedOptions: [0]
        });

        try {
          await bookmarkPollService.votePoll({
            pollId,
            userId,
            selectedOptions: [1]
          });
          assert.fail('Should have thrown error');
        } catch (error) {
          assert.ok(error.message.includes('already voted'));
        }
      });

      it('should allow multiple votes in multiple-choice', async () => {
        const multiPoll = await bookmarkPollService.createPoll({
          chatId,
          userId: new mongoose.Types.ObjectId(),
          question: 'Select multiple',
          options: ['A', 'B', 'C'],
          pollConfig: {
            pollType: 'multiple-choice',
            allowMultipleVotes: true
          }
        });

        const vote1 = await bookmarkPollService.votePoll({
          pollId: multiPoll._id,
          userId,
          selectedOptions: [0]
        });

        const vote2 = await bookmarkPollService.votePoll({
          pollId: multiPoll._id,
          userId: new mongoose.Types.ObjectId(),
          selectedOptions: [1, 2]
        });

        assert.ok(vote1);
        assert.ok(vote2);
      });
    });

    describe('getPollResults()', () => {
      let pollId;

      beforeEach(async () => {
        const poll = await bookmarkPollService.createPoll({
          chatId,
          userId: new mongoose.Types.ObjectId(),
          question: 'Preference?',
          options: ['Option A', 'Option B'],
          pollConfig: { pollType: 'single-choice' }
        });
        pollId = poll._id;

        await bookmarkPollService.votePoll({
          pollId,
          userId: new mongoose.Types.ObjectId(),
          selectedOptions: [0]
        });

        await bookmarkPollService.votePoll({
          pollId,
          userId: new mongoose.Types.ObjectId(),
          selectedOptions: [0]
        });

        await bookmarkPollService.votePoll({
          pollId,
          userId: new mongoose.Types.ObjectId(),
          selectedOptions: [1]
        });
      });

      it('should return aggregated poll results', async () => {
        const result = await bookmarkPollService.getPollResults(pollId);

        assert.strictEqual(result.totalVotes, 3);
        assert.strictEqual(result.options[0].votes, 2);
        assert.strictEqual(result.options[0].percentage, 66.67);
        assert.strictEqual(result.options[1].votes, 1);
        assert.strictEqual(result.options[1].percentage, 33.33);
      });

      it('should handle zero votes', async () => {
        const poll = await bookmarkPollService.createPoll({
          chatId,
          userId: new mongoose.Types.ObjectId(),
          question: 'New poll?',
          options: ['Yes', 'No'],
          pollConfig: { pollType: 'single-choice' }
        });

        const result = await bookmarkPollService.getPollResults(poll._id);

        assert.strictEqual(result.totalVotes, 0);
        assert.ok(result.options.every(o => o.votes === 0));
      });
    });

    describe('closePoll()', () => {
      let pollId;

      beforeEach(async () => {
        const poll = await bookmarkPollService.createPoll({
          chatId,
          userId: new mongoose.Types.ObjectId(),
          question: 'Question?',
          options: ['A', 'B'],
          pollConfig: { pollType: 'single-choice' }
        });
        pollId = poll._id;
      });

      it('should close a poll', async () => {
        const result = await bookmarkPollService.closePoll(pollId);

        assert.strictEqual(result.isClosed, true);
        assert.ok(result.closedAt);
      });

      it('should prevent voting on closed poll', async () => {
        await bookmarkPollService.closePoll(pollId);

        try {
          await bookmarkPollService.votePoll({
            pollId,
            userId,
            selectedOptions: [0]
          });
          assert.fail('Should have thrown error');
        } catch (error) {
          assert.ok(error.message.includes('closed'));
        }
      });
    });

    describe('deletePoll()', () => {
      let pollId;

      beforeEach(async () => {
        const poll = await bookmarkPollService.createPoll({
          chatId,
          userId: new mongoose.Types.ObjectId(),
          question: 'To delete?',
          options: ['A', 'B'],
          pollConfig: { pollType: 'single-choice' }
        });
        pollId = poll._id;

        // Add some votes
        await bookmarkPollService.votePoll({
          pollId,
          userId: new mongoose.Types.ObjectId(),
          selectedOptions: [0]
        });
      });

      it('should delete poll and cascade to votes', async () => {
        const result = await bookmarkPollService.deletePoll(pollId);

        assert.ok(result.acknowledged);

        const deleted = await Poll.findById(pollId);
        assert.strictEqual(deleted, null);

        const votes = await PollVote.find({ pollId });
        assert.strictEqual(votes.length, 0);
      });
    });

    describe('getChatPolls()', () => {
      beforeEach(async () => {
        await bookmarkPollService.createPoll({
          chatId,
          userId: new mongoose.Types.ObjectId(),
          question: 'Poll 1?',
          options: ['A', 'B'],
          pollConfig: { pollType: 'single-choice' }
        });

        await bookmarkPollService.createPoll({
          chatId,
          userId: new mongoose.Types.ObjectId(),
          question: 'Poll 2?',
          options: ['X', 'Y'],
          pollConfig: { pollType: 'single-choice' }
        });
      });

      it('should retrieve all polls for a chat', async () => {
        const result = await bookmarkPollService.getChatPolls(chatId);

        assert.strictEqual(result.length, 2);
      });

      it('should filter by status', async () => {
        const polls = await bookmarkPollService.getChatPolls(chatId);
        await Poll.findByIdAndUpdate(polls[0]._id, { isClosed: true });

        const result = await bookmarkPollService.getChatPolls(chatId, 'open');

        assert.strictEqual(result.length, 1);
      });
    });
  });
});
