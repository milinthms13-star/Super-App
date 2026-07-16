/**
 * Professional Karaoke Duet Component
 * Local storage, offline-first, free APIs
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import karaokeDB from './db/karaokeDB';
import sessionService from './services/sessionService';
import lyricsService from './services/lyricsService';
import AudioRecorder from './audio/audioRecorder';
import { AudioPlayer, LyricsPlayer } from './audio/audioPlayer';
import WaveformVisualizer from './components/WaveformVisualizer';
import LyricsDisplay from './components/LyricsDisplay';
import SessionManager from './components/SessionManager';
import RecordingStudio from './components/RecordingStudio';
import './KaraokeDuetPro.css';

const KaraokeDuetPro = () => {
  // State management
  const [initialized, setInitialized] = useState(false);
  const [currentView, setCurrentView] = useState('home'); // home, session, recording, mixing
  const [status, setStatus] = useState({ type: '', message: '' });
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [storageStats, setStorageStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initialize database
  useEffect(() => {
    const initDB = async () => {
      try {
        await karaokeDB.init();
        setInitialized(true);
        loadSessions();
        loadStorageStats();
        setStatus({ type: 'success', message: '✨ Karaoke Duet Pro ready! All data stored locally.' });
      } catch (error) {
        setStatus({ type: 'error', message: `Failed to initialize: ${error.message}` });
      }
    };

    initDB();
  }, []);

  // Load sessions
  const loadSessions = useCallback(async () => {
    try {
      const allSessions = await sessionService.getAllSessions({ limit: 20 });
      setSessions(allSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }, []);

  // Load storage stats
  const loadStorageStats = useCallback(async () => {
    try {
      const stats = await karaokeDB.getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    }
  }, []);

  // Create new session
  const handleCreateSession = async (sessionData) => {
    try {
      setLoading(true);
      const session = await sessionService.createSession(sessionData);
      setCurrentSession(session);
      setCurrentView('session');
      await loadSessions();
      setStatus({ type: 'success', message: '🎤 New session created!' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Load session
  const handleLoadSession = async (sessionId) => {
    try {
      setLoading(true);
      const session = await sessionService.loadSession(sessionId);
      setCurrentSession(session);
      setCurrentView('session');
      setStatus({ type: 'success', message: '📂 Session loaded!' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Delete session
  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Delete this session and all recordings?')) {
      return;
    }

    try {
      await sessionService.deleteSession(sessionId);
      await loadSessions();
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setCurrentView('home');
      }
      setStatus({ type: 'success', message: '🗑️ Session deleted' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  // Fetch lyrics
  const handleFetchLyrics = async (songTitle, artist) => {
    try {
      setLoading(true);
      const lyrics = await sessionService.fetchLyrics(songTitle, artist);
      setCurrentSession(sessionService.getCurrentSession());
      setStatus({ type: 'success', message: `✅ Lyrics found from ${lyrics.source}!` });
      return lyrics;
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (!initialized) {
    return (
      <div className="karaoke-duet-pro">
        <div className="kdp-container">
          <div className="kdp-loading">
            <div className="kdp-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="karaoke-duet-pro">
      <div className="kdp-container">
        {/* Header */}
        <header className="kdp-header">
          <h1>🎤 Karaoke Duet Pro</h1>
          <p>Professional local karaoke studio - No server required!</p>
          <div className="kdp-header-badges">
            <span className="kdp-badge">
              <span className="kdp-badge-icon">💾</span>
              100% Local Storage
            </span>
            <span className="kdp-badge">
              <span className="kdp-badge-icon">🌐</span>
              Offline Ready
            </span>
            <span className="kdp-badge">
              <span className="kdp-badge-icon">🆓</span>
              Free APIs
            </span>
            {storageStats && (
              <span className="kdp-badge">
                <span className="kdp-badge-icon">📊</span>
                {storageStats.percentage}% Storage Used
              </span>
            )}
          </div>
        </header>

        {/* Status Banner */}
        {status.message && (
          <div className={`kdp-status-banner ${status.type}`}>
            {status.message}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="kdp-tabs">
          <button
            className={`kdp-tab ${currentView === 'home' ? 'active' : ''}`}
            onClick={() => setCurrentView('home')}
          >
            🏠 Home
          </button>
          {currentSession && (
            <>
              <button
                className={`kdp-tab ${currentView === 'session' ? 'active' : ''}`}
                onClick={() => setCurrentView('session')}
              >
                🎵 Session
              </button>
              <button
                className={`kdp-tab ${currentView === 'recording' ? 'active' : ''}`}
                onClick={() => setCurrentView('recording')}
              >
                🎙️ Recording
              </button>
            </>
          )}
        </div>

        {/* Main Content */}
        {currentView === 'home' && (
          <HomeView
            sessions={sessions}
            onCreateSession={handleCreateSession}
            onLoadSession={handleLoadSession}
            onDeleteSession={handleDeleteSession}
            loading={loading}
          />
        )}

        {currentView === 'session' && currentSession && (
          <SessionView
            session={currentSession}
            onFetchLyrics={handleFetchLyrics}
            onStartRecording={() => setCurrentView('recording')}
            setStatus={setStatus}
            loading={loading}
          />
        )}

        {currentView === 'recording' && currentSession && (
          <RecordingView
            session={currentSession}
            setStatus={setStatus}
            onComplete={() => setCurrentView('session')}
          />
        )}
      </div>
    </div>
  );
};

