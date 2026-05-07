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
    if (!entry || !ownerId) {
      throw new Error('Entry and ownerId are required');
    }

    const share = {
      id: generateShareId(),
      entryId: entry._id,
      ownerId: ownerId,
      sharedWith: shareWith || [],
      permission: options.permission || 'view', // 'view', 'comment', 'edit'
      sharedAt: new Date(),
      expiresAt: options.expiresAt || null,
      isPublic: options.isPublic || false,
      shareLink: generateShareLink(),
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

    logger.info(`Created share for entry ${entry._id} with ${shareWith.length} users`);
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
    if (!entryId || !commenterId || !comment) {
      throw new Error('EntryId, commenterId, and comment are required');
    }

    const commentObj = {
      id: generateCommentId(),
      entryId: entryId,
      commenterId: commenterId,
      text: comment,
      createdAt: new Date(),
      updatedAt: new Date(),
      edited: false,
      threadId: options.replyTo || null, // Support threaded comments
      likes: 0,
      likedBy: [],
      attachments: options.attachments || [],
      mentions: extractMentions(comment),
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

    return {
      entryId: entryId,
      collaborationMetrics: {
        totalShares: shares.length,
        activeShares: activeShares.length,
        sharedWith: totalSharedWith,
        totalComments: comments.length,
        uniqueCommenters: new Set(comments.map(c => c.commenterId)).size,
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
function updateSharePermissions(shareId, updates) {
  try {
    if (!shareId) {
      throw new Error('Share ID is required');
    }

    const validPermissions = ['view', 'comment', 'edit'];
    if (updates.permission && !validPermissions.includes(updates.permission)) {
      throw new Error(`Invalid permission: ${updates.permission}`);
    }

    const updatedShare = {
      id: shareId,
      permission: updates.permission || 'view',
      allowComments: updates.allowComments,
      allowSharing: updates.allowSharing,
      expiresAt: updates.expiresAt || null,
      restrictions: updates.restrictions || {},
      updatedAt: new Date()
    };

    logger.info(`Updated permissions for share ${shareId}`);
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
    const userShare = shares.find(s => 
      s.entryId === entryId && 
      (s.sharedWith.includes(userId) || s.isPublic)
    );

    if (!userShare) {
      return {
        hasAccess: false,
        permission: 'none',
        reason: 'Entry not shared with this user'
      };
    }

    // Check expiration
    if (userShare.expiresAt && new Date(userShare.expiresAt) <= new Date()) {
      return {
        hasAccess: false,
        permission: 'none',
        reason: 'Share has expired'
      };
    }

    return {
      hasAccess: true,
      permission: userShare.permission,
      allowComments: userShare.allowComments,
      allowDownload: userShare.restrictions.allowDownload,
      allowCopy: userShare.restrictions.allowCopy,
      shareId: userShare.id
    };
  } catch (error) {
    logger.error('Error checking access:', error);
    throw error;
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
  return 'https://diary.share/' + generateShareId();
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
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
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
  getCollaborationInsights
};
