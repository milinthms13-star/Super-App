import React, { useEffect, useState, useCallback } from 'react';

/**
 * CountdownTimer component - displays real-time countdown to due date
 * Updates every second and shows time remaining or "Past due" message
 * 
 * @component
 * @param {Object} props
 * @param {Date} props.dueDateTime - Target date/time for countdown
 * @param {boolean} props.showQuickActions - Show quick action buttons
 * @param {function} props.onApplyDate - Apply current date handler
 * @param {function} props.onApplyTime - Apply current time handler
 * @param {function} props.onApplyDateTime - Apply current date/time handler
 * @param {boolean} props.disabled - Disable quick action buttons
 * 
 * @example
 * <CountdownTimer
 *   dueDateTime={new Date('2024-05-15 14:30:00')}
 *   showQuickActions={true}
 *   onApplyDate={handleApplyDate}
 *   onApplyTime={handleApplyTime}
 *   onApplyDateTime={handleApplyDateTime}
 * />
 */
const CountdownTimer = React.memo(({
  dueDateTime = null,
  showQuickActions = false,
  onApplyDate = () => {},
  onApplyTime = () => {},
  onApplyDateTime = () => {},
  disabled = false,
}) => {
  const [countdown, setCountdown] = useState(null);

  const calculateCountdown = useCallback(() => {
    if (!dueDateTime) {
      setCountdown(null);
      return;
    }

    const now = new Date();
    const diffMs = dueDateTime.getTime() - now.getTime();

    if (diffMs > 0) {
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diffMs / 1000 / 60) % 60);
      const seconds = Math.floor((diffMs / 1000) % 60);

      setCountdown({
        days,
        hours,
        minutes,
        seconds,
        isPast: false,
      });
    } else {
      setCountdown({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isPast: true,
      });
    }
  }, [dueDateTime]);

  // Update countdown every second
  useEffect(() => {
    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [calculateCountdown]);

  if (!countdown) {
    return null;
  }

  if (countdown.isPast) {
    return (
      <div className="reminderalert-countdown-warning">
        <p className="reminderalert-countdown-label">⏰ Past due</p>
        <p className="reminderalert-countdown-message">This reminder is overdue</p>
      </div>
    );
  }

  return (
    <div className="reminderalert-countdown-container">
      <p className="reminderalert-countdown-label">Time until reminder:</p>
      <div className="reminderalert-countdown">
        {countdown.days > 0 && (
          <span className="countdown-part" title="Days">
            {countdown.days}d
          </span>
        )}
        <span className="countdown-part" title="Hours">{countdown.hours}h</span>
        <span className="countdown-part" title="Minutes">{countdown.minutes}m</span>
        <span className="countdown-part" title="Seconds">{countdown.seconds}s</span>
      </div>

      {showQuickActions && (
        <div className="reminderalert-countdown-actions">
          <button
            type="button"
            className="reminderalert-filter-chip"
            onClick={onApplyDate}
            disabled={disabled}
            aria-label="Set due date to today"
          >
            Today
          </button>
          <button
            type="button"
            className="reminderalert-filter-chip"
            onClick={onApplyTime}
            disabled={disabled}
            aria-label="Set due time to now"
          >
            Now (time)
          </button>
          <button
            type="button"
            className="reminderalert-add-btn"
            onClick={onApplyDateTime}
            disabled={disabled}
            aria-label="Set due date and time to now"
          >
            Now (full)
          </button>
        </div>
      )}
    </div>
  );
});

CountdownTimer.displayName = 'CountdownTimer';

export default CountdownTimer;
