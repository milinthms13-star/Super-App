import axios from "axios";
import { buildApiUrl } from "../utils/api";
import { getStoredAuthToken } from "../utils/auth";

const API_BASE_URL = buildApiUrl("/messaging");

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = getStoredAuthToken() || localStorage.getItem("token") || "";
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || "");
      const base64 = raw.includes(",") ? raw.split(",")[1] : raw;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });

const normalizeChatId = (chat) => String(chat?._id || chat?.id || "");

export const messagingService = {
  async getChats(filters = {}) {
    const { data } = await api.get("/chats", { params: filters });
    return Array.isArray(data?.chats) ? data.chats : [];
  },

  async getChat(chatId) {
    const { data } = await api.get(`/chats/${chatId}`);
    return data?.chat || null;
  },

  async createDirectChat(otherUserId) {
    const { data } = await api.post("/chats/direct", { otherUserId });
    return data?.chat || null;
  },

  async createGroupChat({ groupName, participantIds = [], groupIcon = '', groupDescription = '' }) {
    const { data } = await api.post("/chats/group", {
      groupName,
      participantIds,
      groupIcon,
      groupDescription,
    });
    return data?.chat || null;
  },

  async updateChat(chatId, updates = {}) {
    const { data } = await api.put(`/chats/${chatId}`, updates);
    return data?.chat || null;
  },

  async addGroupMember(chatId, userId) {
    const { data } = await api.post(`/chats/${chatId}/members`, { userId });
    return data?.chat || null;
  },

  async removeGroupMember(chatId, userId) {
    const { data } = await api.delete(`/chats/${chatId}/members/${userId}`);
    return data?.chat || null;
  },

  async exportChat(chatId, format = 'json') {
    const response = await api.get(`/chats/${chatId}/export`, {
      params: { format },
      responseType: format === 'txt' ? 'text' : 'json',
    });
    return response.data;
  },

  async getMessages(chatId, page = 1, limit = 30) {
    const { data } = await api.get(`/messages/${chatId}`, {
      params: { page, limit },
    });
    return {
      messages: Array.isArray(data?.messages) ? data.messages : [],
      pagination: data?.pagination || null,
    };
  },

  async sendMessage({ chatId, content, messageType = 'text', media, replyTo, clientMessageId }) {
    const resolvedClientMessageId =
      clientMessageId ||
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`);

    const payload = {
      chatId,
      content,
      messageType,
      media,
      replyTo,
      clientMessageId: resolvedClientMessageId,
    };

    const { data } = await api.post('/messages', payload);
    return data?.message;
  },

  async markChatRead(chatId) {
    const { data } = await api.put(`/chats/${chatId}/mark-read`);
    return data;
  },

  async markMessageRead(messageId) {
    const { data } = await api.put(`/messages/${messageId}/read`);
    return data;
  },

  async markAllChatRead(chatId) {
    const { data } = await api.put(`/chats/${chatId}/mark-read`);
    return data;
  },

  async editMessage(messageId, content) {
    const { data } = await api.put(`/messages/${messageId}`, { content });
    return data?.message;
  },

  async deleteMessage(messageId) {
    const { data } = await api.delete(`/messages/${messageId}`);
    return data;
  },

  async clearChatMessages(chatId) {
    const { data } = await api.delete(`/chats/${chatId}/messages`);
    return data;
  },

  async toggleMessageReaction(messageId, emoji) {
    const { data } = await api.post(`/messages/${messageId}/reactions`, { emoji });
    return data?.message;
  },

  async toggleMessageImportant(messageId) {
    const { data } = await api.put(`/messages/${messageId}/important`);
    return data?.message;
  },

  async searchMessages(query, chatId, page = 1, limit = 20) {
    const { data } = await api.get('/search/messages', {
      params: { query, chatId, page, limit },
    });
    return {
      messages: Array.isArray(data?.messages) ? data.messages : [],
      pagination: data?.pagination || null,
    };
  },

  async listContacts(filters = {}) {
    const { data } = await api.get('/contacts', { params: filters });
    return {
      contacts: Array.isArray(data?.contacts) ? data.contacts : [],
      pagination: data?.pagination || null,
    };
  },

  async addContact(contactUserId, displayName = '', category = 'personal') {
    const { data } = await api.post('/contacts', { contactUserId, displayName, category });
    return data?.contact;
  },

  async updateContactCategory(contactUserId, category) {
    const { data } = await api.put(`/contacts/${contactUserId}/category`, { category });
    return data?.contact;
  },

  async blockContact(contactUserId) {
    const { data } = await api.put(`/contacts/${contactUserId}/block`);
    return data?.contact;
  },

  async unblockContact(contactUserId) {
    const { data } = await api.put(`/contacts/${contactUserId}/unblock`);
    return data?.contact;
  },

  async toggleFavoriteContact(contactUserId) {
    const { data } = await api.put(`/contacts/${contactUserId}/favorite`);
    return data;
  },

  async updateFamilyAccess(contactUserId, camera, location) {
    const { data } = await api.put(`/contacts/${contactUserId}/family-access`, {
      camera,
      location,
    });
    return data?.contact;
  },

  async addScheduledBlock(contactUserId, blockData = {}) {
    const { data } = await api.post(`/contacts/${contactUserId}/scheduled-block`, blockData);
    return data;
  },

  async getScheduledBlocks(contactUserId) {
    const { data } = await api.get(`/contacts/${contactUserId}/scheduled-blocks`);
    return Array.isArray(data?.scheduledBlocks) ? data.scheduledBlocks : [];
  },

  async updateScheduledBlock(contactUserId, blockId, patch = {}) {
    const { data } = await api.put(`/contacts/${contactUserId}/scheduled-block/${blockId}`, patch);
    return data;
  },

  async deleteScheduledBlock(contactUserId, blockId) {
    const { data } = await api.delete(`/contacts/${contactUserId}/scheduled-block/${blockId}`);
    return data;
  },

  async deleteContact(contactUserId) {
    const { data } = await api.delete(`/contacts/${contactUserId}`);
    return data;
  },

  async getNotifications(filters = {}) {
    const { data } = await api.get('/notifications', { params: filters });
    return {
      notifications: Array.isArray(data?.notifications) ? data.notifications : [],
      pagination: data?.pagination || null,
      unreadCount: Number(data?.unreadCount || 0),
    };
  },

  async markNotificationRead(notificationId) {
    const { data } = await api.put(`/notifications/${notificationId}/read`);
    return data?.notification;
  },

  async markAllNotificationsRead() {
    const { data } = await api.put('/notifications/mark-all-read');
    return data;
  },

  async getStats() {
    const { data } = await api.get('/stats');
    return data || {};
  },

  async getIceServers() {
    const { data } = await api.get('/calls/ice-servers');
    return data?.data || {};
  },

  async initiateCall({ chatId, recipientId, callType }) {
    const { data } = await api.post('/calls/initiate', { chatId, recipientId, callType });
    return data?.call;
  },

  async acceptCall(callId, sdpAnswer) {
    const { data } = await api.post(`/calls/${callId}/accept`, { sdpAnswer });
    return data?.call;
  },

  async declineCall(callId, reason) {
    const { data } = await api.post(`/calls/${callId}/decline`, { reason });
    return data?.call;
  },

  async endCall(callId) {
    const { data } = await api.post(`/calls/${callId}/end`);
    return data?.call;
  },

  async getCallHistory(page = 1, limit = 20) {
    const { data } = await api.get('/calls/history', { params: { page, limit } });
    return {
      calls: Array.isArray(data?.calls) ? data.calls : [],
      pagination: data?.pagination || null,
    };
  },

  async generateEncryptionKeys(chatId) {
    const { data } = await api.post('/encryption/keys/generate', { chatId });
    return data || {};
  },

  async getEncryptionKeys(chatId) {
    const { data } = await api.get(`/encryption/keys/${chatId}`);
    return Array.isArray(data?.keys) ? data.keys : [];
  },

  async getEncryptionStatus(chatId) {
    const { data } = await api.get(`/encryption/status/${chatId}`);
    return data || {};
  },

  async toggleEncryption(chatId, enabled) {
    const { data } = await api.post('/encryption/toggle', { chatId, enabled });
    return data || {};
  },

  async encryptMessage(message, recipientPublicKey) {
    const { data } = await api.post('/encryption/encrypt', {
      message,
      recipientPublicKey,
    });
    return data || {};
  },

  async decryptMessage(encryptedMessage, nonce, senderPublicKey, recipientPrivateKey) {
    const { data } = await api.post('/encryption/decrypt', {
      encryptedMessage,
      nonce,
      senderPublicKey,
      recipientPrivateKey,
    });
    return data?.message || '';
  },

  async uploadFile(chatId, file) {
    const fileData = await toBase64(file);
    const payload = {
      chatId,
      fileName: file.name,
      fileSize: Number(file.size || 0),
      mimeType: file.type || 'application/octet-stream',
      fileData,
    };

    const { data } = await api.post('/files/upload', payload);
    return data?.file;
  },

  async getFileDownloadUrl(fileId) {
    const { data } = await api.get(`/files/${fileId}/download`);
    return data || {};
  },

  async deleteFile(fileId) {
    const { data } = await api.delete(`/files/${fileId}`);
    return data;
  },

  async getChatFiles(chatId, page = 1, limit = 20) {
    const { data } = await api.get(`/files/chat/${chatId}`, { params: { page, limit } });
    return {
      files: Array.isArray(data?.files) ? data.files : [],
      pagination: data?.pagination || null,
    };
  },

  async generateAIReplies(chatId, messageId, language = 'en') {
    const { data } = await api.post('/ai/replies/generate', {
      chatId,
      messageId,
      language,
    });
    return Array.isArray(data?.suggestions) ? data.suggestions : [];
  },

  async getAIReplies(messageId) {
    const { data } = await api.get(`/ai/replies/${messageId}`);
    return Array.isArray(data?.suggestions) ? data.suggestions : [];
  },

  async rateAIReply(replyId, suggestionId, rating) {
    const { data } = await api.post(`/ai/replies/${replyId}/rate`, {
      suggestionId,
      rating,
    });
    return data;
  },

  async getSettings() {
    const { data } = await api.get('/settings');
    return data?.settings || null;
  },

  async updateSettings(settings = {}) {
    const { data } = await api.put('/settings', settings);
    return data?.settings || null;
  },

  async createChatroom({ chatroomName, description = '', isPublic = false, tags = [], ownerId, settings = {} }) {
    const { data } = await api.post('/chatrooms', {
      chatroomName,
      description,
      isPublic,
      tags,
      ownerId,
      settings,
    });
    return data?.chatroom || null;
  },

  async getFamilyChats(filters = {}) {
    const { data } = await api.get('/chats/family', { params: filters });
    return {
      chats: Array.isArray(data?.chats) ? data.chats : [],
      pagination: data?.pagination || null,
    };
  },

  async getPublicChatrooms(filters = {}) {
    const { data } = await api.get('/chatrooms/public/list', { params: filters });
    return {
      chatrooms: Array.isArray(data?.chatrooms) ? data.chatrooms : [],
      pagination: data?.pagination || null,
    };
  },

  async getMyChatrooms() {
    const { data } = await api.get('/chatrooms/my-rooms');
    return Array.isArray(data?.chatrooms) ? data.chatrooms : [];
  },

  async getChatroom(chatroomId) {
    const { data } = await api.get(`/chatrooms/${chatroomId}`);
    return data || null;
  },

  async joinChatroom(chatroomId) {
    const { data } = await api.post(`/chatrooms/${chatroomId}/join`);
    return data || null;
  },

  async requestChatroomJoin(chatroomId) {
    const { data } = await api.post(`/chatrooms/${chatroomId}/request-join`);
    return data || null;
  },

  async getChatroomPendingRequests(chatroomId) {
    const { data } = await api.get(`/chatrooms/${chatroomId}/pending-requests`);
    return Array.isArray(data?.pendingRequests) ? data.pendingRequests : [];
  },

  async approveChatroomRequest(chatroomId, userId) {
    const { data } = await api.post(`/chatrooms/${chatroomId}/approve-request/${userId}`);
    return data || null;
  },

  async rejectChatroomRequest(chatroomId, userId, reason = '') {
    const { data } = await api.post(`/chatrooms/${chatroomId}/reject-request/${userId}`, { reason });
    return data || null;
  },

  async leaveChatroom(chatroomId) {
    const { data } = await api.post(`/chatrooms/${chatroomId}/leave`);
    return data || null;
  },

  async updateChatroom(chatroomId, updates = {}) {
    const { data } = await api.put(`/chatrooms/${chatroomId}`, updates);
    return data || null;
  },

  async blockChatroomMember(chatroomId, userId) {
    const { data } = await api.post(`/chatrooms/${chatroomId}/block-member/${userId}`);
    return data || null;
  },

  async deleteChatroom(chatroomId) {
    const { data } = await api.delete(`/chatrooms/${chatroomId}`);
    return data || null;
  },

  async sendWithFamilyAccess(recipientId, content, chatId) {
    const { data } = await api.post('/send-with-family-access', {
      recipientId,
      content,
      chatId,
    });
    return data || null;
  },

  async startLocationSession(recipientId, duration = 3600000, periodic = false) {
    const { data } = await api.post('/location/start-session', {
      recipientId,
      duration,
      periodic,
    });
    return data || null;
  },

  async updateLocation(sessionId, latitude, longitude, timestamp, accuracy) {
    const { data } = await api.post('/location/update', {
      sessionId,
      latitude,
      longitude,
      timestamp,
      accuracy,
    });
    return data || null;
  },

  async endLocationSession(sessionId) {
    const { data } = await api.post('/location/end-session', { sessionId });
    return data || null;
  },

  async getLocationSessions(filters = {}) {
    const { data } = await api.get('/location/sessions', { params: filters });
    return {
      sessions: Array.isArray(data?.sessions) ? data.sessions : [],
      pagination: data?.pagination || null,
    };
  },

  async getLocationHistory(sessionId) {
    const { data } = await api.get(`/location/history/${sessionId}`);
    return data?.history || [];
  },

  getChatId(chat) {
    return normalizeChatId(chat);
  },
};
