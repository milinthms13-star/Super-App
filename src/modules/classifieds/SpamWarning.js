import React from 'react';

const SpamWarning = ({ spamScore = 0, spamFlags = [] }) => {
  if (spamScore === 0 && (!spamFlags || spamFlags.length === 0)) {
    return null;
  }

  const getSeverityLevel = (score) => {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  };

  const getSeverityMessage = (score) => {
    if (score >= 70) return 'High risk - Likely spam';
    if (score >= 50) return 'Medium risk - Please verify';
    if (score >= 30) return 'Low risk - Minor concerns';
    return 'Safe - Looks legitimate';
  };

  const severity = getSeverityLevel(spamScore);
  const message = getSeverityMessage(spamScore);

  return (
    <div className={`spam-warning spam-warning-${severity}`}>
      <div className="spam-warning-header">
        <span className="spam-warning-icon">⚠️</span>
        <span className="spam-warning-title">{message}</span>
        <span className={`spam-warning-score spam-score-${severity}`}>
          {spamScore}%
        </span>
      </div>

      {spamFlags && spamFlags.length > 0 && (
        <div className="spam-warning-flags">
          <p className="spam-flags-label">Detected issues:</p>
          <ul className="spam-flags-list">
            {spamFlags.slice(0, 3).map((flag, idx) => (
              <li key={idx} className="spam-flag-item">
                <span className="spam-flag-icon">•</span>
                {flag}
              </li>
            ))}
            {spamFlags.length > 3 && (
              <li className="spam-flag-item">
                <span className="spam-flag-icon">•</span>
                +{spamFlags.length - 3} more issues
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="spam-warning-actions">
        <p className="spam-warning-hint">
          {severity === 'critical' && 'We recommend contacting the seller before proceeding.'}
          {severity === 'high' && 'Verify seller details and payment terms carefully.'}
          {severity === 'medium' && 'Review listing details for any inconsistencies.'}
          {severity === 'low' && 'This listing appears safe to contact.'}
        </p>
      </div>
    </div>
  );
};

export default SpamWarning;
