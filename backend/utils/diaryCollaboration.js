/**
 * Diary Sharing & Collaboration Utilities
 * Manage shared entries, collaborative commenting, and visibility settings
 * Phase 7 - Sharing & Collaboration
 */

const logger = require('./logger');

/**
 * Create shareable entry with access control
 * @param {Object} entry - Entry to share
 * @param {string} ownerId - Entry owner's ID
 * @param {Array} shareWith - User IDs or emails to share with
 * @param {Object} options - Sharing options
 * @returns {Object} Share configuration
 */
function createShare(entry, ownerId, shareWith, options = {}) {
  try {
    const safeEntry = entry && typeof entry === 'object' ? entry : { _id: null };
    const safeOwnerId = ownerId || 'unknown';
    const recipients = Array.isArray(shareWith) ? shareWith : [];
    const shareId = generateShareId();
    const shareLink = generateShareLink(shareId);

    const share = {
      id: shareId,
      shareId: shareId,
      entryId: safeEntry._id || null,
      ownerId: safeOwnerId,
      sharedWith: recipients,
      permission: options.permission || 'view', // 'view', 'comment', 'edit'
      createdAt: new Date(),
      sharedAt: new Date(),
      expiresAt: options.expiresAt || null,
      isPublic: options.isPublic || false,
      shareLink,
      password: options.password || null,
      notifyRecipients: options.notifyRecipients !== false,
      allowComments: options.allowComments !== false,
      allowSharing: options.allowSharing || false,
      accessLog: [],
      restrictions: {
        allowDownload: options.allowDownload || false,
        allowScreenshot: options.allowScreenshot === false ? false : true,
        allowCopy: options.allowCopy !== false
      }
    };
    // Keep top-level compatibility for older callers/tests.
    share.allowDownload = share.restrictions.allowDownload;
    share.allowScreenshot = share.restrictions.allowScreenshot;
    share.allowCopy = share.restrictions.allowCopy;

    logger.info(`Created share for entry ${share.entryId || 'unknown'} with ${recipients.length} users`);
    return share;
  } catch (error) {
    logger.error('Error creating share:', error);
    throw error;
  }
}

/**
 * Add comment to shared entry
 * @param {string} entryId - Entry ID
 * @param {string} commenterId - User commenting
 * @param {string} comment - Comment text
 * @param {Object} options - Comment options
 * @returns {Object} Comment object
 */
function addComment(entryId, commenterId, comment, options = {}) {
  try {
    if (!entryId || !commenterId) {
      throw new Error('EntryId and commenterId are required');
    }
    const text = typeof comment === 'string' ? comment : '';

    const commentObj = {
      id: generateCommentId(),
      entryId: entryId,
      commenterId: commenterId,
      text,
      createdAt: new Date(),
      updatedAt: new Date(),
      edited: false,
      threadId: options.replyTo || null, // Support threaded comments
      likes: 0,
      replies: 0,
      likedBy: [],
      attachments: options.attachments || [],
      mentions: extractMentions(text),
      reactions: options.reactions || []
    };

    logger.info(`Added comment to entry ${entryId} by ${commenterId}`);
    return commentObj;
  } catch (error) {
    logger.error('Error adding comment:', error);
    throw error;
  }
}

/**
 * Generate collaboration summary for entry
 * @param {string} entryId - Entry ID
 * @param {Array} comments - Comments on entry
 * @param {Array} shares - Share configurations
 * @returns {Object} Collaboration summary
 */
