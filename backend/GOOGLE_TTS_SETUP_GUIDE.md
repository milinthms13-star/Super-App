# Google Cloud Text-to-Speech Setup Guide

Enable **FREE spoken dialogue** for Kids Video Maker using Google Cloud TTS.

**Free Tier**: 1 million characters per month at $0 cost  
**Fallback**: Automatically uses silent audio if not configured

---

## 🎯 Quick Setup (5 minutes)

### Step 1: Create Google Cloud Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Accept terms and create a new project (e.g., "KidsVideoMaker")

### Step 2: Enable Text-to-Speech API

1. Navigate to **APIs & Services** → **Library**
2. Search for "Text-to-Speech API"
3. Click **Enable**
4. Wait for activation (usually instant)

### Step 3: Create Service Account

1. Go to **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Enter details:
   - **Name**: `kids-video-tts`
   - **Description**: `Service account for Kids Video Maker TTS`
4. Click **Create and Continue**
5. Grant role: **Text-to-Speech User**
6. Click **Done**

### Step 4: Generate Credentials JSON

1. Find your service account in the list
2. Click on it to open details
3. Go to **Keys** tab
4. Click **Add Key** → **Create new key**
5. Choose **JSON** format
6. Click **Create**
7. **Download** the JSON file (e.g., `kids-video-tts-credentials.json`)

### Step 5: Configure Your Application

#### Option A: Using Environment Variable (Recommended)

```bash
# Windows (PowerShell)
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\kids-video-tts-credentials.json"

# Windows (CMD)
set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\kids-video-tts-credentials.json

# Linux/Mac
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/kids-video-tts-credentials.json"
```

#### Option B: Place Credentials in Project

1. Copy the JSON file to: `backend/config/google-tts-credentials.json`
2. Update your `.env` file:

```env
GOOGLE_APPLICATION_CREDENTIALS=./config/google-tts-credentials.json
VIDEO_STUDIO_ENABLE_GOOGLE_TTS=true
```

#### Option C: Use Credentials JSON Content Directly

Add to your `.env` file:

```env
GOOGLE_TTS_CREDENTIALS_JSON={"type":"service_account","project_id":"your-project",...}
VIDEO_STUDIO_ENABLE_GOOGLE_TTS=true
```

---

## 🔧 Implementation Details

### Current Status

The Kids Video Maker already has **complete TTS integration** with:
- ✅ Google Cloud TTS client initialization
- ✅ FREE voice selection (child-friendly, narrator, young, friendly)
- ✅ Automatic fallback to silent audio
- ✅ Error handling and logging
- ✅ Character limit enforcement (5000 chars/request)

### How It Works

```javascript
// 1. Check if TTS is enabled
if (process.env.VIDEO_STUDIO_ENABLE_GOOGLE_TTS === 'true') {
  // 2. Initialize Google TTS client
  const textToSpeech = require('@google-cloud/text-to-speech');
  ttsClient = new textToSpeech.TextToSpeechClient();
  
  // 3. Synthesize speech for each scene
  const audioBuffer = await synthesizeSpeech(dialogueText, 'child-friendly');
  
  // 4. If successful, use real audio
  if (audioBuffer) {
    await fs.writeFile(audioFile, audioBuffer);
  } else {
    // 5. Fallback to silent audio
    generateSilentAudio(audioFile, duration);
  }
}
```

### Voice Options

The system supports 4 kid-friendly voices:

| Voice Type | Google Voice | Gender | Pitch | Best For |
|------------|--------------|--------|-------|----------|
| `child-friendly` | Neural2-H | Female | High | Main characters |
| `narrator` | Neural2-J | Male | Normal | Story narration |
| `young` | Neural2-F | Female | High | Young characters |
| `friendly` | Neural2-A | Male | Normal | Supporting roles |

### Free Tier Limits

- **1 million characters per month** = FREE
- **5,000 characters per request** (enforced in code)
- Approximately **10,000 story videos** per month (at 100 chars/video)

---

## ✅ Verify Setup

### Test 1: Check Credentials

```bash
cd backend
node -e "
const tts = require('@google-cloud/text-to-speech');
const client = new tts.TextToSpeechClient();
client.listVoices({languageCode: 'en-US'})
  .then(() => console.log('✅ Google TTS credentials valid!'))
  .catch(err => console.error('❌ TTS Error:', err.message));
"
```

### Test 2: Generate Sample Audio

```bash
cd backend
node test-google-tts.js
```

Create `backend/test-google-tts.js`:

