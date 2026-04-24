import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import { getStoredAuthToken } from '../../utils/auth';
import '../../styles/Messaging.css';
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
import io from 'socket.io-client';
import { BACKEND_BASE_URL } from '../../utils/api';
import { getEntityId, inferMessageTypeFromMimeType, isSameEntity } from './utils';

const getOtherParticipant = (chat, currentUser) =>
  chat?.participants?.find((participant) => !isSameEntity(participant, currentUser)) || null;

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
  const [focusedMessageId, setFocusedMessageId] = useState('');
  const [newChatSearchQuery, setNewChatSearchQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [sendingVoiceNote, setSendingVoiceNote] = useState(false);

  const socketRef = useRef(null);
  const activeCallRef = useRef(null);
  const incomingCallRef = useRef(null);
  const currentUserId = getEntityId(currentUser);
  const resolvedCurrentUserId = useMemo(() => {
    const selectedChatParticipant = selectedChat?.participants?.find((participant) =>
      isSameEntity(participant, currentUser)
    );

    return getEntityId(selectedChatParticipant) || currentUserId;
  }, [currentUser, currentUserId, selectedChat]);
  const latestMessageId = messages[messages.length - 1]?._id;

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

  const loadChats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiCall('/messaging/chats', 'GET');
      if (response?.chats) {
        setChats(response.chats);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  const loadContacts = useCallback(async () => {
    try {
      const response = await apiCall('/messaging/contacts', 'GET');
      if (response?.contacts) {
        setContacts(response.contacts);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  }, [apiCall]);

  const loadMessages = useCallback(async (chatId) => {
    try {
      const response = await apiCall(`/messaging/messages/${chatId}`, 'GET');
      if (response?.messages) {
        setMessages(response.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [apiCall]);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await apiCall('/messaging/notifications', 'GET');
      if (response?.notifications) {
        setNotifications(response.notifications);
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
        await loadContacts();
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
    loadChats();
    loadContacts();
    loadNotifications();
    loadInvitations();
  }, [loadChats, loadContacts, loadNotifications, loadInvitations]);

  useEffect(() => {
    if (selectedChat?._id) {
      loadMessages(selectedChat._id);
      checkEncryptionStatus(selectedChat._id);
      setShowAISuggestions(true);
      return;
    }

    setMessages([]);
    setShowAISuggestions(false);
    setEncryptionEnabled(false);
  }, [selectedChat, loadMessages, checkEncryptionStatus]);

  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }

    const newSocket = io(BACKEND_BASE_URL, {
      auth: {
        token: getStoredAuthToken(),
      },
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsOnline(true);
    });

    newSocket.on('disconnect', () => {
      setIsOnline(false);
    });

    newSocket.on('message:received', (message) => {
      console.log('🔔 Socket message:received event:', message);
      console.log('📍 Current selected chat ID:', selectedChat?._id);
      console.log('📍 Incoming message chat ID:', message.chatId);
      
      if (getEntityId(message.chatId) === selectedChat?._id) {
        console.log('✅ Message is for selected chat, adding to messages');
        setMessages((prevMessages) => {
          if (prevMessages.some((existingMessage) => existingMessage._id === message._id)) {
            console.log('⏭️ Message already exists in array, skipping duplicate');
            return prevMessages;
          }

          console.log('📋 Adding message to array');
          return [...prevMessages, message];
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
      setNotifications((prevNotifications) => [notification, ...prevNotifications]);
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

      // Show notification
      setNotifications((prevNotifications) => [{
        type: 'invitation',
        message: `New invitation from ${invitation.senderInfo?.name || 'a user'}`,
        timestamp: new Date(),
        invitationId: invitation._id,
      }, ...prevNotifications]);
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

      // Show notification
      setNotifications((prevNotifications) => [{
        type: 'invitation-accepted',
        message: `${newContact.name || newContact.username} accepted your invitation`,
        timestamp: new Date(),
      }, ...prevNotifications]);
    });

    newSocket.on('invitation:rejected', (data) => {
      const { invitationId, senderName } = data;

      // Remove from pending invitations
      setPendingInvitations((prevInvitations) =>
        prevInvitations.filter((inv) => inv._id !== invitationId)
      );

      // Show notification
      setNotifications((prevNotifications) => [{
        type: 'invitation-rejected',
        message: `${senderName || 'A user'} rejected your invitation`,
        timestamp: new Date(),
      }, ...prevNotifications]);
    });

    return () => {
      if (selectedChat?._id) {
        newSocket.emit('chat:leave', selectedChat._id);
      }

      newSocket.disconnect();
    };
  }, [currentUser, loadMessages, selectedChat, updateChatPreview]);

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

  const handleBlockContact = async (userId) => {
    try {
      await apiCall(`/messaging/contacts/${userId}/block`, 'PUT');
      await loadContacts();
    } catch (error) {
      console.error('Error blocking contact:', error);
    }
  };

  const handleUnblockContact = async (userId) => {
    try {
      await apiCall(`/messaging/contacts/${userId}/unblock`, 'PUT');
      await loadContacts();
    } catch (error) {
      console.error('Error unblocking contact:', error);
    }
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

    try {
      const messageData = {
        chatId: selectedChat._id,
        content: content || fileData?.fileName || '',
        messageType,
        replyTo,
      };

      if (fileData) {
        messageData.media = {
          type: fileData.mimeType,
          url: fileData.s3Url,
          size: fileData.fileSize,
        };
      }

      console.log('📤 Sending message:', messageData);
      const response = await apiCall('/messaging/messages', 'POST', messageData);
      console.log('📬 Server response:', response);

      if (response?.message) {
        console.log('✅ Adding message to local state:', response.message);
        setMessages((prevMessages) => {
          const updated = [...prevMessages, response.message];
          console.log('📋 Updated messages array:', updated);
          return updated;
        });
        updateChatPreview(response.message);
      } else {
        console.error('❌ No message in response:', response);
      }

      return response?.message || null;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
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
      return response?.messages || [];
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
      if (notificationId && !notification.isRead) {
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
            <span className="caller-avatar">{incomingCall.caller?.avatar || 'U'}</span>
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
              >
                Chats
              </button>
              <button
                className={`tab-btn ${activeTab === 'contacts' ? 'active' : ''}`}
                onClick={() => setActiveTab('contacts')}
              >
                Contacts
              </button>
              <button
                className={`tab-btn ${activeTab === 'invitations' ? 'active' : ''}`}
                onClick={() => setActiveTab('invitations')}
              >
                📬 ({pendingInvitations.length})
              </button>
              <button
                className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                ⚙️
              </button>
            </div>
            <NotificationBell
              notifications={notifications}
              onClear={handleClearAllNotifications}
              onSelectNotification={handleSelectNotification}
            />
          </div>

          {activeTab === 'chats' && (
            <ChatList
              chats={chats}
              selectedChat={selectedChat}
              onSelectChat={handleSelectChat}
              onNewChat={() => setShowNewChat(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          )}

          {activeTab === 'contacts' && (
            <ContactsList
              contacts={contacts}
              onSelectContact={handleSelectContact}
              onBlockContact={handleBlockContact}
              onUnblockContact={handleUnblockContact}
              searchQuery={searchQuery}
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
                >
                  📍 Visibility
                </button>
                <button
                  className={`settings-tab-btn ${activeSettingsTab === 'contact' ? 'active' : ''}`}
                  onClick={() => setActiveSettingsTab('contact')}
                >
                  💬 Contact
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
          {showNewChat ? (
            <div className="new-chat-panel">
              <h3>Start a New Chat</h3>
              <div className="new-chat-search">
                <input
                  type="text"
                  placeholder="🔍 Search for users to add..."
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
                      if (visibility.visibleViaEmail) visibleMethods.push('📧');
                      if (visibility.visibleViaPhone) visibleMethods.push('📱');
                      if (visibility.visibleViaUsername) visibleMethods.push('👤');

                      const availableMeans = [];
                      if (contactMeans.availableForChat) availableMeans.push('💬');
                      if (contactMeans.availableForVoiceCall) availableMeans.push('📞');
                      if (contactMeans.availableForVideoCall) availableMeans.push('📹');

                      return (
                        <div key={user._id} className="user-search-result">
                          <span className="user-avatar">{user.avatar || '👤'}</span>
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
                          <span className="user-avatar">{contact.contactUserId?.avatar || '👤'}</span>
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
          ) : (
            <>
              <ChatWindow
                chat={selectedChat}
                messages={messages}
                onSendMessage={handleSendMessage}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
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
              />

              {showAISuggestions && selectedChat?._id && latestMessageId && (
                <AISmartReplies
                  chatId={selectedChat._id}
                  messageId={latestMessageId}
                  onSelectReply={handleAISuggestionSelect}
                />
              )}

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
                  onEndCall={handleEndCall}
                  onAcceptCall={handleAcceptCall}
                  onDeclineCall={handleDeclineCall}
                />
              )}
            </>
          )}
        </div>
      </div>

      {loading && <div className="messaging-loading">Loading chats...</div>}
    </div>
  );
};

export default Messaging;
