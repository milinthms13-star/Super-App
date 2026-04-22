import React, { useEffect, useState, useMemo } from "react";
import "../../styles/Diary.css";
import {
  fetchDiaryEntries,
  createDiaryEntry,
  updateDiaryEntry,
  deleteDiaryEntry,
  fetchTags,
  fetchMoodStats,
} from "../../services/diaryService";
import DiaryEditor from "./DiaryEditor";
import DiaryEntryCard from "./DiaryEntryCard";
import DiaryCalendar from "./DiaryCalendar";
import MoodChart from "./MoodChart";

const MOODS = [
  { value: "very_sad", label: "😭", emoji: "😭" },
  { value: "sad", label: "😢", emoji: "😢" },
  { value: "neutral", label: "😐", emoji: "😐" },
  { value: "happy", label: "😊", emoji: "😊" },
  { value: "very_happy", label: "😄", emoji: "😄" },
];

const CATEGORIES = ["All", "Personal", "Work", "Travel", "Health", "Relationships", "Other"];

const stripHtml = (content = "") =>
  String(content)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const Diary = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedMood, setSelectedMood] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [moodStats, setMoodStats] = useState([]);
  const [viewMode, setViewMode] = useState("list"); // list, calendar, analytics
  const [submitting, setSubmitting] = useState(false);

  // Load entries on mount
  useEffect(() => {
    loadEntries();
    loadTags();
    loadMoodStats();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchDiaryEntries({ limit: 100 });
      setEntries(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to load entries:", err);
      setError(err.message || "Failed to load diary entries");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const response = await fetchTags();
      setTags(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to load tags:", err);
    }
  };

  const loadMoodStats = async () => {
    try {
      const response = await fetchMoodStats(30);
      setMoodStats(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to load mood stats:", err);
    }
  };

  // Filter entries based on selected filters
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (selectedCategory !== "All" && entry.category !== selectedCategory) {
        return false;
      }
      if (selectedMood !== "All" && entry.mood !== selectedMood) {
        return false;
      }
      if (
        searchQuery &&
        !entry.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !stripHtml(entry.content).toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (
        selectedTags.length > 0 &&
        !selectedTags.some((tag) => entry.tags.includes(tag))
      ) {
        return false;
      }
      return true;
    });
  }, [entries, selectedCategory, selectedMood, searchQuery, selectedTags]);

  const handleCreateEntry = async (entryData, files = []) => {
    try {
      setSubmitting(true);
      const response = await createDiaryEntry(entryData, files);
      setEntries((current) => [response.data, ...current]);
      setShowEditor(false);
      setEditingEntry(null);
      await loadTags();
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to create entry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateEntry = async (entryData, files = []) => {
    try {
      setSubmitting(true);
      const response = await updateDiaryEntry(editingEntry._id, entryData, files);
      setEntries((current) =>
        current.map((entry) =>
          entry._id === editingEntry._id ? response.data : entry
        )
      );
      setShowEditor(false);
      setEditingEntry(null);
      await loadTags();
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to update entry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) {
      return;
    }

    try {
      await deleteDiaryEntry(entryId);
      setEntries((current) => current.filter((entry) => entry._id !== entryId));
      await loadTags();
    } catch (err) {
      setError(err.message || "Failed to delete entry");
    }
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setShowEditor(true);
  };

  return (
    <div className="diary-page">
      <section className="diary-hero">
        <div>
          <p className="diary-eyebrow">Personal Reflection</p>
          <h1>My Diary</h1>
          <p className="diary-intro">
            Capture your thoughts, track your moods, and cherish your memories.
          </p>
          {error && (
            <div className="diary-error-message">{error}</div>
          )}
          <button
            type="button"
            className="diary-primary-btn"
            onClick={() => {
              setEditingEntry(null);
              setShowEditor(true);
            }}
            disabled={loading}
          >
            ✍️ New Entry
          </button>
        </div>
      </section>

      {showEditor && (
        <DiaryEditor
          entry={editingEntry}
          onSave={editingEntry ? handleUpdateEntry : handleCreateEntry}
          onClose={() => {
            setShowEditor(false);
            setEditingEntry(null);
          }}
          submitting={submitting}
        />
      )}

      {/* View Mode Selector */}
      <div className="diary-view-selector">
        <button
          className={`diary-view-btn ${viewMode === "list" ? "active" : ""}`}
          onClick={() => setViewMode("list")}
        >
          📋 List
        </button>
        <button
          className={`diary-view-btn ${viewMode === "calendar" ? "active" : ""}`}
          onClick={() => setViewMode("calendar")}
        >
          📅 Calendar
        </button>
        <button
          className={`diary-view-btn ${viewMode === "analytics" ? "active" : ""}`}
          onClick={() => setViewMode("analytics")}
        >
          📊 Mood Analytics
        </button>
      </div>

      {viewMode === "list" && (
        <section className="diary-filters-section">
          <div className="diary-filter-group">
            <input
              type="text"
              placeholder="🔍 Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="diary-search-input"
            />
          </div>

          <div className="diary-filter-group">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="diary-filter-select"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="diary-mood-filter">
            <button
              className={`diary-mood-btn ${selectedMood === "All" ? "active" : ""}`}
              onClick={() => setSelectedMood("All")}
            >
              All Moods
            </button>
            {MOODS.map((mood) => (
              <button
                key={mood.value}
                className={`diary-mood-btn ${selectedMood === mood.value ? "active" : ""}`}
                onClick={() => setSelectedMood(mood.value)}
                title={mood.label}
              >
                {mood.emoji}
              </button>
            ))}
          </div>

          {tags.length > 0 && (
            <div className="diary-tags-filter">
              <span className="diary-filter-label">Tags:</span>
              {tags.slice(0, 5).map((tag) => (
                <button
                  key={tag.name}
                  className={`diary-tag-btn ${
                    selectedTags.includes(tag.name) ? "active" : ""
                  }`}
                  onClick={() => {
                    if (selectedTags.includes(tag.name)) {
                      setSelectedTags((current) =>
                        current.filter((t) => t !== tag.name)
                      );
                    } else {
                      setSelectedTags((current) => [...current, tag.name]);
                    }
                  }}
                >
                  #{tag.name} ({tag.count})
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {viewMode === "list" && (
        <section className="diary-entries-section">
          {loading ? (
            <div className="diary-loading">Loading your entries...</div>
          ) : filteredEntries.length > 0 ? (
            <div className="diary-entries-grid">
              {filteredEntries.map((entry) => (
                <DiaryEntryCard
                  key={entry._id}
                  entry={entry}
                  onEdit={() => handleEditEntry(entry)}
                  onDelete={() => handleDeleteEntry(entry._id)}
                />
              ))}
            </div>
          ) : (
            <div className="diary-empty">
              <p>📝 No entries found</p>
              <p>Start writing your first diary entry!</p>
            </div>
          )}
        </section>
      )}

      {viewMode === "calendar" && (
        <DiaryCalendar entries={entries} onDateClick={(date) => console.log(date)} />
      )}

      {viewMode === "analytics" && (
        <MoodChart moodStats={moodStats} />
      )}
    </div>
  );
};

export default Diary;
