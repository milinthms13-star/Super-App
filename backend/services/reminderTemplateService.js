const ReminderTemplate = require('../models/ReminderTemplate');
const logger = require('../utils/logger');

/**
 * Create a new reminder template
 */
async function createTemplate(userId, templateData) {
  try {
    const {
      name,
      description,
      isDefault,
      emailTemplate,
      smsTemplate,
      whatsappTemplate,
      telegramTemplate,
      pushTemplate
    } = templateData;

    // If setting as default, unset other defaults
    if (isDefault) {
      await ReminderTemplate.updateMany(
        { userId, isDefault: true },
        { isDefault: false }
      );
    }

    const template = new ReminderTemplate({
      userId,
      name,
      description,
      isDefault,
      emailTemplate: emailTemplate || {
        subject: 'Reminder: {title}',
        htmlContent: '<h2>{title}</h2><p>{description}</p><p>Due: {dueDate}</p>'
      },
      smsTemplate: smsTemplate || {
        content: 'Reminder: {title} - Due at {dueTime}'
      },
      whatsappTemplate: whatsappTemplate || {
        content: '*{title}*\n\n{description}\n\nDue: {dueDate}'
      },
      telegramTemplate: telegramTemplate || {
        content: '*{title}*\n\n{description}\n\n⏰ Due: {dueDate}'
      },
      pushTemplate: pushTemplate || {
        title: '⏰ {title}',
        body: '{description} - Due: {dueTime}'
      }
    });

    await template.save();
    logger.info(`Template created: ${template._id}`);

    return template;
  } catch (error) {
    logger.error('Error creating template:', error);
    throw error;
  }
}

/**
 * Get all templates for a user
 */
async function getUserTemplates(userId) {
  try {
    const templates = await ReminderTemplate.find({ userId })
      .select('_id name description isDefault usageCount lastUsed createdAt')
      .sort({ isDefault: -1, createdAt: -1 });

    return templates;
  } catch (error) {
    logger.error('Error fetching user templates:', error);
    throw error;
  }
}

/**
 * Get a specific template
 */
async function getTemplate(templateId, userId) {
  try {
    const template = await ReminderTemplate.findOne({ _id: templateId, userId });

    if (!template) {
      throw new Error('Template not found');
    }

    return template;
  } catch (error) {
    logger.error('Error fetching template:', error);
    throw error;
  }
}

/**
 * Get default template for user
 */
async function getDefaultTemplate(userId) {
  try {
    let template = await ReminderTemplate.findOne({ userId, isDefault: true });

    // If no default, create one
    if (!template) {
      template = await createTemplate(userId, {
        name: 'Default Template',
        description: 'Built-in default template',
        isDefault: true
      });
    }

    return template;
  } catch (error) {
    logger.error('Error fetching default template:', error);
    throw error;
  }
}

/**
 * Update a template
 */
async function updateTemplate(templateId, userId, updateData) {
  try {
    const template = await ReminderTemplate.findOne({ _id: templateId, userId });

    if (!template) {
      throw new Error('Template not found');
    }

    // If setting as default, unset others
    if (updateData.isDefault && !template.isDefault) {
      await ReminderTemplate.updateMany(
        { userId, _id: { $ne: templateId }, isDefault: true },
        { isDefault: false }
      );
    }

    // Update allowed fields
    Object.assign(template, {
      name: updateData.name || template.name,
      description: updateData.description || template.description,
      isDefault: updateData.isDefault !== undefined ? updateData.isDefault : template.isDefault,
      emailTemplate: updateData.emailTemplate || template.emailTemplate,
      smsTemplate: updateData.smsTemplate || template.smsTemplate,
      whatsappTemplate: updateData.whatsappTemplate || template.whatsappTemplate,
      telegramTemplate: updateData.telegramTemplate || template.telegramTemplate,
      pushTemplate: updateData.pushTemplate || template.pushTemplate,
      updatedAt: new Date()
    });

    await template.save();
    logger.info(`Template updated: ${templateId}`);

    return template;
  } catch (error) {
    logger.error('Error updating template:', error);
    throw error;
  }
}

/**
 * Delete a template
 */
async function deleteTemplate(templateId, userId) {
  try {
    const template = await ReminderTemplate.findOne({ _id: templateId, userId });

    if (!template) {
      throw new Error('Template not found');
    }

    // Don't allow deleting if it's the only template or if it's default
    const count = await ReminderTemplate.countDocuments({ userId });
    if (count === 1 || template.isDefault) {
      throw new Error('Cannot delete the default template or only template');
    }

    await ReminderTemplate.deleteOne({ _id: templateId });
    logger.info(`Template deleted: ${templateId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error deleting template:', error);
    throw error;
  }
}

/**
 * Render template with reminder data
 */
async function renderTemplate(templateId, userId, reminderData) {
  try {
    let template = await getTemplate(templateId, userId);

    if (!template) {
      template = await getDefaultTemplate(userId);
    }

    const rendered = template.render(reminderData);

    // Record usage
    template.usageCount += 1;
    template.lastUsed = new Date();
    await template.save();

    return rendered;
  } catch (error) {
    logger.error('Error rendering template:', error);
    throw error;
  }
}

/**
 * Validate template variables
 */function validateTemplateVariables(templateContent) {
  try {
    const variables = [
      'title',
      'description',
      'dueDate',
      'dueTime',
      'category',
      'priority',
      'dayOfWeek'
    ];

    const usedVariables = [];
    const regex = /{(\w+)}/g;
    let match;

    while ((match = regex.exec(templateContent)) !== null) {
      if (!variables.includes(match[1])) {
        return {
          valid: false,
          error: `Unknown variable: {${match[1]}}`,
          availableVariables: variables
        };
      }
      usedVariables.push(match[1]);
    }

    return {
      valid: true,
      usedVariables: [...new Set(usedVariables)]
    };
  } catch (error) {
    logger.error('Error validating template:', error);
    throw error;
  }
}

/**
 * Get template statistics
 */
async function getTemplateStats(userId) {
  try {
    const templates = await ReminderTemplate.find({ userId })
      .select('name usageCount lastUsed isDefault createdAt');

    return templates.map(t => ({
      id: t._id,
      name: t.name,
      usageCount: t.usageCount,
      lastUsed: t.lastUsed,
      isDefault: t.isDefault,
      createdAt: t.createdAt
    }));
  } catch (error) {
    logger.error('Error fetching template stats:', error);
    throw error;
  }
}

/**
 * Clone a template
 */
async function cloneTemplate(templateId, userId, newName) {
  try {
    const original = await getTemplate(templateId, userId);

    const clone = new ReminderTemplate({
      userId,
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      isDefault: false,
      emailTemplate: { ...original.emailTemplate },
      smsTemplate: { ...original.smsTemplate },
      whatsappTemplate: { ...original.whatsappTemplate },
      telegramTemplate: { ...original.telegramTemplate },
      pushTemplate: { ...original.pushTemplate }
    });

    await clone.save();
    logger.info(`Template cloned: ${templateId} -> ${clone._id}`);

    return clone;
  } catch (error) {
    logger.error('Error cloning template:', error);
    throw error;
  }
}

module.exports = {
  createTemplate,
  getUserTemplates,
  getTemplate,
  getDefaultTemplate,
  updateTemplate,
  deleteTemplate,
  renderTemplate,
  validateTemplateVariables,
  getTemplateStats,
  cloneTemplate
};
