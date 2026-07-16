/**
 * Audio Processing Utilities for Karaoke Duet
 * All processing happens locally in the browser using Web Audio API
 */

class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.initialized = false;
  }

  /**
   * Initialize Audio Context
   */
  init() {
    if (!this.initialized) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass();
      this.initialized = true;
    }
    return this.audioContext;
  }

  /**
   * Get or create audio context
   */
  getContext() {
    if (!this.audioContext) {
      this.init();
    }
    return this.audioContext;
  }

  /**
   * Decode audio blob to AudioBuffer
   */
  async decodeAudioBlob(blob) {
    const context = this.getContext();
    const arrayBuffer = await blob.arrayBuffer();
    return await context.decodeAudioData(arrayBuffer);
  }

  /**
   * Mix multiple audio tracks with individual delays and volumes
   * @param {Array} tracks - Array of {audioBuffer, delay, volume, pan}
   * @returns {AudioBuffer} - Mixed audio buffer
   */
  async mixTracks(tracks) {
    if (!tracks || tracks.length === 0) {
      throw new Error('No tracks provided for mixing');
    }

    const context = this.getContext();

    // Calculate total duration considering delays
    let maxDuration = 0;
    tracks.forEach(track => {
      const trackEnd = track.audioBuffer.duration + (track.delay || 0);
      if (trackEnd > maxDuration) {
        maxDuration = trackEnd;
      }
    });

    // Create offline context for mixing
    const offlineContext = new OfflineAudioContext(
      2, // stereo
      Math.ceil(maxDuration * context.sampleRate),
      context.sampleRate
    );

    // Add each track to the mix
    tracks.forEach(track => {
      const source = offlineContext.createBufferSource();
      source.buffer = track.audioBuffer;

      // Create gain node for volume control
      const gainNode = offlineContext.createGain();
      gainNode.gain.value = track.volume || 1.0;

      // Create panner for stereo positioning
      const panNode = offlineContext.createStereoPanner();
      panNode.pan.value = track.pan || 0; // -1 (left) to 1 (right)

      // Connect nodes
      source.connect(gainNode);
      gainNode.connect(panNode);
      panNode.connect(offlineContext.destination);

      // Start with delay
      source.start(track.delay || 0);
    });

    // Render the mixed audio
    return await offlineContext.startRendering();
  }

  /**
   * Apply audio effects to a buffer
   */
  async applyEffects(audioBuffer, effects = {}) {
    const context = this.getContext();
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    let currentNode = source;

    // Apply reverb
    if (effects.reverb && effects.reverb > 0) {
      const reverbNode = await this.createReverb(offlineContext, effects.reverb);
      currentNode.connect(reverbNode);
      currentNode = reverbNode;
    }

    // Apply echo/delay
    if (effects.echo && effects.echo.time > 0) {
      const echoNode = this.createEcho(offlineContext, effects.echo);
      currentNode.connect(echoNode);
      currentNode = echoNode;
    }

    // Apply EQ
    if (effects.eq) {
      const eqNode = this.createEqualizer(offlineContext, effects.eq);
      currentNode.connect(eqNode);
      currentNode = eqNode;
    }

    // Apply compressor
    if (effects.compressor) {
      const compressor = offlineContext.createDynamicsCompressor();
      compressor.threshold.value = effects.compressor.threshold || -24;
      compressor.knee.value = effects.compressor.knee || 30;
      compressor.ratio.value = effects.compressor.ratio || 12;
      compressor.attack.value = effects.compressor.attack || 0.003;
      compressor.release.value = effects.compressor.release || 0.25;
      currentNode.connect(compressor);
      currentNode = compressor;
    }

    // Connect to destination
    currentNode.connect(offlineContext.destination);
    source.start();

    return await offlineContext.startRendering();
  }

  /**
   * Create reverb effect
   */
  async createReverb(context, intensity = 0.5) {
    const convolver = context.createConvolver();
    
    // Create impulse response
    const rate = context.sampleRate;
    const length = rate * 2; // 2 seconds
    const impulse = context.createBuffer(2, length, rate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2) * intensity;
      }
    }
    
    convolver.buffer = impulse;
    return convolver;
  }

  /**
   * Create echo/delay effect
   */
  createEcho(context, options = {}) {
    const delay = context.createDelay(5.0);
    delay.delayTime.value = options.time || 0.5;
    
    const feedback = context.createGain();
    feedback.gain.value = options.feedback || 0.3;
    
    const mix = context.createGain();
    mix.gain.value = options.mix || 0.5;
    
    // Connect nodes for feedback loop
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(mix);
    
    return mix;
  }

  /**
   * Create equalizer
   */
  createEqualizer(context, bands = {}) {
    const filters = [];
    
    // Bass (low frequencies)
    if (bands.bass !== undefined) {
      const bass = context.createBiquadFilter();
      bass.type = 'lowshelf';
      bass.frequency.value = 200;
      bass.gain.value = bands.bass || 0;
      filters.push(bass);
    }
    
    // Mid frequencies
    if (bands.mid !== undefined) {
      const mid = context.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1000;
      mid.Q.value = 1;
      mid.gain.value = bands.mid || 0;
      filters.push(mid);
    }
    
    // Treble (high frequencies)
    if (bands.treble !== undefined) {
      const treble = context.createBiquadFilter();
      treble.type = 'highshelf';
      treble.frequency.value = 3000;
      treble.gain.value = bands.treble || 0;
      filters.push(treble);
    }
    
    // Connect filters in series
    if (filters.length > 0) {
      for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
      }
      return { input: filters[0], output: filters[filters.length - 1] };
    }
    
    return null;
  }

  /**
   * Normalize audio levels
   */
  async normalizeAudio(audioBuffer, targetLevel = -3) {
    const context = this.getContext();
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    // Find peak level
    let peak = 0;
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        const abs = Math.abs(channelData[i]);
        if (abs > peak) peak = abs;
      }
    }

    // Calculate gain needed to reach target level
    const targetLinear = Math.pow(10, targetLevel / 20);
    const gain = peak > 0 ? targetLinear / peak : 1;

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    const gainNode = offlineContext.createGain();
    gainNode.gain.value = Math.min(gain, 2.0); // Limit maximum gain

    source.connect(gainNode);
    gainNode.connect(offlineContext.destination);
    source.start();

    return await offlineContext.startRendering();
  }

  /**
   * Trim silence from start and end of audio
   */
  async trimSilence(audioBuffer, threshold = 0.01) {
    const channelData = audioBuffer.getChannelData(0);
    
    // Find start
    let start = 0;
    for (let i = 0; i < channelData.length; i++) {
      if (Math.abs(channelData[i]) > threshold) {
        start = i;
        break;
      }
    }
    
    // Find end
    let end = channelData.length;
    for (let i = channelData.length - 1; i >= 0; i--) {
      if (Math.abs(channelData[i]) > threshold) {
        end = i + 1;
        break;
      }
    }
    
    // Create trimmed buffer
    const context = this.getContext();
    const trimmedLength = end - start;
    const trimmedBuffer = context.createBuffer(
      audioBuffer.numberOfChannels,
      trimmedLength,
      audioBuffer.sampleRate
    );
    
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const sourceData = audioBuffer.getChannelData(channel);
      const targetData = trimmedBuffer.getChannelData(channel);
      for (let i = 0; i < trimmedLength; i++) {
        targetData[i] = sourceData[start + i];
      }
    }
    
    return trimmedBuffer;
  }

  /**
   * Change audio pitch without changing tempo
   */
  async changePitch(audioBuffer, pitchShift) {
    // Note: This is a simplified implementation
    // For professional pitch shifting, consider using libraries like Tone.js
    const context = this.getContext();
    const rate = Math.pow(2, pitchShift / 12); // Convert semitones to rate
    
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      Math.ceil(audioBuffer.length / rate),
      audioBuffer.sampleRate
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = rate;
    
    source.connect(offlineContext.destination);
    source.start();
    
    return await offlineContext.startRendering();
  }

  /**
   * Extract waveform data for visualization
   */
  extractWaveformData(audioBuffer, samples = 500) {
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / samples);
    const waveform = [];
    
    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      const end = start + blockSize;
      let sum = 0;
      
      for (let j = start; j < end && j < channelData.length; j++) {
        sum += Math.abs(channelData[j]);
      }
      
      waveform.push(sum / blockSize);
    }
    
    return waveform;
  }

  /**
   * Calculate audio peaks for visualization
   */
  calculatePeaks(audioBuffer, peakCount = 100) {
    const peaks = [];
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / peakCount);
    
    for (let i = 0; i < peakCount; i++) {
      const start = i * blockSize;
      const end = start + blockSize;
      let peak = 0;
      
      for (let j = start; j < end && j < channelData.length; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > peak) peak = abs;
      }
      
      peaks.push(peak);
    }
    
    return peaks;
  }

  /**
   * Detect BPM (tempo) of audio
   */
  async detectBPM(audioBuffer) {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // Simple beat detection algorithm
    const intervals = [];
    let lastBeat = 0;
    const threshold = 0.3;
    
    for (let i = 0; i < channelData.length; i++) {
      if (Math.abs(channelData[i]) > threshold) {
        const currentTime = i / sampleRate;
        if (currentTime - lastBeat > 0.3) { // Minimum 0.3s between beats
          if (lastBeat > 0) {
            intervals.push(currentTime - lastBeat);
          }
          lastBeat = currentTime;
        }
      }
    }
    
    if (intervals.length === 0) return 120; // Default BPM
    
    // Calculate average interval
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = Math.round(60 / avgInterval);
    
    // Clamp to reasonable range
    return Math.max(60, Math.min(200, bpm));
  }

  /**
   * Convert AudioBuffer to WAV Blob
   */
  audioBufferToWav(audioBuffer) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    
    const data = [];
    for (let channel = 0; channel < numberOfChannels; channel++) {
      data.push(audioBuffer.getChannelData(channel));
    }
    
    const dataLength = data[0].length * numberOfChannels * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    
    // Write WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);
    
    // Write audio data
    const volume = 0.8;
    let offset = 44;
    for (let i = 0; i < data[0].length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, data[channel][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Convert AudioBuffer to MP3 Blob (requires lamejs library)
   */
  async audioBufferToMp3(audioBuffer) {
    // Check if lamejs is available
    if (typeof lamejs === 'undefined') {
      console.warn('lamejs not available, falling back to WAV');
      return this.audioBufferToWav(audioBuffer);
    }
    
    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const kbps = 128;
    
    const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
    const mp3Data = [];
    
    const sampleBlockSize = 1152;
    
    for (let i = 0; i < audioBuffer.length; i += sampleBlockSize) {
      const left = audioBuffer.getChannelData(0).subarray(i, i + sampleBlockSize);
      const leftInt = this.floatTo16BitPCM(left);
      
      let mp3buf;
      if (channels === 2) {
        const right = audioBuffer.getChannelData(1).subarray(i, i + sampleBlockSize);
        const rightInt = this.floatTo16BitPCM(right);
        mp3buf = mp3encoder.encodeBuffer(leftInt, rightInt);
      } else {
        mp3buf = mp3encoder.encodeBuffer(leftInt);
      }
      
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }
    
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
    
    return new Blob(mp3Data, { type: 'audio/mp3' });
  }

  /**
   * Helper: Convert float samples to 16-bit PCM
   */
  floatTo16BitPCM(input) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }

  /**
   * Play audio buffer through speakers
   */
  playAudioBuffer(audioBuffer, onEnded) {
    const context = this.getContext();
    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(context.destination);
    
    if (onEnded) {
      source.onended = onEnded;
    }
    
    source.start();
    return source;
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
      this.initialized = false;
    }
  }
}

// Create and export singleton instance
const audioProcessor = new AudioProcessor();

export default audioProcessor;
export { AudioProcessor };
