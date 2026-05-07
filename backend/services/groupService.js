const logger = require('../utils/logger');
const ChatGroup = require('../models/ChatGroup');
const GroupMember = require('../models/GroupMember');
const Channel = require('../models/Channel');
const ChannelSubscription = require('../models/ChannelSubscription');

/**
 * GroupService
 * Manages group chats, channels, and memberships
 */
class GroupService {
  constructor() {
    this.name = 'GroupService';
  }

  /**
   * Create a new group chat
   */
  async createGroup(groupData, creatorId) {
    try {
      const { name, description, isPublic, maxMembers } = groupData;

      const group = new ChatGroup({
        name,
        description,
        isPublic,
        maxMembers: maxMembers || 1000,
        createdBy: creatorId,
        admins: [creatorId],
      });

      await group.save();

      // Add creator as member
      const membership = new GroupMember({
        groupId: group._id,
        userId: creatorId,
        role: 'owner',
        permissions: {
          canPostMessages: true,
          canDeleteOwnMessages: true,
          canDeleteAnyMessages: true,
          canEditOwnMessages: true,
          canEditAnyMessages: true,
          canInviteMembers: true,
          canRemoveMembers: true,
          canManageGroup: true,
          canChangeGroupSettings: true,
          canMuteMembers: true,
          canPinMessages: true,
        },
      });

      await membership.save();

      // Update group member count
      group.memberCount = 1;
      await group.save();

      logger.info(`Group created: ${group._id} by ${creatorId}`);
      return group;
    } catch (error) {
      logger.error('Error creating group:', error);
      throw error;
    }
  }

  /**
   * Add member to group
   */
  async addMember(groupId, userId, invitedBy = null) {
    try {
      const group = await ChatGroup.findById(groupId);
      if (!group) throw new Error('Group not found');

      if (group.memberCount >= group.maxMembers) {
        throw new Error('Group is full');
      }

      // Check if already member
      const existingMember = await GroupMember.findOne({
        groupId,
        userId,
      });

      if (existingMember && existingMember.isMember()) {
        throw new Error('User is already a member');
      }

      // If previously removed, reactivate
      if (existingMember && existingMember.removedAt) {
        existingMember.removedAt = null;
        existingMember.role = 'member';
        await existingMember.save();
      } else {
        // Create new member record
        const membership = new GroupMember({
          groupId,
          userId,
          role: 'member',
          invitedBy,
          invitedAt: new Date(),
          invitationAcceptedAt: new Date(),
        });

        await membership.save();
      }

      // Update group member count
      group.memberCount = await GroupMember.countDocuments({
        groupId,
        leftAt: null,
        removedAt: null,
      });
      group.lastActivityAt = new Date();
      await group.save();

      logger.info(`Member ${userId} added to group ${groupId}`);
      return { success: true, groupId, userId };
    } catch (error) {
      logger.error('Error adding member:', error);
      throw error;
    }
  }

  /**
   * Remove member from group
   */
  async removeMember(groupId, userId, removedBy) {
    try {
      const membership = await GroupMember.findOne({ groupId, userId });
      if (!membership) throw new Error('Member not found in group');

      await membership.remove(removedBy);

      // Update group member count
      const group = await ChatGroup.findById(groupId);
      if (group) {
        group.memberCount = await GroupMember.countDocuments({
          groupId,
          leftAt: null,
          removedAt: null,
        });
        group.lastActivityAt = new Date();
        await group.save();
      }

      logger.info(`Member ${userId} removed from group ${groupId} by ${removedBy}`);
      return { success: true, groupId, userId };
    } catch (error) {
      logger.error('Error removing member:', error);
      throw error;
    }
  }

  /**
   * Promote member to admin
   */
  async promoteToAdmin(groupId, userId) {
    try {
      const membership = await GroupMember.findOne({ groupId, userId });
      if (!membership) throw new Error('Member not found');

      membership.role = 'admin';
      membership.permissions.canManageGroup = true;
      membership.permissions.canChangeGroupSettings = true;
      membership.permissions.canMuteMembers = true;
      membership.permissions.canRemoveMembers = true;
      await membership.save();

      const group = await ChatGroup.findById(groupId);
      if (!group.admins.includes(userId)) {
        await group.addAdmin(userId);
      }

      logger.info(`Member ${userId} promoted to admin in group ${groupId}`);
      return membership;
    } catch (error) {
      logger.error('Error promoting member:', error);
      throw error;
    }
  }

  /**
   * Demote admin to member
   */
  async demoteToMember(groupId, userId) {
    try {
      const membership = await GroupMember.findOne({ groupId, userId });
      if (!membership) throw new Error('Member not found');

      if (membership.role !== 'owner') {
        membership.role = 'member';
        membership.permissions = {
          canPostMessages: true,
          canDeleteOwnMessages: true,
          canDeleteAnyMessages: false,
          canEditOwnMessages: true,
          canEditAnyMessages: false,
          canInviteMembers: false,
          canRemoveMembers: false,
          canManageGroup: false,
          canChangeGroupSettings: false,
          canMuteMembers: false,
          canPinMessages: false,
        };
        await membership.save();
      }

      const group = await ChatGroup.findById(groupId);
      if (group.admins.includes(userId)) {
        await group.removeAdmin(userId);
      }

      logger.info(`Member ${userId} demoted from admin in group ${groupId}`);
      return membership;
    } catch (error) {
      logger.error('Error demoting member:', error);
      throw error;
    }
  }

