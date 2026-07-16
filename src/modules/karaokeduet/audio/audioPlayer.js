/**
 * Audio Player for Karaoke Duet
 * Handles playback with synchronized lyrics and visualization
 */

class AudioPlayer {
  constructor() {
    this.audio = null;
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.currentTime = 0;
    this.duration = 0;
    this.volume = 1.0;
    this.playbackRate = 1.0;
    this.visualizationCallback = null;
    this.timeUpdateCallback = null;
    this.animationFrameId = null;
    this.updateInterval = null;
  }

  /**
   * Load audio from blob or URL
   */
  async load(source) {
    this.cleanup();
    
    this.audio = new Audio();
    
    if (source instanceof Blob) {
      this.audio.src = URL.createObjectURL(source);
    } else if (typeof source === 'string') {
      this.audio.src = source;
    } else {
      throw new Error('Invalid audio source. Provide Blob or URL string.');
    }

    return new Promise((resolve, reject) => {
      this.audio.onloadedmetadata = () => {
        this.duration = this.audio.duration;
        this.setupAudioContext();
        resolve({
          duration: this.duration,
          src: this.audio.src,
        });
      };

      this.audio.onerror = (error) => {
        reject(new Error(`Failed to load audio: ${error.message || 'Unknown error'}`));
      };
    });
  }

  /**
   * Set up Web Audio API context for analysis and effects
   */
  setupAudioContext() {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }

    // Create source from audio element
    if (!this.source) {
      this.source = this.audioContext.createMediaElementSource(this.audio);
    }

    // Create analyser for visualization
    if (!this.analyser) {
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
    }

    // Create gain node for volume control
    if (!this.gainNode) {
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;
    }

    // Connect nodes
    this.source.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
  }

  /**
   * Play audio
   */
  async play() {
    if (!this.audio) {
      throw new Error('No audio loaded. Call load() first.');
    }

    try {
      await this.audio.play();
      this.isPlaying = true;
      this.isPaused = false;
      this.startUpdateLoop();
      
      if (this.visualizationCallback) {
        this.startVisualization();
      }
    } catch (error) {
      throw new Error(`Failed to play audio: ${error.message}`);
    }
  }

  /**
   * Pause audio
   */
  pause() {
    if (this.audio && this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
      this.isPaused = true;
      this.stopUpdateLoop();
      this.stopVisualization();
    }
  }

  /**
   * Stop audio (reset to beginning)
   */
  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.currentTime = 0;
      this.isPlaying = false;
      this.isPaused = false;
      this.stopUpdateLoop();
      this.stopVisualization();
    }
  }

  /**
   * Seek to specific time
   */
  seek(time) {
    if (this.audio) {
      this.audio.currentTime = Math.max(0, Math.min(time, this.duration));
      this.currentTime = this.audio.currentTime;
    }
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  /**
   * Get current volume
   */
  getVolume() {
    return this.volume;
  }

  /**
   * Set playback rate (speed)
   */
  setPlaybackRate(rate) {
    this.playbackRate = Math.max(0.25, Math.min(4, rate));
    if (this.audio) {
      this.audio.playbackRate = this.playbackRate;
    }
  }

  /**
   * Get playback rate
   */
  getPlaybackRate() {
    return this.playbackRate;
  }

  /**
   * Get current time
   */
  getCurrentTime() {
    return this.audio ? this.audio.currentTime : this.currentTime;
  }

  /**
   * Get duration
   */
  getDuration() {
    return this.duration;
  }

  /**
   * Check if audio is playing
   */
  isAudioPlaying() {
    return this.isPlaying;
  }

  /**
   * Check if audio is paused
   */
  isAudioPaused() {
    return this.isPaused;
  }

  /**
   * Set time update callback
   */
  onTimeUpdate(callback) {
    this.timeUpdateCallback = callback;
  }

  /**
   * Set visualization callback
   */
  onVisualization(callback) {
    this.visualizationCallback = callback;
  }

  /**
   * Start update loop for time tracking
   */
  startUpdateLoop() {
    this.updateInterval = setInterval(() => {
      if (this.audio && this.isPlaying) {
        this.currentTime = this.audio.currentTime;
        
        if (this.timeUpdateCallback) {
          this.timeUpdateCallback({
            currentTime: this.currentTime,
            duration: this.duration,
            progress: this.duration > 0 ? this.currentTime / this.duration : 0,
          });
        }

        // Check if ended
        if (this.currentTime >= this.duration && this.duration > 0) {
          this.stop();
        }
      }
    }, 50); // Update every 50ms
  }

  /**
   * Stop update loop
   */
  stopUpdateLoop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Start visualization loop
   */
  startVisualization() {
    if (!this.analyser || !this.visualizationCallback) return;

    const visualize = () => {
      if (!this.isPlaying) {
        return;
      }

      const bufferLength = this.analyser.frequencyBinCount;
      const waveformData = new Uint8Array(bufferLength);
      const frequencyData = new Uint8Array(bufferLength);

      this.analyser.getByteTimeDomainData(waveformData);
      this.analyser.getByteFrequencyData(frequencyData);

      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = (waveformData[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const volume = Math.sqrt(sum / bufferLength);

      this.visualizationCallback({
        waveform: Array.from(waveformData),
        frequency: Array.from(frequencyData),
        volume,
        currentTime: this.getCurrentTime(),
      });

      this.animationFrameId = requestAnimationFrame(visualize);
    };

    visualize();
  }

  /**
   * Stop visualization loop
   */
  stopVisualization() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Get current playback state
   */
  getState() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentTime: this.getCurrentTime(),
      duration: this.duration,
      volume: this.volume,
      playbackRate: this.playbackRate,
      progress: this.duration > 0 ? this.getCurrentTime() / this.duration : 0,
    };
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.stop();
    this.stopVisualization();
    this.stopUpdateLoop();

    if (this.audio) {
      if (this.audio.src && this.audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.audio.src);
      }
      this.audio.src = '';
      this.audio = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.source = null;
    this.analyser = null;
    this.gainNode = null;
    this.visualizationCallback = null;
    this.timeUpdateCallback = null;
  }
}

