import React from 'react';

/**
 * Sentiment Trend Chart Component
 * Displays sentiment distribution over time with stacked bars
 * 
 * @component
 * @param {Array} data - Array of sentiment trend data with format:
 *   { period, positive, neutral, negative, entries }
 * @param {string} groupBy - Grouping period (day/week/month)
 * @returns {JSX.Element} Sentiment trend visualization
 */
const SentimentChart = ({ data = [], groupBy = 'week' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        <p>No sentiment data available</p>
      </div>
    );
  }

  // Show only last 12 periods for readability
  const displayData = data.slice(-12);

  return (
    <div className="sentiment-chart-container">
      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-color positive"></div>
          <span>Positive</span>
        </div>
        <div className="legend-item">
          <div className="legend-color neutral"></div>
          <span>Neutral</span>
        </div>
        <div className="legend-item">
          <div className="legend-color negative"></div>
          <span>Negative</span>
        </div>
      </div>

      <div className="sentiment-chart">
        {displayData.map((period, index) => (
          <div key={index} className="chart-bar">
            <div className="bar-stack">
              {period.positive > 0 && (
                <div
                  className="bar-segment positive"
                  style={{ height: `${period.positive}%` }}
                  title={`Positive: ${period.positive}%`}
                ></div>
              )}
              {period.neutral > 0 && (
                <div
                  className="bar-segment neutral"
                  style={{ height: `${period.neutral}%` }}
                  title={`Neutral: ${period.neutral}%`}
                ></div>
              )}
              {period.negative > 0 && (
                <div
                  className="bar-segment negative"
                  style={{ height: `${period.negative}%` }}
                  title={`Negative: ${period.negative}%`}
                ></div>
              )}
            </div>
            <div className="bar-label">{period.period}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SentimentChart;
