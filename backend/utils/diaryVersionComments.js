const mongoose = require('mongoose');
const DiaryVersionComment = require('../models/DiaryVersionComment');
const logger = require('./logger');

/**
 * Version Comment Utilities - Manage comments on diary entry versions
 * Provides CRUD operations, threading, and metadata tracking
 */

/**
 * Add comment to a version
 * @param {string} userId - User ID
 * @param {string} entryId - Entry ID
 * @param {string} versionId - Version ID
 * @param {number} versionNumber - Version number
 * @param {object} commentData - { text, lineReference, isPrivate, parentCommentId }
 * @returns {object} Created comment
 */
async function addCommentToVersion(userId, entryId, versionId, versionNumber, commentData) {
  try {
    if (!commentData?.text || typeof commentData.text !== 'string') {
      throw new Error('Comment text is required');
    }

    if (commentData.text.length > 2000) {
      throw new Error('Comment text exceeds maximum length');
    }

    const payload = {
      userId,
      entryId,
      versionId,
      versionNumber,
      text: commentData.text,
      lineReference: commentData.lineReference,
      isPrivate: commentData.isPrivate || false,
      parentCommentId: commentData.parentCommentId,
      sentiment: commentData.sentiment || 'neutral'
    };

    const comment = await DiaryVersionComment.create(payload);
    if (typeof comment?.populate === 'function') {
      await comment.populate('userId', 'name email');
    }
    return comment;
  } catch (error) {
    logger.error('Failed to add comment to version:', error);
    throw error;
  }
}

/**
 * Get all comments for a version
 * @param {string} entryId - Entry ID
 * @param {string} versionId - Version ID
 * @param {boolean} includeReplies - Include reply threads
 * @returns {array} Comments array
 */
async function getVersionComments(entryId, versionId, includeReplies = true) {
  try {
    const query = {
      entryId,
      versionId,
      isDeleted: false
    };

    // Get top-level comments
    let commentQuery = DiaryVersionComment.find(query);
    if (typeof commentQuery.populate === 'function') {
      commentQuery = commentQuery
        .populate('userId', 'name email avatar')
        .populate('likedBy', '_id')
        .sort({ createdAt: -1 });
      if (typeof commentQuery.lean === 'function') {
        commentQuery = commentQuery.lean();
      }
    }

    const comments = await commentQuery;

    if (!includeReplies) {
      return comments.filter(c => !c.parentCommentId);
    }

    // Group comments with replies
    const groupedComments = [];
    const commentMap = new Map();

    // First pass: map all comments
    comments.forEach(comment => {
      commentMap.set(comment._id.toString(), {
        ...comment,
        replies: []
      });
    });

    // Second pass: build reply structure
    comments.forEach(comment => {
      if (comment.parentCommentId) {
        const parent = commentMap.get(comment.parentCommentId.toString());
        if (parent) {
          parent.replies.push(comment);
        }
      } else {
        groupedComments.push(commentMap.get(comment._id.toString()));
      }
    });

    return groupedComments;
  } catch (error) {
    logger.error('Failed to get version comments:', error);
    throw error;
  }
}

/**
 * Update comment
 * @param {string} commentId - Comment ID
 * @param {string} userId - User ID (must match comment author)
 * @param {object} updates - { text, sentiment }
 * @returns {object} Updated comment
 */
async function updateComment(commentId, userId, updates) {
  try {
    const comment = await DiaryVersionComment.findById(commentId);
    
    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.userId.toString() !== userId.toString()) {
      throw new Error('Unauthorized: Can only edit own comments');
    }

    if (updates.text) comment.text = updates.text;
    if (updates.sentiment) comment.sentiment = updates.sentiment;
    comment.updatedAt = new Date();

    if (typeof comment.save === 'function') {
      await comment.save();
      if (typeof comment.populate === 'function') {
        await comment.populate('userId', 'name email');
      }
      return comment;
    }

    if (typeof DiaryVersionComment.findByIdAndUpdate === 'function') {
      const updatedComment = await DiaryVersionComment.findByIdAndUpdate(
        commentId,
        { text: comment.text, sentiment: comment.sentiment, updatedAt: comment.updatedAt },
        { new: true }
      );
      return updatedComment || comment;
    }

    return comment;
  } catch (error) {
    logger.error('Failed to update comment:', error);
    throw error;
  }
}

/**
 * Delete comment (soft delete)
 * @param {string} commentId - Comment ID
 * @param {string} userId - User ID (must match comment author)
 */
async function deleteComment(commentId, userId) {
  try {
    const comment = await DiaryVersionComment.findById(commentId);
    
    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.userId.toString() !== userId.toString()) {
      throw new Error('Unauthorized: Can only delete own comments');
    }

    comment.isDeleted = true;
    comment.deletedAt = new Date();

    if (typeof comment.save === 'function') {
      await comment.save();
      return { success: true, message: 'Comment deleted' };
    }

    if (typeof DiaryVersionComment.findByIdAndUpdate === 'function') {
      const deletedComment = await DiaryVersionComment.findByIdAndUpdate(
        commentId,
        { isDeleted: true, deletedAt: comment.deletedAt },
        { new: true }
      );
      return deletedComment || comment;
    }

    return comment;
  } catch (error) {
    logger.error('Failed to delete comment:', error);
    throw error;
  }
}

