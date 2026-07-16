/**
 * Lyrics Service for Karaoke Duet
 * Integrates with free lyrics APIs and local caching
 */

import karaokeDB from '../db/karaokeDB';

/**
 * Free Lyrics API Sources
 * 1. Lyrics.ovh - Free, no API key required
 * 2. ChartLyrics - Free SOAP API
 * 3. Local cache for offline access
 */

class LyricsService {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Search and fetch lyrics from multiple sources
   */
  async fetchLyrics(songTitle, artist) {
    const normalizedTitle = this.normalizeString(songTitle);
    const normalizedArtist = this.normalizeString(artist);
    const cacheKey = `${normalizedArtist}:${normalizedTitle}`;

    // Check memory cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Check IndexedDB cache
    const cachedLyrics = await this.getCachedLyrics(songTitle, artist);
    if (cachedLyrics) {
      this.cache.set(cacheKey, cachedLyrics);
      return cachedLyrics;
    }

    // Try fetching from APIs
    let result = null;

    // Try Lyrics.ovh first (most reliable)
    try {
      result = await this.fetchFromLyricsOvh(artist, songTitle);
      if (result && result.lyrics) {
        await this.cacheLyrics(result);
        this.cache.set(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.warn('Lyrics.ovh failed:', error.message);
    }

    // Try ChartLyrics as fallback
    try {
      result = await this.fetchFromChartLyrics(artist, songTitle);
      if (result && result.lyrics) {
        await this.cacheLyrics(result);
        this.cache.set(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.warn('ChartLyrics failed:', error.message);
    }

    // No lyrics found
    return null;
  }

  /**
   * Fetch lyrics from Lyrics.ovh API
   */
  async fetchFromLyricsOvh(artist, title) {
    const encodedArtist = encodeURIComponent(artist);
    const encodedTitle = encodeURIComponent(title);
    const url = `https://api.lyrics.ovh/v1/${encodedArtist}/${encodedTitle}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Lyrics.ovh API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.lyrics) {
      return null;
    }

    return {
      songTitle: title,
      artist: artist,
      lyrics: data.lyrics,
      source: 'lyrics.ovh',
      syncedLyrics: this.parseLyrics(data.lyrics),
      language: 'en',
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * Fetch lyrics from ChartLyrics API (SOAP service converted to REST-like)
   */
  async fetchFromChartLyrics(artist, title) {
    // ChartLyrics search endpoint
    const searchUrl = `http://api.chartlyrics.com/apiv1.asmx/SearchLyricDirect?artist=${encodeURIComponent(
      artist
    )}&song=${encodeURIComponent(title)}`;

    try {
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`ChartLyrics API error: ${response.status}`);
      }

      const text = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');

      const lyricsNode = xmlDoc.getElementsByTagName('Lyric')[0];
      if (!lyricsNode || !lyricsNode.textContent) {
        return null;
      }

      const lyrics = lyricsNode.textContent;

      return {
        songTitle: title,
        artist: artist,
        lyrics: lyrics,
        source: 'chartlyrics',
        syncedLyrics: this.parseLyrics(lyrics),
        language: 'en',
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.warn('ChartLyrics fetch error:', error);
      return null;
    }
  }

  /**
   * Parse plain lyrics into time-synced format
   * Creates simple timing based on line count and estimated duration
   */
  parseLyrics(lyricsText, bpm = 120, estimatedDuration = 240) {
    if (!lyricsText) return [];

    const lines = lyricsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) return [];

    // Estimate time per line
    const timePerLine = estimatedDuration / lines.length;

    return lines.map((text, index) => ({
      time: Math.round(index * timePerLine * 10) / 10,
      text: text,
    }));
  }

  /**
   * Generate time-synced lyrics based on BPM
   * More accurate timing based on tempo
   */
  generateSyncedLyrics(lyricsText, bpm = 120, beatsPerLine = 4) {
    if (!lyricsText) return [];

    const lines = lyricsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const secondsPerBeat = 60 / bpm;
    const secondsPerLine = secondsPerBeat * beatsPerLine;

    return lines.map((text, index) => ({
      time: Math.round(index * secondsPerLine * 10) / 10,
      text: text,
      duration: secondsPerLine,
    }));
  }

  /**
   * Parse LRC format (time-stamped lyrics)
   * Format: [mm:ss.xx]Lyric text
   */
  parseLRCFormat(lrcText) {
    if (!lrcText) return [];

    const lines = lrcText.split('\n');
    const syncedLyrics = [];
    const lrcPattern = /\[(\d{2}):(\d{2})\.(\d{2})\](.*)/;

    lines.forEach(line => {
      const match = line.match(lrcPattern);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const centiseconds = parseInt(match[3], 10);
        const text = match[4].trim();

        const time = minutes * 60 + seconds + centiseconds / 100;

        syncedLyrics.push({
          time: Math.round(time * 10) / 10,
          text: text,
        });
      }
    });

    return syncedLyrics.sort((a, b) => a.time - b.time);
  }

  /**
   * Convert synced lyrics to LRC format
   */
  toLRCFormat(syncedLyrics) {
    return syncedLyrics
      .map(lyric => {
        const minutes = Math.floor(lyric.time / 60);
        const seconds = Math.floor(lyric.time % 60);
        const centiseconds = Math.floor((lyric.time % 1) * 100);

        const mm = String(minutes).padStart(2, '0');
        const ss = String(seconds).padStart(2, '0');
        const cc = String(centiseconds).padStart(2, '0');

        return `[${mm}:${ss}.${cc}]${lyric.text}`;
      })
      .join('\n');
  }

  /**
   * Get cached lyrics from IndexedDB
   */
  async getCachedLyrics(songTitle, artist) {
    try {
      const results = await karaokeDB.searchLyrics(songTitle, artist);
      if (results && results.length > 0) {
        return results[0];
      }
    } catch (error) {
      console.warn('Error getting cached lyrics:', error);
    }
    return null;
  }

  /**
   * Cache lyrics to IndexedDB
   */
  async cacheLyrics(lyricsData) {
    try {
      await karaokeDB.saveLyrics(lyricsData);
    } catch (error) {
      console.warn('Error caching lyrics:', error);
    }
  }

  /**
   * Search for song suggestions
   */
  async searchSongs(query) {
    // For now, return cached songs that match the query
    try {
      const allLyrics = await karaokeDB.getAllLyrics();
      const lowerQuery = query.toLowerCase();

      return allLyrics
        .filter(
          item =>
            item.songTitle.toLowerCase().includes(lowerQuery) ||
            item.artist.toLowerCase().includes(lowerQuery)
        )
        .map(item => ({
          title: item.songTitle,
          artist: item.artist,
          source: item.source,
        }));
    } catch (error) {
      console.warn('Error searching songs:', error);
      return [];
    }
  }

  /**
   * Normalize string for comparison
   */
  normalizeString(str) {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Manual lyrics input with auto-sync
   */
  createManualLyrics(lyricsText, options = {}) {
    const {
      songTitle = 'Untitled',
      artist = 'Unknown',
      bpm = 120,
      beatsPerLine = 4,
      startTime = 0,
    } = options;

    const syncedLyrics = this.generateSyncedLyrics(lyricsText, bpm, beatsPerLine);

    // Apply start time offset
    if (startTime > 0) {
      syncedLyrics.forEach(lyric => {
        lyric.time += startTime;
      });
    }

    return {
      songTitle,
      artist,
      lyrics: lyricsText,
      source: 'manual',
      syncedLyrics,
      language: 'en',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Adjust timing of synced lyrics
   */
  adjustTiming(syncedLyrics, offsetSeconds) {
    return syncedLyrics.map(lyric => ({
      ...lyric,
      time: Math.max(0, lyric.time + offsetSeconds),
    }));
  }

  /**
   * Split lyrics for duet (assign lines to singers)
   */
  splitForDuet(syncedLyrics, pattern = 'alternate') {
    const singerA = [];
    const singerB = [];

    syncedLyrics.forEach((lyric, index) => {
      if (pattern === 'alternate') {
        // Alternate lines between singers
        if (index % 2 === 0) {
          singerA.push(lyric);
        } else {
          singerB.push(lyric);
        }
      } else if (pattern === 'verse-chorus') {
        // Assign verses to A and chorus to B (simplified)
        // This is a basic implementation
        if (index % 4 < 2) {
          singerA.push(lyric);
        } else {
          singerB.push(lyric);
        }
      } else if (pattern === 'call-response') {
        // One line A, two lines B pattern
        const position = index % 3;
        if (position === 0) {
          singerA.push(lyric);
        } else {
          singerB.push(lyric);
        }
      }
    });

    return { singerA, singerB };
  }

  /**
   * Export lyrics in various formats
   */
  exportLyrics(lyricsData, format = 'txt') {
    if (!lyricsData) return '';

    switch (format) {
      case 'lrc':
        return this.toLRCFormat(lyricsData.syncedLyrics || []);

      case 'json':
        return JSON.stringify(lyricsData, null, 2);

      case 'srt':
        return this.toSRTFormat(lyricsData.syncedLyrics || []);

      case 'txt':
      default:
        return lyricsData.lyrics || '';
    }
  }

  /**
   * Convert to SRT subtitle format
   */
  toSRTFormat(syncedLyrics) {
    return syncedLyrics
      .map((lyric, index) => {
        const startTime = this.formatSRTTime(lyric.time);
        const endTime = this.formatSRTTime(
          lyric.time + (lyric.duration || 3)
        );

        return `${index + 1}\n${startTime} --> ${endTime}\n${lyric.text}\n`;
      })
      .join('\n');
  }

  /**
   * Format time for SRT (HH:MM:SS,mmm)
   */
  formatSRTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
      2,
      '0'
    )}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
  }

  /**
   * Validate lyrics data
   */
  validateLyrics(lyricsData) {
    const errors = [];

    if (!lyricsData.songTitle || lyricsData.songTitle.trim() === '') {
      errors.push('Song title is required');
    }

    if (!lyricsData.artist || lyricsData.artist.trim() === '') {
      errors.push('Artist name is required');
    }

    if (!lyricsData.lyrics || lyricsData.lyrics.trim() === '') {
      errors.push('Lyrics text is required');
    }

    if (
      lyricsData.syncedLyrics &&
      !Array.isArray(lyricsData.syncedLyrics)
    ) {
      errors.push('Synced lyrics must be an array');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get lyrics statistics
   */
  getLyricsStats(lyricsData) {
    if (!lyricsData) return null;

    const lines = lyricsData.lyrics.split('\n').filter(l => l.trim().length > 0);
    const words = lyricsData.lyrics.split(/\s+/).filter(w => w.length > 0);
    const characters = lyricsData.lyrics.length;

    const syncedLyrics = lyricsData.syncedLyrics || [];
    const duration =
      syncedLyrics.length > 0
        ? syncedLyrics[syncedLyrics.length - 1].time
        : 0;

    return {
      lineCount: lines.length,
      wordCount: words.length,
      characterCount: characters,
      syncedLineCount: syncedLyrics.length,
      estimatedDuration: duration,
      averageWordsPerLine: lines.length > 0 ? words.length / lines.length : 0,
    };
  }

  /**
   * Clear memory cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Create and export singleton instance
const lyricsService = new LyricsService();

export default lyricsService;
export { LyricsService };
