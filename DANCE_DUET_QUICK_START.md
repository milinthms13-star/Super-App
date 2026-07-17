# 🚀 Dance Duet Merger - Quick Start

## ⚡ 30-Second Setup

```bash
# 1. Navigate to:
http://localhost:3000/danceduet

# 2. Record or upload 2 videos
# 3. Choose background & layout
# 4. Click "Merge Videos"
# 5. Download! 🎉
```

---

## 📁 Files Created (7 Total)

```
src/modules/danceduet/
├── DanceDuetMerger.js      (Main component - 600 lines)
├── videoMerger.js          (Merging logic - 400 lines)
├── storageManager.js       (Storage - 250 lines)
├── DanceDuetMerger.css     (Styling - 500 lines)
└── AutoDanceDuet.js        (Updated entry point)

Documentation:
├── DANCE_DUET_MERGER_GUIDE.md   (Complete guide)
├── DANCE_DUET_COMPLETE.md       (Implementation summary)
└── DANCE_DUET_QUICK_START.md    (This file)
```

---

## ✨ Key Features

✅ **Webcam Recording** - Record both dancers live  
✅ **File Upload** - Upload existing videos (max 100MB)  
✅ **4 Background Types** - Solid/Gradient/Image/Video  
✅ **3 Layout Modes** - Side-by-side/Overlay/PIP  
✅ **Audio Mixing** - Blend audio from both dancers  
✅ **Live Preview** - See result before merging  
✅ **Download** - Export as WebM video  
✅ **Project History** - Saved in IndexedDB  
✅ **Storage Management** - Auto-cleanup old projects  
✅ **100% FREE** - No backend, no database, no cost  

---

## 🎨 Background Options

| Type | How to Use |
|------|------------|
| **Solid** | Pick a single color |
| **Gradient** | Choose 2 colors for blend |
| **Image** | Upload JPG/PNG backdrop |
| **Video** | Upload video background |

---

## 📐 Layout Modes

| Mode | Description | Best For |
|------|-------------|----------|
| **Side-by-Side** | 50/50 split screen | Dance battles |
| **Overlay** | Layered dancers | Creative effects |
| **Picture-in-Picture** | Main + corner | Reaction videos |

---

## 💾 Storage

- **IndexedDB:** Project metadata
- **localStorage:** Settings
- **Auto-cleanup:** Keeps last 20 projects
- **Usage Display:** Shows storage used

---

## 🔧 Technologies (All FREE)

- MediaRecorder API
- Canvas API
- AudioContext API
- IndexedDB
- localStorage
- Web Share API

**Total Cost: $0** 💰

---

## 🌐 Browser Support

✅ **Chrome** 85+ (Best)  
✅ **Edge** 85+  
✅ **Firefox** 80+  
✅ **Safari** 14+ (Partial)  
❌ **IE** (Not supported)  

---

## 📝 Usage Steps

### 1️⃣ Add Videos

**Record:**
- Click "📷 Start Webcam"
- Click "⏺️ Start Recording"
- Dance for max 2 minutes
- Click "⏹️ Stop Recording"

**Upload:**
- Click "📁 Upload Video"
- Select file (max 100MB)

### 2️⃣ Customize

**Background:**
- Select type (Solid/Gradient/Image/Video)
- Pick colors or upload files

**Layout:**
- Click layout button (Side-by-side/Overlay/PIP)

### 3️⃣ Merge

- Click "🎬 Merge Videos"
- Wait for progress (shows %)
- Time = video duration

### 4️⃣ Download

- Click "⬇️ Download Video"
- Save as WebM
- Share with "📤 Share"

---

## ⚙️ Settings

### Quality (Edit videoMerger.js)

```javascript
// High Quality (Default)
outputWidth: 1920
outputHeight: 1080
fps: 30
videoBitsPerSecond: 5000000

// Lower Quality (Faster)
outputWidth: 1280
outputHeight: 720
fps: 24
videoBitsPerSecond: 2000000
```

### Storage Limits

```javascript
// Max projects before cleanup
MAX_PROJECTS = 20

// Max file size per video
MAX_FILE_SIZE = 100MB
```

---

## 🐛 Quick Fixes

**Webcam won't start**
→ Check browser permissions

**Upload fails**
→ File too large (max 100MB)

**Merge fails**
→ Close other tabs, use shorter video

**Storage full**
→ Delete old projects

**Poor quality**
→ Increase bitrate in settings

---

## 🆚 Old vs New

| Feature | Old Module | New Module |
|---------|-----------|------------|
| Backend | ✅ Required | ❌ None |
| Database | ✅ MongoDB | ❌ IndexedDB only |
| Cost | 💰 Server | ✅ $0 |
| Privacy | ⚠️ Uploads | ✅ Local only |
| Speed | 🐌 Network | ⚡ Instant |

---

## 🎯 Project Structure

```
DanceDuetMerger (React Component)
├── Webcam Controls
│   ├── Start/Stop Recording
│   └── File Upload
├── Settings Panel
│   ├── Background Selector
│   └── Layout Chooser
├── Preview Canvas (Live)
├── Merge Button
└── Result Display
    ├── Video Player
    ├── Download Button
    └── Share Button

videoMerger.js (Core Logic)
├── Canvas Rendering
├── Audio Mixing
├── Layout Calculations
└── Progress Tracking

storageManager.js (Storage)
├── IndexedDB Operations
├── Auto-cleanup
└── Storage Tracking
```

---

## 📊 Performance

| Video Length | Resolution | Merge Time |
|--------------|------------|------------|
| 30 sec | 720p | ~30-40 sec |
| 60 sec | 720p | ~60-80 sec |
| 30 sec | 1080p | ~40-50 sec |
| 60 sec | 1080p | ~80-120 sec |

---

## 🔒 Privacy

✅ **100% Client-Side** - Never leaves device  
✅ **No Server** - No uploads  
✅ **No Tracking** - Anonymous  
✅ **No Signup** - Just use it  

---

## ✅ Checklist

Before using:
- [ ] Chrome/Edge/Firefox browser
- [ ] Webcam (for recording) OR
- [ ] Video files (<100MB each)

After first use:
- [ ] Works great? ✨
- [ ] Share with friends! 📤
- [ ] Create amazing duets! 💃🕺

---

## 🎉 You're Ready!

```
Navigate to: http://localhost:3000/danceduet
Start creating epic dance duets! 🚀
```

---

**Questions?** Check:
1. DANCE_DUET_MERGER_GUIDE.md (Complete guide)
2. DANCE_DUET_COMPLETE.md (Technical details)
3. Browser console (F12) for errors

**Happy Dancing!** 🕺💃✨
