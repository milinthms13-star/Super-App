import React from "react";

const ChatThread = ({ messages = [], chatDraft = "", setChatDraft, onSendMessage }) => (
  <div className="freelancer-form">
    <div className="freelancer-chat-log">
      {messages.length === 0 ? (
        <p className="freelancer-note">No messages yet. Start the conversation.</p>
      ) : (
        messages.map((message) => (
          <div key={message.id} className="freelancer-list-item">
            <strong>{String(message.by || "user").toUpperCase()}</strong>
            <p>{message.body}</p>
            <p>{new Date(message.at).toLocaleString()}</p>
          </div>
        ))
      )}
    </div>
    <label>
      Message
      <textarea
        rows={3}
        value={chatDraft}
        onChange={(event) => setChatDraft(event.target.value)}
        placeholder="Ask about scope, availability, timeline, or revisions."
      />
    </label>
    <button type="button" onClick={onSendMessage}>
      Send Message
    </button>
  </div>
);

export default ChatThread;