```javascript
const { synthesizeSpeech } = require('./services/videoStudioRealCartoonRenderer');

async function testTTS() {
  console.log('Testing Google Cloud TTS...');
  
  const text = "Hello! Welcome to the magical adventure story.";
  const audioBuffer = await synthesizeSpeech(text, 'child-friendly');
  
  if (audioBuffer) {
    const fs = require('fs');
    fs.writeFileSync('test-audio.mp3', audioBuffer);
    console.log('✅ TTS working! Check test-audio.mp3');
  } else {
    console.log('⚠️  TTS not configured, using silent audio fallback');
  }
}

testTTS().catch(console.error);
```

### Test 3: Create Story Video

```bash
curl -X POST http://localhost:5000/api/video-studio/create \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "TTS Test",
    "voiceType": "child-friendly",
    "scenes": [{
      "title": "The Magic Forest",
      "description": "A brave explorer enters the enchanted woods",
      "dialogue": "Hello friends! Let me tell you an amazing story.",
      "durationSeconds": 6
    }]
  }'
```

Check the response logs:
- ✅ `✓ Generated speech for scene 1 using FREE Google TTS` = Working
- ⚠️ `⚠ Using silent audio for scene 1 (TTS not available)` = Fallback

---

## 🚨 Troubleshooting

### Error: "Could not load the default credentials"

**Cause**: `GOOGLE_APPLICATION_CREDENTIALS` not set

**Solution**:
```bash
# Set environment variable with absolute path
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/credentials.json"

# Or add to .env file
echo "GOOGLE_APPLICATION_CREDENTIALS=./config/google-tts-credentials.json" >> .env
```

### Error: "Text-to-Speech API has not been used"

**Cause**: API not enabled in Google Cloud Console

**Solution**:
1. Go to https://console.cloud.google.com/apis/library/texttospeech.googleapis.com
2. Click **Enable**
3. Wait 1-2 minutes for activation

### Error: "Permission denied"

**Cause**: Service account doesn't have TTS role

**Solution**:
1. Go to **IAM & Admin** → **IAM**
2. Find your service account
3. Click **Edit**
4. Add role: **Cloud Text-to-Speech User**
5. Save changes

### Error: "Quota exceeded"

**Cause**: Used more than 1M characters this month

**Solutions**:
- Wait until next month (resets automatically)
- Upgrade to paid tier
- Use silent audio fallback (automatic)

### Module Still Using Silent Audio

**Check**:
```bash
# 1. Is TTS enabled?
grep VIDEO_STUDIO_ENABLE_GOOGLE_TTS backend/.env
# Should show: VIDEO_STUDIO_ENABLE_GOOGLE_TTS=true

# 2. Are credentials set?
echo $GOOGLE_APPLICATION_CREDENTIALS
# Should show path to JSON file

# 3. Is credentials file valid JSON?
cat $GOOGLE_APPLICATION_CREDENTIALS | python -m json.tool

# 4. Restart backend server
npm restart
```

---

## 🔒 Security Best Practices

### DO ✅

1. **Add credentials to .gitignore**:
   ```
   # .gitignore
   backend/config/google-tts-credentials.json
   *-credentials.json
   ```

2. **Use environment variables** for production:
   ```bash
   # Production server
   export GOOGLE_APPLICATION_CREDENTIALS="/secure/path/credentials.json"
   ```

3. **Restrict service account permissions**:
   - Only grant "Cloud Text-to-Speech User" role
   - Don't grant "Owner" or "Editor"

4. **Monitor usage** in Google Cloud Console:
   - Set budget alerts at 80% of free tier
   - Review API usage monthly

### DON'T ❌

1. ❌ Commit credentials to Git
2. ❌ Share credentials publicly
3. ❌ Use same credentials for multiple projects
4. ❌ Grant excessive permissions

---

## 💰 Cost Management

### Free Tier Usage

**1 million characters = FREE per month**

Example calculations:
- Average story: 100-200 characters
- Videos per month: 5,000-10,000
- Cost: **$0**

### Monitor Usage

```bash
# Check current month usage
gcloud alpha billing accounts list
gcloud alpha billing projects link YOUR_PROJECT_ID --billing-account=YOUR_BILLING_ACCOUNT

# View Text-to-Speech API usage
gcloud monitoring dashboards list
```

Or use Google Cloud Console:
1. Go to **Billing** → **Reports**
2. Filter by "Text-to-Speech API"
3. View character count

### What Happens After 1M Characters?

**Option 1**: Module automatically uses silent audio (free forever)

