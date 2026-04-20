import React, { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../../contexts/AppContext";
import { buildConversations } from "../socialData";
import "../styles/Messaging.css";

const Messaging = () => {
  const { currentUser, mockData } = useApp();
  const baseConversations = useMemo(
    () => buildConversations(mockData?.conversations || [], currentUser),
    [currentUser, mockData?.conversations]
  );
  const [conversations, setConversations] = useState(baseConversations);
  const [selectedConversationId, setSelectedConversationId] = useState(baseConversations[0]?._id || "");
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setConversations(baseConversations);
    setSelectedConversationId((current) =>
      current && baseConversations.some((conversation) => conversation._id === current)
        ? current
        : baseConversations[0]?._id || ""
    );
  }, [baseConversations]);

  const filteredConversations = useMemo(
    () =>
      conversations.filter((conversation) =>
        conversation.participants[1]?.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [conversations, searchQuery]
  );

  useEffect(() => {
    if (!filteredConversations.length) {
      return;
    }

    setSelectedConversationId((current) =>
      current && filteredConversations.some((conversation) => conversation._id === current)
        ? current
        : filteredConversations[0]._id
    );
  }, [filteredConversations]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation._id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );
  const messages = useMemo(
    () => selectedConversation?.messages || [],
    [selectedConversation]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) {
      return;
    }

    const message = {
      _id: `message-${Date.now()}`,
      sender: selectedConversation.participants[0],
      content: newMessage.trim(),
      createdAt: new Date().toISOString(),
    };

    setConversations((current) =>
      current.map((conversation) =>
        conversation._id === selectedConversation._id
          ? {
              ...conversation,
              messages: [...conversation.messages, message],
              lastMessage: message,
            }
          : conversation
      )
    );
    setNewMessage("");
  };

  return (
    <div className="messaging-container">
      <div className="conversations-list">
        <div className="conversations-header">
          <h2>Messages</h2>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="search-input"
          />
        </div>

        <div className="conversations">
          {filteredConversations.map((conversation) => {
            const otherParticipant = conversation.participants[1];

            return (
              <div
                key={conversation._id}
                className={`conversation-item ${selectedConversation?._id === conversation._id ? "active" : ""}`}
                onClick={() => setSelectedConversationId(conversation._id)}
              >
                <img src={otherParticipant.avatar} alt={otherParticipant.name} className="conv-avatar" />
                <div className="conv-info">
                  <h4>{otherParticipant.name}</h4>
                  <p className="last-message">{conversation.lastMessage?.content || "No messages yet"}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="chat-area">
        {selectedConversation ? (
          <>
            <div className="chat-header">
              <h3>{selectedConversation.participants[1]?.name}</h3>
            </div>

            <div className="messages-list">
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`message ${message.sender._id === selectedConversation.participants[0]._id ? "sent" : "received"}`}
                >
                  <img src={message.sender.avatar} alt={message.sender.name} className="message-avatar" />
                  <div className="message-content">
                    <p>{message.content}</p>
                    <span className="message-time">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="message-input-area">
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSendMessage();
                  }
                }}
                className="message-input"
              />
              <button onClick={handleSendMessage} className="send-btn" disabled={!newMessage.trim()}>
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="no-conversation">
            <p>Select a conversation to start messaging.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messaging;
