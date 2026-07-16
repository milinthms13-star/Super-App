# Cartoon Video Generator - User Guide

## Overview

The Cartoon Video Generator is an AI-powered feature that automatically creates animated cartoon videos from story text. It analyzes your story, extracts characters, generates dialogue, creates consistent character designs, and produces a complete video with voice, animations, and subtitles.

---

## Features

### 🎭 **Character Extraction & Design**
- Automatically identifies characters from your story
- Creates unique appearances for each character
- Maintains consistent character designs across all scenes
- Assigns appropriate voice profiles based on character roles

### 💬 **Dialogue & Voice**
- Extracts character dialogue from story text
- Supports multiple formats: `"Name: dialogue"` or `"Name said dialogue"`
- Text-to-speech synthesis with emotion detection
- Multiple TTS engine support (Google Cloud TTS, Windows TTS, Python fallback)

### 🎬 **Scene Generation**
- Breaks story into 6 engaging scenes automatically
- Generates scene images using free AI APIs (Pollinations, HuggingFace)
- Creates scene descriptions with proper context
- SVG fallback when image APIs are unavailable

### 🎵 **Audio & Video Composition**
- Background narration for scene context
- Character dialogue audio synchronized with scenes
- Video composition with FFmpeg
- Subtitles for all dialogue

---

## How to Use

### Step 1: Access the Cartoon Video Generator

1. Navigate to **Kids Story Video Maker** module
2. Click on the **"Cartoon Video Generator"** tab
3. You'll see two generation modes:
   - **Auto (Analyze Story)**: AI automatically analyzes and generates everything
   - **Manual (Custom Input)**: Provide your own script with character dialogue

### Step 2: Input Your Story

1. **Video Title**: Enter a descriptive title (e.g., "The Magic Forest Adventure")
2. **Story Text**: Paste or type your story (minimum 40 characters)
   - Write naturally - AI will extract characters and dialogue
   - Format dialogue as: `"Character Name: What they say"` or `"Character Name said something"`
   - Include character descriptions for better visuals

**Example Story Format:**
```
Once upon a time in a magical forest, there lived a brave rabbit named Lily.

Lily: "I want to find the golden acorn!"

One day, she met a wise owl named Oliver sitting on a tree.

Oliver: "The golden acorn is hidden deep in the forest. You'll need courage to find it."

Lily: "I'm not afraid! Will you help me?"

Together, they ventured into the dark forest and discovered the golden acorn glowing under the moonlight.

Lily: "We did it! Thank you, Oliver!"
```

### Step 3: Configure Settings

#### Language
Choose from 11 languages:
- English, Hindi, Malayalam, Tamil, Telugu, Kannada
- Bengali, Marathi, Gujarati, Urdu, Arabic

#### Animation Style
- **Cartoon**: Bright animations, playful characters
- **Storybook**: Illustrated scenes with gentle textures
- **Anime**: Vivid characters, dramatic movement
- **Puppet**: Warm stage-style motion
- **3D**: Modern 3D look with depth

#### Video Size
- **YouTube (16:9)**: Standard widescreen
- **Shorts (9:16)**: Vertical format for mobile
- **WhatsApp (1:1)**: Square format

#### Story Mode
- **Bedtime**: Calm, soothing stories
- **Educational**: Learning-focused content
- **Moral**: Stories with life lessons
- **Funny**: Humorous adventures
- **Mythology**: Traditional tales
- **Science**: Educational science stories

#### Safe Mode
Enable for child-friendly content filtering (recommended)

### Step 4: Generate Video

1. Review your story and settings
2. Click **"Generate Cartoon Video"**
3. Wait for processing (typically 2-5 minutes depending on story length)
4. Progress bar shows:
   - Analyzing story
   - Creating characters
   - Generating scenes
   - Adding voice
   - Composing video

### Step 5: Preview & Download

1. **Preview**: Watch the generated video in the built-in player
2. **Download**: Click "Download Cartoon Video" to save the MP4 file
3. File name format: `{your-title}_cartoon.mp4`

---

## API Endpoints

### Generate Cartoon Video

**Endpoint:** `POST /api/cartoon-video/generate`

**Request Body:**
```json
{
  "story": "Your story text here...",
  "title": "Video Title",
  "language": "en",
  "style": "cartoon",
  "voiceEngine": "auto",
  "videoSize": "youtube",
  "safeMode": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cartoon video generated successfully",
  "videoUrl": "/uploads/cartoon-videos/video-123.mp4",
  "videoPath": "/full/path/to/video.mp4",
  "project": {
    "title": "Video Title",
    "characters": [...],
    "scenes": [...],
    "duration": 30
  }
}
```

### Test Generation

**Endpoint:** `POST /api/cartoon-video/test`

Test the complete pipeline with a sample story.

---

## Technical Details

### Character Detection
The system uses regex patterns to identify character names:
- Quoted dialogue: `"Name: text"`
- Narrative dialogue: `"Name said text"`
- Character introductions: `"a/an X named Y"`

