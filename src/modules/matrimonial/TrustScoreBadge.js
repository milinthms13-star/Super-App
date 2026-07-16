import React from 'react';
import './TrustScoreBadge.css';

const TrustScoreBadge = ({ trustScore, large = false, showDetails = false }) => {
  if (!trustScore) {
    return null;
  }

  const { overallScore, level, verifications } = trustScore;

  const getLevelColor = (level) => {
    const colors = {
      bronze: '#cd7f32',
      silver: '#c0c0c0',
      gold: '#ffd700',
      platinum: '#e5e4e2',
    };
    return colors[level] || '#999';
  };

  const getLevelIcon = (level) => {
    const icons = {
      bronze: '🥉',
      silver: '🥈',
      gold: '🥇',
      platinum: '💎',
    };
    return icons[level] || '⭐';
  };

  const verifiedCount = Object.values(verifications).filter(v => v.verified).length;
  const totalVerifications = Object.keys(verifications).length;

  return (
    <div className={`trust-score-badge ${large ? 'large' : ''}`}>
      <div
        className="score-circle"
        style={{ borderColor: getLevelColor(level) }}
      >
        <div className="score-value">{overallScore}</div>
        <div className="score-max">/100</div>
      </div>

      <div className="score-details">
        <div className="score-level">
          <span className="level-icon">{getLevelIcon(level)}</span>
          <span className="level-name">{level.toUpperCase()}</span>
        </div>
        
        <div className="score-subtitle">
          Trust Score
        </div>

        {showDetails && (
          <div className="score-breakdown">
            <div className="verification-progress">
              <span>{verifiedCount} of {totalVerifications} verifications complete</span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${(verifiedCount / totalVerifications) * 100}%`,
                    backgroundColor: getLevelColor(level),
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrustScoreBadge;
