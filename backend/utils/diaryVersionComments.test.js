/**
 * Diary Version Comments - Unit Tests
 * Tests for comment CRUD operations, threading, likes, and statistics
 */

const mongoose = require('mongoose');
const diaryVersionComments = require('./diaryVersionComments');

// Mock logger
jest.mock('./logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock models
jest.mock('../models/DiaryVersionComment', () => {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn()
  };
});

const DiaryVersionComment = require('../models/DiaryVersionComment');

describe('DiaryVersionComments Utility', () => {
  const mockUserId = new mongoose.Types.ObjectId();
  const mockEntryId = new mongoose.Types.ObjectId();
  const mockVersionId = new mongoose.Types.ObjectId();
  const mockCommentId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addCommentToVersion', () => {
    it('should create a comment successfully', async () => {
      const commentData = {
        text: 'This is a great version!',
        sentiment: 'positive',
        isPrivate: false
      };

      const mockComment = {
        _id: mockCommentId,
        userId: mockUserId,
        entryId: mockEntryId,
        versionId: mockVersionId,
        versionNumber: 5,
        text: commentData.text,
        sentiment: commentData.sentiment,
        isPrivate: commentData.isPrivate,
        likes: 0,
        likedBy: [],
        createdAt: new Date()
      };

      DiaryVersionComment.create.mockResolvedValue(mockComment);

      const result = await diaryVersionComments.addCommentToVersion(
        mockUserId,
        mockEntryId,
        mockVersionId,
        5,
        commentData
      );

      expect(DiaryVersionComment.create).toHaveBeenCalled();
      expect(result.text).toBe(commentData.text);
      expect(result.sentiment).toBe('positive');
    });

    it('should create a threaded reply successfully', async () => {
      const commentData = {
        text: 'I agree!',
        sentiment: 'positive',
        parentCommentId: mockCommentId
      };

      const mockReply = {
        _id: new mongoose.Types.ObjectId(),
        userId: mockUserId,
        entryId: mockEntryId,
        versionId: mockVersionId,
        text: commentData.text,
        parentCommentId: mockCommentId,
        isDeleted: false,
        createdAt: new Date()
      };

      DiaryVersionComment.create.mockResolvedValue(mockReply);

      const result = await diaryVersionComments.addCommentToVersion(
        mockUserId,
        mockEntryId,
        mockVersionId,
        5,
        commentData
      );

      expect(result.parentCommentId).toEqual(mockCommentId);
    });

    it('should reject comment exceeding max length', async () => {
      const longText = 'a'.repeat(2001);
      const commentData = {
        text: longText,
        sentiment: 'positive'
      };

      await expect(
        diaryVersionComments.addCommentToVersion(
          mockUserId,
          mockEntryId,
          mockVersionId,
          5,
          commentData
        )
      ).rejects.toThrow();
    });
  });

  describe('getVersionComments', () => {
    it('should retrieve comments for a version', async () => {
      const mockComments = [
        {
          _id: mockCommentId,
          text: 'First comment',
          likes: 2,
          createdAt: new Date('2026-05-01')
        },
        {
          _id: new mongoose.Types.ObjectId(),
          text: 'Second comment',
          likes: 5,
          createdAt: new Date('2026-05-02')
        }
      ];

      DiaryVersionComment.find.mockResolvedValue(mockComments);

      const result = await diaryVersionComments.getVersionComments(
        mockEntryId,
        mockVersionId,
        true
      );

      expect(DiaryVersionComment.find).toHaveBeenCalled();
      expect(result.length).toBe(2);
    });

    it('should include reply threading when requested', async () => {
      const mockComments = [
        {
          _id: mockCommentId,
          text: 'Main comment',
          parentCommentId: null,
          replies: [
            {
              _id: new mongoose.Types.ObjectId(),
              text: 'Reply',
              parentCommentId: mockCommentId
            }
          ]
        }
      ];

      DiaryVersionComment.find.mockResolvedValue(mockComments);

      const result = await diaryVersionComments.getVersionComments(
        mockEntryId,
        mockVersionId,
        true
      );

      expect(result[0].replies).toBeDefined();
    });

    it('should filter out deleted comments', async () => {
      const mockComments = [
        { _id: mockCommentId, text: 'Active', isDeleted: false },
        { _id: new mongoose.Types.ObjectId(), text: 'Deleted', isDeleted: true }
      ];

      DiaryVersionComment.find.mockResolvedValue(
        mockComments.filter(c => !c.isDeleted)
      );

      const result = await diaryVersionComments.getVersionComments(
        mockEntryId,
        mockVersionId
      );

      expect(result.every(c => !c.isDeleted)).toBe(true);
    });
  });

  describe('updateComment', () => {
    it('should update comment by author only', async () => {
      const updates = { text: 'Updated comment', sentiment: 'neutral' };

      const mockComment = {
        _id: mockCommentId,
        userId: mockUserId,
        text: updates.text,
        sentiment: updates.sentiment
      };

      DiaryVersionComment.findById.mockResolvedValue(mockComment);
      DiaryVersionComment.findByIdAndUpdate.mockResolvedValue(mockComment);

      const result = await diaryVersionComments.updateComment(
        mockCommentId,
        mockUserId,
        updates
      );

      expect(result.text).toBe(updates.text);
    });

    it('should reject update by non-author', async () => {
      const differentUserId = new mongoose.Types.ObjectId();
      const mockComment = { _id: mockCommentId, userId: mockUserId };

      DiaryVersionComment.findById.mockResolvedValue(mockComment);

      await expect(
        diaryVersionComments.updateComment(
          mockCommentId,
          differentUserId,
          { text: 'Hacked!' }
        )
      ).rejects.toThrow();
    });
  });

  describe('deleteComment', () => {
    it('should soft delete comment by author', async () => {
      const mockComment = {
        _id: mockCommentId,
        userId: mockUserId,
        isDeleted: true,
        deletedAt: new Date()
      };

      DiaryVersionComment.findById.mockResolvedValue(mockComment);
      DiaryVersionComment.findByIdAndUpdate.mockResolvedValue(mockComment);

      const result = await diaryVersionComments.deleteComment(
        mockCommentId,
        mockUserId
      );

      expect(result.isDeleted).toBe(true);
    });

    it('should reject deletion by non-author', async () => {
      const differentUserId = new mongoose.Types.ObjectId();
      const mockComment = { _id: mockCommentId, userId: mockUserId };

      DiaryVersionComment.findById.mockResolvedValue(mockComment);

      await expect(
        diaryVersionComments.deleteComment(mockCommentId, differentUserId)
      ).rejects.toThrow();
    });
  });

  describe('toggleCommentLike', () => {
    it('should like a comment', async () => {
      const mockComment = {
        _id: mockCommentId,
        likes: 1,
        likedBy: [mockUserId.toString()]
      };

      DiaryVersionComment.findById.mockResolvedValue(mockComment);
      DiaryVersionComment.findByIdAndUpdate.mockResolvedValue(mockComment);

      const result = await diaryVersionComments.toggleCommentLike(
        mockCommentId,
        mockUserId,
        true
      );

      expect(result.likes).toBe(1);
      expect(result.likedBy).toContain(mockUserId.toString());
    });

    it('should unlike a previously liked comment', async () => {
      const mockComment = {
        _id: mockCommentId,
        likes: 0,
        likedBy: []
      };

      DiaryVersionComment.findById.mockResolvedValue(mockComment);
      DiaryVersionComment.findByIdAndUpdate.mockResolvedValue(mockComment);

      const result = await diaryVersionComments.toggleCommentLike(
        mockCommentId,
        mockUserId,
        false
      );

      expect(result.likes).toBe(0);
      expect(result.likedBy.length).toBe(0);
    });
  });

  describe('getVersionCommentStats', () => {
    it('should aggregate comment statistics', async () => {
      const mockStats = [
        {
          _id: null,
          totalComments: 5,
          sentimentBreakdown: {
            positive: 3,
            neutral: 1,
            negative: 1
          },
          totalLikes: 12,
          mostLikedComment: {
            _id: mockCommentId,
            text: 'Great!',
            likes: 8
          }
        }
      ];

      DiaryVersionComment.aggregate.mockResolvedValue(mockStats);

      const result = await diaryVersionComments.getVersionCommentStats(mockVersionId);

      expect(result.totalComments).toBe(5);
      expect(result.sentimentBreakdown.positive).toBe(3);
      expect(result.totalLikes).toBe(12);
    });

    it('should return zero stats for version with no comments', async () => {
      DiaryVersionComment.aggregate.mockResolvedValue([]);

      const result = await diaryVersionComments.getVersionCommentStats(mockVersionId);

      expect(result.totalComments || 0).toBe(0);
    });
  });

  describe('searchComments', () => {
    it('should search comments by text', async () => {
      const searchResults = [
        { _id: mockCommentId, text: 'Contains search term', versionId: mockVersionId }
      ];

      DiaryVersionComment.find.mockResolvedValue(searchResults);

      const result = await diaryVersionComments.searchComments(
        mockUserId,
        mockEntryId,
        'search'
      );

      expect(result.length).toBe(1);
      expect(result[0].text).toContain('search');
    });

    it('should return empty array if no matches', async () => {
      DiaryVersionComment.find.mockResolvedValue([]);

      const result = await diaryVersionComments.searchComments(
        mockUserId,
        mockEntryId,
        'nonexistent'
      );

      expect(result.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      DiaryVersionComment.create.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        diaryVersionComments.addCommentToVersion(
          mockUserId,
          mockEntryId,
          mockVersionId,
          5,
          { text: 'Comment', sentiment: 'positive' }
        )
      ).rejects.toThrow();
    });

    it('should validate required fields', async () => {
      const invalidData = { sentiment: 'positive' }; // missing text

      await expect(
        diaryVersionComments.addCommentToVersion(
          mockUserId,
          mockEntryId,
          mockVersionId,
          5,
          invalidData
        )
      ).rejects.toThrow();
    });
  });
});
