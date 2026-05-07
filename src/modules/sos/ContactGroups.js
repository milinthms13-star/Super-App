import React, { useState, useEffect } from 'react';
import './ContactGroups.css';

/**
 * ContactGroups Component
 * Manage saved groups of emergency contacts for quick bulk notification
 */
const ContactGroups = ({ 
  availableContacts = [], 
  onSelectGroup, 
  onSaveGroup,
  onDeleteGroup 
}) => {
  const [groups, setGroups] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedContacts: [],
    priority: 'high', // low, medium, high
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load existing groups on mount
   */
  useEffect(() => {
    loadGroups();
  }, []);

  /**
   * Load groups from backend/storage
   */
  const loadGroups = async () => {
    try {
      setLoading(true);
      // Placeholder - replace with actual API call
      const mockGroups = [
        {
          id: '1',
          name: 'Family',
          description: 'Close family members',
          contacts: availableContacts.slice(0, 2),
          priority: 'high',
          createdAt: new Date(),
        },
      ];
      setGroups(mockGroups);
    } catch (err) {
      setError('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle form field changes
   */
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Toggle contact selection in form
   */
  const toggleContactSelection = (contactId) => {
    setFormData(prev => ({
      ...prev,
      selectedContacts: prev.selectedContacts.includes(contactId)
        ? prev.selectedContacts.filter(id => id !== contactId)
        : [...prev.selectedContacts, contactId],
    }));
  };

  /**
   * Save group (create or update)
   */
  const saveGroup = async () => {
    if (!formData.name.trim()) {
      setError('Group name is required');
      return;
    }

    if (formData.selectedContacts.length === 0) {
      setError('Select at least one contact');
      return;
    }

    try {
      setLoading(true);
      const newGroup = {
        id: editingGroup?.id || Date.now().toString(),
        name: formData.name,
        description: formData.description,
        contacts: availableContacts.filter(c =>
          formData.selectedContacts.includes(c._id || c.id)
        ),
        priority: formData.priority,
        createdAt: editingGroup?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      if (editingGroup) {
        setGroups(groups.map(g => (g.id === editingGroup.id ? newGroup : g)));
      } else {
        setGroups([...groups, newGroup]);
      }

      onSaveGroup?.(newGroup);
      resetForm();
      setError(null);
    } catch (err) {
      setError('Failed to save group');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a group
   */
  const deleteGroup = async (groupId) => {
    if (window.confirm('Delete this group?')) {
      try {
        setGroups(groups.filter(g => g.id !== groupId));
        onDeleteGroup?.(groupId);
      } catch (err) {
        setError('Failed to delete group');
      }
    }
  };

  /**
   * Edit a group
   */
  const editGroup = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description,
      selectedContacts: group.contacts.map(c => c._id || c.id),
      priority: group.priority,
    });
    setShowCreateForm(true);
  };

  /**
   * Reset form
   */
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      selectedContacts: [],
      priority: 'high',
    });
    setEditingGroup(null);
    setShowCreateForm(false);
    setError(null);
  };

  /**
   * Select a group for notification
   */
  const selectGroupForEmergency = (group) => {
    onSelectGroup?.(group);
  };

  if (loading && groups.length === 0) {
    return <div className="contact-groups loading">Loading groups...</div>;
  }

  return (
    <div className="contact-groups">
      <div className="groups-header">
        <h3>
          <span className="material-icons">group</span>
          Contact Groups
        </h3>
        {!showCreateForm && (
          <button
            className="btn-create-group"
            onClick={() => setShowCreateForm(true)}
          >
            <span className="material-icons">add</span>
            New Group
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <span className="material-icons">error_outline</span>
          <span>{error}</span>
          <button
            className="error-close"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="group-form">
          <h4>{editingGroup ? 'Edit Group' : 'Create New Group'}</h4>

          <div className="form-group">
            <label>Group Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              placeholder="e.g., Family, Friends, Work"
              maxLength="50"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
              placeholder="Optional description"
              maxLength="200"
              rows="2"
            />
          </div>

          <div className="form-group">
            <label>Priority Level</label>
            <div className="priority-options">
              {['low', 'medium', 'high'].map(level => (
                <button
                  key={level}
                  className={`priority-btn ${formData.priority === level ? 'active' : ''}`}
                  onClick={() => handleFormChange('priority', level)}
                >
                  {level.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Select Contacts * ({formData.selectedContacts.length} selected)</label>
            <div className="contacts-list">
              {availableContacts.length > 0 ? (
                availableContacts.map(contact => (
                  <label key={contact._id || contact.id} className="contact-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.selectedContacts.includes(contact._id || contact.id)}
                      onChange={(e) =>
                        toggleContactSelection(contact._id || contact.id)
                      }
                    />
                    <span className="contact-info">
                      <span className="contact-name">{contact.name}</span>
                      <span className="contact-phone">{contact.phone}</span>
                    </span>
                  </label>
                ))
              ) : (
                <p className="no-contacts">No contacts available</p>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button
              className="btn-save-group"
              onClick={saveGroup}
              disabled={loading}
            >
              {loading ? 'Saving...' : editingGroup ? 'Update Group' : 'Create Group'}
            </button>
            <button
              className="btn-cancel-form"
              onClick={resetForm}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Groups List */}
      <div className="groups-list">
        {groups.length > 0 ? (
          groups.map(group => (
            <div key={group.id} className={`group-card priority-${group.priority}`}>
              <div className="group-info">
                <h4>{group.name}</h4>
                {group.description && <p className="group-desc">{group.description}</p>}
                <div className="group-meta">
                  <span className="contact-count">
                    <span className="material-icons">people</span>
                    {group.contacts.length} contact{group.contacts.length !== 1 ? 's' : ''}
                  </span>
                  <span className={`priority-badge priority-${group.priority}`}>
                    {group.priority.toUpperCase()}
                  </span>
                </div>
                <div className="group-contacts-preview">
                  {group.contacts.slice(0, 3).map(contact => (
                    <span key={contact._id || contact.id} className="contact-tag">
                      {contact.name}
                    </span>
                  ))}
                  {group.contacts.length > 3 && (
                    <span className="contact-tag more">
                      +{group.contacts.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <div className="group-actions">
                <button
                  className="btn-use-group"
                  onClick={() => selectGroupForEmergency(group)}
                >
                  <span className="material-icons">send</span>
                  Use for SOS
                </button>
                <button
                  className="btn-edit-group"
                  onClick={() => editGroup(group)}
                >
                  <span className="material-icons">edit</span>
                </button>
                <button
                  className="btn-delete-group"
                  onClick={() => deleteGroup(group.id)}
                >
                  <span className="material-icons">delete</span>
                </button>
              </div>
            </div>
          ))
        ) : !showCreateForm ? (
          <div className="empty-state">
            <span className="material-icons">group_add</span>
            <p>No groups yet</p>
            <small>Create a group to quickly notify multiple contacts</small>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ContactGroups;
