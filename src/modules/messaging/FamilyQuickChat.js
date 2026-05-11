import React, { useState, useEffect } from 'react';
import { getFamilyMembersForChat } from './utils';
import './FamilyQuickChat.css';

/**
 * FamilyQuickChat Component
 * Displays family members for quick messaging
 * Integrates with LinkUp messaging
 */
const FamilyQuickChat = ({ currentUser, onSelectChat }) => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadFamily = async () => {
      try {
        setLoading(true);
        const members = await getFamilyMembersForChat();
        setFamilyMembers(members);
      } catch (err) {
        console.error('Error loading family members:', err);
        setError('Failed to load family members');
      } finally {
        setLoading(false);
      }
    };

    loadFamily();
  }, []);

  if (loading) {
    return (
      <div className="family-quick-chat loading">
        <div className="spinner"></div>
        <p>Loading family...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="family-quick-chat error">
        <p>{error}</p>
      </div>
    );
  }

  if (familyMembers.length === 0) {
    return (
      <div className="family-quick-chat empty">
        <p>👨‍👩‍👧 No family members to chat with</p>
        <small>Create a family group first</small>
      </div>
    );
  }

  return (
    <div className="family-quick-chat">
      <div className="family-header">
        <h3>👨‍👩‍👧 Family (Auto-Access)</h3>
        <span className="badge">{familyMembers.length}</span>
      </div>

      <div className="family-members-list">
        {familyMembers.map((member) => (
          <button
            key={member.userId}
            className="family-member-btn"
            onClick={() => onSelectChat(member.userId)}
            title={`${member.relationship} - ${member.email}`}
          >
            <div className="avatar">
              {member.name.charAt(0).toUpperCase()}
            </div>
            <div className="member-info">
              <p className="name">{member.name}</p>
              <p className="relationship">{member.relationship}</p>
            </div>
            <span className="auto-access-badge">✓</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FamilyQuickChat;