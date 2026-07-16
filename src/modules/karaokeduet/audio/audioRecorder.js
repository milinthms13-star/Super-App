/**
 * Audio Recorder for Karaoke Duet
 * Handles microphone recording with real-time visualization
 */

class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.stream = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.isPaused = false;
    this.startTime = null;
    this.pausedDuration = 0;
    this.lastPauseTime = null;
    this.analyser = null;
    this.audioContext = null;
    this.visualizationCallback = null;
    this.animationFrameId = null;
  }

  /**
   * Check if browser supports recording
   */
  static isSupported() {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder
    );
  }

  /**
   * Get available audio input devices
   */
  static async getAudioDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('Error getting audio devices:', error);
      return [];
    }
  }

  /**
   * Request microphone permission
   */
  async requestPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  /**
   * Initialize recorder with options
   */
  async init(options = {}) {
    if (!AudioRecorder.isSupported()) {
      throw new Error('Audio recording is not supported in this browser');
    }

    // Get media stream
    const constraints = {
      audio: {
        echoCancellation: options.echoCancellation !== false,
        noiseSuppression: options.noiseSuppression !== false,
        autoGainControl: options.autoGainControl !== false,
        deviceId: options.deviceId || undefined,
        sampleRate: options.sampleRate || 48000,
      },
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      throw new Error(`Failed to access microphone: ${error.message}`);
    }

    // Create media recorder
    const mimeType = this.getSupportedMimeType();
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType,
      audioBitsPerSecond: options.audioBitsPerSecond || 128000,
    });

    // Set up event listeners
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    // Set up audio context for visualization
    if (options.enableVisualization !== false) {
      this.setupVisualization();
    }

    return this;
  }

  /**
   * Get supported MIME type
   */
  getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return '';
  }

  /**
   * Set up audio visualization
   */
  setupVisualization() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContextClass();
    
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    
    source.connect(this.analyser);
  }

  /**
   * Start visualization loop
   */
  startVisualization(callback) {
    if (!this.analyser || !callback) return;
    
    this.visualizationCallback = callback;
    
    const visualize = () => {
      if (!this.isRecording && !this.isPaused) {
        return;
      }
      
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteTimeDomainData(dataArray);
      
      // Calculate volume level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const volume = Math.sqrt(sum / bufferLength);
      
      // Get frequency data
      const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(frequencyData);
      
      this.visualizationCallback({
        waveform: Array.from(dataArray),
        frequency: Array.from(frequencyData),
        volume,
        timestamp: this.getCurrentDuration(),
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
    this.visualizationCallback = null;
  }

  /**
   * Start recording
   */
  start(options = {}) {
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }

    if (!this.mediaRecorder) {
      throw new Error('Recorder not initialized. Call init() first.');
    }

    this.audioChunks = [];
    this.startTime = Date.now();
    this.pausedDuration = 0;
    this.lastPauseTime = null;
    this.isRecording = true;
    this.isPaused = false;

    const timeslice = options.timeslice || 100;
    this.mediaRecorder.start(timeslice);

    if (options.visualizationCallback) {
      this.startVisualization(options.visualizationCallback);
    }
  }

  /**
   * Pause recording
   */
  pause() {
    if (!this.isRecording || this.isPaused) {
      return;
    }

    this.mediaRecorder.pause();
    this.isPaused = true;
    this.lastPauseTime = Date.now();
  }

  /**
   * Resume recording
   */
  resume() {
    if (!this.isRecording || !this.isPaused) {
      return;
    }

    this.mediaRecorder.resume();
    this.isPaused = false;
    
    if (this.lastPauseTime) {
      this.pausedDuration += Date.now() - this.lastPauseTime;
      this.lastPauseTime = null;
    }
  }

  /**
   * Stop recording and return blob
   */
  async stop() {
    if (!this.isRecording) {
      throw new Error('No recording in progress');
    }

    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder.mimeType;
        const blob = new Blob(this.audioChunks, { type: mimeType });
        const duration = this.getCurrentDuration();
        
        this.isRecording = false;
        this.isPaused = false;
        this.stopVisualization();
        
        resolve({
          blob,
          duration,
          mimeType,
          size: blob.size,
        });
      };

      this.mediaRecorder.onerror = (error) => {
        reject(error);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Get current recording duration in seconds
   */
  getCurrentDuration() {
    if (!this.startTime) return 0;
    
    const elapsed = Date.now() - this.startTime;
    const pausedTime = this.isPaused && this.lastPauseTime
      ? Date.now() - this.lastPauseTime
      : 0;
    
    return (elapsed - this.pausedDuration - pausedTime) / 1000;
  }

  /**
   * Get current volume level
   */
  getVolumeLevel() {
    if (!this.analyser) return 0;
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteTimeDomainData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    
    return Math.sqrt(sum / bufferLength);
  }

  /**
   * Clean up and release resources
   */
  cleanup() {
    this.stopVisualization();
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.mediaRecorder = null;
    this.analyser = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.isPaused = false;
  }

  /**
   * Get recording state
   */
  getState() {
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      duration: this.getCurrentDuration(),
      mediaRecorderState: this.mediaRecorder?.state || 'inactive',
    };
  }
}

export default AudioRecorder;
export { AudioRecorder };