// Home View Component
const HomeView = ({ sessions, onCreateSession, onLoadSession, onDeleteSession, loading }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    songTitle: '',
    artist: '',
    bpm: 120,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreateSession(formData);
    setShowCreateForm(false);
    setFormData({ title: '', songTitle: '', artist: '', bpm: 120 });
  };

  return (
    <div>
      <div className="kdp-grid">
        {/* Create New Session Card */}
        <div className="kdp-card">
          <div className="kdp-card-header">
            <h3 className="kdp-card-title">
              <span className="kdp-card-icon">➕</span>
              New Session
            </h3>
          </div>

          {!showCreateForm ? (
            <button
              className="kdp-button kdp-button-primary"
              onClick={() => setShowCreateForm(true)}
              style={{ width: '100%' }}
            >
              <span>🎤</span>
              Create New Duet Session
            </button>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="kdp-form-group">
                <label className="kdp-label">Session Title</label>
                <input
                  type="text"
                  className="kdp-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="My Awesome Duet"
                  required
                />
              </div>

              <div className="kdp-form-group">
                <label className="kdp-label">Song Title (Optional)</label>
                <input
                  type="text"
                  className="kdp-input"
                  value={formData.songTitle}
                  onChange={(e) => setFormData({ ...formData, songTitle: e.target.value })}
                  placeholder="Song name"
                />
              </div>

              <div className="kdp-form-group">
                <label className="kdp-label">Artist (Optional)</label>
                <input
                  type="text"
                  className="kdp-input"
                  value={formData.artist}
                  onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                  placeholder="Artist name"
                />
              </div>

              <div className="kdp-form-group">
                <label className="kdp-label">BPM (Tempo)</label>
                <input
                  type="number"
                  className="kdp-input"
                  value={formData.bpm}
                  onChange={(e) => setFormData({ ...formData, bpm: parseInt(e.target.value) })}
                  min="60"
                  max="200"
                />
              </div>

              <div className="kdp-button-group">
                <button type="submit" className="kdp-button kdp-button-success" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Session'}
                </button>
                <button
                  type="button"
                  className="kdp-button kdp-button-secondary"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Recent Sessions Card */}
        <div className="kdp-card">
          <div className="kdp-card-header">
            <h3 className="kdp-card-title">
              <span className="kdp-card-icon">📁</span>
              Recent Sessions ({sessions.length})
            </h3>
          </div>

          {sessions.length === 0 ? (
            <div className="kdp-empty-state">
              <div className="kdp-empty-icon">🎵</div>
              <p className="kdp-empty-text">No sessions yet. Create your first duet!</p>
            </div>
          ) : (
            <div className="kdp-session-list">
              {sessions.map((session) => (
                <div key={session.id} className="kdp-session-item">
                  <div className="kdp-session-info">
                    <h4>{session.title}</h4>
                    <p>
                      {session.songTitle && `${session.songTitle} • `}
                      {new Date(session.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="kdp-session-actions">
                    <button
                      className="kdp-button kdp-button-primary"
                      onClick={() => onLoadSession(session.id)}
                    >
                      Open
                    </button>
                    <button
                      className="kdp-button kdp-button-danger"
                      onClick={() => onDeleteSession(session.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="kdp-card">
        <h3 className="kdp-card-title">
          <span className="kdp-card-icon">📊</span>
          Quick Stats
        </h3>
        <div className="kdp-stats-grid">
          <div className="kdp-stat-card">
            <div className="kdp-stat-value">{sessions.length}</div>
            <div className="kdp-stat-label">Total Sessions</div>
          </div>
          <div className="kdp-stat-card">
            <div className="kdp-stat-value">
              {sessions.filter(s => s.status === 'completed').length}
            </div>
            <div className="kdp-stat-label">Completed</div>
          </div>
          <div className="kdp-stat-card">
            <div className="kdp-stat-value">100%</div>
            <div className="kdp-stat-label">Local Storage</div>
          </div>
          <div className="kdp-stat-card">
            <div className="kdp-stat-value">🆓</div>
            <div className="kdp-stat-label">Always Free</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Session View Component
const SessionView = ({ session, onFetchLyrics, onStartRecording, setStatus, loading }) => {
  const [searchSong, setSearchSong] = useState('');
  const [searchArtist, setSearchArtist] = useState('');

  const handleFetchLyrics = async () => {
    await onFetchLyrics(searchSong || session.songTitle, searchArtist || session.artist);
  };

  return (
    <div className="kdp-grid">
      {/* Session Info Card */}
      <div className="kdp-card">
        <div className="kdp-card-header">
          <h3 className="kdp-card-title">
            <span className="kdp-card-icon">🎵</span>
            Session Info
          </h3>
        </div>
        <div className="kdp-form-group">
          <label className="kdp-label">Title</label>
          <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>{session.title}</p>
        </div>
        {session.songTitle && (
          <div className="kdp-form-group">
            <label className="kdp-label">Song</label>
            <p style={{ margin: 0 }}>
              {session.songTitle} {session.artist && `by ${session.artist}`}
            </p>
          </div>
        )}
        <div className="kdp-form-group">
          <label className="kdp-label">BPM</label>
          <p style={{ margin: 0 }}>{session.bpm}</p>
        </div>
        <div className="kdp-form-group">
          <label className="kdp-label">Status</label>
          <p style={{ margin: 0 }}>
            <span className="kdp-badge">{session.status || 'draft'}</span>
          </p>
        </div>
      </div>

      {/* Lyrics Fetcher Card */}
      <div className="kdp-card">
        <div className="kdp-card-header">
          <h3 className="kdp-card-title">
            <span className="kdp-card-icon">📝</span>
            Fetch Lyrics
          </h3>
        </div>
        <div className="kdp-form-group">
          <label className="kdp-label">Song Title</label>
          <input
            type="text"
            className="kdp-input"
            value={searchSong}
            onChange={(e) => setSearchSong(e.target.value)}
            placeholder={session.songTitle || 'Enter song title'}
          />
        </div>
        <div className="kdp-form-group">
          <label className="kdp-label">Artist</label>
          <input
            type="text"
            className="kdp-input"
            value={searchArtist}
            onChange={(e) => setSearchArtist(e.target.value)}
            placeholder={session.artist || 'Enter artist name'}
          />
        </div>
        <button
          className="kdp-button kdp-button-primary"
          onClick={handleFetchLyrics}
          disabled={loading || (!searchSong && !session.songTitle)}
          style={{ width: '100%' }}
        >
          {loading ? 'Fetching...' : '🔍 Fetch Free Lyrics'}
        </button>
        <p style={{ margin: '10px 0 0 0', fontSize: '0.85rem', color: '#999' }}>
          Uses free APIs: Lyrics.ovh & ChartLyrics
        </p>
      </div>

      {/* Lyrics Display */}
      {session.lyrics && session.lyrics.length > 0 && (
        <div className="kdp-card" style={{ gridColumn: '1 / -1' }}>
          <div className="kdp-card-header">
            <h3 className="kdp-card-title">
              <span className="kdp-card-icon">📋</span>
              Lyrics ({session.lyrics.length} lines)
            </h3>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto', background: '#f8f8f8', padding: '15px', borderRadius: '10px' }}>
            {session.lyrics.map((lyric, index) => (
              <p key={index} style={{ margin: '8px 0', color: '#666' }}>
                <strong>[{lyric.time}s]</strong> {lyric.text}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Start Recording Button */}
      <div className="kdp-card" style={{ gridColumn: '1 / -1' }}>
        <button
          className="kdp-button kdp-button-success"
          onClick={onStartRecording}
          style={{ width: '100%', fontSize: '1.2rem', padding: '20px' }}
        >
          <span>🎙️</span>
          Start Recording Duet
        </button>
      </div>
    </div>
  );
};

// Recording View Component
const RecordingView = ({ session, setStatus, onComplete }) => {
  return (
    <RecordingStudio
      session={session}
      setStatus={setStatus}
      onComplete={onComplete}
    />
  );
};

export default KaraokeDuetPro;
