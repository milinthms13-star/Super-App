import React, { useState, useEffect } from 'react';

const InvitationPanel = ({ invitations, onAccept, onReject, loading }) => {
  const [expandedId, setExpandedId] = useState(null);

  if (loading) {
    return (
      <div className="invitation-panel">
        <p className="loading">Loading invitations...</p>
      </div>
    );
  }

  if (!invitations || invitations.length === 0) {
    return (
      <div className="invitation-panel">
        <p className="no-invitations">No pending invitations</p>
      </div>
    );
  }

  return (
    <div className="invitation-panel">
      <h3>📬 Pending Invitations ({invitations.length})</h3>
      <div className="invitations-list">
        {invitations.map((invitation) => (
          <div key={invitation._id} className="invitation-card">
            <div className="invitation-header">
              <div className="invitation-info">
                <h4>{invitation.senderId?.name || 'Unknown User'}</h4>
                <p className="sender-handle">@{invitation.senderUsername}</p>
                {invitation.message && <p className="message">{invitation.message}</p>}
              </div>
              <button
                className="expand-btn"
                onClick={() => setExpandedId(expandedId === invitation._id ? null : invitation._id)}
              >
                {expandedId === invitation._id ? '▼' : '▶'}
              </button>
            </div>

            {expandedId === invitation._id && (
              <div className="invitation-actions">
                <button
                  className="btn-accept"
                  onClick={() => onAccept(invitation._id)}
                >
                  ✓ Accept
                </button>
                <button
                  className="btn-reject"
                  onClick={() => onReject(invitation._id)}
                >
                  ✕ Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvitationPanel;
