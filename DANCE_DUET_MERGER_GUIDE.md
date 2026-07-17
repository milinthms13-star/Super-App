# 🕺💃 Dance Duet Merger - Complete Guide

## 🎯 Overview

A **100% client-side** video merger that combines two dancers from different locations into one epic video with custom backgrounds. No backend, no database, no signup - completely FREE!

---

## ✨ Features

### Core Functionality
- ✅ **Webcam Recording** - Record both dancers live
- ✅ **File Upload** - Upload pre-recorded videos
- ✅ **Video Merging** - Combine using Canvas API
- ✅ **Audio Mixing** - Blend audio from both dancers
- ✅ **Custom Backgrounds** - Solid colors, gradients, images, or videos
- ✅ **Multiple Layouts** - Side-by-side, overlay, picture-in-picture
- ✅ **Live Preview** - See the result before merging
- ✅ **Download** - Export as WebM video
- ✅ **Project History** - Save metadata in IndexedDB
- ✅ **Storage Management** - Auto-cleanup old projects

### Technologies Used (All FREE!)
- **MediaRecorder API** - Recording webcam
- **Canvas API** - Video merging and effects
- **AudioContext API** - Audio mixing
- **IndexedDB** - Project history storage
- **localStorage** - Settings and metadata
- **Web Speech API** - (optional for future enhancements)

---

## 📁 Files Created

### 1. **DanceDuetMerger.js** (Main Component)
**Location:** `src/modules/danceduet/DanceDuetMerger.js`

**Features:**
- Webcam recording with MediaRecorder
- File upload support (up to 100MB per video)
- Background customization (4 types)
- Layout selection (3 modes)
- Live preview with canvas
- Merged video download
- Project history display
- Storage management

**Key Functions:**
```javascript
- startWebcam1/2() - Start camera for each dancer
- startRecording1/2() - Begin recording
- stopRecording1/2() - End recording
- handleUpload1/2() - File upload handler
- handleMergeVideos() - Main merge function
- handleBackgroundImageUpload() - Custom background image
- applyLayout() - Set layout preset
```

### 2. **videoMerger.js** (Core Merging Logic)
**Location:** `src/modules/danceduet/videoMerger.js`

**Features:**
- Canvas-based video merging
- Audio mixing from both sources
- Background rendering (solid/gradient/image/video)
- Layout calculation algorithms
- Aspect ratio preservation
- Progress tracking
- Browser compatibility checking

**Key Functions:**
```javascript
- mergeVideos() - Main merge function
- calculateLayout() - Position dancers
- drawBackground() - Render backgrounds
- drawVideo() - Draw video frame
- generatePreviewFrame() - Live preview
- checkBrowserCompatibility() - Feature detection
```

### 3. **storageManager.js** (Storage Management)
**Location:** `src/modules/danceduet/storageManager.js`

**Features:**
- IndexedDB initialization
- Project CRUD operations
- Auto-cleanup (keeps last 20 projects)
- Storage usage tracking
- Settings persistence
- Export project data

**Key Functions:**
```javascript
- initDB() - Initialize IndexedDB
- saveProject() - Save to IndexedDB
- getAllProjects() - Load all projects
- deleteProject() - Remove project
- cleanupOldProjects() - Auto-cleanup
- getStorageUsage() - Check storage limits
- clearAllStorage() - Delete everything
```

### 4. **DanceDuetMerger.css** (Modern UI Styling)
**Location:** `src/modules/danceduet/DanceDuetMerger.css`

**Features:**
- Gradient background design
- Modern card-based layout
- Smooth animations and transitions
- Responsive design (mobile-friendly)
- Beautiful buttons with hover effects
- Professional color scheme
- Loading indicators

### 5. **AutoDanceDuet.js** (Entry Point)
**Location:** `src/modules/danceduet/AutoDanceDuet.js`
- Updated to use new DanceDuetMerger

---

## 🚀 How to Use

### Step 1: Access the Module
Navigate to: `http://localhost:3000/danceduet`

### Step 2: Record or Upload Videos

**Option A: Record with Webcam**
1. Click "📷 Start Webcam" for Dancer 1
2. Click "⏺️ Start Recording"
3. Dance!
4. Click "⏹️ Stop Recording"
5. Repeat for Dancer 2

**Option B: Upload Existing Videos**
1. Click "📁 Upload Video" for Dancer 1
2. Select video file (max 100MB)
3. Repeat for Dancer 2

### Step 3: Customize Background

**Solid Color:**
- Select "Solid Color"
- Choose color with color picker

**Gradient:**
- Select "Gradient"
- Pick start and end colors