/**
 * Synchronized Lyrics Player
 * Manages time-synced lyrics display
 */
class LyricsPlayer {
  constructor() {
    this.lyrics = [];
    this.currentIndex = -1;
    this.onLyricChange = null;
  }

  /**
   * Load lyrics with timestamps
   * Format: [{ time: seconds, text: 'lyrics' }, ...]
   */
  loadLyrics(lyrics) {
    this.lyrics = lyrics.sort((a, b) => a.time - b.time);
    this.currentIndex = -1;
  }

  /**
   * Update current lyric based on time
   */
  update(currentTime) {
    if (this.lyrics.length === 0) return null;

    // Find the current lyric
    let newIndex = -1;
    for (let i = this.lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= this.lyrics[i].time) {
        newIndex = i;
        break;
      }
    }

    // Notify if changed
    if (newIndex !== this.currentIndex) {
      this.currentIndex = newIndex;
      const currentLyric = this.getCurrentLyric();
      const nextLyric = this.getNextLyric();

      if (this.onLyricChange) {
        this.onLyricChange({
          current: currentLyric,
          next: nextLyric,
          index: this.currentIndex,
          total: this.lyrics.length,
        });
      }

      return currentLyric;
    }

    return null;
  }

  /**
   * Get current lyric
   */
  getCurrentLyric() {
    if (this.currentIndex >= 0 && this.currentIndex < this.lyrics.length) {
      return this.lyrics[this.currentIndex];
    }
    return null;
  }

  /**
   * Get next lyric
   */
  getNextLyric() {
    const nextIndex = this.currentIndex + 1;
    if (nextIndex < this.lyrics.length) {
      return this.lyrics[nextIndex];
    }
    return null;
  }

  /**
   * Get all lyrics
   */
  getAllLyrics() {
    return this.lyrics;
  }

  /**
   * Set change callback
   */
  onChange(callback) {
    this.onLyricChange = callback;
  }

  /**
   * Reset to beginning
   */
  reset() {
    this.currentIndex = -1;
  }
}

export default AudioPlayer;
export { AudioPlayer, LyricsPlayer };