function getCollaborationSummary(entryId, comments = [], shares = []) {
  try {
    const activeShares = shares.filter(s => !s.expiresAt || new Date(s.expiresAt) > new Date());
    const totalSharedWith = new Set(activeShares.flatMap(s => s.sharedWith)).size;
    const uniqueCommenters = new Set(comments.map(c => c.commenterId)).size;
    const mostLikedComments = [...comments]
      .sort((a, b) => (b.likes || 0) - (a.likes || 0))
      .slice(0, 5);

    return {
      entryId: entryId,
      totalShares: shares.length,
      sharedRecipients: totalSharedWith,
      commentCount: comments.length,
      activeCollaborators: uniqueCommenters,
      mostLikedComments,
      collaborationMetrics: {
        totalShares: shares.length,
        activeShares: activeShares.length,
        sharedWith: totalSharedWith,
        totalComments: comments.length,
        uniqueCommenters,
        lastCommentAt: comments.length > 0 ? comments[comments.length - 1].createdAt : null,
        lastSharedAt: activeShares.length > 0 ? activeShares[0].sharedAt : null
      },
      commentSummary: {
        totalComments: comments.length,
        threadsActive: new Set(comments.filter(c => c.threadId).map(c => c.threadId)).size,
        mostLikedComment: comments.length > 0 
          ? comments.reduce((max, c) => c.likes > max.likes ? c : max) 
          : null,
        averageLikesPerComment: comments.length > 0 
          ? (comments.reduce((sum, c) => sum + c.likes, 0) / comments.length).toFixed(1)
          : 0
      },
      sharingSettings: {
        isPublic: activeShares.some(s => s.isPublic),
        maxPermissionLevel: getMaxPermission(activeShares),
        publicAccessible: activeShares.some(s => s.isPublic && !s.password),
        passwordProtected: activeShares.filter(s => s.password).length
      }
    };
  } catch (error) {
    logger.error('Error generating collaboration summary:', error);
    throw error;
  }
}

/**
 * Update share permissions
 * @param {string} shareId - Share ID
 * @param {Object} updates - Permission updates
 * @returns {Object} Updated share
 */
function updateSharePermissions(shareOrId, permissionOrUpdates) {
  try {
    const validPermissions = ['view', 'comment', 'edit'];
    const isShareObject = shareOrId && typeof shareOrId === 'object';
    const updates = typeof permissionOrUpdates === 'string'
      ? { permission: permissionOrUpdates }
      : (permissionOrUpdates || {});

    if (!shareOrId) throw new Error('Share input is required');
    if (updates.permission && !validPermissions.includes(updates.permission)) {
      throw new Error(`Invalid permission: ${updates.permission}`);
    }

    const baseShare = isShareObject
      ? shareOrId
      : { id: shareOrId, shareId: shareOrId, permission: 'view' };

    const updatedShare = {
      ...baseShare,
      id: baseShare.id || baseShare.shareId || shareOrId,
      shareId: baseShare.shareId || baseShare.id || shareOrId,
      permission: updates.permission || baseShare.permission || 'view',
      allowComments: updates.allowComments !== undefined ? updates.allowComments : baseShare.allowComments,
      allowSharing: updates.allowSharing !== undefined ? updates.allowSharing : baseShare.allowSharing,
      expiresAt: updates.expiresAt !== undefined ? updates.expiresAt : (baseShare.expiresAt || null),
      restrictions: updates.restrictions || baseShare.restrictions || {},
      updatedAt: new Date()
    };

    logger.info(`Updated permissions for share ${updatedShare.shareId}`);
    return updatedShare;
  } catch (error) {
    logger.error('Error updating share permissions:', error);
    throw error;
  }
}

/**
 * Generate sharing statistics
 * @param {Array} entries - User's entries
 * @param {Array} allShares - All shares for entries
 * @returns {Object} Sharing statistics
 */
