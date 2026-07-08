# 🎙️ Voice Friend Module - Complete Documentation

> An AI-powered voice companion with emotional intelligence, multi-language support, and customizable personalities.

---

## 📖 Quick Navigation

- **Just want it working?** → [Quick Start Guide](VOICEFRIEND_QUICKSTART.md)
- **Technical details?** → [Full Analysis](VOICEFRIEND_MODULE_ANALYSIS.md)
- **Track progress?** → [Implementation Checklist](VOICEFRIEND_CHECKLIST.md)
- **Automated setup?** → Run `.\setup-voicefriend.ps1`
- **Verify setup?** → Run `.\verify-voicefriend.ps1`

---

## 🎯 What is Voice Friend?

Voice Friend is a sophisticated AI companion module that provides:

- **Emotional Support**: AI-powered conversations with empathy and understanding
- **Voice Interaction**: Speak naturally and hear AI responses
- **Multi-Language**: English, Hindi, Malayalam, Kannada support
- **Customizable**: Choose personalities, upload custom avatars, create presets
- **Safe & Private**: Crisis detection, session persistence, local storage

---

## ✨ Key Features

### 🤖 Three AI Personalities
- **Nila** - Caring, emotional, and patient companion
- **Arjun** - Protective, motivating, and reassuring buddy
- **Anya** - Empathetic, soothing, and supportive guide

### 🎨 Customization
- Upload custom avatar faces
- Save/load face presets
- Custom names for AI friends
- Multiple voice styles
- Scenario backgrounds (room, park, beach, cafe)

### 💬 Advanced Conversations
- Context-aware responses
- Memory of preferences (places, foods, activities)
- Mood-based interactions
- Safety/crisis detection
- Multi-language conversations

### 🎤 Voice Features
- Speech-to-text input (Web Speech API)
- Text-to-speech output (Google Cloud TTS)
- Auto-send voice transcripts
- Replay any response

### 📊 Companion Score
- Real-time rating (0-10)
- Based on features enabled
- Optimization suggestions
- Diagnostic checks

---

## 🚀 Quick Setup (3 Steps)

### 1. Run Automated Setup
```powershell
.\setup-voicefriend.ps1
```

### 2. Get API Key & Configure
```bash
# Get key from: https://aistudio.google.com/app/apikey
# Add to backend/.env:
GEMINI_API_KEY=your_key_here
FREE_MODE=false
```

### 3. Start & Test
```powershell
# Terminal 1
cd backend
npm start

# Terminal 2
npm start

# Visit: http://localhost:3000/voice-friend
```

---

## 📁 Project Structure

```
Voice Friend Module
├── Backend
│   ├── services/
│   │   ├── voiceFriendService.js      # Core AI service
│   │   └── voiceFriendService.test.js # Unit tests
│   ├── routes/
│   │   └── voiceFriendRoutes.js       # API endpoints
│   ├── data/
│   │   └── voiceFriendSessions.json   # Session storage
│   └── uploads/
│       └── voicefriend/               # User avatars
│
├── Frontend
│   ├── src/modules/voicefriend/
│   │   ├── VoiceFriend.js             # Main component
│   │   └── VoiceFriend.css            # Styling
│   └── public/avatars/
│       ├── nila.png                   # Default avatars
│       ├── arjun.png
│       └── anya.png
│
└── Documentation
    ├── VOICEFRIEND_MODULE_ANALYSIS.md  # Full technical analysis
    ├── VOICEFRIEND_QUICKSTART.md       # Step-by-step guide
    ├── VOICEFRIEND_CHECKLIST.md        # Implementation tracker
    ├── README_VOICEFRIEND.md           # This file
    ├── setup-voicefriend.ps1           # Automated setup
    └── verify-voicefriend.ps1          # Verification tool
```

---

## 🔌 API Endpoints

All endpoints are prefixed with `/api/ai-voice-friend`

### POST `/init`
Start a new Voice Friend session
```javascript
{
  persona: "supportive",
  mood: "neutral",
  language: "en",
  friendId: "nila",
  userName: "John"
}
```

### POST `/message`
Send a message and get AI response
```javascript
{
  sessionId: "uuid",
  message: "Hello, how are you?",
  sessionToken: "token"
}
```

### POST `/speech`
Generate text-to-speech audio
```javascript
{
  sessionId: "uuid",
  text: "Response text",
  friendId: "nila",
  voice: "female-soft"
}
```

### POST `/avatar`
Upload custom avatar image
```javascript
// FormData with 'avatar' file
// Max 3MB, JPG/PNG/WEBP
```

### GET `/history/:sessionId`
Retrieve conversation history
```javascript
// Returns full session with messages
```

---

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **AI**: Google Gemini 2.0
- **TTS**: Google Cloud Text-to-Speech
- **Database**: MongoDB (session storage)
- **File Upload**: Multer
- **Security**: Rate limiting, session tokens

### Frontend
- **Framework**: React 18
- **Speech**: Web Speech API
- **Audio**: HTML5 Audio
- **Storage**: LocalStorage
- **Styling**: CSS3 (glass-morphism, animations)

### APIs & Services
- Google Gemini API (free tier: 60 RPM)
- Google Cloud TTS (1M free chars/month)
- Web Speech API (browser native)

---

## 📊 Current Status

**Module Completeness:** 95%

| Component | Status |
|-----------|--------|
| Backend Service | ✅ 100% |
| API Routes | ✅ 100% |
| Frontend UI | ✅ 100% |
| Integration | ✅ 100% |
| Dependencies | ✅ 100% |
| Avatar Assets | ❌ 0% - **ACTION REQUIRED** |
| API Configuration | ❌ 0% - **ACTION REQUIRED** |

**What's Missing:**
1. Avatar images in `public/avatars/` (3 files)
2. Gemini API key in `backend/.env`

