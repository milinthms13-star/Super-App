/**
 * Template Library Service
 * Manage pre-built template library and installation
 */

const ReminderTemplate = require('../models/ReminderTemplate');
const logger = require('../utils/logger');

class TemplateLibraryService {
  // Pre-built templates catalog
  static LIBRARY_TEMPLATES = [
    {
      id: 'lib-work-deadline',
      name: 'Work Deadline Alert',
      category: 'work',
      tags: ['deadline', 'professional', 'urgent'],
      description: 'Professional deadline reminder for work tasks',
      emailTemplate: {
        subject: '⏰ Reminder: {title} due {dueDate}',
        htmlContent: `<h2 style="color: #d62828;">{title}</h2>
<p>This is a reminder that <strong>{title}</strong> is due on <strong>{dueDate}</strong> at <strong>{dueTime}</strong>.</p>
<p><em>{description}</em></p>
<p style="color: #555; font-size: 0.9em;">Category: {category} | Priority: {priority}</p>`,
        textContent: '{title} due {dueDate} at {dueTime}. {description}'
      },
      smsTemplate: {
        content: '⏰ {title} due {dueDate} at {dueTime}. {category}'
      },
      whatsappTemplate: {
        content: '📝 *Work Reminder*\n\n{title}\n⏰ Due: {dueDate} at {dueTime}\n📋 {description}\n🏷️ {category}'
      },
      telegramTemplate: {
        content: '*📝 Work Deadline*\n\n*{title}*\n⏰ Due: {dueDate} at {dueTime}\n📋 {description}'
      },
      pushTemplate: {
        title: '⏰ {title}',
        body: 'Due {dueDate} at {dueTime}'
      }
    },
    {
      id: 'lib-personal-task',
      name: 'Personal Task Reminder',
      category: 'personal',
      tags: ['personal', 'casual', 'task'],
      description: 'Friendly personal task reminder',
      emailTemplate: {
        subject: '🎯 Don\'t forget: {title}',
        htmlContent: `<h2>🎯 {title}</h2>
<p>Just a friendly reminder about <strong>{title}</strong>.</p>
<p>It\'s due on <strong>{dueDate}</strong> at <strong>{dueTime}</strong>.</p>
<p>{description}</p>`,
        textContent: 'Reminder: {title} due {dueDate} at {dueTime}. {description}'
      },
      smsTemplate: {
        content: '🎯 {title} due {dueDate} at {dueTime}'
      },
      whatsappTemplate: {
        content: '🎯 *{title}*\n\n⏰ Due: {dueDate} at {dueTime}\n📝 {description}'
      },
      telegramTemplate: {
        content: '*🎯 {title}*\n\nDue: {dueDate} at {dueTime}\n{description}'
      },
      pushTemplate: {
        title: '🎯 {title}',
        body: 'Due {dueDate}'
      }
    },
    {
      id: 'lib-appointment',
      name: 'Appointment Reminder',
      category: 'appointments',
      tags: ['appointment', 'scheduling', 'professional'],
      description: 'Doctor, meeting, or appointment reminder',
      emailTemplate: {
        subject: '📅 Appointment Reminder: {title}',
        htmlContent: `<h2>📅 Appointment Reminder</h2>
<p><strong>{title}</strong></p>
<p>📅 Date: {dueDate}</p>
<p>⏰ Time: {dueTime}</p>
<p>📝 {description}</p>
<p style="color: #666;">Please arrive 5-10 minutes early.</p>`,
        textContent: 'Appointment: {title} on {dueDate} at {dueTime}. {description}'
      },
      smsTemplate: {
        content: '📅 {title} on {dueDate} at {dueTime}'
      },
      whatsappTemplate: {
        content: '📅 *Appointment Reminder*\n\n{title}\n📅 {dueDate}\n⏰ {dueTime}\n📍 {description}'
      },
      telegramTemplate: {
        content: '*📅 Appointment*\n\n{title}\n📅 {dueDate}\n⏰ {dueTime}'
      },
      pushTemplate: {
        title: '📅 {title}',
        body: '{dueDate} at {dueTime}'
      }
    },
    {
      id: 'lib-bill-payment',
      name: 'Bill Payment Reminder',
      category: 'financial',
      tags: ['payment', 'urgent', 'financial'],
      description: 'Important bill or payment due notice',
      emailTemplate: {
        subject: '💳 Bill Payment Due: {title}',
        htmlContent: `<h2 style="color: #d62828;">💳 Payment Due</h2>
<p><strong>{title}</strong></p>
<p style="color: #d62828; font-weight: bold;">Due: {dueDate} at {dueTime}</p>
<p>{description}</p>
<p style="color: #666;">Please ensure timely payment to avoid late fees.</p>`,
        textContent: 'Bill: {title} due {dueDate} at {dueTime}. {description}'
      },
      smsTemplate: {
        content: '💳 {title} due {dueDate}. Please pay on time.'
      },
      whatsappTemplate: {
        content: '💳 *Payment Due*\n\n{title}\n⏰ Due: {dueDate} at {dueTime}\n📌 {description}'
      },
      telegramTemplate: {
        content: '*💳 Payment Due*\n\n{title}\nDue: {dueDate}\n{description}'
      },
      pushTemplate: {
        title: '💳 Payment Due',
        body: '{title} due {dueDate}'
      }
    },
    {
      id: 'lib-birthday',
      name: 'Birthday Reminder',
      category: 'personal',
      tags: ['birthday', 'personal', 'celebration'],
      description: 'Birthday or anniversary reminder',
      emailTemplate: {
        subject: '🎉 Birthday Coming Up: {title}',
        htmlContent: `<h2>🎉 Birthday Reminder</h2>
<p>Don't forget about <strong>{title}</strong>!</p>
<p>📅 Date: {dueDate}</p>
<p>It's time to prepare a gift or send a greeting!</p>`,
        textContent: 'Birthday reminder: {title} on {dueDate}'
      },
      smsTemplate: {
        content: '🎉 {title} coming up on {dueDate}!'
      },
      whatsappTemplate: {
        content: '🎉 *Birthday Reminder*\n\n{title}\n📅 {dueDate}\n\nDon\'t forget! 🎁'
      },
      telegramTemplate: {
        content: '*🎉 Birthday Coming!*\n\n{title}\n📅 {dueDate}\n\n🎁 Time to prepare!'
      },
      pushTemplate: {
        title: '🎉 {title}',
        body: 'Birthday on {dueDate}'
      }
    },
    {
      id: 'lib-urgent-alert',
      name: 'Urgent Alert',
      category: 'urgent',
      tags: ['urgent', 'high-priority', 'alert'],
      description: 'High priority urgent alert',
      emailTemplate: {
        subject: '🚨 URGENT: {title}',
        htmlContent: `<h2 style="color: #d62828; background: #ffe0e0; padding: 10px;">🚨 URGENT ACTION REQUIRED</h2>
<p><strong style="color: #d62828;">{title}</strong></p>
<p><strong>IMMEDIATE ACTION NEEDED!</strong></p>
<p>{description}</p>
<p style="color: #d62828;">Due: {dueTime} today</p>`,
        textContent: 'URGENT: {title} - Requires immediate action! {description}'
      },
      smsTemplate: {
        content: '🚨 URGENT: {title} - Action needed NOW!'
      },
      whatsappTemplate: {
        content: '🚨 *URGENT ALERT* 🚨\n\n{title}\n⚠️ ACTION REQUIRED\n⏰ NOW: {dueTime}\n\n{description}'
      },
      telegramTemplate: {
        content: '*🚨 URGENT ALERT 🚨*\n\n*{title}*\n⚠️ IMMEDIATE ACTION NEEDED\n{description}'
      },
      pushTemplate: {
        title: '🚨 URGENT: {title}',
        body: 'Action needed immediately!'
      }
    }
  ];

