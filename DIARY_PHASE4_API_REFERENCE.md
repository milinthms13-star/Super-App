# Diary Module - Phase 4 API Reference

## Overview
Phase 4 adds **Analytics**, **AI Analysis**, and **Streak Tracking** to the Diary module. All endpoints are protected by JWT authentication and include Redis caching for performance.

---

## Analytics Endpoints

### 1. Writing Statistics
**GET** `/api/diary/analytics/writing-stats`

Returns comprehensive writing statistics for the specified period.

**Query Parameters:**
- `daysBack` (optional, default: 30) - Number of days to analyze

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEntries": 15,
    "totalWords": 3500,
    "totalCharacters": 18000,
    "avgWordsPerEntry": 233,
    "avgCharsPerEntry": 1200,
    "longestEntry": 450,
    "shortestEntry": 120,
    "entriesPerDay": {
      "2026-05-07": 2,
      "2026-05-06": 1
    },
    "entriesPerMonth": {
      "2026-05": 15,
      "2026-04": 22
    }
  },
  "period": "30 days"
}
```

**Cache:** 30 minutes | **Key:** `diary:analytics:writing-stats:{userId}:{daysBack}`

---

### 2. Mood Trends
**GET** `/api/diary/analytics/mood-trends`

Analyzes emotional patterns and mood distribution over time.

**Query Parameters:**
- `daysBack` (optional, default: 30) - Number of days to analyze

**Response:**
```json
{
  "success": true,
  "data": {
    "distribution": {
      "happy": 8,
      "peaceful": 4,
      "neutral": 2,
      "anxious": 1
    },
    "trend": [
      {"date": "2026-05-01", "mood": "happy"},
      {"date": "2026-05-02", "mood": "peaceful"}
    ],
    "moodVariability": 45.2
  },
  "period": "30 days"
}
```

**Mood Variability:** 0 (all same mood) to 100+ (highly variable). Lower = more emotional stability.

**Cache:** 30 minutes | **Key:** `diary:analytics:mood-trends:{userId}:{daysBack}`

---

### 3. Wellness Score
**GET** `/api/diary/analytics/wellness-score`

Composite wellness metric combining writing frequency, content length, emotional stability, and consistency.

**Query Parameters:**
- `daysBack` (optional, default: 30) - Number of days to analyze

**Response:**
```json
{
  "success": true,
  "data": {
    "score": 72,
    "writingFrequency": 85,
    "contentLength": 70,
    "emotionalStability": 65,
    "consistency": 75
  },
  "period": "30 days"
}
```

**Score Breakdown:**
- **Overall Score**: 0-100, calculated from weighted components
- **Writing Frequency**: How often entries are written (20% weight)
- **Content Length**: Word count consistency (20% weight)
- **Emotional Stability**: Low mood variability (30% weight)
- **Consistency**: Daily/weekly streak consistency (30% weight)

**Cache:** 30 minutes | **Key:** `diary:analytics:wellness:{userId}:{daysBack}`

---

### 4. Streak Information
**GET** `/api/diary/streaks`

Retrieves current writing streak, all-time longest streak, and milestones.

**Response:**
```json
{
  "success": true,
  "data": {
    "currentStreak": 7,
    "longestStreak": 31,
    "totalDaysWritten": 45,
    "lastEntryDate": "2026-05-07T18:30:00Z",
    "milestonesReached": [7, 14, 30],
    "streakFreezeUsed": false
  }
}
```

**Milestones:** 7, 14, 30, 60, 100, 365 days

**Cache:** 5 minutes | **Key:** `diary:streaks:{userId}`

---

## AI Analysis Endpoints

### 5. Sentiment Analysis
**GET** `/api/diary/:entryId/sentiment`

Analyzes emotional tone and positivity of a diary entry.

**URL Parameters:**
- `entryId` - ID of the diary entry

**Response:**
```json
{
  "success": true,
  "data": {
    "entryId": "507f1f77bcf86cd799439011",
    "positivityScore": 75,
    "sentimentLabel": "positive",
    "emotionalTone": "grateful",
    "keyEmotions": ["grateful", "happy", "peaceful"]
  }
}
```

**Sentiment Labels:**
- `very_positive` (≥70)
- `positive` (≥55)
- `neutral` (45-55)
- `negative` (≤45)
- `very_negative` (≤30)

**Emotional Tones:** calm, energetic, melancholic, anxious, grateful

---

### 6. Tag Suggestions
**POST** `/api/diary/:entryId/suggest-tags`

Analyzes entry content and suggests relevant tags using keyword matching.

**URL Parameters:**
- `entryId` - ID of the diary entry

**Response:**
```json
{
  "success": true,
  "data": [
    "work",
    "personal_growth",
    "relationships",
    "health",
    "creativity"
  ],
  "message": "Tags suggested successfully"
}
```

**Tag Categories:**
- work, health, relationships, travel, personal_growth, finance, creativity, nature, food

**Algorithm:** Keyword matching in entry content and title, confidence scoring, top-5 by confidence

---

### 7. Apply Tags
**POST** `/api/diary/:entryId/apply-tags`

Updates entry tags with suggested or custom tags.

**URL Parameters:**
- `entryId` - ID of the diary entry

**Request Body:**
```json
{
  "tags": ["work", "personal_growth", "health"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "...",
    "tags": ["work", "personal_growth", "health"],
    "updatedAt": "2026-05-07T18:30:00Z"
  },
  "message": "Tags applied successfully"
}
```

---

## Model: DiaryStreak

Automatic streak tracking for diary entries. Updated on each entry creation/modification via post-save hook.

**Schema Fields:**
- `currentStreak` - Current consecutive days written
- `longestStreak` - All-time longest streak
- `currentStreakStartDate` - When current streak began
- `totalDaysWritten` - Total days with entries (all time)
- `lastEntryDate` - Most recent entry date
- `datesWritten` - Array of ISO date strings (YYYY-MM-DD)
- `milestonesReached` - Milestone days achieved (e.g., [7, 30, 100])
- `streakFreezeUsed` - One-time protection if missed a day

---

## Caching Strategy

All analytics endpoints use Redis caching with pattern-based invalidation:

```javascript
// Cache keys generated dynamically
const key = `diary:analytics:${metric}:${userId}:${daysBack}`;
const cached = await getCached(key);

