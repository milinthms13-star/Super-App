const crypto = require('crypto');
const DiaryEntry = require('../models/DiaryEntry');
const DiaryEntryVersion = require('../models/DiaryEntryVersion');
const DiaryVersionTag = require('../models/DiaryVersionTag');
const DiaryVersionComment = require('../models/DiaryVersionComment');
const logger = require('./logger');

/**
 * Version Share & Export Utilities - Share and export specific diary versions
 * Provides version sharing, public links, and export functionality
 */

/**
 * Generate shareable link for a specific version
 * @param {string} entryId - Entry ID
 * @param {string} versionId - Version ID
 * @param {object} options - { expiresIn: 7, password, isPublic: false }
 * @returns {object} { shareToken, shareUrl, expiresAt }
 */
async function generateVersionShareLink(entryId, versionId, options = {}) {
  try {
    // Generate unique share token
    const shareToken = crypto.randomBytes(16).toString('hex');
    const expiresIn = options.expiresIn || 7; // days
    const expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000);

    // Store share metadata in entry
    const entry = await DiaryEntry.findById(entryId);
    if (!entry) {
      throw new Error('Entry not found');
    }

    // Initialize shares array if not exists
    if (!entry.versionShares) {
      entry.versionShares = [];
    }

    const shareRecord = {
      token: shareToken,
      versionId,
      expiresAt,
      isPublic: options.isPublic || false,
      hasPassword: !!options.password,
      createdAt: new Date(),
      accessCount: 0
    };

    entry.versionShares.push(shareRecord);
    await entry.save();

    return {
      shareToken,
      shareUrl: `${process.env.APP_URL || 'http://localhost:3000'}/diary/share/${shareToken}`,
      expiresAt,
      isPublic: options.isPublic || false
    };
  } catch (error) {
    logger.error('Failed to generate version share link:', error);
    throw error;
  }
}

/**
 * Get shared version by token
 * @param {string} shareToken - Share token
 * @param {string} password - Optional password (if protected)
 * @returns {object} { version, entry, metadata }
 */
