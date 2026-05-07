import React, { useMemo } from 'react';

/**
 * Mood Distribution Chart Component
 * Displays mood distribution as a pie/doughnut chart with statistics
 * 
 * @component
 * @param {Object} moodData - Mood statistics with moodCounts object
 *   Format: { moodCounts: { mood1: count, mood2: count, ... } }
 * @returns {JSX.Element} Mood distribution visualization
 */
const MoodDistributionChart = ({ moodData = {} }) => {
  const { moodCounts = {} } = moodData;

  // Calculate total and percentages
  const moodArray = useMemo(() => {
    const total = Object.values(moodCounts).reduce((sum, count) => sum + count, 0) || 1;
    
    return Object.entries(moodCounts)
      .map(([mood, count]) => ({
        mood,
        count,
        percentage: ((count / total) * 100).toFixed(1),
        angle: (count / total) * 360
      }))
      .sort((a, b) => b.count - a.count);
  }, [moodCounts]);

  if (moodArray.length === 0) {
    return (
      <div className="chart-empty">
        <p>No mood data available</p>
      </div>
    );
  }

  // Generate pie chart SVG
  const pieSlices = [];
  let currentAngle = 0;

  moodArray.forEach((item, index) => {
    const startAngle = currentAngle;
    const endAngle = currentAngle + item.angle;
    const largeArc = item.angle > 180 ? 1 : 0;

    // Convert to radians and calculate path
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = 50 + 40 * Math.cos(startRad);
    const y1 = 50 + 40 * Math.sin(startRad);
    const x2 = 50 + 40 * Math.cos(endRad);
    const y2 = 50 + 40 * Math.sin(endRad);

    const pathData = [
      `M 50 50`,
      `L ${x1} ${y1}`,
      `A 40 40 0 ${largeArc} 1 ${x2} ${y2}`,
      `Z`
    ].join(' ');

    pieSlices.push({ pathData, mood: item.mood, index });
    currentAngle = endAngle;
  });

  const getMoodColor = (mood) => {
    const moodLower = mood.toLowerCase();
    if (moodLower.includes('happy') || moodLower.includes('positive')) return '#10b981';
    if (moodLower.includes('sad') || moodLower.includes('negative')) return '#ef4444';
    if (moodLower.includes('angry')) return '#dc2626';
    if (moodLower.includes('anxious')) return '#f59e0b';
    if (moodLower.includes('peaceful') || moodLower.includes('calm')) return '#3b82f6';
    return '#667eea';
  };

  return (
    <div className="mood-chart-container">
      <div className="pie-chart-wrapper">
        <svg viewBox="0 0 100 100" className="pie-chart">
          {pieSlices.map((slice) => (
            <path
              key={slice.index}
              d={slice.pathData}
              fill={getMoodColor(slice.mood)}
              stroke="white"
              strokeWidth="2"
              className="pie-slice"
            />
          ))}
          <circle cx="50" cy="50" r="25" fill="white" className="pie-hole" />
        </svg>

        <div className="pie-center-text">
          <div className="total-label">Total</div>
          <div className="total-count">
            {Object.values(moodCounts).reduce((sum, count) => sum + count, 0)}
          </div>
          <div className="total-label-small">entries</div>
        </div>
      </div>

      <div className="mood-legend">
        {moodArray.map((item) => (
          <div key={item.mood} className="legend-item">
            <div
              className="legend-color"
              style={{ backgroundColor: getMoodColor(item.mood) }}
            ></div>
            <div className="legend-content">
              <div className="legend-mood">{item.mood}</div>
              <div className="legend-stat">
                {item.count} ({item.percentage}%)
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MoodDistributionChart;
