const Chat = require('../models/Chat');
const Message = require('../models/Message');
const ChatNotification = require('../models/ChatNotification');
const User = require('../models/User');
const { sendSMS, sendWhatsApp } = require('./smsService');
const logger = require('../utils/logger');

const createOrGetDirectChat = async (userId, otherUserId) => {
  let chat = await Chat.findOne({
    type: 'direct',
    participants: { $all: [userId, otherUserId] },
  });

  if (!chat) {
    chat = await Chat.create({
      type: 'direct',
      participants: [userId, otherUserId],
      lastMessageAt: new Date(),
    });
  }

  return chat;
};

const sendLinkUpMessage = async ({ senderId, recipientId, content }) => {
  const chat = await createOrGetDirectChat(senderId, recipientId);

  const message = await Message.create({
    chatId: chat._id,
    senderId,
    messageType: 'text',
    content,
    deliveryStatus: [
      { userId: senderId, status: 'seen', seenAt: new Date() },
      { userId: recipientId, status: 'sent', deliveredAt: new Date() },
    ],
  });

  chat.lastMessage = message._id;
  chat.lastMessageAt = new Date();
  await chat.save();

  await ChatNotification.create({
    userId: recipientId,
    messageId: message._id,
    chatId: chat._id,
    senderId,
    notificationType: 'message',
    title: 'LinkUp message received',
    body: String(content || '').substring(0, 120),
  });

  return message;
};

module.exports = {
  sendLinkUpMessage,
  sendSMS,
  sendWhatsApp,
};