**Image:**
- Select "Image"
- Upload background image

**Video:**
- Select "Video"
- Upload background video

### Step 4: Choose Layout

**Side-by-Side:**
- Both dancers shown equally
- Split screen 50/50

**Overlay:**
- One dancer full screen
- Second dancer smaller, overlaid

**Picture-in-Picture:**
- One dancer full screen
- Second dancer in corner (30% size)

### Step 5: Preview (Optional)
- Click "👁️ Show Preview"
- See live preview of merged result
- Adjust settings if needed

### Step 6: Merge Videos
- Click "🎬 Merge Videos"
- Wait for progress (shows percentage)
- Merging time depends on video length

### Step 7: Download
- Video displays when ready
- Click "⬇️ Download Video"
- Save as WebM file
- Share with "📤 Share" button

---

## 🎨 Customization Options

### Background Types

| Type | Description | Use Case |
|------|-------------|----------|
| **Solid** | Single color | Clean, professional look |
| **Gradient** | Two-color blend | Modern, stylish background |
| **Image** | Static photo | Themed backdrops (stage, venue) |
| **Video** | Moving background | Dynamic, engaging scenes |

### Layout Modes

| Mode | Description | Best For |
|------|-------------|----------|
| **Side-by-Side** | Equal split screen | Dance battles, duets |
| **Overlay** | Layered dancers | Creative effects, mashups |
| **Picture-in-Picture** | Main + corner | Reaction videos, tutorials |

---

## 💾 Storage Management

### IndexedDB (Large Files)
- Stores video metadata
- Auto-cleans after 20 projects
- Up to browser quota (usually 50-100MB)

### localStorage (Settings)
- User preferences
- Last used settings
- Small metadata

### Storage Limits
- **Chrome/Edge:** ~50-80MB
- **Firefox:** ~50MB
- **Safari:** ~50MB

### Best Practices
1. Delete old projects regularly
2. Use "Clear All Storage" to free space
3. Keep videos under 50MB each
4. Monitor storage usage in UI

---

## 🔧 Technical Details

### Video Processing Flow

```
1. User Input (Webcam/Upload)
   ↓
2. MediaRecorder captures video
   ↓
3. Blob created and stored
   ↓
4. Canvas draws background
   ↓
5. Canvas draws Dancer 1
   ↓
6. Canvas draws Dancer 2
   ↓
7. MediaRecorder captures canvas stream
   ↓
8. Audio from both videos mixed
   ↓
9. Final WebM blob created
   ↓
10. Download link generated
```

### Audio Mixing

```javascript
// Create audio context
const audioContext = new AudioContext();
const destination = audioContext.createMediaStreamDestination();

// Mix audio from video 1 (full volume)
const source1 = audioContext.createMediaStreamSource(audioStream1);
source1.connect(destination);

// Mix audio from video 2 (50% volume)
const source2 = audioContext.createMediaStreamSource(audioStream2);
const gainNode = audioContext.createGain();
gainNode.gain.value = 0.5;
source2.connect(gainNode);
gainNode.connect(destination);
```

### Canvas Rendering

```javascript
// Draw background
ctx.fillStyle = backgroundColor;
ctx.fillRect(0, 0, width, height);

// Draw dancer 1 (left half)
ctx.drawImage(video1, 0, 0, width/2, height);

// Draw dancer 2 (right half)
ctx.drawImage(video2, width/2, 0, width/2, height);
```

---

## 📊 Performance Optimization

### Recommended Settings

**Desktop:**
- Resolution: 1920x1080 (Full HD)
- FPS: 30
- Bitrate: 5 Mbps

**Mobile:**
- Resolution: 1280x720 (HD)
- FPS: 24
- Bitrate: 2 Mbps

### Processing Time Estimates

| Video Length | Resolution | Approx Time |
|--------------|------------|-------------|
| 30 sec | 720p | 30-40 sec |
| 60 sec | 720p | 60-80 sec |
| 30 sec | 1080p | 40-50 sec |
| 60 sec | 1080p | 80-120 sec |

---

## 🐛 Troubleshooting

### Webcam Not Working
**Problem:** Camera permission denied  
**Solution:**
1. Check browser permissions
2. Allow camera access
3. Refresh page
4. Try different browser (Chrome recommended)

### Video Upload Fails
**Problem:** File too large  
**Solution:**
1. Check file size (max 100MB)
2. Compress video first
3. Use shorter clips
4. Try different format

### Merging Fails
**Problem:** Browser runs out of memory  
**Solution:**
1. Close other tabs
2. Use shorter videos
3. Reduce resolution
4. Try on desktop instead of mobile