// Cache TTLs
CACHE_TTL.MOOD_STATS = 30 * 60 * 1000; // 30 minutes
CACHE_TTL.ENTRIES = 5 * 60 * 1000;     // 5 minutes
CACHE_TTL.TAGS = 60 * 60 * 1000;       // 1 hour
```

**Cache Invalidation:** All caches for a user cleared when entries modified:
```javascript
await invalidateUserCache(userId); // Clears all diary:*:{userId}:* patterns
```

---

## Frontend Integration

### DiaryAnalyticsDashboard Component
Responsive React component with 4 tabbed views:

1. **Writing Stats**
   - Total entries, words, characters
   - Average and extremes (longest/shortest)
   - Monthly breakdown table

2. **Mood Trends**
   - Mood distribution bar chart
   - Trend line over time
   - Emotional consistency gauge

3. **Wellness Score**
   - Circular score display (0-100)
   - Component breakdown (frequency, length, stability, consistency)
   - Actionable insights

4. **Streaks**
   - Current and longest streak display
   - Total days written
   - Milestone badges
   - Last entry timestamp

### Usage:
```jsx
import DiaryAnalyticsDashboard from './DiaryAnalyticsDashboard';

<DiaryAnalyticsDashboard userId={userId} dateRange={30} />
```

---

## Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "message": "Failed to fetch analytics",
  "error": "Optional error details in development"
}
```

**HTTP Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Missing/invalid JWT
- `404 Not Found` - Entry/resource not found
- `500 Internal Server Error` - Server error

---

## Authentication

All endpoints require JWT token in Authorization header:

```
Authorization: Bearer <jwt_token>
```

Token decoded to extract `req.user._id` for user-scoped queries.

---

## Rate Limiting

Analytics endpoints use moderate rate limiting (100 requests per 15 minutes):
```javascript
const diaryRateLimiter = createModerateRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100
});
```

---

## Performance Notes

- **Streak Updates:** Async post-save hook, non-blocking (graceful error handling)
- **Analytics Calculation:** Real-time on first request, cached thereafter
- **Cache Misses:** ~200-500ms for data calculation (depends on entry count)
- **Parallel Loading:** Dashboard fetches all 4 metrics in parallel (~400-800ms total)

---

## Testing

All endpoints have integration test coverage via Supertest:

```javascript
// Example test
describe('GET /api/diary/analytics/writing-stats', () => {
  it('returns writing statistics for user', async () => {
    const res = await request(app)
      .get('/api/diary/analytics/writing-stats?daysBack=30')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalEntries).toBeDefined();
  });
});
```

---

## Future Enhancements

- [ ] OpenAI API integration for AI-generated weekly summaries
- [ ] Custom date range picker in frontend
- [ ] Export analytics as PDF report
- [ ] Streak freeze (premium feature to protect streaks)
- [ ] Emoji reactions to entries
- [ ] Advanced filtering by tags/categories in analytics
- [ ] Peer comparison (anonymous community benchmarks)
