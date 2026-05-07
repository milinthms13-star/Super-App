import React, { useMemo } from 'react';

/**
 * Word Count Chart Component
 * Displays word count distribution and trends
 * 
 * @component
 * @param {Object} wordCountData - Word count analytics with format:
 *   { totalWords, avgWords, minWords, maxWords, median, wordDistribution }
 * @returns {JSX.Element} Word count visualization
 */
const WordCountChart = ({ wordCountData = {} }) => {
  const {
    totalWords = 0,
    avgWords = 0,
    minWords = 0,
    maxWords = 0,
    median = 0,
    wordDistribution = {}
  } = wordCountData;

  // Calculate total entries from distribution
  const totalEntries = useMemo(() => {
    return Object.values(wordDistribution).reduce((a, b) => a + b, 0);
  }, [wordDistribution]);

  const maxDist = useMemo(() => {
    return Math.max(...Object.values(wordDistribution), 1);
  }, [wordDistribution]);

  const distribution = [
    { label: 'Very Short', sublabel: '<100 words', key: 'veryShort', emoji: '📝' },
    { label: 'Short', sublabel: '100-300', key: 'short', emoji: '📄' },
    { label: 'Medium', sublabel: '300-600', key: 'medium', emoji: '📃' },
    { label: 'Long', sublabel: '600-1000', key: 'long', emoji: '📖' },
    { label: 'Very Long', sublabel: '1000+', key: 'veryLong', emoji: '📚' }
  ];

  return (
    <div className="word-count-chart-container">
      {/* Key Stats */}
      <div className="word-stats-grid">
        <div className="word-stat">
          <div className="stat-emoji">📊</div>
          <div className="stat-value">{totalWords.toLocaleString()}</div>
          <div className="stat-label">Total Words</div>
        </div>
        <div className="word-stat">
          <div className="stat-emoji">📈</div>
          <div className="stat-value">{avgWords.toFixed(0)}</div>
          <div className="stat-label">Average/Entry</div>
        </div>
        <div className="word-stat">
          <div className="stat-emoji">📉</div>
          <div className="stat-value">{minWords}</div>
          <div className="stat-label">Shortest</div>
        </div>
        <div className="word-stat">
          <div className="stat-emoji">📈</div>
          <div className="stat-value">{maxWords}</div>
          <div className="stat-label">Longest</div>
        </div>
        <div className="word-stat">
          <div className="stat-emoji">⚖️</div>
          <div className="stat-value">{median}</div>
          <div className="stat-label">Median</div>
        </div>
      </div>

      {/* Distribution Bars */}
      <div className="word-distribution-chart">
        <h3>Entry Length Distribution</h3>
        {distribution.map((item) => {
          const count = wordDistribution[item.key] || 0;
          const percentage = totalEntries > 0 ? (count / totalEntries) * 100 : 0;
          const barWidth = totalEntries > 0 ? (count / maxDist) * 100 : 0;

          return (
            <div key={item.key} className="distribution-row">
              <div className="distribution-label">
                <span className="emoji">{item.emoji}</span>
                <div>
                  <div className="label-title">{item.label}</div>
                  <div className="label-sublabel">{item.sublabel}</div>
                </div>
              </div>
              <div className="distribution-bar-container">
                <div className="distribution-bar">
                  <div
                    className="distribution-fill"
                    style={{ width: `${barWidth}%` }}
                  >
                    {count > 0 && <span className="fill-count">{count}</span>}
                  </div>
                </div>
              </div>
              <div className="distribution-stats">
                <span className="count">{count}</span>
                <span className="percentage">({percentage.toFixed(1)}%)</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Writing Consistency */}
      <div className="writing-consistency">
        <h3>Writing Consistency</h3>
        <div className="consistency-analysis">
          {totalEntries > 0 && (
            <>
              <div className="consistency-item">
                <div className="meter">
                  <div
                    className="meter-fill"
                    style={{
                      width: `${Math.min((avgWords / 500) * 100, 100)}%`,
                      background: avgWords > 400 ? '#10b981' : avgWords > 200 ? '#f59e0b' : '#ef4444'
                    }}
                  ></div>
                </div>
                <div className="consistency-label">
                  {avgWords > 400 && '✨ Detailed writing'}
                  {avgWords > 200 && avgWords <= 400 && '👍 Good length'}
                  {avgWords <= 200 && '💭 Quick notes'}
                </div>
              </div>
              <div className="consistency-item">
                <div className="meter">
                  <div
                    className="meter-fill"
                    style={{
                      width: `${Math.min(((maxWords - minWords) / 2000) * 100, 100)}%`,
                      background: (maxWords - minWords) > 1500 ? '#667eea' : (maxWords - minWords) > 800 ? '#7c3aed' : '#a78bfa'
                    }}
                  ></div>
                </div>
                <div className="consistency-label">
                  {(maxWords - minWords) > 1500 && '📊 High variety'}
                  {(maxWords - minWords) > 800 && (maxWords - minWords) <= 1500 && '⚡ Balanced'}
                  {(maxWords - minWords) <= 800 && '🎯 Consistent length'}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WordCountChart;
