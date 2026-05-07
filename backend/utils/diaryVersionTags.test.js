/**
 * Diary Version Tags - Unit Tests
 * Tests for tag management, predefined tags, and bulk operations
 */

const mongoose = require('mongoose');
const diaryVersionTags = require('./diaryVersionTags');

// Mock logger
jest.mock('./logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock models
jest.mock('../models/DiaryVersionTag', () => {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    find: jest.fn(),
    aggregate: jest.fn()
  };
});

const DiaryVersionTag = require('../models/DiaryVersionTag');

describe('DiaryVersionTags Utility', () => {
  const mockUserId = new mongoose.Types.ObjectId();
  const mockEntryId = new mongoose.Types.ObjectId();
  const mockVersionId = new mongoose.Types.ObjectId();
  const mockTagId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addTagToVersion', () => {
    it('should add a predefined tag to version', async () => {
      const tagData = {
        name: 'final',
        reason: 'This version is complete'
      };

      const mockTag = {
        _id: mockTagId,
        userId: mockUserId,
        entryId: mockEntryId,
        versionId: mockVersionId,
        versionNumber: 5,
        name: tagData.name,
        color: '#10b981',
        description: 'Final version ready for archival',
        reason: tagData.reason,
        createdAt: new Date()
      };

      DiaryVersionTag.create.mockResolvedValue(mockTag);

      const result = await diaryVersionTags.addTagToVersion(
        mockUserId,
        mockEntryId,
        mockVersionId,
        5,
        tagData
      );

      expect(DiaryVersionTag.create).toHaveBeenCalled();
      expect(result.name).toBe('final');
      expect(result.color).toBe('#10b981');
    });

    it('should add a custom tag with custom color', async () => {
      const tagData = {
        name: 'custom-review',
        color: '#FF5733',
        description: 'Needs peer review'
      };

      const mockTag = {
        _id: mockTagId,
        userId: mockUserId,
        entryId: mockEntryId,
        versionId: mockVersionId,
        name: tagData.name,
        color: tagData.color,
        description: tagData.description,
        createdAt: new Date()
      };

      DiaryVersionTag.create.mockResolvedValue(mockTag);

      const result = await diaryVersionTags.addTagToVersion(
        mockUserId,
        mockEntryId,
        mockVersionId,
        5,
        tagData
      );

      expect(result.color).toBe('#FF5733');
    });

    it('should prevent duplicate tags on same version', async () => {
      const tagData = { name: 'final' };

      DiaryVersionTag.find.mockResolvedValue([{ name: 'final' }]);

      await expect(
        diaryVersionTags.addTagToVersion(
          mockUserId,
          mockEntryId,
          mockVersionId,
          5,
          tagData
        )
      ).rejects.toThrow('already tagged');
    });

    it('should validate tag name format', async () => {
      const invalidData = {
        name: '', // empty name
        description: 'Invalid'
      };

      await expect(
        diaryVersionTags.addTagToVersion(
          mockUserId,
          mockEntryId,
          mockVersionId,
          5,
          invalidData
        )
      ).rejects.toThrow();
    });
  });

  describe('getVersionTags', () => {
    it('should retrieve all tags for a version', async () => {
      const mockTags = [
        {
          _id: mockTagId,
          name: 'final',
          color: '#10b981',
          priority: 1,
          createdAt: new Date('2026-05-01')
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'important',
          color: '#ef4444',
          priority: 2,
          createdAt: new Date('2026-05-02')
        }
      ];

      DiaryVersionTag.find.mockResolvedValue(mockTags);

      const result = await diaryVersionTags.getVersionTags(mockVersionId);

      expect(result.length).toBe(2);
      expect(result[0].name).toBe('final');
    });

    it('should sort tags by priority', async () => {
      const mockTags = [
        { name: 'final', priority: 1 },
        { name: 'important', priority: 2 },
        { name: 'draft', priority: 3 }
      ];

      DiaryVersionTag.find.mockResolvedValue(mockTags);

      const result = await diaryVersionTags.getVersionTags(mockVersionId);

      expect(result[0].priority).toBeLessThanOrEqual(result[1].priority);
    });

    it('should return empty array if no tags', async () => {
      DiaryVersionTag.find.mockResolvedValue([]);

      const result = await diaryVersionTags.getVersionTags(mockVersionId);

      expect(result.length).toBe(0);
    });
  });

  describe('getVersionsByTag', () => {
    it('should find all versions with specific tag', async () => {
      const mockVersions = [
        { _id: mockVersionId, versionNumber: 1, name: 'final' },
        { _id: new mongoose.Types.ObjectId(), versionNumber: 3, name: 'final' }
      ];

      DiaryVersionTag.find.mockResolvedValue(mockVersions);

      const result = await diaryVersionTags.getVersionsByTag(
        mockUserId,
        mockEntryId,
        'final'
      );

      expect(result.length).toBe(2);
      expect(result.every(v => v.name === 'final')).toBe(true);
    });

    it('should filter by user and entry', async () => {
      const differentUserId = new mongoose.Types.ObjectId();

      DiaryVersionTag.find.mockResolvedValue([]);

      await diaryVersionTags.getVersionsByTag(
        differentUserId,
        mockEntryId,
        'final'
      );

      expect(DiaryVersionTag.find).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: differentUserId,
          entryId: mockEntryId,
          name: 'final'
        })
      );
    });
  });

  describe('removeTagFromVersion', () => {
    it('should delete tag by author', async () => {
      const mockTag = { _id: mockTagId, userId: mockUserId };

      DiaryVersionTag.findById.mockResolvedValue(mockTag);
      DiaryVersionTag.findByIdAndDelete.mockResolvedValue(mockTag);

      const result = await diaryVersionTags.removeTagFromVersion(
        mockTagId,
        mockUserId
      );

      expect(DiaryVersionTag.findByIdAndDelete).toHaveBeenCalledWith(mockTagId);
    });

    it('should reject deletion by non-author', async () => {
      const differentUserId = new mongoose.Types.ObjectId();
      const mockTag = { _id: mockTagId, userId: mockUserId };

      DiaryVersionTag.findById.mockResolvedValue(mockTag);

      await expect(
        diaryVersionTags.removeTagFromVersion(mockTagId, differentUserId)
      ).rejects.toThrow();
    });
  });

  describe('updateTag', () => {
    it('should update tag properties', async () => {
      const updates = {
        color: '#FF0000',
        priority: 5,
        description: 'Updated description'
      };

      const mockTag = {
        _id: mockTagId,
        userId: mockUserId,
        ...updates
      };

      DiaryVersionTag.findById.mockResolvedValue(mockTag);
      DiaryVersionTag.findByIdAndUpdate.mockResolvedValue(mockTag);

      const result = await diaryVersionTags.updateTag(
        mockTagId,
        mockUserId,
        updates
      );

      expect(result.color).toBe('#FF0000');
      expect(result.priority).toBe(5);
    });

    it('should reject update by non-author', async () => {
      const differentUserId = new mongoose.Types.ObjectId();
      const mockTag = { _id: mockTagId, userId: mockUserId };

      DiaryVersionTag.findById.mockResolvedValue(mockTag);

      await expect(
        diaryVersionTags.updateTag(mockTagId, differentUserId, { color: '#000' })
      ).rejects.toThrow();
    });
  });

  describe('getEntryTagStats', () => {
    it('should aggregate tag statistics for entry', async () => {
      const mockStats = [
        {
          _id: null,
          totalTags: 5,
          tagBreakdown: [
            { name: 'final', count: 2 },
            { name: 'important', count: 2 },
            { name: 'draft', count: 1 }
          ],
          mostUsedTag: 'final'
        }
      ];

      DiaryVersionTag.aggregate.mockResolvedValue(mockStats);

      const result = await diaryVersionTags.getEntryTagStats(mockEntryId);

      expect(result.totalTags).toBe(5);
      expect(result.mostUsedTag).toBe('final');
    });

    it('should return empty stats for entry with no tags', async () => {
      DiaryVersionTag.aggregate.mockResolvedValue([]);

      const result = await diaryVersionTags.getEntryTagStats(mockEntryId);

      expect(result.totalTags || 0).toBe(0);
    });
  });

  describe('getPredefinedTags', () => {
    it('should return all predefined tags with colors', () => {
      const result = diaryVersionTags.getPredefinedTags();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(t => t.name && t.color)).toBe(true);
    });

    it('should include all expected predefined tags', () => {
      const result = diaryVersionTags.getPredefinedTags();
      const tagNames = result.map(t => t.name);

      const expectedTags = ['final', 'review-ready', 'archive', 'important', 'draft', 'shared', 'bookmarked'];
      expectedTags.forEach(tag => {
        expect(tagNames).toContain(tag);
      });
    });

    it('should have valid hex color codes', () => {
      const result = diaryVersionTags.getPredefinedTags();
      const hexColorRegex = /^#[0-9A-F]{6}$/i;

      result.forEach(tag => {
        expect(tag.color).toMatch(hexColorRegex);
      });
    });
  });

  describe('bulkAddTag', () => {
    it('should add tag to multiple versions', async () => {
      const versionIds = [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId()
      ];

      DiaryVersionTag.create.mockResolvedValue([]);

      const result = await diaryVersionTags.bulkAddTag(
        mockUserId,
        mockEntryId,
        versionIds,
        'final'
      );

      expect(DiaryVersionTag.create).toHaveBeenCalled();
      expect(DiaryVersionTag.create.mock.calls[0][0]).toHaveLength(3);
    });

    it('should skip versions already tagged', async () => {
      const versionIds = [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId()
      ];

      DiaryVersionTag.find.mockResolvedValue([
        { versionId: versionIds[0], name: 'final' }
      ]);

      await diaryVersionTags.bulkAddTag(
        mockUserId,
        mockEntryId,
        versionIds,
        'final'
      );

      const createCall = DiaryVersionTag.create.mock.calls[0][0];
      expect(createCall.length).toBeLessThanOrEqual(1);
    });

    it('should handle empty version list', async () => {
      const result = await diaryVersionTags.bulkAddTag(
        mockUserId,
        mockEntryId,
        [],
        'final'
      );

      expect(result).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      DiaryVersionTag.create.mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        diaryVersionTags.addTagToVersion(
          mockUserId,
          mockEntryId,
          mockVersionId,
          5,
          { name: 'final' }
        )
      ).rejects.toThrow();
    });

    it('should validate tag name is not empty', async () => {
      await expect(
        diaryVersionTags.addTagToVersion(
          mockUserId,
          mockEntryId,
          mockVersionId,
          5,
          { name: '' }
        )
      ).rejects.toThrow();
    });

    it('should validate color format if provided', async () => {
      const invalidColor = { name: 'test', color: 'invalid-color' };

      await expect(
        diaryVersionTags.addTagToVersion(
          mockUserId,
          mockEntryId,
          mockVersionId,
          5,
          invalidColor
        )
      ).rejects.toThrow();
    });
  });
});
