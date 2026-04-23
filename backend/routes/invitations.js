const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const Invitation = require('../models/Invitation');
const User = require('../models/User');
const logger = require('../utils/logger');
const { emitToUser } = require('../config/websocket');

const router = express.Router();

/**
 * Send Invitation
 * POST /api/invitations/send
 * Body: { recipientIdentifier, recipientIdentifierType, message, module }
 */
router.post('/send', authenticate, async (req, res, next) => {
  try {
    const { recipientIdentifier, recipientIdentifierType, message, module } = req.body;
    const senderId = req.user._id;
    const senderUsername = req.user.username || req.user.email;
    const senderName = req.user.name;

    // Validate input
    if (!recipientIdentifier || !recipientIdentifierType) {
      return res.status(400).json({
        success: false,
        message: 'Recipient identifier and type are required',
      });
    }

    if (!['email', 'phone', 'username'].includes(recipientIdentifierType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipient identifier type',
      });
    }

    // Check if user is inviting themselves
    if (recipientIdentifier.toLowerCase() === senderUsername.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot invite yourself',
      });
    }

    // Find recipient if they exist
    let recipientUserId = null;
    let searchQuery = {};

    if (recipientIdentifierType === 'email') {
      searchQuery.email = recipientIdentifier.toLowerCase();
    } else if (recipientIdentifierType === 'phone') {
      searchQuery.phone = recipientIdentifier;
    } else if (recipientIdentifierType === 'username') {
      searchQuery.username = recipientIdentifier.toLowerCase();
    }

    const recipient = await User.findOne(searchQuery);
    if (recipient) {
      recipientUserId = recipient._id;

      // Check if recipient is visible via this contact method
      const isVisibleVia = (visibility, method) => {
        switch (method) {
          case 'phone':
            return visibility?.visibleViaPhone !== false;
          case 'email':
            return visibility?.visibleViaEmail !== false;
          case 'username':
            return visibility?.visibleViaUsername !== false;
          default:
            return false;
        }
      };

      if (!isVisibleVia(recipient.visibility, recipientIdentifierType)) {
        return res.status(403).json({
          success: false,
          message: `This user is not accepting invitations via ${recipientIdentifierType}. Try contacting them through another method.`,
        });
      }

      // Check if recipient accepts the requested means of contact
      const contactMeansRequested = req.body.contactMeans || 'chat'; // Default to chat
      const isAvailableFor = (contactMeans, means) => {
        switch (means) {
          case 'chat':
            return contactMeans?.availableForChat !== false;
          case 'voiceCall':
            return contactMeans?.availableForVoiceCall !== false;
          case 'videoCall':
            return contactMeans?.availableForVideoCall !== false;
          default:
            return false;
        }
      };

      if (!isAvailableFor(recipient.contactMeans, contactMeansRequested)) {
        return res.status(403).json({
          success: false,
          message: `This user is not accepting ${contactMeansRequested}s. Try reaching out through another method.`,
          availableMeans: {
            chat: recipient.contactMeans?.availableForChat !== false,
            voiceCall: recipient.contactMeans?.availableForVoiceCall !== false,
            videoCall: recipient.contactMeans?.availableForVideoCall !== false,
          },
        });
      }

      // Check if they're already contacts
      const Contact = require('../models/Contact');
      const existingContact = await Contact.findOne({
        userId: senderId,
        contactUserId: recipientUserId,
      });

      if (existingContact && !existingContact.isBlocked) {
        return res.status(400).json({
          success: false,
          message: 'This user is already in your contacts',
        });
      }
    }

    // Check for duplicate pending invitation
    const existingInvitation = await Invitation.findOne({
      senderId,
      recipientIdentifier: recipientIdentifier.toLowerCase(),
      status: 'pending',
    });

    if (existingInvitation) {
      return res.status(400).json({
        success: false,
        message: 'You have already sent an invitation to this user',
      });
    }

    // Create invitation
    const invitation = new Invitation({
      senderId,
      senderUsername,
      senderName,
      recipientUserId,
      recipientIdentifier: recipientIdentifier.toLowerCase(),
      recipientIdentifierType,
      message: message || '',
      module: module || 'messaging',
      contactMeans: req.body.contactMeans || 'chat',
    });

    await invitation.save();
    logger.info(`Invitation sent from ${senderId} to ${recipientIdentifier}`);

    // Emit Socket.io event to recipient if they're online
    if (recipientUserId) {
      emitToUser(recipientUserId, 'invitation:received', {
        _id: invitation._id,
        senderId: invitation.senderId,
        senderInfo: {
          name: senderName,
          username: senderUsername,
          email: req.user.email,
        },
        recipientIdentifier,
        recipientIdentifierType,
        message: invitation.message,
        createdAt: invitation.createdAt,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      invitation,
    });
  } catch (err) {
    logger.error('Error sending invitation:', err);
    next(err);
  }
});

/**
 * Get Pending Invitations for Current User
 * GET /api/invitations/pending
 */
router.get('/pending', authenticate, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userEmail = req.user.email;
    const userPhone = req.user.phone;
    const userUsername = req.user.username;

    const invitations = await Invitation.find({
      $or: [
        { recipientUserId: userId, status: 'pending' },
        { recipientIdentifier: userEmail, recipientIdentifierType: 'email', status: 'pending' },
        { recipientIdentifier: userPhone, recipientIdentifierType: 'phone', status: 'pending' },
        { recipientIdentifier: userUsername, recipientIdentifierType: 'username', status: 'pending' },
      ],
    })
      .populate('senderId', 'name email username avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      invitations,
      count: invitations.length,
    });
  } catch (err) {
    logger.error('Error fetching pending invitations:', err);
    next(err);
  }
});

