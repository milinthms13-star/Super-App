# Cartoon Video Generator - User Guide

## Overview

The Cartoon Video Generator creates animated story videos from plain text using free AI APIs. Simply provide a story, and the system will:

1. **Parse the story** into characters, scenes, and dialogue
2. **Generate character designs** with consistent appearance
3. **Create scene illustrations** using free AI image APIs (Pollinations/HuggingFace)
4. **Synthesize voices** for character dialogue
5. **Compose final video** with transitions, audio, and subtitles

---

## Quick Start

### 1. Write Your Story

```
Once upon a time, there was a brave rabbit named Robby who loved to explore.

One day, Robby met a wise turtle named Shelly. "Hello, young rabbit," said Shelly.

"Hello!" replied Robby. "Can you show me the secret garden?"

Together, they journeyed through the forest and became great friends.
```

### 2. Call the API

```javascript
// Generate video
const response = await fetch('/api/cartoon-video/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    storyText: yourStory,
    storyTitle: 'Robby and Shelly',
    style: 'cartoon',
    provider: 'pollinations', // or 'huggingface'
    voiceEngine: 'auto',
    includeSubtitles: true,
    width: 1280,
    height: 720,
  }),
});

const { jobId } = await response.json();

// Check status
const statusResponse = await fetch(`/api/cartoon-video/status/${jobId}`);
const { job } = await statusResponse.json();

// Download when complete
if (job.status === 'completed') {
  window.location.href = `/api/cartoon-video/download/${jobId}`;
}
```

---

## API Endpoints

### POST `/api/cartoon-video/generate`

Start video generation.

**Request Body:**
```json
{
  "storyText": "Your story text here...",
  "storyTitle": "My Story",
  "style": "cartoon",
  "provider": "pollinations",
  "voiceEngine": "auto",
  "includeSubtitles": true,
  "width": 1280,
  "height": 720
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "job-123456",
  "message": "Video generation started",
  "estimatedTime": "2-5 minutes"
}
```

### GET `/api/cartoon-video/status/:jobId`

Check generation progress.

**Response:**
```json
{
  "success": true,
  "job": {
    "jobId": "job-123456",
    "status": "processing",
    "progress": 45,
    "storyTitle": "My Story",
    "startedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

Status values: `processing`, `completed`, `failed`

### GET `/api/cartoon-video/download/:jobId`

Download generated video (MP4).

### POST `/api/cartoon-video/parse-story`

Preview how story will be parsed.

**Request Body:**
```json
{
  "storyText": "Your story...",
  "storyTitle": "My Story",
  "maxScenes": 6
}
```

**Response:**
```json
{
  "success": true,
  "parsed": {
    "title": "My Story",
    "characters": [
      { "name": "Robby", "role": "Hero" },
      { "name": "Shelly", "role": "Friend" }
    ],
    "scenes": [
      {
        "id": 1,
        "title": "Scene 1",
        "description": "...",
        "dialogue": "Robby: ...\nShelly: ...",
        "emotion": "happy"
      }
    ],
    "totalScenes": 6,
    "estimatedDuration": 30
  }
}
```

### GET `/api/cartoon-video/capabilities`

Check what's available on the system.

**Response:**
```json
{
  "success": true,
  "capabilities": {
    "tts": {
      "engines": [
        { "name": "google", "label": "Google Cloud TTS", "quality": "high" },
        { "name": "windows", "label": "Windows TTS", "quality": "medium" },
        { "name": "fallback", "label": "Tone Generator", "quality": "low" }
      ],
      "default": "google"
    },
    "imageGeneration": {
      "pollinations": { "available": true, "free": true },
      "huggingface": { "available": false, "requiresApiKey": true }
    }
  }
}
```

---

## Configuration

### Environment Variables

```bash
# Image Generation
POLLINATIONS_API_BASE_URL=https://image.pollinations.ai/prompt
HUGGINGFACE_API_KEY=your_hf_key_here
HUGGINGFACE_IMAGE_MODEL=black-forest-labs/FLUX.1-schnell

# Text-to-Speech
GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-creds.json

# Video Processing
FFMPEG_PATH=/usr/bin/ffmpeg  # or leave empty for auto-detect
```

### Free APIs Used

1. **Pollinations.ai** - Free image generation, no API key required
2. **HuggingFace** - Free tier available with API key
3. **Windows TTS** - Built into Windows, no setup needed
4. **FFmpeg** - Free video processing tool

---

## Story Writing Tips

### Character Names

Use clear, consistent names:
```
✓ "A brave rabbit named Robby"
✓ "Robby said, 'Hello!'"

