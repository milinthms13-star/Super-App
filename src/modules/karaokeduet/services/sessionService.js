/**
 * Session Service for Karaoke Duet
 * Manages duet sessions, recordings, and mixing
 */

import karaokeDB from '../db/karaokeDB';
import audioProcessor from '../audio/audioProcessor';
import lyricsService from './lyricsService';

class SessionService {
  constructor() {
    this.currentSession = null;
    this.recordings = new Map();
  }

  /**
   * Create a new duet session
   */
  async createSession(sessionData) {
    try {
      const session = await karaokeDB.createSession({
        title: sessionData.title || 'New Duet Session',
        songTitle: sessionData.songTitle || '',
        artist: sessionData.artist || '',
        bpm: sessionData.bpm || 120,
        key: sessionData.key || 'C',
        lyrics: sessionData.lyrics || [],
        trackUrl: sessionData.trackUrl || null,
        trackBlob: sessionData.trackBlob || null,
        metadata: {
          createdWith: 'KaraokeDuet Local',
          version: '2.0',
          ...sessionData.metadata,
        },
      });

      this.currentSession = session;
      return session;
    } catch (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  /**
   * Load an existing session
   */
  async loadSession(sessionId) {
    try {
      const session = await karaokeDB.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      this.currentSession = session;

      // Load associated recordings
      const recordings = await karaokeDB.getRecordingsBySession(sessionId);
      recordings.forEach(recording => {
        this.recordings.set(recording.singer, recording);
      });

      return session;
    } catch (error) {
      throw new Error(`Failed to load session: ${error.message}`);
    }
  }

  /**
   * Update current session
   */
  async updateSession(updates) {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    try {
      const updated = await karaokeDB.updateSession(
        this.currentSession.id,
        updates
      );
      this.currentSession = updated;
      return updated;
    } catch (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId) {
    try {
      await karaokeDB.deleteSession(sessionId);
      
      if (this.currentSession && this.currentSession.id === sessionId) {
        this.currentSession = null;
        this.recordings.clear();
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }

  /**
   * Get all sessions
   */
  async getAllSessions(options = {}) {
    try {
      return await karaokeDB.getAllSessions(options);
    } catch (error) {
      throw new Error(`Failed to get sessions: ${error.message}`);
    }
  }

  /**
   * Save a recording to current session
   */
  async saveRecording(singer, recordingData) {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    try {
      const recording = await karaokeDB.saveRecording({
        sessionId: this.currentSession.id,
        singer: singer, // 'A' or 'B'
        audioBlob: recordingData.blob,
        duration: recordingData.duration,
        format: recordingData.format || 'webm',
        delay: recordingData.delay || 0,
        volume: recordingData.volume || 1.0,
        effects: recordingData.effects || {},
        waveformData: recordingData.waveformData || null,
        metadata: recordingData.metadata || {},
      });

      this.recordings.set(singer, recording);

      // Update session status
      await this.updateSession({ status: 'recording' });

      return recording;
    } catch (error) {
      throw new Error(`Failed to save recording: ${error.message}`);
    }
  }

  /**
   * Get recordings for current session
   */
  async getRecordings() {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    try {
      const recordings = await karaokeDB.getRecordingsBySession(
        this.currentSession.id
      );
      
      // Update local cache
      this.recordings.clear();
      recordings.forEach(recording => {
        this.recordings.set(recording.singer, recording);
      });

      return recordings;
    } catch (error) {
      throw new Error(`Failed to get recordings: ${error.message}`);
    }
  }

  /**
   * Update a recording
   */
  async updateRecording(recordingId, updates) {
    try {
      const updated = await karaokeDB.updateRecording(recordingId, updates);
      
      // Update local cache
      if (updated.sessionId === this.currentSession?.id) {
        this.recordings.set(updated.singer, updated);
      }

      return updated;
    } catch (error) {
      throw new Error(`Failed to update recording: ${error.message}`);
    }
  }

  /**
   * Delete a recording
   */
  async deleteRecording(recordingId, singer) {
    try {
      await karaokeDB.deleteRecording(recordingId);
      
      if (singer) {
        this.recordings.delete(singer);
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to delete recording: ${error.message}`);
    }
  }

  /**
   * Mix recordings into final project
   */
  async mixRecordings(options = {}) {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const recordings = await this.getRecordings();
    
    if (recordings.length === 0) {
      throw new Error('No recordings to mix');
    }

    try {
      // Update session status
      await this.updateSession({ status: 'mixing' });

      // Prepare tracks for mixing
      const tracks = [];

      // Add background track if available
      if (this.currentSession.trackBlob) {
        const trackBuffer = await audioProcessor.decodeAudioBlob(
          this.currentSession.trackBlob
        );
        tracks.push({
          audioBuffer: trackBuffer,
          delay: 0,
          volume: options.trackVolume || 0.7,
          pan: 0,
        });
      }

      // Add singer recordings
      for (const recording of recordings) {
        const audioBuffer = await audioProcessor.decodeAudioBlob(
          recording.audioBlob
        );
        
        // Apply effects if specified
        let processedBuffer = audioBuffer;
        if (recording.effects && Object.keys(recording.effects).length > 0) {
          processedBuffer = await audioProcessor.applyEffects(
            audioBuffer,
            recording.effects
          );
        }

        tracks.push({
          audioBuffer: processedBuffer,
          delay: recording.delay || 0,
          volume: recording.volume || 1.0,
          pan: recording.singer === 'A' ? -0.3 : 0.3, // Stereo separation
        });
      }

      // Mix all tracks
      const mixedBuffer = await audioProcessor.mixTracks(tracks);

      // Normalize the mix
      const normalizedBuffer = await audioProcessor.normalizeAudio(
        mixedBuffer,
        options.targetLevel || -3
      );

      // Convert to desired format
      const format = options.format || 'mp3';
      let mixedBlob;

      if (format === 'wav') {
        mixedBlob = audioProcessor.audioBufferToWav(normalizedBuffer);
      } else {
        mixedBlob = await audioProcessor.audioBufferToMp3(normalizedBuffer);
      }

      // Extract waveform for visualization
      const waveformData = audioProcessor.extractWaveformData(
        normalizedBuffer,
        500
      );

      // Save project
      const project = await karaokeDB.saveProject({
        sessionId: this.currentSession.id,
        title: this.currentSession.title || 'Mixed Duet',
        mixedAudioBlob: mixedBlob,
        duration: normalizedBuffer.duration,
        format: format,
        waveformData: waveformData,
        settings: {
          trackVolume: options.trackVolume || 0.7,
          targetLevel: options.targetLevel || -3,
          recordings: recordings.map(r => ({
            singer: r.singer,
            delay: r.delay,
            volume: r.volume,
            effects: r.effects,
          })),
        },
        metadata: {
          mixedAt: new Date().toISOString(),
          recordingCount: recordings.length,
          finalDuration: normalizedBuffer.duration,
        },
      });

      // Update session status
      await this.updateSession({ status: 'completed' });

      return project;
    } catch (error) {
      await this.updateSession({ status: 'recording' });
      throw new Error(`Failed to mix recordings: ${error.message}`);
    }
  }

  /**
   * Fetch and attach lyrics to session
   */
  async fetchLyrics(songTitle, artist) {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    try {
      const lyricsData = await lyricsService.fetchLyrics(songTitle, artist);
      
      if (!lyricsData) {
        throw new Error('Lyrics not found');
      }

      await this.updateSession({
        lyrics: lyricsData.syncedLyrics || [],
        songTitle: lyricsData.songTitle,
        artist: lyricsData.artist,
        metadata: {
          ...this.currentSession.metadata,
          lyricsSource: lyricsData.source,
          lyricsFetchedAt: new Date().toISOString(),
        },
      });

      return lyricsData;
    } catch (error) {
      throw new Error(`Failed to fetch lyrics: ${error.message}`);
    }
  }

  /**
   * Set manual lyrics
   */
  async setManualLyrics(lyricsText, options = {}) {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    try {
      const lyricsData = lyricsService.createManualLyrics(lyricsText, {
        songTitle: this.currentSession.songTitle,
        artist: this.currentSession.artist,
        bpm: this.currentSession.bpm,
        ...options,
      });

      await this.updateSession({
        lyrics: lyricsData.syncedLyrics,
        metadata: {
          ...this.currentSession.metadata,
          lyricsSource: 'manual',
          lyricsCreatedAt: new Date().toISOString(),
        },
      });

      return lyricsData;
    } catch (error) {
      throw new Error(`Failed to set lyrics: ${error.message}`);
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats() {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const recordings = await this.getRecordings();
    const projects = await karaokeDB.getProjectsBySession(
      this.currentSession.id
    );

    const totalRecordingDuration = recordings.reduce(
      (sum, r) => sum + (r.duration || 0),
      0
    );

    const totalRecordingSize = recordings.reduce(
      (sum, r) => sum + (r.audioBlob?.size || 0),
      0
    );

    return {
      sessionId: this.currentSession.id,
      title: this.currentSession.title,
      status: this.currentSession.status,
      recordingCount: recordings.length,
      projectCount: projects.length,
      totalRecordingDuration: Math.round(totalRecordingDuration),
      totalRecordingSize: totalRecordingSize,
      hasBackingTrack: !!this.currentSession.trackBlob,
      hasLyrics: Array.isArray(this.currentSession.lyrics) && 
                 this.currentSession.lyrics.length > 0,
      createdAt: this.currentSession.createdAt,
      updatedAt: this.currentSession.updatedAt,
    };
  }

  /**
   * Export session data
   */
  async exportSession(includeAudio = false) {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const recordings = await this.getRecordings();
    const projects = await karaokeDB.getProjectsBySession(
      this.currentSession.id
    );

    const exportData = {
      session: {
        ...this.currentSession,
        trackBlob: includeAudio ? this.currentSession.trackBlob : null,
      },
      recordings: recordings.map(r => ({
        ...r,
        audioBlob: includeAudio ? r.audioBlob : null,
      })),
      projects: projects.map(p => ({
        ...p,
        mixedAudioBlob: includeAudio ? p.mixedAudioBlob : null,
      })),
      exportedAt: new Date().toISOString(),
    };

    return exportData;
  }

  /**
   * Get current session
   */
  getCurrentSession() {
    return this.currentSession;
  }

  /**
   * Clear current session
   */
  clearCurrentSession() {
    this.currentSession = null;
    this.recordings.clear();
  }

  /**
   * Get all projects
   */
  async getAllProjects() {
    try {
      return await karaokeDB.getAllProjects();
    } catch (error) {
      throw new Error(`Failed to get projects: ${error.message}`);
    }
  }

  /**
   * Get projects for specific session
   */
  async getProjectsBySession(sessionId) {
    try {
      return await karaokeDB.getProjectsBySession(sessionId);
    } catch (error) {
      throw new Error(`Failed to get projects: ${error.message}`);
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId) {
    try {
      await karaokeDB.deleteProject(projectId);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  }
}

// Create and export singleton instance
const sessionService = new SessionService();

export default sessionService;
export { SessionService };
