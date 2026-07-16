# 🎤 Karaoke Duet Pro

**Professional Local Karaoke Studio - 100% Offline, 100% Free**

A modern, feature-rich karaoke duet application that runs entirely in your browser with no server required. All data is stored locally on your device, ensuring complete privacy and offline functionality.

## ✨ Key Features

### 🌐 **100% Local & Offline**
- All recordings stored in IndexedDB on your device
- No server uploads - complete privacy
- Works offline after first load
- Progressive Web App (PWA) support

### 🎵 **Free Lyrics Integration**
- Auto-fetch lyrics from free APIs (Lyrics.ovh, ChartLyrics)
- LRC format support with timestamps
- Auto-sync lyrics based on BPM
- Manual lyrics input with auto-timing

### 🎙️ **Professional Recording**
- Dual singer support (Singer A & B)
- Real-time waveform visualization
- Volume level monitoring
- Pause/resume recording
- Multiple takes per singer

### 🎛️ **Advanced Audio Processing**
- Browser-based audio mixing (Web Audio API)
- Individual volume and delay controls
- Stereo panning for singer separation
- Audio normalization
- Effects: Reverb, Echo, EQ, Compression

### 📦 **Export & Share**
- Download mixed duets as MP3/WAV
- Export lyrics in multiple formats (TXT, LRC, SRT, JSON)
- Full backup/restore functionality
- Web Share API integration

### 🎨 **Modern UI/UX**
- Beautiful gradient design
- Smooth animations
- Responsive layout (mobile & desktop)
- Real-time visual feedback

---

## 🚀 Getting Started

### Installation

1. **Import the component:**
```javascript
import KaraokeDuetPro from './modules/karaokeduet/KaraokeDuetPro';
```

2. **Add to your app:**
```jsx
function App() {
  return (
    <div>
      <KaraokeDuetPro />
    </div>
  );
}
```

3. **Ensure IndexedDB is available** (all modern browsers support it)

### First Use

1. **Create a New Session**
   - Click "Create New Duet Session"
   - Enter session title, song name, and artist
   - Set the tempo (BPM)

2. **Fetch Lyrics** (Optional)
   - Enter song title and artist
   - Click "Fetch Free Lyrics"
   - Lyrics will be cached locally for offline use

3. **Start Recording**
   - Click "Start Recording Duet"
   - Select Singer A or B
   - Click the red record button
   - Record your part
   - Stop when done

4. **Record Second Singer**
   - Switch to the other singer
   - Record their part

5. **Mix & Download**
   - Click "Mix & Download Final Duet"
   - Wait for processing (happens locally)
   - Your mixed duet downloads automatically!

---

## 📁 Project Structure

```
karaokeduet/
├── audio/                      # Audio processing modules
│   ├── audioProcessor.js       # Web Audio API mixing & effects
│   ├── audioRecorder.js        # Recording with visualization
│   └── audioPlayer.js          # Playback & synced lyrics
├── components/                 # React UI components
│   ├── WaveformVisualizer.js   # Real-time waveform display
│   ├── LyricsDisplay.js        # Synchronized lyrics viewer
│   ├── SessionManager.js       # Session list & management
│   └── RecordingStudio.js      # Main recording interface
├── db/                         # Local storage
│   └── karaokeDB.js            # IndexedDB wrapper
├── services/                   # Business logic
│   ├── lyricsService.js        # Free lyrics API integration
│   └── sessionService.js       # Session & recording management
├── sw/                         # Service Worker
│   └── karaoke-sw.js           # Offline support
├── utils/                      # Utilities
│   └── exportUtils.js          # Export & download functions
├── KaraokeDuetPro.js          # Main component
├── KaraokeDuetPro.css         # Styles
└── README.md                   # This file
```

---

## 🛠️ Technical Details

### Data Storage

**IndexedDB Stores:**
- **sessions** - Duet session metadata
- **recordings** - Audio recordings (as Blobs)
- **lyrics** - Cached lyrics from APIs
- **settings** - User preferences
- **projects** - Final mixed outputs

