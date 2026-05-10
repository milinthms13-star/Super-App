import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import { getStoredAuthToken } from '../../utils/auth';
import '../../styles/Messaging.css';
import '../../styles/GroupCreation.css';
import '../../styles/Chatrooms.css';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import ContactsList from './ContactsList';
import CallWindow from './CallWindow';
import AISmartReplies from './AISmartReplies';
import FileUpload from './FileUpload';
import NotificationBell from './NotificationBell';
import InvitationPanel from './InvitationPanel';
import VisibilitySettings from './VisibilitySettings';
import ContactMeansSettings from './ContactMeansSettings';
import GroupCreation from './GroupCreation';
import ScheduledBlockManager from './ScheduledBlockManager';
import ChatroomCreation from './ChatroomCreation';
import ChatroomBrowser from './ChatroomBrowser';
import ChatroomList from './ChatroomList';
import ChatroomPanel from './ChatroomPanel';
import io from 'socket.io-client';
import { BACKEND_BASE_URL } from '../../utils/api';
import {
  getNotificationPermission,
  requestNotificationPermission,
  showServiceWorkerNotification,
} from '../../pwaConfig';
import {
  filterMessagesByClearTimestamp,
  getAvatarLabel,
  getChatClearTimestamp,
  getEntityId,
  inferMessageTypeFromMimeType,
  isSameEntity,
  loadClearedChats,
  loadMessagingOutbox,
  mergePagedMessages,
  mergeOutboxEntriesIntoMessages,
  saveClearedChats,
  saveMessagingOutbox,
} from './utils';

const getOtherParticipant = (chat, currentUser) =>
  chat?.participants?.find((participant) => !isSameEntity(participant, currentUser)) || null;

const isMongoObjectId = (value) => /^[a-f0-9]{24}$/i.test(getEntityId(value));

const getMessageMediaSignature = (message = {}) => {
  const media = message?.media || {};
  return [media.url || '', media.type || '', String(media.size || '')].join('::');
};

const isMatchingOptimisticMessage = (pendingMessage, confirmedMessage) => {
  if (!pendingMessage?.isPending || !confirmedMessage) {
    return false;
  }

  if (getEntityId(pendingMessage.chatId) !== getEntityId(confirmedMessage.chatId)) {
    return false;
  }

  if (!isSameEntity(pendingMessage.senderId, confirmedMessage.senderId)) {
    return false;
  }

  if ((pendingMessage.messageType || 'text') !== (confirmedMessage.messageType || 'text')) {
    return false;
  }

  if ((pendingMessage.content || '') !== (confirmedMessage.content || '')) {
    return false;
  }

  return getMessageMediaSignature(pendingMessage) === getMessageMediaSignature(confirmedMessage);
};

const mergeConfirmedMessage = (currentMessages = [], confirmedMessage) => {
  const confirmedMessageId = getEntityId(confirmedMessage);
  let replacedPendingMessage = false;
  const nextMessages = [];

  currentMessages.forEach((message) => {
    if (confirmedMessageId && getEntityId(message) === confirmedMessageId) {
      if (!nextMessages.some((existingMessage) => getEntityId(existingMessage) === confirmedMessageId)) {
        nextMessages.push(confirmedMessage);
      }
      return;
    }

    if (!replacedPendingMessage && isMatchingOptimisticMessage(message, confirmedMessage)) {
      nextMessages.push(confirmedMessage);
      replacedPendingMessage = true;
      return;
    }

    nextMessages.push(message);
  });

  if (!nextMessages.some((message) => getEntityId(message) === confirmedMessageId)) {
    nextMessages.push(confirmedMessage);
  }

  return nextMessages;
};

const MESSAGE_PAGE_SIZE = 20;
const DEFAULT_MESSAGE_PAGINATION = {
  page: 1,
  pages: 1,
  total: 0,
  limit: MESSAGE_PAGE_SIZE,
};
const EMERGENCY_CALL_STORAGE_KEY = 'malabarbazaar-emergency-call';
const MESSAGE_OUTBOX_RETRY_LIMIT = 5;

const readPendingEmergencyCall = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(EMERGENCY_CALL_STORAGE_KEY);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    return null;
  }
};

const clearPendingEmergencyCall = () => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(EMERGENCY_CALL_STORAGE_KEY);
  } catch (error) {
    // Ignore storage cleanup failures so emergency calls still open.
  }
};

