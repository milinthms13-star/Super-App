import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../../../utils/api';
import axios from 'axios';

const axiosInstance = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

/**
 * ProReminderContactPicker
 * Lets the user search their non-blocked app contacts and pick one as the
 * reminder recipient, or keep the reminder for themselves.
 *
 * Props:
 *   selectedContact  { userId, name, email, phoneNumber, avatar } | null
 *   onSelect         (contact | null) => void
 *   disabled         boolean
 */
const ProReminderContactPicker = ({ selectedContact = null, onSelect, disabled = false }) => {
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // ── Load / search contacts ────────────────────────────────────────────────
  const fetchContacts = useCallback(async (searchTerm = '') => {
    setLoading(true);
    setError(null);
    try {
      const resp = await axiosInstance.get('/reminders/contacts/search', {
        params: { q: searchTerm },
      });
      setContacts(Array.isArray(resp.data?.data) ? resp.data.data : []);
    } catch (err) {
      setError('Could not load contacts');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Open picker → pre-load contacts
  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    fetchContacts(query);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  // Debounced search
  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchContacts(val), 300);
  };

  // Select a contact from the list
  const handleSelect = (contact) => {
    onSelect(contact);
    setIsOpen(false);
    setQuery('');
  };

  // Clear → reminder is for self
  const handleClearContact = () => {
    onSelect(null);
    setIsOpen(false);
    setQuery('');
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  const avatarText = (name = '') => name.charAt(0).toUpperCase() || '?';

  return (
    <div className="pro-contact-picker" ref={dropdownRef}>
      {/* ── Recipient display ── */}
      <div className="pro-contact-picker__label">
        <span>Who is this reminder for?</span>
        <small className="pro-contact-picker__hint">
          You can set it for yourself or for any contact who hasn't blocked you.
        </small>
      </div>

      <div className="pro-contact-picker__trigger-row">
        {/* "For myself" chip */}
        <button
          type="button"
          className={`pro-contact-chip ${!selectedContact ? 'pro-contact-chip--active' : ''}`}
          onClick={handleClearContact}
          disabled={disabled}
          aria-pressed={!selectedContact}
        >
          <span className="pro-contact-chip__avatar pro-contact-chip__avatar--self">Me</span>
          <span className="pro-contact-chip__name">Myself</span>
        </button>

        {/* Selected contact display */}
        {selectedContact && (
          <div className="pro-contact-chip pro-contact-chip--selected">
            <span className="pro-contact-chip__avatar">
              {selectedContact.avatar
                ? <img src={selectedContact.avatar} alt={selectedContact.name} />
                : avatarText(selectedContact.name)}
            </span>
            <span className="pro-contact-chip__name">{selectedContact.name}</span>
            {selectedContact.phoneNumber && (
              <span className="pro-contact-chip__phone">{selectedContact.phoneNumber}</span>
            )}
            <button
              type="button"
              className="pro-contact-chip__remove"
              onClick={handleClearContact}
              disabled={disabled}
              aria-label="Remove selected contact"
            >
              ×
            </button>
          </div>
        )}

        {/* Open picker button */}
        {!selectedContact && (
          <button
            type="button"
            className="pro-contact-picker__open-btn"
            onClick={handleOpen}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            {isOpen ? 'Close' : '+ Pick a contact'}
          </button>
        )}

        {selectedContact && (
          <button
            type="button"
            className="pro-contact-picker__open-btn pro-contact-picker__open-btn--change"
            onClick={handleOpen}
            disabled={disabled}
          >
            Change
          </button>
        )}
      </div>

      {/* ── Dropdown ── */}
      {isOpen && (
        <div className="pro-contact-picker__dropdown" role="dialog" aria-label="Select a contact">
          <div className="pro-contact-picker__search-row">
            <input
              ref={searchRef}
              type="search"
              className="pro-contact-picker__search"
              placeholder="Search by name, email or phone…"
              value={query}
              onChange={handleQueryChange}
              disabled={disabled}
              aria-label="Search contacts"
            />
          </div>

          {loading && (
            <div className="pro-contact-picker__state">
              <span className="pro-contact-picker__spinner" aria-label="Loading" />
              Loading contacts…
            </div>
          )}

          {!loading && error && (
            <div className="pro-contact-picker__state pro-contact-picker__state--error">
              {error}
              <button type="button" onClick={() => fetchContacts(query)}>Retry</button>
            </div>
          )}

          {!loading && !error && contacts.length === 0 && (
            <div className="pro-contact-picker__state">
              {query ? `No contacts matching "${query}"` : 'No contacts found'}
            </div>
          )}

          {!loading && !error && contacts.length > 0 && (
            <ul className="pro-contact-picker__list" role="listbox">
              {contacts.map((contact) => (
                <li
                  key={contact.userId}
                  role="option"
                  aria-selected={selectedContact?.userId === contact.userId}
                  className={`pro-contact-picker__item ${
                    selectedContact?.userId === contact.userId
                      ? 'pro-contact-picker__item--active'
                      : ''
                  }`}
                  onClick={() => handleSelect(contact)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelect(contact)}
                  tabIndex={0}
                >
                  <span className="pro-contact-picker__item-avatar">
                    {contact.avatar
                      ? <img src={contact.avatar} alt={contact.name} />
                      : avatarText(contact.name)}
                  </span>
                  <span className="pro-contact-picker__item-info">
                    <strong className="pro-contact-picker__item-name">{contact.name}</strong>
                    {contact.email && (
                      <span className="pro-contact-picker__item-sub">{contact.email}</span>
                    )}
                    {contact.phoneNumber && (
                      <span className="pro-contact-picker__item-sub">
                        📞 {contact.phoneNumber}
                      </span>
                    )}
                  </span>
                  {contact.isFavorite && (
                    <span className="pro-contact-picker__item-fav" aria-label="Favourite">⭐</span>
                  )}
                  {selectedContact?.userId === contact.userId && (
                    <span className="pro-contact-picker__item-check" aria-label="Selected">✓</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default ProReminderContactPicker;
