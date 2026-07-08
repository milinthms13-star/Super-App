import React from "react";
import {
  SKIN_TYPE_LABELS,
  CONCERN_LABELS,
  SAFETY_LEVEL_LABELS,
  SAFETY_LEVEL_COLORS,
} from "../data/beautyaiConstants";
import "../NilaBeautyAI.css";

/**
 * SelfieAnalysisResults Component
 * Displays detailed selfie analysis results with visualizations
 */

const SelfieAnalysisResults = ({
  analysis,
  plan,
  photoUrl,
  onGeneratePlan,
  onRetake,
}) => {
  if (!analysis) {
    return (
      <div className="selfie-analysis-results empty">
        <p>No analysis available. Please upload a selfie to get started.</p>
      </div>
    );
  }

  const {
    skinType,
    detectedConcerns = [],
    skinScore = 0,
    recommendations = [],
    selfieSignals = {},
  } = analysis;

  const getScoreColor = (score) => {
    if (score >= 80) return "#4caf50";
    if (score >= 60) return "#8bc34a";
    if (score >= 40) return "#ff9800";
    return "#f44336";
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Attention";
  };

  return (
    <div className="selfie-analysis-results">
      <div className="analysis-header">
        <h3>✨ Your Skin Analysis</h3>
      </div>

      <div className="analysis-main">
        {photoUrl && (
          <div className="analysis-photo">
            <img src={photoUrl} alt="Your selfie" />
            <button type="button" className="retake-btn" onClick={onRetake}>
              📷 Retake
            </button>
          </div>
        )}

        <div className="analysis-details">
          {/* Skin Score */}
          <div className="score-section">
            <h4>Overall Skin Score</h4>
            <div className="score-circle" style={{ borderColor: getScoreColor(skinScore) }}>
              <div className="score-value" style={{ color: getScoreColor(skinScore) }}>
                {skinScore}
              </div>
              <div className="score-label">{getScoreLabel(skinScore)}</div>
            </div>
          </div>

          {/* Skin Type */}
          {skinType && (
            <div className="skin-type-section">
              <h4>Detected Skin Type</h4>
              <div className="skin-type-badge">
                {SKIN_TYPE_LABELS[skinType] || skinType}
              </div>
            </div>
          )}

          {/* Detected Concerns */}
          {detectedConcerns.length > 0 && (
            <div className="concerns-section">
              <h4>Detected Concerns</h4>
              <ul className="concerns-list">
                {detectedConcerns.map((concern, idx) => (
                  <li key={idx} className="concern-item">
                    <span className="concern-icon">⚠️</span>
                    <span className="concern-text">
                      {CONCERN_LABELS[concern] || concern}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Selfie Signals */}
          {Object.keys(selfieSignals).length > 0 && (
            <div className="signals-section">
              <h4>Skin Indicators</h4>
              <div className="signals-grid">
                {selfieSignals.oiliness !== undefined && (
                  <div className="signal-item">
                    <span className="signal-label">Oiliness</span>
                    <div className="signal-bar">
                      <div
                        className="signal-fill"
                        style={{ width: `${selfieSignals.oiliness * 10}%` }}
                      />
                    </div>
                    <span className="signal-value">{selfieSignals.oiliness}/10</span>
                  </div>
                )}
                {selfieSignals.acne !== undefined && (
                  <div className="signal-item">
                    <span className="signal-label">Acne Severity</span>
                    <div className="signal-bar">
                      <div
                        className="signal-fill acne"
                        style={{ width: `${selfieSignals.acne * 10}%` }}
                      />
                    </div>
                    <span className="signal-value">{selfieSignals.acne}/10</span>
                  </div>
                )}
                {selfieSignals.redness !== undefined && (
                  <div className="signal-item">
                    <span className="signal-label">Redness</span>
                    <div className="signal-bar">
                      <div
                        className="signal-fill redness"
                        style={{ width: `${selfieSignals.redness * 10}%` }}
                      />
                    </div>
                    <span className="signal-value">{selfieSignals.redness}/10</span>
                  </div>
                )}
                {selfieSignals.darkSpots !== undefined && (
                  <div className="signal-item">
                    <span className="signal-label">Dark Spots</span>
                    <div className="signal-bar">
                      <div
                        className="signal-fill dark-spots"
                        style={{ width: `${selfieSignals.darkSpots * 10}%` }}
                      />
                    </div>
                    <span className="signal-value">{selfieSignals.darkSpots}/10</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="recommendations-section">
              <h4>Key Recommendations</h4>
              <ul className="recommendations-list">
                {recommendations.map((rec, idx) => (
                  <li key={idx} className="recommendation-item">
                    <span className="rec-icon">💡</span>
                    <span className="rec-text">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Safety Warnings */}
      {plan?.safety?.warnings && plan.safety.warnings.length > 0 && (
        <div className="safety-section">
          <h4>
            Safety Information
            <span
              className="safety-badge"
              style={{
                backgroundColor: SAFETY_LEVEL_COLORS[plan.safety.severity] || "#666",
              }}
            >
              {SAFETY_LEVEL_LABELS[plan.safety.severity] || plan.safety.severity}
            </span>
          </h4>
          <ul className="safety-warnings">
            {plan.safety.warnings.map((warning, idx) => (
              <li key={idx} className="warning-item">
                <span className="warning-icon">⚠️</span>
                <span className="warning-text">{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="analysis-actions">
        {!plan && (
          <button type="button" className="generate-plan-btn" onClick={onGeneratePlan}>
            📋 Generate Personalized Plan
          </button>
        )}
        {plan && (
          <div className="plan-ready">
            <span className="success-icon">✓</span>
            <span>Your personalized beauty plan is ready!</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelfieAnalysisResults;
