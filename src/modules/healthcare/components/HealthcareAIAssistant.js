import React, { useState } from "react";

const HealthcareAIAssistant = ({ onAskAssistant, loading }) => {
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState(null);

  const submitQuestion = async (event) => {
    event.preventDefault();
    const trimmed = String(question || "").trim();
    if (!trimmed) {
      setError("Please enter your healthcare question.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const result = await onAskAssistant?.(trimmed);
      setResponse(result || null);
      setQuestion("");
    } catch (requestError) {
      setError(requestError?.message || "Unable to get assistant response.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="healthcare-section" data-testid="healthcare-ai-assistant">
      <div className="healthcare-section-heading">
        <h2>Healthcare AI Assistant</h2>
        <p>Ask for 360 guidance across appointments, records, refills, and emergency readiness.</p>
      </div>

      <div className="healthcare-medical-disclaimer">
        AI guidance is informational support only. It does not provide diagnosis or replace a licensed clinician.
      </div>

      {error ? (
        <div className="healthcare-inline-alert healthcare-error" role="alert">
          {error}
        </div>
      ) : null}

      <form className="healthcare-record-card" onSubmit={submitQuestion}>
        <label className="healthcare-field healthcare-field-full">
          <span>Your question</span>
          <input
            type="text"
            placeholder="Example: What should I prepare before my next consultation?"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            disabled={loading || submitting}
          />
        </label>

        <button type="submit" className="healthcare-primary-button" disabled={loading || submitting}>
          {submitting ? "Analyzing..." : "Ask Assistant"}
        </button>
      </form>

      {response ? (
        <div className="healthcare-record-list-card">
          <h3>Assistant Response</h3>
          <p>{response.answer}</p>
          {Array.isArray(response.carePlan) && response.carePlan.length > 0 ? (
            <div className="healthcare-info-card">
              <strong>Suggested Care Plan</strong>
              {response.carePlan.map((step, index) => (
                <p key={`${step}-${index}`}>{index + 1}. {step}</p>
              ))}
            </div>
          ) : null}
          {Array.isArray(response.riskFlags) && response.riskFlags.length > 0 ? (
            <p className="healthcare-warning-text">
              Risk flags: {response.riskFlags.join(", ")}
            </p>
          ) : null}
          {response.disclaimer ? (
            <p className="healthcare-muted">{response.disclaimer}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

export default HealthcareAIAssistant;
