import React, { useState, useEffect } from 'react';
import { getAvatarLabel } from './utils';

const ContactsList = ({
  contacts,
  onSelectContact,
  onBlockContact,
  onUnblockContact,
  onToggleFavorite,
  searchQuery,
  onSearchChange,
  onFilterChange,
  onScheduleBlock,
  filterType = 'all',
}) => {
  const [filteredContacts, setFilteredContacts] = useState(contacts);

  useEffect(() => {
    let filtered = contacts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((contact) =>
        contact.contactUserId?.name?.toLowerCase().includes(query) ||
        contact.displayName?.toLowerCase().includes(query)
      );
    }

    if (filterType === 'favorites') {
      filtered = filtered.filter((contact) => contact.isFavorite && !contact.isBlocked);
    } else if (filterType === 'blocked') {
      filtered = filtered.filter((contact) => contact.isBlocked);
    } else {
      // For 'all', exclude blocked contacts by default
      filtered = filtered.filter((contact) => !contact.isBlocked);
    }

    setFilteredContacts(filtered);
  }, [contacts, searchQuery, filterType]);

  return (
    <div className="contacts-list-container">
      <div className="contacts-header">
        <div className="contacts-header-copy">
          <h2>Contacts</h2>
          <p className="contacts-subtitle">People you can reach in LinkUp</p>
        </div>
        <div className="contacts-filters">
          <button
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => onFilterChange && onFilterChange('all')}
            type="button"
          >
            All
          </button>
          <button
            className={`filter-btn ${filterType === 'favorites' ? 'active' : ''}`}
            onClick={() => onFilterChange && onFilterChange('favorites')}
            type="button"
          >
            Favorites
          </button>
          <button
            className={`filter-btn ${filterType === 'blocked' ? 'active' : ''}`}
            onClick={() => onFilterChange && onFilterChange('blocked')}
            type="button"
          >
            Blocked
          </button>
        </div>
      </div>

      <div className="contacts-search">
        <input
          type="text"
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="search-input"
        />
      </div>

      <div className="contacts-list">
        {filteredContacts.length > 0 ? (
          filteredContacts.map((contact) => (
            <div key={contact._id} className="contact-item">
              <div
                className="contact-info"
                onClick={() => onSelectContact(contact.contactUserId)}
              >
                <span className="contact-avatar">
                  {getAvatarLabel(
                    contact.displayName,
                    contact.contactUserId?.name,
                    contact.contactUserId?.username,
                    contact.contactUserId?.avatar,
                    'U'
                  )}
                </span>
                <div className="contact-details">
                  <h4>{contact.displayName || contact.contactUserId?.name || 'Unknown'}</h4>
                  <p className="contact-category">{contact.category || 'Contact'}</p>
                </div>
              </div>
              <div className="contact-actions">
                <button
                  className="btn-action-sm"
                  onClick={() => onToggleFavorite && onToggleFavorite(contact.contactUserId._id)}
                  title={contact.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  type="button"
                >
                  {contact.isFavorite ? '⭐' : '☆'}
                </button>
                <button
                  className="btn-action-sm"
                  onClick={() => onScheduleBlock && onScheduleBlock(contact)}
                  title="Manage scheduled blocks"
                  type="button"
                >
                  ⏰ Schedule
                </button>
                {contact.isBlocked ? (
                  <button
                    className="btn-action-sm"
                    onClick={() => onUnblockContact(contact.contactUserId._id)}
                    title="Unblock"
                    type="button"
                  >
                    Unblock
                  </button>
                ) : (
                  <button
                    className="btn-action-sm"
                    onClick={() => onBlockContact(contact.contactUserId._id)}
                    title="Block"
                    type="button"
                  >
                    Block
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-contacts">
            <p>No contacts match this view yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactsList;
