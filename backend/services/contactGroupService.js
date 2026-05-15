const ContactGroup = require('../models/ContactGroup');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * ContactGroupService
 * Manage CRUD operations for contact groups
 * Allows users to create, organize, and quickly select multiple contacts for SOS alerts
 */
class ContactGroupService {
  /**
   * Create a new contact group
   * @param {string} userId - User ID
   * @param {string} name - Group name
   * @param {string} description - Group description
   * @param {Array} contactIds - Array of contact IDs to include
   * @param {string} priority - Priority level (low, medium, high)
   * @returns {Object} Created group
   */
  static async createGroup(userId, name, description, contactIds = [], priority = 'high') {
    try {
      if (!name || name.trim().length === 0) {
        throw new Error('Group name is required');
      }

      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        throw new Error('At least one contact must be added to the group');
      }

      const group = new ContactGroup({
        userId,
        name: name.trim(),
        description: description ? description.trim() : '',
        contacts: contactIds,
        priority,
        metadata: {
          createdBy: 'user',
          createdAt: new Date(),
        },
      });

      await group.save();
      logger.info(`Created contact group: ${group._id} for user ${userId}`);

      return group;
    } catch (error) {
      logger.error('Failed to create contact group:', error);
      throw error;
    }
  }

  /**
   * Get all groups for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} User's contact groups
   */
  static async getUserGroups(userId, options = {}) {
    try {
      const {
        sort = { createdAt: -1 },
        limit = 50,
        skip = 0,
      } = options;

      const groups = await ContactGroup.find({ userId })
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .exec();

      const total = await ContactGroup.countDocuments({ userId });

      return {
        groups,
        total,
        limit,
        skip,
      };
    } catch (error) {
      logger.error('Failed to get user groups:', error);
      throw error;
    }
  }

  /**
   * Get a specific group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Object} Contact group
   */
  static async getGroup(groupId, userId) {
    try {
      const group = await ContactGroup.findOne({ _id: groupId, userId });

      if (!group) {
        throw new Error('Contact group not found or access denied');
      }

      return group;
    } catch (error) {
      logger.error('Failed to get group:', error);
      throw error;
    }
  }

  /**
   * Update a group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID (for authorization)
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated group
   */
  static async updateGroup(groupId, userId, updates) {
    try {
      // Validate updates
      const allowedFields = ['name', 'description', 'contacts', 'priority'];
      const updateObj = {};

      for (const field of allowedFields) {
        if (field in updates) {
          if (field === 'name' && (!updates[field] || updates[field].trim().length === 0)) {
            throw new Error('Group name cannot be empty');
          }
          if (field === 'contacts' && (!Array.isArray(updates[field]) || updates[field].length === 0)) {
            throw new Error('At least one contact must be in the group');
          }
          updateObj[field] = updates[field];
        }
      }

      updateObj.updatedAt = new Date();

      const group = await ContactGroup.findOneAndUpdate(
        { _id: groupId, userId },
        { $set: updateObj },
        { new: true, runValidators: true }
      );

      if (!group) {
        throw new Error('Contact group not found or access denied');
      }

      logger.info(`Updated contact group: ${groupId}`);
      return group;
    } catch (error) {
      logger.error('Failed to update group:', error);
      throw error;
    }
  }

  /**
   * Delete a group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Object} Deletion result
   */
  static async deleteGroup(groupId, userId) {
    try {
      const result = await ContactGroup.findOneAndDelete({
        _id: groupId,
        userId,
      });

      if (!result) {
        throw new Error('Contact group not found or access denied');
      }

      logger.info(`Deleted contact group: ${groupId}`);

      return {
        deletedId: groupId,
        deletedAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to delete group:', error);
      throw error;
    }
  }

  /**
   * Add contact to group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID (for authorization)
   * @param {string} contactId - Contact ID to add
   * @returns {Object} Updated group
   */
  static async addContactToGroup(groupId, userId, contactId) {
    try {
      const group = await ContactGroup.findOneAndUpdate(
        { _id: groupId, userId, 'contacts': { $ne: contactId } },
        { $push: { contacts: contactId }, $set: { updatedAt: new Date() } },
        { new: true }
      );

      if (!group) {
        throw new Error('Contact group not found, access denied, or contact already exists');
      }

      logger.info(`Added contact ${contactId} to group ${groupId}`);
      return group;
    } catch (error) {
      logger.error('Failed to add contact to group:', error);
      throw error;
    }
  }

  /**
   * Remove contact from group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID (for authorization)
   * @param {string} contactId - Contact ID to remove
   * @returns {Object} Updated group
   */
  static async removeContactFromGroup(groupId, userId, contactId) {
    try {
      const group = await ContactGroup.findOne({ _id: groupId, userId });

      if (!group) {
        throw new Error('Contact group not found or access denied');
      }

      // Ensure group has at least one contact after removal
      if (group.contacts.length <= 1) {
        throw new Error('Cannot remove the last contact from a group');
      }

      const updated = await ContactGroup.findOneAndUpdate(
        { _id: groupId, userId },
        { $pull: { contacts: contactId }, $set: { updatedAt: new Date() } },
        { new: true }
      );

      logger.info(`Removed contact ${contactId} from group ${groupId}`);
      return updated;
    } catch (error) {
      logger.error('Failed to remove contact from group:', error);
      throw error;
    }
  }

  /**
   * Reorder contacts in a group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID (for authorization)
   * @param {Array} orderedContactIds - Reordered contact IDs
   * @returns {Object} Updated group
   */
  static async reorderContactsInGroup(groupId, userId, orderedContactIds) {
    try {
      // Validate that all IDs are present
      const group = await ContactGroup.findOne({ _id: groupId, userId });

      if (!group) {
        throw new Error('Contact group not found or access denied');
      }

      if (
        !Array.isArray(orderedContactIds) ||
        orderedContactIds.length !== group.contacts.length ||
        !orderedContactIds.every(id => group.contacts.includes(id))
      ) {
        throw new Error('Invalid contact ID list for reordering');
      }

      const updated = await ContactGroup.findOneAndUpdate(
        { _id: groupId, userId },
        { $set: { contacts: orderedContactIds, updatedAt: new Date() } },
        { new: true }
      );

      logger.info(`Reordered contacts in group ${groupId}`);
      return updated;
    } catch (error) {
      logger.error('Failed to reorder contacts:', error);
      throw error;
    }
  }

  /**
   * Get group statistics
   * @param {string} userId - User ID
   * @returns {Object} Group stats
   */
  static async getGroupStats(userId) {
    try {
      const normalizedUserId =
        mongoose.Types.ObjectId.isValid(userId)
          ? new mongoose.Types.ObjectId(userId)
          : userId;

      const stats = await ContactGroup.aggregate([
        { $match: { userId: normalizedUserId } },
        {
          $group: {
            _id: null,
            totalGroups: { $sum: 1 },
            totalContacts: { $sum: { $size: '$contacts' } },
            byPriority: {
              $push: {
                priority: '$priority',
                count: 1,
              },
            },
          },
        },
      ]);

      return stats[0] || {
        totalGroups: 0,
        totalContacts: 0,
        byPriority: [],
      };
    } catch (error) {
      logger.error('Failed to get group stats:', error);
      throw error;
    }
  }

  /**
   * Search groups by name or description
   * @param {string} userId - User ID
   * @param {string} searchTerm - Search term
   * @returns {Array} Matching groups
   */
  static async searchGroups(userId, searchTerm) {
    try {
      const regex = new RegExp(searchTerm, 'i');

      const groups = await ContactGroup.find({
        userId,
        $or: [
          { name: regex },
          { description: regex },
        ],
      }).exec();

      return groups;
    } catch (error) {
      logger.error('Failed to search groups:', error);
      throw error;
    }
  }

  /**
   * Clone a group (create a copy with new name)
   * @param {string} groupId - Group ID to clone
   * @param {string} userId - User ID
   * @param {string} newName - Name for cloned group
   * @returns {Object} Cloned group
   */
  static async cloneGroup(groupId, userId, newName) {
    try {
      const original = await ContactGroup.findOne({ _id: groupId, userId });

      if (!original) {
        throw new Error('Contact group not found or access denied');
      }

      const cloned = new ContactGroup({
        userId,
        name: newName || `${original.name} (Copy)`,
        description: original.description,
        contacts: [...original.contacts],
        priority: original.priority,
        metadata: {
          clonedFrom: groupId,
          createdBy: 'user',
          createdAt: new Date(),
        },
      });

      await cloned.save();
      logger.info(`Cloned group from ${groupId} to ${cloned._id}`);

      return cloned;
    } catch (error) {
      logger.error('Failed to clone group:', error);
      throw error;
    }
  }
}

module.exports = ContactGroupService;
