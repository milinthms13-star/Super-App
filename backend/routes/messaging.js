const express = require('express');
const Joi = require('joi');
const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Contact = require('../models/Contact');
const Call = require('../models/Call');
const EncryptionKey = require('../models/EncryptionKey');
const FileStorage = require('../models/FileStorage');
const AIReply = require('../models/AIReply');
const ChatNotification = require('../models/ChatNotification');
const MessagingSettings = require('../models/MessagingSettings');
const User = require('../models/User');
const { ensureMessagingUser } = require('../utils/ensureMessagingUser');
const { generateKeyPair, encryptMessage, decryptMessage, generateKeyFingerprint } = require('../utils/encryption');
const { generateS3Key, uploadToS3, generateSignedUrl, deleteFromS3 } = require('../utils/s3Storage');
const { generateAISuggestions } = require('../utils/aiChat');
const { emitToUser } = require('../config/websocket');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

const normalizeObjectId = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value.toHexString === 'function') {
    return value.toHexString();
  }

  if (value._id && value._id !== value) {
    return normalizeObjectId(value._id);
  }

  if (value.id && value.id !== value) {
    return normalizeObjectId(value.id);
  }

  if (typeof value.toString === 'function') {
    return value.toString();
  }

  return String(value);
};

const objectIdEquals = (value, other) => normalizeObjectId(value) === normalizeObjectId(other);

const arrayHasObjectId = (values, candidate) =>
  Array.isArray(values) && values.some((value) => objectIdEquals(value, candidate));

const getDirectChatRecipientId = (chat, currentUserId) => {
  if (!chat || chat.type !== 'direct') {
    return '';
  }

  const otherParticipant = (chat.participants || []).find(
    (participantId) => !objectIdEquals(participantId, currentUserId)
  );

  return normalizeObjectId(otherParticipant);
};

const emitToChatParticipants = async (chatId, event, data, excludeUserId = null) => {
  const chat = await Chat.findById(chatId).select('participants');

  if (!chat) {
    return;
  }

  for (const participantId of chat.participants || []) {
    if (excludeUserId && objectIdEquals(participantId, excludeUserId)) {
      continue;
    }

    emitToUser(participantId, event, data);
  }
};

const getAuthorizedChat = async (chatId, userId) => {
  const chat = await Chat.findById(chatId);

  if (!chat) {
    return { chat: null, authorized: false };
  }

  return {
    chat,
    authorized: arrayHasObjectId(chat.participants, userId),
  };
};

const attachMessagingUser = async (req, res, next) => {
  try {
    const resolvedUser = await ensureMessagingUser(req.user);

    if (!resolvedUser) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    req.user = resolvedUser;
    next();
  } catch (err) {
    next(err);
  }
};

// Check if two users have blocking relationships
const checkBlockingRelationship = async (userId1, userId2) => {
  try {
    // Check if userId1 blocked userId2
    const blockingContact = await Contact.findOne({
      userId: userId1,
      contactUserId: userId2,
      isBlocked: true,
    });

    if (blockingContact) return true;

    // Check if userId2 blocked userId1
    const blockedByContact = await Contact.findOne({
      userId: userId2,
      contactUserId: userId1,
      isBlocked: true,
    });

    if (blockedByContact) return true;

    return false;
  } catch (err) {
    logger.error('Error checking blocking relationship:', err);
    return false;
  }
};

// Check if all participants are unblocked with each other
const validateGroupParticipants = async (participantIds) => {
  try {
    // Check all pairs of participants for blocking
    for (let i = 0; i < participantIds.length; i++) {
      for (let j = i + 1; j < participantIds.length; j++) {
        const hasBlocking = await checkBlockingRelationship(
          participantIds[i],
          participantIds[j]
        );
        if (hasBlocking) {
          return {
            valid: false,
            blockedPair: [participantIds[i], participantIds[j]],
          };
        }
      }
    }
    return { valid: true };
  } catch (err) {
    logger.error('Error validating group participants:', err);
    return { valid: false, error: err.message };
  }
};

// Check if remaining participants have blocking relationships
const shouldDeleteGroup = async (participantIds) => {
  try {
    if (participantIds.length <= 1) return true;

    // For each pair of remaining participants, check if they have blocking
    for (let i = 0; i < participantIds.length; i++) {
      for (let j = i + 1; j < participantIds.length; j++) {
        const hasBlocking = await checkBlockingRelationship(
          participantIds[i],
          participantIds[j]
        );
        if (hasBlocking) {
          return true; // They have blocking, so delete the group
        }
      }
    }
    return false;
  } catch (err) {
    logger.error('Error checking if group should be deleted:', err);
    return false;
  }
};

// ============ CHAT ROUTES ============

// Create or get direct chat with another user
router.post('/chats/direct', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { otherUserId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    if (otherUserId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot start chat with yourself' });
    }

    // Check if user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find or create direct chat
    let chat = await Chat.findOne({
      type: 'direct',
      participants: { $all: [req.user._id, otherUserId] },
    })
      .populate('participants', 'name avatar email')
      .populate('lastMessage');

    if (!chat) {
      chat = new Chat({
        type: 'direct',
        participants: [req.user._id, otherUserId],
      });
      await chat.save();
      await chat.populate('participants', 'name avatar email');
    }

    res.json({ chat });
  } catch (err) {
    next(err);
  }
});

// Create group chat
router.post('/chats/group', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { groupName, participantIds, groupIcon, groupDescription } = req.body;

    if (!groupName || !groupName.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ message: 'At least one participant is required' });
    }

    // Validate all user IDs
    for (const id of participantIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid participant ID' });
      }
    }

    // Add creator to participants
    const allParticipants = [...new Set([req.user._id.toString(), ...participantIds])];

    // Validate no blocking relationships among participants
    const blockingValidation = await validateGroupParticipants(allParticipants);
    if (!blockingValidation.valid) {
      return res.status(400).json({
        message: 'Cannot create group: Some members have blocked each other. Please ensure no blocked users are in the group.',
        blockedPair: blockingValidation.blockedPair,
      });
    }

    const chat = new Chat({
      type: 'group',
      groupName: groupName.trim(),
      participants: allParticipants,
      admins: [req.user._id],
      groupIcon: groupIcon || '',
      groupDescription: groupDescription || '',
      membersList: allParticipants.map((userId) => ({
        userId,
        role: userId === req.user._id.toString() ? 'admin' : 'member',
      })),
    });

    await chat.save();
    await chat.populate('participants', 'name avatar email');

    logger.info(`Group chat created: ${groupName} by ${req.user._id}`);
    res.status(201).json({ chat });
  } catch (err) {
    next(err);
  }
});

