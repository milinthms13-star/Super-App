/**
 * ChatListEnhanced - Demo-enabled chat list with rich previews
 * Integrates real demo data to make empty state disappear
 */

import { getDemoConversations, getDemoMessages } from '../../services/demoMessagingData';

/**
 * Initialize demo chats if chats array is empty
 * This fills the empty state with realistic conversation data
 */
export const initializeDemoChats = (existingChats) => {
  // If we already have real chats, don't use demo data
  if (existingChats && existingChats.length > 0) {
    return existingChats;
  }

  // Initialize with demo data
  const demoDemos = getDemoConversations();
  return demoDemos.map((demoChat) => ({
    ...demoChat,
    createdAt: demoChat.lastMessageAt,
    updatedAt: demoChat.lastMessageAt,
    isDemo: true, // Mark as demo data so we can handle differently if needed
  }));
};

/**
 * Get messages for a demo chat
 */
export const getDemoChatMessages = (chatId) => {
  const messages = getDemoMessages(chatId);
  return messages || [];
};

/**
 * Format time relative to now
 */
export const formatTimeRelative = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const time = new Date(date);
  const diffMs = now - time;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  return time.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
};

/**
 * Get chat preview text with emoji support
 */
export const getChatPreviewText = (lastMessage, isCleared = false) => {
  if (isCleared) {
    return '🗑️ Chat cleared';
  }

  if (!lastMessage) {
    return 'No messages yet';
  }

  const { content, messageType, sender } = lastMessage;

  // Handle different message types
  if (messageType === 'voice') return '🎙️ Voice note';
  if (messageType === 'audio') return '🎵 Audio message';
  if (messageType === 'image') return '📷 Photo shared';
  if (messageType === 'video') return '🎬 Video shared';
  if (messageType === 'file') return `📄 ${content || 'File shared'}`;
  if (messageType === 'location') return '📍 Location shared';
  if (messageType === 'contact') return '👤 Contact shared';

  // Text messages - truncate to 50 chars
  return content?.substring(0, 50) || 'No content';
};

/**
 * Get participant name for display
 */
export const getParticipantName = (participant) => {
  if (participant.groupName) return participant.groupName;
  return participant.name || 'Unknown User';
};

/**
 * Check if participant is online
 */
export const isParticipantOnline = (participant) => {
  if (!participant) return false;
  return participant.online === true || participant.status === 'online';
};

/**
 * Get last seen info
 */
export const getLastSeenInfo = (participant) => {
  if (isParticipantOnline(participant)) return 'online';
  if (participant.lastSeen) return `last seen ${participant.lastSeen}`;
  return 'offline';
};

export default {
  initializeDemoChats,
  getDemoChatMessages,
  formatTimeRelative,
  getChatPreviewText,
  getParticipantName,
  isParticipantOnline,
  getLastSeenInfo,
};
