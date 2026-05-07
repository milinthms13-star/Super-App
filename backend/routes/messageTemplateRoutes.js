const express = require('express');
const router = express.Router();
const messageTemplateService = require('../services/messageTemplateService');
const authMiddleware = require('../middleware/authMiddleware');

// Create template
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, content, options } = req.body;
    const userId = req.user.id;

    const template = await messageTemplateService.createTemplate(
      userId,
      name,
      content,
      options
    );

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get user templates
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0, category, sortBy = 'createdAt' } = req.query;

    const templates = await messageTemplateService.getTemplates(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      category,
      sortBy,
    });

    res.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get specific template
router.get('/:templateId', authMiddleware, async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;

    const template = await messageTemplateService.getTemplate(templateId, userId);

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// Apply template
router.post('/:templateId/apply', authMiddleware, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { variables } = req.body;

    const content = await messageTemplateService.applyTemplate(
      templateId,
      variables
    );

    res.json({
      success: true,
      message: 'Template applied',
      data: { content },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update template
router.patch('/:templateId', authMiddleware, async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const template = await messageTemplateService.updateTemplate(
      templateId,
      userId,
      updates
    );

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: template,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete template
router.delete('/:templateId', authMiddleware, async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;

    const result = await messageTemplateService.deleteTemplate(templateId, userId);

    res.json({
      success: true,
      message: 'Template deleted successfully',
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get popular templates
router.get('/popular/list', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const templates = await messageTemplateService.getPopularTemplates(userId, {
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Search templates
router.get('/search/query', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { q } = req.query;

    const templates = await messageTemplateService.searchTemplates(userId, q);

    res.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get template statistics
router.get('/stats/overview', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await messageTemplateService.getTemplateStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Duplicate template
router.post('/:templateId/duplicate', authMiddleware, async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;

    const duplicate = await messageTemplateService.duplicateTemplate(
      templateId,
      userId
    );

    res.status(201).json({
      success: true,
      message: 'Template duplicated successfully',
      data: duplicate,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
