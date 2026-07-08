const logger = require('../utils/logger');
const FinanceCRMActivity = require('../models/FinanceCRMActivity');
const FinanceLead = require('../models/FinanceLead');

class CRMService {
  /**
   * Log a call activity
   */
  async logCall(leadId, userId, callData) {
    try {
      const lead = await FinanceLead.findOne({ leadId });
      if (!lead) {
        throw new Error('Lead not found');
      }

      const activity = new FinanceCRMActivity({
        lead: lead._id,
        activityType: 'call',
        subject: callData.subject || 'Phone Call',
        description: callData.notes || '',
        callDetails: {
          direction: callData.direction || 'outbound',
          duration: callData.duration || 0,
          recording: callData.recordingUrl || '',
          outcome: callData.outcome || 'connected',
        },
        createdBy: userId,
        tags: callData.tags || [],
      });

      await activity.save();

      logger.info(`Call logged for lead ${leadId}`);

      return {
        success: true,
        activityId: activity._id,
      };
    } catch (error) {
      logger.error(`Log call error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Add a note to lead
   */
  async addNote(leadId, userId, noteData) {
    try {
      const lead = await FinanceLead.findOne({ leadId });
      if (!lead) {
        throw new Error('Lead not found');
      }

      const activity = new FinanceCRMActivity({
        lead: lead._id,
        activityType: 'note',
        subject: noteData.subject || 'Note',
        description: noteData.content,
        createdBy: userId,
        tags: noteData.tags || [],
      });

      await activity.save();

      logger.info(`Note added to lead ${leadId}`);

      return {
        success: true,
        activityId: activity._id,
      };
    } catch (error) {
      logger.error(`Add note error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create a task
   */
  async createTask(leadId, userId, taskData) {
    try {
      const lead = await FinanceLead.findOne({ leadId });
      if (!lead) {
        throw new Error('Lead not found');
      }

      const activity = new FinanceCRMActivity({
        lead: lead._id,
        activityType: 'task',
        subject: taskData.title,
        description: taskData.description || '',
        taskDetails: {
          dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
          priority: taskData.priority || 'medium',
          assignedTo: taskData.assignedTo || userId,
          completed: false,
        },
        createdBy: userId,
        tags: taskData.tags || [],
      });

      await activity.save();

      logger.info(`Task created for lead ${leadId}`);

      return {
        success: true,
        taskId: activity._id,
      };
    } catch (error) {
      logger.error(`Create task error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Complete a task
   */
  async completeTask(taskId, userId) {
    try {
      const activity = await FinanceCRMActivity.findById(taskId);
      if (!activity || activity.activityType !== 'task') {
        throw new Error('Task not found');
      }

      activity.taskDetails.completed = true;
      activity.taskDetails.completedAt = new Date();
      await activity.save();

      logger.info(`Task ${taskId} completed`);

      return {
        success: true,
      };
    } catch (error) {
      logger.error(`Complete task error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Schedule a meeting
   */
  async scheduleMeeting(leadId, userId, meetingData) {
    try {
      const lead = await FinanceLead.findOne({ leadId });
      if (!lead) {
        throw new Error('Lead not found');
      }

      const activity = new FinanceCRMActivity({
        lead: lead._id,
        activityType: 'meeting',
        subject: meetingData.title || 'Meeting',
        description: meetingData.agenda || '',
        meetingDetails: {
          scheduledAt: new Date(meetingData.scheduledAt),
          duration: meetingData.duration || 30,
          location: meetingData.location || 'Phone',
          attendees: meetingData.attendees || [],
        },
        createdBy: userId,
        tags: meetingData.tags || [],
      });

      await activity.save();

      logger.info(`Meeting scheduled for lead ${leadId}`);

      return {
        success: true,
        meetingId: activity._id,
      };
    } catch (error) {
      logger.error(`Schedule meeting error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get activity timeline for a lead
   */
  async getLeadTimeline(leadId, filters = {}) {
    try {
      const lead = await FinanceLead.findOne({ leadId });
      if (!lead) {
        throw new Error('Lead not found');
      }

      const query = { lead: lead._id };

      if (filters.activityType) {
        query.activityType = filters.activityType;
      }

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.createdAt.$lte = new Date(filters.endDate);
        }
      }

      const activities = await FinanceCRMActivity.find(query)
        .populate('createdBy', 'name email')
        .populate('taskDetails.assignedTo', 'name email')
        .sort({ createdAt: -1 })
        .limit(filters.limit || 100)
        .lean();

      return {
        success: true,
        activities,
        count: activities.length,
      };
    } catch (error) {
      logger.error(`Get timeline error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get pending tasks for a user
   */
  async getPendingTasks(userId, filters = {}) {
    try {
      const query = {
        activityType: 'task',
        'taskDetails.assignedTo': userId,
        'taskDetails.completed': false,
      };

      if (filters.priority) {
        query['taskDetails.priority'] = filters.priority;
      }

      if (filters.overdue) {
        query['taskDetails.dueDate'] = { $lt: new Date() };
      }

      const tasks = await FinanceCRMActivity.find(query)
        .populate('lead', 'leadId fullName phone loanCategory status')
        .populate('createdBy', 'name email')
        .sort({ 'taskDetails.dueDate': 1 })
        .limit(filters.limit || 50)
        .lean();

      return {
        success: true,
        tasks,
        count: tasks.length,
      };
    } catch (error) {
      logger.error(`Get pending tasks error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get upcoming meetings
   */
  async getUpcomingMeetings(userId, days = 7) {
    try {
      const startDate = new Date();
      const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      const meetings = await FinanceCRMActivity.find({
        activityType: 'meeting',
        createdBy: userId,
        'meetingDetails.scheduledAt': {
          $gte: startDate,
          $lte: endDate,
        },
      })
        .populate('lead', 'leadId fullName phone loanCategory')
        .sort({ 'meetingDetails.scheduledAt': 1 })
        .lean();

      return {
        success: true,
        meetings,
        count: meetings.length,
      };
    } catch (error) {
      logger.error(`Get upcoming meetings error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Add tags to lead
   */
  async addTagsToLead(leadId, userId, tags) {
    try {
      const lead = await FinanceLead.findOne({ leadId });
      if (!lead) {
        throw new Error('Lead not found');
      }

      // Initialize tags array if not exists
      if (!lead.tags) {
        lead.tags = [];
      }

      // Add new tags (avoid duplicates)
      tags.forEach((tag) => {
        if (!lead.tags.includes(tag)) {
          lead.tags.push(tag);
        }
      });

      await lead.save();

      logger.info(`Tags added to lead ${leadId}`);

      return {
        success: true,
        tags: lead.tags,
      };
    } catch (error) {
      logger.error(`Add tags error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Search activities
   */
  async searchActivities(searchText, filters = {}) {
    try {
      const query = {
        $or: [
          { subject: { $regex: searchText, $options: 'i' } },
          { description: { $regex: searchText, $options: 'i' } },
        ],
      };

      if (filters.activityType) {
        query.activityType = filters.activityType;
      }

      if (filters.createdBy) {
        query.createdBy = filters.createdBy;
      }

      const activities = await FinanceCRMActivity.find(query)
        .populate('lead', 'leadId fullName phone')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50)
        .lean();

      return {
        success: true,
        activities,
        count: activities.length,
      };
    } catch (error) {
      logger.error(`Search activities error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get activity summary for consultant
   */
  async getConsultantActivitySummary(userId, days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const activities = await FinanceCRMActivity.find({
        createdBy: userId,
        createdAt: { $gte: startDate },
      }).lean();

      const summary = {
        totalActivities: activities.length,
        byType: {},
        calls: {
          total: 0,
          totalDuration: 0,
          averageDuration: 0,
        },
        tasks: {
          total: 0,
          completed: 0,
          pending: 0,
          overdue: 0,
        },
        meetings: {
          total: 0,
          upcoming: 0,
        },
      };

      activities.forEach((activity) => {
        summary.byType[activity.activityType] =
          (summary.byType[activity.activityType] || 0) + 1;

        if (activity.activityType === 'call' && activity.callDetails) {
          summary.calls.total++;
          summary.calls.totalDuration += activity.callDetails.duration || 0;
        }

        if (activity.activityType === 'task' && activity.taskDetails) {
          summary.tasks.total++;
          if (activity.taskDetails.completed) {
            summary.tasks.completed++;
          } else {
            summary.tasks.pending++;
            if (
              activity.taskDetails.dueDate &&
              new Date(activity.taskDetails.dueDate) < new Date()
            ) {
              summary.tasks.overdue++;
            }
          }
        }

        if (activity.activityType === 'meeting' && activity.meetingDetails) {
          summary.meetings.total++;
          if (
            activity.meetingDetails.scheduledAt &&
            new Date(activity.meetingDetails.scheduledAt) > new Date()
          ) {
            summary.meetings.upcoming++;
          }
        }
      });

      if (summary.calls.total > 0) {
        summary.calls.averageDuration = Math.round(
          summary.calls.totalDuration / summary.calls.total
        );
      }

      return {
        success: true,
        summary,
        period: { days, startDate },
      };
    } catch (error) {
      logger.error(`Get activity summary error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new CRMService();
