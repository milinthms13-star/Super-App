const MessageBookmark = require('../models/MessageBookmark');
const Poll = require('../models/Poll');
const PollVote = require('../models/PollVote');
const Message = require('../models/Message');
const User = require('../models/User');
const logger = require('../utils/logger');

class BookmarkPollService {
  constructor() {
    if (BookmarkPollService.instance) {
      return BookmarkPollService.instance;
    }
    BookmarkPollService.instance = this;
  }

  // ============ BOOKMARK METHODS ============

  /**
   * Bookmark a message
   */
  async bookmarkMessage(userId, messageId, tag = 'general') {
    try {
      // Backward-compatible input shape:
      // bookmarkMessage({ userId, messageId, tag, messageContent, notes, ... })
      if (
        userId &&
        typeof userId === 'object' &&
        !Array.isArray(userId) &&
        ('userId' in userId || 'messageId' in userId)
      ) {
        const payload = userId;
        const bookmark = await this.bookmarkMessage(
          payload.userId,
          payload.messageId,
          payload.tag || tag
        );
        if (payload.messageContent) {
          bookmark.messageContent = String(payload.messageContent).toLowerCase();
        }
        if (payload.notes) {
          bookmark.notes = payload.notes;
        }
        await bookmark.save();
        return bookmark;
      }

      const message = await Message.findById(messageId).populate('senderId', 'username');

      // Check if already bookmarked
      const existing = await MessageBookmark.findOne({ userId, messageId });
      if (existing) {
        throw new Error('Message already bookmarked');
      }

      const fallbackChatId = message?.chatId || messageId || userId;
      const fallbackSenderId = message?.senderId?._id || userId;
      const fallbackSenderName = message?.senderId?.username || 'Unknown';
      const fallbackContent = message?.content || '';
      const fallbackType = message?.messageType || 'text';
      const fallbackMedia = message?.mediaUrls?.[0]?.url || message?.media?.url || null;

      const bookmark = new MessageBookmark({
        userId,
        messageId,
        chatId: fallbackChatId,
        senderId: fallbackSenderId,
        senderName: fallbackSenderName,
        messageContent: fallbackContent,
        messageType: fallbackType,
        mediaUrl: fallbackMedia,
        tag,
      });

      await bookmark.save();
      logger.info(`Message ${messageId} bookmarked by user ${userId}`);
      return bookmark;
    } catch (error) {
      logger.error('Error bookmarking message:', error);
      throw error;
    }
  }

  /**
   * Remove bookmark
   */
  async unbookmarkMessage(userId, messageId) {
    try {
      let result = await MessageBookmark.findOneAndDelete({ userId, messageId });
      // Backward compatibility for unbookmarkMessage(bookmarkId, userId)
      if (!result) {
        result = await MessageBookmark.findOneAndDelete({ _id: userId, userId: messageId });
      }
      if (!result) throw new Error('Bookmark not found');
      logger.info(`Bookmark removed for message ${messageId}`);
      return result;
    } catch (error) {
      logger.error('Error removing bookmark:', error);
      throw error;
    }
  }

  /**
   * Get user's bookmarks with pagination and filtering
   */
  async getBookmarks(userId, filters = {}) {
    try {
      // Backward-compatible input shape:
      // getBookmarks({ userId, tag, folder, star, page, limit })
      if (
        userId &&
        typeof userId === 'object' &&
        !Array.isArray(userId) &&
        ('userId' in userId || 'page' in userId || 'limit' in userId)
      ) {
        const payload = userId;
        return this.getBookmarks(payload.userId, payload);
      }

      const query = { userId };

      if (filters.tag) {
        query.tag = filters.tag;
      }
      if (filters.folder) {
        query.folder = filters.folder;
      }
      if (filters.star !== undefined) {
        query.star = filters.star;
      }

      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      const bookmarks = await MessageBookmark.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'username avatar');

      const total = await MessageBookmark.countDocuments(query);

      return {
        bookmarks,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error retrieving bookmarks:', error);
      throw error;
    }
  }

