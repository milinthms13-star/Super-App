/**
 * Diary API Integration-style Tests - Phase 4.7
 * Uses deterministic in-memory mocks for version comments/tags/share endpoints.
 */

const request = require('supertest');
const mongoose = require('mongoose');

jest.mock('../models/DiaryEntry', () => ({
  findOne: jest.fn(),
}));

jest.mock('../models/DiaryEntryVersion', () => ({
  findOne: jest.fn(),
}));

jest.mock('../utils/diaryVersionComments', () => ({
  addCommentToVersion: jest.fn(),
  getVersionComments: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
  toggleCommentLike: jest.fn(),
  getVersionCommentStats: jest.fn(),
  searchComments: jest.fn(),
}));

jest.mock('../utils/diaryVersionTags', () => ({
  addTagToVersion: jest.fn(),
  getVersionTags: jest.fn(),
  getVersionsByTag: jest.fn(),
  removeTagFromVersion: jest.fn(),
  updateTag: jest.fn(),
  getEntryTagStats: jest.fn(),
  getPredefinedTags: jest.fn(),
  bulkAddTag: jest.fn(),
}));

jest.mock('../utils/diaryVersionShare', () => ({
  generateVersionShareLink: jest.fn(),
  getSharedVersion: jest.fn(),
  revokeVersionShare: jest.fn(),
  exportVersionAsJSON: jest.fn(),
  exportVersionAsCSV: jest.fn(),
  getEntryShares: jest.fn(),
  createVersionSnapshot: jest.fn(),
}));

const DiaryEntry = require('../models/DiaryEntry');
const DiaryEntryVersion = require('../models/DiaryEntryVersion');
const commentsUtils = require('../utils/diaryVersionComments');
const tagsUtils = require('../utils/diaryVersionTags');
const shareUtils = require('../utils/diaryVersionShare');
const app = require('../server');

const asIdString = (value) => String(value);