function getSharingStats(entries = [], allShares = []) {
  try {
    const activeShares = allShares.filter(s => !s.expiresAt || new Date(s.expiresAt) > new Date());
    const sharedEntries = new Set(activeShares.map(s => s.entryId)).size;
    const publicShares = activeShares.filter(s => s.isPublic).length;
    const privateShares = activeShares.filter(s => !s.isPublic).length;

    // Calculate sharing rate
    const sharingRate = entries.length > 0 
      ? ((sharedEntries / entries.length) * 100).toFixed(1)
      : 0;

    // Get most shared entries
    const shareFrequency = {};
    activeShares.forEach(share => {
      shareFrequency[share.entryId] = (shareFrequency[share.entryId] || 0) + 1;
    });

    const mostShared = Object.entries(shareFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([entryId, count]) => ({ entryId, shareCount: count }));

    return {
      totalShares: activeShares.length,
      permissionDistribution: {
        view: activeShares.filter(s => s.permission === 'view').length,
        comment: activeShares.filter(s => s.permission === 'comment').length,
        edit: activeShares.filter(s => s.permission === 'edit').length
      },
      mostSharedEntries: mostShared,
      topRecipients: getTopRecipients(activeShares),
      engagementMetrics: {
        sharedEntries,
        sharingRate: Number(sharingRate),
        publicShares,
        privateShares
      },
      shareFrequency,
      overallStats: {
        totalEntries: entries.length,
        sharedEntries: sharedEntries,
        sharingRate: `${sharingRate}%`,
        totalShares: activeShares.length
      },
      shareTypes: {
        public: publicShares,
        private: privateShares,
        passwordProtected: activeShares.filter(s => s.password).length
      },
      permissions: {
        viewOnly: activeShares.filter(s => s.permission === 'view').length,
        canComment: activeShares.filter(s => s.permission === 'comment').length,
        canEdit: activeShares.filter(s => s.permission === 'edit').length
      },
      engagement: {
        mostSharedEntries: mostShared,
        averageSharesPerEntry: (activeShares.length / entries.length || 0).toFixed(2),
        topRecipients: getTopRecipients(activeShares)
      }
    };
  } catch (error) {
    logger.error('Error generating sharing stats:', error);
    throw error;
  }
}

/**
 * Revoke share access
 * @param {string} shareId - Share ID to revoke
 * @param {string} reason - Reason for revocation
 * @returns {Object} Revocation details
 */
function revokeShare(shareId, reason = null) {
  try {
    if (!shareId) {
      throw new Error('Share ID is required');
    }

    const revocation = {
      shareId: shareId,
      revokedAt: new Date(),
      reason: reason || 'Share revoked by owner',
      status: 'revoked'
    };

    logger.info(`Revoked share ${shareId}: ${reason || 'No reason provided'}`);
    return revocation;
  } catch (error) {
    logger.error('Error revoking share:', error);
    throw error;
  }
}

/**
 * Check access permissions
 * @param {string} userId - User requesting access
 * @param {string} entryId - Entry being accessed
 * @param {Array} shares - Share configurations
 * @returns {Object} Access check result
 */
function checkAccess(userId, entryId, shares = []) {
  try {
    if (userId == null) {
      return false;
    }

    // Legacy/test mode: checkAccess(share, userId, password) => boolean
    if (userId && typeof userId === 'object' && (Array.isArray(userId.sharedWith) || userId.isPublic !== undefined)) {
      const share = userId;
      const requestUserId = entryId;
      const password = shares;
      if (!share) return false;
      if (share.expiresAt && new Date(share.expiresAt) <= new Date()) return false;
      if (share.password && share.password !== password) return false;
      if (share.isPublic) return true;
      return Array.isArray(share.sharedWith) && share.sharedWith.includes(requestUserId);
    }

    // Newer mode: checkAccess(userId, entryId, shares[]) => object
    const safeShares = Array.isArray(shares) ? shares : [];
    const accessShare = safeShares.find(s =>
      s.entryId === entryId &&
      ((Array.isArray(s.sharedWith) && s.sharedWith.includes(userId)) || s.isPublic)
    );

    if (!accessShare) {
      return {
        hasAccess: false,
        permission: 'none',
        reason: 'Entry not shared with this user'
      };
    }

    if (accessShare.expiresAt && new Date(accessShare.expiresAt) <= new Date()) {
      return {
        hasAccess: false,
        permission: 'none',
        reason: 'Share has expired'
      };
    }

    return {
      hasAccess: true,
      permission: accessShare.permission,
      allowComments: accessShare.allowComments,
      allowDownload: accessShare.restrictions?.allowDownload,
      allowCopy: accessShare.restrictions?.allowCopy,
      shareId: accessShare.id || accessShare.shareId
    };
  } catch (error) {
    logger.error('Error checking access:', error);
    return false;
  }
}

