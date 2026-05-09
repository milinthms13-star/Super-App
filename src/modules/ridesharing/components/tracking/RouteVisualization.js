/**
 * RouteVisualization.js
 * Display route with turns and steps
 */

import React, { useState } from 'react';
import './RouteVisualization.css';

const RouteVisualization = ({ route, eta = null }) => {
  const [expandedStep, setExpandedStep] = useState(null);
  const [showAllSteps, setShowAllSteps] = useState(false);

  if (!route || !route.primaryRoute) {
    return null;
  }

  const { primaryRoute } = route;
  const steps = primaryRoute.steps || [];
  const visibleSteps = showAllSteps ? steps : steps.slice(0, 3);

  // Format distance
  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Format duration
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Get turn icon
  const getTurnIcon = (maneuver) => {
    const icons = {
      'turn-left': '⬅️',
      'turn-right': '➡️',
      'straight': '⬆️',
      'merge': '⤢',
      'roundabout': '🔄',
      'turn-sharpleft': '⬅️',
      'turn-sharpright': '➡️',
      'turn-slight-left': '↙️',
      'turn-slight-right': '↘️',
      'ramp-left': '↙️',
      'ramp-right': '↘️',
    };
    return icons[maneuver] || '⬆️';
  };

  return (
    <div className="route-visualization">
      {/* Route Summary */}
      <div className="route-summary">
        <div className="summary-item">
          <span className="summary-label">📍 Distance</span>
          <span className="summary-value">{primaryRoute.distance}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">⏱️ Duration</span>
          <span className="summary-value">{primaryRoute.durationInTraffic}</span>
        </div>
        {eta && (
          <div className="summary-item">
            <span className="summary-label">🕐 Arrival</span>
            <span className="summary-value">{new Date(eta.etaDate).toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {/* Route Type Badge */}
      <div className="route-badge">
        <span className="badge-text">Recommended Route</span>
        <span className="badge-distance">{formatDistance(primaryRoute.distanceMeters)}</span>
      </div>

      {/* Turn-by-Turn Directions */}
      <div className="route-steps">
        <h3 className="steps-title">Directions ({steps.length} steps)</h3>

        {visibleSteps.map((step, idx) => (
          <div
            key={idx}
            className="route-step"
            onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}
          >
            <div className="step-number">
              <span className="step-icon">{getTurnIcon(step.maneuver)}</span>
              {idx + 1}
            </div>

            <div className="step-content">
              <p className="step-instruction">{step.instruction}</p>
              <p className="step-meta">
                {formatDistance(step.distance)} • {formatDuration(step.duration)}
              </p>
            </div>

            <div className="step-arrow">
              {expandedStep === idx ? '▼' : '▶'}
            </div>

            {/* Expanded details */}
            {expandedStep === idx && (
              <div className="step-expanded">
                <div className="expanded-content">
                  <p><strong>Full Instructions:</strong></p>
                  <p>{step.instruction}</p>
                  <p><strong>Distance:</strong> {formatDistance(step.distance)}</p>
                  <p><strong>Time:</strong> {formatDuration(step.duration)}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Show more button */}
        {steps.length > 3 && !showAllSteps && (
          <button
            className="show-more-btn"
            onClick={() => setShowAllSteps(true)}
          >
            Show {steps.length - 3} more step{steps.length - 3 !== 1 ? 's' : ''}
          </button>
        )}

        {showAllSteps && steps.length > 3 && (
          <button
            className="show-less-btn"
            onClick={() => setShowAllSteps(false)}
          >
            Show less
          </button>
        )}
      </div>

      {/* Alternative Routes Info */}
      {route.alternativeRoutes && route.alternativeRoutes.length > 0 && (
        <div className="alternative-routes">
          <p className="alt-routes-info">
            {route.alternativeRoutes.length} alternative route{route.alternativeRoutes.length !== 1 ? 's' : ''} available
          </p>
        </div>
      )}
    </div>
  );
};

export default RouteVisualization;
