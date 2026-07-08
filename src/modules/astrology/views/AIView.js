import React from "react";

const AIView = ({
  aiQuestion,
  setAiQuestion,
  handleAskAssistant,
  aiLoading,
  assistantRetryQuestion,
  handleRetryAssistantQuestion,
  assistantAnswer,
  assistantHistory,
}) => (
  <div className="astro-card-grid">
    <article className="astrology-panel astro-result-card astro-span-2">
      <h4>Ask AI Astrology</h4>
      <label className="astrology-field">
        <span>Your question</span>
        <textarea 
          rows={4} 
          value={aiQuestion} 
          onChange={(event) => setAiQuestion(event.target.value)} 
          placeholder="Ask about your career, relationships, health, or any astrological guidance..."
        />
      </label>
      <div className="astrology-inline-actions">
        <button type="button" className="astrology-save-button" onClick={handleAskAssistant} disabled={aiLoading}>
          {aiLoading ? "Thinking..." : "Ask now"}
        </button>
        {assistantRetryQuestion ? (
          <button type="button" className="astrology-secondary-button" disabled={aiLoading} onClick={handleRetryAssistantQuestion}>
            Retry last question
          </button>
        ) : null}
      </div>
    </article>
    
    {assistantAnswer ? (
      <article className="astrology-panel astro-result-card astro-span-2">
        <h4>Answer</h4>
        <p>{assistantAnswer.answer}</p>
        {assistantAnswer.tips?.length ? (
          <>
            <h5>Recommendations</h5>
            <ul>
              {assistantAnswer.tips.map((tip, index) => (
                <li key={`${tip}-${index}`}>{tip}</li>
              ))}
            </ul>
          </>
        ) : null}
        {assistantAnswer?.quality?.note ? (
          <p className="astrology-inline-message astrology-inline-message-warning">{assistantAnswer.quality.note}</p>
        ) : null}
      </article>
    ) : null}
    
    {assistantHistory.length ? (
      <article className="astrology-panel astro-result-card astro-span-2">
        <h4>Question history</h4>
        <div className="astrology-mini-history-list">
          {assistantHistory.slice(0, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              className="astrology-mini-history-item"
              onClick={() => setAiQuestion(item.question)}
            >
              <strong>{item.question}</strong>
              <span>{item.answer || "No answer captured."}</span>
            </button>
          ))}
        </div>
      </article>
    ) : null}
    
    <article className="astrology-panel astro-result-card astro-span-2">
      <h4>Sample questions</h4>
      <div className="astro-sample-questions">
        <button 
          type="button" 
          className="astrology-secondary-button"
          onClick={() => setAiQuestion("What career path should I focus on this year?")}
        >
          Career guidance
        </button>
        <button 
          type="button" 
          className="astrology-secondary-button"
          onClick={() => setAiQuestion("When is the best time to start a new business venture?")}
        >
          Business timing
        </button>
        <button 
          type="button" 
          className="astrology-secondary-button"
          onClick={() => setAiQuestion("What should I focus on for better relationships?")}
        >
          Relationship advice
        </button>
        <button 
          type="button" 
          className="astrology-secondary-button"
          onClick={() => setAiQuestion("What health precautions should I take based on my chart?")}
        >
          Health guidance
        </button>
      </div>
    </article>
  </div>
);

export default AIView;
