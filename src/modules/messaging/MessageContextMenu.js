import React, { useRef, useEffect } from 'react';

const MessageContextMenu = ({
  message,
  position,
  onEdit,
  onDelete,
  onReply,
  onReact,
  onClose,
  canEdit = false,
  canDelete = false,
}) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      className="message-context-menu"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
      ref={menuRef}
    >
      <div className="menu-items">
        <button
          className="menu-item"
          onClick={() => {
            onReply(message);
            onClose();
          }}
          type="button"
          title="Reply to message"
        >
          Reply
        </button>

        <button
          className="menu-item"
          onClick={() => {
            onReact(message);
            onClose();
          }}
          type="button"
          title="Add reaction"
        >
          React
        </button>

        {canEdit && (
          <button
            className="menu-item"
            onClick={() => {
              onEdit(message);
              onClose();
            }}
            type="button"
            title="Edit message"
          >
            Edit
          </button>
        )}

        {canDelete && (
          <button
            className="menu-item danger"
            onClick={() => {
              onDelete(message);
              onClose();
            }}
            type="button"
            title="Delete message"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageContextMenu;