### Free APIs Used

1. **Lyrics.ovh** (`https://api.lyrics.ovh`)
   - No API key required
   - Rate limit: Reasonable for personal use
   - Coverage: Good for popular songs

2. **ChartLyrics** (`http://api.chartlyrics.com`)
   - Free SOAP API
   - No registration needed
   - Fallback when Lyrics.ovh fails

### Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| IndexedDB | ✅ | ✅ | ✅ | ✅ |
| Web Audio API | ✅ | ✅ | ✅ | ✅ |
| MediaRecorder | ✅ | ✅ | ✅ | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ |

**Minimum Versions:**
- Chrome 49+
- Firefox 42+
- Safari 14+
- Edge 79+

### Audio Formats

**Recording:** WebM, WAV, MP3 (browser-dependent)  
**Export:** MP3, WAV  
**Supported Input:** MP3, WAV, AAC, OGG, WebM

---

## 📖 API Reference

### KaraokeDB

```javascript
import karaokeDB from './db/karaokeDB';

// Initialize
await karaokeDB.init();

// Create session
const session = await karaokeDB.createSession({
  title: 'My Duet',
  songTitle: 'Song Name',
  artist: 'Artist Name',
  bpm: 120,
});

// Save recording
const recording = await karaokeDB.saveRecording({
  sessionId: session.id,
  singer: 'A',
  audioBlob: blob,
  duration: 120,
});

// Get all sessions
const sessions = await karaokeDB.getAllSessions();

// Get storage stats
const stats = await karaokeDB.getStorageStats();
```

### SessionService

```javascript
import sessionService from './services/sessionService';

// Create session
const session = await sessionService.createSession({
  title: 'My Duet',
  bpm: 120,
});

// Fetch lyrics
await sessionService.fetchLyrics('Song Title', 'Artist Name');

// Save recording
await sessionService.saveRecording('A', {
  blob: audioBlob,
  duration: 120,
});

// Mix recordings
const project = await sessionService.mixRecordings({
  format: 'mp3',
  trackVolume: 0.7,
});
```

### LyricsService

```javascript
import lyricsService from './services/lyricsService';

// Fetch from APIs
const lyrics = await lyricsService.fetchLyrics('Song Title', 'Artist Name');

// Generate synced lyrics
const synced = lyricsService.generateSyncedLyrics(
  lyricsText,
  120, // BPM
  4    // beats per line
);

// Export lyrics
lyricsService.exportLyrics(lyrics, 'lrc'); // or 'txt', 'srt', 'json'
```

### AudioProcessor

```javascript
import audioProcessor from './audio/audioProcessor';

// Initialize
audioProcessor.init();

// Mix tracks
const mixedBuffer = await audioProcessor.mixTracks([
  {
    audioBuffer: buffer1,
    delay: 0,
    volume: 1.0,
    pan: -0.3, // left
  },
  {
    audioBuffer: buffer2,
    delay: 0.5,
    volume: 0.8,
    pan: 0.3, // right
  },
]);

// Apply effects
const processed = await audioProcessor.applyEffects(audioBuffer, {
  reverb: 0.3,
  echo: { time: 0.5, feedback: 0.3 },
  eq: { bass: 2, mid: 0, treble: 1 },
});

// Normalize
const normalized = await audioProcessor.normalizeAudio(audioBuffer, -3);

// Convert to MP3
const mp3Blob = await audioProcessor.audioBufferToMp3(audioBuffer);
```

### AudioRecorder

```javascript
import AudioRecorder from './audio/audioRecorder';

// Create recorder
const recorder = new AudioRecorder();
await recorder.init();

// Start recording
recorder.start({
  visualizationCallback: (data) => {
    console.log('Volume:', data.volume);
    console.log('Waveform:', data.waveform);
  },
});

// Stop and get result
const result = await recorder.stop();
console.log('Blob:', result.blob);
console.log('Duration:', result.duration);

// Cleanup
recorder.cleanup();
```

### Export Utils

