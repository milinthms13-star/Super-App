# Diary Phase 4 - Quick Reference Guide

## 🚀 Quick Start

### View Analytics Dashboard
1. Click **📊 Analytics** button in diary hero
2. Choose a tab: Stats → Trends → Wellness → Streaks
3. Data auto-fetches from backend APIs
4. Click **↻ Refresh Data** to reload

### Test Backend Endpoints
```bash
# Get writing stats (30 days)
curl -H "Authorization: Bearer {token}" \
  http://localhost:5000/api/diary/analytics/writing-stats?daysBack=30

# Get mood trends
curl -H "Authorization: Bearer {token}" \
  http://localhost:5000/api/diary/analytics/mood-trends?daysBack=30

# Get wellness score
curl -H "Authorization: Bearer {token}" \
  http://localhost:5000/api/diary/analytics/wellness-score

# Get streaks
curl -H "Authorization: Bearer {token}" \
  http://localhost:5000/api/diary/streaks

# Analyze entry sentiment
curl -H "Authorization: Bearer {token}" \
  http://localhost:5000/api/diary/{entryId}/sentiment

# Get tag suggestions
curl -X POST -H "Authorization: Bearer {token}" \
  http://localhost:5000/api/diary/{entryId}/suggest-tags

# Apply tags
curl -X POST -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"tags":["work","health"]}' \
  http://localhost:5000/api/diary/{entryId}/apply-tags
```

---

## 📁 File Structure

```
backend/
├── utils/
│   ├── diaryAnalytics.js        # Writing stats, streaks, mood analysis
│   ├── diaryAI.js               # Sentiment analysis, tag suggestions
│   └── diaryCache.js            # Cache keys, Redis operations (UPDATED)
├── models/
│   ├── DiaryEntry.js            # UPDATED: post-save hook
│   └── DiaryStreak.js           # NEW: streak tracking
└── routes/
    └── diary.js                 # UPDATED: 7 new endpoints

src/
├── modules/personaldiary/
│   ├── DiaryAnalyticsDashboard.js    # NEW: 450+ lines
│   ├── DiaryAnalytics.css            # NEW: 600+ lines
│   ├── Diary.js                      # UPDATED: analytics modal
│   └── ...
└── styles/
    └── Diary.css                # UPDATED: modal styles
```

---

## 🔧 Key Functions

### diaryAnalytics.js
```javascript
calculateWritingStats(entries)      // → {totalEntries, avgWords, ...}
calculateStreakStats(entries)       // → {currentStreak, longestStreak, ...}
calculateMoodStats(entries, days)   // → {distribution, trend, variability}
calculateWellnessScore(entries)     // → {score, frequency, length, stability, ...}
```

### diaryAI.js
```javascript
analyzeSentiment(content)           // → {positivityScore, sentimentLabel, emotionalTone, ...}
suggestTags(content, title, existing) // → [tag1, tag2, ...]
```

### DiaryStreak model
```javascript
DiaryStreak.updateStreak(userId, date)    // Auto-called on entry save
DiaryStreak.getStreakInfo(userId)         // Get current streak state
DiaryStreak.useStreakFreeze(userId)       // Protect streak from breaking
```

---

## 🎨 Component Usage

### Use Analytics Dashboard
```jsx
import DiaryAnalyticsDashboard from './DiaryAnalyticsDashboard';

<DiaryAnalyticsDashboard 
  userId={userId} 
  dateRange={30} 
/>
```

### Component Props
- `userId` (string, required) - User ID for scoped data
- `dateRange` (number, default: 30) - Days to analyze

---

## 💾 Cache Keys

| Key Pattern | TTL | Purpose |
|------------|-----|---------|
| `diary:analytics:writing-stats:` | 30min | Writing statistics |
| `diary:analytics:mood-trends:` | 30min | Mood analysis |
| `diary:analytics:wellness:` | 30min | Wellness score |
| `diary:streaks:` | 5min | Streak info |
| `diary:entries:` | 5min | Entry list |
| `diary:tags:` | 1hr | Tag aggregation |

**Invalidation:** All user caches cleared when entry is created/modified/deleted
```javascript
await invalidateUserCache(userId);
```

---