// Get all chats for user
router.get('/chats', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 50);
    const normalizedSearch = String(search || '').trim().toLowerCase();
    const query = {
      participants: req.user._id,
      isDeleted: false,
      archivedBy: { $ne: req.user._id }, // Exclude archived chats
    };

    const matchingChats = await Chat.find(query)
      .populate('participants', 'name avatar email')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });

    const filteredChats = normalizedSearch
      ? matchingChats.filter((chat) => {
          const groupNameMatches = chat.groupName?.toLowerCase().includes(normalizedSearch);
          const participantMatches = (chat.participants || []).some(
            (participant) =>
              !participant._id.equals(req.user._id) &&
              (
                participant.name?.toLowerCase().includes(normalizedSearch) ||
                participant.email?.toLowerCase().includes(normalizedSearch)
              )
          );

          return groupNameMatches || participantMatches;
        })
      : matchingChats;

    const total = filteredChats.length;
    const chats = filteredChats.slice(skip, skip + pageLimit);

    res.json({
      chats,
      pagination: {
        total,
        page: parseInt(page),
        limit: pageLimit,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get chat by ID
router.get('/chats/:chatId', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    const chat = await Chat.findById(chatId)
      .populate('participants', 'name avatar email')
      .populate('lastMessage')
      .populate('pinnedMessages', 'content createdAt senderId');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Verify user is participant
    if (!chat.participants.find((p) => p._id.equals(req.user._id))) {
      return res.status(403).json({ message: 'Not authorized to access this chat' });
    }

    res.json({ chat });
  } catch (err) {
    next(err);
  }
});

// Update group chat
router.put('/chats/:chatId', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { groupName, groupIcon, groupDescription } = req.body;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Verify user is admin
    if (chat.type === 'group' && !arrayHasObjectId(chat.admins, req.user._id)) {
      return res.status(403).json({ message: 'Only admins can update group chat' });
    }

    if (groupName) chat.groupName = groupName.trim();
    if (groupIcon) chat.groupIcon = groupIcon;
    if (groupDescription !== undefined) chat.groupDescription = groupDescription;

    await chat.save();
    await chat.populate('participants', 'name avatar email');

    logger.info(`Chat updated: ${chatId} by ${req.user._id}`);
    res.json({ chat });
  } catch (err) {
    next(err);
  }
});

// Add member to group
router.post('/chats/:chatId/members', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    const chat = await Chat.findById(chatId);

    if (!chat || chat.type !== 'group') {
      return res.status(404).json({ message: 'Group chat not found' });
    }

    // Verify user is admin
    if (!arrayHasObjectId(chat.admins, req.user._id)) {
      return res.status(403).json({ message: 'Only admins can add members' });
    }

    // Check if user already in chat
    if (arrayHasObjectId(chat.participants, userId)) {
      return res.status(400).json({ message: 'User already in group' });
    }

    // Validate that new user doesn't have blocking with existing members
    for (const participantId of chat.participants) {
      const hasBlocking = await checkBlockingRelationship(userId, participantId);
      if (hasBlocking) {
        return res.status(400).json({
          message: 'Cannot add member: This user has a blocking relationship with someone in the group',
        });
      }
    }

    chat.participants.push(userId);
    chat.membersList.push({
      userId,
      role: 'member',
    });

    await chat.save();
    await chat.populate('participants', 'name avatar email');

    logger.info(`Member added to chat ${chatId}: ${userId}`);
    res.json({ chat });
  } catch (err) {
    next(err);
  }
});

// Remove member from group
router.delete('/chats/:chatId/members/:userId', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatId, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid IDs' });
    }

    const chat = await Chat.findById(chatId);

    if (!chat || chat.type !== 'group') {
      return res.status(404).json({ message: 'Group chat not found' });
    }

    // Verify user is admin or removing themselves
    if (!arrayHasObjectId(chat.admins, req.user._id) && req.user._id.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to remove member' });
    }

    chat.participants = chat.participants.filter((p) => p.toString() !== userId);
    chat.membersList = chat.membersList.filter((m) => m.userId.toString() !== userId);
    chat.admins = chat.admins.filter((a) => a.toString() !== userId);

    // Check if group should be deleted (remaining members have blocking relationships)
    const shouldDelete = await shouldDeleteGroup(chat.participants);
    
    if (shouldDelete) {
      // Delete the group instead of just removing the member
      await Chat.findByIdAndDelete(chatId);
      logger.info(`Group chat auto-deleted due to member removal: ${chatId}`);
      return res.json({ 
        message: 'Group was automatically deleted because remaining members have blocked each other',
        deleted: true 
      });
    }

    await chat.save();
    await chat.populate('participants', 'name avatar email');

    logger.info(`Member removed from chat ${chatId}: ${userId}`);
    res.json({ chat });
  } catch (err) {
    next(err);
  }
});

// ============ MESSAGE ROUTES ============

// Send message
router.post('/messages', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatId, content, messageType, media, replyTo } = req.body;
    const normalizedMessageType =
      typeof messageType === 'string' && messageType.trim() ? messageType.trim() : 'text';
    const normalizedContent = typeof content === 'string' ? content.trim() : '';
    const normalizedReplyTo = normalizeObjectId(replyTo);

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    if (normalizedMessageType === 'text' && !normalizedContent) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Verify user is participant
    if (!arrayHasObjectId(chat.participants, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to send message in this chat' });
    }

    // Check if sender is blocked by any recipient in the chat
    for (const participant of chat.participants) {
      if (!objectIdEquals(participant, req.user._id)) {
        // Check if this participant has blocked the sender
        const blockedByParticipant = await Contact.findOne({
          userId: participant,
          contactUserId: req.user._id,
        });

        if (blockedByParticipant) {
          // Clean up expired blocks first
          blockedByParticipant.cleanupExpiredBlocks();
          
          // Check if currently blocked (considering time-based blocks)
          if (blockedByParticipant.isCurrentlyBlocked()) {
            // For direct chats, deny the message completely
            if (chat.type === 'direct') {
              return res.status(403).json({
                message: 'You are blocked by this user and cannot send messages',
              });
            }
            // For group chats, still allow but log it
            logger.warn(
              `User ${req.user._id} tried to send message to group chat but is blocked by ${participant}`
            );
          }
        }
      }
    }

    const participantIds = Array.from(
      new Set(
        (chat.participants || [])
          .map((participant) => normalizeObjectId(participant))
          .filter((participantId) => mongoose.Types.ObjectId.isValid(participantId))
      )
    );

    const message = new Message({
      chatId,
      senderId: req.user._id,
      messageType: normalizedMessageType,
      content: normalizedContent,
      media: media || undefined,
      replyTo:
        normalizedReplyTo && mongoose.Types.ObjectId.isValid(normalizedReplyTo)
          ? normalizedReplyTo
          : undefined,
      deliveryStatus: participantIds.map((userId) => ({
        userId,
        status: objectIdEquals(userId, req.user._id) ? 'seen' : 'sent',
        seenAt: objectIdEquals(userId, req.user._id) ? new Date() : undefined,
        deliveredAt: objectIdEquals(userId, req.user._id) ? new Date() : undefined,
      })),
    });

    try {
      await message.save();
    } catch (saveError) {
      logger.error(
        `Message save failed for chat ${chatId} by ${req.user._id}: ${saveError.message}`
      );
      throw saveError;
    }

    let responseMessage = message.toObject();

    try {
      await message.populate('senderId', 'name avatar email');
      responseMessage = message.toObject();
    } catch (populateError) {
      logger.warn(`Message populate failed for ${message._id}: ${populateError.message}`);
    }

    try {
      await Chat.updateOne(
        { _id: chatId },
        {
          $set: {
            lastMessage: message._id,
            lastMessageAt: new Date(),
          },
        }
      );
    } catch (chatUpdateError) {
      logger.warn(`Chat lastMessage update failed for ${chatId}: ${chatUpdateError.message}`);
    }

    // Try to emit socket event, but don't fail if it doesn't work
    try {
      await emitToChatParticipants(chatId, 'message:received', responseMessage);
    } catch (socketErr) {
      logger.warn(`Socket emit failed: ${socketErr.message}`);
    }

    // Create notifications for other participants (not for sender)
    try {
      for (const participant of participantIds) {
        if (!objectIdEquals(participant, req.user._id)) {
          const notification = new ChatNotification({
            userId: participant,
            messageId: message._id,
            chatId,
            senderId: req.user._id,
            notificationType: 'message',
            title: `New message from ${req.user.name || 'User'}`,
            body: normalizedContent ? normalizedContent.substring(0, 100) : `[${normalizedMessageType}]`,
          });
          await notification.save();
          emitToUser(participant, 'notification:received', notification.toObject());
        }
      }
    } catch (notifErr) {
      logger.warn(`Notification failed: ${notifErr.message}`);
    }

    logger.info(`Message sent in chat ${chatId} by ${req.user._id}`);
    res.status(201).json({ message: responseMessage });
  } catch (err) {
    logger.error(`Error sending message: ${err.message}`, err);
    next(err);
  }
});