```javascript
import exportUtils from './utils/exportUtils';

// Download audio
exportUtils.downloadBlob(audioBlob, 'my-duet.mp3');

// Export lyrics
exportUtils.exportLyrics(lyricsData, 'lrc');

// Export project
exportUtils.exportProject(project, 'mp3');

// Full backup
const allData = await karaokeDB.exportAllData();
await exportUtils.exportBackup(allData);

// Import backup
const file = /* File from input */;
const data = await exportUtils.importBackup(file);
```

---

## 🎯 Usage Examples

### Example 1: Basic Session

```javascript
// Create and start a simple session
const session = await sessionService.createSession({
  title: 'Weekend Duet',
  songTitle: 'Perfect',
  artist: 'Ed Sheeran',
  bpm: 95,
});

// Fetch lyrics
await sessionService.fetchLyrics('Perfect', 'Ed Sheeran');

// Record Singer A
const recorderA = new AudioRecorder();
await recorderA.init();
recorderA.start();
// ... user records
const resultA = await recorderA.stop();
await sessionService.saveRecording('A', {
  blob: resultA.blob,
  duration: resultA.duration,
});

// Record Singer B (same process)

// Mix
const project = await sessionService.mixRecordings();

// Download
exportUtils.exportProject(project, 'mp3');
```

### Example 2: Advanced Audio Processing

```javascript
// Load recordings
const recordings = await sessionService.getRecordings();

// Process each recording
const processedBuffers = await Promise.all(
  recordings.map(async (rec) => {
    let buffer = await audioProcessor.decodeAudioBlob(rec.audioBlob);
    
    // Trim silence
    buffer = await audioProcessor.trimSilence(buffer);
    
    // Apply effects
    buffer = await audioProcessor.applyEffects(buffer, {
      reverb: 0.2,
      echo: { time: 0.3, feedback: 0.2 },
      eq: { bass: 3, mid: 1, treble: 2 },
      compressor: { threshold: -20, ratio: 4 },
    });
    
    return {
      audioBuffer: buffer,
      delay: rec.delay || 0,
      volume: rec.volume || 1.0,
      pan: rec.singer === 'A' ? -0.4 : 0.4,
    };
  })
);

// Mix with background track
const backgroundTrack = await audioProcessor.decodeAudioBlob(session.trackBlob);
processedBuffers.unshift({
  audioBuffer: backgroundTrack,
  delay: 0,
  volume: 0.6,
  pan: 0,
});

const mixed = await audioProcessor.mixTracks(processedBuffers);
const normalized = await audioProcessor.normalizeAudio(mixed);
const mp3 = await audioProcessor.audioBufferToMp3(normalized);

exportUtils.downloadBlob(mp3, 'professional-mix.mp3');
```

### Example 3: Custom Lyrics Sync

```javascript
const plainLyrics = `
Verse one line one
Verse one line two
Chorus starts here
Chorus line two
`;

// Create synced lyrics
const syncedLyrics = lyricsService.generateSyncedLyrics(
  plainLyrics,
  120,  // BPM
  8,    // beats per line
  2     // start at 2 seconds
);

// Adjust timing
const adjusted = lyricsService.adjustTiming(syncedLyrics, -0.5); // 0.5s earlier

// Split for duet
const { singerA, singerB } = lyricsService.splitForDuet(
  adjusted,
  'alternate' // 'alternate', 'verse-chorus', or 'call-response'
);

// Save to session
await sessionService.updateSession(session.id, {
  lyrics: adjusted,
});

// Export in multiple formats
exportUtils.exportLyrics({ songTitle: 'My Song', lyrics: plainLyrics, syncedLyrics: adjusted }, 'lrc');
```

---

## 🔧 Configuration

### Default Settings

```javascript
// In karaokeDB.js
const DEFAULT_SETTINGS = {
  audioQuality: 'high',        // 'low', 'medium', 'high'
  exportFormat: 'mp3',         // 'mp3', 'wav'
  autoNormalize: true,
  reverbLevel: 0.2,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

// Get/Set settings
const quality = await karaokeDB.getSetting('audioQuality', 'high');
await karaokeDB.setSetting('audioQuality', 'medium');
```

