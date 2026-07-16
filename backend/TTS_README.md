# Text-to-Speech (TTS) Feature - Kids Video Maker

## 🎙️ Overview

The Kids Video Maker module supports **FREE spoken dialogue** using Google Cloud Text-to-Speech API. This is an **optional enhancement** - the module works perfectly with silent audio if TTS is not configured.

---

## 🆓 Cost: $0/month

- **Free Tier**: 1,000,000 characters per month
- **Typical Usage**: 100-200 characters per video
- **Videos per Month**: ~5,000-10,000 videos FREE
- **Overage Cost**: $4 per 1M characters (only if you exceed free tier)

---

## 🚀 Quick Start

### Option 1: Interactive Setup (Recommended)

```bash
cd backend
node setup-google-tts.js
```

Follow the on-screen instructions to configure TTS in 5 minutes.

### Option 2: Manual Setup

1. **Get Google Cloud Credentials**:
   - Go to https://console.cloud.google.com/
   - Create a project → Enable Text-to-Speech API
   - Create Service Account → Download JSON key

2. **Configure Environment**:
   ```bash
   # Set environment variable (Windows PowerShell)
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\credentials.json"
   
   # Or add to .env file
   echo "GOOGLE_APPLICATION_CREDENTIALS=./config/google-tts-credentials.json" >> .env
   echo "VIDEO_STUDIO_ENABLE_GOOGLE_TTS=true" >> .env
   ```

3. **Test Configuration**:
   ```bash
   node test-google-tts.js
   ```

### Option 3: Skip TTS Setup

The module works perfectly without TTS configuration:
- Videos use **silent audio with ambient sound**
- All features work normally
- No setup required
- $0 cost forever

---

## ✅ Verification

### Check TTS Status

**API Endpoint**:
```bash
curl http://localhost:5000/api/kids-story/tts-status
```

**Response**:
```json
{
  "success": true,
  "tts": {
    "enabled": true,
    "fallbackMode": false,
    "configuration": {
      "environmentVariable": true,
      "credentialsJson": false,
      "configFile": false
    },
    "message": "✅ Google Cloud TTS is configured and ready",
    "freeTier": "1,000,000 characters per month"
  }
}
```

### Test TTS Connection

**API Endpoint**:
```bash
curl -X POST http://localhost:5000/api/kids-story/test-tts
```

**Response**:
```json
{
  "success": true,
  "tts": {
    "success": true,
    "voicesAvailable": 380,
    "message": "Google Cloud TTS is working correctly",
    "freeCharactersPerMonth": 1000000
  }
}
```

### Generate Test Audio

**Script**:
```bash
cd backend
node test-google-tts.js
```

**Output**:
- Creates `test-tts-output/` directory
- Generates 4 sample audio files (child-friendly, narrator, young, friendly)
- Displays configuration status and usage estimates

---

## 🎤 Supported Voices

| Voice Type | Google Voice | Gender | Best For |
|------------|--------------|--------|----------|
| `child-friendly` | Neural2-H | Female | Main characters, upbeat stories |
| `narrator` | Neural2-J | Male | Story narration, explanations |
| `young` | Neural2-F | Female | Young characters, energetic |
| `friendly` | Neural2-A | Male | Supporting roles, calm tone |

**Select voice when creating video**:
```json
{
  "projectName": "My Adventure",
  "voiceType": "child-friendly",
  "scenes": [...]
}
```

---

## 📋 Configuration Methods

### Method 1: Environment Variable (Recommended)

```bash
# Windows (PowerShell)
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\credentials.json"

# Linux/Mac
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"
```

**Pros**: Standard Google Cloud approach, easy to change, works in all environments  
**Cons**: Must be set in each terminal session (unless added to system variables)

### Method 2: Config File

```bash
# Copy credentials to:
backend/config/google-tts-credentials.json

# Enable in .env:
VIDEO_STUDIO_ENABLE_GOOGLE_TTS=true
```

**Pros**: Automatic loading, no environment setup needed  
**Cons**: Credentials file must be kept secure, not suitable for version control

### Method 3: JSON String (Advanced)

```bash
# Add to .env:
GOOGLE_TTS_CREDENTIALS_JSON='{"type":"service_account","project_id":"...",...}'
VIDEO_STUDIO_ENABLE_GOOGLE_TTS=true
```

**Pros**: Works in containerized environments, good for CI/CD  
**Cons**: Long string, harder to read/edit

---

## 🔧 How It Works

### Architecture

