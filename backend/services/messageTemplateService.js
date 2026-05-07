const logger = require('../utils/logger');
const MessageTemplate = require('../models/MessageTemplate');

class MessageTemplateService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 10 * 60 * 1000; // 10 minutes
    this.maxTemplatesPerUser = 100;
  }

  /**
   * Create message template
   * @param {string} userId - User ID
   * @param {string} name - Template name
   * @param {string} content - Template content
   * @param {Object} options - Additional settings
   * @returns {Object} Template object
   */
  async createTemplate(userId, name, content, options = {}) {
    try {
      if (!userId || !name || !content) {
        throw new Error('Missing required fields: userId, name, content');
      }

      // Check template limit
      const count = await MessageTemplate.countDocuments({ userId });
      if (count >= this.maxTemplatesPerUser) {
        throw new Error(`Maximum ${this.maxTemplatesPerUser} templates per user exceeded`);
      }

      const template = new MessageTemplate({
        userId,
        name,
        content,
        category: options.category || 'general',
        tags: options.tags || [],
        variables: options.variables || [],
        attachmentTemplate: options.attachmentTemplate || null,
        usageCount: 0,
        lastUsed: null,
        createdAt: new Date(),
      });

      await template.save();
      this.invalidateCache(userId);

      logger.info(`Template created: ${template._id} for user ${userId}`);
      return template;
    } catch (error) {
      logger.error(`Error creating template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user templates
   * @param {string} userId - User ID
   * @param {Object} options - Filtering options
   * @returns {Array} Templates
   */
  async getTemplates(userId, options = {}) {
    try {
      const { limit = 20, offset = 0, category, sortBy = 'createdAt' } = options;

      const cacheKey = `templates:${userId}:${category || 'all'}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }

      const query = { userId };
      if (category) {
        query.category = category;
      }

      const templates = await MessageTemplate.find(query)
        .sort({ [sortBy]: -1 })
        .limit(limit)
        .skip(offset)
        .exec();

      this.cache.set(cacheKey, { data: templates, timestamp: Date.now() });
      return templates;
    } catch (error) {
      logger.error(`Error getting templates: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get template by ID
   * @param {string} templateId - Template ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Object} Template
   */
  async getTemplate(templateId, userId) {
    try {
      const template = await MessageTemplate.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      if (template.userId !== userId) {
        throw new Error('Not authorized to access this template');
      }

      return template;
    } catch (error) {
      logger.error(`Error getting template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply template to message
   * @param {string} templateId - Template ID
   * @param {Object} variables - Variable replacements
   * @returns {string} Rendered content
   */
  async applyTemplate(templateId, variables = {}) {
    try {
      const template = await MessageTemplate.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      let content = template.content;

      // Replace variables
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        content = content.replace(new RegExp(placeholder, 'g'), value);
      }

      // Update usage
      template.usageCount += 1;
      template.lastUsed = new Date();
      await template.save();

      logger.info(`Template applied: ${templateId}`);
      return content;
    } catch (error) {
      logger.error(`Error applying template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update template
   * @param {string} templateId - Template ID
   * @param {string} userId - User ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated template
   */
  async updateTemplate(templateId, userId, updates) {
    try {
      const template = await MessageTemplate.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      if (template.userId !== userId) {
        throw new Error('Not authorized to update this template');
      }

      const allowedFields = ['name', 'content', 'category', 'tags', 'variables'];
      for (const field of allowedFields) {
        if (field in updates) {
          template[field] = updates[field];
        }
      }

      template.updatedAt = new Date();
      await template.save();

      this.invalidateCache(userId);
      logger.info(`Template updated: ${templateId}`);
      return template;
    } catch (error) {
      logger.error(`Error updating template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete template
   * @param {string} templateId - Template ID
   * @param {string} userId - User ID
   * @returns {boolean} Success
   */
  async deleteTemplate(templateId, userId) {
    try {
      const template = await MessageTemplate.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      if (template.userId !== userId) {
        throw new Error('Not authorized to delete this template');
      }

      await MessageTemplate.deleteOne({ _id: templateId });
      this.invalidateCache(userId);

      logger.info(`Template deleted: ${templateId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get popular templates
   * @param {string} userId - User ID
   * @param {Object} options - Filtering options
   * @returns {Array} Popular templates
   */
  async getPopularTemplates(userId, options = {}) {
    try {
      const { limit = 10 } = options;

      const templates = await MessageTemplate.find({ userId })
        .sort({ usageCount: -1 })
        .limit(limit)
        .exec();

      return templates;
    } catch (error) {
      logger.error(`Error getting popular templates: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search templates
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @returns {Array} Matching templates
   */
  async searchTemplates(userId, query) {
    try {
      if (!query || query.length < 2) {
        throw new Error('Search query must be at least 2 characters');
      }

      const templates = await MessageTemplate.find({
        userId,
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { content: { $regex: query, $options: 'i' } },
          { tags: { $regex: query, $options: 'i' } },
        ],
      }).exec();

      return templates;
    } catch (error) {
      logger.error(`Error searching templates: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get template statistics
   * @param {string} userId - User ID
   * @returns {Object} Statistics
   */
  async getTemplateStats(userId) {
    try {
      const total = await MessageTemplate.countDocuments({ userId });

      const byCategory = await MessageTemplate.aggregate([
        { $match: { userId } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]).exec();

      const mostUsed = await MessageTemplate.findOne({ userId })
        .sort({ usageCount: -1 })
        .exec();

      const totalUsage = await MessageTemplate.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: '$usageCount' } } },
      ]).exec();

      return {
        totalTemplates: total,
        byCategory: byCategory.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        mostUsedTemplate: mostUsed?.name || null,
        totalUsageCount: totalUsage[0]?.total || 0,
        averageUsagePerTemplate: total > 0 ? (totalUsage[0]?.total || 0) / total : 0,
      };
    } catch (error) {
      logger.error(`Error getting template stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Duplicate template
   * @param {string} templateId - Template ID
   * @param {string} userId - User ID
   * @returns {Object} Duplicated template
   */
  async duplicateTemplate(templateId, userId) {
    try {
      const original = await this.getTemplate(templateId, userId);

      const duplicate = new MessageTemplate({
        userId,
        name: `${original.name} (Copy)`,
        content: original.content,
        category: original.category,
        tags: original.tags,
        variables: original.variables,
        usageCount: 0,
        lastUsed: null,
      });

      await duplicate.save();
      this.invalidateCache(userId);

      logger.info(`Template duplicated: ${templateId} -> ${duplicate._id}`);
      return duplicate;
    } catch (error) {
      logger.error(`Error duplicating template: ${error.message}`);
      throw error;
    }
  }

  invalidateCache(userId) {
    // Invalidate all cache entries for this user
    for (const key of this.cache.keys()) {
      if (key.startsWith(`templates:${userId}`)) {
        this.cache.delete(key);
      }
    }
  }

  clearCache() {
    this.cache.clear();
    logger.info('Template cache cleared');
  }
}

module.exports = new MessageTemplateService();
