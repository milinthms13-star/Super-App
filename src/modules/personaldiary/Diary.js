import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import "../../styles/Diary.css";
import {
  fetchDiaryEntries,
  createDiaryEntry,
  updateDiaryEntry,
  deleteDiaryEntry,
  fetchDiaryCalendarItems,
  createDiaryCalendarItem,
  updateDiaryCalendarItem,
  deleteDiaryCalendarItem,
  fetchTags,
  fetchMoodStats,
  fetchUpcomingReminders,
  // Phase 5.1: Version History, Trash, Autosave, App Lock
  autosaveDiaryEntry,
  getAppLockStatus,
  // Phase 5.2: E2EE, Cloud Backup, AI
  getEncryptionStatus,
  // PDF Export
  exportEntryAsPDF,
  exportEntriesAsPDF,
} from "../../services/diaryService";
import notificationService from "../../services/notificationService";
import DiaryEditor from "./DiaryEditor";
import DiaryEntryCard from "./DiaryEntryCard";
import DiaryCalendar from "./DiaryCalendar";
import MoodChart from "./MoodChart";
import TodaysSummary from "./TodaysSummary";
// Phase 5.1 Components
import VersionHistory from "./VersionHistory";
import TrashBin from "./TrashBin";
import AppLockSettings from "./AppLockSettings";
import AutosaveIndicator from "./AutosaveIndicator";
// Phase 5.2 Components
import AIInsights from "./AIInsights";
import EncryptionBackupSettings from "./EncryptionBackupSettings";
// Phase 4 Components
import DiaryAnalyticsDashboard from "./DiaryAnalyticsDashboard";
import DiaryAISummaryPanel from "./DiaryAISummaryPanel";
// Phase 4.4 Components
import AutosaveRecoveryModal from "./AutosaveRecoveryModal";
import { io } from "socket.io-client";
import {
  stripHtml,
  sortCalendarItems,
  MOOD_CONFIG,
  CATEGORIES,
} from "../../utils/diaryHelpers";

const MOODS = Object.entries(MOOD_CONFIG).map(([value, config]) => ({
  value,
  label: config.label,
  emoji: config.emoji,
}));