// Get messages from a chat
router.get('/messages/:chatId', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Verify user is participant
    if (!arrayHasObjectId(chat.participants, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view messages' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 100);

    const messages = await Message.find({
      chatId,
      isDeleted: false,
    })
      .populate('senderId', 'name avatar email')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    const total = await Message.countDocuments({ chatId, isDeleted: false });

    res.json({
      messages: messages.reverse(),
      pagination: {
        total,
        page: parseInt(page),
        limit: pageLimit,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Mark message as read
router.put('/messages/:messageId/read', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const { chat, authorized } = await getAuthorizedChat(message.chatId, req.user._id);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!authorized) {
      return res.status(403).json({ message: 'Not authorized to update this message' });
    }

    // Update delivery status
    const deliveryIndex = message.deliveryStatus.findIndex((d) =>
      d.userId.equals(req.user._id)
    );

    if (deliveryIndex !== -1) {
      message.deliveryStatus[deliveryIndex].status = 'seen';
      message.deliveryStatus[deliveryIndex].seenAt = new Date();
    }

    await message.save();

    logger.info(`Message marked as read: ${messageId} by ${req.user._id}`);
    res.json({ message });
  } catch (err) {
    next(err);
  }
});

// Mark all messages in chat as read
router.put('/chats/:chatId/mark-read', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    const { chat, authorized } = await getAuthorizedChat(chatId, req.user._id);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!authorized) {
      return res.status(403).json({ message: 'Not authorized to update this chat' });
    }

    const result = await Message.updateMany(
      {
        chatId,
        'deliveryStatus.userId': req.user._id,
        'deliveryStatus.status': { $ne: 'seen' },
      },
      {
        $set: {
          'deliveryStatus.$[elem].status': 'seen',
          'deliveryStatus.$[elem].seenAt': new Date(),
        },
      },
      {
        arrayFilters: [{ 'elem.userId': req.user._id }],
        multi: true,
      }
    );

    logger.info(`All messages in chat ${chatId} marked as read by ${req.user._id}`);
    res.json({ modifiedCount: result.modifiedCount });
  } catch (err) {
    next(err);
  }
});

// Edit message
router.put('/messages/:messageId', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Verify sender
    if (!message.senderId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Can only edit your own messages' });
    }

    // Can only edit within 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (message.createdAt < oneDayAgo) {
      return res.status(400).json({ message: 'Cannot edit messages older than 24 hours' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Add to edit history
    message.edits.push({
      content: message.content,
      editedAt: new Date(),
    });

    message.content = content.trim();
    await message.save();
    await message.populate('senderId', 'name avatar email');

    await emitToChatParticipants(message.chatId, 'message:updated', message, req.user._id);

    logger.info(`Message edited: ${messageId}`);
    res.json({ message });
  } catch (err) {
    next(err);
  }
});

// Delete message
router.delete('/messages/:messageId', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Verify sender
    if (!message.senderId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Can only delete your own messages' });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = req.user._id;

    await message.save();
    await emitToChatParticipants(
      message.chatId,
      'message:deleted',
      {
        messageId: message._id,
        chatId: message.chatId,
      },
      req.user._id
    );

    logger.info(`Message deleted: ${messageId}`);
    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Delete all messages in a chat
router.delete('/chats/:chatId/messages', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    const { chat, authorized } = await getAuthorizedChat(chatId, req.user._id);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!authorized) {
      return res.status(403).json({ message: 'Not authorized to clear this chat' });
    }

    // Mark all messages as deleted
    const result = await Message.updateMany(
      {
        chatId,
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: req.user._id,
        },
      }
    );

    logger.info(`All messages deleted from chat ${chatId} by ${req.user._id}. Deleted: ${result.modifiedCount}`);

    // Notify all participants
    await emitToChatParticipants(
      chatId,
      'chat:cleared',
      {
        chatId,
        clearedBy: req.user._id,
        deletedCount: result.modifiedCount,
      },
      req.user._id
    );

    res.json({
      message: 'All messages deleted successfully',
      deletedCount: result.modifiedCount,
    });
  } catch (err) {
    next(err);
  }
});

// Add reaction to message
router.post('/messages/:messageId/reactions', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const { chat, authorized } = await getAuthorizedChat(message.chatId, req.user._id);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!authorized) {
      return res.status(403).json({ message: 'Not authorized to react to this message' });
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      (r) => r.userId.equals(req.user._id) && r.emoji === emoji
    );

    if (existingReaction) {
      // Remove reaction
      message.reactions = message.reactions.filter(
        (r) => !(r.userId.equals(req.user._id) && r.emoji === emoji)
      );
    } else {
      // Add reaction
      message.reactions.push({
        userId: req.user._id,
        emoji,
      });
    }

    await message.save();
    await message.populate('senderId', 'name avatar email');
    await emitToChatParticipants(message.chatId, 'message:updated', message, req.user._id);

    logger.info(`Reaction added to message ${messageId}`);
    res.json({ message });
  } catch (err) {
    next(err);
  }
});