```
Story Creation Request
    ↓
Scene Processing Loop
    ↓
[Check TTS Configuration]
    ↓
├─ TTS Enabled? → Google Cloud TTS API
│                     ↓
│                 MP3 Audio Buffer
│                     ↓
│                 Save to File
│                     ↓
├─ TTS Disabled? → Generate Silent Audio
                      ↓
                  Silent MP3 with Ambient Sound
                      ↓
                  Save to File
    ↓
Animate Character Mouths
    ↓
Combine Audio + Video
    ↓
Return Video URL
```

### Code Flow

```javascript
// 1. Initialize TTS client (automatic)
const client = initializeGoogleTTS();

// 2. For each scene, try to generate speech
const audioBuffer = await synthesizeSpeech(
  "Hello! Welcome to our story!",
  "child-friendly"
);

// 3. Use speech or fallback to silent audio
if (audioBuffer) {
  fs.writeFileSync('scene-audio.mp3', audioBuffer);
  console.log('✓ Using spoken dialogue');
} else {
  generateSilentAudio('scene-audio.mp3', duration);
  console.log('⚠ Using silent audio fallback');
}

// 4. Continue with video rendering...
```

---

## 🛠️ Troubleshooting

### Problem: "TTS credentials not found"

**Symptoms**:
- Videos use silent audio
- Test script shows "TTS not configured"
- API status shows `enabled: false`

**Solutions**:
1. Run setup script: `node setup-google-tts.js`
2. Verify credentials path: `echo $GOOGLE_APPLICATION_CREDENTIALS`
3. Check file exists: `ls $GOOGLE_APPLICATION_CREDENTIALS`
4. Test credentials: `node test-google-tts.js`

### Problem: "API has not been enabled"

**Symptoms**:
- Error: "Text-to-Speech API has not been used in project..."
- Test connection fails

**Solutions**:
1. Go to https://console.cloud.google.com/apis/library/texttospeech.googleapis.com
2. Click **Enable**
3. Wait 1-2 minutes
4. Test again: `node test-google-tts.js`

### Problem: "Permission denied"

**Symptoms**:
- Error: "The caller does not have permission"
- 403 Forbidden errors

**Solutions**:
1. Go to IAM & Admin → IAM in Google Cloud Console
2. Find your service account
3. Add role: **Cloud Text-to-Speech User**
4. Save and wait 1 minute
5. Test again

### Problem: "Quota exceeded"

**Symptoms**:
- Error: "Quota exceeded for quota metric..."
- Videos suddenly use silent audio

**Solutions**:
1. **Option A**: Wait until next month (quota resets)
2. **Option B**: Upgrade to paid tier (still very cheap)
3. **Option C**: Continue with silent audio (automatic fallback)
4. Monitor usage: https://console.cloud.google.com/billing/

### Problem: Still using silent audio after setup

**Debug Steps**:

```bash
# 1. Check environment variable
echo $GOOGLE_APPLICATION_CREDENTIALS

# 2. Verify credentials file exists
cat $GOOGLE_APPLICATION_CREDENTIALS | python -m json.tool

# 3. Check .env file
cat backend/.env | grep TTS

# 4. Test TTS directly
cd backend && node test-google-tts.js

# 5. Check API status
curl http://localhost:5000/api/kids-story/tts-status

# 6. Restart backend server
npm restart
```

---

## 📊 Monitoring & Usage

### Check Current Usage

**Google Cloud Console**:
1. Go to https://console.cloud.google.com/
2. Select your project
3. Go to **APIs & Services** → **Text-to-Speech API** → **Metrics**
4. View character count per day/month

**Set Budget Alerts**:
1. Go to **Billing** → **Budgets & Alerts**
2. Create budget
3. Set alert at 80% of free tier (800,000 characters)
4. Add notification email

### Estimate Usage

```javascript
// Average story video
const scenes = 3;
const wordsPerScene = 30;
const charactersPerWord = 5;
const totalCharacters = scenes * wordsPerScene * charactersPerWord;
// = 450 characters per video

// Free tier capacity
const freeCharacters = 1000000;
const videosPerMonth = freeCharacters / totalCharacters;
// = ~2,222 videos per month FREE
```

### Cost After Free Tier

```
If you exceed 1M characters per month:
- Cost: $4 per 1M characters
- Example: 2M characters = $4
- Still very affordable for production use
```

---

## 🔒 Security Best Practices

### DO ✅

1. **Add credentials to .gitignore**:
   ```gitignore
   backend/config/google-tts-credentials.json
   *-credentials.json
   !*-credentials.example.json
   ```

