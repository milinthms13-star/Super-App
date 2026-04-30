import React from "react";
import { stripHtml, formatDate, formatTime, getMoodColor, getMoodEmoji } from "../../utils/diaryHelpers";

const DiaryEntryCard = ({ entry, onEdit, onDelete }) => {
  const truncateContent = (content, length = 150) => {
    const plainText = stripHtml(content);
    if (plainText.length <= length) return plainText;
    return plainText.substring(0, length) + "...";
  };

  return (
    <div className="diary-entry-card">
      <div className="diary-card-header">
        <div>
          <h3 className="diary-card-title">{entry.title}</h3>
          <p className="diary-card-meta">
            <span className="diary-card-date">{formatDate(entry.createdAt)}</span>
            <span className="diary-card-time">{formatTime(entry.createdAt)}</span>
          </p>
        </div>
        <div
          className="diary-card-mood"
          style={{ backgroundColor: getMoodColor(entry.mood) }}
          title={entry.mood.replace("_", " ")}
        >
          {getMoodEmoji(entry.mood)}
        </div>
      </div>

      <div className="diary-card-category">
        <span className="diary-category-badge">{entry.category}</span>
      </div>

      <p className="diary-card-content">{truncateContent(entry.content)}</p>

      {entry.tags && entry.tags.length > 0 && (
        <div className="diary-card-tags">
          {entry.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="diary-card-tag">
              #{tag}
            </span>
          ))}
          {entry.tags.length > 3 && (
            <span className="diary-card-tag">+{entry.tags.length - 3}</span>
          )}
        </div>
      )}

      {entry.attachments && entry.attachments.length > 0 && (
        <div className="diary-card-attachments">
          {entry.attachments.slice(0, 3).map((att, idx) => (
            <div key={idx} className="attachment-mini">
              {att.type === 'image' ? (
                <img src={att.url} alt="attachment" style={{width: '40px', height: '40px'}} />
              ) : (
                <audio src={att.url} controls style={{width: '80px'}} />
              )}
              {entry.attachments.length > 3 && idx === 2 && (
                <span>+{entry.attachments.length - 3}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="diary-card-actions">
        <button
          className="diary-card-btn diary-edit-btn"
          onClick={onEdit}
          title="Edit entry"
        >
          ✏️ Edit
        </button>
        <button
          className="diary-card-btn diary-delete-btn"
          onClick={onDelete}
          title="Delete entry"
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );
};

export default DiaryEntryCard;