// Search messages
router.get('/search/messages', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { query, chatId, page = 1, limit = 20 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 50);

    const accessibleChatIds = await Chat.find({
      participants: req.user._id,
      isDeleted: false,
      archivedBy: { $ne: req.user._id },
    }).distinct('_id');

    let searchQuery = {
      content: { $regex: query, $options: 'i' },
      isDeleted: false,
      chatId: { $in: accessibleChatIds },
    };

    if (chatId && mongoose.Types.ObjectId.isValid(chatId)) {
      if (!accessibleChatIds.some((id) => objectIdEquals(id, chatId))) {
        return res.status(403).json({ message: 'Not authorized to search this chat' });
      }

      searchQuery.chatId = chatId;
    }

    const messages = await Message.find(searchQuery)
      .populate('senderId', 'name avatar email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    const total = await Message.countDocuments(searchQuery);

    res.json({
      messages,
      pagination: {
        total,
        page: parseInt(page),
        limit: pageLimit,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============ CONTACT ROUTES ============

// Get all contacts
router.get('/contacts', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, favorite, showBlocked } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 100);

    let query = {
      userId: req.user._id,
    };

    // If showBlocked is explicitly true, show only blocked contacts
    // Otherwise, show only unblocked contacts (default behavior)
    if (showBlocked === 'true') {
      query.isBlocked = true;
    } else {
      query.isBlocked = false;
    }

    if (favorite === 'true') {
      query.isFavorite = true;
    }

    const contacts = await Contact.find(query)
      .populate('contactUserId', 'name username email avatar status')
      .sort({ lastInteractionAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    const total = await Contact.countDocuments(query);

    res.json({
      contacts,
      pagination: {
        total,
        page: parseInt(page),
        limit: pageLimit,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Add contact
router.post('/contacts', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { contactUserId, displayName, category } = req.body;

    if (!mongoose.Types.ObjectId.isValid(contactUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    if (contactUserId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot add yourself as contact' });
    }

    // Check if contact already exists
    let contact = await Contact.findOne({
      userId: req.user._id,
      contactUserId,
    });

    if (contact) {
      contact.isBlocked = false;
      contact.displayName = displayName || '';
      contact.category = category || 'personal';
      contact.lastInteractionAt = new Date();
    } else {
      contact = new Contact({
        userId: req.user._id,
        contactUserId,
        displayName: displayName || '',
        category: category || 'personal',
      });
    }

    await contact.save();
    await contact.populate('contactUserId', 'name avatar email');

    logger.info(`Contact added: ${contactUserId} for user ${req.user._id}`);
    res.status(201).json({ contact });
  } catch (err) {
    next(err);
  }
});

// Block contact
router.put('/contacts/:contactUserId/block', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { contactUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contactUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    let contact = await Contact.findOne({
      userId: req.user._id,
      contactUserId,
    });

    if (!contact) {
      contact = new Contact({
        userId: req.user._id,
        contactUserId,
        isBlocked: true,
        blockedAt: new Date(),
      });
    } else {
      contact.isBlocked = true;
      contact.blockedAt = new Date();
    }

    await contact.save();

    logger.info(`Contact blocked: ${contactUserId} by ${req.user._id}`);
    res.json({ contact });
  } catch (err) {
    next(err);
  }
});

// Unblock contact
router.put('/contacts/:contactUserId/unblock', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { contactUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contactUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const contact = await Contact.findOne({
      userId: req.user._id,
      contactUserId,
    });

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    contact.isBlocked = false;
    contact.blockedAt = null;

    await contact.save();

    logger.info(`Contact unblocked: ${contactUserId} by ${req.user._id}`);
    res.json({ contact });
  } catch (err) {
    next(err);
  }
});

// Toggle favorite contact
router.put('/contacts/:contactUserId/favorite', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { contactUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contactUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const contact = await Contact.findOne({
      userId: req.user._id,
      contactUserId,
    });

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    contact.isFavorite = !contact.isFavorite;
    await contact.save();

    logger.info(`Contact favorite toggled: ${contactUserId} by ${req.user._id}, isFavorite: ${contact.isFavorite}`);
    res.json({ contact, isFavorite: contact.isFavorite });
  } catch (err) {
    next(err);
  }
});

// Add scheduled block
router.post('/contacts/:contactUserId/scheduled-block', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { contactUserId } = req.params;
    const { type, startTime, endTime, daysOfWeek, blockStartDate, blockEndDate, validUntil, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(contactUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    if (!['time', 'period'].includes(type)) {
      return res.status(400).json({ message: 'Invalid block type. Must be "time" or "period"' });
    }

    if (type === 'time' && (!startTime || !endTime)) {
      return res.status(400).json({ message: 'startTime and endTime are required for time-based blocks' });
    }

    if (type === 'period' && (!blockStartDate || !blockEndDate)) {
      return res.status(400).json({ message: 'blockStartDate and blockEndDate are required for period-based blocks' });
    }

    let contact = await Contact.findOne({
      userId: req.user._id,
      contactUserId,
    });

    if (!contact) {
      contact = new Contact({
        userId: req.user._id,
        contactUserId,
      });
    }

    const newBlock = {
      type,
      startTime: type === 'time' ? startTime : undefined,
      endTime: type === 'time' ? endTime : undefined,
      daysOfWeek: type === 'time' ? (daysOfWeek || [0, 1, 2, 3, 4, 5, 6]) : undefined,
      blockStartDate: type === 'period' ? blockStartDate : undefined,
      blockEndDate: type === 'period' ? blockEndDate : undefined,
      validUntil: validUntil ? new Date(validUntil) : null,
      reason: reason || null,
      isActive: true,
    };

    if (!contact.scheduledBlocks) {
      contact.scheduledBlocks = [];
    }

    contact.scheduledBlocks.push(newBlock);
    await contact.save();

    logger.info(`Scheduled block added for contact ${contactUserId} by ${req.user._id}`);
    res.status(201).json({ contact, block: newBlock });
  } catch (err) {
    next(err);
  }
});

// Get scheduled blocks for a contact
router.get('/contacts/:contactUserId/scheduled-blocks', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { contactUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contactUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const contact = await Contact.findOne({
      userId: req.user._id,
      contactUserId,
    });

    if (!contact) {
      return res.json({ scheduledBlocks: [] });
    }

    // Clean up expired blocks
    contact.cleanupExpiredBlocks();
    await contact.save();

    res.json({ scheduledBlocks: contact.scheduledBlocks || [] });
  } catch (err) {
    next(err);
  }
});

// Update scheduled block
router.put('/contacts/:contactUserId/scheduled-block/:blockId', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { contactUserId, blockId } = req.params;
    const { isActive, validUntil, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(contactUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const contact = await Contact.findOne({
      userId: req.user._id,
      contactUserId,
    });

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    const block = contact.scheduledBlocks.id(blockId);
    if (!block) {
      return res.status(404).json({ message: 'Scheduled block not found' });
    }

    if (isActive !== undefined) block.isActive = isActive;
    if (validUntil !== undefined) block.validUntil = validUntil ? new Date(validUntil) : null;
    if (reason !== undefined) block.reason = reason;

    await contact.save();

    logger.info(`Scheduled block ${blockId} updated for contact ${contactUserId} by ${req.user._id}`);
    res.json({ contact, block });
  } catch (err) {
    next(err);
  }
});

// Delete scheduled block
router.delete('/contacts/:contactUserId/scheduled-block/:blockId', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { contactUserId, blockId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contactUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const contact = await Contact.findOne({
      userId: req.user._id,
      contactUserId,
    });

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    contact.scheduledBlocks = contact.scheduledBlocks.filter((b) => b._id.toString() !== blockId);
    await contact.save();

    logger.info(`Scheduled block ${blockId} deleted for contact ${contactUserId} by ${req.user._id}`);
    res.json({ contact });
  } catch (err) {
    next(err);
  }
});

// Delete contact
router.delete('/contacts/:contactUserId', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { contactUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contactUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    await Contact.deleteOne({
      userId: req.user._id,
      contactUserId,
    });

    logger.info(`Contact deleted: ${contactUserId} for user ${req.user._id}`);
    res.json({ message: 'Contact deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ============ NOTIFICATION ROUTES ============

// Get notifications
router.get('/notifications', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 50);

    let query = { userId: req.user._id };

    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await ChatNotification.find(query)
      .populate('senderId', 'name avatar email')
      .populate('messageId', 'content')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    const total = await ChatNotification.countDocuments(query);
    const unreadCount = await ChatNotification.countDocuments({
      userId: req.user._id,
      isRead: false,
    });

    res.json({
      notifications,
      unreadCount,
      pagination: {
        total,
        page: parseInt(page),
        limit: pageLimit,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { notificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }

    const notification = await ChatNotification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    notification.readAt = new Date();

    await notification.save();

    res.json({ notification });
  } catch (err) {
    next(err);
  }
});

// Mark all notifications as read
router.put('/notifications/mark-all-read', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const result = await ChatNotification.updateMany(
      { userId: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    logger.info(`${result.modifiedCount} notifications marked as read`);
    res.json({ modifiedCount: result.modifiedCount });
  } catch (err) {
    next(err);
  }
});

// ============ STATISTICS ============

// Get chat statistics
router.get('/stats', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const totalChats = await Chat.countDocuments({
      participants: req.user._id,
    });

    const totalMessages = await Message.countDocuments({
      chatId: {
        $in: await Chat.find(
          { participants: req.user._id },
          '_id'
        ).distinct('_id'),
      },
    });

    const totalContacts = await Contact.countDocuments({
      userId: req.user._id,
      isBlocked: false,
    });

    const unreadNotifications = await ChatNotification.countDocuments({
      userId: req.user._id,
      isRead: false,
    });

    res.json({
      totalChats,
      totalMessages,
      totalContacts,
      unreadNotifications,
    });
  } catch (err) {
    next(err);
  }
});

// ============ CALL ROUTES ============

// Initiate a call
router.post('/calls/initiate', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatId, recipientId, callType } = req.body;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    if (!['audio', 'video'].includes(callType)) {
      return res.status(400).json({ message: 'Invalid call type' });
    }

    const chat = await Chat.findById(chatId).populate('participants', 'name avatar email');
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!arrayHasObjectId(chat.participants, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to call in this chat' });
    }

    const resolvedRecipientId =
      mongoose.Types.ObjectId.isValid(recipientId)
        ? recipientId
        : getDirectChatRecipientId(chat, req.user._id);

    if (!mongoose.Types.ObjectId.isValid(resolvedRecipientId)) {
      return res.status(400).json({ message: 'Recipient is required for this call' });
    }

    if (!arrayHasObjectId(chat.participants, resolvedRecipientId)) {
      return res.status(400).json({ message: 'Recipient is not part of this chat' });
    }

    // Check if recipient is online
    const recipient = await User.findById(resolvedRecipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Create call record
    const call = new Call({
      chatId,
      initiatorId: req.user._id,
      recipientId: resolvedRecipientId,
      callType,
      status: 'ringing',
    });

    await call.save();

    // Emit call initiation via WebSocket
    emitToUser(resolvedRecipientId, 'call:incoming', {
      _id: call._id,
      callId: call._id,
      initiatorId: req.user._id,
      recipientId: resolvedRecipientId,
      chatId,
      callType,
      status: call.status,
      caller: {
        _id: req.user._id,
        name: req.user.name || req.user.email || 'User',
        avatar: req.user.avatar || '',
      },
      timestamp: new Date(),
    });

    logger.info(`Call initiated: ${call._id} from ${req.user._id} to ${resolvedRecipientId}`);
    res.json({ call });
  } catch (err) {
    next(err);
  }
});

// Accept incoming call
router.post('/calls/:callId/accept', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { callId } = req.params;
    const { sdpAnswer } = req.body;

    if (!mongoose.Types.ObjectId.isValid(callId)) {
      return res.status(400).json({ message: 'Invalid call ID' });
    }

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }

    if (!call.recipientId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to accept this call' });
    }

    call.status = 'accepted';
    call.startedAt = new Date();
    call.sdpAnswer = sdpAnswer;

    // Add participants
    call.participants = [
      {
        userId: call.initiatorId,
        joinedAt: new Date(),
        audioEnabled: true,
        videoEnabled: call.callType === 'video',
      },
      {
        userId: call.recipientId,
        joinedAt: new Date(),
        audioEnabled: true,
        videoEnabled: call.callType === 'video',
      },
    ];

    await call.save();

    // Emit call acceptance
    emitToUser(call.initiatorId, 'call:accepted', {
      callId: call._id,
      recipientId: req.user._id,
      sdpAnswer,
      timestamp: new Date(),
    });

    logger.info(`Call accepted: ${callId}`);
    res.json({ call });
  } catch (err) {
    next(err);
  }
});

// Decline incoming call
router.post('/calls/:callId/decline', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { callId } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(callId)) {
      return res.status(400).json({ message: 'Invalid call ID' });
    }

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }

    if (!call.recipientId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to decline this call' });
    }

    call.status = 'declined';
    call.declinedReason = reason || 'Declined by user';
    call.endedAt = new Date();

    await call.save();

    // Emit call decline
    emitToUser(call.initiatorId, 'call:declined', {
      callId: call._id,
      declinedBy: req.user._id,
      reason: call.declinedReason,
      timestamp: new Date(),
    });

    logger.info(`Call declined: ${callId}`);
    res.json({ call });
  } catch (err) {
    next(err);
  }
});

