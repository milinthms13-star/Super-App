/**
 * Karaoke Duet Pro - Main Export File
 * Professional local karaoke studio with offline support
 */

// Main Component
export { default } from './KaraokeDuetPro';
export { default as KaraokeDuetPro } from './KaraokeDuetPro';

// Database
export { default as karaokeDB } from './db/karaokeDB';
export { STORES } from './db/karaokeDB';

// Services
export { default as sessionService } from './services/sessionService';
export { default as lyricsService } from './services/lyricsService';

// Audio Utilities
export { default as audioProcessor } from './audio/audioProcessor';
export { default as AudioRecorder } from './audio/audioRecorder';
export { AudioPlayer, LyricsPlayer } from './audio/audioPlayer';

// UI Components
export { default as WaveformVisualizer } from './components/WaveformVisualizer';
export { default as LyricsDisplay } from './components/LyricsDisplay';
export { default as SessionManager } from './components/SessionManager';
export { default as RecordingStudio } from './components/RecordingStudio';

// Utilities
export { default as exportUtils } from './utils/exportUtils';
