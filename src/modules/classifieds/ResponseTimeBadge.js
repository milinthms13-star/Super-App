import React from 'react';

const ResponseTimeBadge = ({ responseTime = null, seller = {}, isOnline = false }) => {
  if (!responseTime && !seller?.responseTimeMinutes && !isOnline) {
    return null;
  }

  const avgResponseMinutes = responseTime || seller?.responseTimeMinutes || 120;
  const responseHours = Math.floor(avgResponseMinutes / 60);
  const responseMinutes = avgResponseMinutes % 60;

  const getResponseLabel = () => {
    if (isOnline) return 'Responding now';
    if (avgResponseMinutes < 60) return `${avgResponseMinutes}m avg response`;
    if (responseHours === 1 && responseMinutes === 0) return 'Responds in ~1 hour';
    if (responseHours < 24) return `Responds in ~${responseHours}h`;
    return `Responds in ~${Math.ceil(avgResponseMinutes / (24 * 60))} days`;
  };

  const getResponseSpeed = () => {
    if (avgResponseMinutes < 30) return 'very-fast';
    if (avgResponseMinutes < 120) return 'fast';
    if (avgResponseMinutes < 1440) return 'medium';
    return 'slow';
  };

  const responseSpeed = getResponseSpeed();
  const label = getResponseLabel();

  return (
    <div className={`response-time-badge response-speed-${responseSpeed}`}>
      <span className="response-time-icon">
        {isOnline ? '🟢' : '⏱️'}
      </span>
      <span className="response-time-label">{label}</span>
      {isOnline && <span className="response-time-online-badge">ONLINE</span>}
    </div>
  );
};

export default ResponseTimeBadge;
