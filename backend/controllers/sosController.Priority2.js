/**
 * =============================================================================
 * SOS CONTROLLER - PRIORITY 2 EXTENSIONS
 * Video Recording & Contact Group Management
 * =============================================================================
 * Add these functions to backend/controllers/sosController.js
 */

const VideoRecording = require('../models/VideoRecording');
const ContactGroup = require('../models/ContactGroup');
const VideoTranscodingService = require('../services/videoTranscodingService');
const ContactGroupService = require('../services/contactGroupService');
const logger = require('../utils/logger');

/**
 * ENDPOINT 9: Upload and transcode video
 * POST /sos/upload-video/:incidentId
 * Body: { video (base64), quality }
 * Purpose: Save emergency video, queue transcoding to MP4
 */
exports.uploadVideo = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { video: base64Video, quality = 'medium' } = req.body;
    const userId = req.user.id;

    // Validate incident belongs to user
    const incident = await SOSIncident.findOne({
      _id: incidentId,
      userId,
    });

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Validate video data
    const buffer = Buffer.from(base64Video, 'base64');
    const validation = VideoTranscodingService.validateVideoQuality(buffer, 'video/webm');

    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid video',
        details: validation.errors,
      });
    }

    logger.info(`Starting video upload for incident ${incidentId}`);

    // Save and transcode video with progress callback
    const videoMetadata = await VideoTranscodingService.saveAndTranscodeVideo(
      base64Video,
      'video/webm',
      (progress) => {
        logger.debug(`Video transcoding progress: ${progress.percent}%`);
      }
    );

    // Create VideoRecording document
    const videoRecord = await VideoRecording.create({
      incidentId,
      userId,
      filename: videoMetadata.filename,
      filepath: videoMetadata.filepath,
      publicPath: videoMetadata.publicPath,
      filesize: videoMetadata.filesize,
      mimeType: videoMetadata.mimeType,
      codec: videoMetadata.codec,
      quality,
      transcodingStatus: 'completed',
      duration: videoMetadata.duration || 0,
      metadata: {
        originalMimeType: 'video/webm',
        transcodedAt: new Date(),
        preset: videoMetadata.metadata?.preset || 'fast',
      },
    });

    logger.info(`Video saved: ${videoMetadata.filename} for incident ${incidentId}`);

    res.status(201).json({
      success: true,
      video: {
        id: videoRecord._id,
        filename: videoRecord.filename,
        publicPath: videoRecord.publicPath,
        filesize: videoRecord.fileSizeFormatted,
        duration: videoRecord.durationFormatted,
        quality: videoRecord.quality,
        transcodingStatus: videoRecord.transcodingStatus,
        uploadedAt: videoRecord.storedAt,
      },
    });
  } catch (error) {
    logger.error('Video upload failed:', error);
    res.status(500).json({ error: 'Video upload failed', details: error.message });
  }
};

/**
 * ENDPOINT 10: Get incident videos
 * GET /sos/video/:incidentId
 * Purpose: Retrieve all videos for an incident
 */
exports.getIncidentVideos = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const userId = req.user.id;

    // Validate incident
    const incident = await SOSIncident.findOne({
      _id: incidentId,
      userId,
    });

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Get all videos for incident
    const videos = await VideoRecording.find({
      incidentId,
      userId,
      deletedAt: null,
    }).sort({ storedAt: -1 });

    res.json({
      success: true,
      incidentId,
      videoCount: videos.length,
      videos: videos.map((v) => ({
        id: v._id,
        filename: v.filename,
        publicPath: v.publicPath,
        filesize: v.fileSizeFormatted,
        duration: v.durationFormatted,
        quality: v.quality,
        uploadedAt: v.storedAt,
        expiresAt: v.expiresAt,
      })),
    });
  } catch (error) {
    logger.error('Get videos failed:', error);
    res.status(500).json({ error: 'Failed to retrieve videos' });
  }
};

/**
 * ENDPOINT 11: Get video transcoding status
 * GET /sos/video/:videoId/status
 * Purpose: Check transcoding progress
 */
exports.checkVideoStatus = async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user.id;

    const video = await VideoRecording.findOne({
      _id: videoId,
      userId,
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({
      success: true,
      videoId,
      status: video.transcodingStatus,
      progress: video.transcodingProgress,
      duration: video.durationFormatted,
      filesize: video.fileSizeFormatted,
      error: video.transcodingError,
    });
  } catch (error) {
    logger.error('Status check failed:', error);
    res.status(500).json({ error: 'Failed to check video status' });
  }
};

/**
 * ENDPOINT 12: Create contact group
 * POST /sos/contact-groups
 * Body: { name, description, contacts[], priority }
 * Purpose: Save reusable groups of emergency contacts
 */
exports.createContactGroup = async (req, res) => {
  try {
    const { name, description, contacts, priority = 'high' } = req.body;
    const userId = req.user.id;

    if (!name || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        error: 'Group name and at least one contact are required',
      });
    }

    const group = await ContactGroupService.createGroup(
      userId,
      name,
      description,
      contacts,
      priority
    );

    res.status(201).json({
      success: true,
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
        contactCount: group.contactCount,
        priority: group.priority,
        createdAt: group.createdAt,
      },
    });
  } catch (error) {
    logger.error('Create group failed:', error);
    res.status(500).json({ error: 'Failed to create group', details: error.message });
  }
};