### Audio Not Mixed
**Problem:** Only one audio track heard  
**Solution:**
1. Check both videos have audio
2. Ensure browser supports AudioContext
3. Try Chrome/Edge (best support)

### Storage Full
**Problem:** Can't save project  
**Solution:**
1. Delete old projects
2. Use "Clear All Storage"
3. Clear browser cache
4. Use IndexedDB only for metadata

---

## 🌐 Browser Compatibility

### Fully Supported ✅
- **Chrome** 85+ (Best performance)
- **Edge** 85+
- **Firefox** 80+
- **Safari** 14+ (macOS)

### Partial Support ⚠️
- **Safari** iOS 14+ (limited MediaRecorder)
- **Opera** 70+

### Not Supported ❌
- **Internet Explorer** (any version)
- **Old Android** browsers (<v80)

### Feature Detection

```javascript
const features = {
  getUserMedia: !!navigator.mediaDevices?.getUserMedia,
  mediaRecorder: !!window.MediaRecorder,
  canvas: !!document.createElement('canvas').getContext('2d'),
  webm: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus'),
  audioContext: !!(window.AudioContext || window.webkitAudioContext),
};
```

---

## 🔒 Privacy & Security

### Data Privacy
- ✅ **100% Client-Side** - Videos never leave your device
- ✅ **No Server Upload** - No backend API calls
- ✅ **No Database** - No cloud storage
- ✅ **No Analytics** - No tracking
- ✅ **No Signup** - Anonymous usage

### Storage Security
- Videos stored in browser IndexedDB
- Only accessible from same domain
- Cleared when browser cache cleared
- No cross-site access

---

## 🚧 Known Limitations

1. **File Size:** Max 100MB per video due to browser memory limits
2. **Duration:** Recommended max 2 minutes per video
3. **Format:** Output is WebM (not MP4) - most browsers support it
4. **Mobile:** Performance may be slower on low-end devices
5. **Background Removal:** Not implemented (requires ML library)
6. **Real-time Sync:** No live streaming between two users

---

## 🔮 Future Enhancements

### Planned Features
- [ ] MP4 export using ffmpeg.wasm
- [ ] Green screen removal (ML.js)
- [ ] Real-time filters and effects
- [ ] Music library integration
- [ ] Cloud sync (optional)
- [ ] Multi-dancer support (3-4 dancers)
- [ ] Template presets (dance challenge templates)
- [ ] Social media direct sharing
- [ ] Video trimming tools
- [ ] Speed controls (slow-mo, fast-forward)

### Would Require Paid Services
- ❌ Cloud rendering (for faster processing)
- ❌ Cloud storage (for large file hosting)
- ❌ AI background removal (better quality)
- ❌ Professional effects (Adobe-style)

---

## 📞 Support

### Common Questions

**Q: Why WebM and not MP4?**  
A: WebM is natively supported by MediaRecorder API. MP4 encoding requires external libraries (adds complexity).

**Q: Can I use this offline?**  
A: Yes! After first load, it works offline (service worker would be needed for full PWA).

**Q: Is there a video length limit?**  
A: No hard limit, but longer videos consume more memory. Recommended: under 2 minutes.

**Q: Can I merge more than 2 dancers?**  
A: Current version supports 2. Multi-dancer feature planned for future.

**Q: Does it work on iPhone?**  
A: Yes, iOS 14+ Safari supports it, but with some limitations.

---

## 🎉 Success Stories

Perfect for:
- 💃 Dance challenges
- 🎵 Music video duets
- 🎭 Performance recordings
- 📚 Dance tutorials
- 🎪 Event highlights
- 👯 Friend collaborations
- 🏆 Competition entries

---

## 📝 Changelog

### v1.0.0 (Current)
- ✅ Initial release
- ✅ Webcam recording
- ✅ File upload
- ✅ Video merging with Canvas
- ✅ Audio mixing
- ✅ Custom backgrounds (4 types)
- ✅ Layout modes (3 modes)
- ✅ Live preview
- ✅ IndexedDB storage
- ✅ Project history
- ✅ Modern UI with gradients
- ✅ Responsive design
- ✅ Download functionality

---

## 🌟 Quick Start Summary

```bash
# 1. Navigate to dance duet
http://localhost:3000/danceduet

# 2. Record or upload 2 videos

# 3. Choose background & layout

# 4. Click "Merge Videos"

# 5. Download your duet! 🎉
```

---

**Built with ❤️ using 100% FREE browser APIs**  
**No backend • No database • No limits • No cost**

🚀 **Ready to create amazing dance duets!**