/**
 * Accept Invitation
 * POST /api/invitations/:invitationId/accept
 */
router.post('/:invitationId/accept', authenticate, async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      return res.status(400).json({ success: false, message: 'Invalid invitation ID' });
    }

    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Invitation is already ${invitation.status}`,
      });
    }

    // Verify the invitation is for the current user
    if (
      invitation.recipientUserId &&
      invitation.recipientUserId.toString() !== userId.toString()
    ) {
      if (invitation.recipientIdentifierType === 'email' && req.user.email !== invitation.recipientIdentifier) {
        return res.status(403).json({ success: false, message: 'This invitation is not for you' });
      }
      if (invitation.recipientIdentifierType === 'phone' && req.user.phone !== invitation.recipientIdentifier) {
        return res.status(403).json({ success: false, message: 'This invitation is not for you' });
      }
      if (invitation.recipientIdentifierType === 'username' && req.user.username !== invitation.recipientIdentifier) {
        return res.status(403).json({ success: false, message: 'This invitation is not for you' });
      }
    }

    // Update invitation status
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    invitation.recipientUserId = userId;
    await invitation.save();

    // Create contact relationship for both users
    const Contact = require('../models/Contact');

    // Add sender to recipient's contacts
    let recipientContact = await Contact.findOne({
      userId,
      contactUserId: invitation.senderId,
    });

    if (!recipientContact) {
      recipientContact = new Contact({
        userId,
        contactUserId: invitation.senderId,
        displayName: invitation.senderName,
        category: 'personal',
      });
      await recipientContact.save();
    }

    // Add recipient to sender's contacts
    let senderContact = await Contact.findOne({
      userId: invitation.senderId,
      contactUserId: userId,
    });

    if (!senderContact) {
      senderContact = new Contact({
        userId: invitation.senderId,
        contactUserId: userId,
        displayName: req.user.name,
        category: 'personal',
      });
      await senderContact.save();
    }

    logger.info(`Invitation accepted: ${invitationId}`);

    // Emit Socket.io event to sender
    emitToUser(invitation.senderId, 'invitation:accepted', {
      invitationId: invitation._id,
      newContact: {
        _id: userId,
        name: req.user.name,
        username: req.user.username,
        email: req.user.email,
        avatar: req.user.avatar,
      },
    });

    res.json({
      success: true,
      message: 'Invitation accepted successfully',
      invitation,
    });
  } catch (err) {
    logger.error('Error accepting invitation:', err);
    next(err);
  }
});

/**
 * Reject Invitation
 * POST /api/invitations/:invitationId/reject
 */
router.post('/:invitationId/reject', authenticate, async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      return res.status(400).json({ success: false, message: 'Invalid invitation ID' });
    }

    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Invitation is already ${invitation.status}`,
      });
    }

    // Verify authorization
    if (
      invitation.recipientUserId &&
      invitation.recipientUserId.toString() !== userId.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized to reject this invitation' });
    }

    invitation.status = 'rejected';
    invitation.rejectedAt = new Date();
    invitation.rejectionReason = reason || '';
    await invitation.save();

    logger.info(`Invitation rejected: ${invitationId}`);

    // Emit Socket.io event to sender
    emitToUser(invitation.senderId, 'invitation:rejected', {
      invitationId: invitation._id,
      senderName: invitation.senderName,
      recipientName: req.user.name,
      reason: reason || 'No reason provided',
    });

    res.json({
      success: true,
      message: 'Invitation rejected successfully',
    });
  } catch (err) {
    logger.error('Error rejecting invitation:', err);
    next(err);
  }
});

/**
 * Get Sent Invitations
 * GET /api/invitations/sent
 */
router.get('/sent', authenticate, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const query = { senderId: userId };
    if (status) {
      query.status = status;
    }

    const invitations = await Invitation.find(query)
      .populate('recipientUserId', 'name email username avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      invitations,
      count: invitations.length,
    });
  } catch (err) {
    logger.error('Error fetching sent invitations:', err);
    next(err);
  }
});

/**
 * Cancel Invitation (sender only)
 * DELETE /api/invitations/:invitationId
 */
router.delete('/:invitationId', authenticate, async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      return res.status(400).json({ success: false, message: 'Invalid invitation ID' });
    }

    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }

    if (invitation.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Only sender can cancel invitation' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only cancel pending invitations',
      });
    }

    await Invitation.findByIdAndDelete(invitationId);

    logger.info(`Invitation cancelled: ${invitationId}`);

    res.json({
      success: true,
      message: 'Invitation cancelled successfully',
    });
  } catch (err) {
    logger.error('Error cancelling invitation:', err);
    next(err);
  }
});

/**
 * Check Username Availability
 * GET /api/invitations/check/username/:username
 */
router.get('/check/username/:username', async (req, res, next) => {
  try {
    const { username } = req.params;

    if (!username || username.length < 3 || username.length > 20) {
      return res.status(400).json({
        success: false,
        available: false,
        message: 'Username must be 3-20 characters',
      });
    }

    const user = await User.findOne({ username: username.toLowerCase() });

    res.json({
      success: true,
      available: !user,
      username,
    });
  } catch (err) {
    logger.error('Error checking username:', err);
    next(err);
  }
});

module.exports = router;
