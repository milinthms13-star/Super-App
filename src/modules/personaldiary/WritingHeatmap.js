import React, { useMemo } from 'react';

/**
 * Writing Heatmap Component
 * Displays daily writing activity as a calendar heatmap (GitHub-style)
 * 
 * @component
 * @param {Object} heatmapData - Date to activity count mapping
 *   Format: { "YYYY-MM-DD": count, ... }
 * @param {number} monthsBack - Number of months to display (default: 6)
 * @returns {JSX.Element} Calendar heatmap visualization
 */
const WritingHeatmap = ({ heatmapData = {}, monthsBack = 6 }) => {
  const { weeks, maxCount } = useMemo(() => {
    const weeks = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - monthsBack);
    startDate.setDate(1);

    let maxCount = 0;

    // Create array of all dates in range
    const dateData = {};
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dateData[dateStr] = heatmapData[dateStr] || 0;
      if (dateData[dateStr] > maxCount) maxCount = dateData[dateStr];
    }

    // Organize into weeks
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const weekDay = d.getDay();

      if (weekDay === 0) {
        weeks.push([]);
      }

      if (weeks.length === 0) {
        weeks.push([]);
      }

      weeks[weeks.length - 1].push({
        date: dateStr,
        count: dateData[dateStr],
        dayOfWeek: d.getDay()
      });
    }

    return { weeks, maxCount: Math.max(maxCount, 1) };
  }, [heatmapData, monthsBack]);

  const getHeatColor = (count) => {
    if (count === 0) return '#ebedf0';
    if (count === 1) return '#c6e48b';
    if (count <= 2) return '#7bc96f';
    if (count <= 3) return '#239a3b';
    return '#196127';
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="heatmap-component">
      <div className="heatmap-wrapper">
        {/* Day labels */}
        <div className="heatmap-day-labels">
          {dayLabels.map((day) => (
            <div key={day} className="day-label">
              {day}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="heatmap-grid-container">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="heatmap-week">
              {week.map((day) => (
                <div
                  key={day.date}
                  className="heatmap-day"
                  style={{
                    backgroundColor: getHeatColor(day.count),
                    opacity: day.count === 0 ? 0.5 : 1
                  }}
                  title={`${day.date}: ${day.count} entry(ies)`}
                >
                  <span className="hidden-count">{day.count}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="heatmap-legend">
        <div className="legend-label">Less</div>
        <div className="legend-item" style={{ backgroundColor: '#ebedf0' }}></div>
        <div className="legend-item" style={{ backgroundColor: '#c6e48b' }}></div>
        <div className="legend-item" style={{ backgroundColor: '#7bc96f' }}></div>
        <div className="legend-item" style={{ backgroundColor: '#239a3b' }}></div>
        <div className="legend-item" style={{ backgroundColor: '#196127' }}></div>
        <div className="legend-label">More</div>
      </div>

      {/* Stats */}
      <div className="heatmap-stats">
        <div className="stat">
          <div className="stat-value">
            {Object.values(heatmapData).reduce((a, b) => a + b, 0)}
          </div>
          <div className="stat-label">Total Entries</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {Object.values(heatmapData).filter(c => c > 0).length}
          </div>
          <div className="stat-label">Active Days</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {Math.max(...Object.values(heatmapData))}
          </div>
          <div className="stat-label">Peak Day</div>
        </div>
      </div>
    </div>
  );
};

export default WritingHeatmap;