/**
 * Generate collaboration insights
 * @param {Array} entries - User's entries
 * @param {Array} allComments - All comments on entries
 * @returns {Object} Collaboration insights
 */
function getCollaborationInsights(entries = [], allComments = []) {
  try {
    const entriesWithComments = new Set(allComments.map(c => c.entryId)).size;
    const uniqueCommenters = new Set(allComments.map(c => c.commenterId)).size;
    const averageCommentsPerEntry = entries.length > 0 
      ? (allComments.length / entries.length).toFixed(1)
      : 0;

    // Most engaging entries
    const commentCounts = {};
    allComments.forEach(comment => {
      commentCounts[comment.entryId] = (commentCounts[comment.entryId] || 0) + 1;
    });

    const mostEngaging = Object.entries(commentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([entryId, count]) => ({ entryId, commentCount: count }));

    // Most active commenters
    const commenterActivity = {};
    allComments.forEach(comment => {
      commenterActivity[comment.commenterId] = (commenterActivity[comment.commenterId] || 0) + 1;
    });

    const topCommenters = Object.entries(commenterActivity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([commenterId, count]) => ({ commenterId, commentCount: count }));

    return {
      mostEngagingEntries: mostEngaging,
      topCommenters: topCommenters,
      recentActivity: allComments.slice(-5).reverse(),
      engagementTrends: {
        entriesWithComments,
        averageCommentsPerEntry: Number(averageCommentsPerEntry)
      },
      collaborationPatterns: {
        uniqueCommenters,
        repeatCommenterRatio: allComments.length > 0 ? Number((uniqueCommenters / allComments.length).toFixed(2)) : 0
      },
      collaborationMetrics: {
        entriesWithComments: entriesWithComments,
        uniqueCommenters: uniqueCommenters,
        totalComments: allComments.length,
        averageCommentsPerEntry: Number(averageCommentsPerEntry),
        engagementRate: entries.length > 0 
          ? `${((entriesWithComments / entries.length) * 100).toFixed(1)}%`
          : '0%'
      },
      mostEngaging: mostEngaging,
      topCommenters: topCommenters,
      recentActivity: allComments.slice(-5).reverse()
    };
  } catch (error) {
    logger.error('Error generating collaboration insights:', error);
    throw error;
  }
}

/**
 * Helper: Generate unique share ID
 * @private
 */
function generateShareId() {
  return 'share_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Helper: Generate share link
 * @private
 */
function generateShareLink() {
  return 'diary/share/' + generateShareId().replace('share_', '');
}

function validateShareLink(shareLink) {
  if (typeof shareLink !== 'string' || !shareLink.trim()) return false;
  return /^diary\/share\/[a-zA-Z0-9_-]+$/.test(shareLink);
}

/**
 * Helper: Generate comment ID
 * @private
 */
function generateCommentId() {
  return 'cmt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Helper: Extract mentions from text
 * @private
 */
function extractMentions(text) {
  if (typeof text !== 'string' || !text) return [];
  const mentionRegex = /(?:^|[\s.,!?;:()[\]{}<>])@([a-zA-Z0-9_]+)/g;
  const mentions = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return [...new Set(mentions)];
}

/**
 * Helper: Get max permission level
 * @private
 */
function getMaxPermission(shares) {
  const permissionHierarchy = { 'view': 0, 'comment': 1, 'edit': 2 };
  return shares.reduce((max, share) => {
    return permissionHierarchy[share.permission] > permissionHierarchy[max] ? share.permission : max;
  }, 'view');
}

/**
 * Helper: Get top recipients
 * @private
 */
function getTopRecipients(shares) {
  const recipientCounts = {};
  shares.forEach(share => {
    share.sharedWith.forEach(recipient => {
      recipientCounts[recipient] = (recipientCounts[recipient] || 0) + 1;
    });
  });

  return Object.entries(recipientCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([recipient, count]) => ({ recipient, shareCount: count }));
}

module.exports = {
  createShare,
  addComment,
  getCollaborationSummary,
  updateSharePermissions,
  getSharingStats,
  revokeShare,
  checkAccess,
  getCollaborationInsights,
  validateShareLink,
  extractMentions
};