  /**
   * Get all templates in library
   */
  async getLibraryTemplates() {
    try {
      return TemplateLibraryService.LIBRARY_TEMPLATES.map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        description: t.description,
        tags: t.tags
      }));
    } catch (error) {
      logger.error('Error getting library templates:', error);
      throw error;
    }
  }

  /**
   * Get library template by ID
   */
  async getLibraryTemplate(templateId) {
    try {
      const template = TemplateLibraryService.LIBRARY_TEMPLATES.find(t => t.id === templateId);
      if (!template) {
        throw new Error('Template not found in library');
      }
      return template;
    } catch (error) {
      logger.error('Error getting library template:', error);
      throw error;
    }
  }

  /**
   * Search library templates
   */
  async searchLibrary(query, category = null, tags = []) {
    try {
      let results = TemplateLibraryService.LIBRARY_TEMPLATES;

      if (query) {
        const lowerQuery = query.toLowerCase();
        results = results.filter(t =>
          t.name.toLowerCase().includes(lowerQuery) ||
          t.description.toLowerCase().includes(lowerQuery)
        );
      }

      if (category) {
        results = results.filter(t => t.category === category);
      }

      if (tags.length > 0) {
        results = results.filter(t =>
          tags.some(tag => t.tags.includes(tag))
        );
      }

      return results.map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        description: t.description,
        tags: t.tags
      }));
    } catch (error) {
      logger.error('Error searching library:', error);
      throw error;
    }
  }

  /**
   * Install library template to user's templates
   * @param {String} userId
   * @param {String} libraryTemplateId
   * @param {String} customName - Optional custom name
   */
  async installTemplate(userId, libraryTemplateId, customName = null) {
    try {
      const libraryTemplate = TemplateLibraryService.LIBRARY_TEMPLATES.find(
        t => t.id === libraryTemplateId
      );

      if (!libraryTemplate) {
        throw new Error('Template not found in library');
      }

      // Check if already installed
      const existing = await ReminderTemplate.findOne({
        userId,
        name: customName || libraryTemplate.name
      });

      if (existing) {
        throw new Error('Template with this name already installed');
      }

      // Create user's copy
      const userTemplate = new ReminderTemplate({
        userId,
        name: customName || libraryTemplate.name,
        description: libraryTemplate.description,
        isDefault: false,
        emailTemplate: libraryTemplate.emailTemplate,
        smsTemplate: libraryTemplate.smsTemplate,
        whatsappTemplate: libraryTemplate.whatsappTemplate,
        telegramTemplate: libraryTemplate.telegramTemplate,
        pushTemplate: libraryTemplate.pushTemplate,
        usageCount: 0,
        lastUsed: null
      });

      await userTemplate.save();

      logger.info(`User ${userId} installed library template: ${libraryTemplateId}`);

      return {
        success: true,
        templateId: userTemplate._id,
        templateName: userTemplate.name,
        source: 'library'
      };
    } catch (error) {
      logger.error('Error installing template:', error);
      throw error;
    }
  }

  /**
   * Batch install multiple library templates
   */
  async batchInstall(userId, templateIds) {
    try {
      const results = [];

      for (const templateId of templateIds) {
        try {
          const result = await this.installTemplate(userId, templateId);
          results.push({
            libraryTemplateId: templateId,
            success: true,
            userTemplateId: result.templateId
          });
        } catch (error) {
          results.push({
            libraryTemplateId: templateId,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      return {
        success: true,
        installed: successCount,
        total: templateIds.length,
        results
      };
    } catch (error) {
      logger.error('Error in batch install:', error);
      throw error;
    }
  }

  /**
   * Get categories of library templates
   */
  async getLibraryCategories() {
    try {
      const categories = [...new Set(TemplateLibraryService.LIBRARY_TEMPLATES.map(t => t.category))];
      return categories;
    } catch (error) {
      logger.error('Error getting categories:', error);
      throw error;
    }
  }

  /**
   * Get popular tags in library
   */
  async getLibraryTags() {
    try {
      const tags = {};
      TemplateLibraryService.LIBRARY_TEMPLATES.forEach(template => {
        template.tags.forEach(tag => {
          tags[tag] = (tags[tag] || 0) + 1;
        });
      });

      return Object.entries(tags)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      logger.error('Error getting tags:', error);
      throw error;
    }
  }
}

module.exports = new TemplateLibraryService();