  /**
   * Mute member in group
   */
  async muteMember(groupId, userId, reason, durationMs = null) {
    try {
      const membership = await GroupMember.findOne({ groupId, userId });
      if (!membership) throw new Error('Member not found');

      await membership.mute(reason, durationMs);

      logger.info(`Member ${userId} muted in group ${groupId}`);
      return membership;
    } catch (error) {
      logger.error('Error muting member:', error);
      throw error;
    }
  }

  /**
   * Ban member from group
   */
  async banMember(groupId, userId, reason, bannedBy) {
    try {
      const membership = await GroupMember.findOne({ groupId, userId });
      if (!membership) throw new Error('Member not found');

      await membership.ban(reason, bannedBy);

      // Update group member count
      const group = await ChatGroup.findById(groupId);
      if (group) {
        group.memberCount = await GroupMember.countDocuments({
          groupId,
          leftAt: null,
          removedAt: null,
          isBanned: false,
        });
        await group.save();
      }

      logger.info(`Member ${userId} banned from group ${groupId}`);
      return membership;
    } catch (error) {
      logger.error('Error banning member:', error);
      throw error;
    }
  }

  /**
   * Get group members
   */
  async getGroupMembers(groupId, filter = {}) {
    try {
      const query = { groupId, ...filter };
      const members = await GroupMember.find(query)
        .populate('userId', 'username avatar email')
        .sort({ joinedAt: 1 });

      return members;
    } catch (error) {
      logger.error('Error fetching group members:', error);
      throw error;
    }
  }

  /**
   * Get user's groups
   */
  async getUserGroups(userId, filter = 'active') {
    try {
      let query = { userId };

      if (filter === 'active') {
        query.leftAt = null;
        query.removedAt = null;
        query.isBanned = false;
      } else if (filter === 'archived') {
        query.$or = [{ leftAt: { $ne: null } }, { removedAt: { $ne: null } }];
      }

      const memberships = await GroupMember.find(query)
        .populate('groupId')
        .sort({ joinedAt: -1 });

      return memberships.map((m) => m.groupId);
    } catch (error) {
      logger.error('Error fetching user groups:', error);
      throw error;
    }
  }

  /**
   * Create a channel
   */
  async createChannel(channelData, creatorId) {
    try {
      const { name, displayName, description, topic, isPublic } = channelData;

      const channel = new Channel({
        name,
        displayName,
        description,
        topic: topic || 'general',
        isPublic: isPublic !== false,
        createdBy: creatorId,
        moderators: [creatorId],
      });

      await channel.save();

      logger.info(`Channel created: ${channel._id} by ${creatorId}`);
      return channel;
    } catch (error) {
      logger.error('Error creating channel:', error);
      throw error;
    }
  }

  /**
   * Subscribe user to channel
   */
  async subscribeToChannel(channelId, userId) {
    try {
      let subscription = await ChannelSubscription.findOne({
        channelId,
        userId,
      });

      if (!subscription) {
        subscription = new ChannelSubscription({
          channelId,
          userId,
          isSubscribed: true,
        });
      } else {
        subscription.isSubscribed = true;
        subscription.unsubscribedAt = null;
      }

      await subscription.save();

      // Update subscriber count
      const channel = await Channel.findById(channelId);
      if (channel) {
        channel.subscriberCount = await ChannelSubscription.countDocuments({
          channelId,
          isSubscribed: true,
        });
        await channel.save();
      }

      logger.info(`User ${userId} subscribed to channel ${channelId}`);
      return subscription;
    } catch (error) {
      logger.error('Error subscribing to channel:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe user from channel
   */
  async unsubscribeFromChannel(channelId, userId) {
    try {
      const subscription = await ChannelSubscription.findOne({
        channelId,
        userId,
      });

      if (!subscription) throw new Error('Subscription not found');

      await subscription.unsubscribe();

      // Update subscriber count
      const channel = await Channel.findById(channelId);
      if (channel) {
        channel.subscriberCount = await ChannelSubscription.countDocuments({
          channelId,
          isSubscribed: true,
        });
        await channel.save();
      }

      logger.info(`User ${userId} unsubscribed from channel ${channelId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error unsubscribing from channel:', error);
      throw error;
    }
  }

  /**
   * Get user's channels
   */
  async getUserChannels(userId) {
    try {
      const subscriptions = await ChannelSubscription.find({
        userId,
        isSubscribed: true,
      })
        .populate('channelId')
        .sort({ createdAt: -1 });

      return subscriptions.map((s) => s.channelId);
    } catch (error) {
      logger.error('Error fetching user channels:', error);
      throw error;
    }
  }

  /**
   * Get channel subscribers
   */
  async getChannelSubscribers(channelId) {
    try {
      const subscriptions = await ChannelSubscription.find({
        channelId,
        isSubscribed: true,
      })
        .populate('userId', 'username avatar email')
        .sort({ subscribedAt: -1 });

      return subscriptions;
    } catch (error) {
      logger.error('Error fetching channel subscribers:', error);
      throw error;
    }
  }

  /**
   * Pin message in group
   */
  async pinMessage(groupId, messageId, userId) {
    try {
      const group = await ChatGroup.findById(groupId);
      if (!group) throw new Error('Group not found');

      // Check permission
      const member = await GroupMember.findOne({ groupId, userId });
      if (!member?.permissions.canPinMessages) {
        throw new Error('No permission to pin messages');
      }

      group.pinMessage = {
        messageId,
        pinnedBy: userId,
        pinnedAt: new Date(),
      };

      await group.save();

      logger.info(`Message ${messageId} pinned in group ${groupId}`);
      return group;
    } catch (error) {
      logger.error('Error pinning message:', error);
      throw error;
    }
  }
}

module.exports = new GroupService();
