const express = require('express');
const router = express.Router();
const FamilyMember = require('../models/FamilyMember');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const { authenticate } = require('../middleware/auth');
const crypto = require('crypto');

// Get all family members for a profile
router.get('/profile/:profileId/members', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    
    // Check if user owns this profile
    const profile = await MatrimonialProfile.findOne({
      _id: profileId,
      userId: req.user._id
    });
    
    if (!profile) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const members = await FamilyMember.find({ profileId })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ members });
  } catch (error) {
    console.error('Error fetching family members:', error);
    res.status(500).json({ error: 'Failed to fetch family members' });
  }
});

// Add family member
router.post('/profile/:profileId/members', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { name, relationship, email, phone, permissions } = req.body;

    // Check if user owns this profile
    const profile = await MatrimonialProfile.findOne({
      _id: profileId,
      userId: req.user._id
    });
    
    if (!profile) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create family member
    const member = new FamilyMember({
      profileId,
      userId: req.user._id,
      name,
      relationship,
      email,
      phone,
      permissions: permissions || {}
    });

    // Generate invitation token
    member.generateInvitationToken();
    await member.save();

    // TODO: Send invitation email with token
    // await sendInvitationEmail(email, member.invitationToken);

    res.json({
      message: 'Family member added successfully',
      member,
      invitationLink: `${process.env.FRONTEND_URL}/family-invite/${member.invitationToken}`
    });
  } catch (error) {
    console.error('Error adding family member:', error);
    res.status(500).json({ error: 'Failed to add family member' });
  }
});

// Update family member permissions
router.put('/members/:memberId/permissions', authenticate, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { permissions } = req.body;

    const member = await FamilyMember.findById(memberId);
    if (!member) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    // Check if user owns the profile
    const profile = await MatrimonialProfile.findOne({
      _id: member.profileId,
      userId: req.user._id
    });
    
    if (!profile) {
      return res.status(403).json({ error: 'Access denied' });
    }

    member.permissions = { ...member.permissions, ...permissions };
    await member.save();

    res.json({
      message: 'Permissions updated successfully',
      member
    });
  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

// Accept family member invitation
router.post('/invite/:token/accept', authenticate, async (req, res) => {
  try {
    const { token } = req.params;

    const member = await FamilyMember.findOne({
      invitationToken: token,
      status: 'pending'
    });

    if (!member) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }

    // Check if invitation expired
    if (member.invitationExpiry < new Date()) {
      return res.status(400).json({ error: 'Invitation expired' });
    }

    member.status = 'active';
    member.acceptedAt = new Date();
    member.invitationToken = undefined;
    member.invitationExpiry = undefined;
    await member.save();

    res.json({
      message: 'Invitation accepted successfully',
      member
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// Revoke family member access
router.delete('/members/:memberId', authenticate, async (req, res) => {
  try {
    const { memberId } = req.params;

    const member = await FamilyMember.findById(memberId);
    if (!member) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    // Check if user owns the profile
    const profile = await MatrimonialProfile.findOne({
      _id: member.profileId,
      userId: req.user._id
    });
    
    if (!profile) {
      return res.status(403).json({ error: 'Access denied' });
    }

    member.status = 'revoked';
    await member.save();

    res.json({ message: 'Family member access revoked' });
  } catch (error) {
    console.error('Error revoking access:', error);
    res.status(500).json({ error: 'Failed to revoke access' });
  }
});

// Log family member activity
router.post('/members/:memberId/activity', authenticate, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { action, details } = req.body;

    const member = await FamilyMember.findById(memberId);
    if (!member || member.status !== 'active') {
      return res.status(403).json({ error: 'Access denied' });
    }

    member.logActivity(action, details);
    await member.save();

    res.json({ message: 'Activity logged' });
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// Get activity log for profile
router.get('/profile/:profileId/activity-log', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;

    const profile = await MatrimonialProfile.findOne({
      _id: profileId,
      userId: req.user._id
    });
    
    if (!profile) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const members = await FamilyMember.find({ profileId });
    
    // Aggregate all activity logs
    const activityLog = [];
    members.forEach(member => {
      member.activityLog.forEach(log => {
        activityLog.push({
          ...log.toObject(),
          memberName: member.name,
          relationship: member.relationship
        });
      });
    });

    // Sort by timestamp descending
    activityLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ activityLog: activityLog.slice(0, 100) }); // Return last 100 activities
  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

// Check permission for family member
router.get('/members/:memberId/check-permission/:permission', authenticate, async (req, res) => {
  try {
    const { memberId, permission } = req.params;

    const member = await FamilyMember.findById(memberId);
    if (!member) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    const hasPermission = member.hasPermission(permission);
    res.json({ hasPermission });
  } catch (error) {
    console.error('Error checking permission:', error);
    res.status(500).json({ error: 'Failed to check permission' });
  }
});

module.exports = router;
