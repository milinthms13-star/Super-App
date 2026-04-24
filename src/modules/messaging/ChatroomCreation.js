import React, { useState, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { getEntityId } from './utils';

const ChatroomCreation = ({
  onChatroomCreated,
  onCancel,
}) => {
  const { apiCall } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [tags, setTags] = useState('');
  const [maxMembers, setMaxMembers] = useState('-1');
  const [allowFileSharing, setAllowFileSharing] = useState(true);
  const [allowMemberInvites, setAllowMemberInvites] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleCreateChatroom = async () => {
    if (!name.trim()) {
      setError('Chatroom name is required');
      return;
    }

    try {
      setError('');
      setSuccessMessage('');
      setIsCreating(true);

      const tagArray = tags
        ? tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t)
        : [];

      const response = await apiCall('/messaging/chatrooms', 'POST', {
        name: name.trim(),
        description: description.trim(),
        isPrivate,
        tags: tagArray,
        maxMembers: parseInt(maxMembers) || -1,
        settings: {
          allowFileSharing,
          allowMemberInvites,
        },
      });

      if (response?.chatroom) {
        setSuccessMessage(`Chatroom "${response.chatroom.name}" created successfully!`);
        setName('');
        setDescription('');
        setIsPrivate(false);
        setTags('');
        setMaxMembers('-1');
        setAllowFileSharing(true);
        setAllowMemberInvites(false);
        onChatroomCreated(response.chatroom);
        
        setTimeout(() => {
          on🏠 Create a New Chatroom</h3>
        <button
          className="btn-close"
          onClick={onCancel}
          title="Close"
          type="button"
          aria-label="Close chatroom creation"
        >
          ✕
        </button>
      </div>

      <div className="chatroom-creation-form">
        {error && <div className="error-message">❌ {error}</div>}
        {successMessage && <div className="success-message">✅ {successMessage}</div>}

        <div className="form-section">
          <h4>Basic Information</h4>
          
          <div className="form-group">
            <label>Chatroom Name * <span className="required">required</span></label>
            <input
              type="text"
              placeholder="Enter an engaging chatroom name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              maxLength="100"
            />
            <small className="char-count">{name.length}/100</small>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              placeholder="Describe what this chatroom is about (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
              rows="3"
              maxLength="500"
            />
            <small className="char-count">{description.length}/500</small>
          </div>

          <div className="form-group">
            <label>Tags (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g., tech, gaming, music, business"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-textarea"
            rows="3"
          />
        </div>

        <div className="form-group">
          <label>Tags (comma-separated)</label>
          <input
         /div>
        </div>

        <div className="form-section">
          <h4>Access Control</h4>
          
          <div className="form-group radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="chatroom-type"
                checked={!isPrivate}
                onChange={() => setIsPrivate(false)}
              />
              <span className="radio-label-text">
                <strong>🌐 Public</strong> - Anyone can join directly
              </span>
            </label>
          </div>

          <div className="form-group radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="chatroom-type"
                checked={isPrivate}
                onChange={() => setIsPrivate(true)}
              />
              <span className="radio-label-text">
                <strong>🔒 Private</strong> - Users must request access and get admin approval
              </span>
            </label>
          </div>

          {isPrivate && (
            <div className="info-box info">
              <p>
                🔒 <strong>Private Chatroom:</strong> Users can request to join, and you (as admin) will receive notifications to approve or reject requests.
              </p>
            </div>
          )}

          {!isPrivate && (
            <div className="info-box success">
              <p>
                ✓ <strong>Public Chatroom:</strong> Anyone can find and join this chatroom instantly from the public browsing section.
              </p>
            </div>
          )}
        </div>

        <div className="form-section">
          <h4>Settings</h4>
          
          <div className="form-group">
            <label>Max Members (leave blank or -1 for unlimited)</label>
            <input
              type="number"
              placeholder="e.g., 50, 100"
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
              className="form-input"
              min="-1"
            />
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={allowFileSharing}
                onChange={(e) => setAllowFileSharing(e.target.checked)}
              />
              <span>Allow members to share files</span>
            </label>
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={allowMemberInvites}
                onChange={(e) => setAllowMemberInvites(e.target.checked)}
              />
              <span>Allow members to invite others</span>
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            type="button"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreateChatroom}
            type="button"
            disabled={isCreating || !name.trim()}
          >
            {isCreating ? 'Creating...' : '✨ 
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreateChatroom}
            type="button"
            disabled={isCreating || !name.trim()}
          >
            {isCreating ? 'Creating...' : 'Create Chatroom'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatroomCreation;
