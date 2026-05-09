/**
 * AutomationWorkflowService.js
 * Rule engine, scheduled tasks, workflow orchestration
 */

const logger = require('../config/logger');
const User = require('../models/User');
const Order = require('../models/Order');
const Workflow = require('../models/Workflow');
const WorkflowExecution = require('../models/WorkflowExecution');
const Product = require('../models/Product');

class AutomationWorkflowService {
  /**
   * Create automation rule
   */
  static async createRule(userId, name, trigger, actions) {
    try {
      // Validate trigger and actions
      const validTriggers = ['order-created', 'payment-received', 'low-stock', 'review-submitted'];
      const validActions = ['send-email', 'send-sms', 'apply-discount', 'update-inventory', 'create-task'];

      if (!validTriggers.includes(trigger)) throw new Error('Invalid trigger');
      if (!Array.isArray(actions) || !actions.every(a => validActions.includes(a))) {
        throw new Error('Invalid actions');
      }

      const workflow = await Workflow.create({
        userId,
        name,
        trigger,
        actions,
        isActive: true
      });

      logger.info(`Rule created: ${workflow._id}`);
      return { success: true, workflow };
    } catch (error) {
      logger.error(`Create rule error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute workflow
   */
  static async executeWorkflow(workflowId, triggerData) {
    try {
      const workflow = await Workflow.findById(workflowId);
      if (!workflow || !workflow.isActive) throw new Error('Workflow not found or inactive');

      const execution = await WorkflowExecution.create({
        workflowId,
        triggerData,
        status: 'running',
        startTime: new Date()
      });

      // Execute actions
      for (const action of workflow.actions) {
        try {
          await this._executeAction(action, triggerData);
          execution.executedActions.push({ action, status: 'success' });
        } catch (e) {
          execution.executedActions.push({ action, status: 'failed', error: e.message });
        }
      }

      execution.status = 'completed';
      execution.endTime = new Date();
      await execution.save();

      logger.info(`Workflow executed: ${workflowId}`);
      return { success: true, execution };
    } catch (error) {
      logger.error(`Execute workflow error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Internal: Execute individual action
   */
  static async _executeAction(action, data) {
    if (action === 'send-email') {
      // Mock email sending
      logger.info(`Email sent: ${data.email}`);
    } else if (action === 'send-sms') {
      logger.info(`SMS sent: ${data.phone}`);
    } else if (action === 'apply-discount') {
      // Apply discount to order
      await Order.findByIdAndUpdate(data.orderId, { discountApplied: true });
    } else if (action === 'update-inventory') {
      // Update product inventory
      await Product.findByIdAndUpdate(data.productId, { $inc: { stock: data.quantity } });
    }
  }

  /**
   * Schedule task (cron-like)
   */
  static async scheduleTask(userId, name, taskType, schedule, params = {}) {
    try {
      const workflow = await Workflow.create({
        userId,
        name,
        type: 'scheduled',
        taskType,
        schedule, // cron expression: '0 0 * * *' = daily at midnight
        params,
        isActive: true
      });

      logger.info(`Task scheduled: ${workflow._id}`);
      return { success: true, workflow };
    } catch (error) {
      logger.error(`Schedule task error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's workflows
   */
  static async getUserWorkflows(userId) {
    try {
      const workflows = await Workflow.find({ userId });
      return { success: true, workflows, count: workflows.length };
    } catch (error) {
      logger.error(`Get workflows error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update workflow
   */
  static async updateWorkflow(workflowId, updates) {
    try {
      const workflow = await Workflow.findByIdAndUpdate(
        workflowId,
        { ...updates, updatedAt: new Date() },
        { new: true }
      );

      logger.info(`Workflow updated: ${workflowId}`);
      return { success: true, workflow };
    } catch (error) {
      logger.error(`Update workflow error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deactivate workflow
   */
  static async deactivateWorkflow(workflowId) {
    try {
      const workflow = await Workflow.findByIdAndUpdate(
        workflowId,
        { isActive: false },
        { new: true }
      );

      logger.info(`Workflow deactivated: ${workflowId}`);
      return { success: true, workflow };
    } catch (error) {
      logger.error(`Deactivate workflow error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get workflow execution history
   */
  static async getWorkflowExecutionHistory(workflowId, limit = 50) {
    try {
      const executions = await WorkflowExecution.find({ workflowId })
        .sort({ startTime: -1 })
        .limit(limit);

      const stats = {
        total: executions.length,
        successful: executions.filter(e => e.status === 'completed').length,
        failed: executions.filter(e => e.status === 'failed').length
      };

      return { success: true, executions, stats };
    } catch (error) {
      logger.error(`Get execution history error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Conditional workflow (if-then-else)
   */
  static async createConditionalWorkflow(userId, name, condition, thenActions, elseActions = []) {
    try {
      const workflow = await Workflow.create({
        userId,
        name,
        type: 'conditional',
        condition,
        thenActions,
        elseActions,
        isActive: true
      });

      logger.info(`Conditional workflow created: ${workflow._id}`);
      return { success: true, workflow };
    } catch (error) {
      logger.error(`Create conditional workflow error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Evaluate workflow condition
   */
  static async evaluateCondition(condition, data) {
    try {
      // Simple condition evaluator
      // condition format: { field: 'totalAmount', operator: 'gte', value: 1000 }
      const { field, operator, value } = condition;
      const fieldValue = data[field];

      let result = false;
      if (operator === 'gte') result = fieldValue >= value;
      if (operator === 'lte') result = fieldValue <= value;
      if (operator === 'eq') result = fieldValue === value;
      if (operator === 'contains') result = String(fieldValue).includes(String(value));

      return { success: true, condition, data: { [field]: fieldValue }, result };
    } catch (error) {
      logger.error(`Evaluate condition error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Bulk workflow application
   */
  static async applyWorkflowToBulkOrders(workflowId, orderIds) {
    try {
      const workflow = await Workflow.findById(workflowId);
      if (!workflow) throw new Error('Workflow not found');

      let applied = 0;
      for (const orderId of orderIds) {
        try {
          const order = await Order.findById(orderId);
          await this.executeWorkflow(workflowId, order.toObject());
          applied++;
        } catch (e) {
          logger.error(`Error applying to order ${orderId}: ${e.message}`);
        }
      }

      logger.info(`Workflow applied to ${applied} orders`);
      return { success: true, appliedCount: applied, totalCount: orderIds.length };
    } catch (error) {
      logger.error(`Bulk apply error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get workflow templates
   */
  static async getWorkflowTemplates() {
    try {
      const templates = [
        {
          id: 'template-1',
          name: 'Auto-confirm high-value orders',
          trigger: 'order-created',
          condition: { field: 'totalAmount', operator: 'gte', value: 5000 },
          actions: ['send-email', 'update-status']
        },
        {
          id: 'template-2',
          name: 'Low stock alert',
          trigger: 'low-stock',
          actions: ['send-sms', 'create-task']
        },
        {
          id: 'template-3',
          name: 'Review promotion',
          trigger: 'review-submitted',
          actions: ['apply-discount']
        }
      ];

      return { success: true, templates };
    } catch (error) {
      logger.error(`Get templates error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = AutomationWorkflowService;