/**
 * ENDPOINT 13: Get all contact groups
 * GET /sos/contact-groups
 * Purpose: List all user's contact groups
 */
exports.getContactGroups = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skip = 0, limit = 50 } = req.query;

    const result = await ContactGroupService.getUserGroups(userId, {
      skip: parseInt(skip),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      groups: result.groups.map((g) => ({
        id: g._id,
        name: g.name,
        description: g.description,
        contactCount: g.contactCount,
        priority: g.priority,
        usageCount: g.usageCount,
        lastUsedAt: g.lastUsedAt,
        isDefault: g.metadata?.isDefault,
      })),
      total: result.total,
      skip: result.skip,
      limit: result.limit,
    });
  } catch (error) {
    logger.error('Get groups failed:', error);
    res.status(500).json({ error: 'Failed to retrieve groups' });
  }
};

/**
 * ENDPOINT 14: Get single contact group with contacts
 * GET /sos/contact-groups/:groupId
 * Purpose: Retrieve full group details with all contacts
 */
exports.getContactGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await ContactGroupService.getGroup(groupId, userId);

    res.json({
      success: true,
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
        contacts: group.contacts,
        priority: group.priority,
        usageCount: group.usageCount,
        isDefault: group.metadata?.isDefault,
        createdAt: group.createdAt,
      },
    });
  } catch (error) {
    logger.error('Get group failed:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      error: error.message,
    });
  }
};

/**
 * ENDPOINT 15: Update contact group
 * PATCH /sos/contact-groups/:groupId
 * Body: { name?, description?, contacts?, priority? }
 * Purpose: Modify group settings
 */
exports.updateContactGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const group = await ContactGroupService.updateGroup(groupId, userId, updates);

    res.json({
      success: true,
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
        contactCount: group.contactCount,
        priority: group.priority,
        updatedAt: group.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Update group failed:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      error: error.message,
    });
  }
};

/**
 * ENDPOINT 16: Delete contact group
 * DELETE /sos/contact-groups/:groupId
 * Purpose: Remove a group
 */
exports.deleteContactGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    await ContactGroupService.deleteGroup(groupId, userId);

    res.json({
      success: true,
      message: 'Group deleted successfully',
    });
  } catch (error) {
    logger.error('Delete group failed:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      error: error.message,
    });
  }
};

/**
 * ENDPOINT 17: Add contact to group
 * POST /sos/contact-groups/:groupId/contacts
 * Body: { contactId }
 * Purpose: Add a contact to an existing group
 */
exports.addContactToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { contactId } = req.body;
    const userId = req.user.id;

    if (!contactId) {
      return res.status(400).json({ error: 'Contact ID required' });
    }

    const group = await ContactGroupService.addContactToGroup(groupId, userId, contactId);

    res.json({
      success: true,
      group: {
        id: group._id,
        name: group.name,
        contactCount: group.contactCount,
      },
    });
  } catch (error) {
    logger.error('Add contact failed:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * ENDPOINT 18: Remove contact from group
 * DELETE /sos/contact-groups/:groupId/contacts/:contactId
 * Purpose: Remove a contact from a group
 */
exports.removeContactFromGroup = async (req, res) => {
  try {
    const { groupId, contactId } = req.params;
    const userId = req.user.id;

    const group = await ContactGroupService.removeContactFromGroup(
      groupId,
      userId,
      contactId
    );

    res.json({
      success: true,
      group: {
        id: group._id,
        name: group.name,
        contactCount: group.contactCount,
      },
    });
  } catch (error) {
    logger.error('Remove contact failed:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * ENDPOINT 19: Get group statistics
 * GET /sos/groups/stats
 * Purpose: Analytics on all user's groups
 */
exports.getGroupStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await ContactGroupService.getGroupStats(userId);

    res.json({
      success: true,
      stats: {
        totalGroups: stats.totalGroups,
        totalContacts: stats.totalContacts,
        averageContactsPerGroup:
          stats.totalGroups > 0 ? (stats.totalContacts / stats.totalGroups).toFixed(1) : 0,
        byPriority: stats.byPriority,
      },
    });
  } catch (error) {
    logger.error('Get stats failed:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
};

module.exports = {
  uploadVideo: exports.uploadVideo,
  getIncidentVideos: exports.getIncidentVideos,
  checkVideoStatus: exports.checkVideoStatus,
  createContactGroup: exports.createContactGroup,
  getContactGroups: exports.getContactGroups,
  getContactGroup: exports.getContactGroup,
  updateContactGroup: exports.updateContactGroup,
  deleteContactGroup: exports.deleteContactGroup,
  addContactToGroup: exports.addContactToGroup,
  removeContactFromGroup: exports.removeContactFromGroup,
  getGroupStats: exports.getGroupStats,
};