✗ "The rabbit" (ambiguous)
✗ "He said" (unclear who)
```

### Dialogue Format

Supported formats:
```
Format 1: Robby: "Let's go on an adventure!"
Format 2: Robby said, "Let's go on an adventure!"
Format 3: "Let's go on an adventure!" said Robby.
```

### Scene Structure

Include scene transitions:
```
✓ "One day, Robby went to the forest."
✓ "Suddenly, he heard a noise."
✓ "Finally, they reached the garden."
```

Keywords detected: once upon a time, one day, suddenly, then, meanwhile, finally

### Story Length

- **Minimum:** 50 characters
- **Recommended:** 300-800 characters
- **Maximum scenes:** 6 (configurable)
- **Scene duration:** ~5 seconds each

---

## Troubleshooting

### Video Generation Fails

1. **Check FFmpeg installation:**
   ```bash
   ffmpeg -version
   ```

2. **Check image API:**
   ```bash
   curl https://image.pollinations.ai/prompt/test
   ```

3. **Check logs:**
   Look for error messages in backend console

### Poor Image Quality

- Try different provider: `"provider": "huggingface"`
- Use more descriptive story text
- Check if API is rate-limited

### No Audio Generated

1. Check if TTS is available:
   - Windows: Built-in (System.Speech)
   - Linux/Mac: Install Google Cloud TTS or use fallback
   
2. Fallback will generate simple tones if TTS unavailable

### Character Consistency Issues

- Use consistent names throughout story
- Avoid pronouns (he/she/it) - use names instead
- Limit to 2-3 main characters per story

---

## Examples

### Example 1: Simple Story

```
Once upon a time, a curious cat named Whiskers found a magical key.

Whiskers asked his friend, a wise owl named Hoot, "What does this key open?"

Hoot replied, "That key opens the door to imagination!"

Together, they unlocked amazing adventures.
```

**Output:**
- 4 scenes
- 2 characters (Whiskers, Hoot)
- ~20 seconds duration

### Example 2: Adventure Story

```
In a colorful village, a brave girl named Luna loved to paint.

One day, Luna's paintings came to life! A painted dragon named Spark appeared.

"Hello, Luna!" said Spark. "Your imagination created me!"

Luna smiled. "Let's paint more friends together!"

They painted a whole magical world and shared it with everyone.
```

**Output:**
- 5 scenes  
- 2 characters (Luna, Spark)
- ~25 seconds duration

---

## Performance

- **Generation time:** 2-5 minutes typical
- **Image generation:** ~3-5 seconds per scene
- **Audio generation:** ~1-2 seconds per dialogue line
- **Video composition:** ~30-60 seconds

**Bottlenecks:**
- Image API response time (use HuggingFace for faster results)
- TTS processing (Windows TTS is faster than Google Cloud)
- FFmpeg encoding (depends on video length/resolution)

---

## Integration with Existing System

The cartoon video generator integrates with your existing KidsStoryVideoMaker:

```javascript
// In KidsStoryVideoMaker.js

const handleGenerateCartoonVideo = async () => {
  setIsGenerating(true);
  
  try {
    // Start generation
    const response = await fetch('/api/cartoon-video/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storyText: storyPrompt,
        storyTitle: storyTitle,
        style: styleId,
        provider: aiProvider,
        width: resolution.width,
        height: resolution.height,
      }),
    });
    
    const { jobId } = await response.json();
    
    // Poll for status
    const checkStatus = setInterval(async () => {
      const statusRes = await fetch(`/api/cartoon-video/status/${jobId}`);
      const { job } = await statusRes.json();
      
      setRenderProgress(job.progress);
      
      if (job.status === 'completed') {
        clearInterval(checkStatus);
        setVideoUrl(`/api/cartoon-video/download/${jobId}`);
        setMessage('Video ready!');
      } else if (job.status === 'failed') {
        clearInterval(checkStatus);
        setError(job.error);
      }
    }, 2000);
    
  } catch (error) {
    setError(error.message);
  } finally {
    setIsGenerating(false);
  }
};
```

---

## Next Steps

1. **Test the system:**
   ```bash
   curl -X POST http://localhost:3001/api/cartoon-video/test
   ```

2. **Check capabilities:**
   ```bash
   curl http://localhost:3001/api/cartoon-video/capabilities
   ```

3. **Generate your first video:**
   - Use the API or add button to frontend
   - Provide a simple story (50-200 words)
   - Wait 2-5 minutes for completion

4. **Customize:**
   - Adjust character templates in `cartoonCharacterService.js`
   - Modify scene prompts in `storyParserService.js`
   - Tune video settings in `cartoonVideoComposer.js`

---

## Support

For issues or questions:
1. Check this guide's Troubleshooting section
2. Review console logs for error messages
3. Test individual components (parse, image gen, audio gen)
4. Verify all dependencies are installed (FFmpeg, Node packages)

Happy storytelling! 🎬✨
