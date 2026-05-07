/**
 * =============================================================================
 * SOS ROUTES - PRIORITY 2 EXTENSIONS
 * Video Recording & Contact Group Management
 * =============================================================================
 * Add these routes to backend/routes/sosRoutes.js
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Import Priority 2 controller functions
const {
  uploadVideo,
  getIncidentVideos,
  checkVideoStatus,
  createContactGroup,
  getContactGroups,
  getContactGroup,
  updateContactGroup,
  deleteContactGroup,
  addContactToGroup,
  removeContactFromGroup,
  getGroupStats,
} = require('../controllers/sosController');

/**
 * VIDEO RECORDING ENDPOINTS (Priority 2 - Feature 1)
 */

// Upload and transcode video for incident
router.post('/upload-video/:incidentId', authMiddleware, uploadVideo);

// Get all videos for incident
router.get('/video/:incidentId', authMiddleware, getIncidentVideos);

// Check video transcoding status
router.get('/video/:videoId/status', authMiddleware, checkVideoStatus);

/**
 * CONTACT GROUP ENDPOINTS (Priority 2 - Feature 3)
 */

// Create new contact group
router.post('/contact-groups', authMiddleware, createContactGroup);

// Get all user's contact groups (with pagination)
router.get('/contact-groups', authMiddleware, getContactGroups);

// Get single group details
router.get('/contact-groups/:groupId', authMiddleware, getContactGroup);

// Update group
router.patch('/contact-groups/:groupId', authMiddleware, updateContactGroup);

// Delete group
router.delete('/contact-groups/:groupId', authMiddleware, deleteContactGroup);

// Add contact to group
router.post('/contact-groups/:groupId/contacts', authMiddleware, addContactToGroup);

// Remove contact from group
router.delete(
  '/contact-groups/:groupId/contacts/:contactId',
  authMiddleware,
  removeContactFromGroup
);

// Get group statistics
router.get('/groups/stats', authMiddleware, getGroupStats);

module.exports = router;