## 📊 API Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* metric data */ },
  "message": "Optional message",
  "period": "Optional period info"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (dev only)"
}
```

---

## 🔐 Authentication

All endpoints require JWT token:
```
Authorization: Bearer <jwt_token>
```

Token extracted from header and decoded to `req.user._id` context.

---

## 🚦 Rate Limiting

**Analytics endpoints:** 100 requests per 15 minutes

If exceeded:
```
429 Too Many Requests
Retry-After: {seconds}
```

---

## 🧪 Testing

### Run Build
```bash
npm run build
```

### Run Tests (when available)
```bash
npm test diary.integration.test.js
```

---

## 📈 Sentiment Analysis

**Keyword Detection:**
- **Positive**: happy, joy, excited, amazing, wonderful, excellent, great, good, love, proud, blessed, grateful, thankful, beautiful, perfect, awesome, fantastic, peaceful, calm, relaxed, succeed, victory, achieve
- **Negative**: sad, unhappy, depressed, anxious, worried, stressed, angry, frustrated, disappointed, hurt, scared, afraid, terrible, awful, horrible, bad, poor, fail, loss, lonely, exhausted, tired

**Emotional Tones:**
- calm (peaceful, calm, relaxed, serene)
- energetic (excited, amazing, fantastic, awesome)
- melancholic (sad, lonely, blue, down)
- anxious (worried, anxious, stressed, nervous)
- grateful (grateful, blessed, thankful, appreciative)

---

## 🏷️ Tag Categories (9 total)

1. **work** - Job, office, meeting, project, deadline, boss, colleague, career, promotion
2. **health** - Health, sick, doctor, exercise, sleep, diet, medicine, hospital, therapy, wellness
3. **relationships** - Friend, family, love, relationship, marriage, partner, breakup, date, conflict, support
4. **travel** - Travel, trip, vacation, destination, journey, adventure, flight, hotel, explore
5. **personal_growth** - Learning, growth, development, improvement, goal, achieve, overcome, progress, challenge
6. **finance** - Money, finance, savings, investment, budget, income, expense, debt, purchase
7. **creativity** - Art, music, write, create, design, inspire, imagine, dream, express
8. **nature** - Nature, outdoor, park, forest, mountain, beach, weather, garden, animals
9. **food** - Food, eat, cook, recipe, restaurant, meal, delicious, taste, drink

---

## 📱 Responsive Breakpoints

- **Desktop** (>1024px) - Full 4-column analytics
- **Tablet** (768-1024px) - 2-column grid, adjusted sizing
- **Mobile** (<768px) - Single-column, stacked layout, smaller fonts

---

## 🎯 Next Steps (Phase 4.3+)

1. [ ] AI Summary Service (OpenAI integration)
2. [ ] Auto-save Recovery UI
3. [ ] Version History Timeline
4. [ ] Integrate suggested tags in editor
5. [ ] Run full test suite

---

## ⚡ Performance Tips

- Use `dateRange` parameter to limit data: `?daysBack=7` for weekly analytics
- Cache is automatically invalidated on entry changes (no manual clearing needed)
- Dashboard loads 4 metrics in parallel for faster rendering
- Refresh button triggers new API calls (bypasses cache for current data)

---

## 🐛 Troubleshooting

### Analytics Dashboard Not Loading
1. Check browser console for errors
2. Verify token is valid in localStorage
3. Check backend is running: `npm start`
4. Verify Redis is running (optional, but recommended)

### No Data Showing
1. Create some diary entries first
2. Click **↻ Refresh Data** button
3. Check that entries are not drafts or deleted

### Slow Analytics
1. Check daysBack parameter (smaller = faster)
2. Verify Redis connection in .env
3. Check server load: `npm run dev`

---

## 📞 Support

For issues or questions:
1. Check `DIARY_PHASE4_API_REFERENCE.md` for detailed API docs
2. Review `DIARY_PHASE4_COMPLETION_SUMMARY.md` for architecture
3. Check inline code comments in source files
4. Run build to validate: `npm run build`

---

## 🎓 Code Examples

### Frontend: Fetch Analytics
```javascript
const response = await fetch(
  '/api/diary/analytics/writing-stats?daysBack=30',
  {
    headers: { Authorization: `Bearer ${token}` }
  }
);
const data = await response.json();
console.log(data.data.totalEntries);
```

### Frontend: Show Sentiments
```javascript
const sentiment = await fetch(`/api/diary/${entryId}/sentiment`, {
  headers: { Authorization: `Bearer ${token}` }
});
const { data } = await sentiment.json();
console.log(`Positivity: ${data.positivityScore}%`);
console.log(`Tone: ${data.emotionalTone}`);
```

### Backend: Manual Streak Update
```javascript
const DiaryStreak = require('../models/DiaryStreak');
await DiaryStreak.updateStreak(userId, new Date());
```

### Backend: Get Analytics
```javascript
const { calculateWellnessScore } = require('../utils/diaryAnalytics');
const entries = await DiaryEntry.find({ userId });
const score = calculateWellnessScore(entries, 30);
res.json({ success: true, data: score });
```

---

## 📚 Files to Read

- **API Details**: `DIARY_PHASE4_API_REFERENCE.md`
- **Completion Report**: `DIARY_PHASE4_COMPLETION_SUMMARY.md`
- **Source**: `backend/utils/diaryAnalytics.js`
- **Source**: `backend/utils/diaryAI.js`
- **Source**: `src/modules/personaldiary/DiaryAnalyticsDashboard.js`

---

**Last Updated**: May 7, 2026  
**Version**: Phase 4.1 & 4.2 Complete  
**Status**: ✅ Production Ready