**Option 2**: Upgrade to paid tier ($4 per 1M characters)

**Option 3**: Wait until next month (quota resets)

---

## 📊 Performance Optimization

### Caching TTS Audio

**Save generated audio** to avoid re-generating:

```javascript
// Add to videoStudioRealCartoonRenderer.js
const audioCache = new Map();

async function getCachedAudio(text, voiceType) {
  const cacheKey = `${text}-${voiceType}`;
  
  if (audioCache.has(cacheKey)) {
    console.log('Using cached TTS audio');
    return audioCache.get(cacheKey);
  }
  
  const audioBuffer = await synthesizeSpeech(text, voiceType);
  if (audioBuffer) {
    audioCache.set(cacheKey, audioBuffer);
  }
  
  return audioBuffer;
}
```

### Batch Requests

For multiple scenes, batch TTS calls:

```javascript
// Generate audio for all scenes concurrently
const audioPromises = scenes.map(scene => 
  synthesizeSpeech(scene.dialogue, project.voiceType)
);
const audioBuffers = await Promise.all(audioPromises);
```

---

## 🎓 Advanced Configuration

### Custom Voices

Add more voices to `videoStudioRealCartoonRenderer.js`:

```javascript
const voiceMap = {
  'child-friendly': { languageCode: 'en-US', name: 'en-US-Neural2-H', ssmlGender: 'FEMALE' },
  'narrator': { languageCode: 'en-US', name: 'en-US-Neural2-J', ssmlGender: 'MALE' },
  'young': { languageCode: 'en-US', name: 'en-US-Neural2-F', ssmlGender: 'FEMALE' },
  'friendly': { languageCode: 'en-US', name: 'en-US-Neural2-A', ssmlGender: 'MALE' },
  // Add custom voices
  'british': { languageCode: 'en-GB', name: 'en-GB-Neural2-A', ssmlGender: 'FEMALE' },
  'aussie': { languageCode: 'en-AU', name: 'en-AU-Neural2-B', ssmlGender: 'MALE' }
};
```

### SSML Support

Use **Speech Synthesis Markup Language** for advanced effects:

```javascript
const request = {
  input: { 
    ssml: `<speak>
      <prosody rate="slow" pitch="+2st">
        Hello <break time="500ms"/> welcome to the story!
      </prosody>
    </speak>`
  },
  voice: voice,
  audioConfig: { audioEncoding: 'MP3' }
};
```

### Multi-Language Support

Enable international stories:

```javascript
const languages = {
  'en': { code: 'en-US', voice: 'en-US-Neural2-H' },
  'es': { code: 'es-ES', voice: 'es-ES-Neural2-A' },
  'fr': { code: 'fr-FR', voice: 'fr-FR-Neural2-A' },
  'de': { code: 'de-DE', voice: 'de-DE-Neural2-A' }
};
```

---

## 📚 Resources

### Official Documentation
- [Google Cloud TTS Docs](https://cloud.google.com/text-to-speech/docs)
- [Pricing Calculator](https://cloud.google.com/text-to-speech/pricing)
- [Voice List](https://cloud.google.com/text-to-speech/docs/voices)

### Community Resources
- [TTS Best Practices](https://cloud.google.com/text-to-speech/docs/best-practices)
- [SSML Reference](https://cloud.google.com/text-to-speech/docs/ssml)
- [Authentication Guide](https://cloud.google.com/docs/authentication/getting-started)

### Support
- [Stack Overflow: google-cloud-tts](https://stackoverflow.com/questions/tagged/google-cloud-text-to-speech)
- [GitHub Issues](https://github.com/googleapis/nodejs-text-to-speech/issues)

---

## ✨ Summary

### What You Have Now

✅ **Fully implemented TTS system** with:
- Google Cloud TTS integration
- 4 kid-friendly voices
- Automatic fallback to silent audio
- Free tier support (1M chars/month)
- Error handling and logging

### What You Need to Do

1. Create Google Cloud account (5 min)
2. Enable Text-to-Speech API (1 min)
3. Download credentials JSON (2 min)
4. Set environment variable (1 min)
5. Test with sample video (2 min)

**Total setup time: ~10 minutes**

### Result

🎉 **Professional spoken dialogue in kids' videos at $0 cost!**

- No code changes needed (already implemented)
- Graceful fallback if not configured
- Production-ready error handling
- Monitoring and cost management included

---

**Need Help?** The system works with silent audio right now. TTS is an optional enhancement that adds spoken dialogue when you're ready to enable it.
