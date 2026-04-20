import React, { useState, useEffect } from "react";

const MOODS = [
  { value: "very_sad", label: "😭 Very Sad", emoji: "😭" },
  { value: "sad", label: "😢 Sad", emoji: "😢" },
  { value: "neutral", label: "😐 Neutral", emoji: "😐" },
  { value: "happy", label: "😊 Happy", emoji: "😊" },
  { value: "very_happy", label: "😄 Very Happy", emoji: "😄" },
];

const CATEGORIES = ["Personal", "Work", "Travel", "Health", "Relationships", "Other"];

const DiaryEditor = ({ entry, onSave, onClose, submitting }) => {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    mood: "neutral",
    category: "Personal",
    tags: [],
    isDraft: false,
    entryDate: new Date().toISOString().split("T")[0],
  });
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (entry) {
      setFormData({
        title: entry.title,
        content: entry.content,
        mood: entry.mood,
        category: entry.category,
        tags: entry.tags || [],
        isDraft: entry.isDraft,
        entryDate: entry.entryDate ? entry.entryDate.split("T")[0] : new Date().toISOString().split("T")[0],
      });
    }
  }, [entry]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((current) => ({
        ...current,
        [name]: null,
      }));
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((current) => ({
        ...current,
        tags: [...current.tags, tagInput.trim().toLowerCase()],
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData((current) => ({
      ...current,
      tags: current.tags.filter((t) => t !== tag),
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!formData.content.trim()) {
      newErrors.content = "Content is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  return (
    <div className="diary-editor-overlay">
      <div className="diary-editor-modal">
        <div className="diary-editor-header">
          <h2>{entry ? "Edit Entry" : "New Diary Entry"}</h2>
          <button className="diary-close-btn" onClick={onClose} disabled={submitting}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="diary-editor-form">
          {/* Entry Date */}
          <div className="diary-form-group">
            <label>Entry Date</label>
            <input
              type="date"
              name="entryDate"
              value={formData.entryDate}
              onChange={handleChange}
              disabled={submitting}
            />
          </div>

          {/* Title */}
          <div className="diary-form-group">
            <label>Title *</label>
            <input
              type="text"
              name="title"
              placeholder="Give your entry a title..."
              value={formData.title}
              onChange={handleChange}
              maxLength="200"
              disabled={submitting}
              className={errors.title ? "error" : ""}
            />
            {errors.title && <span className="diary-error">{errors.title}</span>}
          </div>

          {/* Category & Mood Row */}
          <div className="diary-form-row">
            <div className="diary-form-group">
              <label>Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                disabled={submitting}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="diary-form-group">
              <label>How are you feeling?</label>
              <div className="diary-mood-selector">
                {MOODS.map((mood) => (
                  <button
                    key={mood.value}
                    type="button"
                    className={`diary-mood-option ${formData.mood === mood.value ? "active" : ""}`}
                    onClick={() =>
                      setFormData((current) => ({
                        ...current,
                        mood: mood.value,
                      }))
                    }
                    title={mood.label}
                    disabled={submitting}
                  >
                    {mood.emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="diary-form-group">
            <label>What's on your mind? *</label>
            <textarea
              name="content"
              placeholder="Write your thoughts, memories, and feelings here..."
              value={formData.content}
              onChange={handleChange}
              maxLength="50000"
              rows="12"
              disabled={submitting}
              className={errors.content ? "error" : ""}
            />
            {errors.content && <span className="diary-error">{errors.content}</span>}
            <div className="diary-char-count">
              {formData.content.length}/50000 characters
            </div>
          </div>

          {/* Tags */}
          <div className="diary-form-group">
            <label>Tags</label>
            <div className="diary-tag-input-group">
              <input
                type="text"
                placeholder="Add tags (e.g., #work, #family)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                disabled={submitting}
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={submitting}
                className="diary-add-tag-btn"
              >
                Add
              </button>
            </div>
            <div className="diary-tags-display">
              {formData.tags.map((tag) => (
                <span key={tag} className="diary-tag-badge">
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="diary-tag-remove"
                    disabled={submitting}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Draft Checkbox */}
          <div className="diary-form-group diary-draft-checkbox">
            <label>
              <input
                type="checkbox"
                name="isDraft"
                checked={formData.isDraft}
                onChange={handleChange}
                disabled={submitting}
              />
              <span>Save as draft (not published)</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="diary-form-actions">
            <button
              type="submit"
              className="diary-submit-btn"
              disabled={submitting}
            >
              {submitting
                ? entry
                  ? "Updating..."
                  : "Saving..."
                : entry
                ? "Update Entry"
                : "Save Entry"}
            </button>
            <button
              type="button"
              className="diary-cancel-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DiaryEditor;