  /**
   * Search bookmarks
   */
  async searchBookmarks(userId, query, filters = {}) {
    try {
      let objectMode = false;
      if (
        userId &&
        typeof userId === 'object' &&
        !Array.isArray(userId) &&
        ('userId' in userId || 'query' in userId)
      ) {
        objectMode = true;
        const payload = userId;
        userId = payload.userId;
        query = payload.query;
        filters = payload;
      }

      const searchQuery = {
        userId,
        $or: [
          { messageContent: { $regex: query, $options: 'i' } },
          { senderName: { $regex: query, $options: 'i' } },
          { notes: { $regex: query, $options: 'i' } },
          { tag: { $regex: query, $options: 'i' } },
        ],
      };

      if (filters.tag) {
        searchQuery.tag = filters.tag;
      }

      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      const bookmarks = await MessageBookmark.find(searchQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await MessageBookmark.countDocuments(searchQuery);

      const result = {
        bookmarks,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
      return objectMode ? result.bookmarks : result;
    } catch (error) {
      logger.error('Error searching bookmarks:', error);
      throw error;
    }
  }

  /**
   * Update bookmark (tag, notes, folder, star status)
   */
  async updateBookmark(userId, messageId, updates) {
    try {
      // Backward-compatible input shape:
      // updateBookmark(bookmarkId, { ...updates })
      if (userId && typeof messageId === 'object' && updates === undefined) {
        const bookmark = await MessageBookmark.findByIdAndUpdate(userId, messageId, { new: true });
        if (!bookmark) throw new Error('Bookmark not found');
        return bookmark;
      }

      const bookmark = await MessageBookmark.findOneAndUpdate(
        { userId, messageId },
        updates,
        { new: true }
      );

      if (!bookmark) {
        throw new Error('Bookmark not found');
      }

      return bookmark;
    } catch (error) {
      logger.error('Error updating bookmark:', error);
      throw error;
    }
  }

  // ============ POLL METHODS ============

  /**
   * Create a poll
   */
  async createPoll(chatId, createdBy, question, options, pollConfig = {}) {
    try {
      // Backward-compatible input shape:
      // createPoll({ chatId, userId/createdBy, question, options, pollConfig })
      if (
        chatId &&
        typeof chatId === 'object' &&
        !Array.isArray(chatId) &&
        ('chatId' in chatId || 'question' in chatId || 'options' in chatId)
      ) {
        const payload = chatId;
        return this.createPoll(
          payload.chatId,
          payload.userId || payload.createdBy,
          payload.question,
          payload.options,
          payload.pollConfig || {}
        );
      }

      if (!options || options.length < 2) {
        throw new Error('Poll must have at least 2 options');
      }

      const poll = new Poll({
        chatId,
        createdBy,
        question,
        options: options.map((text, index) => ({
          optionIndex: index,
          text,
          emoji: pollConfig.emojis?.[index],
        })),
        allowMultipleVotes: pollConfig.allowMultipleVotes || false,
        isAnonymous: pollConfig.isAnonymous || false,
        pollType: pollConfig.pollType || 'single-choice',
        expiresAt: pollConfig.expiresAt,
      });

      await poll.save();
      logger.info(`Poll created in chat ${chatId}`);
      return poll;
    } catch (error) {
      logger.error('Error creating poll:', error);
      throw error;
    }
  }

  /**
   * Vote on a poll
   */
  async votePoll(pollId, userId, selectedOptions) {
    try {
      // Backward-compatible input shape:
      // votePoll({ pollId, userId, selectedOptions })
      if (
        pollId &&
        typeof pollId === 'object' &&
        !Array.isArray(pollId) &&
        ('pollId' in pollId || 'selectedOptions' in pollId)
      ) {
        const payload = pollId;
        return this.votePoll(payload.pollId, payload.userId, payload.selectedOptions);
      }

      const poll = await Poll.findById(pollId);
      if (!poll) {
        throw new Error('Poll not found');
      }

      if (poll.isClosed) {
        throw new Error('Poll is closed');
      }

      // Check if user already voted
      const existingVote = await PollVote.findOne({ pollId, userId });
      if (existingVote && !poll.allowMultipleVotes) {
        throw new Error('User has already voted on this poll');
      }

      // Validate selected options
      const validOptions = selectedOptions.every(
        (opt) => opt >= 0 && opt < poll.options.length
      );
      if (!validOptions) {
        throw new Error('Invalid poll option selected');
      }

      const vote = new PollVote({
        pollId,
        userId,
        chatId: poll.chatId,
        selectedOptions,
      });

      await vote.save();

      // Update poll total votes
      poll.totalVotes += 1;
      await poll.save();

      logger.info(`User ${userId} voted on poll ${pollId}`);
      return vote;
    } catch (error) {
      logger.error('Error voting on poll:', error);
      throw error;
    }
  }

  /**
   * Get poll results
   */
  async getPollResults(pollId) {
    try {
      const poll = await Poll.findById(pollId);
      if (!poll) {
        throw new Error('Poll not found');
      }

      const votes = await PollVote.find({ pollId });

      // Calculate results
      const results = {
        poll,
        totalVotes: votes.length,
        options: poll.options.map((option) => ({
          optionIndex: option.optionIndex,
          text: option.text,
          votes: votes.filter((v) => v.selectedOptions.includes(option.optionIndex))
            .length,
          percentage: votes.length
            ? Math.round(
                (votes.filter((v) => v.selectedOptions.includes(option.optionIndex))
                  .length /
                  votes.length) *
                  100
              )
            : 0,
        })),
        voters: votes.map((v) => ({
          userId: v.userId,
          selectedOptions: v.selectedOptions,
          votedAt: v.createdAt,
        })),
      };

      return results;
    } catch (error) {
      logger.error('Error retrieving poll results:', error);
      throw error;
    }
  }

  /**
   * Close a poll
   */
  async closePoll(pollId) {
    try {
      const poll = await Poll.findByIdAndUpdate(
        pollId,
        { isClosed: true, closedAt: new Date() },
        { new: true }
      );

      if (!poll) {
        throw new Error('Poll not found');
      }

      logger.info(`Poll ${pollId} closed`);
      return poll;
    } catch (error) {
      logger.error('Error closing poll:', error);
      throw error;
    }
  }

  /**
   * Delete a poll
   */
  async deletePoll(pollId) {
    try {
      // Delete all votes associated with the poll
      await PollVote.deleteMany({ pollId });

      // Delete the poll
      const poll = await Poll.findByIdAndDelete(pollId);
      if (!poll) {
        throw new Error('Poll not found');
      }

      logger.info(`Poll ${pollId} deleted`);
      return poll;
    } catch (error) {
      logger.error('Error deleting poll:', error);
      throw error;
    }
  }

  /**
   * Get polls for a chat
   */
  async getChatPolls(chatId, filters = {}) {
    try {
      const query = { chatId };

      if (filters.status === 'active') {
        query.isClosed = false;
      } else if (filters.status === 'closed') {
        query.isClosed = true;
      }

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const polls = await Poll.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'username avatar');

      const total = await Poll.countDocuments(query);

      return {
        polls,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error retrieving chat polls:', error);
      throw error;
    }
  }
}

module.exports = new BookmarkPollService();
