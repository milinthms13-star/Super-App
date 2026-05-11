import React, { useMemo } from 'react';
import './FamilyQuickChat.css';

/**
 * FamilyQuickChat Component
 * Displays family contacts (category-based) for quick messaging.
 */
const FamilyQuickChat = ({ contacts = [], onSelectFamilyMember }) => {
  const familyMembers = useMemo(
    () => (Array.isArray(contacts) ? contacts : []).filter(
      (contact) => String(contact?.category || '').trim().toLowerCase() === 'family' && !contact?.isBlocked
    ),
    [contacts]
  );

  if (familyMembers.length === 0) {
    return (
      <div className="family-quick-chat empty">
        <p>No family contacts yet</p>
        <small>Mark a contact as Family in the Contacts tab.</small>
      </div>
    );
  }

  return (
    <div className="family-quick-chat">
      <div className="family-header">
        <h3>Family Contacts</h3>
        <span className="badge">{familyMembers.length}</span>
      </div>

      <div className="family-members-list">
        {familyMembers.map((member) => {
          const user = member?.contactUserId || member;
          const userId = user?._id || member?._id;
          const displayName = member?.displayName || user?.name || user?.username || user?.email || 'Family member';
          const relationship = member?.relationship || member?.category || 'family';

          return (
            <button
              key={userId}
              className="family-member-btn"
              onClick={() => onSelectFamilyMember && onSelectFamilyMember(userId)}
              title={`${relationship} - ${user?.email || ''}`.trim()}
              type="button"
            >
              <div className="avatar">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="member-info">
                <p className="name">{displayName}</p>
                <p className="relationship">{relationship}</p>
              </div>
              <span className="auto-access-badge">?</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FamilyQuickChat;