const generateClientMessageId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `client-message-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const buildNotificationTitle = (notification = {}) => {
  if (notification.title) {
    return notification.title;
  }

  switch (notification.type || notification.notificationType) {
    case 'invitation':
      return 'New invitation';
    case 'invitation-accepted':
      return 'Invitation accepted';
    case 'invitation-rejected':
      return 'Invitation rejected';
    case 'call':
      return 'Incoming call';
    case 'call-declined':
      return 'Call declined';
    default:
      return 'Notification';
  }
};

const normalizeRealtimeNotification = (notification = {}) => {
  const createdAt =
    notification.createdAt || notification.timestamp || notification.sentAt || new Date().toISOString();

  return {
    ...notification,
    id:
      notification.id ||
      notification._id ||
      `${notification.type || notification.notificationType || 'notification'}-${
        getEntityId(notification.callId) ||
        getEntityId(notification.messageId) ||
        getEntityId(notification.chatId) ||
        createdAt
      }`,
    title: buildNotificationTitle(notification),
    body: notification.body || notification.message || 'Open to view details.',
    createdAt,
    isRead: Boolean(notification.isRead),
  };
};

const formatActivityTime = (value) => {
  if (!value) {
    return '';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  const now = new Date();
  const deltaMs = now.getTime() - parsedDate.getTime();
  const deltaMins = Math.floor(deltaMs / 60000);
  const deltaHours = Math.floor(deltaMs / 3600000);
  const deltaDays = Math.floor(deltaMs / 86400000);

  if (deltaMins < 1) {
    return 'just now';
  }
  if (deltaMins < 60) {
    return `${deltaMins}m ago`;
  }
  if (deltaHours < 24) {
    return `${deltaHours}h ago`;
  }
  if (deltaDays < 7) {
    return `${deltaDays}d ago`;
  }

  return parsedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const Messaging = () => {
  const { currentUser, apiCall } = useApp();
  const [activeTab, setActiveTab] = useState('chats');
  const [activeSettingsTab, setActiveSettingsTab] = useState('visibility');
  const [chats, setChats] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatMode, setNewChatMode] = useState('direct'); // 'direct' or 'group'
  const [socket, setSocket] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [showCallWindow, setShowCallWindow] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  const [notificationPermission, setNotificationPermission] = useState(() =>
    getNotificationPermission()
  );
  const [contactFilterType, setContactFilterType] = useState('all');
  const [focusedMessageId, setFocusedMessageId] = useState('');
  const [newChatSearchQuery, setNewChatSearchQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [sendingVoiceNote, setSendingVoiceNote] = useState(false);
  const [messagePagination, setMessagePagination] = useState(DEFAULT_MESSAGE_PAGINATION);
  const [loadedMessagePages, setLoadedMessagePages] = useState(1);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [clearedChats, setClearedChats] = useState(() => loadClearedChats());
  const [showScheduledBlockManager, setShowScheduledBlockManager] = useState(false);
  const [selectedContactForScheduledBlock, setSelectedContactForScheduledBlock] = useState(null);
  const [isNetworkOnline, setIsNetworkOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false
  );

  // Chatroom states
  const [loadingChatrooms, setLoadingChatrooms] = useState(false);
  const [chatrooms, setChatrooms] = useState([]);
  const [selectedChatroom, setSelectedChatroom] = useState(null);
  const [showChatroomCreation, setShowChatroomCreation] = useState(false);
  const [showChatroomBrowser, setShowChatroomBrowser] = useState(false);
  const [chatroomSearchQuery, setChatroomSearchQuery] = useState('');


  const socketRef = useRef(null);
  const activeCallRef = useRef(null);
  const incomingCallRef = useRef(null);
  const clearedChatsRef = useRef(loadClearedChats());
  const outboxRef = useRef([]);
  const isFlushingOutboxRef = useRef(false);
  const currentUserId = getEntityId(currentUser);
  const resolvedCurrentUserId = useMemo(() => {
    const selectedChatParticipant = selectedChat?.participants?.find((participant) =>
      isSameEntity(participant, currentUser)
    );

    return getEntityId(selectedChatParticipant) || currentUserId;
  }, [currentUser, currentUserId, selectedChat]);
  const selectedChatClearedAt = useMemo(
    () => getChatClearTimestamp(selectedChat?._id || selectedChatroom?._id, clearedChats),
    [clearedChats, selectedChat, selectedChatroom]
  );
  const latestMessageId = useMemo(() => {
    const latestReplyableMessage = [...messages]
      .reverse()
      .find(
        (message) =>
          !message?.isDeleted &&
          !message?.isPending &&
          isMongoObjectId(message?._id) &&
          !isSameEntity(message?.senderId, currentUser)
      );

    return latestReplyableMessage?._id || '';
  }, [currentUser, messages]);

  const persistOutbox = useCallback((nextQueue) => {
    outboxRef.current = Array.isArray(nextQueue) ? nextQueue : [];
    saveMessagingOutbox(currentUserId, outboxRef.current);
  }, [currentUserId]);

  const upsertOutboxEntry = useCallback((entry) => {
    if (!entry?.clientMessageId) {
      return;
    }

    const nextQueue = [
      ...outboxRef.current.filter(
        (queuedMessage) => queuedMessage.clientMessageId !== entry.clientMessageId
      ),
      entry,
    ].sort(
      (first, second) =>
        new Date(first.createdAt || 0).getTime() - new Date(second.createdAt || 0).getTime()
    );

    persistOutbox(nextQueue);
  }, [persistOutbox]);

  const removeOutboxEntry = useCallback((clientMessageId) => {
    if (!clientMessageId) {
      return;
    }

    persistOutbox(
      outboxRef.current.filter(
        (queuedMessage) => queuedMessage.clientMessageId !== clientMessageId
      )
    );
  }, [persistOutbox]);

  const mergeChatOutboxIntoMessages = useCallback((chatId, nextMessages = []) => {
    const resolvedChatId = getEntityId(chatId);
    if (!resolvedChatId) {
      return Array.isArray(nextMessages) ? nextMessages : [];
    }

    const queuedMessages = outboxRef.current.filter(
      (queuedMessage) => getEntityId(queuedMessage.chatId) === resolvedChatId
    );

    return mergeOutboxEntriesIntoMessages(nextMessages, queuedMessages);
  }, []);

  const syncFailedMessageState = useCallback((clientMessageId, updates = {}) => {
    if (!clientMessageId) {
      return;
    }

    setMessages((prevMessages) =>
      prevMessages.map((message) =>
        message.clientMessageId === clientMessageId || message._id === clientMessageId
          ? {
              ...message,
              ...updates,
            }
          : message
      )
    );
  }, []);

  const activateEmergencyIncomingCall = useCallback((callData = {}) => {
    const emergencyCallId = getEntityId(callData?._id || callData?.callId);
    if (!emergencyCallId) {
      return;
    }

    setIncomingCall((currentCall) => {
      const currentCallId = getEntityId(currentCall?._id || currentCall?.callId);
      if (currentCallId && currentCallId === emergencyCallId) {
        return currentCall;
      }

      return callData;
    });
    setActiveTab('chats');
    setShowNewChat(false);

    if (callData?.chatId) {
      const matchingChat = chats.find((chat) => chat._id === callData.chatId);
      if (matchingChat) {
        setSelectedChat(matchingChat);
      }
    }
  }, [chats]);

  const updateChatPreview = useCallback((incomingMessage) => {
    const incomingChatId = getEntityId(incomingMessage?.chatId);
    if (!incomingChatId) {
      return;
    }

    setChats((prevChats) => {
      const matchedChat = prevChats.find((chat) => chat._id === incomingChatId);
      if (!matchedChat) {
        return prevChats;
      }

      const updatedChat = {
        ...matchedChat,
        lastMessage: incomingMessage,
        lastMessageAt: incomingMessage.createdAt || matchedChat.lastMessageAt,
      };

      return [
        updatedChat,
        ...prevChats.filter((chat) => chat._id !== incomingChatId),
      ];
    });
  }, []);

  const addNotificationEntry = useCallback((notification) => {
    const normalizedNotification = normalizeRealtimeNotification(notification);

    setNotifications((prevNotifications) => [
      normalizedNotification,
      ...prevNotifications.filter(
        (entry) =>
          String(entry._id || entry.id) !==
          String(normalizedNotification._id || normalizedNotification.id)
      ),
    ]);

    return normalizedNotification;
  }, []);

  const maybeShowDesktopNotification = useCallback(
    async ({ title, body, tag, chatId, force = false }) => {
      const permission = getNotificationPermission();
      if (permission !== notificationPermission) {
        setNotificationPermission(permission);
      }

      if (permission !== 'granted') {
        return false;
      }

      const selectedChatId = getEntityId(selectedChat?._id);
      const targetChatId = getEntityId(chatId);
      const pageVisible =
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        (typeof document.hasFocus !== 'function' || document.hasFocus());
      const sameChatInForeground =
        Boolean(selectedChatId) && selectedChatId === targetChatId && pageVisible;

      if (!force && sameChatInForeground) {
        return false;
      }

      try {
        await showServiceWorkerNotification({
          title,
          body,
          tag,
          data: { url: '/?source=pwa&module=messaging' },
        });
        return true;
      } catch (error) {
        console.error('Error showing desktop notification:', error);
        return false;
      }
    },
    [notificationPermission, selectedChat]
  );

  const handleEnableNotifications = useCallback(async () => {
    try {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  }, []);

  const loadChats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiCall('/messaging/chats', 'GET');
      setChats(Array.isArray(response?.chats) ? response.chats : []);
    } catch (error) {
      console.error('Error loading chats:', error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  const loadContacts = useCallback(async (filterType = 'all') => {
    try {
      let url = '/messaging/contacts';

      if (filterType === 'blocked') {
        url = '/messaging/contacts?showBlocked=true';
      } else if (filterType === 'favorites') {
        url = '/messaging/contacts?favorite=true';
      }

      const response = await apiCall(url, 'GET');
      if (response?.contacts) {
        setContacts(response.contacts);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  }, [apiCall]);

  const loadChatrooms = useCallback(async () => {
    try {
      setLoadingChatrooms(true);
      const response = await apiCall('/messaging/chatrooms/my-rooms', 'GET');

      if (response?.chatrooms) {
        setChatrooms(response.chatrooms);
      }
    } catch (error) {
      console.error('Error loading chatrooms:', error);
    } finally {
      setLoadingChatrooms(false);
    }
  }, [apiCall]);

  const loadChatroomDetails = useCallback(async (chatroomId) => {
    const resolvedChatroomId = getEntityId(chatroomId);

    if (!resolvedChatroomId) {
      setSelectedChatroom(null);
      return null;
    }

    try {
      const response = await apiCall(`/messaging/chatrooms/${resolvedChatroomId}`, 'GET');

      if (response?.chatroom) {
        setSelectedChatroom(response.chatroom);
        return response.chatroom;
      }
    } catch (error) {
      console.error('Error loading chatroom details:', error);
    }

    return null;
  }, [apiCall]);

  const loadMessages = useCallback(async (chatId, options = {}) => {
    const {
      page = 1,
      appendOlderMessages = false,
    } = options;

    try {
      const response = await apiCall(`/messaging/messages/${chatId}`, 'GET', {
        page,
        limit: MESSAGE_PAGE_SIZE,
      });

      const confirmedClientMessageIds = new Set(
        (response?.messages || [])
          .map((message) => String(message?.clientMessageId || '').trim())
          .filter(Boolean)
      );

      if (confirmedClientMessageIds.size > 0) {
        persistOutbox(
          outboxRef.current.filter(
            (queuedMessage) => !confirmedClientMessageIds.has(String(queuedMessage.clientMessageId || '').trim())
          )
        );
      }

      const clearedAt = getChatClearTimestamp(chatId, clearedChatsRef.current);
      const nextMessages = mergeChatOutboxIntoMessages(
        chatId,
        filterMessagesByClearTimestamp(response?.messages || [], clearedAt)
      );

      if (appendOlderMessages) {
        setMessages((prevMessages) => mergePagedMessages(nextMessages, prevMessages));
        setLoadedMessagePages((prevPages) => Math.max(prevPages, page));
      } else {
        setMessages(nextMessages);
        setLoadedMessagePages(1);
      }

      setMessagePagination({
        ...DEFAULT_MESSAGE_PAGINATION,
        ...(response?.pagination || {}),
        limit: response?.pagination?.limit || MESSAGE_PAGE_SIZE,
      });
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  }, [apiCall, mergeChatOutboxIntoMessages, persistOutbox]);

  const unreadChatsCount = useMemo(
    () => chats.reduce((count, chat) => count + Number(chat?.unreadCount || 0), 0),
    [chats]
  );

  const recentConversationCards = useMemo(() => {
    const toTime = (chat) => new Date(chat?.lastMessageAt || chat?.updatedAt || 0).getTime();
    return [...chats]
      .sort((first, second) => toTime(second) - toTime(first))
      .slice(0, 4)
      .map((chat) => {
        const otherParticipant = getOtherParticipant(chat, currentUser);
        return {
          id: chat._id,
          title: chat?.type === 'group'
            ? chat.groupName || 'Group chat'
            : otherParticipant?.name || 'Direct chat',
          preview:
            chat?.lastMessage?.content ||
            (chat?.lastMessage?.messageType ? `${chat.lastMessage.messageType} message` : 'No messages yet'),
          time: formatActivityTime(chat?.lastMessageAt || chat?.updatedAt),
          unreadCount: Number(chat?.unreadCount || 0),
          online: Boolean(otherParticipant?.online),
        };
      });
  }, [chats, currentUser]);

  const onlineContactsPreview = useMemo(() => {
    const contactRecords = contacts
      .map((contact) => contact?.contactUserId || contact)
      .filter(Boolean)
      .map((user) => ({
        id: getEntityId(user),
        name: user?.name || user?.username || 'Contact',
        online: Boolean(user?.online),
      }))
      .filter((entry) => entry.id && entry.online);

    const chatParticipants = chats
      .map((chat) => getOtherParticipant(chat, currentUser))
      .filter(Boolean)
      .map((participant) => ({
        id: getEntityId(participant),
        name: participant?.name || participant?.username || 'Contact',
        online: Boolean(participant?.online),
      }))
      .filter((entry) => entry.id && entry.online);

    const deduped = [...contactRecords, ...chatParticipants].reduce((acc, entry) => {
      if (!acc.some((item) => item.id === entry.id)) {
        acc.push(entry);
      }
      return acc;
    }, []);

    return deduped.slice(0, 6);
  }, [chats, contacts, currentUser]);

  const activeNowCount = useMemo(
    () => onlineContactsPreview.length + (isOnline ? 1 : 0),
    [isOnline, onlineContactsPreview.length]
  );

  const suggestedConversationCards = useMemo(
    () =>
      recentConversationCards
        .filter((card) => card.unreadCount > 0 || card.online)
        .slice(0, 4),
    [recentConversationCards]
  );

  const recentSharedItems = useMemo(() => {
    const toTime = (chat) => new Date(chat?.lastMessageAt || chat?.updatedAt || 0).getTime();
    return [...chats]
      .filter((chat) => ['image', 'video', 'file', 'voice', 'audio'].includes(chat?.lastMessage?.messageType))
      .sort((first, second) => toTime(second) - toTime(first))
      .slice(0, 5)
      .map((chat) => {
        const otherParticipant = getOtherParticipant(chat, currentUser);
        return {
          id: getEntityId(chat),
          title:
            chat?.type === 'group'
              ? chat?.groupName || 'Group chat'
              : otherParticipant?.name || 'Direct chat',
          type: chat?.lastMessage?.messageType || 'file',
          time: formatActivityTime(chat?.lastMessageAt || chat?.updatedAt),
        };
      });
  }, [chats, currentUser]);

  const aiAssistantHints = useMemo(
    () => [
      `Summarize ${Math.max(chats.length, 1)} active conversation${chats.length === 1 ? '' : 's'}`,
      unreadChatsCount > 0
        ? `Draft quick replies for ${unreadChatsCount} unread message${unreadChatsCount === 1 ? '' : 's'}`
        : 'Generate a polished first message for a new chat',
      'Translate mixed-language replies instantly',
    ],
    [chats.length, unreadChatsCount]
  );

  const retryQueuedMessage = useCallback(async (queuedMessage, { manual = false } = {}) => {
    if (!queuedMessage?.clientMessageId || !queuedMessage?.chatId) {
      return null;
    }

    const nextAttemptCount = Number(queuedMessage.attemptCount || 0) + 1;
    const optimisticUpdates = {
      isPending: true,
      isFailed: false,
      errorMessage: '',
      deliveryStatus: Array.isArray(queuedMessage.deliveryStatus)
        ? queuedMessage.deliveryStatus.map((status) => ({
            ...status,
            status: isSameEntity(status.userId, currentUser) ? 'seen' : 'sending',
          }))
        : [],
    };

    syncFailedMessageState(queuedMessage.clientMessageId, optimisticUpdates);

    try {
      const response = await apiCall('/messaging/messages', 'POST', {
        chatId: queuedMessage.chatId,
        content: queuedMessage.content || '',
        messageType: queuedMessage.messageType || 'text',
        media: queuedMessage.media || undefined,
        replyTo: getEntityId(queuedMessage.replyTo) || null,
        clientMessageId: queuedMessage.clientMessageId,
      });

      if (response?.message) {
        removeOutboxEntry(queuedMessage.clientMessageId);
        setMessages((prevMessages) => mergeConfirmedMessage(prevMessages, response.message));
        updateChatPreview(response.message);
      } else {
        const nextQueuedMessage = {
          ...queuedMessage,
          attemptCount: nextAttemptCount,
          lastAttemptAt: new Date().toISOString(),
          errorMessage: 'Server did not confirm the message. It will retry automatically.',
        };

        upsertOutboxEntry(nextQueuedMessage);
        syncFailedMessageState(queuedMessage.clientMessageId, {
          isPending: false,
          isFailed: true,
          errorMessage: nextQueuedMessage.errorMessage,
        });
      }

      return response?.message || null;
    } catch (error) {
      const nextQueuedMessage = {
        ...queuedMessage,
        attemptCount: nextAttemptCount,
        lastAttemptAt: new Date().toISOString(),
        errorMessage:
          error?.response?.data?.message || error?.message || 'Unable to send the message.',
      };

      upsertOutboxEntry(nextQueuedMessage);
      syncFailedMessageState(queuedMessage.clientMessageId, {
        isPending: false,
        isFailed: true,
        errorMessage: nextQueuedMessage.errorMessage,
      });

      if (manual) {
        throw error;
      }

      return null;
    }
  }, [
    apiCall,
    currentUser,
    removeOutboxEntry,
    syncFailedMessageState,
    updateChatPreview,
    upsertOutboxEntry,
  ]);

  const flushMessageOutbox = useCallback(async () => {
    if (isFlushingOutboxRef.current || !isNetworkOnline || outboxRef.current.length === 0) {
      return;
    }

    isFlushingOutboxRef.current = true;

    try {
      const queuedMessages = [...outboxRef.current]
        .filter((queuedMessage) => Number(queuedMessage.attemptCount || 0) < MESSAGE_OUTBOX_RETRY_LIMIT)
        .sort(
          (first, second) =>
            new Date(first.createdAt || 0).getTime() - new Date(second.createdAt || 0).getTime()
        );

      for (const queuedMessage of queuedMessages) {
        // Continue best-effort flushing without aborting the whole queue on one failure.
        // Each failed retry updates the outbox entry with the latest error details.
        // eslint-disable-next-line no-await-in-loop
        await retryQueuedMessage(queuedMessage);
      }

      if (queuedMessages.length > 0) {
        await loadChats();
      }
    } finally {
      isFlushingOutboxRef.current = false;
    }
  }, [isNetworkOnline, loadChats, retryQueuedMessage]);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await apiCall('/messaging/notifications', 'GET');
      if (response?.notifications) {
        setNotifications(response.notifications.map(normalizeRealtimeNotification));
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [apiCall]);

  const checkEncryptionStatus = useCallback(async (chatId) => {
    try {
      const response = await apiCall(`/messaging/encryption/status/${chatId}`, 'GET');
      setEncryptionEnabled(Boolean(response?.enabled));
    } catch (error) {
      console.error('Error checking encryption status:', error);
      setEncryptionEnabled(false);
    }
  }, [apiCall]);

  const searchUsers = useCallback(
    async (query) => {
      if (!query.trim()) {
        setAvailableUsers([]);
        return;
      }
      try {
        setSearchingUsers(true);
        const response = await apiCall(
          `/socialmedia/search/users?q=${encodeURIComponent(query)}`,
          'GET'
        );
        if (response?.users) {
          const contactIds = new Set(
            contacts.map((contact) => getEntityId(contact.contactUserId))
          );
          const filtered = response.users.filter(
            (u) =>
              !isSameEntity(u, currentUser) && !contactIds.has(getEntityId(u))
          );
          setAvailableUsers(filtered);
        }
      } catch (error) {
        console.error('Error searching users:', error);
        setAvailableUsers([]);
      } finally {
        setSearchingUsers(false);
      }
    },
    [apiCall, contacts, currentUser]
  );

  const handleAddContact = async (userId, userName, userEmail, userUsername) => {
    try {
      const response = await apiCall('/invitations/send', 'POST', {
        recipientIdentifierType: 'username',
        recipientIdentifier: userUsername || userEmail,
        message: `Hi ${userName}, let's connect on LinkUp!`,
        module: 'messaging',
      });

      if (response.success) {
        alert(`Invitation sent to ${userName}! They'll receive it and can accept to connect.`);
        setNewChatSearchQuery('');
        setAvailableUsers([]);
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Failed to send invitation');
    }
  };

  const loadInvitations = useCallback(async () => {
    try {
      setLoadingInvitations(true);
      const response = await apiCall('/invitations/pending', 'GET');
      if (response?.invitations) {
        setPendingInvitations(response.invitations);
      }
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoadingInvitations(false);
    }
  }, [apiCall]);

  const handleAcceptInvitation = async (invitationId) => {
    try {
      const response = await apiCall(`/invitations/${invitationId}/accept`, 'POST', {});
      if (response.success) {
        alert('Invitation accepted! You can now chat with them.');
        await loadInvitations();
        await loadContacts(contactFilterType);
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      alert('Failed to accept invitation');
    }
  };

  const handleRejectInvitation = async (invitationId) => {
    try {
      const response = await apiCall(`/invitations/${invitationId}/reject`, 'POST', {
        reason: 'User rejected the invitation',
      });
      if (response.success) {
        alert('Invitation rejected.');
        await loadInvitations();
      }
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      alert('Failed to reject invitation');
    }
  };

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    outboxRef.current = loadMessagingOutbox(currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    const applyPendingEmergencyCall = (callData = readPendingEmergencyCall()) => {
      if (!callData) {
        return;
      }

      activateEmergencyIncomingCall(callData);
      clearPendingEmergencyCall();
    };

    const handleEmergencyCallEvent = (event) => {
      applyPendingEmergencyCall(event?.detail || null);
    };

    applyPendingEmergencyCall();
    window.addEventListener('malabarbazaar:emergency-call', handleEmergencyCallEvent);

    return () => {
      window.removeEventListener('malabarbazaar:emergency-call', handleEmergencyCallEvent);
    };
  }, [activateEmergencyIncomingCall]);

  useEffect(() => {
    clearedChatsRef.current = clearedChats;
    saveClearedChats(clearedChats);
  }, [clearedChats]);

  useEffect(() => {
    loadChats();
    loadNotifications();
    loadInvitations();
  }, [loadChats, loadNotifications, loadInvitations]);

  useEffect(() => {
    loadContacts(contactFilterType);
  }, [contactFilterType, loadContacts]);

  useEffect(() => {
    if (activeTab === 'chatrooms') {
      loadChatrooms();
    }
  }, [activeTab, loadChatrooms]);

  useEffect(() => {
    const syncNotificationPermission = () => {
      setNotificationPermission(getNotificationPermission());
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', syncNotificationPermission);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', syncNotificationPermission);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedChat?._id) {
      loadMessages(selectedChat._id);
      checkEncryptionStatus(selectedChat._id);
      setShowAISuggestions(true);
      return;
    }

    setMessages([]);
    setMessagePagination(DEFAULT_MESSAGE_PAGINATION);
    setLoadedMessagePages(1);
    setShowAISuggestions(false);
    setEncryptionEnabled(false);
  }, [selectedChat, loadMessages, checkEncryptionStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleBrowserOnline = () => {
      setIsNetworkOnline(true);
    };

    const handleBrowserOffline = () => {
      setIsNetworkOnline(false);
      setIsOnline(false);
    };

    window.addEventListener('online', handleBrowserOnline);
    window.addEventListener('offline', handleBrowserOffline);

    return () => {
      window.removeEventListener('online', handleBrowserOnline);
      window.removeEventListener('offline', handleBrowserOffline);
    };
  }, []);

  useEffect(() => {
    if (isNetworkOnline) {
      flushMessageOutbox();
    }
  }, [flushMessageOutbox, isNetworkOnline]);

  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }

    const newSocket =
      typeof io === 'function'
        ? io(BACKEND_BASE_URL, {
            auth: {
              token: getStoredAuthToken(),
            },
          })
        : null;

    if (!newSocket) {
      setIsOnline(false);
      return undefined;
    }

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsOnline(true);
      flushMessageOutbox();

      if (selectedChat?._id) {
        newSocket.emit('chat:join', selectedChat._id);
      }
    });

    newSocket.on('disconnect', () => {
      setIsOnline(false);
    });

    newSocket.on('connect_error', () => {
      setIsOnline(false);
    });

    newSocket.on('message:received', (message) => {
      console.log('🔔 Socket message:received event:', message);
      console.log('📍 Current selected chat ID:', selectedChat?._id);
      console.log('📍 Incoming message chat ID:', message.chatId);
      
      if (getEntityId(message.chatId) === selectedChat?._id) {
        console.log('✅ Message is for selected chat, adding to messages');
        setMessages((prevMessages) => {
          if (prevMessages.some((existingMessage) => (
            existingMessage._id === message._id ||
            isMatchingOptimisticMessage(existingMessage, message)
          ))) {
            console.log('⏭️ Message already exists in array, skipping duplicate');
            return mergeConfirmedMessage(prevMessages, message);
          }

          console.log('📋 Adding message to array');
          return mergeConfirmedMessage(prevMessages, message);
        });
      } else {
        console.log('⏸️ Message is for different chat, not adding to messages array');
      }

      // Ensure the chat exists in the chat list
      const chatIdStr = getEntityId(message.chatId);
      setChats((prevChats) => {
        const chatExists = prevChats.some((chat) => getEntityId(chat._id) === chatIdStr);
        
        if (!chatExists) {
          console.log('⚠️ Chat not found in list, fetching from backend...');
          // Chat doesn't exist, fetch it from backend and add to list
          // Use setTimeout to avoid issues with stale closure
          setTimeout(() => {
            apiCall(`/messaging/chats/${chatIdStr}`, 'GET')
              .then((response) => {
                if (response?.chat) {
                  console.log('✅ Fetched chat:', response.chat);
                  setChats((latestChats) => {
                    // Double-check the chat doesn't exist
                    const stillMissing = !latestChats.some((chat) => getEntityId(chat._id) === chatIdStr);
                    if (stillMissing) {
                      console.log('✅ Adding fetched chat to list');
                      const updatedChats = [response.chat, ...latestChats];
                      // Now update the chat preview after adding the chat
                      setTimeout(() => updateChatPreview(message), 0);
                      return updatedChats;
                    }
                    console.log('ℹ️ Chat already exists, not adding duplicate');
                    return latestChats;
                  });
                }
              })
              .catch((error) => {
                console.error('❌ Error fetching chat for received message:', error);
              });
          }, 0);
        } else {
          console.log('✅ Chat already exists in list');
          // Chat exists, update it immediately
          updateChatPreview(message);
        }

        return prevChats;
      });
    });

    newSocket.on('message:updated', (updatedMessage) => {
      setMessages((prevMessages) =>
        prevMessages.map((message) => (
          message._id === updatedMessage._id ? updatedMessage : message
        ))
      );
      updateChatPreview(updatedMessage);
    });

    newSocket.on('message:deleted', ({ messageId, chatId }) => {
      setMessages((prevMessages) =>
        prevMessages.map((message) => (
          message._id === messageId
            ? {
                ...message,
                isDeleted: true,
                content: '',
              }
            : message
        ))
      );

      if (chatId === selectedChat?._id) {
        loadMessages(chatId);
      }
    });

    newSocket.on('message:read:updated', ({ messageId, userId, readAt }) => {
      setMessages((prevMessages) =>
        prevMessages.map((message) => {
          if (message._id !== messageId) {
            return message;
          }

          const nextDeliveryStatus = Array.isArray(message.deliveryStatus)
            ? [...message.deliveryStatus]
            : [];
          const existingIndex = nextDeliveryStatus.findIndex(
            (status) => getEntityId(status.userId) === getEntityId(userId)
          );

          if (existingIndex >= 0) {
            nextDeliveryStatus[existingIndex] = {
              ...nextDeliveryStatus[existingIndex],
              status: 'seen',
              seenAt: readAt,
            };
          } else {
            nextDeliveryStatus.push({
              userId,
              status: 'seen',
              seenAt: readAt,
            });
          }

          return {
            ...message,
            deliveryStatus: nextDeliveryStatus,
          };
        })
      );
    });

    newSocket.on('message:reaction:added', ({ messageId, userId, emoji }) => {
      setMessages((prevMessages) =>
        prevMessages.map((message) => {
          if (message._id !== messageId) {
            return message;
          }

          const alreadyPresent = (message.reactions || []).some(
            (reaction) => getEntityId(reaction.userId) === getEntityId(userId) && reaction.emoji === emoji
          );

          if (alreadyPresent) {
            return message;
          }

          return {
            ...message,
            reactions: [...(message.reactions || []), { userId, emoji }],
          };
        })
      );
    });

    newSocket.on('message:reaction:removed', ({ messageId, userId, emoji }) => {
      setMessages((prevMessages) =>
        prevMessages.map((message) => (
          message._id === messageId
            ? {
                ...message,
                reactions: (message.reactions || []).filter(
                  (reaction) =>
                    !(
                      getEntityId(reaction.userId) === getEntityId(userId) &&
                      reaction.emoji === emoji
                    )
                ),
              }
            : message
        ))
      );
    });

    newSocket.on('user:typing:started', ({ userId, chatId }) => {
      if (chatId === selectedChat?._id) {
        setTypingUsers((prevUsers) => new Set([...prevUsers, userId]));
      }
    });

    newSocket.on('user:typing:stopped', ({ userId, chatId }) => {
      if (chatId === selectedChat?._id) {
        setTypingUsers((prevUsers) => {
          const nextUsers = new Set(prevUsers);
          nextUsers.delete(userId);
          return nextUsers;
        });
      }
    });

    newSocket.on('call:incoming', (callData) => {
      setIncomingCall(callData || null);

      const incomingCallNotification = addNotificationEntry({
        id: `call-${getEntityId(callData?._id || callData?.callId)}`,
        type: 'call',
        callId: callData?._id || callData?.callId,
        chatId: callData?.chatId,
        title: `Incoming ${callData?.callType || 'audio'} call`,
        body: `${callData?.caller?.name || 'Someone'} is calling you`,
        createdAt: callData?.timestamp || new Date().toISOString(),
      });

      maybeShowDesktopNotification({
        title: incomingCallNotification.title,
        body: incomingCallNotification.body,
        tag: `call-${getEntityId(callData?._id || callData?.callId)}`,
        chatId: callData?.chatId,
        force: true,
      });
    });

    newSocket.on('call:accepted', (callData) => {
      const acceptedCallId = getEntityId(callData?.callId);
      const pendingCallId = getEntityId(
        activeCallRef.current?._id ||
        activeCallRef.current?.callId ||
        incomingCallRef.current?._id ||
        incomingCallRef.current?.callId
      );

      if (!acceptedCallId || !pendingCallId || pendingCallId !== acceptedCallId) {
        return;
      }

      setActiveCall((currentCall) => ({
        ...(currentCall || {}),
        ...callData,
        _id: callData.callId || currentCall?._id,
        status: 'accepted',
        currentUserId: resolvedCurrentUserId,
      }));
      setShowCallWindow(true);
      setIncomingCall(null);
    });

    newSocket.on('call:ended', (callData) => {
      const endedCallId = getEntityId(callData?.callId);
      if (!endedCallId) {
        return;
      }

      const activeCallId = getEntityId(activeCallRef.current?._id || activeCallRef.current?.callId);
      const incomingCallId = getEntityId(incomingCallRef.current?._id || incomingCallRef.current?.callId);

      if (activeCallId && activeCallId === endedCallId) {
        setActiveCall(null);
        setShowCallWindow(false);
      }

      if (incomingCallId && incomingCallId === endedCallId) {
        setIncomingCall(null);
      }
    });

    newSocket.on('call:declined', (callData) => {
      const declinedCallId = getEntityId(callData?.callId);
      if (!declinedCallId) {
        return;
      }

      const activeCallId = getEntityId(activeCallRef.current?._id || activeCallRef.current?.callId);
      if (activeCallId && activeCallId === declinedCallId) {
        setActiveCall((currentCall) =>
          currentCall
            ? {
                ...currentCall,
                status: 'declined',
              }
            : currentCall
        );
        setShowCallWindow(false);
      }

      addNotificationEntry({
        id: `call-declined-${declinedCallId}`,
        type: 'call-declined',
        callId: declinedCallId,
        chatId: activeCallRef.current?.chatId,
        title: 'Call declined',
        body: 'The other person declined your call.',
        createdAt: callData?.timestamp || new Date().toISOString(),
      });
    });

    newSocket.on('user:online', ({ userId }) => {
      setChats((prevChats) => prevChats.map((chat) => ({
        ...chat,
        participants: (chat.participants || []).map((participant) => (
          getEntityId(participant) === userId ? { ...participant, isOnline: true } : participant
        )),
      })));
    });

    newSocket.on('user:offline', ({ userId }) => {
      setChats((prevChats) => prevChats.map((chat) => ({
        ...chat,
        participants: (chat.participants || []).map((participant) => (
          getEntityId(participant) === userId ? { ...participant, isOnline: false } : participant
        )),
      })));
    });

    newSocket.on('notification:received', (notification) => {
      const nextNotification = addNotificationEntry(notification);

      maybeShowDesktopNotification({
        title: nextNotification.title,
        body: nextNotification.body,
        tag: `message-${String(nextNotification._id || nextNotification.id)}`,
        chatId: nextNotification.chatId,
      });
    });

    // Invitation listeners
    newSocket.on('invitation:received', (invitation) => {
      // Add to pending invitations
      setPendingInvitations((prevInvitations) => {
        const alreadyExists = prevInvitations.some((inv) => inv._id === invitation._id);
        if (alreadyExists) {
          return prevInvitations;
        }
        return [invitation, ...prevInvitations];
      });

      addNotificationEntry({
        id: `invitation-${invitation._id}`,
        type: 'invitation',
        title: 'New invitation',
        body: `New invitation from ${invitation.senderInfo?.name || 'a user'}`,
        createdAt: new Date().toISOString(),
        invitationId: invitation._id,
      });
    });

    newSocket.on('invitation:accepted', (data) => {
      const { invitationId, newContact } = data;

      // Remove from pending invitations
      setPendingInvitations((prevInvitations) =>
        prevInvitations.filter((inv) => inv._id !== invitationId)
      );

      // Add to contacts
      setContacts((prevContacts) => {
        const alreadyExists = prevContacts.some((contact) => getEntityId(contact) === getEntityId(newContact));
        if (alreadyExists) {
          return prevContacts;
        }
        return [...prevContacts, newContact];
      });

      addNotificationEntry({
        id: `invitation-accepted-${invitationId}`,
        type: 'invitation-accepted',
        title: 'Invitation accepted',
        body: `${newContact.name || newContact.username} accepted your invitation`,
        createdAt: new Date().toISOString(),
      });
    });

    newSocket.on('invitation:rejected', (data) => {
      const { invitationId, senderName } = data;

      // Remove from pending invitations
      setPendingInvitations((prevInvitations) =>
        prevInvitations.filter((inv) => inv._id !== invitationId)
      );

      addNotificationEntry({
        id: `invitation-rejected-${invitationId}`,
        type: 'invitation-rejected',
        title: 'Invitation rejected',
        body: `${senderName || 'A user'} rejected your invitation`,
        createdAt: new Date().toISOString(),
      });
    });

    return () => {
      if (selectedChat?._id) {
        newSocket.emit('chat:leave', selectedChat._id);
      }

      newSocket.disconnect();
    };
  }, [
    addNotificationEntry,
    apiCall,
    currentUser,
    flushMessageOutbox,
    loadMessages,
    maybeShowDesktopNotification,
    resolvedCurrentUserId,
    selectedChat,
    updateChatPreview,
  ]);

  useEffect(() => {
    if (socket && selectedChat?._id) {
      socket.emit('chat:join', selectedChat._id);
    }
  }, [socket, selectedChat]);

  useEffect(() => {
    const unreadMessages = messages.filter((message) => {
      if (isSameEntity(message.senderId, currentUser) || message.isDeleted) {
        return false;
      }

      return !(message.deliveryStatus || []).some(
        (status) => getEntityId(status.userId) === resolvedCurrentUserId && status.status === 'seen'
      );
    });

    if (!selectedChat?._id || unreadMessages.length === 0) {
      return;
    }

    const markMessagesRead = async () => {
      try {
        await apiCall(`/messaging/chats/${selectedChat._id}/mark-read`, 'PUT');
        const seenAt = new Date().toISOString();
        setMessages((prevMessages) =>
          prevMessages.map((message) => {
            if (isSameEntity(message.senderId, currentUser) || message.isDeleted) {
              return message;
            }

            const nextDeliveryStatus = Array.isArray(message.deliveryStatus)
              ? [...message.deliveryStatus]
              : [];
            const existingIndex = nextDeliveryStatus.findIndex(
              (status) => getEntityId(status.userId) === resolvedCurrentUserId
            );

            if (existingIndex >= 0) {
              nextDeliveryStatus[existingIndex] = {
                ...nextDeliveryStatus[existingIndex],
                status: 'seen',
                seenAt,
              };
            } else {
              nextDeliveryStatus.push({
                userId: resolvedCurrentUserId,
                status: 'seen',
                seenAt,
              });
            }

            return {
              ...message,
              deliveryStatus: nextDeliveryStatus,
            };
          })
        );

        unreadMessages.forEach((message) => {
          socketRef.current?.emit('message:read', {
            messageId: message._id,
            chatId: selectedChat._id,
          });
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };

    markMessagesRead();
  }, [apiCall, currentUser, messages, resolvedCurrentUserId, selectedChat]);

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    setShowNewChat(false);
  };

  const handleSelectChatroom = useCallback((chatroom) => {
    setSelectedChatroom(chatroom);
    setShowChatroomCreation(false);
    setShowChatroomBrowser(false);

    if (chatroom?._id) {
      loadChatroomDetails(chatroom._id);
      // Load messages for the chatroom
      loadMessages(chatroom._id);
      // Clear pagination for new chatroom
      setMessagePagination(DEFAULT_MESSAGE_PAGINATION);
      setLoadedMessagePages(1);
    }
  }, [loadChatroomDetails, loadMessages]);

  const handleOpenChatroomCreation = useCallback(() => {
    setShowChatroomCreation(true);
    setShowChatroomBrowser(false);
  }, []);

  const handleOpenChatroomBrowser = useCallback(() => {
    setShowChatroomBrowser(true);
    setShowChatroomCreation(false);
  }, []);

  const handleCloseChatroomWorkspace = useCallback(() => {
    setShowChatroomCreation(false);
    setShowChatroomBrowser(false);
  }, []);

  const handleChatroomCreated = useCallback(async (chatroom) => {
    setActiveTab('chatrooms');
    setShowChatroomCreation(false);
    setShowChatroomBrowser(false);
    await loadChatrooms();

    if (chatroom?._id) {
      setSelectedChatroom(chatroom);
      await loadChatroomDetails(chatroom._id);
    }
  }, [loadChatroomDetails, loadChatrooms]);

  const handleJoinChatroom = useCallback(async (chatroom) => {
    setActiveTab('chatrooms');
    setShowChatroomCreation(false);
    setShowChatroomBrowser(false);
    await loadChatrooms();

    if (chatroom?._id) {
      setSelectedChatroom(chatroom);
      await loadChatroomDetails(chatroom._id);
    }
  }, [loadChatroomDetails, loadChatrooms]);

  const handleChatroomAccessRequested = useCallback(() => {
    loadChatrooms();
  }, [loadChatrooms]);

  const handleLeaveChatroom = useCallback(async (chatroomId) => {
    const resolvedChatroomId = getEntityId(chatroomId);

    setChatrooms((prevChatrooms) =>
      prevChatrooms.filter((room) => getEntityId(room) !== resolvedChatroomId)
    );
    setSelectedChatroom((prevChatroom) => (
      getEntityId(prevChatroom) === resolvedChatroomId ? null : prevChatroom
    ));
    setShowChatroomCreation(false);
    setShowChatroomBrowser(false);

    await loadChatrooms();
  }, [loadChatrooms]);

  const handleRefreshChatroom = useCallback(async (chatroomId) => {
    const resolvedChatroomId = getEntityId(chatroomId) || getEntityId(selectedChatroom);

    if (!resolvedChatroomId) {
      return null;
    }

    const [chatroomDetails] = await Promise.all([
      loadChatroomDetails(resolvedChatroomId),
      loadChatrooms(),
    ]);

    return chatroomDetails;
  }, [loadChatroomDetails, loadChatrooms, selectedChatroom]);

  const handleShowOlderMessages = useCallback(async () => {
    if (!selectedChat?._id || loadingOlderMessages || selectedChatClearedAt) {
      return;
    }

    const nextPage = loadedMessagePages + 1;
    if (nextPage > (messagePagination.pages || 1)) {
      return;
    }

    try {
      setLoadingOlderMessages(true);
      await loadMessages(selectedChat._id, {
        page: nextPage,
        appendOlderMessages: true,
      });
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [
    loadMessages,
    loadedMessagePages,
    loadingOlderMessages,
    messagePagination.pages,
    selectedChat,
    selectedChatClearedAt,
  ]);

  const handleShowLatestOnly = useCallback(async () => {
    if (!selectedChat?._id) {
      return;
    }

    await loadMessages(selectedChat._id);
  }, [loadMessages, selectedChat]);

  const handleClearChat = useCallback(async () => {
    const activeChat = selectedChat || selectedChatroom;
    if (!activeChat?._id) {
      return;
    }

    const confirmed = window.confirm(
      'Clear this chat from your view? You can restore the hidden history anytime.'
    );
    if (!confirmed) {
      return;
    }

    const chatId = getEntityId(activeChat._id);
    const clearedAt = new Date().toISOString();
    const nextClearedChats = {
      ...clearedChatsRef.current,
      [chatId]: clearedAt,
    };

    clearedChatsRef.current = nextClearedChats;
    setClearedChats(nextClearedChats);
    setMessages((prevMessages) => filterMessagesByClearTimestamp(prevMessages, clearedAt));
    setFocusedMessageId('');

    try {
      await apiCall(`/messaging/chats/${activeChat._id}/mark-read`, 'PUT');
    } catch (error) {
      console.error('Error marking cleared chat as read:', error);
    }
  }, [apiCall, selectedChat, selectedChatroom]);

  const handleRestoreClearedChat = useCallback(async () => {
    const activeChat = selectedChat || selectedChatroom;
    if (!activeChat?._id) {
      return;
    }

    const chatId = getEntityId(activeChat._id);
    const nextClearedChats = { ...clearedChatsRef.current };
    delete nextClearedChats[chatId];

    clearedChatsRef.current = nextClearedChats;
    setClearedChats(nextClearedChats);
    await loadMessages(activeChat._id);
  }, [loadMessages, selectedChat, selectedChatroom]);

  const handleCreateDirectChat = async (userId) => {
    try {
      const response = await apiCall('/messaging/chats/direct', 'POST', {
        otherUserId: userId,
      });

      if (response?.chat) {
        setChats((prevChats) => {
          const filteredChats = prevChats.filter((chat) => chat._id !== response.chat._id);
          return [response.chat, ...filteredChats];
        });
        setSelectedChat(response.chat);
        setShowNewChat(false);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const handleGroupCreated = (group) => {
    setChats((prevChats) => {
      const filteredChats = prevChats.filter((chat) => chat._id !== group._id);
      return [group, ...filteredChats];
    });
    setSelectedChat(group);
    setShowNewChat(false);
    setNewChatMode('direct'); // Reset mode
  };

  const handleContactFilterChange = useCallback((nextFilterType) => {
    setContactFilterType(nextFilterType || 'all');
  }, []);

  const handleBlockContact = async (userId) => {
    try {
      await apiCall(`/messaging/contacts/${userId}/block`, 'PUT');
      await loadContacts(contactFilterType);
    } catch (error) {
      console.error('Error blocking contact:', error);
    }
  };

  const handleUnblockContact = async (userId) => {
    try {
      await apiCall(`/messaging/contacts/${userId}/unblock`, 'PUT');
      await loadContacts(contactFilterType);
    } catch (error) {
      console.error('Error unblocking contact:', error);
    }
  };

  const handleToggleFavorite = async (userId) => {
    try {
      await apiCall(`/messaging/contacts/${userId}/favorite`, 'PUT');
      await loadContacts(contactFilterType);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleScheduleBlock = (contact) => {
    setSelectedContactForScheduledBlock(contact);
    setShowScheduledBlockManager(true);
  };

  const handleSelectContact = (contact) => {
    const contactId = contact?.contactUserId?._id || contact?._id;

    if (contactId) {
      handleCreateDirectChat(contactId);
    }
  };

  const fileToBase64 = useCallback(
    (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const base64Value = String(reader.result || '').split(',')[1] || '';
          resolve(base64Value);
        };
        reader.onerror = reject;
      }),
    []
  );

  const uploadMessagingFile = useCallback(
    async (file) => {
      const fileData = await fileToBase64(file);
      const response = await apiCall('/messaging/files/upload', 'POST', {
        chatId: selectedChat?._id,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        fileData,
      });

      return response?.file || null;
    },
    [apiCall, fileToBase64, selectedChat]
  );

  const handleSendMessage = async (content, messageType = 'text', fileData = null, replyTo = null) => {
    if (!selectedChat?._id || (!content?.trim() && !fileData)) {
      console.warn('Cannot send message: missing chat ID or content');
      return;
    }

    const tempMessageId = `temp_${Date.now()}`;
    const clientMessageId = generateClientMessageId();
    const normalizedReplyTo = getEntityId(replyTo) || null;
    const optimisticCreatedAt = new Date().toISOString();
    const optimisticDeliveryStatus = selectedChat.participants.map((userId) => ({
      userId,
      status: isSameEntity(userId, currentUser) ? 'seen' : 'sending',
    }));

    try {
      const messageData = {
        chatId: selectedChat._id,
        content: content || fileData?.fileName || '',
        messageType,
        replyTo: normalizedReplyTo,
        clientMessageId,
      };

      if (fileData) {
        messageData.media = {
          type: fileData.mimeType,
          url: fileData.s3Url,
          size: fileData.fileSize,
          stickerId: fileData.stickerId || null,
          animated: Boolean(fileData.animated),
          category: fileData.category || '',
          tags: Array.isArray(fileData.tags) ? fileData.tags : [],
        };
      }

      // OPTIMISTIC UPDATE: Add message to UI immediately (before API response)
      const optimisticMessage = {
        _id: tempMessageId,
        clientMessageId,
        chatId: selectedChat._id,
        senderId: currentUser,
        content: messageData.content,
        messageType,
        media: messageData.media,
        replyTo: normalizedReplyTo,
        createdAt: optimisticCreatedAt,
        isPending: true, // Mark as pending
        deliveryStatus: optimisticDeliveryStatus,
      };

      console.log('📤 Optimistic message added:', optimisticMessage);
      setMessages((prevMessages) => [...prevMessages, optimisticMessage]);
      updateChatPreview(optimisticMessage);

      console.log('📤 Sending message to server:', messageData);
      const response = await apiCall('/messaging/messages', 'POST', messageData);
      console.log('📬 Server response:', response);

      if (response?.message) {
        // Replace temp message with real message from server
        removeOutboxEntry(clientMessageId);
        console.log('✅ Replacing temp message with real message:', response.message);
        setMessages((prevMessages) => mergeConfirmedMessage(prevMessages, response.message));
        updateChatPreview(response.message);
      } else {
        // Remove optimistic message on error
        console.error('❌ Server error - removing optimistic message');
        const errorMessage = 'Server did not confirm the message. It will retry automatically.';
        upsertOutboxEntry({
          clientMessageId,
          tempMessageId,
          chatId: selectedChat._id,
          senderId: currentUser,
          content: messageData.content,
          messageType,
          media: messageData.media || null,
          replyTo: normalizedReplyTo,
          createdAt: optimisticCreatedAt,
          attemptCount: 1,
          errorMessage,
          deliveryStatus: optimisticDeliveryStatus,
        });
        syncFailedMessageState(clientMessageId, {
          isPending: false,
          isFailed: true,
          errorMessage,
        });
      }

      return response?.message || null;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      console.error('Server response payload:', error?.response?.data);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Message queued and will retry automatically when you are back online.';
      upsertOutboxEntry({
        clientMessageId,
        tempMessageId,
        chatId: selectedChat._id,
        senderId: currentUser,
        content: content || fileData?.fileName || '',
        messageType,
        media:
          fileData
            ? {
                type: fileData.mimeType,
                url: fileData.s3Url,
                size: fileData.fileSize,
                stickerId: fileData.stickerId || null,
                animated: Boolean(fileData.animated),
                category: fileData.category || '',
                tags: Array.isArray(fileData.tags) ? fileData.tags : [],
              }
            : null,
        replyTo: normalizedReplyTo,
        createdAt: optimisticCreatedAt,
        attemptCount: 1,
        errorMessage,
        deliveryStatus: optimisticDeliveryStatus,
      });
      syncFailedMessageState(clientMessageId, {
        isPending: false,
        isFailed: true,
        errorMessage,
      });
      loadChats();
      return null;
    }
  };

  const handleEditMessage = async (messageId, content) => {
    try {
      const response = await apiCall(`/messaging/messages/${messageId}`, 'PUT', {
        content,
      });

      if (response?.message) {
        setMessages((prevMessages) =>
          prevMessages.map((message) => (
            message._id === response.message._id ? response.message : message
          ))
        );
        updateChatPreview(response.message);
      }
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await apiCall(`/messaging/messages/${messageId}`, 'DELETE');
      setMessages((prevMessages) =>
        prevMessages.map((message) => (
          message._id === messageId
            ? { ...message, isDeleted: true, content: '' }
            : message
        ))
      );
      await loadChats();
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleToggleImportant = async (messageId) => {
    try {
      const response = await apiCall(
        `/messaging/messages/${messageId}/important`,
        'PUT'
      );

      if (response?.message) {
        setMessages((prevMessages) =>
          prevMessages.map((message) => (
            message._id === response.message._id ? response.message : message
          ))
        );
      }
    } catch (error) {
      console.error('Error toggling important:', error);
    }
  };

  const handleDeleteAllMessages = async () => {
    const activeChat = selectedChat || selectedChatroom;
    if (!activeChat?._id) {
      return;
    }

    const chatTitle = activeChat.isGroupChat
      ? activeChat.groupName
      : getOtherParticipant(activeChat, currentUser)?.name || 'this chat';

    const confirmed = window.confirm(
      `Are you sure you want to delete all messages in "${chatTitle}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await apiCall(`/messaging/chats/${selectedChat._id}/messages`, 'DELETE');

      if (response?.deletedCount !== undefined) {
        // Clear messages from state
        setMessages([]);
        console.log(`Deleted ${response.deletedCount} messages`);
      }
    } catch (error) {
      console.error('Error deleting all messages:', error);
      alert('Failed to delete messages. Please try again.');
    }
  };

  const handleRetryMessage = async (message) => {
    try {
      const queuedMessage = outboxRef.current.find(
        (entry) => entry.clientMessageId === message?.clientMessageId
      );

      if (!queuedMessage) {
        return;
      }

      await retryQueuedMessage(queuedMessage, { manual: true });
    } catch (error) {
      console.error('Error retrying queued message:', error);
    }
  };

  const handleExportChat = async () => {
    const activeChat = selectedChat || selectedChatroom;
    if (!activeChat?._id || typeof window === 'undefined') {
      return;
    }

    try {
      const response = await apiCall(`/messaging/chats/${activeChat._id}/export`, 'GET');
      const exportPayload = response?.chatExport;

      if (!exportPayload) {
        throw new Error('No export data was returned.');
      }

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json',
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const chatLabel =
        selectedChat?.groupName ||
        getOtherParticipant(selectedChat, currentUser)?.name ||
        'chat';

      link.href = downloadUrl;
      link.download = `${String(chatLabel).trim().replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'chat'}-export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error exporting chat:', error);
    }
  };

  const handleAddReaction = async (messageId, emoji) => {
    try {
      const currentMessage = messages.find((message) => message._id === messageId);
      const hadReaction = (currentMessage?.reactions || []).some(
        (reaction) => getEntityId(reaction.userId) === resolvedCurrentUserId && reaction.emoji === emoji
      );

      const response = await apiCall(`/messaging/messages/${messageId}/reactions`, 'POST', {
        emoji,
      });

      if (response?.message) {
        setMessages((prevMessages) =>
          prevMessages.map((message) => (
            message._id === response.message._id ? response.message : message
          ))
        );
      }

      socketRef.current?.emit(
        hadReaction ? 'message:reaction:remove' : 'message:reaction:add',
        {
          messageId,
          chatId: selectedChat?._id,
          emoji,
        }
      );
    } catch (error) {
      console.error('Error updating reaction:', error);
    }
  };

  const handleSearchMessages = async (query, chatId) => {
    try {
      const response = await apiCall('/messaging/search/messages', 'GET', {
        query,
        chatId: chatId || selectedChat?._id,
      });
      const clearedAt = getChatClearTimestamp(chatId || selectedChat?._id, clearedChatsRef.current);
      return filterMessagesByClearTimestamp(response?.messages || [], clearedAt);
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  };

  const handleTyping = (isTyping) => {
    if (socket && selectedChat?._id) {
      socket.emit(isTyping ? 'user:typing' : 'user:typing:stopped', selectedChat._id);
    }
  };

  const handleStartCall = async (callType = 'audio') => {
    if (!selectedChat?._id) {
      return;
    }

    try {
      const otherParticipant = getOtherParticipant(selectedChat, currentUser);
      if (!getEntityId(otherParticipant)) {
        throw new Error('Calls are currently available for direct chats with one other participant.');
      }

      const response = await apiCall('/messaging/calls/initiate', 'POST', {
        chatId: selectedChat._id,
        recipientId: getEntityId(otherParticipant),
        callType,
      });

      if (response?.call) {
        setActiveCall({
          ...response.call,
          currentUserId: resolvedCurrentUserId,
          initiatorId: response.call.initiatorId || resolvedCurrentUserId,
          recipient: otherParticipant,
        });
        setShowCallWindow(true);
      }
    } catch (error) {
      console.error('Error starting call:', error);
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall?._id) {
      return;
    }

    try {
      const response = await apiCall(`/messaging/calls/${incomingCall._id}/accept`, 'POST');
      setActiveCall({
        ...(response?.call || incomingCall),
        currentUserId: resolvedCurrentUserId,
        caller: incomingCall.caller,
      });
      setShowCallWindow(true);
      setIncomingCall(null);
    } catch (error) {
      console.error('Error accepting call:', error);
    }
  };

  const handleDeclineCall = async () => {
    if (!incomingCall?._id) {
      return;
    }

    try {
      await apiCall(`/messaging/calls/${incomingCall._id}/decline`, 'POST');
      setIncomingCall(null);
    } catch (error) {
      console.error('Error declining call:', error);
    }
  };

  const handleEndCall = async () => {
    if (!activeCall?._id) {
      return;
    }

    try {
      await apiCall(`/messaging/calls/${activeCall._id}/end`, 'POST');
      setActiveCall(null);
      setShowCallWindow(false);
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const handleFileUploaded = async (uploadedFiles) => {
    try {
      for (const file of uploadedFiles) {
        const messageType = inferMessageTypeFromMimeType(file?.mimeType);
        const fallbackLabel = messageType === 'file' ? `Shared a file: ${file.fileName}` : file.fileName;
        await handleSendMessage(fallbackLabel, messageType, file);
      }
    } catch (error) {
      console.error('Error sending uploaded file:', error);
      alert(error.message || 'Unable to send that file right now.');
    }
  };

  const handleVoiceNoteRecorded = async (audioFile) => {
    if (!audioFile || !selectedChat?._id) {
      return;
    }

    try {
      if (!audioFile.size) {
        throw new Error('No audio was recorded. Please try again.');
      }

      setSendingVoiceNote(true);
      const uploadedFile = await uploadMessagingFile(audioFile);

      if (!uploadedFile) {
        throw new Error('Voice note upload failed.');
      }

      await handleSendMessage('Voice note', 'voice', uploadedFile);
    } catch (error) {
      console.error('Error sending voice note:', error);
      alert(error.message || 'Unable to send voice note right now.');
    } finally {
      setSendingVoiceNote(false);
    }
  };

  const handleAISuggestionSelect = (replyText) => {
    handleSendMessage(replyText);
    setShowAISuggestions(false);
  };

  const handleToggleEncryption = async () => {
    if (!selectedChat?._id) {
      return;
    }

    try {
      const response = await apiCall('/messaging/encryption/toggle', 'POST', {
        chatId: selectedChat._id,
        enabled: !encryptionEnabled,
      });

      setEncryptionEnabled(Boolean(response?.enabled));
    } catch (error) {
      console.error('Error toggling encryption:', error);
    }
  };

  const handleClearAllNotifications = () => {
    apiCall('/messaging/notifications/mark-all-read', 'PUT')
      .then(() => {
        setNotifications((prevNotifications) =>
          prevNotifications.map((notification) => ({
            ...notification,
            isRead: true,
          }))
        );
      })
      .catch((error) => {
        console.error('Error clearing notifications:', error);
      });
  };

  const handleSelectNotification = async (notification) => {
    const notificationId = notification?._id || notification?.id;
    const notificationChatId = getEntityId(notification?.chatId);
    const notificationMessageId = getEntityId(notification?.messageId);

    try {
      if (notificationId && !notification.isRead && isMongoObjectId(notificationId)) {
        await apiCall(`/messaging/notifications/${notificationId}/read`, 'PUT');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }

    setNotifications((prevNotifications) =>
      prevNotifications.map((entry) => (
        String(entry._id || entry.id) === String(notificationId)
          ? { ...entry, isRead: true }
          : entry
      ))
    );

    if (notificationChatId) {
      let targetChat = chats.find((chat) => chat._id === notificationChatId);

      if (!targetChat) {
        try {
          const response = await apiCall(`/messaging/chats/${notificationChatId}`, 'GET');
          if (response?.chat) {
            targetChat = response.chat;
            setChats((prevChats) => [response.chat, ...prevChats.filter((chat) => chat._id !== response.chat._id)]);
          }
        } catch (error) {
          console.error('Error loading notification chat:', error);
        }
      }

      if (targetChat) {
        setSelectedChat(targetChat);
        setActiveTab('chats');
        setShowNewChat(false);
      }
    }

    if (notificationMessageId) {
      setFocusedMessageId(notificationMessageId);
    }
  };

  return (
    <div className="messaging-container">
      <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
        <span className="status-dot"></span>
        {isOnline ? 'Connected' : 'Disconnected'}
      </div>

      {incomingCall && (
        <div className="incoming-call-notification">
          <div className="call-info">
            <span className="caller-avatar">
              {getAvatarLabel(
                incomingCall.caller?.name,
                incomingCall.caller?.username,
                incomingCall.caller?.avatar,
                'U'
              )}
            </span>
            <div className="call-details">
              <h4>{incomingCall.caller?.name || 'Unknown Caller'}</h4>
              <p>Incoming {incomingCall.callType} call</p>
            </div>
          </div>
          <div className="call-actions">
            <button className="btn-decline" onClick={handleDeclineCall}>
              Decline
            </button>
            <button className="btn-accept" onClick={handleAcceptCall}>
              Accept
            </button>
          </div>
        </div>
      )}

      <div className="messaging-layout">
        <div className="messaging-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-tabs">
              <button
                className={`tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
                onClick={() => setActiveTab('chats')}
                type="button"
              >
                Chats
              </button>
              <button
                className={`tab-btn ${activeTab === 'chatrooms' ? 'active' : ''}`}
                onClick={() => setActiveTab('chatrooms')}
                type="button"
              >
                Chatrooms
              </button>
              <button
                className={`tab-btn ${activeTab === 'contacts' ? 'active' : ''}`}
                onClick={() => setActiveTab('contacts')}
                type="button"
              >
                Contacts
              </button>
              <button
                className={`tab-btn ${activeTab === 'invitations' ? 'active' : ''}`}
                onClick={() => setActiveTab('invitations')}
                type="button"
              >
                {`Invites${pendingInvitations.length > 0 ? ` (${pendingInvitations.length})` : ''}`}
              </button>
              <button
                className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
                type="button"
              >
                Settings
              </button>
            </div>
            <div className="sidebar-tools">
              <NotificationBell
                notifications={notifications}
                onClear={handleClearAllNotifications}
                onSelectNotification={handleSelectNotification}
              />
              {notificationPermission === 'default' && (
                <button
                  className="notification-enable-btn"
                  onClick={handleEnableNotifications}
                  type="button"
                >
                  Enable Alerts
                </button>
              )}
            </div>
          </div>

          {activeTab === 'chats' && (
            <ChatList
              chats={chats}
              selectedChat={selectedChat}
              onSelectChat={handleSelectChat}
              onNewChat={() => setShowNewChat(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              clearedChats={clearedChats}
            />
          )}

          {activeTab === 'chatrooms' && (
            <ChatroomList
              chatrooms={chatrooms}
              selectedChatroom={selectedChatroom}
              onSelectChatroom={handleSelectChatroom}
              onNewChatroom={handleOpenChatroomCreation}
              onBrowseChatrooms={handleOpenChatroomBrowser}
              searchQuery={chatroomSearchQuery}
              onSearchChange={setChatroomSearchQuery}
              loading={loadingChatrooms}
            />
          )}

          {activeTab === 'contacts' && (
            <ContactsList
              contacts={contacts}
              filterType={contactFilterType}
              onSelectContact={handleSelectContact}
              onBlockContact={handleBlockContact}
              onUnblockContact={handleUnblockContact}
              onToggleFavorite={handleToggleFavorite}
              onScheduleBlock={handleScheduleBlock}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onFilterChange={handleContactFilterChange}
            />
          )}

          {activeTab === 'invitations' && (
            <InvitationPanel
              invitations={pendingInvitations}
              onAccept={handleAcceptInvitation}
              onReject={handleRejectInvitation}
              loading={loadingInvitations}
            />
          )}

          {activeTab === 'settings' && (
            <div className="settings-panel">
              <div className="settings-tabs">
                <button
                  className={`settings-tab-btn ${activeSettingsTab === 'visibility' ? 'active' : ''}`}
                  onClick={() => setActiveSettingsTab('visibility')}
                  type="button"
                >
                  Visibility
                </button>
                <button
                  className={`settings-tab-btn ${activeSettingsTab === 'contact' ? 'active' : ''}`}
                  onClick={() => setActiveSettingsTab('contact')}
                  type="button"
                >
                  Contact
                </button>
              </div>
              {activeSettingsTab === 'visibility' && (
                <VisibilitySettings user={currentUser} onUpdate={() => {}} />
              )}
              {activeSettingsTab === 'contact' && (
                <ContactMeansSettings user={currentUser} onUpdate={() => {}} />
              )}
            </div>
          )}
        </div>

        <div className="messaging-main">
          {activeTab === 'chatrooms' ? (
            showChatroomCreation ? (
              <ChatroomCreation
                onChatroomCreated={handleChatroomCreated}
                onCancel={handleCloseChatroomWorkspace}
              />
            ) : showChatroomBrowser ? (
              <ChatroomBrowser
                onJoinChatroom={handleJoinChatroom}
                onRequestAccess={handleChatroomAccessRequested}
                onCancel={handleCloseChatroomWorkspace}
              />
            ) : selectedChatroom ? (
              <div className="chatroom-chat-layout">
                <ChatWindow
                  chat={{
                    ...selectedChatroom,
                    _id: selectedChatroom._id,
                    type: 'chatroom',
                    groupName: selectedChatroom.name,
                    participants: selectedChatroom.members || [],
                  }}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={handleDeleteMessage}
                  onToggleImportant={handleToggleImportant}
                  onAddReaction={handleAddReaction}
                  onSearchMessages={handleSearchMessages}
                  onTyping={handleTyping}
                  typingUsers={typingUsers}
                  encryptionEnabled={encryptionEnabled}
                  onToggleEncryption={handleToggleEncryption}
                  onStartCall={handleStartCall}
                  onOpenFileUpload={() => setShowFileUpload(true)}
                  onSendVoiceMessage={handleVoiceNoteRecorded}
                  sendingVoiceMessage={sendingVoiceNote}
                  focusedMessageId={focusedMessageId}
                  onFocusHandled={() => setFocusedMessageId('')}
                  totalMessages={messagePagination.total}
                  canShowOlderMessages={loadedMessagePages < (messagePagination.pages || 1)}
                  hasOlderMessagesLoaded={loadedMessagePages > 1}
                  loadingOlderMessages={loadingOlderMessages}
                  onShowOlderMessages={handleShowOlderMessages}
                  onShowLatestOnly={handleShowLatestOnly}
                  onRetryMessage={handleRetryMessage}
                  onClearChat={handleClearChat}
                  onRestoreClearedChat={handleRestoreClearedChat}
                  isChatCleared={Boolean(selectedChatClearedAt)}
                  onDeleteAllMessages={handleDeleteAllMessages}
                  onExportChat={handleExportChat}
                />
                <div className="chatroom-panel-sidebar">
                  <ChatroomPanel
                    chatroom={selectedChatroom}
                    onLeaveChatroom={handleLeaveChatroom}
                    onClose={() => setSelectedChatroom(null)}
                    onRefreshChatroom={handleRefreshChatroom}
                  />
                </div>
              </div>
            ) : (
              <div className="messaging-empty-state messaging-empty-state-rich">
                <div className="messaging-empty-shell">
                  <div className="messaging-empty-hero">
                    <h2>Chatrooms Workspace</h2>
                    <p>Select a chatroom or create one to start chatting.</p>
                  </div>
                  <div className="messaging-empty-actions">
                    <button
                      type="button"
                      className="messaging-empty-action-btn primary"
                      onClick={handleOpenChatroomCreation}
                    >
                      Create Chatroom
                    </button>
                    <button
                      type="button"
                      className="messaging-empty-action-btn"
                      onClick={handleOpenChatroomBrowser}
                    >
                      Browse Public Rooms
                    </button>
                  </div>
                  <div className="messaging-empty-metrics">
                    <div className="messaging-empty-metric">
                      <span className="metric-label">My rooms</span>
                      <strong>{chatrooms.length}</strong>
                    </div>
                    <div className="messaging-empty-metric">
                      <span className="metric-label">Public rooms</span>
                      <strong>{chatrooms.filter((room) => !room?.isPrivate).length}</strong>
                    </div>
                    <div className="messaging-empty-metric">
                      <span className="metric-label">Private rooms</span>
                      <strong>{chatrooms.filter((room) => room?.isPrivate).length}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : showNewChat ? (
            newChatMode === 'group' ? (
              <GroupCreation
                onGroupCreated={handleGroupCreated}
                onCancel={() => {
                  setShowNewChat(false);
                  setNewChatMode('direct');
                }}
              />
            ) : (
              <div className="new-chat-panel">
                <div className="new-chat-mode-toggle">
                  <button
                    className={`mode-btn ${newChatMode === 'direct' ? 'active' : ''}`}
                    onClick={() => setNewChatMode('direct')}
                    type="button"
                  >
                    💬 Direct Chat
                  </button>
                  <button
                    className={`mode-btn ${newChatMode === 'group' ? 'active' : ''}`}
                    onClick={() => setNewChatMode('group')}
                    type="button"
                  >
                    👥 Create Group
                  </button>
                </div>

                <div className="new-chat-header-copy">
                  <h3>Start a New Chat</h3>
                  <p className="new-chat-intro">
                    Search for people, send a LinkUp invite, or jump into a conversation with someone you already know.
                  </p>
                </div>
                <div className="new-chat-search">
                  <input
                    type="text"
                    placeholder="Search for people to invite..."
                    value={newChatSearchQuery}
                    onChange={(e) => {
                      setNewChatSearchQuery(e.target.value);
                      searchUsers(e.target.value);
                    }}
                    className="search-input"
                  />
                </div>

                {newChatSearchQuery.trim() ? (
                  <div className="search-results">
                    {searchingUsers ? (
                      <p className="loading">Searching...</p>
                    ) : availableUsers.length > 0 ? (
                      availableUsers.map((user) => {
                        const visibility = user.visibility || {
                          visibleViaEmail: true,
                          visibleViaPhone: true,
                          visibleViaUsername: true,
                        };
                        const contactMeans = user.contactMeans || {
                          availableForChat: true,
                          availableForVoiceCall: true,
                          availableForVideoCall: true,
                        };
                        const visibleMethods = [];
                        if (visibility.visibleViaEmail) visibleMethods.push('Email');
                        if (visibility.visibleViaPhone) visibleMethods.push('Phone');
                        if (visibility.visibleViaUsername) visibleMethods.push('Username');

                        const availableMeans = [];
                        if (contactMeans.availableForChat) availableMeans.push('Chat');
                        if (contactMeans.availableForVoiceCall) availableMeans.push('Voice');
                        if (contactMeans.availableForVideoCall) availableMeans.push('Video');

                        return (
                          <div key={user._id} className="user-search-result">
                            <span className="user-avatar">{getAvatarLabel(user.name, user.username, user.avatar, 'U')}</span>
                            <div className="user-info">
                              <h4>{user.name}</h4>
                              <p>{user.email}</p>
                              <div className="badges-row">
                                <div className="visibility-badges">
                                  {visibleMethods.map((method, idx) => (
                                    <span key={idx} className="visibility-badge" title="Can find you via this method">
                                      {method}
                                    </span>
                                  ))}
                                </div>
                                <div className="contact-means-badges">
                                  {availableMeans.map((means, idx) => (
                                    <span key={idx} className="contact-means-badge" title="Available for this contact method">
                                      {means}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <button
                              className="btn-add-contact"
                              onClick={() => handleAddContact(user._id, user.name, user.email, user.username)}
                            >
                              + Invite
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <p className="no-results">No users found. Try another search.</p>
                    )}
                  </div>
                ) : (
                  <div className="available-users">
                    <p className="section-title">Your Contacts</p>
                    {contacts.filter((c) => !c.isBlocked).length > 0 ? (
                      contacts
                        .filter((contact) => !contact.isBlocked)
                        .map((contact) => (
                          <div
                            key={contact._id}
                            className="user-card"
                            onClick={() => handleCreateDirectChat(contact.contactUserId._id)}
                          >
                            <span className="user-avatar">{getAvatarLabel(contact.displayName, contact.contactUserId?.name, contact.contactUserId?.username, contact.contactUserId?.avatar, 'U')}</span>
                            <h4>{contact.contactUserId?.name}</h4>
                            <p>{contact.category}</p>
                          </div>
                        ))
                    ) : (
                      <p className="no-contacts">No contacts yet. Search above to add one!</p>
                    )}
                  </div>
                )}
              </div>
            )
          ) : selectedChat ? (
            <>
              <ChatWindow
                chat={selectedChat}
                messages={messages}
                onSendMessage={handleSendMessage}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
                onToggleImportant={handleToggleImportant}
                onAddReaction={handleAddReaction}
                onSearchMessages={handleSearchMessages}
                onTyping={handleTyping}
                typingUsers={typingUsers}
                encryptionEnabled={encryptionEnabled}
                onToggleEncryption={handleToggleEncryption}
                onStartCall={handleStartCall}
                onOpenFileUpload={() => setShowFileUpload(true)}
                onSendVoiceMessage={handleVoiceNoteRecorded}
                sendingVoiceMessage={sendingVoiceNote}
                focusedMessageId={focusedMessageId}
                onFocusHandled={() => setFocusedMessageId('')}
                totalMessages={messagePagination.total}
                canShowOlderMessages={!selectedChatClearedAt && loadedMessagePages < (messagePagination.pages || 1)}
                hasOlderMessagesLoaded={!selectedChatClearedAt && loadedMessagePages > 1}
                loadingOlderMessages={loadingOlderMessages}
                onShowOlderMessages={handleShowOlderMessages}
                onShowLatestOnly={handleShowLatestOnly}
                onClearChat={handleClearChat}
                onRestoreClearedChat={handleRestoreClearedChat}
                isChatCleared={Boolean(selectedChatClearedAt)}
                onDeleteAllMessages={handleDeleteAllMessages}
                onRetryMessage={handleRetryMessage}
                onExportChat={handleExportChat}
                showAISuggestions={showAISuggestions}
                latestMessageId={latestMessageId}
                onSelectAISuggestion={handleAISuggestionSelect}
              />

              {showFileUpload && (
                <FileUpload
                  chatId={selectedChat?._id}
                  onFileUploaded={handleFileUploaded}
                  onClose={() => setShowFileUpload(false)}
                />
              )}

              {showCallWindow && activeCall && (
                <CallWindow
                  call={activeCall}
                  socket={socket}
                  onEndCall={handleEndCall}
                  onAcceptCall={handleAcceptCall}
                  onDeclineCall={handleDeclineCall}
                />
              )}
            </>
          ) : (
            <div className="messaging-empty-state messaging-empty-state-rich">
              <div className="messaging-empty-shell">
                <div className="messaging-empty-hero">
                  <h2>LinkUp Conversations</h2>
                  <p>Select a chat to start messaging.</p>
                </div>
                <div className="messaging-status-pills" aria-label="Platform status">
                  <span className="messaging-status-pill">Encrypted</span>
                  <span className="messaging-status-pill">{isOnline ? 'Online' : 'Offline'}</span>
                  <span className="messaging-status-pill">{isNetworkOnline ? 'Synced' : 'Sync paused'}</span>
                  <span className="messaging-status-pill">Realtime</span>
                </div>

                <div className="messaging-empty-metrics">
                  <div className="messaging-empty-metric">
                    <span className="metric-label">💬 Active Chats</span>
                    <strong>{chats.length}</strong>
                  </div>
                  <div className="messaging-empty-metric">
                    <span className="metric-label">🔔 Unread</span>
                    <strong>{unreadChatsCount}</strong>
                  </div>
                  <div className="messaging-empty-metric">
                    <span className="metric-label">🟢 Online Now</span>
                    <strong>{activeNowCount}</strong>
                  </div>
                </div>

                <div className="messaging-empty-actions">
                  <button
                    type="button"
                    className="messaging-empty-action-btn primary"
                    onClick={() => setShowNewChat(true)}
                  >
                    Start Secure Conversation
                  </button>
                  <button
                    type="button"
                    className="messaging-empty-action-btn"
                    onClick={() => setActiveTab('chatrooms')}
                  >
                    Explore Rooms
                  </button>
                </div>

                {recentConversationCards.length > 0 && (
                  <div className="messaging-empty-recent">
                    <h3>Recent conversations</h3>
                    <div className="messaging-empty-recent-list">
                      {recentConversationCards.map((card) => (
                        <button
                          key={card.id}
                          type="button"
                          className="messaging-empty-recent-card"
                          onClick={() => {
                            const targetChat = chats.find((chat) => chat._id === card.id);
                            if (targetChat) {
                              handleSelectChat(targetChat);
                            }
                          }}
                        >
                          <span className={`recent-presence-dot ${card.online ? 'online' : ''}`}></span>
                          <div className="recent-copy">
                            <strong>{card.title}</strong>
                            <p>{card.preview}</p>
                          </div>
                          <div className="recent-meta">
                            {card.unreadCount > 0 && (
                              <span className="recent-unread-count">{card.unreadCount}</span>
                            )}
                            <span>{card.time}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="messaging-empty-insights-grid">
                  <section className="messaging-insight-card">
                    <h4>Online users</h4>
                    {onlineContactsPreview.length > 0 ? (
                      <div className="messaging-online-user-list">
                        {onlineContactsPreview.map((entry) => (
                          <span key={entry.id} className="messaging-online-user-chip">
                            <span className="messaging-online-dot"></span>
                            {entry.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="messaging-insight-empty">No contacts are online yet.</p>
                    )}
                  </section>

                  <section className="messaging-insight-card">
                    <h4>Suggested conversations</h4>
                    {suggestedConversationCards.length > 0 ? (
                      <div className="messaging-insight-list">
                        {suggestedConversationCards.map((card) => (
                          <button
                            key={card.id}
                            type="button"
                            className="messaging-inline-link"
                            onClick={() => {
                              const targetChat = chats.find((chat) => chat._id === card.id);
                              if (targetChat) {
                                handleSelectChat(targetChat);
                              }
                            }}
                          >
                            <strong>{card.title}</strong>
                            <span>{card.online ? 'Online' : card.time}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="messaging-insight-empty">We will suggest active chats here.</p>
                    )}
                  </section>

                  <section className="messaging-insight-card">
                    <h4>Recent media & files</h4>
                    {recentSharedItems.length > 0 ? (
                      <ul className="messaging-insight-bullets">
                        {recentSharedItems.map((item) => (
                          <li key={`${item.id}-${item.type}`}>
                            <span>{item.title}</span>
                            <em>{item.type}</em>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="messaging-insight-empty">Recent shared files will appear here.</p>
                    )}
                  </section>

                  <section className="messaging-insight-card">
                    <h4>AI suggestions</h4>
                    <ul className="messaging-insight-bullets">
                      {aiAssistantHints.map((hint) => (
                        <li key={hint}>{hint}</li>
                      ))}
                    </ul>
                  </section>

                  <section className="messaging-insight-card messaging-insight-card-wide">
                    <h4>Secure messaging highlights</h4>
                    <ul className="messaging-insight-bullets">
                      <li>End-to-end encrypted transport for live chats and calls</li>
                      <li>Delivery syncing across devices with retry-aware queueing</li>
                      <li>Realtime presence, typing indicators, and unread badges</li>
                    </ul>
                  </section>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showScheduledBlockManager && selectedContactForScheduledBlock && (
        <div className="modal-overlay">
          <ScheduledBlockManager
            contact={selectedContactForScheduledBlock}
            onClose={() => setShowScheduledBlockManager(false)}
            onBlockAdded={() => loadContacts(contactFilterType)}
          />
        </div>
      )}

      {loading && <div className="messaging-loading">Loading chats...</div>}
    </div>
  );
};

export default Messaging;
