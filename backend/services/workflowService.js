const logger = require('../utils/logger');
const FinanceLead = require('../models/FinanceLead');
const User = require('../models/User');
const notificationService = require('./notificationService');

class WorkflowService {
  /**
   * Intelligent lead assignment - Round robin with load balancing
   */
  async assignLeadToConsultant(leadId, strategy = 'round-robin') {
    try {
      const lead = await FinanceLead.findOne({ leadId });
      if (!lead) {
        throw new Error('Lead not found');
      }

      // Get available consultants
      const consultants = await User.find({
        role: 'consultant',
        isActive: true,
      }).lean();

      if (consultants.length === 0) {
        logger.warn('No consultants available for assignment');
        return {
          success: false,
          reason: 'no-consultants-available',
        };
      }

      let selectedConsultant;

      switch (strategy) {
        case 'round-robin':
          selectedConsultant = await this.roundRobinAssignment(consultants);
          break;

        case 'load-balanced':
          selectedConsultant = await this.loadBalancedAssignment(consultants);
          break;

        case 'skill-based':
          selectedConsultant = await this.skillBasedAssignment(
            consultants,
            lead.loanCategory,
            lead.eligibilitySnapshot?.state
          );
          break;

        case 'geographic':
          selectedConsultant = await this.geographicAssignment(
            consultants,
            lead.eligibilitySnapshot?.state
          );
          break;

        default:
          selectedConsultant = await this.roundRobinAssignment(consultants);
      }

      if (!selectedConsultant) {
        throw new Error('Could not select a consultant');
      }

      // Assign consultant to lead
      lead.consultant = selectedConsultant._id;
      lead.statusTimeline.push({
        status: 'consultant-assigned',
        timestamp: new Date(),
        note: `Assigned to ${selectedConsultant.name}`,
      });
      await lead.save();

      logger.info(`Lead ${leadId} assigned to consultant ${selectedConsultant.name}`);

      // Send notification
      await notificationService.notifyConsultantAssigned(
        {
          ...lead.toObject(),
          consultant: selectedConsultant,
        },
        '' // User email would be fetched separately
      );

      return {
        success: true,
        consultant: {
          id: selectedConsultant._id,
          name: selectedConsultant.name,
          email: selectedConsultant.email,
          phone: selectedConsultant.phone,
        },
      };
    } catch (error) {
      logger.error(`Lead assignment error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Round-robin assignment
   */
  async roundRobinAssignment(consultants) {
    // Get assignment counts for each consultant
    const counts = await Promise.all(
      consultants.map(async (consultant) => {
        const count = await FinanceLead.countDocuments({
          consultant: consultant._id,
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
        });
        return { consultant, count };
      })
    );

    // Sort by count (ascending) and return consultant with least assignments
    counts.sort((a, b) => a.count - b.count);
    return counts[0].consultant;
  }

  /**
   * Load-balanced assignment (considers active leads)
   */
  async loadBalancedAssignment(consultants) {
    const activeStatuses = ['submitted', 'under-review', 'documents-requested', 'institution-review'];

    const loads = await Promise.all(
      consultants.map(async (consultant) => {
        const activeCount = await FinanceLead.countDocuments({
          consultant: consultant._id,
          status: { $in: activeStatuses },
        });
        return { consultant, activeCount };
      })
    );

    // Sort by active count (ascending)
    loads.sort((a, b) => a.activeCount - b.activeCount);
    return loads[0].consultant;
  }

  /**
   * Skill-based assignment (based on loan category expertise)
   */
  async skillBasedAssignment(consultants, loanCategory, state) {
    // Filter consultants by expertise (if profile has expertise field)
    const expertConsultants = consultants.filter((c) => {
      return (
        !c.expertise ||
        c.expertise.loanCategories?.includes(loanCategory) ||
        c.expertise.states?.includes(state)
      );
    });

    const pool = expertConsultants.length > 0 ? expertConsultants : consultants;
    return this.loadBalancedAssignment(pool);
  }

  /**
   * Geographic assignment (based on state)
   */
  async geographicAssignment(consultants, state) {
    if (!state) {
      return this.loadBalancedAssignment(consultants);
    }

    // Filter consultants by state (if profile has preferredStates)
    const localConsultants = consultants.filter((c) => {
      return !c.preferredStates || c.preferredStates.includes(state);
    });

    const pool = localConsultants.length > 0 ? localConsultants : consultants;
    return this.loadBalancedAssignment(pool);
  }

  /**
   * Auto-assign leads in bulk
   */
  async autoAssignUnassignedLeads(limit = 50) {
    try {
      const unassignedLeads = await FinanceLead.find({
        consultant: null,
        status: { $in: ['submitted', 'under-review'] },
      })
        .sort({ createdAt: 1 })
        .limit(limit);

      const results = [];

      for (const lead of unassignedLeads) {
        const result = await this.assignLeadToConsultant(lead.leadId, 'load-balanced');
        results.push({
          leadId: lead.leadId,
          ...result,
        });
      }

      return {
        success: true,
        assigned: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      };
    } catch (error) {
      logger.error(`Auto-assign error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send automated follow-up reminders
   */
  async sendFollowUpReminders() {
    try {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      // Find leads that need follow-up
      const leadsNeedingFollowup = await FinanceLead.find({
        status: { $in: ['documents-requested', 'under-review'] },
        updatedAt: { $lt: threeDaysAgo },
        'followupReminders.lastSent': {
          $not: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      })
        .populate('consultant', 'name email phone')
        .limit(100);

      const results = [];

      for (const lead of leadsNeedingFollowup) {
        // Send reminder to user
        if (lead.status === 'documents-requested') {
          const pendingDocs = this.getPendingDocuments(lead);
          await notificationService.notifyDocumentsPending(lead, pendingDocs, '');
        }

        // Update reminder tracking
        if (!lead.followupReminders) {
          lead.followupReminders = {};
        }
        lead.followupReminders.lastSent = new Date();
        lead.followupReminders.count = (lead.followupReminders.count || 0) + 1;
        await lead.save();

        results.push({
          leadId: lead.leadId,
          reminderSent: true,
        });

        logger.info(`Follow-up reminder sent for lead ${lead.leadId}`);
      }

      return {
        success: true,
        remindersSent: results.length,
      };
    } catch (error) {
      logger.error(`Follow-up reminder error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check and escalate SLA breaches
   */
  async checkAndEscalateSLABreaches() {
    try {
      const now = new Date();

      // Define SLA thresholds (in hours)
      const SLA_THRESHOLDS = {
        submitted: 24, // Must be reviewed within 24 hours
        'under-review': 48, // Must progress within 48 hours
        'documents-requested': 72, // Documents must be collected within 72 hours
        'institution-review': 96, // Institution must respond within 96 hours
      };

      const breaches = [];

      for (const [status, hours] of Object.entries(SLA_THRESHOLDS)) {
        const threshold = new Date(now.getTime() - hours * 60 * 60 * 1000);

        const overdueLeads = await FinanceLead.find({
          status,
          updatedAt: { $lt: threshold },
          'slaTracking.escalated': { $ne: true },
        })
          .populate('consultant', 'name email')
          .lean();

        for (const lead of overdueLeads) {
          breaches.push({
            leadId: lead.leadId,
            status,
            hoursSinceLast: Math.round((now - new Date(lead.updatedAt)) / (1000 * 60 * 60)),
            slaThreshold: hours,
            consultant: lead.consultant,
          });

          // Mark as escalated
          await FinanceLead.updateOne(
            { leadId: lead.leadId },
            {
              $set: {
                'slaTracking.escalated': true,
                'slaTracking.escalatedAt': now,
              },
            }
          );

          // Send escalation notification to consultant
          if (lead.consultant?.email) {
            await notificationService.notifySLAAlert(lead.consultant.email, {
              overdueCount: 1,
              dueSoonCount: 0,
              withoutSlaCount: 0,
            });
          }
        }
      }

      logger.info(`SLA check complete. ${breaches.length} breaches found and escalated.`);

      return {
        success: true,
        breachesFound: breaches.length,
        breaches,
      };
    } catch (error) {
      logger.error(`SLA escalation error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get pending documents for a lead
   */
  getPendingDocuments(lead) {
    const required = ['aadhaar', 'pan'];
    if (lead.loanCategory === 'business') {
      required.push('businessProof', 'gstCertificate');
    } else if (['home', 'vehicle'].includes(lead.loanCategory)) {
      required.push('salarySlips', 'bankStatements');
    } else {
      required.push('salarySlips');
    }

    const pending = [];
    required.forEach((docType) => {
      const docs = lead.documents?.[docType] || [];
      if (docs.length === 0) {
        pending.push(docType);
      }
    });

    return pending;
  }

  /**
   * Auto-progress leads based on rules
   */
  async autoProgressLeads() {
    try {
      const results = [];

      // Rule 1: Auto-progress submitted leads to under-review if all documents uploaded
      const submittedLeads = await FinanceLead.find({
        status: 'submitted',
      }).limit(50);

      for (const lead of submittedLeads) {
        const pendingDocs = this.getPendingDocuments(lead);
        if (pendingDocs.length === 0) {
          lead.status = 'under-review';
          lead.statusTimeline.push({
            status: 'under-review',
            timestamp: new Date(),
            note: 'Auto-progressed: All documents uploaded',
          });
          await lead.save();
          results.push({
            leadId: lead.leadId,
            action: 'auto-progressed-to-review',
          });
        }
      }

      return {
        success: true,
        actionsPerformed: results.length,
        results,
      };
    } catch (error) {
      logger.error(`Auto-progress error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new WorkflowService();