// End call
router.post('/calls/:callId/end', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { callId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(callId)) {
      return res.status(400).json({ message: 'Invalid call ID' });
    }

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }

    if (!call.initiatorId.equals(req.user._id) && !call.recipientId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to end this call' });
    }

    call.status = 'ended';
    call.endedAt = new Date();

    if (call.startedAt && call.endedAt) {
      call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);
    }

    await call.save();

    const callEndedEvent = {
      callId: call._id,
      endedBy: req.user._id,
      duration: call.duration,
      timestamp: new Date(),
    };

    emitToUser(call.initiatorId, 'call:ended', callEndedEvent);
    if (!objectIdEquals(call.recipientId, call.initiatorId)) {
      emitToUser(call.recipientId, 'call:ended', callEndedEvent);
    }

    logger.info(`Call ended: ${callId}`);
    res.json({ call });
  } catch (err) {
    next(err);
  }
});

// Get call history
router.get('/calls/history', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 50);

    const calls = await Call.find({
      $or: [
        { initiatorId: req.user._id },
        { recipientId: req.user._id },
      ],
      status: { $in: ['ended', 'missed'] },
    })
      .populate('chatId', 'groupName type')
      .populate('initiatorId', 'name avatar')
      .populate('recipientId', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    const total = await Call.countDocuments({
      $or: [
        { initiatorId: req.user._id },
        { recipientId: req.user._id },
      ],
      status: { $in: ['ended', 'missed'] },
    });

    res.json({
      calls,
      pagination: {
        total,
        page: parseInt(page),
        limit: pageLimit,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============ ENCRYPTION ROUTES ============

// Generate encryption keys
router.post('/encryption/keys/generate', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    // Check if user is in chat
    const chat = await Chat.findById(chatId);
    if (!chat || !arrayHasObjectId(chat.participants, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized for this chat' });
    }

    // Generate key pair
    const keyPair = generateKeyPair();
    const fingerprint = generateKeyFingerprint(keyPair.publicKey);

    // Deactivate existing keys
    await EncryptionKey.updateMany(
      { userId: req.user._id, chatId, isActive: true },
      { isActive: false, rotatedAt: new Date() }
    );

    // Create new key record
    const encryptionKey = new EncryptionKey({
      userId: req.user._id,
      chatId,
      keyType: 'public',
      keyFormat: 'base64',
      encryptedKey: keyPair.publicKeyBase64,
      keyFingerprint: fingerprint,
      algorithm: 'curve25519',
      isActive: true,
    });

    await encryptionKey.save();

    logger.info(`Encryption keys generated for user ${req.user._id} in chat ${chatId}`);
    res.json({
      publicKey: keyPair.publicKeyBase64,
      privateKey: keyPair.privateKeyBase64,
      fingerprint,
      keyId: encryptionKey._id,
    });
  } catch (err) {
    next(err);
  }
});

// Get encryption keys for chat
router.get('/encryption/keys/:chatId', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    // Check if user is in chat
    const chat = await Chat.findById(chatId);
    if (!chat || !arrayHasObjectId(chat.participants, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized for this chat' });
    }

    // Get active keys for all participants
    const keys = await EncryptionKey.find({
      chatId,
      isActive: true,
    }).populate('userId', 'name avatar');

    res.json({ keys });
  } catch (err) {
    next(err);
  }
});

// Encrypt message
router.post('/encryption/encrypt', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { message, recipientPublicKey } = req.body;

    if (!message || !recipientPublicKey) {
      return res.status(400).json({ message: 'Message and recipient public key required' });
    }

    const encrypted = encryptMessage(message, recipientPublicKey);

    res.json({
      encryptedMessage: encrypted.encryptedMessageBase64,
      nonce: encrypted.nonceBase64,
      algorithm: encrypted.algorithm,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/encryption/status/:chatId', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat || !arrayHasObjectId(chat.participants, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized for this chat' });
    }

    const settings = await MessagingSettings.findOne({ userId: req.user._id });

    res.json({
      enabled: Boolean(settings?.encryption?.enabled),
      algorithm: settings?.encryption?.algorithm || 'curve25519',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/encryption/toggle', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatId, enabled } = req.body;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat || !arrayHasObjectId(chat.participants, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized for this chat' });
    }

    const settings = await MessagingSettings.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          'encryption.enabled': Boolean(enabled),
        },
      },
      {
        new: true,
        upsert: true,
      }
    );

    res.json({
      enabled: Boolean(settings?.encryption?.enabled),
      algorithm: settings?.encryption?.algorithm || 'curve25519',
    });
  } catch (err) {
    next(err);
  }
});

