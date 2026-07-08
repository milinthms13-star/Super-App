# Voice Friend - Quick Start Guide

## 🚀 Get Voice Friend Running in 10 Minutes

Follow these steps in order to get your Voice Friend module fully operational.

---

## Step 1: Create Avatar Directory & Placeholder Images

### Option A: Using PowerShell Script (Recommended)

Save and run this script:

```powershell
# Create avatars directory
New-Item -ItemType Directory -Force -Path "public\avatars"

# Download placeholder avatars using UI Avatars service
$avatars = @(
    @{name="nila"; bg="c7d2fe"; color="4338ca"},
    @{name="arjun"; bg="a7f3d0"; color="065f46"},
    @{name="anya"; bg="fbcfe8"; color="9f1239"}
)

foreach ($avatar in $avatars) {
    $url = "https://ui-avatars.com/api/?name=$($avatar.name)&size=512&background=$($avatar.bg)&color=$($avatar.color)&bold=true&format=png"
    Invoke-WebRequest -Uri $url -OutFile "public\avatars\$($avatar.name).png"
    Write-Host "Downloaded $($avatar.name).png" -ForegroundColor Green
}

Write-Host "`nAvatar images created successfully!" -ForegroundColor Green
```

### Option B: Manual Creation

1. Create directory:
```powershell
mkdir public\avatars
```

2. Download images manually from:
   - Nila: https://ui-avatars.com/api/?name=Nila&size=512&background=c7d2fe&color=4338ca&bold=true
   - Arjun: https://ui-avatars.com/api/?name=Arjun&size=512&background=a7f3d0&color=065f46&bold=true
   - Anya: https://ui-avatars.com/api/?name=Anya&size=512&background=fbcfe8&color=9f1239&bold=true

3. Save them as:
   - `public/avatars/nila.png`
   - `public/avatars/arjun.png`
   - `public/avatars/anya.png`

---

## Step 2: Get Google Gemini API Key

### Free Tier Available! (60 requests/minute)

1. **Visit:** https://aistudio.google.com/app/apikey

2. **Sign in** with your Google account

3. **Create API Key:**
   - Click "Create API Key"
   - Select "Create API key in new project" or use existing
   - Copy the key (starts with `AIza...`)

4. **Important:** This is FREE with generous limits:
   - 60 requests per minute
   - 1,500 requests per day
   - Perfect for development and testing

---

## Step 3: Update Backend Environment Variables

Edit `backend/.env` and add/update these lines:

```bash
# AI Configuration - Add these lines
GEMINI_API_KEY=AIza_your_key_here_from_step_2
FREE_MODE=false

# Optional: Specify models (defaults are fine)
GEMINI_VOICE_FRIEND_MODEL=gemini-2.0-flash-exp
GEMINI_MODEL=gemini-2.0-flash-exp

# Optional: TTS voice preference
GEMINI_VOICE_FRIEND_TTS_VOICE=en-US-Standard-F
```

**Replace** `AIza_your_key_here_from_step_2` with your actual API key from Step 2.

---

## Step 4: Update Frontend Environment (Local Development)

Create a new file `.env.local` in the project root (NOT in backend folder):

```bash
# Local development API endpoints
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_BACKEND_URL=http://localhost:5000
```

**Note:** `.env.local` is automatically ignored by git, so your local settings won't be committed.

---

## Step 5: Install Dependencies (if needed)

```powershell
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ..
npm install
```

---

## Step 6: Start the Application

### Terminal 1 - Backend Server
```powershell
cd backend
npm start
```

Wait for:
```
Server running on port 5000
MongoDB connected successfully
```

### Terminal 2 - Frontend Server
```powershell
# From project root
npm start
```

Wait for browser to open at `http://localhost:3000`

---

## Step 7: Test Voice Friend

1. **Navigate to Voice Friend:**
   - Log in to your app
   - Go to Dashboard
   - Click on "Voice Friend" module

2. **Test Text Chat:**
   - Type: "Hello, how are you?"
   - Click "Send"
   - You should get an AI-powered response

3. **Test Voice Input (optional):**
   - Click "Talk to Friend" button
   - Allow microphone access when prompted
   - Speak your message
   - It should auto-send if "Auto-send voice transcript" is enabled

4. **Test Avatar Upload:**
   - Click "Upload face" button
   - Select an image file
   - Avatar should update immediately

5. **Test Face Presets:**
   - After uploading an avatar, enter a preset name
   - Click "Save face"
   - Try loading it later from the dropdown

---

## 🎯 Success Indicators

You know it's working when:

✅ You see AI friend avatars (not broken images)
✅ Text messages get intelligent AI responses (not fallback messages)
✅ Voice input captures and transcribes your speech
✅ Audio responses play automatically
✅ Avatar upload and presets work
✅ Companion score shows 6.0+ out of 10

---

## 🚨 Troubleshooting

### Issue: "Avatars not showing"
**Fix:**
```powershell
# Check if files exist
dir public\avatars\
# Should show: nila.png, arjun.png, anya.png
```

