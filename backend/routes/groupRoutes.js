const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const groupService = require('../services/groupService');
const logger = require('../utils/logger');

/**
 * Feature 7: Group Messaging & Channels Routes
 * Endpoints for creating/managing groups, channels, and memberships
 */

// ============== GROUP MANAGEMENT ==============

/**
 * @route POST /api/messaging/v3/groups
 * @desc Create a new group chat
 * @access Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, isPublic, maxMembers } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Group name is required',
      });
    }

    const group = await groupService.createGroup(
      { name, description, isPublic, maxMembers },
      req.user._id
    );

    res.status(201).json({
      success: true,
      data: group,
    });
  } catch (error) {
    logger.error('Error creating group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create group',
    });
  }
});

/**
 * @route GET /api/messaging/v3/groups
 * @desc Get user's groups
 * @access Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const filter = req.query.filter || 'active';
    const groups = await groupService.getUserGroups(req.user._id, filter);

    res.status(200).json({
      success: true,
      data: groups,
      count: groups.length,
    });
  } catch (error) {
    logger.error('Error fetching groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch groups',
    });
  }
});

/**
 * @route GET /api/messaging/v3/groups/:groupId
 * @desc Get group details
 * @access Private
 */
router.get('/:groupId', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const ChatGroup = require('../models/ChatGroup');

    const group = await ChatGroup.findById(groupId)
      .populate('createdBy', 'username avatar')
      .populate('admins', 'username avatar');

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found',
      });
    }

    res.status(200).json({
      success: true,
      data: group,
    });
  } catch (error) {
    logger.error('Error fetching group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch group',
    });
  }
});

/**
 * @route PUT /api/messaging/v3/groups/:groupId
 * @desc Update group details
 * @access Private (Admin only)
 */
router.put('/:groupId', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, isPublic, maxMembers } = req.body;
    const ChatGroup = require('../models/ChatGroup');
    const GroupMember = require('../models/GroupMember');

    // Check permission
    const member = await GroupMember.findOne({
      groupId,
      userId: req.user._id,
    });
    if (!member?.isAdmin || !member.permissions.canChangeGroupSettings) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Admin access required',
      });
    }

    const group = await ChatGroup.findByIdAndUpdate(
      groupId,
      { name, description, isPublic, maxMembers },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: group,
    });
  } catch (error) {
    logger.error('Error updating group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update group',
    });
  }
});

// ============== GROUP MEMBERSHIP ==============

/**
 * @route POST /api/messaging/v3/groups/:groupId/members
 * @desc Add member to group
 * @access Private
 */
router.post('/:groupId/members', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    const result = await groupService.addMember(groupId, userId, req.user._id);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error adding member:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add member',
    });
  }
});

/**
 * @route DELETE /api/messaging/v3/groups/:groupId/members/:userId
 * @desc Remove member from group
 * @access Private (Admin)
 */
router.delete('/:groupId/members/:userId', authMiddleware, async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    const result = await groupService.removeMember(
      groupId,
      userId,
      req.user._id
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error removing member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove member',
    });
  }
});

/**
 * @route GET /api/messaging/v3/groups/:groupId/members
 * @desc Get group members
 * @access Private
 */
router.get('/:groupId/members', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const filter = { leftAt: null, removedAt: null };

    const members = await groupService.getGroupMembers(groupId, filter);

    res.status(200).json({
      success: true,
      data: members,
      count: members.length,
    });
  } catch (error) {
    logger.error('Error fetching group members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch members',
    });
  }
});

/**
 * @route POST /api/messaging/v3/groups/:groupId/members/:userId/promote
 * @desc Promote member to admin
 * @access Private (Group Admin)
 */
router.post(
  '/:groupId/members/:userId/promote',
  authMiddleware,
  async (req, res) => {
    try {
      const { groupId, userId } = req.params;

      const result = await groupService.promoteToAdmin(groupId, userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error promoting member:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to promote member',
      });
    }
  }
);

/**
 * @route POST /api/messaging/v3/groups/:groupId/members/:userId/demote
 * @desc Demote admin to member
 * @access Private (Group Admin)
 */
