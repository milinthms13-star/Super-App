import React from "react";
import { MOOD_CONFIG } from "../../utils/diaryHelpers";

const MoodChart = ({ moodStats }) => {
  const totalMoods = moodStats.reduce((sum, stat) => sum + (stat.count || 0), 0);

  const getMoodPercentage = (moodId) => {
    const mood = moodStats.find((s) => s._id === moodId);
    if (!mood || totalMoods === 0) return 0;
    return Math.round((mood.count / totalMoods) * 100);
  };

  const getMoodCount = (moodId) => {
    const mood = moodStats.find((s) => s._id === moodId);
    return mood ? mood.count : 0;
  };

  const mostCommonMood = Object.entries(MOOD_CONFIG).reduce((max, [moodId, config]) => {
    const count = getMoodCount(moodId);
    return count > max.count ? { moodId, ...config, count } : max;
  }, { count: 0 });

  return (
    <div className="diary-mood-analytics">
      <div className="diary-analytics-header">
        <h2>📊 Your Mood Trends (Last 30 Days)</h2>
        <p>Total Entries: {totalMoods}</p>
      </div>

      <div className="diary-mood-stats">
        {Object.entries(MOOD_CONFIG).map(([moodId, config]) => {
          const percentage = getMoodPercentage(moodId);
          const count = getMoodCount(moodId);

          return (
            <div key={moodId} className="diary-mood-stat">
              <div className="diary-mood-stat-label">
                <span className="diary-mood-label-text">{config.label}</span>
                <span className="diary-mood-count">({count})</span>
              </div>
              <div className="diary-mood-bar-container">
                <div
                  className="diary-mood-bar"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: config.color,
                  }}
                ></div>
                <span className="diary-mood-percentage">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="diary-mood-summary">
        <div className="diary-mood-card">
          <h3>Most Common Mood</h3>
          <p className="diary-mood-value">
            {mostCommonMood.count > 0 ? mostCommonMood.label : "No data"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MoodChart;
