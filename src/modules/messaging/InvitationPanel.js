import React, { useState } from 'react';

const InvitationPanel = ({
  invitations,
  onAccept,
  onReject,
  loading,
  feedback,
  invitationStatuses = {},
  actionLoading = {},
}) => {
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
      <div className="invitation-panel-header">
        <h3>Pending Invitations ({invitations.length})</h3>
        <p>Review connection requests before opening a chat.</p>
      </div>
      {feedback?.message ? (
        <div className={`invitation-feedback-banner ${feedback.type || 'info'}`}>
          {feedback.message}
        </div>
      ) : null}

      <div className="invitations-list">
        {invitations.map((invitation) => {
          const isExpanded = expandedId === invitation._id;
          const status = invitationStatuses[String(invitation._id)] || '';
          const isPending = Boolean(actionLoading[String(invitation._id)]);

          return (
            <div key={invitation._id} className="invitation-card">
              <div className="invitation-header">
                <div className="invitation-info">
                  <h4>{invitation.senderId?.name || 'Unknown User'}</h4>
                  <p className="sender-handle">@{invitation.senderUsername}</p>
                  {invitation.message ? (
                    <p className="invitation-message">{invitation.message}</p>
                  ) : null}
                  {status ? (
                    <p className={`invitation-status-chip ${status}`}>
                      {status === 'accepted' ? 'Accepted' : status === 'rejected' ? 'Rejected' : status}
                    </p>
                  ) : null}
                </div>

                <button
                  className="expand-btn"
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : invitation._id)}
                >
                  {isExpanded ? 'Hide' : 'Review'}
                </button>
              </div>

              {isExpanded ? (
                <div className="invitation-actions">
                  <button
                    className="btn-accept"
                    type="button"
                    onClick={() => onAccept(invitation._id)}
                    disabled={isPending || status === 'accepted'}
                  >
                    {isPending ? 'Saving...' : 'Accept'}
                  </button>
                  <button
                    className="btn-reject"
                    type="button"
                    onClick={() => onReject(invitation._id)}
                    disabled={isPending || status === 'rejected'}
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InvitationPanel;
