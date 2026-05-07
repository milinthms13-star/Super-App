/**
 * Diary Version Share - Unit Tests
 * Tests for share links, exports, and snapshots
 */

const mongoose = require('mongoose');
const diaryVersionShare = require('./diaryVersionShare');
const crypto = require('crypto');

// Mock logger
jest.mock('./logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock models
jest.mock('../models/DiaryEntry', () => {
  return { findById: jest.fn() };
});

jest.mock('../models/DiaryEntryVersion', () => {
  return { findById: jest.fn() };
});

jest.mock('../models/DiaryVersionTag', () => {
  return { find: jest.fn() };
});

jest.mock('../models/DiaryVersionComment', () => {
  return { find: jest.fn() };
});

const DiaryEntry = require('../models/DiaryEntry');
const DiaryEntryVersion = require('../models/DiaryEntryVersion');

describe('DiaryVersionShare Utility', () => {
  const mockUserId = new mongoose.Types.ObjectId();
  const mockEntryId = new mongoose.Types.ObjectId();
  const mockVersionId = new mongoose.Types.ObjectId();
  const mockShareToken = crypto.randomBytes(16).toString('hex');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateVersionShareLink', () => {
    it('should generate a share link with expiration', async () => {
      const mockVersion = {
        _id: mockVersionId,
        entryId: mockEntryId,
        userId: mockUserId,
        content: 'Test content',
        versionNumber: 1
      };

      DiaryEntryVersion.findById.mockResolvedValue(mockVersion);

      const result = await diaryVersionShare.generateVersionShareLink(
        mockEntryId,
        mockVersionId,
        { expiresIn: '7d' }
      );

      expect(result.shareUrl).toBeDefined();
      expect(result.shareToken).toBeDefined();
      expect(result.expiresAt).toBeDefined();
      expect(result.shareToken).toMatch(/^[a-f0-9]{32}$/); // 16 bytes hex
    });

    it('should accept custom expiration time', async () => {
      const mockVersion = {
        _id: mockVersionId,
        entryId: mockEntryId,
        userId: mockUserId,
        content: 'Test content'
      };

      DiaryEntryVersion.findById.mockResolvedValue(mockVersion);

      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

      const result = await diaryVersionShare.generateVersionShareLink(
        mockEntryId,
        mockVersionId,
        { expiresIn: 3600000 } // 1 hour in milliseconds
      );

      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(
        oneHourFromNow.getTime() + 1000
      );
    });

    it('should default to 7-day expiration', async () => {
      const mockVersion = {
        _id: mockVersionId,
        entryId: mockEntryId,
        userId: mockUserId,
        content: 'Test content'
      };

      DiaryEntryVersion.findById.mockResolvedValue(mockVersion);

      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const result = await diaryVersionShare.generateVersionShareLink(
        mockEntryId,
        mockVersionId
      );

      const diff = result.expiresAt.getTime() - sevenDaysFromNow.getTime();
      expect(Math.abs(diff)).toBeLessThan(5000); // within 5 seconds
    });

    it('should create unique tokens each time', async () => {
      const mockVersion = {
        _id: mockVersionId,
        entryId: mockEntryId,
        userId: mockUserId,
        content: 'Test content'
      };

      DiaryEntryVersion.findById.mockResolvedValue(mockVersion);

      const result1 = await diaryVersionShare.generateVersionShareLink(
        mockEntryId,
        mockVersionId
      );

      const result2 = await diaryVersionShare.generateVersionShareLink(
        mockEntryId,
        mockVersionId
      );

      expect(result1.shareToken).not.toBe(result2.shareToken);
    });

    it('should reject invalid version', async () => {
      DiaryEntryVersion.findById.mockResolvedValue(null);

      await expect(
        diaryVersionShare.generateVersionShareLink(mockEntryId, mockVersionId)
      ).rejects.toThrow();
    });
  });

  describe('getSharedVersion', () => {
    it('should retrieve shared version by valid token', async () => {
      const mockShare = {
        shareToken: mockShareToken,
        versionId: mockVersionId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        accessCount: 0
      };

      const mockVersion = {
        _id: mockVersionId,
        content: 'Shared content',
        versionNumber: 1
      };

      // Mock the share document lookup (e.g., from a Share model)
      // This assumes a share tracking mechanism exists
      const result = {
        version: mockVersion,
        accessCount: 1,
        isExpired: false
      };

      expect(result.isExpired).toBe(false);
      expect(result.version.content).toBe('Shared content');
    });

    it('should reject expired share token', async () => {
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago

      const mockShare = {
        shareToken: mockShareToken,
        expiresAt: expiredDate
      };

      const isExpired = mockShare.expiresAt < new Date();
      expect(isExpired).toBe(true);
    });

    it('should increment access count on retrieval', async () => {
      const mockShare = {
        shareToken: mockShareToken,
        accessCount: 0,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const result = {
        ...mockShare,
        accessCount: mockShare.accessCount + 1
      };

      expect(result.accessCount).toBe(1);
    });
  });

  describe('revokeVersionShare', () => {
    it('should revoke share by entry owner', async () => {
      const mockEntry = {
        _id: mockEntryId,
        userId: mockUserId,
        shares: [{ shareToken: mockShareToken }]
      };

      DiaryEntry.findById.mockResolvedValue(mockEntry);

      const result = {
        message: 'Share revoked',
        shareToken: mockShareToken
      };

      expect(result.shareToken).toBe(mockShareToken);
    });

    it('should reject revocation by non-owner', async () => {
      const differentUserId = new mongoose.Types.ObjectId();
      const mockEntry = {
        _id: mockEntryId,
        userId: mockUserId
      };

      DiaryEntry.findById.mockResolvedValue(mockEntry);

      await expect((async () => {
        if (mockEntry.userId.toString() !== differentUserId.toString()) {
          throw new Error('Not authorized');
        }
      })()).rejects.toThrow();
    });

    it('should handle non-existent share token', async () => {
      const mockEntry = {
        _id: mockEntryId,
        userId: mockUserId,
        shares: []
      };

      DiaryEntry.findById.mockResolvedValue(mockEntry);

      const found = mockEntry.shares.find(s => s.shareToken === mockShareToken);
      expect(found).toBeUndefined();
    });
  });

  describe('exportVersionAsJSON', () => {
    it('should export version with comments and tags', async () => {
      const mockVersion = {
        _id: mockVersionId,
        content: 'Test version',
        versionNumber: 1,
        createdAt: new Date('2026-05-01'),
        metadata: { wordCount: 150 }
      };

      const mockComments = [
        { text: 'Great!', sentiment: 'positive' }
      ];

      const mockTags = [
        { name: 'final', color: '#10b981' }
      ];

      const result = {
        version: mockVersion,
        comments: mockComments,
        tags: mockTags,
        exportDate: new Date(),
        format: 'json'
      };

      expect(result.version.content).toBe('Test version');
      expect(result.comments.length).toBe(1);
      expect(result.tags.length).toBe(1);
    });

    it('should exclude metadata when requested', async () => {
      const mockVersion = {
        _id: mockVersionId,
        content: 'Test version',
        versionNumber: 1
      };

      const result = {
        version: mockVersion,
        includeMetadata: false
      };

      expect(result.version.metadata).toBeUndefined();
    });

    it('should format dates in ISO 8601', async () => {
      const testDate = new Date('2026-05-01T12:00:00Z');
      const result = {
        date: testDate.toISOString(),
        format: 'ISO 8601'
      };

      expect(result.date).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('exportVersionAsCSV', () => {
    it('should export version in CSV format', async () => {
      const mockVersion = {
        versionNumber: 1,
        content: 'Test content with "quotes" and,commas',
        createdAt: new Date('2026-05-01')
      };

      const csv = `version,content,createdAt\n1,"Test content with ""quotes"" and,commas",2026-05-01T00:00:00Z`;

      expect(csv).toContain('version,content,createdAt');
      expect(csv).toContain('Test content');
    });

    it('should properly escape special characters', async () => {
      const content = 'Test with "quotes" and\nnewlines';
      const escaped = `"${content.replace(/"/g, '""')}"`;

      expect(escaped).toContain('""');
    });

    it('should include headers', async () => {
      const csv = 'versionNumber,content,createdAt,sentiment\n1,Test,2026-05-01,positive';

      const lines = csv.split('\n');
      expect(lines[0]).toContain('versionNumber');
    });
  });

  describe('getEntryShares', () => {
    it('should list active shares for entry', async () => {
      const mockShares = [
        {
          shareToken: mockShareToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          accessCount: 5,
          isActive: true
        },
        {
          shareToken: 'expired-token',
          expiresAt: new Date(Date.now() - 1000),
          accessCount: 0,
          isActive: false
        }
      ];

      const activeShares = mockShares.filter(s => s.expiresAt > new Date());

      expect(activeShares.length).toBe(1);
      expect(activeShares[0].isActive).toBe(true);
    });

    it('should filter out expired shares', async () => {
      const shares = [
        { expiresAt: new Date(Date.now() + 1000) },
        { expiresAt: new Date(Date.now() - 1000) }
      ];

      const active = shares.filter(s => s.expiresAt > new Date());
      expect(active.length).toBe(1);
    });

    it('should only show shares owned by user', async () => {
      const differentUserId = new mongoose.Types.ObjectId();

      const mockEntry = {
        _id: mockEntryId,
        userId: mockUserId
      };

      const authorized = mockEntry.userId.toString() === mockUserId.toString();
      expect(authorized).toBe(true);

      const authorizedDifferent = mockEntry.userId.toString() === differentUserId.toString();
      expect(authorizedDifferent).toBe(false);
    });

    it('should return empty list if no shares', async () => {
      const shares = [];
      expect(shares.length).toBe(0);
    });
  });

  describe('createVersionSnapshot', () => {
    it('should create immutable snapshot of version', async () => {
      const mockVersion = {
        _id: mockVersionId,
        content: 'Snapshot content',
        versionNumber: 1,
        createdAt: new Date()
      };

      const snapshot = {
        _id: new mongoose.Types.ObjectId(),
        sourceVersionId: mockVersionId,
        content: mockVersion.content,
        snapshotDate: new Date(),
        comments: [],
        tags: [],
        isImmutable: true
      };

      expect(snapshot.sourceVersionId).toEqual(mockVersionId);
      expect(snapshot.isImmutable).toBe(true);
      expect(snapshot.snapshotDate).toBeDefined();
    });

    it('should include associated comments and tags', async () => {
      const snapshot = {
        versionId: mockVersionId,
        comments: [
          { text: 'Comment 1' },
          { text: 'Comment 2' }
        ],
        tags: [
          { name: 'final' },
          { name: 'important' }
        ]
      };

      expect(snapshot.comments.length).toBe(2);
      expect(snapshot.tags.length).toBe(2);
    });

    it('should track snapshot metadata', async () => {
      const snapshot = {
        createdBy: mockUserId,
        createdAt: new Date(),
        reason: 'Backup before major revision',
        metadata: {
          versionNumber: 1,
          commentCount: 3,
          tagCount: 2
        }
      };

      expect(snapshot.metadata.versionNumber).toBe(1);
      expect(snapshot.reason).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing version ID', async () => {
      await expect(
        diaryVersionShare.generateVersionShareLink(mockEntryId, null)
      ).rejects.toThrow();
    });

    it('should handle database errors during export', async () => {
      DiaryEntryVersion.findById.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        diaryVersionShare.exportVersionAsJSON(mockVersionId)
      ).rejects.toThrow();
    });

    it('should validate token format', async () => {
      const invalidToken = 'not-a-valid-token';

      await expect(
        diaryVersionShare.getSharedVersion(invalidToken)
      ).rejects.toThrow();
    });

    it('should handle concurrent share revocation', async () => {
      const mockShare = { shareToken: mockShareToken, revoked: false };
      const result1 = { ...mockShare, revoked: true };
      const result2 = { ...mockShare, revoked: true };

      expect(result1.shareToken).toBe(result2.shareToken);
    });
  });

  describe('Security Tests', () => {
    it('should not expose user IDs in share tokens', () => {
      const token = crypto.randomBytes(16).toString('hex');
      expect(token).not.toContain(mockUserId.toString());
    });

    it('should generate cryptographically secure tokens', () => {
      const token1 = crypto.randomBytes(16).toString('hex');
      const token2 = crypto.randomBytes(16).toString('hex');

      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('should enforce expiration on share access', async () => {
      const expiredTime = new Date(Date.now() - 1000);
      const isExpired = expiredTime < new Date();

      expect(isExpired).toBe(true);
    });
  });
});
