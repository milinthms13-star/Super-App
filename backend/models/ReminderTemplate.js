const mongoose = require('mongoose');

const reminderTemplateSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  isDefault: {
    type: Boolean,
    default: false
  },

  // Email template
  emailTemplate: {
    subject: {
      type: String,
      maxlength: 200,
      default: 'Reminder: {title}'
    },
    htmlContent: {
      type: String,
      maxlength: 5000,
      default: '<h2>{title}</h2><p>{description}</p><p>Due: {dueDate}</p>'
    },
    textContent: {
      type: String,
      maxlength: 2000
    }
  },

  // SMS template
  smsTemplate: {
    content: {
      type: String,
      maxlength: 160,
      default: 'Reminder: {title} - Due at {dueTime}'
    }
  },

  // WhatsApp template
  whatsappTemplate: {
    content: {
      type: String,
      maxlength: 1024,
      default: '*{title}*\n\n{description}\n\nDue: {dueDate}'
    }
  },

  // Telegram template
  telegramTemplate: {
    content: {
      type: String,
      maxlength: 4096,
      default: '*{title}*\n\n{description}\n\n⏰ Due: {dueDate}'
    }
  },

  // Push notification template
  pushTemplate: {
    title: {
      type: String,
      maxlength: 100,
      default: '⏰ {title}'
    },
    body: {
      type: String,
      maxlength: 240,
      default: '{description} - Due: {dueTime}'
    }
  },

  // Template variables info
  availableVariables: {
    type: [String],
    enum: ['title', 'description', 'dueDate', 'dueTime', 'category', 'priority', 'dayOfWeek'],
    default: ['title', 'description', 'dueDate', 'dueTime', 'category', 'priority']
  },

  // Usage tracking
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: Date,

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
reminderTemplateSchema.index({ userId: 1, isDefault: 1 });
reminderTemplateSchema.index({ userId: 1, createdAt: -1 });

/**
 * Render template with reminder data
 */
reminderTemplateSchema.methods.render = function(reminderData) {
  const variables = {
    title: reminderData.title || '',
    description: reminderData.description || '',
    dueDate: reminderData.dueDate ? reminderData.dueDate.toLocaleDateString() : '',
    dueTime: reminderData.dueTime || '',
    category: reminderData.category || '',
    priority: reminderData.priority || '',
    dayOfWeek: reminderData.dueDate ? reminderData.dueDate.toLocaleDateString('en-US', { weekday: 'long' }) : ''
  };

  const renderString = (str) => {
    if (!str) return '';
    let result = str;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    return result;
  };

  return {
    email: {
      subject: renderString(this.emailTemplate.subject),
      htmlContent: renderString(this.emailTemplate.htmlContent),
      textContent: renderString(this.emailTemplate.textContent)
    },
    sms: {
      content: renderString(this.smsTemplate.content)
    },
    whatsapp: {
      content: renderString(this.whatsappTemplate.content)
    },
    telegram: {
      content: renderString(this.telegramTemplate.content)
    },
    push: {
      title: renderString(this.pushTemplate.title),
      body: renderString(this.pushTemplate.body)
    }
  };
};

/**
 * Get template statistics
 */
reminderTemplateSchema.methods.getStats = function() {
  return {
    id: this._id,
    name: this.name,
    usageCount: this.usageCount,
    lastUsed: this.lastUsed,
    isDefault: this.isDefault,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('ReminderTemplate', reminderTemplateSchema);