/**
 * Like/unlike comment
 * @param {string} commentId - Comment ID
 * @param {string} userId - User ID
 * @param {boolean} isLike - true to like, false to unlike
 * @returns {object} Updated comment
 */
async function toggleCommentLike(commentId, userId, isLike) {
  try {
    const comment = await DiaryVersionComment.findById(commentId);
    
    if (!comment) {
      throw new Error('Comment not found');
    }

    const userIdStr = userId.toString();
    const isLiked = comment.likedBy.some(id => id.toString() === userIdStr);

    if (isLike && !isLiked) {
      // Like the comment
      comment.likedBy.push(userId);
      comment.likes = (comment.likes || 0) + 1;
    } else if (!isLike && isLiked) {
      // Unlike the comment
      comment.likedBy = comment.likedBy.filter(id => id.toString() !== userIdStr);
      comment.likes = Math.max(0, (comment.likes || 1) - 1);
    }

    if (typeof comment.save === 'function') {
      await comment.save();
      if (typeof comment.populate === 'function') {
        await comment.populate('userId', 'name email');
      }
      return comment;
    }

    if (typeof DiaryVersionComment.findByIdAndUpdate === 'function') {
      const updatedComment = await DiaryVersionComment.findByIdAndUpdate(
        commentId,
        { likedBy: comment.likedBy, likes: comment.likes },
        { new: true }
      );
      return updatedComment || comment;
    }

    return comment;
  } catch (error) {
    logger.error('Failed to toggle comment like:', error);
    throw error;
  }
}

/**
 * Get comment statistics for a version
 * @param {string} versionId - Version ID
 * @returns {object} { totalComments, topComments, recentComments, averageSentiment }
 */
async function getVersionCommentStats(versionId) {
  try {
    const normalizedVersionId =
      versionId instanceof mongoose.Types.ObjectId
        ? versionId
        : new mongoose.Types.ObjectId(versionId);
    const stats = await DiaryVersionComment.aggregate([
      { $match: { versionId: normalizedVersionId, isDeleted: false } },
      {
        $facet: {
          total: [{ $count: 'count' }],
          byReplies: [
            { $group: { _id: '$parentCommentId', count: { $sum: 1 } } }
          ],
          bySentiment: [
            { $group: { _id: '$sentiment', count: { $sum: 1 } } }
          ],
          topLiked: [
            { $sort: { likes: -1 } },
            { $limit: 3 },
            { $project: { text: 1, likes: 1 } }
          ]
        }
      }
    ]);

    if (!stats || stats.length === 0) {
      return {
        totalComments: 0,
        sentimentBreakdown: {},
        totalLikes: 0,
        mostLikedComment: null,
        byReplies: [],
        bySentiment: [],
        topLiked: [],
      };
    }

    const [firstStat] = stats;
    if (typeof firstStat.totalComments === 'number') {
      return {
        totalComments: firstStat.totalComments,
        sentimentBreakdown: firstStat.sentimentBreakdown || {},
        totalLikes: firstStat.totalLikes || 0,
        mostLikedComment: firstStat.mostLikedComment || null,
      };
    }

    return {
      totalComments: firstStat.total?.[0]?.count || 0,
      sentimentBreakdown: (firstStat.bySentiment || []).reduce((accumulator, item) => {
        accumulator[item._id] = item.count;
        return accumulator;
      }, {}),
      totalLikes: (firstStat.topLiked || []).reduce(
        (sum, item) => sum + (item.likes || 0),
        0
      ),
      mostLikedComment: firstStat.topLiked?.[0] || null,
      byReplies: firstStat.byReplies || [],
      bySentiment: firstStat.bySentiment || [],
      topLiked: firstStat.topLiked || [],
    };
  } catch (error) {
    logger.error('Failed to get comment stats:', error);
    throw error;
  }
}

/**
 * Search comments across versions
 * @param {string} userId - User ID
 * @param {string} entryId - Entry ID
 * @param {string} searchText - Text to search for
 * @returns {array} Matching comments
 */
async function searchComments(userId, entryId, searchText) {
  try {
    let commentQuery = DiaryVersionComment.find({
      userId,
      entryId,
      isDeleted: false,
      $text: { $search: searchText }
    });

    if (typeof commentQuery.populate === 'function') {
      commentQuery = commentQuery
        .populate('versionId', 'versionNumber')
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(50);
    }

    return await commentQuery;
  } catch (error) {
    logger.error('Failed to search comments:', error);
    throw error;
  }
}

module.exports = {
  addCommentToVersion,
  getVersionComments,
  updateComment,
  deleteComment,
  toggleCommentLike,
  getVersionCommentStats,
  searchComments
};
