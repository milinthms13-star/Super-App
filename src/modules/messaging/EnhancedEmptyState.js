import React from 'react';
import { getQuickActions, getSuggestedContacts } from '../../services/demoMessagingData';

/**
 * EnhancedEmptyState - Rich empty state for messaging
 * Shows suggested contacts and quick actions instead of plain text
 */

const EnhancedEmptyState = ({ onSelectAction, onStartNewChat }) => {
  const quickActions = getQuickActions();
  const suggestedContacts = getSuggestedContacts();

  return (
    <div className="chat-empty-state">
      {/* Main Message */}
      <div className="empty-state-icon">💬</div>
      <h2 className="empty-state-title">Welcome to LinkUp</h2>
      <p className="empty-state-subtitle">
        Your all-in-one messaging hub. Connect with buyers, sellers, drivers, and friends instantly.
      </p>

      {/* Quick Actions */}
      <div className="empty-state-section">
        <h3 className="empty-state-section-title">Quick Actions</h3>
        <div className="empty-state-actions">
          {quickActions.map((action) => (
            <button
              key={action.id}
              className="empty-action"
              onClick={() => onSelectAction(action.action)}
              title={action.description}
            >
              <span className="empty-action-icon">{action.icon}</span>
              <span className="empty-action-label">{action.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Suggested Contacts */}
      <div className="empty-state-section">
        <h3 className="empty-state-section-title">Suggested Contacts</h3>
        <div className="suggested-contacts-list">
          {suggestedContacts.map((contact) => (
            <button
              key={contact._id}
              className="suggested-contact-item"
              onClick={() => onStartNewChat(contact)}
            >
              <div className="suggested-avatar">{contact.avatar}</div>
              <div className="suggested-info">
                <div className="suggested-name">{contact.name}</div>
                <div className="suggested-reason">{contact.reason}</div>
              </div>
              {contact.online && <div className="online-dot"></div>}
            </button>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="empty-state-tips">
        <p className="tips-label">💡 Pro Tips:</p>
        <ul className="tips-list">
          <li>Search for contacts by name or module</li>
          <li>Start a group chat with your friends</li>
          <li>Use encrypted messaging for sensitive conversations</li>
          <li>Pin important chats to the top</li>
        </ul>
      </div>
    </div>
  );
};

export default EnhancedEmptyState;