router.post(
  '/:groupId/members/:userId/demote',
  authMiddleware,
  async (req, res) => {
    try {
      const { groupId, userId } = req.params;

      const result = await groupService.demoteToMember(groupId, userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error demoting member:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to demote member',
      });
    }
  }
);

/**
 * @route POST /api/messaging/v3/groups/:groupId/members/:userId/mute
 * @desc Mute member in group
 * @access Private (Group Moderator)
 */
router.post(
  '/:groupId/members/:userId/mute',
  authMiddleware,
  async (req, res) => {
    try {
      const { groupId, userId } = req.params;
      const { reason, durationHours } = req.body;
      const durationMs = durationHours
        ? durationHours * 60 * 60 * 1000
        : null;

      const result = await groupService.muteMember(
        groupId,
        userId,
        reason,
        durationMs
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error muting member:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mute member',
      });
    }
  }
);

/**
 * @route POST /api/messaging/v3/groups/:groupId/members/:userId/ban
 * @desc Ban member from group
 * @access Private (Group Admin)
 */
router.post(
  '/:groupId/members/:userId/ban',
  authMiddleware,
  async (req, res) => {
    try {
      const { groupId, userId } = req.params;
      const { reason } = req.body;

      const result = await groupService.banMember(
        groupId,
        userId,
        reason,
        req.user._id
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error banning member:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to ban member',
      });
    }
  }
);

// ============== CHANNEL MANAGEMENT ==============

/**
 * @route POST /api/messaging/v3/channels
 * @desc Create a new channel
 * @access Private
 */
router.post('/channels', authMiddleware, async (req, res) => {
  try {
    const { name, displayName, description, topic, isPublic } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Channel name is required',
      });
    }

    const channel = await groupService.createChannel(
      { name, displayName, description, topic, isPublic },
      req.user._id
    );

    res.status(201).json({
      success: true,
      data: channel,
    });
  } catch (error) {
    logger.error('Error creating channel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create channel',
    });
  }
});

/**
 * @route GET /api/messaging/v3/channels
 * @desc Get user's subscribed channels
 * @access Private
 */
router.get('/channels', authMiddleware, async (req, res) => {
  try {
    const channels = await groupService.getUserChannels(req.user._id);

    res.status(200).json({
      success: true,
      data: channels,
      count: channels.length,
    });
  } catch (error) {
    logger.error('Error fetching channels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch channels',
    });
  }
});

/**
 * @route POST /api/messaging/v3/channels/:channelId/subscribe
 * @desc Subscribe to channel
 * @access Private
 */
router.post('/channels/:channelId/subscribe', authMiddleware, async (req, res) => {
  try {
    const { channelId } = req.params;

    const subscription = await groupService.subscribeToChannel(
      channelId,
      req.user._id
    );

    res.status(201).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    logger.error('Error subscribing to channel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to subscribe',
    });
  }
});

/**
 * @route POST /api/messaging/v3/channels/:channelId/unsubscribe
 * @desc Unsubscribe from channel
 * @access Private
 */
router.post(
  '/channels/:channelId/unsubscribe',
  authMiddleware,
  async (req, res) => {
    try {
      const { channelId } = req.params;

      const result = await groupService.unsubscribeFromChannel(
        channelId,
        req.user._id
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error unsubscribing from channel:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unsubscribe',
      });
    }
  }
);

/**
 * @route GET /api/messaging/v3/channels/:channelId/subscribers
 * @desc Get channel subscribers
 * @access Private
 */
router.get('/channels/:channelId/subscribers', authMiddleware, async (req, res) => {
  try {
    const { channelId } = req.params;

    const subscribers = await groupService.getChannelSubscribers(channelId);

    res.status(200).json({
      success: true,
      data: subscribers,
      count: subscribers.length,
    });
  } catch (error) {
    logger.error('Error fetching channel subscribers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscribers',
    });
  }
});

// ============== GROUP FEATURES ==============

/**
 * @route POST /api/messaging/v3/groups/:groupId/pin-message
 * @desc Pin message in group
 * @access Private (Group Moderator)
 */
router.post('/:groupId/pin-message', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { messageId } = req.body;

    const result = await groupService.pinMessage(
      groupId,
      messageId,
      req.user._id
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error pinning message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pin message',
    });
  }
});

module.exports = router;
