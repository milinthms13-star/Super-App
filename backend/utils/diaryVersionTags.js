const DiaryVersionTag = require('../models/DiaryVersionTag');
const logger = require('../logger');

/**
 * Version Tag Utilities - Manage tags for diary entry versions
 * Enables categorization and quick filtering of important versions
 */

/**
 * Predefined tags with colors and descriptions
 */
const PREDEFINED_TAGS = {
  final: {
    color: '#10b981',
    description: 'Final version - ready for archival'
  },
  'review-ready': {
    color: '#f59e0b',
    description: 'Ready for review or sharing'
  },
  archive: {
    color: '#6b7280',
    description: 'Archived version for reference'
  },
  important: {
    color: '#ef4444',
    description: 'Important milestone or moment'
  },
  draft: {
    color: '#a78bfa',
    description: 'Draft or work-in-progress'
  },
  shared: {
    color: '#3b82f6',
    description: 'Version that was shared'
  },
  bookmarked: {
    color: '#ec4899',
    description: 'Bookmarked for quick access'
  },
  custom: {
    color: '#667eea',
    description: 'Custom tag'
  }
};

/**
 * Add tag to version
 * @param {string} userId - User ID
 * @param {string} entryId - Entry ID
 * @param {string} versionId - Version ID
 * @param {number} versionNumber - Version number
 * @param {object} tagData - { name, color, description, reason }
 * @returns {object} Created tag
 */
async function addTagToVersion(userId, entryId, versionId, versionNumber, tagData) {
  try {
    // Check if tag already exists
    const existing = await DiaryVersionTag.findOne({
      entryId,
      versionId,
      name: tagData.name.toLowerCase()
    });

    if (existing) {
      throw new Error(`Tag '${tagData.name}' already exists for this version`);
    }

    const tagConfig = PREDEFINED_TAGS[tagData.name.toLowerCase()] || {};

    const tag = new DiaryVersionTag({
      userId,
      entryId,
      versionId,
      versionNumber,
      name: tagData.name.toLowerCase(),
      color: tagData.color || tagConfig.color,
      description: tagData.description || tagConfig.description,
      reason: tagData.reason,
      priority: tagData.priority || 0
    });

    await tag.save();
    return tag;
  } catch (error) {
    logger.error('Failed to add tag to version:', error);
    throw error;
  }
}

/**
 * Get all tags for a version
 * @param {string} versionId - Version ID
 * @returns {array} Tags array
 */
async function getVersionTags(versionId) {
  try {
    const tags = await DiaryVersionTag.find({ versionId })
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    return tags;
  } catch (error) {
    logger.error('Failed to get version tags:', error);
    throw error;
  }
}

/**
 * Get all versions with a specific tag
 * @param {string} userId - User ID
 * @param {string} entryId - Entry ID
 * @param {string} tagName - Tag name to filter by
 * @returns {array} Versions with tag
 */
async function getVersionsByTag(userId, entryId, tagName) {
  try {
    const tags = await DiaryVersionTag.find({
      userId,
      entryId,
      name: tagName.toLowerCase()
    })
      .populate('versionId', 'versionNumber title content savedAt')
      .sort({ createdAt: -1 })
      .lean();

    return tags.map(tag => tag.versionId);
  } catch (error) {
    logger.error('Failed to get versions by tag:', error);
    throw error;
  }
}

/**
 * Remove tag from version
 * @param {string} tagId - Tag ID
 * @param {string} userId - User ID (must match tag creator)
 */
async function removeTagFromVersion(tagId, userId) {
  try {
    const tag = await DiaryVersionTag.findById(tagId);
    
    if (!tag) {
      throw new Error('Tag not found');
    }

    if (tag.userId.toString() !== userId.toString()) {
      throw new Error('Unauthorized: Can only remove own tags');
    }

    await DiaryVersionTag.findByIdAndDelete(tagId);
    return { success: true, message: 'Tag removed' };
  } catch (error) {
    logger.error('Failed to remove tag:', error);
    throw error;
  }
}

/**
 * Update tag metadata
 * @param {string} tagId - Tag ID
 * @param {string} userId - User ID
 * @param {object} updates - { color, description, priority, reason }
 * @returns {object} Updated tag
 */
async function updateTag(tagId, userId, updates) {
  try {
    const tag = await DiaryVersionTag.findById(tagId);
    
    if (!tag) {
      throw new Error('Tag not found');
    }

    if (tag.userId.toString() !== userId.toString()) {
      throw new Error('Unauthorized: Can only update own tags');
    }

    if (updates.color) tag.color = updates.color;
    if (updates.description !== undefined) tag.description = updates.description;
    if (updates.priority !== undefined) tag.priority = updates.priority;
    if (updates.reason !== undefined) tag.reason = updates.reason;

    await tag.save();
    return tag;
  } catch (error) {
    logger.error('Failed to update tag:', error);
    throw error;
  }
}

/**
 * Get tag statistics for an entry
 * @param {string} entryId - Entry ID
 * @returns {object} { totalTags, byName, mostUsed }
 */
async function getEntryTagStats(entryId) {
  try {
    const stats = await DiaryVersionTag.aggregate([
      { $match: { entryId } },
      {
        $facet: {
          total: [{ $count: 'count' }],
          byName: [
            { $group: { _id: '$name', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          mostUsed: [
            { $group: { _id: '$name', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
          ]
        }
      }
    ]);

    return {
      totalTags: stats[0].total[0]?.count || 0,
      byName: stats[0].byName,
      mostUsed: stats[0].mostUsed
    };
  } catch (error) {
    logger.error('Failed to get tag stats:', error);
    throw error;
  }
}

/**
 * Get predefined tags (for UI dropdown)
 * @returns {object} Predefined tags mapping
 */
function getPredefinedTags() {
  return PREDEFINED_TAGS;
}

/**
 * Bulk add tags to multiple versions
 * @param {string} userId - User ID
 * @param {string} entryId - Entry ID
 * @param {array} versionIds - Array of version IDs
 * @param {string} tagName - Tag name to add to all
 */
async function bulkAddTag(userId, entryId, versionIds, tagName) {
  try {
    const tagConfig = PREDEFINED_TAGS[tagName.toLowerCase()] || {};
    const bulkOps = versionIds.map((versionId, index) => ({
      insertOne: {
        document: {
          userId,
          entryId,
          versionId,
          versionNumber: index + 1,
          name: tagName.toLowerCase(),
          color: tagConfig.color,
          description: tagConfig.description,
          createdAt: new Date()
        }
      }
    }));

    const result = await DiaryVersionTag.bulkWrite(bulkOps, { ordered: false });
    return result;
  } catch (error) {
    logger.error('Failed to bulk add tags:', error);
    throw error;
  }
}

module.exports = {
  addTagToVersion,
  getVersionTags,
  getVersionsByTag,
  removeTagFromVersion,
  updateTag,
  getEntryTagStats,
  getPredefinedTags,
  bulkAddTag,
  PREDEFINED_TAGS
};
