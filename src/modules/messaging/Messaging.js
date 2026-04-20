import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import '../../styles/Messaging.css';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import ContactsList from './ContactsList';
import CallWindow from './CallWindow';
import AISmartReplies from './AISmartReplies';
import FileUpload from './FileUpload';
import io from 'socket.io-client';

const Messaging = () => {
  const { currentUser, apiCall } = useApp();
  const [activeTab, setActiveTab] = useState('chats'); // chats, contacts
  const [chats, setChats] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatUserId, setNewChatUserId] = useState('');

  // Advanced features state
  const [socket, setSocket] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [showCallWindow, setShowCallWindow] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());

  const socketRef = useRef(null);

  const updateChatPreview = useCallback((incomingMessage) => {
    if (!incomingMessage?.chatId) {
      return;
    }

    setChats((prevChats) => {
      const matchedChat = prevChats.find((chat) => chat._id === incomingMessage.chatId);
      if (!matchedChat) {
        return prevChats;
      }

      const updatedChat = {
        ...matchedChat,
        lastMessage: incomingMessage,
        updatedAt: incomingMessage.createdAt || matchedChat.updatedAt,
      };

      return [
        updatedChat,
        ...prevChats.filter((chat) => chat._id !== incomingMessage.chatId),
      ];
    });
  }, []);

  // Load chats
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

  // Load contacts
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

  // Load messages for selected chat
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

  // Initial load
  useEffect(() => {
    loadChats();
    loadContacts();
  }, [loadChats, loadContacts]);

  // Load messages when chat is selected
  useEffect(() => {
    if (selectedChat?._id) {
      loadMessages(selectedChat._id);
      loadAISuggestions(selectedChat._id);
      checkEncryptionStatus(selectedChat._id);
    }
  }, [selectedChat, loadMessages]);

  // WebSocket initialization
  useEffect(() => {
    if (currentUser) {
      const newSocket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000', {
        auth: {
          token: localStorage.getItem('token'),
        },
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      // Connection events
      newSocket.on('connect', () => {
        setIsOnline(true);
        console.log('Connected to messaging server');
      });

      newSocket.on('disconnect', () => {
        setIsOnline(false);
        console.log('Disconnected from messaging server');
      });

      // Message events
      newSocket.on('message:received', (message) => {
        if (message.chatId === selectedChat?._id) {
          setMessages(prev => [...prev, message]);
        }
        updateChatPreview(message);
      });

      newSocket.on('message:updated', (updatedMessage) => {
        setMessages(prev => prev.map(msg =>
          msg._id === updatedMessage._id ? updatedMessage : msg
        ));
      });

      // Typing events
      newSocket.on('user:typing:started', ({ userId, chatId }) => {
        if (chatId === selectedChat?._id) {
          setTypingUsers(prev => new Set([...prev, userId]));
        }
      });

      newSocket.on('user:typing:stopped', ({ userId, chatId }) => {
        if (chatId === selectedChat?._id) {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
        }
      });

      // Call events
      newSocket.on('call:incoming', (callData) => {
        setIncomingCall(callData);
      });

      newSocket.on('call:accepted', (callData) => {
        setActiveCall(callData);
        setShowCallWindow(true);
        setIncomingCall(null);
      });

      newSocket.on('call:ended', () => {
        setActiveCall(null);
        setShowCallWindow(false);
        setIncomingCall(null);
      });

      newSocket.on('call:ice-candidate', (signalData) => {
        // Handle WebRTC signaling data
        if (activeCall && showCallWindow) {
          // Pass to CallWindow component via ref or callback
        }
      });

      // Presence events
      newSocket.on('user:online', ({ userId }) => {
        setChats(prev => prev.map(chat => ({
          ...chat,
          participants: chat.participants.map(p =>
            p.userId === userId ? { ...p, isOnline: true } : p
          )
        })));
      });

      newSocket.on('user:offline', ({ userId }) => {
        setChats(prev => prev.map(chat => ({
          ...chat,
          participants: chat.participants.map(p =>
            p.userId === userId ? { ...p, isOnline: false } : p
          )
        })));
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [currentUser, selectedChat, updateChatPreview]);

  // Join chat room when selected
  useEffect(() => {
    if (socket && selectedChat?._id) {
      socket.emit('chat:join', selectedChat._id);
    }
  }, [socket, selectedChat]);

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
        setChats([response.chat, ...chats]);
        setSelectedChat(response.chat);
        setShowNewChat(false);
        setNewChatUserId('');
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
    handleCreateDirectChat(contact._id);
  };

  // Advanced features handlers
  const loadAISuggestions = async (chatId) => {
    // AI suggestions are loaded per message, not per chat
    // This will be called when a specific message is selected
  };

  const checkEncryptionStatus = async (chatId) => {
    // Encryption status check - this might not be implemented yet
    setEncryptionEnabled(false);
  };

  const handleSendMessage = async (content, messageType = 'text', fileData = null) => {
    if (!selectedChat?._id || (!content.trim() && !fileData)) return;

    try {
      let messageData = {
        chatId: selectedChat._id,
        content,
        messageType,
      };

      if (fileData) {
        messageData.fileData = fileData;
      }

      if (encryptionEnabled) {
        const encrypted = await apiCall('/messaging/encryption/encrypt', 'POST', {
          chatId: selectedChat._id,
          content,
        });
        messageData.content = encrypted.encryptedContent;
        messageData.isEncrypted = true;
      }

      const response = await apiCall('/messaging/messages', 'POST', messageData);

      if (response?.message) {
        setMessages([...messages, response.message]);
        updateChatPreview(response.message);

        // Emit via WebSocket
        if (socket) {
          socket.emit('message:send', response.message);
        }

        // Refresh AI suggestions
        loadAISuggestions(selectedChat._id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTyping = (isTyping) => {
    if (socket && selectedChat) {
      socket.emit(isTyping ? 'user:typing' : 'user:typing:stopped', {
        chatId: selectedChat._id,
      });
    }
  };

  const handleStartCall = async (callType = 'audio') => {
    if (!selectedChat) return;

    try {
      const response = await apiCall('/messaging/calls/initiate', 'POST', {
        chatId: selectedChat._id,
        callType,
      });

      if (response?.call) {
        setActiveCall(response.call);
        setShowCallWindow(true);

        // Emit via WebSocket
        if (socket) {
          socket.emit('call:initiate', response.call);
        }
      }
    } catch (error) {
      console.error('Error starting call:', error);
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    try {
      await apiCall(`/messaging/calls/${incomingCall._id}/accept`, 'PUT');

      setActiveCall(incomingCall);
      setShowCallWindow(true);
      setIncomingCall(null);

      if (socket) {
        socket.emit('call:accept', incomingCall);
      }
    } catch (error) {
      console.error('Error accepting call:', error);
    }
  };

  const handleDeclineCall = async () => {
    if (!incomingCall) return;

    try {
      await apiCall(`/messaging/calls/${incomingCall._id}/decline`, 'PUT');
      setIncomingCall(null);

      if (socket) {
        socket.emit('call:decline', incomingCall);
      }
    } catch (error) {
      console.error('Error declining call:', error);
    }
  };

  const handleEndCall = async () => {
    if (!activeCall) return;

    try {
      await apiCall(`/messaging/calls/${activeCall._id}/end`, 'PUT');
      setActiveCall(null);
      setShowCallWindow(false);

      if (socket) {
        socket.emit('call:end', activeCall);
      }
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const handleFileUploaded = (uploadedFiles) => {
    // Send file messages
    uploadedFiles.forEach(file => {
      handleSendMessage(`Shared a file: ${file.fileName}`, 'file', file);
    });
  };

  const handleAISuggestionSelect = (suggestion) => {
    handleSendMessage(suggestion.content);
    setShowAISuggestions(false);
  };

  const handleToggleEncryption = async () => {
    try {
      const response = await apiCall('/messaging/encryption/toggle', 'POST', {
        chatId: selectedChat._id,
        enabled: !encryptionEnabled,
      });

      setEncryptionEnabled(response.enabled);
    } catch (error) {
      console.error('Error toggling encryption:', error);
    }
  };

  return (
    <div className="messaging-container">
      {/* Connection status indicator */}
      <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
        <span className="status-dot"></span>
        {isOnline ? 'Connected' : 'Disconnected'}
      </div>

      {/* Incoming call notification */}
      {incomingCall && (
        <div className="incoming-call-notification">
          <div className="call-info">
            <span className="caller-avatar">
              {incomingCall.caller?.avatar || '👤'}
            </span>
            <div className="call-details">
              <h4>{incomingCall.caller?.name}</h4>
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
        {/* Sidebar */}
        <div className="messaging-sidebar">
          <div className="sidebar-tabs">
            <button
              className={`tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
              onClick={() => setActiveTab('chats')}
            >
              💬 Chats
            </button>
            <button
              className={`tab-btn ${activeTab === 'contacts' ? 'active' : ''}`}
              onClick={() => setActiveTab('contacts')}
            >
              👥 Contacts
            </button>
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
        </div>

        {/* Main chat window */}
        <div className="messaging-main">
          {showNewChat ? (
            <div className="new-chat-panel">
              <h3>Start a New Chat</h3>
              <p>Select a contact to message</p>
              <div className="available-users">
                {contacts
                  .filter((c) => !c.isBlocked)
                  .map((contact) => (
                    <div
                      key={contact._id}
                      className="user-card"
                      onClick={() => handleCreateDirectChat(contact.contactUserId._id)}
                    >
                      <span className="user-avatar">
                        {contact.contactUserId?.avatar || '👤'}
                      </span>
                      <h4>{contact.contactUserId?.name}</h4>
                      <p>{contact.category}</p>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <>
              <ChatWindow
                chat={selectedChat}
                messages={messages}
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
                typingUsers={typingUsers}
                encryptionEnabled={encryptionEnabled}
                onToggleEncryption={handleToggleEncryption}
                onStartCall={handleStartCall}
                onOpenFileUpload={() => setShowFileUpload(true)}
                socket={socket}
              />

              {/* AI Smart Replies */}
              {showAISuggestions && aiSuggestions.length > 0 && (
                <AISmartReplies
                  suggestions={aiSuggestions}
                  onSelectSuggestion={handleAISuggestionSelect}
                  onClose={() => setShowAISuggestions(false)}
                  onRefresh={() => loadAISuggestions(selectedChat._id)}
                />
              )}

              {/* File Upload Modal */}
              {showFileUpload && (
                <FileUpload
                  chatId={selectedChat?._id}
                  onFileUploaded={handleFileUploaded}
                  onClose={() => setShowFileUpload(false)}
                />
              )}

              {/* Call Window */}
              {showCallWindow && activeCall && (
                <CallWindow
                  call={activeCall}
                  onEndCall={handleEndCall}
                  socket={socket}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messaging;

