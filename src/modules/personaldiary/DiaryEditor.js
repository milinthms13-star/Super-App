import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  stripHtml,
  getPlainTextLength,
  MOOD_CONFIG,
  CATEGORIES,
  saveDraftToStorage,
  loadDraftFromStorage,
  clearDraftFromStorage,
  debounce,
} from "../../utils/diaryHelpers";
// Phase 4.4: Version History Timeline
import VersionHistoryTimeline from "./VersionHistoryTimeline";

const MOODS = Object.entries(MOOD_CONFIG).map(([value, config]) => ({
  value,
  label: config.label,
  emoji: config.emoji,
}));

const EDITOR_CATEGORIES = CATEGORIES.filter((c) => c !== "All");

// Entry Templates - Pre-filled templates for common entry types
const ENTRY_TEMPLATES = {
  gratitude: {
    title: "Gratitude Journal",
    content: "<h3>Today I'm Grateful For:</h3><ol><li>Something that made me happy...</li><li>Someone who helped me...</li><li>An unexpected good thing...</li></ol>",
    category: "Personal",
    mood: "happy",
  },
  reflection: {
    title: "Daily Reflection",
    content: "<h3>What Went Well:</h3><p>...</p><h3>What Could Improve:</h3><p>...</p><h3>Tomorrow's Focus:</h3><p>...</p>",
    category: "Personal",
    mood: "neutral",
  },
  workDay: {
    title: "Work Day Summary",
    content: "<h3>Accomplished:</h3><ul><li>...</li></ul><h3>Challenges:</h3><ul><li>...</li></ul><h3>Tomorrow's Priorities:</h3><ul><li>...</li></ul>",
    category: "Work",
    mood: "focused",
  },
  health: {
    title: "Health & Wellness Check-in",
    content: "<h3>Sleep Quality:</h3><p>...</p><h3>Exercise/Activity:</h3><p>...</p><h3>Nutrition:</h3><p>...</p><h3>Mental State:</h3><p>...</p>",
    category: "Health",
    mood: "neutral",
  },
  weeklyReview: {
    title: "Weekly Review",
    content: "<h3>Week Highlights:</h3><p>...</p><h3>Lessons Learned:</h3><p>...</p><h3>Next Week Goals:</h3><p>...</p>",
    category: "Personal",
    mood: "reflective",
  },
  goals: {
    title: "Goal Progress Update",
    content: "<h3>Goal:</h3><p>...</p><h3>Progress Made:</h3><p>...</p><h3>Obstacles:</h3><p>...</p><h3>Next Steps:</h3><p>...</p>",
    category: "Work",
    mood: "focused",
  },
  travel: {
    title: "Travel Log",
    content: "<h3>Location:</h3><p>...</p><h3>Highlights:</h3><p>...</p><h3>Food & Experiences:</h3><p>...</p><h3>Reflections:</h3><p>...</p>",
    category: "Adventure",
    mood: "happy",
  },
  relationship: {
    title: "Relationship Reflection",
    content: "<h3>Who:</h3><p>...</p><h3>What Happened:</h3><p>...</p><h3>How It Made Me Feel:</h3><p>...</p><h3>Next Actions:</h3><p>...</p>",
    category: "Personal",
    mood: "neutral",
  },
};

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
  const [selectedFiles, setSelectedFiles] = useState([]) ;
  const [filePreviews, setFilePreviews] = useState([]) ;
  const [autosaveStatus, setAutosaveStatus] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  // Phase 4.4: Version History
  const [versions, setVersions] = useState([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const quillRef = useRef(null);

  // Load draft from localStorage on mount (only for new entries)
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
    } else {
      const draft = loadDraftFromStorage();
      if (draft && draft.title) {
        setFormData((current) => ({
          ...current,
          ...draft,
          entryDate: draft.entryDate || current.entryDate,
        }));
        setAutosaveStatus("Draft loaded from autosave");
      }
    }
  }, [entry]);

  // Autosave to localStorage
  const debouncedAutosave = useCallback(
    debounce((data) => {
      saveDraftToStorage(data);
      setAutosaveStatus("Draft autosaved");
    }, 2000),
    []
  );

  useEffect(() => {
    if (!entry) {
      debouncedAutosave(formData);
    }
  }, [formData, entry, debouncedAutosave]);

  // Clear autosave status after 3 seconds
  useEffect(() => {
    if (autosaveStatus) {
      const timer = setTimeout(() => setAutosaveStatus(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [autosaveStatus]);

  // Keyboard shortcuts: Ctrl+S to save, Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!submitting) {
          const fakeEvent = { preventDefault: () => {} };
          handleSubmit(fakeEvent);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, submitting, formData, selectedFiles]);

  useEffect(() => {
    return () => {
      filePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [filePreviews]);

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

  const handleQuillChange = (value) => {
    setFormData((current) => ({
      ...current,
      content: value,
    }));
    if (errors.content) {
      setErrors((current) => ({
        ...current,
        content: null,
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

  const handleApplyTemplate = (templateKey) => {
    const template = ENTRY_TEMPLATES[templateKey];
    if (template) {
      setFormData((current) => ({
        ...current,
        title: template.title,
        content: template.content,
        category: template.category,
        mood: template.mood,
      }));
      setSelectedTemplate(templateKey);
    }
  };

  // Phase 4.4: Version History Functions
  const fetchVersions = async () => {
    if (!entry?._id) return;
    
    try {
      setLoadingVersions(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/diary/${entry._id}/versions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setVersions(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    } finally {
      setLoadingVersions(false);
    }
  };

  // Fetch versions when entry is loaded
  useEffect(() => {
    if (entry?._id) {
      fetchVersions();
    }
  }, [entry?._id]);

  const handleRestoreVersion = async (version) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/diary/${entry._id}/restore-version`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ versionId: version._id })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Update form with restored version
        setFormData({
          title: data.data.title,
          content: data.data.content,
          mood: data.data.mood,
          category: data.data.category,
          tags: data.data.tags || [],
          isDraft: data.data.isDraft,
          entryDate: data.data.entryDate ? data.data.entryDate.split("T")[0] : formData.entryDate,
        });
        // Refresh versions
        await fetchVersions();
        setShowVersionHistory(false);
        setAutosaveStatus("Restored from version history");
      }
    } catch (error) {
      console.error('Failed to restore version:', error);
      setAutosaveStatus("Failed to restore version");
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!stripHtml(formData.content)) {
      newErrors.content = "Content is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      clearDraftFromStorage();
      onSave(formData, selectedFiles);
    }
  };

  return (
    <div className="diary-editor-overlay">
      <div className="diary-editor-modal">
        <div className="diary-editor-header">
          <h2>{entry ? "Edit Entry" : "New Diary Entry"}</h2>
          <div className="diary-editor-header-actions">
            {/* Phase 4.4: Version History Button (only for existing entries) */}
            {entry && versions.length > 0 && (
              <button
                type="button"
                className="diary-version-history-btn"
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                title="View version history"
              >
                📜 History ({versions.length})
              </button>
            )}
            <button className="diary-close-btn" onClick={onClose} disabled={submitting}>
              ✕
            </button>
          </div>
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

          {/* Template Selector (only for new entries) */}
          {!entry && (
            <div className="diary-form-group">
              <label>📝 Quick Start with Template (Optional)</label>
              <select
                value={selectedTemplate}
                onChange={(e) => {
                  if (e.target.value) {
                    handleApplyTemplate(e.target.value);
                  }
                  e.target.value = "";
                }}
                disabled={submitting}
                className="diary-template-select"
              >
                <option value="">-- Choose a template to start --</option>
                <option value="gratitude">🙏 Gratitude Journal</option>
                <option value="reflection">🤔 Daily Reflection</option>
                <option value="workDay">💼 Work Day Summary</option>
                <option value="health">💪 Health & Wellness Check-in</option>
                <option value="weeklyReview">📊 Weekly Review</option>
                <option value="goals">🎯 Goal Progress Update</option>
                <option value="travel">✈️ Travel Log</option>
                <option value="relationship">💝 Relationship Reflection</option>
              </select>
              {selectedTemplate && (
                <p className="diary-template-applied">✓ Template applied! Customize as needed.</p>
              )}
            </div>
          )}

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
                {EDITOR_CATEGORIES.map((cat) => (
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
            <ReactQuill
              theme="snow"
              value={formData.content}
              onChange={handleQuillChange}
              placeholder="Write your thoughts, memories, and feelings here..."
              disabled={submitting}
              className={errors.content ? "error" : ""}
              modules={{
                toolbar: [
                  [{ 'header': [1, 2, false] }],
                  ['bold', 'italic', 'underline','strike', 'blockquote'],
                  [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
                  ['link', 'image'],
                  ['clean']
                ],
              }}
              style={{ height: '300px' }}
            />
            {errors.content && <span className="diary-error">{errors.content}</span>}
            <div className="diary-char-count">
              {stripHtml(formData.content).length}/50000 characters
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

          {/* Attachments */}
          <div className="diary-form-group">
            <label>Attachments (Images/Audio)</label>
            <input
              type="file"
              multiple
              accept="image/*,audio/*"
              onChange={(e) => {
                const files = Array.from(e.target.files);
                setSelectedFiles(files);
                const previews = files.map(file => URL.createObjectURL(file));
                setFilePreviews(previews);
              }}
              disabled={submitting}
            />
            <div className="diary-attachments-preview">
              {filePreviews.map((preview, idx) => (
                <div key={idx} className="attachment-preview">
                  {selectedFiles[idx].type.startsWith('image/') ? (
                    <img src={preview} alt="preview" style={{width: '60px', height: '60px'}} />
                  ) : (
                    <audio src={preview} controls style={{width: '150px'}} />
                  )}
                  <button type="button" onClick={() => {
                    const newFiles = selectedFiles.filter((_, i) => i !== idx);
                    const newPreviews = filePreviews.filter((_, i) => i !== idx);
                    setSelectedFiles(newFiles);
                    setFilePreviews(newPreviews);
                  }}>Remove</button>
                </div>
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

        {/* Phase 4.4: Version History Timeline */}
        {showVersionHistory && entry && versions.length > 0 && (
          <div className="diary-editor-version-history-section">
            <VersionHistoryTimeline
              entryId={entry._id}
              versions={versions}
              onRestore={handleRestoreVersion}
              loading={loadingVersions}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DiaryEditor;
