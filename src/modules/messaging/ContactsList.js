import React, { useState, useEffect } from 'react';

const ContactsList = ({ contacts, onSelectContact, onBlockContact, onUnblockContact, searchQuery }) => {
  const [filteredContacts, setFilteredContacts] = useState(contacts);
  const [filterType, setFilterType] = useState('all');

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
      filtered = filtered.filter((c) => c.isFavorite);
    } else if (filterType === 'blocked') {
      filtered = filtered.filter((c) => c.isBlocked);
    }

    setFilteredContacts(filtered);
  }, [contacts, searchQuery, filterType]);

  return (
    <div className="contacts-list-container">
      <div className="contacts-header">
        <h2>👥 Contacts</h2>
        <div className="contacts-filters">
          <button
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filterType === 'favorites' ? 'active' : ''}`}
            onClick={() => setFilterType('favorites')}
          >
            ⭐
          </button>
          <button
            className={`filter-btn ${filterType === 'blocked' ? 'active' : ''}`}
            onClick={() => setFilterType('blocked')}
          >
            🚫
          </button>
        </div>
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
                  {contact.contactUserId?.avatar || '👤'}
                </span>
                <div className="contact-details">
                  <h4>
                    {contact.displayName || contact.contactUserId?.name || 'Unknown'}
                  </h4>
                  <p className="contact-category">{contact.category}</p>
                </div>
              </div>
              <div className="contact-actions">
                {contact.isBlocked ? (
                  <button
                    className="btn-action-sm"
                    onClick={() => onUnblockContact(contact.contactUserId._id)}
                    title="Unblock"
                  >
                    🔓
                  </button>
                ) : (
                  <button
                    className="btn-action-sm"
                    onClick={() => onBlockContact(contact.contactUserId._id)}
                    title="Block"
                  >
                    🚫
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-contacts">
            <p>No contacts yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactsList;