async function getSharedVersion(shareToken, password = null) {
  try {
    const entry = await DiaryEntry.findOne({ 'versionShares.token': shareToken });
    
    if (!entry) {
      throw new Error('Share link not found or expired');
    }

    const share = entry.versionShares.find(s => s.token === shareToken);
    
    if (!share) {
      throw new Error('Share link not found');
    }

    // Check expiration
    if (share.expiresAt < new Date()) {
      throw new Error('Share link has expired');
    }

    // Get version
    const version = await DiaryEntryVersion.findById(share.versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    // Increment access count
    share.accessCount += 1;
    await entry.save();

    return {
      version: version.toObject(),
      entry: {
        title: entry.title,
        createdAt: entry.createdAt
      },
      metadata: {
        shareToken,
        expiresAt: share.expiresAt,
        isPublic: share.isPublic,
        accessCount: share.accessCount
      }
    };
  } catch (error) {
    logger.error('Failed to get shared version:', error);
    throw error;
  }
}

/**
 * Revoke version share link
 * @param {string} entryId - Entry ID
 * @param {string} shareToken - Share token to revoke
 * @param {string} userId - User ID (must own entry)
 */
async function revokeVersionShare(entryId, shareToken, userId) {
  try {
    const entry = await DiaryEntry.findById(entryId);
    
    if (!entry || entry.userId.toString() !== userId.toString()) {
      throw new Error('Unauthorized: Cannot revoke share');
    }

    entry.versionShares = entry.versionShares.filter(
      s => s.token !== shareToken
    );
    
    await entry.save();
    return { success: true, message: 'Share link revoked' };
  } catch (error) {
    logger.error('Failed to revoke version share:', error);
    throw error;
  }
}

/**
 * Export version as JSON
 * @param {string} versionId - Version ID
 * @param {boolean} includeMetadata - Include comments, tags, etc.
 * @returns {object} Version data with optional metadata
 */
async function exportVersionAsJSON(versionId, includeMetadata = true) {
  try {
    const version = await DiaryEntryVersion.findById(versionId);
    
    if (!version) {
      throw new Error('Version not found');
    }

    const exportData = {
      version: version.toObject(),
      exportedAt: new Date(),
      exportFormat: 'json'
    };

    if (includeMetadata) {
      const tags = await DiaryVersionTag.find({ versionId }).lean();
      const comments = await DiaryVersionComment.find({ versionId, isDeleted: false })
        .populate('userId', 'name email')
        .lean();

      exportData.tags = tags;
      exportData.comments = comments;
      exportData.metadata = {
        totalComments: comments.length,
        totalTags: tags.length
      };
    }

    return exportData;
  } catch (error) {
    logger.error('Failed to export version as JSON:', error);
    throw error;
  }
}

/**
 * Export version as CSV (flattened data)
 * @param {string} versionId - Version ID
 * @returns {string} CSV formatted string
 */
async function exportVersionAsCSV(versionId) {
  try {
    const version = await DiaryEntryVersion.findById(versionId);
    
    if (!version) {
      throw new Error('Version not found');
    }

    const rows = [
      ['Field', 'Value'],
      ['Version Number', version.versionNumber],
      ['Title', version.title],
      ['Mood', version.mood],
      ['Category', version.category],
      ['Tags', (version.tags || []).join(', ')],
      ['Saved At', version.savedAt.toISOString()],
      ['Change Type', version.changeType],
      ['Content Length', version.content?.length || 0],
      ['Content', `"""${version.content?.replace(/"/g, '""')}"""`]
    ];

    return rows.map(row => 
      row.map(cell => 
        typeof cell === 'string' && cell.includes(',') 
          ? `"${cell}"` 
          : cell
      ).join(',')
    ).join('\n');
  } catch (error) {
    logger.error('Failed to export version as CSV:', error);
    throw error;
  }
}

/**
 * Get all shares for an entry
 * @param {string} entryId - Entry ID
 * @param {string} userId - User ID (must own entry)
 * @returns {array} Active shares
 */
async function getEntryShares(entryId, userId) {
  try {
    const entry = await DiaryEntry.findById(entryId);
    
    if (!entry || entry.userId.toString() !== userId.toString()) {
      throw new Error('Unauthorized: Cannot access shares');
    }

    // Filter active (non-expired) shares
    const activeShares = (entry.versionShares || [])
      .filter(share => share.expiresAt > new Date())
      .map(share => ({
        token: share.token,
        versionId: share.versionId,
        expiresAt: share.expiresAt,
        isPublic: share.isPublic,
        accessCount: share.accessCount,
        createdAt: share.createdAt
      }));

    return activeShares;
  } catch (error) {
    logger.error('Failed to get entry shares:', error);
    throw error;
  }
}

/**
 * Create version snapshot (immutable record for sharing)
 * @param {string} versionId - Version ID
 * @param {object} options - { title, description, includeComments }
 * @returns {object} Snapshot data
 */
async function createVersionSnapshot(versionId, options = {}) {
  try {
    const version = await DiaryEntryVersion.findById(versionId);
    
    if (!version) {
      throw new Error('Version not found');
    }

    const tags = await DiaryVersionTag.find({ versionId }).lean();
    const comments = await DiaryVersionComment.find({ versionId, isDeleted: false })
      .populate('userId', 'name email')
      .lean();

    const snapshot = {
      snapshotId: crypto.randomBytes(8).toString('hex'),
      versionId,
      title: options.title || `Snapshot of v${version.versionNumber}`,
      description: options.description || '',
      version: version.toObject(),
      tags,
      comments: options.includeComments ? comments : [],
      createdAt: new Date(),
      isImmutable: true
    };

    return snapshot;
  } catch (error) {
    logger.error('Failed to create version snapshot:', error);
    throw error;
  }
}

module.exports = {
  generateVersionShareLink,
  getSharedVersion,
  revokeVersionShare,
  exportVersionAsJSON,
  exportVersionAsCSV,
  getEntryShares,
  createVersionSnapshot
};