describe('Diary API - Phase 4.7', () => {
  const ownerUserId = 'test-token-owner';
  const otherUserId = 'test-token-other';
  const entryId = new mongoose.Types.ObjectId();
  const versionId = new mongoose.Types.ObjectId();

  let ownerToken;
  let otherToken;

  let commentsById;
  let tagsByVersion;
  let sharesByEntry;

  beforeAll(() => {
    ownerToken = ownerUserId;
    otherToken = otherUserId;
  });

  beforeEach(() => {
    commentsById = new Map();
    tagsByVersion = new Map();
    sharesByEntry = new Map();

    DiaryEntry.findOne.mockImplementation(async ({ _id, userId }) => {
      if (asIdString(_id) !== asIdString(entryId)) {
        return null;
      }

      return asIdString(userId) === asIdString(ownerUserId)
        ? { _id: entryId, userId: ownerUserId }
        : null;
    });

    DiaryEntryVersion.findOne.mockImplementation(async ({ _id, entryId: requestedEntryId }) => {
      if (asIdString(_id) !== asIdString(versionId)) {
        return null;
      }

      if (asIdString(requestedEntryId) !== asIdString(entryId)) {
        return null;
      }

      return {
        _id: versionId,
        entryId,
        versionNumber: 3,
      };
    });

    commentsUtils.addCommentToVersion.mockImplementation(async (userId, targetEntryId, targetVersionId, versionNumber, payload) => {
      const created = {
        _id: new mongoose.Types.ObjectId().toString(),
        userId: asIdString(userId),
        entryId: asIdString(targetEntryId),
        versionId: asIdString(targetVersionId),
        versionNumber,
        text: payload.text,
        lineReference: payload.lineReference || null,
        isPrivate: Boolean(payload.isPrivate),
        parentCommentId: payload.parentCommentId || null,
        sentiment: payload.sentiment || 'neutral',
        likes: [],
      };

      commentsById.set(created._id, created);
      return created;
    });

    commentsUtils.getVersionComments.mockImplementation(async (_entryId, targetVersionId) => {
      return Array.from(commentsById.values()).filter(
        (comment) => asIdString(comment.versionId) === asIdString(targetVersionId) && !comment.isDeleted
      );
    });

    commentsUtils.getVersionCommentStats.mockImplementation(async (targetVersionId) => {
      const comments = Array.from(commentsById.values()).filter(
        (comment) => asIdString(comment.versionId) === asIdString(targetVersionId) && !comment.isDeleted
      );

      return {
        totalComments: comments.length,
        privateComments: comments.filter((comment) => comment.isPrivate).length,
        totalLikes: comments.reduce((sum, comment) => sum + (comment.likes?.length || 0), 0),
      };
    });

    commentsUtils.updateComment.mockImplementation(async (commentId, userId, patch) => {
      const comment = commentsById.get(asIdString(commentId));
      if (!comment) {
        throw new Error('Comment not found');
      }
      if (asIdString(comment.userId) !== asIdString(userId)) {
        throw new Error('Unauthorized');
      }

      const updated = {
        ...comment,
        text: patch.text ?? comment.text,
        sentiment: patch.sentiment ?? comment.sentiment,
      };
      commentsById.set(asIdString(commentId), updated);
      return updated;
    });

    commentsUtils.deleteComment.mockImplementation(async (commentId, userId) => {
      const comment = commentsById.get(asIdString(commentId));
      if (!comment) {
        throw new Error('Comment not found');
      }
      if (asIdString(comment.userId) !== asIdString(userId)) {
        throw new Error('Unauthorized');
      }

      comment.isDeleted = true;
      commentsById.set(asIdString(commentId), comment);
      return { success: true, message: 'Comment deleted' };
    });

    commentsUtils.toggleCommentLike.mockImplementation(async (commentId, userId, isLike) => {
      const comment = commentsById.get(asIdString(commentId));
      if (!comment) {
        throw new Error('Comment not found');
      }

      const likes = new Set(comment.likes || []);
      const uid = asIdString(userId);

      if (isLike) {
        likes.add(uid);
      } else {
        likes.delete(uid);
      }

      const updated = { ...comment, likes: Array.from(likes) };
      commentsById.set(asIdString(commentId), updated);
      return updated;
    });

    tagsUtils.getPredefinedTags.mockReturnValue([
      { name: 'final', color: '#059669', description: 'Final draft' },
      { name: 'important', color: '#dc2626', description: 'Important version' },
      { name: 'draft', color: '#6b7280', description: 'Work in progress' },
    ]);

    tagsUtils.addTagToVersion.mockImplementation(async (userId, targetEntryId, targetVersionId, versionNumber, payload) => {
      const key = asIdString(targetVersionId);
      const existing = tagsByVersion.get(key) || [];

      const duplicate = existing.some((tag) => tag.name.toLowerCase() === payload.name.toLowerCase());
      if (duplicate) {
        throw new Error('Tag already exists for this version');
      }

      const tag = {
        _id: new mongoose.Types.ObjectId().toString(),
        userId: asIdString(userId),
        entryId: asIdString(targetEntryId),
        versionId: key,
        versionNumber,
        name: payload.name,
        color: payload.color || '#059669',
        description: payload.description || '',
        reason: payload.reason || '',
        priority: existing.length + 1,
      };

      tagsByVersion.set(key, [...existing, tag]);
      return tag;
    });

    tagsUtils.getVersionTags.mockImplementation(async (targetVersionId) => {
      const tags = tagsByVersion.get(asIdString(targetVersionId)) || [];
      return tags.sort((a, b) => a.priority - b.priority);
    });

    tagsUtils.getEntryTagStats.mockImplementation(async (_entryId) => {
      const allTags = Array.from(tagsByVersion.values()).flat();
      return {
        totalTags: allTags.length,
        tagBreakdown: allTags.reduce((acc, tag) => {
          acc[tag.name] = (acc[tag.name] || 0) + 1;
          return acc;
        }, {}),
      };
    });

    tagsUtils.removeTagFromVersion.mockImplementation(async (tagId, userId) => {
      let foundTag;
      let versionKey;

      for (const [key, tags] of tagsByVersion.entries()) {
        const match = tags.find((tag) => asIdString(tag._id) === asIdString(tagId));
        if (match) {
          foundTag = match;
          versionKey = key;
          break;
        }
      }

      if (!foundTag || !versionKey) {
        throw new Error('Tag not found');
      }
      if (asIdString(foundTag.userId) !== asIdString(userId)) {
        throw new Error('Unauthorized');
      }

      const filtered = (tagsByVersion.get(versionKey) || []).filter((tag) => asIdString(tag._id) !== asIdString(tagId));
      tagsByVersion.set(versionKey, filtered);
      return { success: true, message: 'Tag removed' };
    });

    shareUtils.generateVersionShareLink.mockImplementation(async (targetEntryId, targetVersionId, options = {}) => {
      const token = new mongoose.Types.ObjectId().toString();
      const hours = Number(options.expiresIn) || 7 * 24;
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

      const share = {
        shareToken: token,
        shareUrl: `https://example.com/share/${token}`,
        expiresAt,
        versionId: asIdString(targetVersionId),
      };

      const key = asIdString(targetEntryId);
      const existing = sharesByEntry.get(key) || [];
      sharesByEntry.set(key, [...existing, share]);

      return share;
    });

    shareUtils.getEntryShares.mockImplementation(async (targetEntryId, userId) => {
      if (asIdString(userId) !== asIdString(ownerUserId)) {
        throw new Error('Unauthorized');
      }
      return sharesByEntry.get(asIdString(targetEntryId)) || [];
    });

    shareUtils.revokeVersionShare.mockImplementation(async (_entryId, _shareToken, userId) => {
      if (asIdString(userId) !== asIdString(ownerUserId)) {
        throw new Error('Unauthorized');
      }
      return { success: true, message: 'Share revoked' };
    });

    shareUtils.exportVersionAsJSON.mockResolvedValue({
      version: { id: asIdString(versionId), createdAt: new Date().toISOString(), wordCount: 120 },
      comments: [],
      tags: [],
    });

    shareUtils.exportVersionAsCSV.mockResolvedValue('version,comment_count,tag_count\n3,0,0\n');
  });

  describe('Comments Endpoints', () => {
    it('creates a comment', async () => {
      const response = await request(app)
        .post(`/api/diary/${entryId}/versions/${versionId}/comments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ text: 'Great version', sentiment: 'positive' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.comment.text).toBe('Great version');
      expect(response.body.comment.sentiment).toBe('positive');
    });

    it('rejects empty comment', async () => {
      const response = await request(app)
        .post(`/api/diary/${entryId}/versions/${versionId}/comments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ text: '   ' })
        .expect(400);

      expect(response.body.message).toMatch(/Comment text is required/i);
    });

    it('retrieves comments for a version', async () => {
      await request(app)
        .post(`/api/diary/${entryId}/versions/${versionId}/comments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ text: 'One comment' })
        .expect(201);

      const response = await request(app)
        .get(`/api/diary/${entryId}/versions/${versionId}/comments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.comments)).toBe(true);
      expect(response.body.stats).toHaveProperty('totalComments');
    });

    it('enforces ownership on update/delete', async () => {
      const created = await request(app)
        .post(`/api/diary/${entryId}/versions/${versionId}/comments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ text: 'Owner comment' })
        .expect(201);

      const commentId = created.body.comment._id;

      await request(app)
        .patch(`/api/diary/${entryId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ text: 'Hacked' })
        .expect(403);

      await request(app)
        .delete(`/api/diary/${entryId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it('toggles likes', async () => {
      const created = await request(app)
        .post(`/api/diary/${entryId}/versions/${versionId}/comments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ text: 'Like me' })
        .expect(201);

      const commentId = created.body.comment._id;

      const liked = await request(app)
        .post(`/api/diary/${entryId}/comments/${commentId}/like`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ isLike: true })
        .expect(200);

      expect(liked.body.success).toBe(true);
      expect(liked.body.comment.likes.length).toBe(1);
    });
  });

  describe('Tags Endpoints', () => {
    it('adds and lists version tags', async () => {
      await request(app)
        .post(`/api/diary/${entryId}/versions/${versionId}/tags`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'final', reason: 'Ready' })
        .expect(201);

      const list = await request(app)
        .get(`/api/diary/${entryId}/versions/${versionId}/tags`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(list.body.success).toBe(true);
      expect(Array.isArray(list.body.tags)).toBe(true);
      expect(list.body.tags[0].name).toBe('final');
    });

    it('rejects duplicate tags', async () => {
      await request(app)
        .post(`/api/diary/${entryId}/versions/${versionId}/tags`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'draft' })
        .expect(201);

      await request(app)
        .post(`/api/diary/${entryId}/versions/${versionId}/tags`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'draft' })
        .expect(409);
    });

    it('returns predefined tags and stats', async () => {
      const predefined = await request(app)
        .get('/api/diary/tags/predefined')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(predefined.body.success).toBe(true);
      expect(predefined.body.tags.map((tag) => tag.name)).toEqual(
        expect.arrayContaining(['final', 'important', 'draft'])
      );

      const stats = await request(app)
        .get(`/api/diary/${entryId}/tags/stats`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(stats.body.success).toBe(true);
      expect(stats.body.stats).toHaveProperty('totalTags');
    });
  });

  describe('Share & Export Endpoints', () => {
    it('creates and lists shares', async () => {
      const created = await request(app)
        .post(`/api/diary/${entryId}/versions/${versionId}/share`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ expiresIn: 24 })
        .expect(201);

      expect(created.body.success).toBe(true);
      expect(created.body.share).toHaveProperty('shareToken');

      const list = await request(app)
        .get(`/api/diary/${entryId}/shares`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(list.body.success).toBe(true);
      expect(Array.isArray(list.body.shares)).toBe(true);
      expect(list.body.shares.length).toBeGreaterThan(0);
    });

    it('exports version as JSON and CSV', async () => {
      const json = await request(app)
        .get(`/api/diary/${entryId}/versions/${versionId}/export/json`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(json.body.success).toBe(true);
      expect(json.body.export).toHaveProperty('version');

      const csv = await request(app)
        .get(`/api/diary/${entryId}/versions/${versionId}/export/csv`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(csv.headers['content-type']).toMatch(/csv/);
      expect(csv.text).toContain('version');
    });
  });

  describe('Auth and Error Handling', () => {
    it('rejects unauthenticated requests', async () => {
      await request(app)
        .get(`/api/diary/${entryId}/versions/${versionId}/comments`)
        .expect(401);
    });

    it('returns 404 for unknown version', async () => {
      const unknownVersionId = new mongoose.Types.ObjectId();

      await request(app)
        .post(`/api/diary/${entryId}/versions/${unknownVersionId}/comments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ text: 'Comment' })
        .expect(404);
    });

    it('handles concurrent comment fetches', async () => {
      await request(app)
        .post(`/api/diary/${entryId}/versions/${versionId}/comments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ text: 'Concurrent seed comment' })
        .expect(201);

      const responses = await Promise.all(
        Array.from({ length: 5 }, () =>
          request(app)
            .get(`/api/diary/${entryId}/versions/${versionId}/comments`)
            .set('Authorization', `Bearer ${ownerToken}`)
        )
      );

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
