# Cartoon Video Generator - Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will help you create your first cartoon video from a story in just a few steps.

---

## Prerequisites

### Required
✅ Node.js installed  
✅ FFmpeg installed ([Download here](https://ffmpeg.org/download.html))  
✅ Internet connection (for AI image generation)

### Optional
⭐ HuggingFace API key (for better images)  
⭐ Google Cloud TTS credentials (for premium voices)

---

## Step 1: Install FFmpeg

### Windows
1. Download FFmpeg from https://ffmpeg.org/download.html
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to system PATH
4. Verify: Open cmd and run `ffmpeg -version`

### Mac
```bash
brew install ffmpeg
```

### Linux
```bash
sudo apt-get install ffmpeg
```

---

## Step 2: Create Required Directories

```bash
mkdir -p backend/uploads/cartoon-videos
```

---

## Step 3: Start the Server

```bash
# From project root
npm start

# Or if you have a custom backend start script
cd backend
node server.js
```

Server should start on `http://localhost:5000` (or your configured port)

---

## Step 4: Generate Your First Video

### Option A: Using the UI (Recommended)

1. **Open the app** in your browser: `http://localhost:3000`

2. **Navigate to** "Kids Story Video Maker" module

3. **Click** "Cartoon Video Generator" tab

4. **Enter your story** (or use this sample):
```
Once upon a time, there was a brave little mouse named Max.

Max: "I want to explore the big forest today!"

In the tall oak tree, Max met a wise old owl named Oliver.

Oliver: "Be careful, young one. The forest has many wonders."

Max ventured into the forest and discovered a beautiful meadow.

Max: "This is amazing! I've never seen anything so beautiful!"

He met a friendly butterfly named Bella dancing among the flowers.

Bella: "Welcome to my garden! Would you like to explore with me?"

Together they had an amazing adventure.

Max: "Today was the best day ever! Thank you, friends!"
```

5. **Configure settings:**
   - Title: "Max's Forest Adventure"
   - Language: English
   - Style: Cartoon
   - Video Size: YouTube (16:9)
   - Safe Mode: ON ✓

6. **Click** "Generate Cartoon Video"

7. **Wait** 2-5 minutes (watch the progress bar)

8. **Preview** your video in the player

9. **Download** the MP4 file

---

### Option B: Using the API

```bash
# Test the system
curl -X POST http://localhost:5000/api/cartoon-video/test

# Generate from your story
curl -X POST http://localhost:5000/api/cartoon-video/generate \
  -H "Content-Type: application/json" \
  -d '{
    "storyText": "Once upon a time...",
    "storyTitle": "My Story",
    "style": "cartoon",
    "language": "en"
  }'

# Response will include jobId
# {
#   "success": true,
#   "jobId": "job-1234567890-abc123",
#   "message": "Video generation started"
# }

# Check status
curl http://localhost:5000/api/cartoon-video/status/job-1234567890-abc123

# Download when ready
curl http://localhost:5000/api/cartoon-video/download/job-1234567890-abc123 \
  --output my-video.mp4
```

---

## Step 5: Run Tests (Optional)

Verify everything is working:

```bash
node backend/test/testCartoonVideoGenerator.js
```

You should see:
```
✓ PASS - storyParser
✓ PASS - characterService
✓ PASS - imageGeneration
✓ PASS - voiceService
✓ PASS - sampleStories
✓ PASS - endToEnd

All 6 tests passed! 🎉
```

---

## Example Stories to Try

### 1. Simple Bedtime Story
```
Luna the moon was shining bright in the night sky.

Luna: "I love watching over sleeping children."

A tiny star named Sparkle felt scared of the darkness.

Sparkle: "Luna, the night is so dark!"

Luna smiled warmly.

Luna: "Don't worry, little one. Together we light up the night!"

Sparkle blinked bravely.

Sparkle: "You're right! We make the night beautiful!"

And they shone together, making the sky magical.
```

### 2. Educational Science
```
Mia was a water droplet in the ocean.

Mia: "I wonder what's beyond these waves?"

The warm sun shone down.

Sun: "Come with me! I'll show you the water cycle!"

Mia turned into vapor and rose into the sky.

Mia: "Wow! I'm evaporating!"

In the clouds, she met other droplets.

Cloud: "Welcome to condensation!"

When the cloud grew heavy, Mia fell as rain.

Mia: "This is precipitation! I'm going back home!"

She flowed back to the ocean.

Mia: "What an amazing journey!"
```

### 3. Moral Story
```
Ruby the rabbit was very fast.

Ruby: "I can run circles around everyone!"

Tom the tortoise moved slowly but steadily.

Tom: "Speed isn't everything. Persistence matters too."

They decided to race to the big oak tree.

Ruby: "This will be easy!"

Ruby ran fast but stopped to rest. Tom kept walking.

Tom: "Slow and steady wins the race."

Ruby woke up and saw Tom at the finish line!

Ruby: "I should have kept going!"

Tom smiled kindly.

Tom: "We all have strengths. Let's work together!"

Ruby learned that teamwork is better than competing.
```

---

## Troubleshooting

### ❌ "FFmpeg not found"
**Solution:** Install FFmpeg and add to PATH (see Step 1)

### ❌ "Story too short"
**Solution:** Stories must be at least 50 characters. Add more description.

### ❌ "Image generation failed"
**Solution:** 
- Check internet connection
- Pollinations API may be busy (will auto-retry)
- System uses SVG fallback automatically

### ❌ "No characters detected"
**Solution:** 
- Use character names in dialogue: `"Name: text"`
- Introduce characters: `"There was a girl named Luna"`

### ❌ Video has no audio
**Solution:**
- Check TTS engine availability: `GET /api/cartoon-video/capabilities`
- Verify FFmpeg audio codecs: `ffmpeg -codecs | grep aac`

---

## What Happens During Generation?

```
🔍 Analyzing story...
   ↓ Extracting characters
   ↓ Finding dialogue
   ↓ Creating scenes

🎨 Designing characters...
   ↓ Assigning appearances
   ↓ Choosing colors
   ↓ Mapping voices

🖼️ Generating images...
   ↓ Scene 1... ✓
   ↓ Scene 2... ✓
   ↓ Scene 3... ✓
   ↓ Scene 4... ✓
   ↓ Scene 5... ✓
   ↓ Scene 6... ✓

🎤 Creating audio...
   ↓ Character voices
   ↓ Narration
   ↓ Synchronization

🎬 Composing video...
   ↓ Combining scenes
   ↓ Adding audio
   ↓ Embedding subtitles
   ↓ Final encoding

✅ Video ready!
```

---

## Tips for Best Results

### ✅ DO
- Write 300-1000 words
- Use clear character names
- Include dialogue with quotes
- Add scene descriptions
- Keep it simple and engaging

### ❌ DON'T
- Write extremely long stories (>2000 words)
- Use too many characters (max 3-4)
- Forget to introduce characters
- Use complex sentence structures
- Skip dialogue formatting

---

## Story Writing Template

```
[OPENING - Introduce main character and setting]
Once upon a time in [place], there lived [character description] named [Name].

Name: "[Character's first dialogue]"

[CONFLICT - Present a challenge]
One day, [what happens]. [Name] met [another character] named [Name2].

Name2: "[Second character dialogue]"

[JOURNEY - Action and adventure]
They decided to [action]. Along the way, [what they discover].

Name: "[Reaction dialogue]"

[DISCOVERY - Key moment]
[Important event or realization].

Name2: "[Important dialogue]"

[RESOLUTION - Problem solved]
[How they solve the challenge].

[ENDING - Lesson learned]
Name: "[Final dialogue with lesson]"

And they lived happily, having learned [moral/lesson].
```

---

## Next Steps

1. ✅ Generate your first video
2. 📚 Read full documentation: `CARTOON_VIDEO_USAGE_GUIDE.md`
3. 🔧 Explore API: `CARTOON_VIDEO_GENERATOR_GUIDE.md`
4. 🧪 Run tests: `node backend/test/testCartoonVideoGenerator.js`
5. 🎨 Try different styles (cartoon, storybook, anime, 3D)
6. 🌍 Test multiple languages

---

## Quick Reference

### Supported Languages
English, Hindi, Malayalam, Tamil, Telugu, Kannada, Bengali, Marathi, Gujarati, Urdu, Arabic

### Animation Styles
Cartoon, Storybook, Anime, Puppet, 3D

### Video Sizes
- YouTube (16:9) - 1280x720
- Shorts (9:16) - 720x1280  
- WhatsApp (1:1) - 720x720

### Story Modes
Bedtime, Educational, Moral, Funny, Mythology, Science

---

## Need Help?

- 📖 **User Guide:** `CARTOON_VIDEO_USAGE_GUIDE.md`
- 🔧 **Technical Guide:** `CARTOON_VIDEO_GENERATOR_GUIDE.md`
- 📊 **Implementation:** `CARTOON_VIDEO_IMPLEMENTATION_SUMMARY.md`
- 🧪 **Test Suite:** `backend/test/testCartoonVideoGenerator.js`

---

## System Requirements

### Minimum
- **CPU:** 2 cores
- **RAM:** 2GB available
- **Disk:** 1GB free space
- **Network:** 5 Mbps

### Recommended
- **CPU:** 4+ cores
- **RAM:** 4GB+ available
- **Disk:** 5GB free space
- **Network:** 10+ Mbps

---

**🎉 You're ready! Start creating amazing cartoon videos from your stories!**

**Remember:** The first video might take a bit longer as the system downloads dependencies. Subsequent videos will be faster.

---

**Status:** ✅ Ready to use with FREE APIs (no API keys required)
