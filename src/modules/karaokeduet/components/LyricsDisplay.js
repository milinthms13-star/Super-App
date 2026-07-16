/**
 * Lyrics Display Component
 * Shows current and next lyrics with progress
 */

import React from 'react';

const LyricsDisplay = ({ currentLyric, nextLyric, progress = 0 }) => {
  return (
    <div className="kdp-lyrics-display">
      {currentLyric ? (
        <>
          <div className="kdp-lyrics-current">{currentLyric.text}</div>
          {nextLyric && (
            <div className="kdp-lyrics-next">Next: {nextLyric.text}</div>
          )}
          <div className="kdp-lyrics-progress">
            <div className="kdp-progress-bar">
              <div
                className="kdp-progress-fill"
                style={{ width: `${Math.min(100, progress * 100)}%` }}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="kdp-empty-state">
          <div className="kdp-empty-icon">🎵</div>
          <p className="kdp-empty-text">Waiting for lyrics...</p>
        </div>
      )}
    </div>
  );
};

export default LyricsDisplay;
