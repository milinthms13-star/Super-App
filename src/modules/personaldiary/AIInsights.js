import React, { useEffect, useState } from "react";
import "../../styles/AIInsights.css";
import diaryService from "../../services/diaryService";

const AIInsights = ({ entryId, onClose }) => {
  const [activeTab, setActiveTab] = useState("summary"); // summary, mood, wellness, actions
  const [summary, setSummary] = useState(null);
  const [moodInsights, setMoodInsights] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});

  // Fetch summary
  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await diaryService.getAISummary({ entryId });
      setSummary(response.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch summary:", err);
      setError(err.message || "Failed to fetch summary");
    } finally {
      setLoading(false);
    }
  };

  // Fetch mood insights
  const fetchMoodInsights = async () => {
    try {
      setLoading(true);
      const response = await diaryService.getMoodInsights({ daysBack: 30 });
      setMoodInsights(response.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch mood insights:", err);
      setError(err.message || "Failed to fetch mood insights");
    } finally {
      setLoading(false);
    }
  };

  // Fetch wellness recommendations
  const fetchWellnessRecommendations = async () => {
    try {
      setLoading(true);
      const response = await diaryService.getWellnessRecommendations({
        daysBack: 30,
      });
      setRecommendations(
        Array.isArray(response.data) ? response.data : []
      );
      setError(null);
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
      setError(err.message || "Failed to fetch recommendations");
    } finally {
      setLoading(false);
    }
  };

  // Fetch action items
  const fetchActionItems = async () => {
    try {
      setLoading(true);
      const response = await diaryService.extractActionItems(entryId);
      setActionItems(
        response.data?.actionItems || []
      );
      setError(null);
    } catch (err) {
      console.error("Failed to fetch action items:", err);
      setError(err.message || "Failed to fetch action items");
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === "summary") {
      fetchSummary();
    } else if (activeTab === "mood") {
      fetchMoodInsights();
    } else if (activeTab === "wellness") {
      fetchWellnessRecommendations();
    } else if (activeTab === "actions") {
      fetchActionItems();
    }
  }, [activeTab]);

  // Get sentiment color
  const getSentimentColor = (score) => {
    if (score > 0.3) return "#4caf50"; // green
    if (score < -0.3) return "#f44336"; // red
    return "#ff9800"; // orange
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "#f44336";
      case "medium":
        return "#ff9800";
      case "low":
        return "#4caf50";
      default:
        return "#2196f3";
    }
  };

  return (
    <div className="ai-insights-modal-overlay" onClick={onClose}>
      <div className="ai-insights-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-insights-header">
          <h2>✨ AI Insights</h2>
          <button className="ai-insights-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="ai-insights-tabs">
          <button
            className={`ai-insights-tab ${
              activeTab === "summary" ? "active" : ""
            }`}
            onClick={() => setActiveTab("summary")}
          >
            📄 Summary
          </button>
          <button
            className={`ai-insights-tab ${activeTab === "mood" ? "active" : ""}`}
            onClick={() => setActiveTab("mood")}
          >
            😊 Mood
          </button>
          <button
            className={`ai-insights-tab ${
              activeTab === "wellness" ? "active" : ""
            }`}
            onClick={() => setActiveTab("wellness")}
          >
            💪 Wellness
          </button>
          <button
            className={`ai-insights-tab ${
              activeTab === "actions" ? "active" : ""
            }`}
            onClick={() => setActiveTab("actions")}
          >
            ✅ Actions
          </button>
        </div>

        <div className="ai-insights-content">
          {error && (
            <div className="ai-insights-error">{error}</div>
          )}

          {loading ? (
            <div className="ai-insights-loading">Loading insights...</div>
          ) : (
            <>
              {/* SUMMARY TAB */}
              {activeTab === "summary" && summary && (
                <div className="ai-summary-section">
                  <p className="ai-summary-text">{summary.summary || "No summary available"}</p>
                  {summary.digest && (
                    <div className="ai-digest-card">
                      <h4>Weekly Digest</h4>
                      <div className="digest-item">
                        <span className="digest-label">Highlight:</span>
                        <p>{summary.digest.weeklyHighlight}</p>
                      </div>
                      <div className="digest-item">
                        <span className="digest-label">Key Themes:</span>
                        <p>{summary.digest.keyThemes}</p>
                      </div>
                      <div className="digest-item">
                        <span className="digest-label">Mood Trend:</span>
                        <p>{summary.digest.moodTrend}</p>
                      </div>
                      <div className="digest-item">
                        <span className="digest-label">Reflection:</span>
                        <p>{summary.digest.suggestedReflection}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MOOD TAB */}
              {activeTab === "mood" && moodInsights && (
                <div className="ai-mood-section">
                  <div className="mood-status">
                    <span className="mood-badge">{moodInsights.dominantMood}</span>
                  </div>

                  <div className="sentiment-meter">
                    <div className="meter-label">Sentiment Score</div>
                    <div className="meter-container">
                      <div
                        className="meter-fill"
                        style={{
                          width: `${
                            ((moodInsights.sentimentScore || 0) + 1) * 50
                          }%`,
                          backgroundColor: getSentimentColor(
                            moodInsights.sentimentScore || 0
                          ),
                        }}
                      ></div>
                    </div>
                    <div className="meter-scale">
                      <span>Negative</span>
                      <span>Neutral</span>
                      <span>Positive</span>
                    </div>
                  </div>

                  {moodInsights.emotionalThemes && (
                    <div className="emotional-themes">
                      <h4>Emotional Themes</h4>
                      <div className="themes-list">
                        {moodInsights.emotionalThemes.map((theme, idx) => (
                          <span key={idx} className="theme-tag">
                            {theme}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {moodInsights.stressPatterns && (
                    <div className="stress-patterns">
                      <h4>⚠️ Stress Patterns</h4>
                      <p>{moodInsights.stressPatterns}</p>
                    </div>
                  )}

                  {moodInsights.improvementAreas && (
                    <div className="improvement-areas">
                      <h4>Areas for Growth</h4>
                      <ul>
                        {Array.isArray(moodInsights.improvementAreas)
                          ? moodInsights.improvementAreas.map((area, idx) => (
                              <li key={idx}>{area}</li>
                            ))
                          : null}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* WELLNESS TAB */}
              {activeTab === "wellness" && (
                <div className="ai-wellness-section">
                  <div className="recommendations-list">
                    {recommendations.length > 0 ? (
                      recommendations.map((rec, idx) => (
                        <div key={idx} className="recommendation-card">
                          <div
                            className="rec-header"
                            onClick={() =>
                              setExpandedItems((prev) => ({
                                ...prev,
                                [idx]: !prev[idx],
                              }))
                            }
                          >
                            <h4>{rec.title}</h4>
                            {rec.priority && (
                              <span
                                className="priority-badge"
                                style={{
                                  backgroundColor: getPriorityColor(rec.priority),
                                }}
                              >
                                {rec.priority}
                              </span>
                            )}
                            <span
                              className={`expand-icon ${
                                expandedItems[idx] ? "open" : ""
                              }`}
                            >
                              ▼
                            </span>
                          </div>
                          {expandedItems[idx] && (
                            <p className="rec-description">{rec.description}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p>No recommendations available</p>
                    )}
                  </div>

                  <div className="wellness-tips">
                    <h4>💡 General Wellness Tips</h4>
                    <ul>
                      <li>Practice daily mindfulness meditation</li>
                      <li>Maintain consistent sleep schedule</li>
                      <li>Engage in regular physical activity</li>
                      <li>Connect with loved ones regularly</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* ACTIONS TAB */}
              {activeTab === "actions" && (
                <div className="ai-actions-section">
                  <div className="action-items-list">
                    {actionItems.length > 0 ? (
                      actionItems.map((action, idx) => (
                        <div key={idx} className="action-item">
                          <input type="checkbox" className="action-checkbox" />
                          <div className="action-content">
                            <div className="action-text">{action.item}</div>
                            {action.deadline && (
                              <div className="action-deadline">
                                Due: {new Date(action.deadline).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          {action.priority && (
                            <span
                              className="action-priority"
                              style={{
                                backgroundColor: getPriorityColor(action.priority),
                              }}
                            >
                              {action.priority}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p>No action items extracted</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIInsights;