### Custom Themes

Modify `KaraokeDuetPro.css`:

```css
/* Change primary gradient */
.kdp-button-primary {
  background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
}

/* Change header gradient */
.karaoke-duet-pro {
  background: linear-gradient(135deg, #your-bg-1 0%, #your-bg-2 100%);
}
```

---

## 🐛 Troubleshooting

### Microphone Not Working

**Problem:** Browser won't access microphone  
**Solution:**
1. Check browser permissions (click 🔒 in address bar)
2. Ensure HTTPS (mic requires secure context)
3. Try in different browser
4. Check system microphone settings

### Recording Playback Issues

**Problem:** Can't hear recorded audio  
**Solution:**
1. Check volume levels in browser
2. Verify recording actually saved (check session list)
3. Try different audio format
4. Clear browser cache

### Lyrics Not Found

**Problem:** Can't fetch lyrics for song  
**Solution:**
1. Check spelling of song title and artist
2. Try variations (e.g., "feat." vs "featuring")
3. APIs may not have lyrics for newer/obscure songs
4. Input lyrics manually as fallback

### Storage Full

**Problem:** "Storage quota exceeded" error  
**Solution:**
1. Delete old sessions: `await karaokeDB.deleteSession(id)`
2. Export and backup important data
3. Clear browser data for the site
4. Check storage: `await karaokeDB.getStorageStats()`

### Mix Takes Too Long

**Problem:** Mixing process is slow  
**Solution:**
1. Recordings are too long (>10 minutes)
2. Close other browser tabs
3. Use shorter recordings for testing
4. Processing is CPU-intensive (wait 30-60s)

---

## 🔒 Privacy & Security

### Data Storage
- **Everything stored locally** in IndexedDB
- **No server uploads** - your recordings never leave your device
- **No tracking** or analytics
- **No user accounts** required

### API Usage
- Lyrics APIs are read-only
- No personal information sent
- APIs don't store queries
- Safe for use without authentication

### Permissions
- **Microphone:** Required for recording only
- **Storage:** Automatic (IndexedDB)
- **No other permissions** needed

---

## 🚀 Performance Tips

1. **Storage Management**
   - Delete old sessions regularly
   - Export important projects
   - Monitor storage: `karaokeDB.getStorageStats()`

2. **Recording Quality**
   - Use quiet environment
   - Position mic 6-12 inches away
   - Enable noise suppression
   - Do test recording first

3. **Mixing Speed**
   - Keep recordings under 5 minutes
   - Close unnecessary browser tabs
   - Use modern browser (latest Chrome/Firefox)
   - Wait patiently (30-60s for mixing)

4. **Offline Usage**
   - Visit page once while online
   - Service worker caches app
   - Fetch lyrics before going offline
   - All features work offline after that

---

## 📱 Mobile Support

### iOS
- ✅ Works in Safari 14+
- ✅ Add to Home Screen for app-like experience
- ⚠️ Recording quality may vary
- ⚠️ Some audio formats limited

### Android
- ✅ Full support in Chrome, Firefox, Edge
- ✅ PWA install available
- ✅ Better recording quality than iOS
- ✅ All features supported

---

## 🤝 Contributing

### Found a Bug?
Create an issue with:
- Browser and version
- Steps to reproduce
- Expected vs actual behavior

### Want a Feature?
Suggest with:
- Use case description
- Why it's useful
- Proposed implementation

---

## 📄 License

This module is part of MalabarBazaar project.  
All rights reserved © 2024

---

## 🎉 Credits

**Developed by:** MalabarBazaar Team  
**Free APIs Used:**
- [Lyrics.ovh](https://lyrics.ovh)
- [ChartLyrics](http://www.chartlyrics.com)

**Technologies:**
- React
- Web Audio API
- IndexedDB
- Service Workers
- MediaRecorder API

---

## 📞 Support

For issues or questions:
1. Check this README
2. Review troubleshooting section
3. Check browser console for errors
4. Contact development team

---

**Happy Singing! 🎤🎵**
