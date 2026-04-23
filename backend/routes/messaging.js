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
const { generateKeyPair, encryptMessage, decryptMessage, generateKeyFingerprint } = require('../utils/encryption');
const { uploadToS3, generateSignedUrl, deleteFromS3 } = require('../utils/s3Storage');
const { generateAISuggestions } = require('../utils/aiChat');
const { emitToUser } = require('../config/websocket');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

const normalizeObjectId = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value._id) {
    return normalizeObjectId(value._id);
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

// ============ CHAT ROUTES ============

// Create or get direct chat with another user
router.post('/chats/direct', authenticate, async (req, res, next) => {
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
router.post('/chats/group', authenticate, async (req, res, next) => {
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
router.get('/chats', authenticate, async (req, res, next) => {
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
router.get('/chats/:chatId', authenticate, async (req, res, next) => {
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
router.put('/chats/:chatId', authenticate, async (req, res, next) => {
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
router.post('/chats/:chatId/members', authenticate, async (req, res, next) => {
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
router.delete('/chats/:chatId/members/:userId', authenticate, async (req, res, next) => {
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
router.post('/messages', authenticate, async (req, res, next) => {
  try {
    const { chatId, content, messageType, media, replyTo } = req.body;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    if (messageType === 'text' && (!content || !content.trim())) {
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

    const message = new Message({
      chatId,
      senderId: req.user._id,
      messageType,
      content: content ? content.trim() : '',
      media: media || undefined,
      replyTo: replyTo && mongoose.Types.ObjectId.isValid(replyTo) ? replyTo : undefined,
      deliveryStatus: chat.participants.map((userId) => ({
        userId,
        status: userId.equals(req.user._id) ? 'seen' : 'sent',
        seenAt: userId.equals(req.user._id) ? new Date() : undefined,
        deliveredAt: userId.equals(req.user._id) ? new Date() : undefined,
      })),
    });

    await message.save();
    await message.populate('senderId', 'name avatar email');

    // Update chat's last message
    chat.lastMessage = message._id;
    chat.lastMessageAt = new Date();
    await chat.save();

    await emitToChatParticipants(chatId, 'message:received', message, req.user._id);

    // Create notifications for other participants
    for (const participant of chat.participants) {
      if (!participant.equals(req.user._id)) {
        const notification = new ChatNotification({
          userId: participant,
          messageId: message._id,
          chatId,
          senderId: req.user._id,
          notificationType: 'message',
          title: `New message from ${req.user.name || 'User'}`,
          body: content ? content.substring(0, 100) : `[${messageType}]`,
        });
        await notification.save();
        emitToUser(participant, 'notification:received', notification.toObject());
      }
    }

    logger.info(`Message sent in chat ${chatId} by ${req.user._id}`);
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
});

// Get messages from a chat
router.get('/messages/:chatId', authenticate, async (req, res, next) => {
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
router.put('/messages/:messageId/read', authenticate, async (req, res, next) => {
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
router.put('/chats/:chatId/mark-read', authenticate, async (req, res, next) => {
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
router.put('/messages/:messageId', authenticate, async (req, res, next) => {
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
router.delete('/messages/:messageId', authenticate, async (req, res, next) => {
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

// Add reaction to message
router.post('/messages/:messageId/reactions', authenticate, async (req, res, next) => {
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
router.get('/search/messages', authenticate, async (req, res, next) => {
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
router.get('/contacts', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, favorite } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 100);

    let query = {
      userId: req.user._id,
      isBlocked: false,
    };

    if (favorite === 'true') {
      query.isFavorite = true;
    }

    const contacts = await Contact.find(query)
      .populate('contactUserId', 'name avatar email status')
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
router.post('/contacts', authenticate, async (req, res, next) => {
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
router.put('/contacts/:contactUserId/block', authenticate, async (req, res, next) => {
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
router.put('/contacts/:contactUserId/unblock', authenticate, async (req, res, next) => {
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

// Delete contact
router.delete('/contacts/:contactUserId', authenticate, async (req, res, next) => {
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
router.get('/notifications', authenticate, async (req, res, next) => {
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
router.put('/notifications/:notificationId/read', authenticate, async (req, res, next) => {
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
router.put('/notifications/mark-all-read', authenticate, async (req, res, next) => {
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
router.get('/stats', authenticate, async (req, res, next) => {
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
router.post('/calls/initiate', authenticate, async (req, res, next) => {
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
router.post('/calls/:callId/accept', authenticate, async (req, res, next) => {
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
router.post('/calls/:callId/decline', authenticate, async (req, res, next) => {
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
router.post('/calls/:callId/end', authenticate, async (req, res, next) => {
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
router.get('/calls/history', authenticate, async (req, res, next) => {
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
router.post('/encryption/keys/generate', authenticate, async (req, res, next) => {
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
router.get('/encryption/keys/:chatId', authenticate, async (req, res, next) => {
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
router.post('/encryption/encrypt', authenticate, async (req, res, next) => {
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

router.get('/encryption/status/:chatId', authenticate, async (req, res, next) => {
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

router.post('/encryption/toggle', authenticate, async (req, res, next) => {
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
router.post('/encryption/decrypt', authenticate, async (req, res, next) => {
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
router.post('/files/upload', authenticate, async (req, res, next) => {
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

    // Generate S3 key
    const s3Key = `messages/${req.user._id}/${chatId}/${Date.now()}-${fileName}`;

    // Upload to S3
    const uploadResult = await uploadToS3(Buffer.from(fileData, 'base64'), s3Key, {
      contentType: mimeType,
      metadata: {
        uploadedBy: req.user._id.toString(),
        chatId: chatId,
        originalName: fileName,
      },
    });

    // Create file record
    const fileRecord = new FileStorage({
      uploadedBy: req.user._id,
      chatId,
      fileName,
      originalFileName: fileName,
      fileSize,
      mimeType,
      s3Key,
      s3Url: uploadResult.s3Url,
      status: 'completed',
    });

    await fileRecord.save();

    logger.info(`File uploaded: ${fileName} by ${req.user._id} in chat ${chatId}`);
    res.json({
      file: fileRecord,
      uploadUrl: uploadResult.s3Url,
    });
  } catch (err) {
    next(err);
  }
});

// Get signed URL for file download
router.get('/files/:fileId/download', authenticate, async (req, res, next) => {
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
    const signedUrl = generateSignedUrl(file.s3Key, 3600); // 1 hour expiry

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
router.delete('/files/:fileId', authenticate, async (req, res, next) => {
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
router.get('/files/chat/:chatId', authenticate, async (req, res, next) => {
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
router.post('/ai/replies/generate', authenticate, async (req, res, next) => {
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
router.get('/ai/replies/:messageId', authenticate, async (req, res, next) => {
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
router.post('/ai/replies/:replyId/rate', authenticate, async (req, res, next) => {
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
router.get('/settings', authenticate, async (req, res, next) => {
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
router.put('/settings', authenticate, async (req, res, next) => {
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
