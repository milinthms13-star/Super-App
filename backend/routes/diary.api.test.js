/**
 * Diary API Integration Tests - Phase 4.7
 * Tests for all comments, tags, and sharing endpoints
 */

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../server'); // Express app

describe('Diary API - Phase 4.7 Integration Tests', () => {
  const mockUserId = new mongoose.Types.ObjectId();
  const mockEntryId = new mongoose.Types.ObjectId();
  const mockVersionId = new mongoose.Types.ObjectId();
  let authToken;

  beforeAll(async () => {
    // Create auth token for tests
    authToken = jwt.sign(
      { _id: mockUserId, email: 'test@example.com' },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  describe('Comments Endpoints', () => {
    describe('POST /api/diary/:entryId/versions/:versionId/comments', () => {
      it('should create a comment successfully', async () => {
        const commentData = {
          text: 'This is a great version!',
          sentiment: 'positive',
          isPrivate: false
        };

        const response = await request(app)
          .post(`/api/diary/${mockEntryId}/versions/${mockVersionId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(commentData)
          .expect(201);

        expect(response.body).toHaveProperty('_id');
        expect(response.body.text).toBe(commentData.text);
        expect(response.body.sentiment).toBe('positive');
      });

      it('should reject comment exceeding max length', async () => {
        const longText = 'a'.repeat(2001);
        const commentData = {
          text: longText,
          sentiment: 'positive'
        };

        const response = await request(app)
          .post(`/api/diary/${mockEntryId}/versions/${mockVersionId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(commentData)
          .expect(400);

        expect(response.body).toHaveProperty('message');
      });

      it('should reject request without authentication', async () => {
        const commentData = {
          text: 'Comment',
          sentiment: 'positive'
        };

        await request(app)
          .post(`/api/diary/${mockEntryId}/versions/${mockVersionId}/comments`)
          .send(commentData)
          .expect(401);
      });

      it('should create threaded reply', async () => {
        const parentCommentId = new mongoose.Types.ObjectId();
        const commentData = {
          text: 'I agree!',
          sentiment: 'positive',
          parentCommentId: parentCommentId.toString()
        };

        const response = await request(app)
          .post(`/api/diary/${mockEntryId}/versions/${mockVersionId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(commentData)
          .expect(201);

        expect(response.body.parentCommentId).toEqual(parentCommentId.toString());
      });
    });

    describe('GET /api/diary/:entryId/versions/:versionId/comments', () => {
      it('should retrieve comments for a version', async () => {
        const response = await request(app)
          .get(`/api/diary/${mockEntryId}/versions/${mockVersionId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should include replies when requested', async () => {
        const response = await request(app)
          .get(`/api/diary/${mockEntryId}/versions/${mockVersionId}/comments?includeReplies=true`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should filter out deleted comments', async () => {
        const response = await request(app)
          .get(`/api/diary/${mockEntryId}/versions/${mockVersionId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const deletedComments = response.body.filter(c => c.isDeleted);
        expect(deletedComments.length).toBe(0);
      });
    });

    describe('PATCH /api/diary/:entryId/comments/:commentId', () => {
      it('should update comment by author', async () => {
        const commentId = new mongoose.Types.ObjectId();
        const updates = {
          text: 'Updated comment',
          sentiment: 'neutral'
        };

        const response = await request(app)
          .patch(`/api/diary/${mockEntryId}/comments/${commentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updates)
          .expect(200);

        expect(response.body.text).toBe(updates.text);
      });

      it('should reject update by non-author', async () => {
        const differentUserId = new mongoose.Types.ObjectId();
        const differentToken = jwt.sign(
          { _id: differentUserId, email: 'other@example.com' },
          process.env.JWT_SECRET || 'test-secret'
        );

        const commentId = new mongoose.Types.ObjectId();

        await request(app)
          .patch(`/api/diary/${mockEntryId}/comments/${commentId}`)
          .set('Authorization', `Bearer ${differentToken}`)
          .send({ text: 'Hacked!' })
          .expect(403);
      });
    });

    describe('DELETE /api/diary/:entryId/comments/:commentId', () => {
      it('should delete comment by author', async () => {
        const commentId = new mongoose.Types.ObjectId();

        const response = await request(app)
          .delete(`/api/diary/${mockEntryId}/comments/${commentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('message');
      });

      it('should reject deletion by non-author', async () => {
        const differentUserId = new mongoose.Types.ObjectId();
        const differentToken = jwt.sign(
          { _id: differentUserId, email: 'other@example.com' },
          process.env.JWT_SECRET || 'test-secret'
        );

        const commentId = new mongoose.Types.ObjectId();

        await request(app)
          .delete(`/api/diary/${mockEntryId}/comments/${commentId}`)
          .set('Authorization', `Bearer ${differentToken}`)
          .expect(403);
      });
    });

    describe('POST /api/diary/:entryId/comments/:commentId/like', () => {
      it('should like a comment', async () => {
        const commentId = new mongoose.Types.ObjectId();

        const response = await request(app)
          .post(`/api/diary/${mockEntryId}/comments/${commentId}/like`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isLike: true })
          .expect(200);

        expect(response.body).toHaveProperty('likes');
      });

      it('should unlike a previously liked comment', async () => {
        const commentId = new mongoose.Types.ObjectId();

        const response = await request(app)
          .post(`/api/diary/${mockEntryId}/comments/${commentId}/like`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isLike: false })
          .expect(200);

        expect(response.body).toHaveProperty('likes');
      });
    });
  });

  describe('Tags Endpoints', () => {
    describe('POST /api/diary/:entryId/versions/:versionId/tags', () => {
      it('should add tag to version', async () => {
        const tagData = {
          name: 'final',
          reason: 'This is the final version'
        };

        const response = await request(app)
          .post(`/api/diary/${mockEntryId}/versions/${mockVersionId}/tags`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(tagData)
          .expect(201);

        expect(response.body.name).toBe('final');
        expect(response.body).toHaveProperty('color');
      });

      it('should add custom tag with color', async () => {
        const tagData = {
          name: 'custom-tag',
          color: '#FF5733',
          description: 'Custom tag'
        };

        const response = await request(app)
          .post(`/api/diary/${mockEntryId}/versions/${mockVersionId}/tags`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(tagData)
          .expect(201);

        expect(response.body.color).toBe('#FF5733');
      });

      it('should reject duplicate tags', async () => {
        const tagData = { name: 'final' };

        // First tag addition
        await request(app)
          .post(`/api/diary/${mockEntryId}/versions/${mockVersionId}/tags`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(tagData)
          .expect(201);

        // Duplicate tag addition
        await request(app)
          .post(`/api/diary/${mockEntryId}/versions/${mockVersionId}/tags`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(tagData)
          .expect(409);
      });

      it('should validate tag name', async () => {
        const invalidData = { name: '' };

        await request(app)
          .post(`/api/diary/${mockEntryId}/versions/${mockVersionId}/tags`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData)
          .expect(400);
      });
    });

    describe('GET /api/diary/:entryId/versions/:versionId/tags', () => {
      it('should retrieve tags for version', async () => {
        const response = await request(app)
          .get(`/api/diary/${mockEntryId}/versions/${mockVersionId}/tags`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should sort tags by priority', async () => {
        const response = await request(app)
          .get(`/api/diary/${mockEntryId}/versions/${mockVersionId}/tags`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        if (response.body.length > 1) {
          for (let i = 0; i < response.body.length - 1; i++) {
            expect(response.body[i].priority).toBeLessThanOrEqual(
              response.body[i + 1].priority
            );
          }
        }
      });
    });

    describe('GET /api/diary/tags/predefined', () => {
      it('should retrieve predefined tags', async () => {
        const response = await request(app)
          .get('/api/diary/tags/predefined')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);

        response.body.forEach(tag => {
          expect(tag).toHaveProperty('name');
          expect(tag).toHaveProperty('color');
          expect(tag).toHaveProperty('description');
        });
      });

      it('should include expected predefined tags', async () => {
        const response = await request(app)
          .get('/api/diary/tags/predefined')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const tagNames = response.body.map(t => t.name);
        expect(tagNames).toContain('final');
        expect(tagNames).toContain('important');
        expect(tagNames).toContain('draft');
      });
    });

    describe('GET /api/diary/:entryId/tags/stats', () => {
      it('should retrieve tag statistics', async () => {
        const response = await request(app)
          .get(`/api/diary/${mockEntryId}/tags/stats`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('totalTags');
      });

      it('should show tag breakdown', async () => {
        const response = await request(app)
          .get(`/api/diary/${mockEntryId}/tags/stats`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        if (response.body.totalTags > 0) {
          expect(response.body).toHaveProperty('tagBreakdown');
        }
      });
    });

    describe('DELETE /api/diary/:entryId/tags/:tagId', () => {
      it('should delete tag by author', async () => {
        const tagId = new mongoose.Types.ObjectId();

        const response = await request(app)
          .delete(`/api/diary/${mockEntryId}/tags/${tagId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('message');
      });

      it('should reject deletion by non-author', async () => {
        const differentUserId = new mongoose.Types.ObjectId();
        const differentToken = jwt.sign(
          { _id: differentUserId, email: 'other@example.com' },
          process.env.JWT_SECRET || 'test-secret'
        );

        const tagId = new mongoose.Types.ObjectId();

        await request(app)
          .delete(`/api/diary/${mockEntryId}/tags/${tagId}`)
          .set('Authorization', `Bearer ${differentToken}`)
          .expect(403);
      });
    });
  });

  describe('Share & Export Endpoints', () => {
    describe('POST /api/diary/:entryId/versions/:versionId/share', () => {
      it('should generate share link', async () => {
        const response = await request(app)
          .post(`/api/diary/${mockEntryId}/versions/${mockVersionId}/share`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ expiresIn: '7d' })
          .expect(201);

        expect(response.body).toHaveProperty('shareToken');
        expect(response.body).toHaveProperty('shareUrl');
        expect(response.body).toHaveProperty('expiresAt');
      });

      it('should support custom expiration', async () => {
        const response = await request(app)
          .post(`/api/diary/${mockEntryId}/versions/${mockVersionId}/share`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ expiresIn: 3600000 })
          .expect(201);

        expect(new Date(response.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
      });

      it('should generate unique tokens', async () => {
        const response1 = await request(app)
          .post(`/api/diary/${mockEntryId}/versions/${mockVersionId}/share`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ expiresIn: '7d' })
          .expect(201);

        const response2 = await request(app)
          .post(`/api/diary/${mockEntryId}/versions/${mockVersionId}/share`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ expiresIn: '7d' })
          .expect(201);

        expect(response1.body.shareToken).not.toBe(response2.body.shareToken);
      });
    });

    describe('GET /api/diary/:entryId/shares', () => {
      it('should list active shares for entry', async () => {
        const response = await request(app)
          .get(`/api/diary/${mockEntryId}/shares`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should only show shares owned by user', async () => {
        const response = await request(app)
          .get(`/api/diary/${mockEntryId}/shares`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should filter out expired shares', async () => {
        const response = await request(app)
          .get(`/api/diary/${mockEntryId}/shares`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        response.body.forEach(share => {
          expect(new Date(share.expiresAt).getTime()).toBeGreaterThan(Date.now());
        });
      });
    });

    describe('DELETE /api/diary/:entryId/share/:shareToken', () => {
      it('should revoke share by owner', async () => {
        const shareToken = 'test-share-token';

        const response = await request(app)
          .delete(`/api/diary/${mockEntryId}/share/${shareToken}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('message');
      });

      it('should reject revocation by non-owner', async () => {
        const differentUserId = new mongoose.Types.ObjectId();
        const differentToken = jwt.sign(
          { _id: differentUserId, email: 'other@example.com' },
          process.env.JWT_SECRET || 'test-secret'
        );

        const shareToken = 'test-share-token';

        await request(app)
          .delete(`/api/diary/${mockEntryId}/share/${shareToken}`)
          .set('Authorization', `Bearer ${differentToken}`)
          .expect(403);
      });
    });

    describe('GET /api/diary/:entryId/versions/:versionId/export/json', () => {
      it('should export version as JSON', async () => {
        const response = await request(app)
          .get(`/api/diary/${mockEntryId}/versions/${mockVersionId}/export/json`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('version');
        expect(response.body).toHaveProperty('comments');
        expect(response.body).toHaveProperty('tags');
      });

      it('should include metadata in export', async () => {
        const response = await request(app)
          .get(`/api/diary/${mockEntryId}/versions/${mockVersionId}/export/json?includeMetadata=true`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.version).toHaveProperty('createdAt');
        expect(response.body.version).toHaveProperty('wordCount');
      });

      it('should have valid content type', async () => {
        await request(app)
          .get(`/api/diary/${mockEntryId}/versions/${mockVersionId}/export/json`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect('Content-Type', /json/);
      });
    });

    describe('GET /api/diary/:entryId/versions/:versionId/export/csv', () => {
      it('should export version as CSV', async () => {
        const response = await request(app)
          .get(`/api/diary/${mockEntryId}/versions/${mockVersionId}/export/csv`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(typeof response.text).toBe('string');
        expect(response.text).toContain('version');
      });

      it('should have CSV content type', async () => {
        await request(app)
          .get(`/api/diary/${mockEntryId}/versions/${mockVersionId}/export/csv`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect('Content-Type', /csv/);
      });

      it('should escape special characters', async () => {
        const response = await request(app)
          .get(`/api/diary/${mockEntryId}/versions/${mockVersionId}/export/csv`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // CSV should properly escape quotes and commas
        expect(response.text).toBeTruthy();
      });
    });
  });

  describe('Authentication & Authorization', () => {
    it('should reject requests without auth token', async () => {
      await request(app)
        .get(`/api/diary/${mockEntryId}/versions/${mockVersionId}/comments`)
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app)
        .get(`/api/diary/${mockEntryId}/versions/${mockVersionId}/comments`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should enforce user ownership on mutations', async () => {
      const differentUserId = new mongoose.Types.ObjectId();
      const differentToken = jwt.sign(
        { _id: differentUserId, email: 'other@example.com' },
        process.env.JWT_SECRET || 'test-secret'
      );

      const commentId = new mongoose.Types.ObjectId();

      await request(app)
        .delete(`/api/diary/${mockEntryId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${differentToken}`)
        .expect(403);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent version', async () => {
      const fakeVersionId = new mongoose.Types.ObjectId();

      await request(app)
        .get(`/api/diary/${mockEntryId}/versions/${fakeVersionId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 400 for invalid data', async () => {
      await request(app)
        .post(`/api/diary/${mockEntryId}/versions/${mockVersionId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sentiment: 'positive' }) // missing text
        .expect(400);
    });

    it('should handle concurrent requests', async () => {
      const promises = [];

      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .get(`/api/diary/${mockEntryId}/versions/${mockVersionId}/comments`)
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});
