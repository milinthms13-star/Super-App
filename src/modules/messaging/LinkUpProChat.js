import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import { getStoredAuthToken } from "../../utils/auth";
import { messagingService } from "../../services/messagingService";
import { useLinkUpRealtime } from "./useLinkUpRealtime";
import "./LinkUpProChat.css";

const getId = (value) => String(value?._id || value?.id || value || "");

const SAFE_REPLIES = ["Okay", "I will check", "Call me", "Send details"];

const LinkUpProChat = ({ currentUser: currentUserProp }) => {
  const { currentUser: contextUser } = useApp();
  const currentUser = currentUserProp || contextUser;
  const token = getStoredAuthToken() || localStorage.getItem("token") || "";

  const [chats, setChats] = useState([]);
  const [allChats, setAllChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [chatQuery, setChatQuery] = useState("");
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [aiReplies, setAiReplies] = useState(SAFE_REPLIES);

  const activeChatId = getId(activeChat);
  const currentUserId = getId(currentUser);

  const handleRealtimeMessage = useCallback((message) => {
    const messageChatId = getId(message?.chatId);

    setChats((prev) =>
      prev.map((chat) => {
        const chatId = getId(chat);
        if (chatId !== messageChatId) return chat;
        return {
          ...chat,
          lastMessage: message,
          lastMessageAt: message?.createdAt || new Date().toISOString(),
          unreadCount: chatId === activeChatId ? 0 : Number(chat.unreadCount || 0) + 1,
        };
      })
    );

    setAllChats((prev) =>
      prev.map((chat) => {
        const chatId = getId(chat);
        if (chatId !== messageChatId) return chat;
        return {
          ...chat,
          lastMessage: message,
          lastMessageAt: message?.createdAt || new Date().toISOString(),
          unreadCount: chatId === activeChatId ? 0 : Number(chat.unreadCount || 0) + 1,
        };
      })
    );

    if (messageChatId !== activeChatId) return;

    setMessages((prev) => {
      const messageId = getId(message);
      const exists = prev.some((item) => getId(item) === messageId);
      if (exists) return prev;
      return [...prev, message];
    });
  }, [activeChatId]);

  const { onlineUsers, typingUsers, sendTyping } = useLinkUpRealtime({
    token,
    userId: currentUserId,
    activeChatId,
    onMessage: handleRealtimeMessage,
  });

  const loadChats = useCallback(async () => {
    setLoadingChats(true);
    try {
      const data = await messagingService.getChats();
      setAllChats(data);
      setChats(data);
      if (!activeChat && data.length) {
        setActiveChat(data[0]);
      }
    } finally {
      setLoadingChats(false);
    }
  }, [activeChat]);

  const loadMessages = useCallback(async (chatId) => {
    if (!chatId) return;
    setLoadingMessages(true);
    try {
      const data = await messagingService.getMessages(chatId, 1, 40);
      setMessages(data.messages || []);
      await messagingService.markChatRead(chatId);
      setChats((prev) => prev.map((chat) => (getId(chat) === chatId ? { ...chat, unreadCount: 0 } : chat)));
      setAllChats((prev) => prev.map((chat) => (getId(chat) === chatId ? { ...chat, unreadCount: 0 } : chat)));

      const latestIncoming = [...(data.messages || [])]
        .reverse()
        .find((message) => getId(message?.senderId) !== currentUserId);

      if (latestIncoming && getId(latestIncoming)) {
        const suggestions = await messagingService.generateAIReplies(chatId, getId(latestIncoming));
        const normalizedSuggestions = suggestions
          .map((item) => String(item?.text || item?.content || item || "").trim())
          .filter(Boolean)
          .slice(0, 4);

        setAiReplies(normalizedSuggestions.length ? normalizedSuggestions : SAFE_REPLIES);
      } else {
        setAiReplies(SAFE_REPLIES);
      }
    } catch (_error) {
      setMessages([]);
      setAiReplies(SAFE_REPLIES);
    } finally {
      setLoadingMessages(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (activeChatId) {
      loadMessages(activeChatId);
    }
  }, [activeChatId, loadMessages]);

  useEffect(() => {
    const query = chatQuery.trim().toLowerCase();
    if (!query) {
      setChats(allChats);
      return;
    }

    const filtered = allChats.filter((chat) => {
      const haystack = JSON.stringify(chat || {}).toLowerCase();
      return haystack.includes(query);
    });

    setChats(filtered);
  }, [allChats, chatQuery]);

  const sendMessage = async () => {
    const cleanText = text.trim();
    if (!cleanText || !activeChatId || sending) return;

    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: optimisticId,
      chatId: activeChatId,
      content: cleanText,
      senderId: currentUser,
      createdAt: new Date().toISOString(),
      isPending: true,
      messageType: "text",
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");
    setSending(true);

    try {
      const savedMessage = await messagingService.sendMessage({
        chatId: activeChatId,
        content: cleanText,
        messageType: "text",
      });

      setMessages((prev) =>
        prev.map((message) => (getId(message) === optimisticId ? savedMessage : message))
      );
    } catch (_error) {
      setMessages((prev) =>
        prev.map((message) =>
          getId(message) === optimisticId
            ? { ...message, failed: true, isPending: false }
            : message
        )
      );
    } finally {
      setSending(false);
      sendTyping(false);
    }
  };

  const retryMessage = async (message) => {
    const failedId = getId(message);
    if (!failedId || !activeChatId) return;

    setMessages((prev) => prev.filter((item) => getId(item) !== failedId));
    setText(String(message?.content || ""));
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !activeChatId) return;

    try {
      const uploadedFile = await messagingService.uploadFile(activeChatId, file);
      await messagingService.sendMessage({
        chatId: activeChatId,
        content: file.name,
        messageType: "file",
        media: {
          url: uploadedFile?.s3Url || uploadedFile?.url || "",
          type: uploadedFile?.fileType || file.type || "file",
          size: uploadedFile?.fileSize || file.size,
          fileId: uploadedFile?._id,
        },
      });
      await loadMessages(activeChatId);
    } catch (_error) {
      // keep silent for now; user still sees chat intact
    }
  };

  const activeTypingUserId = typingUsers[activeChatId];

  const decoratedChats = useMemo(() => chats.map((chat) => {
    const participants = Array.isArray(chat?.participants) ? chat.participants : [];
    const otherParticipant = participants.find((participant) => getId(participant) !== currentUserId);
    const otherParticipantId = getId(otherParticipant);
    return {
      ...chat,
      otherParticipant,
      isOnline: otherParticipantId ? onlineUsers.includes(otherParticipantId) : false,
    };
  }), [chats, currentUserId, onlineUsers]);

  return (
    <div className="linkup-pro">
      <aside className="linkup-sidebar">
        <div className="linkup-brand">
          <div>
            <h2>LinkUp</h2>
            <p>Secure smart messaging</p>
          </div>
          <span className="online-dot" />
        </div>

        <input
          className="chat-search"
          placeholder="Search chats..."
          value={chatQuery}
          onChange={(event) => setChatQuery(event.target.value)}
        />

        <div className="chat-list">
          {loadingChats ? <p className="empty">Loading chats...</p> : null}
          {decoratedChats.map((chat) => {
            const chatId = getId(chat);
            const isActive = chatId === activeChatId;
            const participant = chat.otherParticipant;

            return (
              <button
                key={chatId}
                className={`chat-row ${isActive ? "active" : ""}`}
                onClick={() => setActiveChat(chat)}
                type="button"
              >
                <div className="avatar">
                  {String(participant?.name || chat.groupName || "U").charAt(0).toUpperCase()}
                  {chat.isOnline ? <span className="mini-online" /> : null}
                </div>
                <div className="chat-meta">
                  <strong>{chat.groupName || participant?.name || "Chat"}</strong>
                  <small>{chat.lastMessage?.content || "Start conversation"}</small>
                </div>
                {!!chat.unreadCount ? <span className="unread">{chat.unreadCount}</span> : null}
              </button>
            );
          })}
        </div>
      </aside>

      <main className="chat-main">
        {activeChat ? (
          <>
            <header className="chat-header">
              <div>
                <h3>{activeChat.groupName || activeChat.otherParticipant?.name || "Conversation"}</h3>
                <p>{activeTypingUserId ? "typing..." : "Private chat"}</p>
              </div>
              <div className="header-actions">
                <button type="button" title="Audio call">Call</button>
                <button type="button" title="Video call">Video</button>
                <button type="button" title="More">More</button>
              </div>
            </header>

            <section className="message-area">
              {loadingMessages ? (
                <p className="empty">Loading messages...</p>
              ) : (
                messages.map((message) => {
                  const mine = getId(message?.senderId) === currentUserId;
                  const messageId = getId(message);

                  return (
                    <div key={messageId} className={`bubble-wrap ${mine ? "mine" : "their"}`}>
                      <div className={`bubble ${message.failed ? "failed" : ""}`}>
                        {message.media?.url ? (
                          <a href={message.media.url} target="_blank" rel="noreferrer">
                            Attachment: {message.content || "Open file"}
                          </a>
                        ) : (
                          message.content
                        )}

                        <span className="msg-time">
                          {message.isPending
                            ? "sending..."
                            : message.failed
                              ? "failed"
                              : new Date(message.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                        </span>

                        {message.failed ? (
                          <button
                            type="button"
                            className="retry-link"
                            onClick={() => retryMessage(message)}
                          >
                            Retry
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </section>

            <div className="smart-replies">
              {aiReplies.map((reply) => (
                <button key={reply} type="button" onClick={() => setText(reply)}>
                  {reply}
                </button>
              ))}
            </div>

            <footer className="composer">
              <label className="attach-btn" title="Attach file">
                +
                <input type="file" hidden onChange={handleFileUpload} />
              </label>

              <input
                value={text}
                placeholder="Message..."
                onChange={(event) => {
                  setText(event.target.value);
                  sendTyping(true);
                }}
                onBlur={() => sendTyping(false)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    sendMessage();
                  }
                }}
              />

              <button className="send-btn" type="button" onClick={sendMessage}>
                Send
              </button>
            </footer>
          </>
        ) : (
          <div className="empty-state">
            <h2>Welcome to LinkUp</h2>
            <p>Select a chat and start secure communication.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default LinkUpProChat;