// Decrypt message
router.post('/encryption/decrypt', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { encryptedMessage, nonce, senderPublicKey, recipientPrivateKey } = req.body;

    if (!encryptedMessage || !nonce || !senderPublicKey || !recipientPrivateKey) {
      return res.status(400).json({ message: 'All encryption parameters required' });
    }

    const decrypted = decryptMessage(encryptedMessage, nonce, senderPublicKey, recipientPrivateKey);

    res.json({ message: decrypted });
  } catch (err) {
    next(err);
  }
});

// ============ FILE STORAGE ROUTES ============

// Upload file to S3
router.post('/files/upload', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatId, fileName, fileSize, mimeType, fileData } = req.body;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    if (!fileName || !fileData) {
      return res.status(400).json({ message: 'File name and data required' });
    }

    // Check if user is in chat
    const chat = await Chat.findById(chatId);
    if (!chat || !arrayHasObjectId(chat.participants, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized for this chat' });
    }

    const s3Key = generateS3Key(req.user._id, chatId, fileName);

    // Upload to S3
    const uploadResult = await uploadToS3(Buffer.from(fileData, 'base64'), s3Key, {
      contentType: mimeType,
      metadata: {
        uploadedBy: req.user._id.toString(),
        chatId: chatId,
        originalName: fileName,
      },
    });

    const publicFileUrl = uploadResult.s3Url || (
      uploadResult.publicUrlPath
        ? `${req.protocol}://${req.get('host')}${uploadResult.publicUrlPath}`
        : ''
    );

    // Create file record
    const fileRecord = new FileStorage({
      uploadedBy: req.user._id,
      chatId,
      fileName,
      originalFileName: fileName,
      fileSize,
      fileType: String(mimeType || '').split('/')[0] || 'file',
      mimeType,
      s3Key,
      s3Url: publicFileUrl,
      status: 'completed',
    });

    await fileRecord.save();

    logger.info(`File uploaded: ${fileName} by ${req.user._id} in chat ${chatId}`);
    res.json({
      file: fileRecord,
      uploadUrl: publicFileUrl,
    });
  } catch (err) {
    next(err);
  }
});

// Get signed URL for file download
router.get('/files/:fileId/download', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { fileId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ message: 'Invalid file ID' });
    }

    const file = await FileStorage.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if user has access to the chat
    const chat = await Chat.findById(file.chatId);
    if (!chat || !arrayHasObjectId(chat.participants, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to access this file' });
    }

    // Generate signed URL
    const generatedUrl = generateSignedUrl(file.s3Key, 3600); // 1 hour expiry
    const signedUrl = generatedUrl.startsWith('/uploads/')
      ? `${req.protocol}://${req.get('host')}${generatedUrl}`
      : generatedUrl;

    res.json({
      fileName: file.fileName,
      downloadUrl: signedUrl,
      expiresIn: 3600,
    });
  } catch (err) {
    next(err);
  }
});