### Character Types
Characters are automatically classified:
- **Hero**: Main protagonist (blue/gold palette)
- **Friend**: Sidekick or companion (green/teal palette)
- **Animal**: Animal characters (brown/earth tones)
- **Wise**: Mentor figures (purple/silver palette)

### Scene Structure
Stories are divided into 6 scenes:
1. **Opening**: Introduction and setting
2. **Challenge**: Problem emerges
3. **Journey**: Adventure begins
4. **Discovery**: Key moment
5. **Resolution**: Problem solved
6. **Ending**: Conclusion

### Image Generation
- **Primary**: Pollinations.ai (free, no API key required)
- **Secondary**: HuggingFace Inference API (FLUX.1-schnell model)
- **Fallback**: SVG-based placeholder images

### Voice Synthesis Priority
1. Google Cloud TTS (if configured)
2. Windows PowerShell TTS (built-in)
3. System TTS fallback

### Video Composition
- FFmpeg combines scenes, audio, and subtitles
- Output format: MP4 (H.264 video, AAC audio)
- Scene duration: 5-7 seconds per scene
- Fade transitions between scenes

---

## Tips for Best Results

### Story Writing
1. **Be descriptive**: Include character descriptions for better visuals
2. **Clear dialogue**: Use consistent dialogue format
3. **Scene variety**: Include different settings and emotions
4. **Length**: 300-1000 words works best (6-8 scenes)

### Character Naming
1. Use simple, clear names
2. Introduce characters before they speak
3. Limit to 2-3 main characters for clarity

### Dialogue
1. Keep dialogue concise (1-2 sentences per line)
2. Add emotion cues: "said happily", "whispered nervously"
3. Use character names consistently

### Settings
1. **Language**: Match your story's language
2. **Style**: Cartoon or Storybook work best for kids
3. **Safe Mode**: Always enable for children's content
4. **Video Size**: YouTube for web, Shorts for mobile sharing

---

## Troubleshooting

### "Story too short" error
- Minimum 40 characters required
- Add more description and dialogue

### "No characters detected" error
- Use clear character introductions
- Format dialogue with character names
- Example: `"Once there lived a girl named Luna"`

### "Video generation failed" error
- Check story length (not too long)
- Verify internet connection for image generation
- Try again - sometimes external APIs timeout

### Low quality images
- Add more descriptive scene text
- Include visual details in narration
- Consider trying different animation styles

### Missing audio
- Ensure FFmpeg is installed
- Check TTS engine availability
- Verify audio file permissions

---

## File Structure

```
backend/
├── routes/
│   └── cartoonVideoGenerator.js      # API routes
├── services/
│   ├── storyParserService.js         # Story analysis
│   ├── cartoonCharacterService.js    # Character design
│   ├── cartoonSceneGenerator.js      # Image generation
│   ├── cartoonVoiceService.js        # TTS integration
│   └── cartoonVideoComposer.js       # Video composition
├── utils/
│   └── helpers.js                     # Utility functions
└── uploads/
    └── cartoon-videos/                # Generated videos

frontend/
└── src/modules/kidsstoryvideomaker/
    ├── KidsStoryVideoMaker.js         # Main component
    └── KidsStoryVideoMaker.css        # Styling
```

---

## Requirements

### Server
- Node.js 14+
- FFmpeg installed and accessible
- 2GB+ RAM recommended
- Internet connection for image APIs

### Optional
- Google Cloud TTS API key (for premium voices)
- HuggingFace API token (for better images)

### Client
- Modern web browser
- 10 Mbps+ internet connection
- Speakers/headphones for audio preview

---

## Future Enhancements

- [ ] Custom character face upload
- [ ] Multiple voice actors per character
- [ ] Background music selection
- [ ] Scene-by-scene editing
- [ ] Character emotion control
- [ ] Video effects and transitions
- [ ] Export to different formats
- [ ] Batch story processing

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review `CARTOON_VIDEO_GENERATOR_GUIDE.md` for API details
3. Check server logs in `backend/uploads/cartoon-videos/`
4. Verify FFmpeg installation: `ffmpeg -version`

---

## Examples

### Example 1: Simple Bedtime Story
```
Title: "The Sleepy Cloud"

Fluffy the cloud was floating in the night sky.

Fluffy: "I'm so tired, but I can't fall asleep!"

A friendly star named Stella twinkled nearby.

Stella: "Count the little stars, Fluffy. It will help you sleep."

Fluffy counted one, two, three stars and soon felt sleepy.

Fluffy: "Thank you, Stella. Good night!"
```

### Example 2: Educational Adventure
```
Title: "Luna's Space Journey"

Luna the astronaut prepared for her first space mission.

Luna: "Today I'll explore the solar system!"

She met a robot guide named Cosmo at the space station.

Cosmo: "First, let's visit Mars, the red planet!"

They flew past Mercury, Venus, and Earth, learning about each planet.

Luna: "Space is amazing! I can't wait to learn more!"
```

---

**Last Updated:** January 2025
**Version:** 1.0.0
