import React from "react";

const AIAssistant = ({
  messages,
  input,
  onInputChange,
  onSend,
  onClose,
  isSending = false,
  provider = "fallback",
  quickPrompts = [],
  onQuickPrompt = () => {},
}) => (
  <div className="jp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="jp-assistant-title">
    <div className="jp-modal jp-modal-small">
      <header className="jp-modal-head">
        <h2 id="jp-assistant-title">Career Tips Assistant</h2>
        <button type="button" className="jp-icon-btn" onClick={onClose} aria-label="Close assistant">
          x
        </button>
      </header>
      <section className="jp-modal-body">
        <p className="jp-muted-text">
          AI assistant mode: {provider === "openai" ? "Live OpenAI guidance" : "Smart fallback guidance"}.
        </p>
        {quickPrompts.length ? (
          <div className="jp-assistant-prompts">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                className="jp-chip-btn"
                onClick={() => onQuickPrompt(prompt.text)}
                disabled={isSending}
              >
                {prompt.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="jp-chat-list">
          {messages.map((message) => (
            <div key={message.id} className={`jp-chat-bubble ${message.role === "user" ? "jp-chat-user" : "jp-chat-bot"}`}>
              {message.content}
            </div>
          ))}
        </div>
        <div className="jp-chat-input-row">
          <input
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="Ask for resume or interview tips..."
            disabled={isSending}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !isSending) onSend();
            }}
          />
          <button type="button" className="jp-btn jp-btn-primary" onClick={onSend} disabled={isSending}>
            {isSending ? "Thinking..." : "Send"}
          </button>
        </div>
      </section>
    </div>
  </div>
);

export default AIAssistant;