// Delete file
router.delete('/files/:fileId', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { fileId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ message: 'Invalid file ID' });
    }

    const file = await FileStorage.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if user uploaded the file
    if (!file.uploadedBy.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to delete this file' });
    }

    // Delete from S3
    await deleteFromS3(file.s3Key);

    // Mark as deleted (soft delete)
    file.isDeleted = true;
    file.deletedAt = new Date();
    await file.save();

    logger.info(`File deleted: ${fileId} by ${req.user._id}`);
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Get files for chat
router.get('/files/chat/:chatId', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    // Check if user is in chat
    const chat = await Chat.findById(chatId);
    if (!chat || !arrayHasObjectId(chat.participants, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized for this chat' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 50);

    const files = await FileStorage.find({
      chatId,
      isDeleted: false,
    })
      .populate('uploadedBy', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    const total = await FileStorage.countDocuments({
      chatId,
      isDeleted: false,
    });

    res.json({
      files,
      pagination: {
        total,
        page: parseInt(page),
        limit: pageLimit,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============ AI REPLIES ROUTES ============

// Generate AI smart replies
router.post('/ai/replies/generate', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatId, messageId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid chat or message ID' });
    }

    // Check if user is in chat
    const chat = await Chat.findById(chatId);
    if (!chat || !arrayHasObjectId(chat.participants, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized for this chat' });
    }

    // Get recent messages for context
    const recentMessages = await Message.find({
      chatId,
      isDeleted: false,
    })
      .populate('senderId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get user settings
    const settings = await MessagingSettings.findOne({ userId: req.user._id });

    // Real AI suggestions via aiChat.js
    const suggestions = await generateAISuggestions(recentMessages, settings?.ai?.suggestionTone || 'casual');

    // Save AI reply record
    const aiReply = new AIReply({
      chatId,
      messageId,
      suggestedBy: req.user._id,
      suggestions,
      context: {
        conversationLength: recentMessages.length,
        previousMessages: recentMessages.length,
        topicKeywords: extractKeywords(recentMessages),
      },
      model: 'gpt-3.5-turbo',
      generationTime: Math.random() * 1000 + 500, // Mock timing
      tokensUsed: Math.floor(Math.random() * 100) + 50,
    });

    await aiReply.save();

    logger.info(`AI replies generated for message ${messageId} in chat ${chatId}`);
    res.json({
      suggestions: aiReply.suggestions,
      replyId: aiReply._id,
    });
  } catch (err) {
    next(err);
  }
});

// Get AI reply suggestions
router.get('/ai/replies/:messageId', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }

    const aiReply = await AIReply.findOne({
      messageId,
      expiresAt: { $gt: new Date() },
    });

    if (!aiReply) {
      return res.status(404).json({ message: 'AI suggestions not found or expired' });
    }

    res.json({ suggestions: aiReply.suggestions });
  } catch (err) {
    next(err);
  }
});

// Rate AI suggestion
router.post('/ai/replies/:replyId/rate', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { replyId } = req.params;
    const { suggestionId, rating } = req.body;

    if (!mongoose.Types.ObjectId.isValid(replyId)) {
      return res.status(400).json({ message: 'Invalid reply ID' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const aiReply = await AIReply.findById(replyId);
    if (!aiReply) {
      return res.status(404).json({ message: 'AI reply not found' });
    }

    // Update rating
    const suggestion = aiReply.suggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      suggestion.userRating = rating;
    }

    await aiReply.save();

    res.json({ message: 'Rating saved successfully' });
  } catch (err) {
    next(err);
  }
});

// ============ SETTINGS ROUTES ============

// Get messaging settings
router.get('/settings', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    let settings = await MessagingSettings.findOne({ userId: req.user._id });

    if (!settings) {
      settings = new MessagingSettings({ userId: req.user._id });
      await settings.save();
    }

    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

// Update messaging settings
router.put('/settings', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const updateData = req.body;

    // Validate settings structure
    const allowedFields = [
      'encryption', 'fileStorage', 'ai', 'calls', 'notifications', 'privacy', 'performance', 'dataRetention'
    ];

    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    const settings = await MessagingSettings.findOneAndUpdate(
      { userId: req.user._id },
      filteredData,
      { new: true, upsert: true }
    );

    logger.info(`Messaging settings updated for user ${req.user._id}`);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

// ============ CHATROOM ROUTES ============

const Chatroom = require('../models/Chatroom');

// Create a new chatroom
router.post('/chatrooms', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { name, description, isPrivate, tags } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Chatroom name is required' });
    }

    const chatroom = new Chatroom({
      name: name.trim(),
      description: description ? description.trim() : '',
      isPrivate: Boolean(isPrivate),
      createdBy: req.user._id,
      admins: [req.user._id],
      members: [req.user._id],
      tags: tags ? tags.map(t => t.toLowerCase()) : [],
    });

    await chatroom.save();
    await chatroom.populate('createdBy', 'name username avatar');

    logger.info(`Chatroom created: ${chatroom._id} by ${req.user._id}`);
    res.status(201).json({ chatroom });
  } catch (err) {
    next(err);
  }
});

// Get public chatrooms (paginated & searchable)
router.get('/chatrooms/public/list', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, tags } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 100);

    let query = {
      isPrivate: false,
      isActive: true,
    };

    if (search) {
      query.$text = { $search: search };
    }

    if (tags) {
      const tagArray = tags.split(',').map(t => t.toLowerCase().trim());
      query.tags = { $in: tagArray };
    }

    const chatrooms = await Chatroom.find(query)
      .populate('createdBy', 'name username avatar')
      .sort({ memberCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    const total = await Chatroom.countDocuments(query);

    res.json({
      chatrooms,
      pagination: {
        total,
        page: parseInt(page),
        limit: pageLimit,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get user's chatrooms
router.get('/chatrooms/my-rooms', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const chatrooms = await Chatroom.find({
      members: req.user._id,
      isActive: true,
    })
      .populate('createdBy', 'name username avatar')
      .populate('admins', 'name username avatar')
      .sort({ lastMessageAt: -1 });

    res.json({ chatrooms });
  } catch (err) {
    next(err);
  }
});

// Get chatroom details
router.get('/chatrooms/:chatroomId', authenticate, async (req, res, next) => {
  try {
    const { chatroomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatroomId)) {
      return res.status(400).json({ message: 'Invalid chatroom ID' });
    }

    const chatroom = await Chatroom.findById(chatroomId)
      .populate('createdBy', 'name username avatar')
      .populate('admins', 'name username avatar')
      .populate('members', 'name username avatar');

    if (!chatroom) {
      return res.status(404).json({ message: 'Chatroom not found' });
    }

    // For private rooms, only allow members to view details
    if (chatroom.isPrivate && !chatroom.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const isMember = chatroom.members.some(m => m._id.equals(req.user._id));
    const isAdmin = chatroom.admins.some(a => a._id.equals(req.user._id));

    res.json({ 
      chatroom,
      isMember,
      isAdmin,
    });
  } catch (err) {
    next(err);
  }
});

// Join public chatroom
router.post('/chatrooms/:chatroomId/join', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatroomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatroomId)) {
      return res.status(400).json({ message: 'Invalid chatroom ID' });
    }

    const chatroom = await Chatroom.findById(chatroomId);

    if (!chatroom) {
      return res.status(404).json({ message: 'Chatroom not found' });
    }

    // Check if private
    if (chatroom.isPrivate) {
      return res.status(403).json({ message: 'This is a private chatroom. Please request access.' });
    }

    // Check if already member
    if (chatroom.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already a member of this chatroom' });
    }

    // Check if blocked
    if (chatroom.blockedMembers.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are blocked from joining this chatroom' });
    }

    // Check max members
    if (chatroom.maxMembers > 0 && chatroom.memberCount >= chatroom.maxMembers) {
      return res.status(403).json({ message: 'Chatroom is full' });
    }

    chatroom.members.push(req.user._id);
    chatroom.memberCount = chatroom.members.length;
    await chatroom.save();

    await chatroom.populate('createdBy', 'name username avatar');

    logger.info(`User ${req.user._id} joined public chatroom ${chatroomId}`);
    res.json({ 
      chatroom,
      message: 'Successfully joined chatroom',
    });
  } catch (err) {
    next(err);
  }
});

// Request to join private chatroom
router.post('/chatrooms/:chatroomId/request-join', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatroomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatroomId)) {
      return res.status(400).json({ message: 'Invalid chatroom ID' });
    }

    const chatroom = await Chatroom.findById(chatroomId);

    if (!chatroom) {
      return res.status(404).json({ message: 'Chatroom not found' });
    }

    // Check if not private
    if (!chatroom.isPrivate) {
      return res.status(400).json({ message: 'Use /join endpoint for public chatrooms' });
    }

    // Check if already member
    if (chatroom.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already a member' });
    }

    // Check if blocked
    if (chatroom.blockedMembers.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are blocked from this chatroom' });
    }

    // Check if already requested
    const existingRequest = chatroom.pendingRequests.find(r => r.userId.equals(req.user._id));
    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return res.status(400).json({ message: 'You already have a pending request' });
      }
      if (existingRequest.status === 'rejected') {
        return res.status(400).json({ message: 'Your previous request was rejected' });
      }
    }

    chatroom.pendingRequests.push({
      userId: req.user._id,
      requestedAt: new Date(),
      status: 'pending',
    });

    chatroom.stats.totalJoinRequests += 1;
    await chatroom.save();

    logger.info(`User ${req.user._id} requested to join private chatroom ${chatroomId}`);
    
    // Notify admins
    for (const adminId of chatroom.admins) {
      emitToUser(adminId.toString(), 'chatroom-join-request', {
        chatroomId: chatroom._id,
        chatroomName: chatroom.name,
        userId: req.user._id,
        userName: req.user.name,
      });
    }

    res.json({ message: 'Join request sent. Waiting for admin approval.' });
  } catch (err) {
    next(err);
  }
});

// Get pending requests (admin only)
router.get('/chatrooms/:chatroomId/pending-requests', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatroomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatroomId)) {
      return res.status(400).json({ message: 'Invalid chatroom ID' });
    }

    const chatroom = await Chatroom.findById(chatroomId);

    if (!chatroom) {
      return res.status(404).json({ message: 'Chatroom not found' });
    }

    // Check if admin
    if (!chatroom.admins.includes(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can view pending requests' });
    }

    await chatroom.populate('pendingRequests.userId', 'name username avatar email');

    const pendingOnly = chatroom.pendingRequests.filter(r => r.status === 'pending');

    res.json({ pendingRequests: pendingOnly });
  } catch (err) {
    next(err);
  }
});