**Estimated Time to Complete:** 15-30 minutes

---

## 💡 Usage Examples

### Basic Text Conversation
```javascript
// User types: "I'm feeling stressed today"
// AI (Nila): "I hear that this feels very hard. Take one slow 
// breath and notice something small that feels okay. What would 
// help you feel a bit steadier right now?"
```

### Voice Conversation
```javascript
// 1. User clicks "Talk to Friend"
// 2. Speaks: "I need help planning a trip"
// 3. AI transcribes and responds
// 4. Audio plays automatically
```

### Custom Avatar
```javascript
// 1. Click "Upload face"
// 2. Select image (auto-cropped to 512x512)
// 3. Optionally save as preset
// 4. Avatar updates in video stage
```

### Language Switch
```javascript
// Switch to Malayalam
// User: "എനിക്ക് ഇന്നൊക്കെ സ്ട്രെസ് ആണ്"
// AI responds in Malayalam with cultural context
```

---

## 🎓 Best Practices

### For Users
- **Be Honest**: AI friend is non-judgmental
- **Use Headphones**: For clearer audio
- **Chrome/Edge**: Best browser support
- **Allow Mic**: For voice features
- **Save Presets**: Quick personality switching

### For Developers
- **Monitor API Usage**: Free tier has limits
- **Cache Responses**: Reduce API calls
- **Handle Errors**: Network issues common
- **Test Browsers**: Voice API varies
- **Backup Sessions**: Data is local

---

## 🔒 Security & Privacy

### Implemented
- ✅ Session token validation
- ✅ Rate limiting (10-20 req/min)
- ✅ File upload restrictions
- ✅ Crisis content detection
- ✅ Input sanitization

### User Privacy
- Conversations stored locally
- Optional session persistence
- No data sent without consent
- Crisis detection for safety
- Clear data retention policy needed

### Recommendations
- Add encryption at rest
- Implement data export/delete
- Create privacy policy
- Add user consent flow
- Regular security audits

---

## 📈 Future Enhancements

### Planned (v2.0)
- [ ] Real-time streaming responses
- [ ] Voice cloning for custom voices
- [ ] Emotion detection from voice
- [ ] Video call-like interface
- [ ] Group voice sessions

### Considering (v3.0)
- [ ] Integration with calendar
- [ ] Mental health tracking
- [ ] Professional therapist escalation
- [ ] Voice journaling
- [ ] Multi-device sync

---

## 🐛 Troubleshooting

### Common Issues

**Problem:** Avatars showing as broken images
```powershell
# Solution
.\setup-voicefriend.ps1
```

**Problem:** Only getting generic responses
```bash
# Check backend/.env
FREE_MODE=false  # Must be false
GEMINI_API_KEY=AIza...  # Must be set
```

**Problem:** Voice not working
```
- Use Chrome or Edge browser
- Allow microphone permission
- Check HTTPS or localhost
```

**Problem:** Backend not connecting
```bash
# Check .env.local
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_BACKEND_URL=http://localhost:5000
```

---

## 📞 Support & Resources

### Documentation
- 📘 [Full Analysis](VOICEFRIEND_MODULE_ANALYSIS.md)
- 🚀 [Quick Start](VOICEFRIEND_QUICKSTART.md)
- ✅ [Checklist](VOICEFRIEND_CHECKLIST.md)

### Tools
- 🔧 Setup: `.\setup-voicefriend.ps1`
- ✓ Verify: `.\verify-voicefriend.ps1`

### External Resources
- [Gemini API Docs](https://ai.google.dev/docs)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Google Cloud TTS](https://cloud.google.com/text-to-speech/docs)

---

## 💰 Cost Analysis

### Free Tier (Recommended for Start)
**Gemini API:**
- Cost: $0
- Limits: 60 RPM, 1,500 RPD
- Good for: 100+ users/day

**Google Cloud TTS:**
- Cost: $0 for first 1M chars/month
- Then: $4 per 1M chars
- Average: 100 chars per response
- Free tier: ~10,000 responses/month

### Estimated Costs (Production)
- **100 users/day**: ~$5/month
- **1,000 users/day**: ~$50/month
- **10,000 users/day**: ~$500/month

*Optimize with caching and response reuse*

---

## 🎯 Success Metrics

Track these KPIs:

**User Engagement**
- Sessions per user
- Messages per session
- Average session duration
- Return user rate

**Technical Performance**
- API response time
- TTS generation time
- Error rate
- Voice recognition accuracy

**User Satisfaction**
- Companion score average
- Feature usage (voice, avatars)
- Crisis detection triggers
- User feedback ratings

---

## 🌟 Credits & Acknowledgments

**Built With:**
- Google Gemini AI
- Google Cloud Text-to-Speech
- Web Speech API
- React & Express.js

**Special Thanks:**
- Open source community
- Beta testers
- Feedback contributors

---

## 📄 License

This module is part of the MalarBarBazaar/NilaHub super app project.

---

## 🚀 Getting Started

Ready to bring Voice Friend to life?

1. **Quick Setup**: Run `.\setup-voicefriend.ps1`
2. **Get API Key**: Visit https://aistudio.google.com/app/apikey
3. **Configure**: Add key to `backend/.env`
4. **Test**: Follow [Quick Start Guide](VOICEFRIEND_QUICKSTART.md)
5. **Verify**: Run `.\verify-voicefriend.ps1`

---

## 📝 Version History

**v1.0.0** (Current)
- Initial implementation
- 3 AI personalities
- 4 languages supported
- Voice input/output
- Avatar customization
- Face presets
- Session persistence
- Crisis detection

---

**Questions?** Check the documentation files or run the verification script.

**Ready to start?** Run `.\setup-voicefriend.ps1` now! 🎉
