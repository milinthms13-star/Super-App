/**
 * Session Manager Component
 * Manages session list and operations
 */

import React from 'react';

const SessionManager = ({ sessions, currentSession, onSelect, onDelete, onCreate }) => {
  return (
    <div className="kdp-card">
      <div className="kdp-card-header">
        <h3 className="kdp-card-title">
          <span className="kdp-card-icon">📁</span>
          Sessions
        </h3>
        <button className="kdp-button kdp-button-primary" onClick={onCreate}>
          <span>➕</span>
          New
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="kdp-empty-state">
          <div className="kdp-empty-icon">🎵</div>
          <p className="kdp-empty-text">No sessions yet</p>
        </div>
      ) : (
        <div className="kdp-session-list">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`kdp-session-item ${
                currentSession?.id === session.id ? 'active' : ''
              }`}
              onClick={() => onSelect(session.id)}
            >
              <div className="kdp-session-info">
                <h4>{session.title}</h4>
                <p>
                  {session.songTitle || 'No song set'} •{' '}
                  {new Date(session.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="kdp-session-actions">
                <button
                  className="kdp-button kdp-button-danger kdp-button-icon-only"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(session.id);
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionManager;