const Diary = () => {
  const [entries, setEntries] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);
  const [calendarItems, setCalendarItems] = useState([]);
  const [upcomingReminders, setUpcomingReminders] = useState([]);
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
  const [calendarSubmitting, setCalendarSubmitting] = useState(false);

  // Phase 5.1: Autosave, Version History, Trash, App Lock
  const [autosaveStatus, setAutosaveStatus] = useState("saved"); // saving, saved, error, offline
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [currentVersionNumber, setCurrentVersionNumber] = useState(0);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showTrashBin, setShowTrashBin] = useState(false);
  const [showAppLock, setShowAppLock] = useState(false);

  // Phase 5.2: Encryption, Backup, AI Analysis
  const [showEncryptionBackup, setShowEncryptionBackup] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);

  // Phase 4: Analytics Dashboard
  const [showAnalyticsDashboard, setShowAnalyticsDashboard] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState(30);

  // Phase 4.3: AI Summary Panel
  const [showAISummary, setShowAISummary] = useState(false);
  const [aiSummaryPeriod, setAiSummaryPeriod] = useState('week');

  // Phase 4.4: Auto-save Recovery
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [draftEntries, setDraftEntries] = useState([]);
  const [loadingRecovery, setLoadingRecovery] = useState(false);

  // PDF Export
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOption, setExportOption] = useState("current"); // current, all, filtered
  const [exporting, setExporting] = useState(false);

  // Current entry state for autosave (updated when editing)
  const [currentEntryForAutosave, setCurrentEntryForAutosave] = useState(null);

  // Load entries on mount
  useEffect(() => {
    loadEntries(false, 20);
    loadCalendarItems();
    loadTags();
    loadMoodStats();
    loadUpcomingReminders();
    loadDrafts(); // Phase 4.4: Fetch drafts for recovery
    setupNotifications();
  }, []);

  // Setup notifications on mount
  const setupNotifications = async () => {
    try {
      // Request notification permission
      await notificationService.requestPermission();

      // Connect to WebSocket for reminder notifications
      const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
      const socket = io(BACKEND_BASE_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      // Setup WebSocket listeners
      notificationService.setupWebSocketListeners(socket);

      // Listen for reminder notifications event in the page
      window.addEventListener("reminderNotification", handleReminderNotification);

      return () => {
        window.removeEventListener(
          "reminderNotification",
          handleReminderNotification
        );
        socket.disconnect();
        notificationService.destroy();
      };
    } catch (error) {
      console.error("Error setting up notifications:", error);
    }
  };

  const handleReminderNotification = (event) => {
    const reminder = event.detail;
    console.log("Reminder notification received:", reminder);
    // Trigger any additional actions when reminder is shown
  };

  const loadUpcomingReminders = async () => {
    try {
      const response = await fetchUpcomingReminders(7);
      setUpcomingReminders(Array.isArray(response.data) ? response.data : []);

      // Start local reminder checking
      if (Array.isArray(response.data) && response.data.length > 0) {
        notificationService.startLocalReminderCheck(response.data);
      }
    } catch (err) {
      console.error("Failed to load upcoming reminders:", err);
    }
  };

  // Phase 5.1: Autosave handler - saves entry every 30 seconds if being edited
  const performAutosave = useCallback(async () => {
    if (!editingEntry || !currentEntryForAutosave) return;

    try {
      setAutosaveStatus("saving");
      const response = await autosaveDiaryEntry(editingEntry._id, {
        title: currentEntryForAutosave.title || editingEntry.title,
        content: currentEntryForAutosave.content || editingEntry.content,
        mood: currentEntryForAutosave.mood || editingEntry.mood,
        category: currentEntryForAutosave.category || editingEntry.category,
        tags: currentEntryForAutosave.tags || editingEntry.tags,
      });

      if (response.data && response.data.versionNumber) {
        setCurrentVersionNumber(response.data.versionNumber);
      }
      setLastSavedTime(new Date());
      setAutosaveStatus("saved");
    } catch (err) {
      console.error("Autosave failed:", err);
      setAutosaveStatus("error");
      // Auto-recover after 3 seconds
      setTimeout(() => setAutosaveStatus("saved"), 3000);
    }
  }, [editingEntry, currentEntryForAutosave]);

  // Phase 5.1: Autosave timer - runs every 30 seconds
  useEffect(() => {
    let autosaveInterval;

    if (showEditor && editingEntry) {
      autosaveInterval = setInterval(() => {
        performAutosave();
      }, 30000); // 30 seconds
    }

    return () => {
      if (autosaveInterval) clearInterval(autosaveInterval);
    };
  }, [showEditor, editingEntry, performAutosave]);

  const loadEntries = async (append = false, limit = 20) => {
    try {
      if (!append) {
        setLoading(true);
        setEntries([]);
        setPage(0);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const response = await fetchDiaryEntries({ 
        limit,
        skip: append ? page * limit : 0,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        mood: selectedMood !== 'All' ? selectedMood : undefined,
        search: searchQuery || undefined,
        sortBy: '-createdAt'
      });
      
      setEntries(prev => append ? [...prev, ... (Array.isArray(response.data) ? response.data : [])] : (Array.isArray(response.data) ? response.data : []));
      setHasMore(response.pagination?.hasMore ?? true);
      if (append) setPage(prev => prev + 1);
    } catch (err) {
      console.error("Failed to load entries:", err);
      setError(err.message || "Failed to load diary entries");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Reset entries on filter change
  useEffect(() => {
    loadEntries(false);
  }, [selectedCategory, selectedMood, searchQuery, selectedTags]);

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

  // Phase 4.4: Load draft entries for recovery
  const loadDrafts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/diary?isDraft=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const drafts = Array.isArray(data.data) ? data.data : [];
        
        if (drafts.length > 0) {
          setDraftEntries(drafts);
          setShowRecoveryModal(true);
        }
      }
    } catch (error) {
      console.error('Failed to load drafts:', error);
      // Silently fail - recovery modal just won't show
    }
  };

  const loadCalendarItems = async () => {
    try {
      const response = await fetchDiaryCalendarItems({ limit: 500 });
      setCalendarItems(sortCalendarItems(Array.isArray(response.data) ? response.data : []));
    } catch (err) {
      console.error("Failed to load calendar items:", err);
      setError((current) => current || err.message || "Failed to load calendar items");
      setCalendarItems([]);
    }
  };

  // All loaded entries (server-side filtered)
  const allLoadedEntries = useMemo(() => entries, [entries]);

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

  const handleCreateCalendarItem = async (itemData) => {
    try {
      setCalendarSubmitting(true);
      const response = await createDiaryCalendarItem(itemData);
      setCalendarItems((current) => sortCalendarItems([...current, response.data]));
      setError(null);
      return response.data;
    } catch (err) {
      setError(err.message || "Failed to create calendar item");
      throw err;
    } finally {
      setCalendarSubmitting(false);
    }
  };

  const handleUpdateCalendarItem = async (itemId, itemData) => {
    try {
      setCalendarSubmitting(true);
      const response = await updateDiaryCalendarItem(itemId, itemData);
      setCalendarItems((current) =>
        sortCalendarItems(
          current.map((item) => (item._id === itemId ? response.data : item))
        )
      );
      setError(null);
      return response.data;
    } catch (err) {
      setError(err.message || "Failed to update calendar item");
      throw err;
    } finally {
      setCalendarSubmitting(false);
    }
  };

  const handleDeleteCalendarItem = async (itemId) => {
    try {
      setCalendarSubmitting(true);
      await deleteDiaryCalendarItem(itemId);
      setCalendarItems((current) => current.filter((item) => item._id !== itemId));
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to delete calendar item");
      throw err;
    } finally {
      setCalendarSubmitting(false);
    }
  };

  // Phase 4.4: Autosave Recovery Handlers
  const handleRecoverDrafts = async (selectedDrafts) => {
    try {
      setLoadingRecovery(true);
      
      for (const draft of selectedDrafts) {
        // Load draft into editor for user to review/save
        setEditingEntry(draft);
        setShowEditor(true);
      }
      
      setShowRecoveryModal(false);
      setDraftEntries([]);
    } catch (error) {
      console.error('Error recovering drafts:', error);
      setError('Failed to recover drafts');
    } finally {
      setLoadingRecovery(false);
    }
  };

  const handleDiscardDrafts = async (draftIds) => {
    try {
      setLoadingRecovery(true);
      const token = localStorage.getItem('token');
      
      for (const draftId of draftIds) {
        await fetch(`/api/diary/${draftId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      
      // Remove from state
      setDraftEntries(prev => 
        prev.filter(draft => !draftIds.includes(draft._id))
      );
      
      if (draftEntries.filter(d => !draftIds.includes(d._id)).length === 0) {
        setShowRecoveryModal(false);
      }
    } catch (error) {
      console.error('Error discarding drafts:', error);
      setError('Failed to discard drafts');
    } finally {
      setLoadingRecovery(false);
    }
  };

  // PDF Export Handler
  const handleExportPDF = async () => {
    try {
      setExporting(true);
      
      if (exportOption === "current" && editingEntry) {
        // Export single entry
        await exportEntryAsPDF(editingEntry);
        notificationService.success("Diary entry exported as PDF");
      } else if (exportOption === "all") {
        // Export all entries
        await exportEntriesAsPDF(entries, { title: "My Diary - All Entries" });
        notificationService.success("All diary entries exported as PDF");
      } else if (exportOption === "filtered") {
        // Export filtered entries
        const filtered = entries.filter((entry) => {
          const categoryMatch = selectedCategory === "All" || entry.category === selectedCategory;
          const moodMatch = selectedMood === "All" || entry.mood === selectedMood;
          const tagsMatch = selectedTags.length === 0 || selectedTags.some((tag) => entry.tags?.includes(tag));
          const searchMatch = !searchQuery || 
            entry.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.content?.toLowerCase().includes(searchQuery.toLowerCase());
          return categoryMatch && moodMatch && tagsMatch && searchMatch;
        });
        
        if (filtered.length === 0) {
          notificationService.warning("No entries match current filters");
          return;
        }
        
        await exportEntriesAsPDF(filtered, { title: `My Diary - Filtered (${filtered.length} entries)` });
        notificationService.success(`${filtered.length} diary entries exported as PDF`);
      }
      
      setShowExportModal(false);
    } catch (err) {
      console.error("Export error:", err);
      notificationService.error("Failed to export PDF: " + (err.message || "Unknown error"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="diary-page">
      {/* Phase 4.4: Auto-save Recovery Modal */}
      <AutosaveRecoveryModal
        isOpen={showRecoveryModal}
        drafts={draftEntries}
        onRecover={handleRecoverDrafts}
        onDiscard={handleDiscardDrafts}
        onClose={() => {
          setShowRecoveryModal(false);
          setDraftEntries([]);
        }}
        loading={loadingRecovery}
      />

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
          <div className="diary-hero-actions">
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

            {/* Phase 5.1: Feature Access Buttons */}
            <button
              type="button"
              className="diary-secondary-btn"
              onClick={() => setShowVersionHistory(true)}
              title="View version history and restore previous versions"
              disabled={!editingEntry}
            >
              📜 History
            </button>

            <button
              type="button"
              className="diary-secondary-btn"
              onClick={() => setShowTrashBin(true)}
              title="View and recover deleted entries"
            >
              🗑️ Trash
            </button>

            <button
              type="button"
              className="diary-secondary-btn"
              onClick={() => setShowAppLock(true)}
              title="Set up PIN lock for app"
            >
              🔒 Lock
            </button>

            {/* Phase 5.2: Feature Access Buttons */}
            <button
              type="button"
              className="diary-secondary-btn"
              onClick={() => setShowEncryptionBackup(true)}
              title="Manage encryption and backups"
            >
              🔐 Backup
            </button>

            <button
              type="button"
              className="diary-secondary-btn"
              onClick={() => setShowAIInsights(true)}
              title="View AI-generated insights"
              disabled={!editingEntry}
            >
              ✨ AI
            </button>

            <button
              type="button"
              className="diary-secondary-btn"
              onClick={() => setShowExportModal(true)}
              title="Export diary entries as PDF"
            >
              📄 Export
            </button>

            {/* Phase 4: Analytics Dashboard Button */}
            <button
              type="button"
              className="diary-secondary-btn"
              onClick={() => setShowAnalyticsDashboard(true)}
              title="View writing analytics and insights"
            >
              📊 Analytics
            </button>

            {/* Phase 4.3: AI Summary Button */}
            <button
              type="button"
              className="diary-secondary-btn"
              onClick={() => setShowAISummary(true)}
              title="View AI-generated summary and insights"
            >
              ✨ AI Summary
            </button>
          </div>
        </div>
      </section>

      {showEditor && (
        <DiaryEditor
          entry={editingEntry}
          onSave={editingEntry ? handleUpdateEntry : handleCreateEntry}
          onClose={() => {
            setShowEditor(false);
            setEditingEntry(null);
            setCurrentEntryForAutosave(null);
            setCurrentVersionNumber(0);
            setAutosaveStatus("saved");
          }}
          submitting={submitting}
        />
      )}

      {/* Autosave Indicator */}
      {showEditor && editingEntry && (
        <AutosaveIndicator
          status={autosaveStatus}
          lastSaveTime={lastSavedTime}
          versionNumber={currentVersionNumber}
        />
      )}

      {/* Phase 5.1: Version History Modal */}
      {showVersionHistory && editingEntry && (
        <VersionHistory
          entryId={editingEntry._id}
          onClose={() => setShowVersionHistory(false)}
        />
      )}

      {/* Phase 5.1: Trash Bin Modal */}
      {showTrashBin && (
        <TrashBin
          onClose={() => setShowTrashBin(false)}
          onRecover={async () => {
            await loadEntries(false);
            setShowTrashBin(false);
          }}
        />
      )}

      {/* Phase 5.1: App Lock Settings Modal */}
      {showAppLock && (
        <AppLockSettings
          onClose={() => setShowAppLock(false)}
        />
      )}

      {/* Phase 5.2: AI Insights Modal */}
      {showAIInsights && editingEntry && (
        <AIInsights
          entryId={editingEntry._id}
          onClose={() => setShowAIInsights(false)}
        />
      )}

      {/* Phase 5.2: Encryption & Backup Modal */}
      {showEncryptionBackup && (
        <EncryptionBackupSettings
          onClose={() => setShowEncryptionBackup(false)}
          onBackupRestore={async () => {
            await loadEntries(false);
          }}
        />
      )}

      {/* PDF Export Modal */}
      {showExportModal && (
        <div className="diary-modal-overlay" onClick={() => !exporting && setShowExportModal(false)}>
          <div className="diary-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="diary-modal-header">
              <h2>📄 Export Diary as PDF</h2>
              <button
                type="button"
                className="diary-modal-close"
                onClick={() => !exporting && setShowExportModal(false)}
                disabled={exporting}
              >
                ✕
              </button>
            </div>

            <div className="diary-modal-body">
              <p className="diary-export-description">
                Choose what you'd like to export:
              </p>

              <div className="diary-export-options">
                <label className="diary-export-option">
                  <input
                    type="radio"
                    value="current"
                    checked={exportOption === "current"}
                    onChange={(e) => setExportOption(e.target.value)}
                    disabled={!editingEntry || exporting}
                  />
                  <span>Current Entry</span>
                  {editingEntry && (
                    <small>{editingEntry.title || "Untitled"}</small>
                  )}
                </label>

                <label className="diary-export-option">
                  <input
                    type="radio"
                    value="filtered"
                    checked={exportOption === "filtered"}
                    onChange={(e) => setExportOption(e.target.value)}
                    disabled={exporting}
                  />
                  <span>Filtered Entries</span>
                  <small>Based on current filters (category, mood, tags, search)</small>
                </label>

                <label className="diary-export-option">
                  <input
                    type="radio"
                    value="all"
                    checked={exportOption === "all"}
                    onChange={(e) => setExportOption(e.target.value)}
                    disabled={entries.length === 0 || exporting}
                  />
                  <span>All Entries</span>
                  <small>{entries.length} entries total</small>
                </label>
              </div>

              {exportOption === "current" && !editingEntry && (
                <div className="diary-warning">
                  ⚠️ Select an entry to export it
                </div>
              )}
            </div>

            <div className="diary-modal-footer">
              <button
                type="button"
                className="diary-modal-cancel-btn"
                onClick={() => setShowExportModal(false)}
                disabled={exporting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="diary-modal-action-btn"
                onClick={handleExportPDF}
                disabled={
                  exporting ||
                  (exportOption === "current" && !editingEntry) ||
                  (exportOption === "all" && entries.length === 0)
                }
              >
                {exporting ? "Exporting..." : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 4: Analytics Dashboard Modal */}
      {showAnalyticsDashboard && (
        <div className="diary-modal-overlay" onClick={() => setShowAnalyticsDashboard(false)}>
          <div className="diary-modal-content diary-analytics-modal" onClick={(e) => e.stopPropagation()}>
            <div className="diary-modal-header">
              <h2>📊 Diary Analytics</h2>
              <button
                type="button"
                className="diary-modal-close"
                onClick={() => setShowAnalyticsDashboard(false)}
              >
                ✕
              </button>
            </div>

            <div className="diary-modal-body diary-analytics-body">
              <DiaryAnalyticsDashboard userId={localStorage.getItem('userId')} dateRange={analyticsPeriod} />
            </div>
          </div>
        </div>
      )}

      {/* Phase 4.3: AI Summary Modal */}
      {showAISummary && (
        <div className="diary-modal-overlay" onClick={() => setShowAISummary(false)}>
          <div className="diary-modal-content diary-ai-summary-modal" onClick={(e) => e.stopPropagation()}>
            <div className="diary-modal-header">
              <h2>✨ AI Summary & Insights</h2>
              <button
                type="button"
                className="diary-modal-close"
                onClick={() => setShowAISummary(false)}
              >
                ✕
              </button>
            </div>

            <div className="diary-modal-body diary-ai-summary-body">
              <DiaryAISummaryPanel userId={localStorage.getItem('userId')} dateRange={aiSummaryPeriod} />
            </div>
          </div>
        </div>
      )}

      {/* Today's Summary Section */}
      <section className="diary-todays-section">
        <TodaysSummary />
      </section>

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
          ) : allLoadedEntries.length > 0 ? (
            <div className="diary-entries-grid" ref={sentinelRef}>
              {allLoadedEntries.map((entry) => (
                <DiaryEntryCard
                  key={entry._id}
                  entry={entry}
                  onEdit={() => handleEditEntry(entry)}
                  onDelete={() => handleDeleteEntry(entry._id)}
                />
              ))}
              {loadingMore && (
                <div className="diary-loading-more">Loading more entries...</div>
              )}
              {!hasMore && allLoadedEntries.length > 0 && (
                <div className="diary-no-more">No more entries to load</div>
              )}
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
        <DiaryCalendar
          entries={entries}
          calendarItems={calendarItems}
          onCreateCalendarItem={handleCreateCalendarItem}
          onUpdateCalendarItem={handleUpdateCalendarItem}
          onDeleteCalendarItem={handleDeleteCalendarItem}
          submitting={calendarSubmitting}
        />
      )}

      {viewMode === "analytics" && (
        <MoodChart moodStats={moodStats} />
      )}
    </div>
  );
};

export default Diary;

