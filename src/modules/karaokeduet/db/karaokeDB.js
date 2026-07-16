/**
 * KaraokeDuet Local Database Manager
 * Uses IndexedDB for local storage - no server needed
 */

const DB_NAME = 'KaraokeDuetDB';
const DB_VERSION = 1;

// Store names
const STORES = {
  SESSIONS: 'sessions',
  RECORDINGS: 'recordings',
  LYRICS: 'lyrics',
  SETTINGS: 'settings',
  PROJECTS: 'projects',
};

class KaraokeDB {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize the IndexedDB database
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Sessions store - stores duet sessions
        if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
          const sessionStore = db.createObjectStore(STORES.SESSIONS, {
            keyPath: 'id',
            autoIncrement: true,
          });
          sessionStore.createIndex('createdAt', 'createdAt', { unique: false });
          sessionStore.createIndex('status', 'status', { unique: false });
          sessionStore.createIndex('title', 'title', { unique: false });
        }

        // Recordings store - stores audio recordings
        if (!db.objectStoreNames.contains(STORES.RECORDINGS)) {
          const recordingStore = db.createObjectStore(STORES.RECORDINGS, {
            keyPath: 'id',
            autoIncrement: true,
          });
          recordingStore.createIndex('sessionId', 'sessionId', { unique: false });
          recordingStore.createIndex('singer', 'singer', { unique: false });
          recordingStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Lyrics store - cached lyrics from APIs
        if (!db.objectStoreNames.contains(STORES.LYRICS)) {
          const lyricsStore = db.createObjectStore(STORES.LYRICS, {
            keyPath: 'id',
            autoIncrement: true,
          });
          lyricsStore.createIndex('songTitle', 'songTitle', { unique: false });
          lyricsStore.createIndex('artist', 'artist', { unique: false });
          lyricsStore.createIndex('source', 'source', { unique: false });
        }

        // Settings store - user preferences
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }

        // Projects store - mixed/final projects
        if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
          const projectStore = db.createObjectStore(STORES.PROJECTS, {
            keyPath: 'id',
            autoIncrement: true,
          });
          projectStore.createIndex('sessionId', 'sessionId', { unique: false });
          projectStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  /**
   * Generic method to get a transaction
   */
  getTransaction(storeName, mode = 'readonly') {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.transaction([storeName], mode);
  }

  /**
   * Generic method to get an object store
   */
  getStore(storeName, mode = 'readonly') {
    const transaction = this.getTransaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // ============ SESSIONS ============

  /**
   * Create a new duet session
   */
  async createSession(sessionData) {
    const store = this.getStore(STORES.SESSIONS, 'readwrite');
    const session = {
      title: sessionData.title || 'Untitled Duet',
      songTitle: sessionData.songTitle || '',
      artist: sessionData.artist || '',
      bpm: sessionData.bpm || 120,
      key: sessionData.key || 'C',
      status: 'draft', // draft, recording, mixed, completed
      lyrics: sessionData.lyrics || [],
      trackUrl: sessionData.trackUrl || null,
      trackBlob: sessionData.trackBlob || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: sessionData.metadata || {},
    };

    return new Promise((resolve, reject) => {
      const request = store.add(session);
      request.onsuccess = () => resolve({ ...session, id: request.result });
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a session by ID
   */
  async getSession(id) {
    const store = this.getStore(STORES.SESSIONS);
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all sessions
   */
  async getAllSessions(options = {}) {
    const store = this.getStore(STORES.SESSIONS);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        let sessions = request.result || [];
        
        // Sort by createdAt descending by default
        sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Apply filters if provided
        if (options.status) {
          sessions = sessions.filter(s => s.status === options.status);
        }
        
        if (options.limit) {
          sessions = sessions.slice(0, options.limit);
        }

        resolve(sessions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update a session
   */
  async updateSession(id, updates) {
    const store = this.getStore(STORES.SESSIONS, 'readwrite');
    const session = await this.getSession(id);
    
    if (!session) {
      throw new Error(`Session ${id} not found`);
    }

    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(updatedSession);
      request.onsuccess = () => resolve(updatedSession);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a session and its recordings
   */
  async deleteSession(id) {
    // Delete associated recordings first
    const recordings = await this.getRecordingsBySession(id);
    await Promise.all(recordings.map(r => this.deleteRecording(r.id)));

    // Delete associated projects
    const projects = await this.getProjectsBySession(id);
    await Promise.all(projects.map(p => this.deleteProject(p.id)));

    // Delete session
    const store = this.getStore(STORES.SESSIONS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // ============ RECORDINGS ============

  /**
   * Save a recording
   */
  async saveRecording(recordingData) {
    const store = this.getStore(STORES.RECORDINGS, 'readwrite');
    const recording = {
      sessionId: recordingData.sessionId,
      singer: recordingData.singer, // 'A' or 'B'
      audioBlob: recordingData.audioBlob,
      duration: recordingData.duration || 0,
      waveformData: recordingData.waveformData || null,
      format: recordingData.format || 'webm',
      delay: recordingData.delay || 0,
      volume: recordingData.volume || 1.0,
      effects: recordingData.effects || {},
      createdAt: new Date().toISOString(),
      metadata: recordingData.metadata || {},
    };

    return new Promise((resolve, reject) => {
      const request = store.add(recording);
      request.onsuccess = () => resolve({ ...recording, id: request.result });
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get recordings by session ID
   */
  async getRecordingsBySession(sessionId) {
    const store = this.getStore(STORES.RECORDINGS);
    const index = store.index('sessionId');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(sessionId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a specific recording
   */
  async getRecording(id) {
    const store = this.getStore(STORES.RECORDINGS);
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update a recording
   */
  async updateRecording(id, updates) {
    const store = this.getStore(STORES.RECORDINGS, 'readwrite');
    const recording = await this.getRecording(id);
    
    if (!recording) {
      throw new Error(`Recording ${id} not found`);
    }

    const updatedRecording = { ...recording, ...updates };

    return new Promise((resolve, reject) => {
      const request = store.put(updatedRecording);
      request.onsuccess = () => resolve(updatedRecording);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a recording
   */
  async deleteRecording(id) {
    const store = this.getStore(STORES.RECORDINGS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // ============ LYRICS ============

  /**
   * Save lyrics
   */
  async saveLyrics(lyricsData) {
    const store = this.getStore(STORES.LYRICS, 'readwrite');
    const lyrics = {
      songTitle: lyricsData.songTitle || '',
      artist: lyricsData.artist || '',
      lyrics: lyricsData.lyrics || '',
      syncedLyrics: lyricsData.syncedLyrics || [],
      source: lyricsData.source || 'manual',
      language: lyricsData.language || 'en',
      cachedAt: new Date().toISOString(),
      metadata: lyricsData.metadata || {},
    };

    return new Promise((resolve, reject) => {
      const request = store.add(lyrics);
      request.onsuccess = () => resolve({ ...lyrics, id: request.result });
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Search lyrics by song title and artist
   */
  async searchLyrics(songTitle, artist) {
    const store = this.getStore(STORES.LYRICS);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const allLyrics = request.result || [];
        const results = allLyrics.filter(
          l => 
            l.songTitle.toLowerCase().includes(songTitle.toLowerCase()) &&
            (!artist || l.artist.toLowerCase().includes(artist.toLowerCase()))
        );
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete lyrics
   */
  async deleteLyrics(id) {
    const store = this.getStore(STORES.LYRICS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // ============ SETTINGS ============

  /**
   * Get a setting value
   */
  async getSetting(key, defaultValue = null) {
    const store = this.getStore(STORES.SETTINGS);
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : defaultValue);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Set a setting value
   */
  async setSetting(key, value) {
    const store = this.getStore(STORES.SETTINGS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve(value);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all settings
   */
  async getAllSettings() {
    const store = this.getStore(STORES.SETTINGS);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const settings = {};
        (request.result || []).forEach(item => {
          settings[item.key] = item.value;
        });
        resolve(settings);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ============ PROJECTS ============

  /**
   * Save a mixed project
   */
  async saveProject(projectData) {
    const store = this.getStore(STORES.PROJECTS, 'readwrite');
    const project = {
      sessionId: projectData.sessionId,
      title: projectData.title || 'Mixed Duet',
      mixedAudioBlob: projectData.mixedAudioBlob,
      duration: projectData.duration || 0,
      format: projectData.format || 'mp3',
      settings: projectData.settings || {},
      waveformData: projectData.waveformData || null,
      createdAt: new Date().toISOString(),
      metadata: projectData.metadata || {},
    };

    return new Promise((resolve, reject) => {
      const request = store.add(project);
      request.onsuccess = () => resolve({ ...project, id: request.result });
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get projects by session ID
   */
  async getProjectsBySession(sessionId) {
    const store = this.getStore(STORES.PROJECTS);
    const index = store.index('sessionId');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(sessionId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all projects
   */
  async getAllProjects() {
    const store = this.getStore(STORES.PROJECTS);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const projects = request.result || [];
        projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        resolve(projects);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a project
   */
  async deleteProject(id) {
    const store = this.getStore(STORES.PROJECTS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // ============ UTILITY METHODS ============

  /**
   * Get storage usage statistics
   */
  async getStorageStats() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        percentage: ((estimate.usage / estimate.quota) * 100).toFixed(2),
      };
    }
    return null;
  }

  /**
   * Clear all data (use with caution)
   */
  async clearAllData() {
    const storeNames = Object.values(STORES);
    const promises = storeNames.map(storeName => {
      const store = this.getStore(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
    
    await Promise.all(promises);
    return true;
  }

  /**
   * Export all data as JSON
   */
  async exportAllData() {
    const [sessions, recordings, lyrics, settings, projects] = await Promise.all([
      this.getAllSessions(),
      this.getAllRecordings(),
      this.getAllLyrics(),
      this.getAllSettings(),
      this.getAllProjects(),
    ]);

    return {
      version: DB_VERSION,
      exportedAt: new Date().toISOString(),
      sessions,
      recordings: recordings.map(r => ({
        ...r,
        audioBlob: null, // Exclude blobs from export
      })),
      lyrics,
      settings,
      projects: projects.map(p => ({
        ...p,
        mixedAudioBlob: null, // Exclude blobs from export
      })),
    };
  }

  /**
   * Get all recordings (helper method)
   */
  async getAllRecordings() {
    const store = this.getStore(STORES.RECORDINGS);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all lyrics (helper method)
   */
  async getAllLyrics() {
    const store = this.getStore(STORES.LYRICS);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Create and export a singleton instance
const karaokeDB = new KaraokeDB();

export default karaokeDB;
export { STORES, KaraokeDB };
