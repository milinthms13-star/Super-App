import React from "react";

const MOOD_LABELS = {
  very_sad: "😭 Very Sad",
  sad: "😢 Sad",
  neutral: "😐 Neutral",
  happy: "😊 Happy",
  very_happy: "😄 Very Happy",
};

const MOOD_COLORS = {
  very_sad: "#ff4757",
  sad: "#ff7675",
  neutral: "#ffa502",
  happy: "#1dd1a1",
  very_happy: "#00b894",
};

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

  return (
    <div className="diary-mood-analytics">
      <div className="diary-analytics-header">
        <h2>📊 Your Mood Trends (Last 30 Days)</h2>
        <p>Total Entries: {totalMoods}</p>
      </div>

      <div className="diary-mood-stats">
        {Object.entries(MOOD_LABELS).map(([moodId, label]) => {
          const percentage = getMoodPercentage(moodId);
          const count = getMoodCount(moodId);

          return (
            <div key={moodId} className="diary-mood-stat">
              <div className="diary-mood-stat-label">
                <span className="diary-mood-label-text">{label}</span>
                <span className="diary-mood-count">({count})</span>
              </div>
              <div className="diary-mood-bar-container">
                <div
                  className="diary-mood-bar"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: MOOD_COLORS[moodId],
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
            {moodStats.length > 0
              ? Object.entries(MOOD_LABELS)[
                  Object.keys(MOOD_LABELS).indexOf(
                    moodStats.reduce((max, s) =>
                      s.count > (moodStats.find((m) => m._id === max)?.count || 0)
                        ? s._id
                        : max
                    )
                  )
                ][1]
              : "No data"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MoodChart;
