/**
 * Photo Studio API Routes
 * RESTful API endpoints for professional photo editing features
 */

const express = require('express');
const router = express.Router();
const photoStudioController = require('../controllers/photoStudioController');
const { authenticate } = require('../../../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * Project Management Routes
 */

// Create new project
router.post('/projects', photoStudioController.createProject);

// Get user's projects
router.get('/projects', photoStudioController.getUserProjects);

// Get single project
router.get('/projects/:projectId', photoStudioController.getProject);

// Update project
router.put('/projects/:projectId', photoStudioController.updateProject);

// Delete project
router.delete('/projects/:projectId', photoStudioController.deleteProject);

/**
 * Server-Side Image Processing Routes
 */

// AI background removal
router.post('/process/remove-background', photoStudioController.removeBackground);

// Batch image processing
router.post('/process/batch', photoStudioController.batchProcess);

// Get processing job status
router.get('/process/jobs/:jobId', photoStudioController.getJobStatus);

// High-quality image export
router.post('/export', photoStudioController.exportImage);

/**
 * User Preferences Routes
 */

// Get user preferences
router.get('/preferences', photoStudioController.getPreferences);

// Update user preferences
router.put('/preferences', photoStudioController.updatePreferences);

/**
 * Cloud Storage Routes
 */

// Upload image to cloud
router.post('/upload', photoStudioController.uploadImage);

module.exports = router;