### Issue: "Getting fallback/generic responses"
**Check:**
1. Is `FREE_MODE=false` in `backend/.env`?
2. Is `GEMINI_API_KEY` set correctly?
3. Backend console should show: "VoiceFriendService initialized with Gemini"
   - NOT: "VoiceFriendService running in FREE_MODE"

### Issue: "Voice input not working"
**Check:**
1. Browser supports Web Speech API (Chrome/Edge recommended)
2. Microphone permission granted
3. Using HTTPS or localhost (required for mic access)

### Issue: "Audio not playing"
**Check:**
1. Browser allows autoplay
2. System volume not muted
3. Check browser console for errors

### Issue: "Backend connection failed"
**Check:**
1. Backend server running on port 5000
2. `.env.local` has correct `REACT_APP_BACKEND_URL`
3. CORS headers allow localhost:3000

### Issue: "MongoDB connection error"
**Check:**
1. MongoDB running locally
2. Connection string correct in `backend/.env`
3. Try: `mongod --dbpath your-db-path`

---

## 📊 Verify API Key is Working

Check backend console logs when sending a message:

**Good (AI Working):**
```
[info] Voice Friend message processed for session: abc-123-xyz
```

**Bad (FREE_MODE):**
```
[info] VoiceFriendService running in FREE_MODE; cloud AI disabled.
```

---

## 🎨 Optional Enhancements

### Better Avatar Images

Replace placeholder avatars with professional ones:

**Free Avatar Sources:**
- https://thispersondoesnotexist.com/ (AI-generated faces)
- https://unsplash.com/s/photos/portrait (free stock photos)
- https://www.pexels.com/search/portrait/ (free stock photos)

**Recommended Specs:**
- 512x512px or larger
- Square aspect ratio
- Clear face, centered
- Neutral/friendly expression
- PNG or WEBP format

### Custom Voice Selection

Add more voice options in `backend/.env`:

```bash
# For different languages/accents
GEMINI_VOICE_FRIEND_TTS_VOICE=en-US-Standard-F  # Female US
# GEMINI_VOICE_FRIEND_TTS_VOICE=en-IN-Standard-A  # Female India
# GEMINI_VOICE_FRIEND_TTS_VOICE=hi-IN-Standard-A  # Hindi Female
# GEMINI_VOICE_FRIEND_TTS_VOICE=ml-IN-Standard-A  # Malayalam Female
```

---

## 💰 Cost Estimation

### Gemini API (Free Tier)
- **Cost:** $0
- **Limits:** 60 RPM, 1,500 RPD
- **Sufficient for:** Development, testing, small user base

### Google Cloud TTS (if using)
- **Cost:** $4 per 1 million characters
- **Free Tier:** First 1 million characters/month
- **Average:** ~100 characters per response
- **Monthly Free:** ~10,000 responses

**For Production:**
- Monitor API usage in Google Cloud Console
- Set up billing alerts
- Consider caching frequent responses

---

## 🔐 Security Checklist

Before going live:

- [ ] API keys in `.env`, NOT in code
- [ ] `.env` files in `.gitignore`
- [ ] Rate limiting enabled (already done)
- [ ] File upload size limits (already done)
- [ ] Session token validation (already done)
- [ ] HTTPS in production
- [ ] CORS properly configured
- [ ] Backup conversation data
- [ ] Privacy policy mentions AI processing
- [ ] User consent for data storage

---

## 📚 Additional Resources

**Gemini API Documentation:**
- https://ai.google.dev/docs

**Web Speech API:**
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API

**Google Cloud TTS:**
- https://cloud.google.com/text-to-speech/docs

**React Speech Recognition:**
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition

---

## 🎓 User Guide (Share with Users)

### For Users: How to Use Voice Friend

1. **Start a Session:**
   - Choose your AI friend (Nila, Arjun, or Anya)
   - Enter your name (optional)
   - Select your mood and language

2. **Chat Options:**
   - **Text:** Type and click "Send"
   - **Voice:** Click "Talk to Friend" and speak

3. **Customize Your Friend:**
   - Upload a custom face photo
   - Give your friend a custom name
   - Change voice style

4. **Save Your Setup:**
   - Create face presets for quick switching
   - Enable "Persist session" to remember conversations
   - Your chat history saves automatically

5. **Get the Best Experience:**
   - Use Chrome or Edge for voice features
   - Allow microphone access
   - Use headphones for clearer audio
   - Share your feelings honestly - AI friend won't judge!

---

## 🆘 Getting Help

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review backend console logs
3. Check browser console (F12 → Console tab)
4. Verify all environment variables are set
5. Ensure all dependencies are installed

---

## ✨ You're All Set!

Your Voice Friend module should now be fully operational. Enjoy meaningful conversations with your AI companion!

**Next Steps:**
- Customize AI friend personalities in `voiceFriendService.js`
- Add more languages
- Enhance UI with better avatars
- Monitor usage and gather user feedback

Happy chatting! 🎉
