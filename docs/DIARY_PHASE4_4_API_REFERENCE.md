# Diary Phase 4.4 API Reference

**Date**: May 8, 2026  
**Status**: Partially Complete (Backend endpoints deployed, frontend components created)  
**OpenAI Integration**: Enabled with keyword-based fallback  

---

## Table of Contents

1. [Persistent Summary Endpoints](#persistent-summary-endpoints)
2. [OpenAI Integration](#openai-integration)
3. [Request/Response Examples](#requestresponse-examples)
4. [Error Handling](#error-handling)
5. [Caching Strategy](#caching-strategy)
6. [Cost Estimation](#cost-estimation)
7. [Configuration](#configuration)

---

## Persistent Summary Endpoints

### 1. GET `/api/diary/ai/summary` - Get Summary with OpenAI + Fallback + Persistence

Generates a summary using OpenAI GPT-3.5, persists to database, and caches the result.

**Method**: GET  
**Auth**: Required (JWT token)  
**Rate Limit**: 100 requests per 15 minutes  

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | string | 'week' | Summary period: 'week', 'month', 'quarter', 'year', 'custom' |
| `daysBack` | number | 7 | For custom period, number of days to look back |
| `persist` | boolean | true | Whether to save summary to database |

#### Response (Success)

```json
{
  "success": true,
  "data": {
    "period": "week",
    "summary": {
      "narrative": "This week was filled with reflection on personal growth and meaningful conversations. You spent time thinking about your goals and reconnecting with what matters most.",
      "keyThemes": ["reflection", "growth", "relationships", "goals", "mindfulness"],
      "moodSummary": "😊 Happy (60% of entries)",
      "highlights": [
        {
          "date": "2026-05-05",
          "title": "Breakthrough insight",
          "reason": "detailed"
        }
      ],
      "actionItems": [
        "Follow up with mentor about career transition",
        "Start daily meditation practice",
        "Plan weekend hiking trip"
      ],
      "entryCount": 6,
      "totalWords": 2847,
      "generatedAt": "2026-05-08T10:30:00Z"
    },
    "source": "generated",
    "aiProvider": "openai",
    "persisted": true
  }
}
```

#### Response (No Entries)

```json
{
  "success": true,
  "data": {
    "period": "week",
    "summary": "No entries found for this period.",
    "keyThemes": [],
    "moodSummary": "N/A",
    "highlights": [],
    "entryCount": 0,
    "generatedAt": "2026-05-08T10:30:00Z"
  }
}
```

#### cURL Example

```bash
curl -X GET "http://localhost:5000/api/diary/ai/summary?period=week&persist=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### Python Example

```python
import requests

headers = {
    "Authorization": "Bearer YOUR_JWT_TOKEN",
    "Content-Type": "application/json"
}

params = {
    "period": "week",
    "persist": "true"
}

response = requests.get(
    "http://localhost:5000/api/diary/ai/summary",
    headers=headers,
    params=params
)

print(response.json())
```

---

### 2. GET `/api/diary/ai/summaries` - List All Summaries

Returns paginated list of all persistent summaries for the user.

**Method**: GET  
**Auth**: Required  
**Rate Limit**: 100 requests per 15 minutes  

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | string | optional | Filter by period type (week, month, etc.) |
| `limit` | number | 10 | Pagination limit |
| `skip` | number | 0 | Number of records to skip |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "_id": "6478a1b2c3d4e5f6g7h8i9j0",
      "userId": "user123",
      "period": "week",
      "startDate": "2026-05-01T00:00:00Z",
      "endDate": "2026-05-08T23:59:59Z",
      "entryCount": 6,
      "totalWords": 2847,
      "summary": { /* summary object */ },
      "aiProvider": "openai",
      "openAITokensUsed": 342,
      "userFeedback": null,
      "isShared": false,
      "createdAt": "2026-05-08T10:30:00Z",
      "updatedAt": "2026-05-08T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 10,
    "skip": 0,
    "pages": 2
  }
}
```

---

### 3. GET `/api/diary/ai/summaries/:summaryId` - Get Specific Summary

Returns a specific summary by ID with full details.

**Method**: GET  
**Auth**: Required  

#### Response

```json
{
  "success": true,
  "data": {
    "_id": "6478a1b2c3d4e5f6g7h8i9j0",
    "userId": "user123",
    "period": "week",
    "summary": { /* full summary object */ },
    "userFeedback": {
      "rating": 4,
      "helpful": true,
      "notes": "Very insightful summary!"
    },
    "createdAt": "2026-05-08T10:30:00Z"
  }
}
```

---

### 4. POST `/api/diary/ai/summaries/:summaryId/feedback` - Record Feedback

Records user feedback on a summary to improve future generations.

**Method**: POST  
**Auth**: Required  

#### Request Body

```json
{
  "rating": 4,
  "helpful": true,
  "notes": "Captured the essence of my week perfectly"
}
```

#### Response

```json
{
  "success": true,
  "data": { /* updated summary object */ },
  "message": "Feedback recorded"
}
```

---

### 5. POST `/api/diary/ai/summaries/:summaryId/mark-action` - Mark Action Complete

Marks an action item as completed.

**Method**: POST  
**Auth**: Required  

#### Request Body

```json
{
  "actionIndex": 0
}
```

#### Response

```json
{
  "success": true,
  "data": { /* updated summary */ },
  "message": "Action marked complete"
}
```

---

### 6. POST `/api/diary/ai/summaries/:summaryId/share` - Create Share Link

Creates a shareable link for the summary.

**Method**: POST  
**Auth**: Required  

#### Request Body

```json
{
  "expirationDays": 7
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "sharedLink": "abc123def456",
    "shareUrl": "https://yourapp.com/diary/shared-summary/abc123def456",
    "expiresAt": "2026-05-15T10:30:00Z"
  },
  "message": "Share link created"
}
```

---

### 7. DELETE `/api/diary/ai/summaries/:summaryId` - Delete Summary

Soft deletes a summary (data preserved, marked as deleted).

**Method**: DELETE  
**Auth**: Required  

#### Response

```json
{
  "success": true,
  "message": "Summary deleted"
}
```

---

## OpenAI Integration

### Configuration

Set environment variables:

```bash
# .env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=800
```

### Fallback Mechanism

If OpenAI is unavailable or API fails:
1. System catches error and logs warning
2. Falls back to keyword-based summary generation
3. `aiProvider` field shows "keyword-based" instead of "openai"
4. Response still includes summary, themes, mood, highlights

### Estimated Costs

- **Input**: $0.0015 per 1K tokens
- **Output**: $0.002 per 1K tokens
- **Average Summary**: ~300 input tokens, ~200 output tokens = ~$0.0009

For 1,000 monthly summaries:
- ~$0.90 in API costs

---

## Request/Response Examples

### Complete Flow: Generate, Store, and Provide Feedback

#### Step 1: Generate Summary

```bash
curl -X GET "http://localhost:5000/api/diary/ai/summary?period=week" \
  -H "Authorization: Bearer jwt_token"
```

Response:
```json
{
  "success": true,
  "data": { /* summary */ },
  "aiProvider": "openai",
  "persisted": true
}
```

#### Step 2: Get Persisted Summaries

```bash
curl -X GET "http://localhost:5000/api/diary/ai/summaries?limit=5" \
  -H "Authorization: Bearer jwt_token"
```

#### Step 3: Provide Feedback

```bash
curl -X POST "http://localhost:5000/api/diary/ai/summaries/abc123/feedback" \
  -H "Authorization: Bearer jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "helpful": true,
    "notes": "Excellent summary!"
  }'
```

---

## Error Handling

### Common Errors

#### 400 Bad Request - Invalid Period

```json
{
  "success": false,
  "message": "Invalid period. Use: week, month, quarter, year, custom"
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Authentication required"
}
```

#### 404 Not Found

```json
{
  "success": false,
  "message": "Summary not found"
}
```

#### 429 Too Many Requests

```json
{
  "success": false,
  "message": "Rate limit exceeded. Max 100 requests per 15 minutes."
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to generate summary"
}
```

### Handling OpenAI Failures

```javascript
// Frontend code
try {
  const response = await fetch('/api/diary/ai/summary?period=week', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    if (response.status === 503) {
      console.log('OpenAI temporarily unavailable, using keyword-based summary');
    }
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  console.log(`Generated with: ${data.aiProvider}`);
  
} catch (error) {
  console.error('Summary generation failed:', error);
  // Show fallback UI or cached summary
}
```

---

## Caching Strategy

### Cache Keys

```
diary:ai-summary:{userId}:{period} → Expires 60 minutes
diary:ai-summary-list:{userId} → Expires 30 minutes (when querying multiple)
```

### Cache Invalidation

Caches are automatically cleared when:
- New diary entry is created
- Entry is updated
- Entry is deleted
- Manual API call to `POST /api/diary/:id/clear-cache`

### Redis Configuration

```javascript
// backend/utils/diaryCache.js
const CACHE_TTL = {
  AI_SUMMARY: 60 * 60 * 1000, // 1 hour
  AI_INSIGHTS: 30 * 60 * 1000, // 30 minutes
};
```

---

## Cost Estimation

### Usage Scenarios

#### Light User (1 summary/week)
- **Calls**: 52/year
- **Tokens**: ~26,000/year
- **Cost**: ~$0.04/year

#### Active User (3 summaries/week)
- **Calls**: 156/year
- **Tokens**: ~78,000/year
- **Cost**: ~$0.12/year

#### Power User (7 summaries/week)
- **Calls**: 364/year
- **Tokens**: ~182,000/year
- **Cost**: ~$0.27/year

---

## Configuration

### Backend Setup

1. **Install OpenAI SDK**:
   ```bash
   npm install openai
   ```

2. **Set Environment Variables**:
   ```bash
   export OPENAI_API_KEY="sk-..."
   export OPENAI_MODEL="gpt-3.5-turbo"
   ```

3. **Verify Connection**:
   ```bash
   curl -X GET http://localhost:5000/api/diary/ai/summary?period=week \
     -H "Authorization: Bearer test_token"
   ```

### Database Setup

DiaryAISummary model automatically creates indexes:
- `userId + period + startDate` (for fast summary retrieval)
- `userId + createdAt` (for time-based queries)
- `userId` (for user data isolation)

---

## Performance Notes

- **Average Response Time**: 2-5 seconds (including OpenAI API call)
- **Cache Hit Response Time**: <100ms
- **Max Entries per Summary**: 365 (last year of entries)
- **Max Summary Size**: ~2MB (including nested objects)

### Optimization Tips

1. Use `persist=true` to cache summaries for reuse
2. Request summaries during off-peak hours
3. Use pagination when listing summaries
4. Enable Redis for distributed caching

---

## Troubleshooting

### OpenAI API Not Responding

**Problem**: Summary generation times out or returns error

**Solution**:
1. Verify `OPENAI_API_KEY` is set correctly
2. Check OpenAI service status: https://status.openai.com
3. Review API usage at https://platform.openai.com/account/billing/overview
4. System will automatically fallback to keyword-based

### Missing Summary Data

**Problem**: Summary is generated but `aiProvider` shows "keyword-based"

**Solution**:
1. This is normal - OpenAI may be rate-limited or unreachable
2. Keyword-based summaries are still high quality
3. Try again in a few minutes for OpenAI to respond

### Shared Links Not Working

**Problem**: Share link expired or invalid

**Solution**:
1. Check `shareExpiresAt` timestamp
2. Create new share link with `POST /api/diary/ai/summaries/:id/share`
3. Increase expiration days if needed

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | May 8, 2026 | Initial Phase 4.4 implementation with OpenAI integration |

---

## References

- [Phase 4.3 API Reference](./DIARY_PHASE4_3_API_REFERENCE.md)
- [Diary Analytics Documentation](./DIARY_ANALYTICS_DOCUMENTATION.md)
- [OpenAI Documentation](https://platform.openai.com/docs)

---

*Last Updated: May 8, 2026*  
*Next: Component integration, testing, and Phase 4.4 documentation completion*
