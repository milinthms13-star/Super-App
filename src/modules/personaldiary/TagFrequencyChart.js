import React from 'react';

/**
 * Tag Frequency Chart Component
 * Displays tag usage as a horizontal bar chart with trend indicators
 * 
 * @component
 * @param {Object} tagData - Tag analytics with format:
 *   { tagFrequency: [{ tag, frequency, trend }, ...], uniqueTags, totalTagUsages }
 * @returns {JSX.Element} Tag frequency visualization
 */
const TagFrequencyChart = ({ tagData = {} }) => {
  const { tagFrequency = [], uniqueTags = 0, totalTagUsages = 0 } = tagData;

  if (!tagFrequency || tagFrequency.length === 0) {
    return (
      <div className="chart-empty">
        <p>No tag data available</p>
      </div>
    );
  }

  const maxFrequency = Math.max(...tagFrequency.map(t => t.frequency), 1);

  return (
    <div className="tag-chart-container">
      <div className="tag-stats-summary">
        <div className="stat">
          <div className="stat-value">{uniqueTags}</div>
          <div className="stat-label">Unique Tags</div>
        </div>
        <div className="stat">
          <div className="stat-value">{totalTagUsages}</div>
          <div className="stat-label">Total Uses</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {(totalTagUsages / (Object.keys(tagFrequency).length || 1)).toFixed(1)}
          </div>
          <div className="stat-label">Avg per Tag</div>
        </div>
      </div>

      <div className="tag-bars">
        {tagFrequency.map((item, index) => (
          <div key={item.tag} className="tag-bar-item">
            <div className="tag-label">
              <span className="tag-name">#{item.tag}</span>
              <span className="tag-count">{item.frequency}</span>
            </div>
            <div className="bar-container">
              <div
                className="bar-fill"
                style={{
                  width: `${(item.frequency / maxFrequency) * 100}%`,
                  background: getTagColor(index)
                }}
              >
                <span className="bar-label">{item.frequency}</span>
              </div>
            </div>
            {item.trend && (
              <div className="trend-indicator">
                {item.trend.increasing ? '📈' : item.trend.decreasing ? '📉' : '→'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Generate color for tag bar based on index
 */
function getTagColor(index) {
  const colors = [
    'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(90deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(90deg, #30cfd0 0%, #330867 100%)',
  ];
  return colors[index % colors.length];
}

export default TagFrequencyChart;