2. **Use least privilege**:
   - Only grant "Cloud Text-to-Speech User" role
   - Don't use Owner or Editor roles

3. **Rotate credentials regularly**:
   - Create new service account key every 90 days
   - Delete old keys

4. **Monitor usage**:
   - Set up budget alerts
   - Review API logs monthly

5. **Secure file permissions**:
   ```bash
   chmod 600 backend/config/google-tts-credentials.json
   ```

### DON'T ❌

1. ❌ Commit credentials to Git
2. ❌ Share credentials via email/chat
3. ❌ Use same credentials for multiple projects
4. ❌ Grant excessive permissions (Owner/Editor)
5. ❌ Store credentials in frontend code
6. ❌ Hardcode credentials in application code

---

## 🎓 Advanced Usage

### Custom Voice Configuration

**Add more voices** in `videoStudioRealCartoonRenderer.js`:

```javascript
const voiceMap = {
  'child-friendly': { 
    languageCode: 'en-US', 
    name: 'en-US-Neural2-H', 
    ssmlGender: 'FEMALE' 
  },
  // Add custom voices
  'british': { 
    languageCode: 'en-GB', 
    name: 'en-GB-Neural2-A', 
    ssmlGender: 'FEMALE' 
  },
  'spanish': { 
    languageCode: 'es-ES', 
    name: 'es-ES-Neural2-A', 
    ssmlGender: 'FEMALE' 
  }
};
```

### SSML Support

**Use Speech Synthesis Markup Language** for advanced effects:

```javascript
const request = {
  input: { 
    ssml: `<speak>
      <prosody rate="slow" pitch="+2st">
        Hello <break time="500ms"/> friends!
      </prosody>
      <emphasis level="strong">
        Let's go on an adventure!
      </emphasis>
    </speak>`
  },
  voice: voice,
  audioConfig: { audioEncoding: 'MP3' }
};
```

### Audio Caching

**Cache generated audio** to save API calls:

```javascript
const audioCache = new Map();

async function getCachedAudio(text, voiceType) {
  const key = `${text}-${voiceType}`;
  
  if (audioCache.has(key)) {
    return audioCache.get(key);
  }
  
  const audio = await synthesizeSpeech(text, voiceType);
  if (audio) audioCache.set(key, audio);
  
  return audio;
}
```

### Batch Processing

**Generate multiple audio files concurrently**:

```javascript
const audioPromises = scenes.map(scene => 
  synthesizeSpeech(scene.dialogue, voiceType)
);

const audioBuffers = await Promise.all(audioPromises);
```

---

## 📚 Resources

### Official Documentation
- [Google Cloud TTS Docs](https://cloud.google.com/text-to-speech/docs)
- [Pricing Details](https://cloud.google.com/text-to-speech/pricing)
- [Voice List](https://cloud.google.com/text-to-speech/docs/voices)
- [SSML Reference](https://cloud.google.com/text-to-speech/docs/ssml)

### Guides
- `backend/GOOGLE_TTS_SETUP_GUIDE.md` - Complete setup guide
- `backend/setup-google-tts.js` - Interactive setup script
- `backend/test-google-tts.js` - Testing and verification

### Support
- [Stack Overflow](https://stackoverflow.com/questions/tagged/google-cloud-text-to-speech)
- [GitHub Issues](https://github.com/googleapis/nodejs-text-to-speech/issues)
- [Community Forum](https://cloud.google.com/support/community)

---

## ✨ Summary

### What You Have Now

✅ **Fully functional TTS system** with:
- Multiple configuration methods
- 4 kid-friendly voices
- Automatic fallback to silent audio
- Interactive setup wizard
- Testing and verification tools
- API status endpoints
- Security best practices

### Current Status

🟢 **Without TTS configured**:
- Videos work perfectly with silent audio
- All features available
- $0 cost forever
- No setup required

🟢 **With TTS configured**:
- Professional spoken dialogue
- Multiple voice options
- Still $0 for most use cases (free tier)
- Optional enhancement

### Decision Guide

**Use Silent Audio** if:
- You want zero configuration
- Budget is extremely tight
- Videos don't need narration
- Quick setup is priority

**Use Google TTS** if:
- You want professional voice-overs
- You have 5 minutes for setup
- You're okay with minimal Google Cloud setup
- You want to stay within free tier (1M chars/month)

Both options are **fully supported and production-ready**! 🎉

---

**Need Help?** 
- Run: `node setup-google-tts.js` for interactive setup
- Check: `backend/GOOGLE_TTS_SETUP_GUIDE.md` for detailed guide
- Test: `node test-google-tts.js` to verify configuration
