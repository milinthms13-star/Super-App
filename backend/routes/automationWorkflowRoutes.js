/**
 * automationWorkflowRoutes.js
 * Routes for rule engine, scheduled tasks, workflow orchestration
 */

const express = require('express');
const router = express.Router();
const AutomationWorkflowService = require('../services/AutomationWorkflowService');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// Create rule
router.post('/rules', verifyToken, async (req, res) => {
  try {
    const { name, trigger, actions } = req.body;
    const result = await AutomationWorkflowService.createRule(
      req.user.userId,
      name,
      trigger,
      actions
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get user workflows
router.get('/workflows', verifyToken, async (req, res) => {
  try {
    const result = await AutomationWorkflowService.getUserWorkflows(req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Execute workflow
router.post('/workflows/:workflowId/execute', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await AutomationWorkflowService.executeWorkflow(
      req.params.workflowId,
      req.body.triggerData
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update workflow
router.put('/workflows/:workflowId', verifyToken, async (req, res) => {
  try {
    const result = await AutomationWorkflowService.updateWorkflow(
      req.params.workflowId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Deactivate workflow
router.post('/workflows/:workflowId/deactivate', verifyToken, async (req, res) => {
  try {
    const result = await AutomationWorkflowService.deactivateWorkflow(req.params.workflowId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Schedule task
router.post('/tasks/schedule', verifyToken, async (req, res) => {
  try {
    const { name, taskType, schedule, params } = req.body;
    const result = await AutomationWorkflowService.scheduleTask(
      req.user.userId,
      name,
      taskType,
      schedule,
      params
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get execution history
router.get('/workflows/:workflowId/executions', verifyToken, async (req, res) => {
  try {
    const result = await AutomationWorkflowService.getWorkflowExecutionHistory(
      req.params.workflowId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Create conditional workflow
router.post('/workflows/conditional', verifyToken, async (req, res) => {
  try {
    const { name, condition, thenActions, elseActions } = req.body;
    const result = await AutomationWorkflowService.createConditionalWorkflow(
      req.user.userId,
      name,
      condition,
      thenActions,
      elseActions
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Evaluate condition
router.post('/condition/evaluate', verifyToken, async (req, res) => {
  try {
    const result = await AutomationWorkflowService.evaluateCondition(
      req.body.condition,
      req.body.data
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Apply workflow to bulk orders
router.post('/workflows/:workflowId/apply-bulk', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await AutomationWorkflowService.applyWorkflowToBulkOrders(
      req.params.workflowId,
      req.body.orderIds
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get workflow templates
router.get('/templates', async (req, res) => {
  try {
    const result = await AutomationWorkflowService.getWorkflowTemplates();
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
