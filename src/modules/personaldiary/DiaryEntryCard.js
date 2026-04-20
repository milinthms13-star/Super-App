import React from "react";

const MOOD_EMOJIS = {
  very_sad: "😭",
  sad: "😢",
  neutral: "😐",
  happy: "😊",
  very_happy: "😄",
};

const DiaryEntryCard = ({ entry, onEdit, onDelete }) => {
  const getMoodColor = (mood) => {
    const colors = {
      very_sad: "#ff4757",
      sad: "#ff7675",
      neutral: "#ffa502",
      happy: "#1dd1a1",
      very_happy: "#00b894",
    };
    return colors[mood] || "#95a5a6";
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateContent = (content, length = 150) => {
    if (content.length <= length) return content;
    return content.substring(0, length) + "...";
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
          {MOOD_EMOJIS[entry.mood]}
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