// Approve join request (admin)
router.post('/chatrooms/:chatroomId/approve-request/:userId', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatroomId, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatroomId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid IDs' });
    }

    const chatroom = await Chatroom.findById(chatroomId);

    if (!chatroom) {
      return res.status(404).json({ message: 'Chatroom not found' });
    }

    // Check if admin
    if (!chatroom.admins.includes(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can approve requests' });
    }

    // Find request
    const requestIndex = chatroom.pendingRequests.findIndex(r => r.userId.equals(userId));
    if (requestIndex === -1) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check max members
    if (chatroom.maxMembers > 0 && chatroom.memberCount >= chatroom.maxMembers) {
      return res.status(403).json({ message: 'Chatroom is full' });
    }

    // Update request status and add to members
    chatroom.pendingRequests[requestIndex].status = 'approved';
    if (!chatroom.members.includes(userId)) {
      chatroom.members.push(userId);
      chatroom.memberCount = chatroom.members.length;
    }

    await chatroom.save();

    logger.info(`Admin ${req.user._id} approved ${userId} for chatroom ${chatroomId}`);

    // Notify user
    emitToUser(userId, 'chatroom-request-approved', {
      chatroomId: chatroom._id,
      chatroomName: chatroom.name,
    });

    res.json({ message: 'Request approved. User added to chatroom.' });
  } catch (err) {
    next(err);
  }
});

// Reject join request (admin)
router.post('/chatrooms/:chatroomId/reject-request/:userId', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatroomId, userId } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(chatroomId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid IDs' });
    }

    const chatroom = await Chatroom.findById(chatroomId);

    if (!chatroom) {
      return res.status(404).json({ message: 'Chatroom not found' });
    }

    // Check if admin
    if (!chatroom.admins.includes(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can reject requests' });
    }

    // Find and update request
    const requestIndex = chatroom.pendingRequests.findIndex(r => r.userId.equals(userId));
    if (requestIndex === -1) {
      return res.status(404).json({ message: 'Request not found' });
    }

    chatroom.pendingRequests[requestIndex].status = 'rejected';
    await chatroom.save();

    logger.info(`Admin ${req.user._id} rejected ${userId} for chatroom ${chatroomId}`);

    // Notify user
    emitToUser(userId, 'chatroom-request-rejected', {
      chatroomId: chatroom._id,
      chatroomName: chatroom.name,
      reason: reason || 'Your request was rejected',
    });

    res.json({ message: 'Request rejected' });
  } catch (err) {
    next(err);
  }
});

// Leave chatroom
router.post('/chatrooms/:chatroomId/leave', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatroomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatroomId)) {
      return res.status(400).json({ message: 'Invalid chatroom ID' });
    }

    const chatroom = await Chatroom.findById(chatroomId);

    if (!chatroom) {
      return res.status(404).json({ message: 'Chatroom not found' });
    }

    // Remove user from members
    const index = chatroom.members.findIndex(m => m.equals(req.user._id));
    if (index === -1) {
      return res.status(400).json({ message: 'Not a member of this chatroom' });
    }

    chatroom.members.splice(index, 1);
    chatroom.memberCount = chatroom.members.length;

    // If creator leaves, promote first admin (if exists)
    if (chatroom.createdBy.equals(req.user._id) && chatroom.members.length > 0) {
      if (chatroom.admins.length === 1) {
        chatroom.createdBy = chatroom.members[0];
      }
      const adminIndex = chatroom.admins.findIndex(a => a.equals(req.user._id));
      if (adminIndex !== -1) {
        chatroom.admins.splice(adminIndex, 1);
      }
    } else {
      // Remove from admins if applicable
      const adminIndex = chatroom.admins.findIndex(a => a.equals(req.user._id));
      if (adminIndex !== -1) {
        chatroom.admins.splice(adminIndex, 1);
      }
    }

    // Deactivate room if no members
    if (chatroom.members.length === 0) {
      chatroom.isActive = false;
    }

    await chatroom.save();

    logger.info(`User ${req.user._id} left chatroom ${chatroomId}`);
    res.json({ message: 'Left chatroom successfully' });
  } catch (err) {
    next(err);
  }
});

// Update chatroom (admin only)
router.put('/chatrooms/:chatroomId', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatroomId } = req.params;
    const { name, description, tags, settings } = req.body;

    if (!mongoose.Types.ObjectId.isValid(chatroomId)) {
      return res.status(400).json({ message: 'Invalid chatroom ID' });
    }

    const chatroom = await Chatroom.findById(chatroomId);

    if (!chatroom) {
      return res.status(404).json({ message: 'Chatroom not found' });
    }

    // Check if admin
    if (!chatroom.admins.includes(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can update chatroom' });
    }

    if (name) chatroom.name = name.trim();
    if (description) chatroom.description = description.trim();
    if (tags) chatroom.tags = tags.map(t => t.toLowerCase());
    if (settings) chatroom.settings = { ...chatroom.settings, ...settings };

    await chatroom.save();

    logger.info(`Chatroom ${chatroomId} updated by admin ${req.user._id}`);
    res.json({ chatroom, message: 'Chatroom updated successfully' });
  } catch (err) {
    next(err);
  }
});

// Block member from chatroom (admin)
router.post('/chatrooms/:chatroomId/block-member/:userId', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatroomId, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatroomId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid IDs' });
    }

    const chatroom = await Chatroom.findById(chatroomId);

    if (!chatroom) {
      return res.status(404).json({ message: 'Chatroom not found' });
    }

    // Check if admin
    if (!chatroom.admins.includes(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can block members' });
    }

    // Add to blocked
    if (!chatroom.blockedMembers.includes(userId)) {
      chatroom.blockedMembers.push(userId);
    }

    // Remove from members and admins
    chatroom.members = chatroom.members.filter(m => !m.equals(userId));
    chatroom.admins = chatroom.admins.filter(a => !a.equals(userId));
    chatroom.memberCount = chatroom.members.length;

    await chatroom.save();

    logger.info(`User ${userId} blocked from chatroom ${chatroomId}`);
    res.json({ message: 'Member blocked successfully' });
  } catch (err) {
    next(err);
  }
});

// Delete chatroom (admin only)
router.delete('/chatrooms/:chatroomId', authenticate, attachMessagingUser, async (req, res, next) => {
  try {
    const { chatroomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatroomId)) {
      return res.status(400).json({ message: 'Invalid chatroom ID' });
    }

    const chatroom = await Chatroom.findById(chatroomId);

    if (!chatroom) {
      return res.status(404).json({ message: 'Chatroom not found' });
    }

    // Check if creator
    if (!chatroom.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only creator can delete chatroom' });
    }

    // Soft delete
    chatroom.isActive = false;
    await chatroom.save();

    logger.info(`Chatroom ${chatroomId} deleted by creator ${req.user._id}`);
    res.json({ message: 'Chatroom deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ============ HELPER FUNCTIONS ============

// Extract keywords from messages
function extractKeywords(messages) {
  const keywords = new Set();
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);

  messages.forEach(msg => {
    if (msg.content) {
      const words = msg.content.toLowerCase().split(/\W+/);
      words.forEach(word => {
        if (word.length > 3 && !commonWords.has(word)) {
          keywords.add(word);
        }
      });
    }
  });

  return Array.from(keywords).slice(0, 10);
}

module.exports = router;
