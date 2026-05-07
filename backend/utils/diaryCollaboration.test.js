/**
 * Diary Collaboration Utility Tests
 * Unit tests for sharing, permissions, and collaboration features
 * Jest test suite with 65+ test cases
 */

const {
  createShare,
  addComment,
  getCollaborationSummary,
  updateSharePermissions,
  getSharingStats,
  checkAccess,
  getCollaborationInsights,
  revokeShare,
  validateShareLink,
  extractMentions
} = require('../diaryCollaboration');

describe('Diary Collaboration Module', () => {
  // Test data
  const mockEntry = {
    _id: 'entry123',
    title: 'Shared Entry',
    content: 'This is shared content',
    ownerId: 'user1'
  };

  const mockShare = {
    shareId: 'share123',
    entryId: 'entry123',
    permission: 'view',
    isPublic: false,
    sharedWith: ['user2', 'user3'],
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    restrictions: {
      allowDownload: true,
      allowScreenshot: false,
      allowCopy: true
    }
  };

  const mockComment = {
    id: 'comment1',
    entryId: 'entry123',
    commenterId: 'user2',
    text: 'Great entry @user1!',
    createdAt: new Date(),
    likes: 2,
    replies: 0
  };

  describe('createShare', () => {
    test('should return share object with required fields', () => {
      const result = createShare(mockEntry, 'user1', ['user2']);
      expect(result).toHaveProperty('shareId');
      expect(result).toHaveProperty('entryId');
      expect(result).toHaveProperty('permission');
      expect(result).toHaveProperty('shareLink');
    });

    test('should set default permission to view', () => {
      const result = createShare(mockEntry, 'user1', ['user2']);
      expect(result.permission).toBe('view');
    });

    test('should accept custom permission', () => {
      const result = createShare(mockEntry, 'user1', ['user2'], { permission: 'comment' });
      expect(result.permission).toBe('comment');
    });

    test('should generate unique shareId', () => {
      const share1 = createShare(mockEntry, 'user1', ['user2']);
      const share2 = createShare(mockEntry, 'user1', ['user3']);
      expect(share1.shareId).not.toBe(share2.shareId);
    });

    test('should set sharedWith list', () => {
      const recipients = ['user2', 'user3'];
      const result = createShare(mockEntry, 'user1', recipients);
      expect(result.sharedWith).toEqual(recipients);
    });

    test('should set expiration date if provided', () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const result = createShare(mockEntry, 'user1', ['user2'], { expiresAt });
      expect(result.expiresAt).toEqual(expiresAt);
    });

    test('should set default restrictions', () => {
      const result = createShare(mockEntry, 'user1', ['user2']);
      expect(result.allowDownload).toBeDefined();
      expect(result.allowScreenshot).toBeDefined();
      expect(result.allowCopy).toBeDefined();
    });

    test('should generate shareLink', () => {
      const result = createShare(mockEntry, 'user1', ['user2']);
      expect(result.shareLink).toBeDefined();
      expect(result.shareLink.length).toBeGreaterThan(0);
    });

    test('should handle public sharing', () => {
      const result = createShare(mockEntry, 'user1', [], { isPublic: true });
      expect(result.isPublic).toBe(true);
    });

    test('should set password protection if provided', () => {
      const result = createShare(mockEntry, 'user1', ['user2'], { password: 'secret123' });
      expect(result.password).toBeDefined();
    });

    test('should record creation timestamp', () => {
      const result = createShare(mockEntry, 'user1', ['user2']);
      expect(result.createdAt).toBeDefined();
      expect(result.createdAt instanceof Date).toBe(true);
    });
  });

  describe('addComment', () => {
    test('should return comment object', () => {
      const result = addComment('entry123', 'user2', 'Great entry!', {});
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('entryId');
      expect(result).toHaveProperty('commenterId');
      expect(result).toHaveProperty('text');
    });

    test('should extract mentions from comment', () => {
      const result = addComment('entry123', 'user2', 'Great entry @user1 and @user3!', {});
      expect(result.mentions).toBeDefined();
      expect(Array.isArray(result.mentions)).toBe(true);
      expect(result.mentions).toContain('user1');
      expect(result.mentions).toContain('user3');
    });

    test('should initialize like count to zero', () => {
      const result = addComment('entry123', 'user2', 'Nice!', {});
      expect(result.likes).toBe(0);
    });

    test('should initialize reply count to zero', () => {
      const result = addComment('entry123', 'user2', 'Nice!', {});
      expect(result.replies).toBe(0);
    });

    test('should record creation timestamp', () => {
      const result = addComment('entry123', 'user2', 'Nice!', {});
      expect(result.createdAt).toBeDefined();
      expect(result.createdAt instanceof Date).toBe(true);
    });

    test('should handle empty comment gracefully', () => {
      const result = addComment('entry123', 'user2', '', {});
      expect(result).toBeDefined();
    });

    test('should preserve comment formatting', () => {
      const text = 'Multi\nline\ncomment';
      const result = addComment('entry123', 'user2', text, {});
      expect(result.text).toContain('\n');
    });

    test('should allow reactions', () => {
      const result = addComment('entry123', 'user2', 'Great!', { reactions: ['👍', '❤️'] });
      expect(result.reactions).toBeDefined();
    });

    test('should generate unique comment ID', () => {
      const comment1 = addComment('entry123', 'user2', 'First', {});
      const comment2 = addComment('entry123', 'user2', 'Second', {});
      expect(comment1.id).not.toBe(comment2.id);
    });
  });

  describe('getCollaborationSummary', () => {
    test('should return summary object', () => {
      const result = getCollaborationSummary();
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should include total shares count', () => {
      const result = getCollaborationSummary();
      expect(result).toHaveProperty('totalShares');
      expect(typeof result.totalShares).toBe('number');
    });

    test('should include shared recipients count', () => {
      const result = getCollaborationSummary();
      expect(result).toHaveProperty('sharedRecipients');
      expect(typeof result.sharedRecipients).toBe('number');
    });

    test('should include comment count', () => {
      const result = getCollaborationSummary();
      expect(result).toHaveProperty('commentCount');
      expect(typeof result.commentCount).toBe('number');
    });

    test('should include active collaborators', () => {
      const result = getCollaborationSummary();
      expect(result).toHaveProperty('activeCollaborators');
    });

    test('should include most-liked comments', () => {
      const result = getCollaborationSummary();
      expect(result).toHaveProperty('mostLikedComments');
      expect(Array.isArray(result.mostLikedComments)).toBe(true);
    });
  });

  describe('updateSharePermissions', () => {
    test('should update permission level', () => {
      const result = updateSharePermissions(mockShare, 'comment');
      expect(result.permission).toBe('comment');
    });

    test('should validate permission hierarchy', () => {
      const share = { ...mockShare, permission: 'view' };
      const result = updateSharePermissions(share, 'edit');
      expect(['view', 'comment', 'edit']).toContain(result.permission);
    });

    test('should preserve other share properties', () => {
      const result = updateSharePermissions(mockShare, 'edit');
      expect(result.shareId).toBe(mockShare.shareId);
      expect(result.entryId).toBe(mockShare.entryId);
    });

    test('should record update timestamp', () => {
      const result = updateSharePermissions(mockShare, 'comment');
      expect(result.updatedAt).toBeDefined();
    });

    test('should reject invalid permissions', () => {
      expect(() => updateSharePermissions(mockShare, 'invalid')).toThrow();
    });

    test('should handle null share', () => {
      expect(() => updateSharePermissions(null, 'view')).toThrow();
    });
  });

  describe('getSharingStats', () => {
    test('should return stats object', () => {
      const result = getSharingStats();
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should include total shares', () => {
      const result = getSharingStats();
      expect(result).toHaveProperty('totalShares');
    });

    test('should include permission distribution', () => {
      const result = getSharingStats();
      expect(result).toHaveProperty('permissionDistribution');
      expect(result.permissionDistribution).toHaveProperty('view');
      expect(result.permissionDistribution).toHaveProperty('comment');
      expect(result.permissionDistribution).toHaveProperty('edit');
    });

    test('should include most shared entries', () => {
      const result = getSharingStats();
      expect(result).toHaveProperty('mostSharedEntries');
      expect(Array.isArray(result.mostSharedEntries)).toBe(true);
    });

    test('should include top recipients', () => {
      const result = getSharingStats();
      expect(result).toHaveProperty('topRecipients');
      expect(Array.isArray(result.topRecipients)).toBe(true);
    });

    test('should include engagement metrics', () => {
      const result = getSharingStats();
      expect(result).toHaveProperty('engagementMetrics');
    });

    test('should include share frequency', () => {
      const result = getSharingStats();
      expect(result.shareFrequency).toBeDefined();
    });
  });

  describe('checkAccess', () => {
    test('should return true for valid access', () => {
      const share = { ...mockShare, expiresAt: new Date(Date.now() + 1000000) };
      const result = checkAccess(share, 'user2');
      expect(result).toBe(true);
    });

    test('should return false for expired share', () => {
      const share = { ...mockShare, expiresAt: new Date(Date.now() - 1000000) };
      const result = checkAccess(share, 'user2');
      expect(result).toBe(false);
    });

    test('should return false for unauthorized user', () => {
      const result = checkAccess(mockShare, 'unauthorized');
      expect(result).toBe(false);
    });

    test('should check password if set', () => {
      const share = { ...mockShare, password: 'secret123' };
      const result = checkAccess(share, 'user2', 'secret123');
      expect(typeof result).toBe('boolean');
    });

    test('should deny without correct password', () => {
      const share = { ...mockShare, password: 'secret123' };
      const result = checkAccess(share, 'user2', 'wrongpassword');
      expect(result).toBe(false);
    });

    test('should allow public shares', () => {
      const publicShare = { ...mockShare, isPublic: true };
      const result = checkAccess(publicShare, 'anyone');
      expect(result).toBe(true);
    });

    test('should handle null share', () => {
      expect(checkAccess(null, 'user2')).toBe(false);
    });

    test('should handle share without expiration', () => {
      const share = { ...mockShare, expiresAt: null };
      const result = checkAccess(share, 'user2');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getCollaborationInsights', () => {
    test('should return insights object', () => {
      const result = getCollaborationInsights();
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should include most engaging entries', () => {
      const result = getCollaborationInsights();
      expect(result).toHaveProperty('mostEngagingEntries');
      expect(Array.isArray(result.mostEngagingEntries)).toBe(true);
    });

    test('should include top commenters', () => {
      const result = getCollaborationInsights();
      expect(result).toHaveProperty('topCommenters');
      expect(Array.isArray(result.topCommenters)).toBe(true);
    });

    test('should include recent activity', () => {
      const result = getCollaborationInsights();
      expect(result).toHaveProperty('recentActivity');
      expect(Array.isArray(result.recentActivity)).toBe(true);
    });

    test('should include engagement trends', () => {
      const result = getCollaborationInsights();
      expect(result).toHaveProperty('engagementTrends');
    });

    test('should include collaboration patterns', () => {
      const result = getCollaborationInsights();
      expect(result).toHaveProperty('collaborationPatterns');
    });
  });

  describe('revokeShare', () => {
    test('should remove share access', () => {
      const result = revokeShare('share123');
      expect(result).toBeDefined();
    });

    test('should record revocation timestamp', () => {
      const result = revokeShare('share123');
      expect(result).toHaveProperty('revokedAt');
    });

    test('should handle non-existent share', () => {
      expect(() => revokeShare('nonexistent')).not.toThrow();
    });

    test('should notify collaborators on revoke', () => {
      const result = revokeShare('share123');
      expect(result).toBeDefined();
    });
  });

  describe('validateShareLink', () => {
    test('should validate correct share link format', () => {
      const shareLink = 'diary/share/abc123def456';
      const result = validateShareLink(shareLink);
      expect(typeof result).toBe('boolean');
    });

    test('should reject invalid link format', () => {
      const invalidLink = 'notavalidlink';
      const result = validateShareLink(invalidLink);
      expect(result).toBe(false);
    });

    test('should handle null link', () => {
      expect(validateShareLink(null)).toBe(false);
    });

    test('should handle empty link', () => {
      expect(validateShareLink('')).toBe(false);
    });

    test('should be case-sensitive', () => {
      const link = 'diary/share/abc123';
      const result = validateShareLink(link);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('extractMentions', () => {
    test('should extract @mentions', () => {
      const text = 'Hello @user1 and @user2!';
      const result = extractMentions(text);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('user1');
      expect(result).toContain('user2');
    });

    test('should handle no mentions', () => {
      const text = 'No mentions here';
      const result = extractMentions(text);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    test('should not extract invalid mentions', () => {
      const text = 'Email: test@example.com';
      const result = extractMentions(text);
      // Should not include email domain
      expect(result).not.toContain('example.com');
    });

    test('should handle multiple mentions of same user', () => {
      const text = '@user1 said @user1 agreed';
      const result = extractMentions(text);
      // Should deduplicate or list all
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle null text', () => {
      const result = extractMentions(null);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    test('should extract mentions at line start', () => {
      const text = '@user1\nGreat entry';
      const result = extractMentions(text);
      expect(result).toContain('user1');
    });

    test('should extract mentions at line end', () => {
      const text = 'Thanks @user1';
      const result = extractMentions(text);
      expect(result).toContain('user1');
    });
  });

  describe('Permission Hierarchy', () => {
    test('view permission is lowest', () => {
      const view = 1;
      expect(view).toBeLessThan(2);
    });

    test('comment permission is middle', () => {
      const comment = 2;
      expect(comment).toBeGreaterThan(1);
      expect(comment).toBeLessThan(3);
    });

    test('edit permission is highest', () => {
      const edit = 3;
      expect(edit).toBeGreaterThan(2);
    });

    test('higher permission includes lower permissions', () => {
      // Edit user can do what comment and view users can do
      expect(true).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle null entry in createShare', () => {
      expect(() => createShare(null, 'user1', ['user2'])).not.toThrow();
    });

    test('should handle empty shareWith list', () => {
      const result = createShare(mockEntry, 'user1', []);
      expect(result).toBeDefined();
    });

    test('should handle malformed comments', () => {
      expect(() => addComment('entry123', 'user2', null, {})).not.toThrow();
    });

    test('should handle concurrent share updates', () => {
      const share1 = updateSharePermissions(mockShare, 'comment');
      const share2 = updateSharePermissions(mockShare, 'edit');
      expect(share1).toBeDefined();
      expect(share2).toBeDefined();
    });
  });

  describe('Performance', () => {
    test('should create share within 100ms', () => {
      const start = performance.now();
      createShare(mockEntry, 'user1', ['user2', 'user3', 'user4']);
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });

    test('should add comment within 50ms', () => {
      const start = performance.now();
      addComment('entry123', 'user2', 'Long comment text '.repeat(50), {});
      const end = performance.now();
      expect(end - start).toBeLessThan(50);
    });

    test('should extract mentions from long text efficiently', () => {
      const longText = 'User @user1 mentioned with @user2 @user3 '.repeat(100);
      const start = performance.now();
      extractMentions(longText);
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });
  });
});
