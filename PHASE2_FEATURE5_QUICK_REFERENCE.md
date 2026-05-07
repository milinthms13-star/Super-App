# Messaging Phase 2 Feature 5: Quick Reference Guide

## Feature Overview
Advanced abuse reporting with bulk submission, aggregation, analytics, and pattern detection.

---

## Components

### User-Facing: AdvancedReportingPanel.jsx
```jsx
<AdvancedReportingPanel onClose={() => {}} onReportSubmitted={() => {}} />
```
- Single/Bulk toggle
- Form validation
- Auto-fetches categories
- Success/error feedback

### Admin-Facing: AnalyticsDashboard.jsx
```jsx
<AnalyticsDashboard currentUser={user} />
```
- 4 tabs: Overview, Trends, Aggregation, Filters
- Summary cards
- Charts and visualizations
- Serial offender alerts

---

## API Endpoints

### Public Endpoints
```
GET /api/messaging/feature5-reporting/categories
```
Returns: `["harassment", "hate_speech", "spam", "misinformation", "sexual_content", "violence", "scam", "impersonation"]`

### Authenticated Endpoints
```
POST /api/messaging/feature5-reporting/bulk
GET  /api/messaging/feature5-reporting/analytics?days=7
GET  /api/messaging/feature5-reporting/trends?days=30
GET  /api/messaging/feature5-reporting/aggregation?timeWindow=24
GET  /api/messaging/feature5-reporting/filter?reason=&status=&severity=&page=1&limit=20
```

### Existing Endpoints (Unmodified)
```
POST /api/messaging/reports (single report)
```

---

## Bulk Submission Example

**Request:**
```javascript
const bulkReports = [
  {
    reportedUserId: "user123",
    reason: "harassment",
    description: "Repeated unwanted contact"
  },
  {
    reportedUserId: "user456",
    reason: "spam",
    description: "Posting promotional content"
  }
];

fetch('/api/messaging/feature5-reporting/bulk', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    reports: bulkReports,
    batchId: `batch_${Date.now()}`
  })
});
```

**Response:**
```json
{
  "message": "Bulk reports processed",
  "results": {
    "successful": [0, 1],
    "failed": [],
    "duplicates": [],
    "total": 2
  }
}
```

---

## Analytics Dashboard Usage

### 1. Overview Tab
- See summary metrics
- View category breakdown
- Check top reporters/reported users

### 2. Trends Tab
- Visual timeline of reports
- Daily breakdown
- Trend direction (increasing/stable)

### 3. Aggregation Tab
- Serial offenders (3+ reports)
- Escalation alerts (5+ reports - auto-handled)
- Category trends

### 4. Filters Tab
- Filter by reason (category)
- Filter by status (pending/resolved)
- Filter by severity (low/medium/high/critical)
- Paginated results

---

## Database Schema (Extended)

### AbuseReport Model
```javascript
{
  _id: ObjectId,
  reportedUser: ObjectId (ref: User),
  reportedBy: ObjectId (ref: User),
  reason: String (enum: 8 categories),
  description: String,
  severity: String (auto-calculated),
  status: String (enum: open, pending, investigating, resolved, dismissed, escalated),
  keywords: [String] (extracted),
  urgencyScore: Number,
  createdAt: Date,
  updatedAt: Date,
  resolution: {
    action: String,
    actionTakenAt: Date,
    resolvedBy: ObjectId
  },
  appeal: {
    status: String,
    reason: String,
    submittedAt: Date,
    reviewedAt: Date
  }
}
```

---

## Service Methods

### Bulk Processing
```javascript
abuseReportingService.bulkReportAbuse(bulkReportData)
// Returns: {successful, failed, duplicates, total}
```

### Pattern Detection
```javascript
abuseReportingService.aggregateReports(timeWindow)
// Returns: {serialOffenders, categoryTrends, total}
```

### Analytics
```javascript
abuseReportingService.getAnalytics(days)
// Returns: {summary, byCategory, byStatus, bySeverity, timeline, topReporters, topReported}
```

### Filtering
```javascript
abuseReportingService.filterReports(filters, page, limit)
// Returns: {reports, pagination: {page, limit, total, pages}}
```

### Trends
```javascript
abuseReportingService.getReportTrends(days)
// Returns: {period, trend: {date: {total, categories}}, avgPerDay}
```

---

## Key Features

### ✅ Automatic Duplicate Detection
- Prevents same report within 24 hours
- Checked by user ID + category

### ✅ Serial Offender Detection
- Flags users with 3+ reports
- Auto-escalates at 5+ reports

### ✅ Severity Auto-Calculation
```
Critical: hate_speech, violence
High: harassment, sexual_content, scam
Medium: misinformation, impersonation
Low: spam
```

### ✅ Urgency Scoring
- Based on severity + report count
- Used for prioritization

### ✅ Category Trends
- Tracks which types increasing
- Helps identify platform issues

---

## Severities & Status Codes

### Severity Levels
| Level | Value | Examples |
|-------|-------|----------|
| Critical | critical | Hate speech, violence |
| High | high | Harassment, sexual content |
| Medium | medium | Misinformation, scams |
| Low | low | Spam, minor violations |

### Report Status
| Status | Meaning |
|--------|---------|
| open | Just created |
| pending | In queue for review |
| investigating | Moderator reviewing |
| resolved | Action taken |
| dismissed | False positive |
| escalated | High priority |

---

## Authentication & Authorization

### Routes Protected By:
```javascript
authMiddleware        // All routes require Bearer token
roleMiddleware        // Admin/Moderator only for:
                      // - aggregation
                      // - analytics
                      // - trends
                      // - filter
```

### Roles with Access:
- **admin** - Full access
- **moderator** - Analytics & aggregation only
- **user** - Bulk/single reporting only

---

## Styling Classes

### AdvancedReportingPanel
- `.advanced-reporting-panel`
- `.reporting-header`
- `.report-type-selector`
- `.form-group`
- `.report-row`
- `.remove-report-btn`
- `.add-report-btn`

### AnalyticsDashboard
- `.analytics-dashboard`
- `.dashboard-header`
- `.dashboard-tabs`
- `.tab-content`
- `.summary-cards` / `.card`
- `.charts-grid` / `.chart`
- `.chart-bar`
- `.status-badge`
- `.offender-card.alert-card`

---

## Common Tasks

### Add a New Report Category
1. Update backend/models/AbuseReport.js enum
2. Update abuseReportingService.js categories list
3. Frontend will auto-load from `/categories` endpoint

### Change Severity Thresholds
- Edit `abuseReportingService.js` → `calculateSeverity()`
- Adjust category-to-severity mapping

### Adjust Serial Offender Threshold
- Edit `aggregateReports()` method
- Change `count >= 3` to desired threshold

### Modify Time Window for Aggregation
- Pass `timeWindow` parameter (in hours)
- Default: 24 hours

---

## Error Handling

### Common Errors
```
"Failed to submit report" → Check auth token
"Invalid report category" → Validate reason value
"Too many reports" → Max 100 per bulk request
"Duplicate report" → Same user reported within 24h
```

### Debug Mode
```javascript
// Add to browser console
localStorage.setItem('debugReporting', 'true');

// Check API calls in Network tab
// Look for Feature 5 routes
```

---

## Files at a Glance

| File | Lines | Purpose |
|------|-------|---------|
| `backend/routes/feature5ReportingRoutes.js` | 200 | API endpoints |
| `backend/services/abuseReportingService.js` | +300 | Service methods (enhanced) |
| `src/modules/reporting/AdvancedReportingPanel.jsx` | 280 | User reporting UI |
| `src/modules/reporting/AdvancedReportingPanel.css` | 150 | Reporting panel styling |
| `src/modules/reporting/AnalyticsDashboard.jsx` | 320 | Admin analytics UI |
| `src/modules/reporting/AnalyticsDashboard.css` | 400 | Analytics styling |

---

## Performance Tips

1. **Bulk Reports** - Submit max 100 at a time
2. **Caching** - Categories rarely change, cache on client
3. **Analytics** - Cache results for 5 minutes
4. **Filtering** - Use indexes on reason, status, severity
5. **Batch Jobs** - Process aggregation during low traffic

---

## Testing Scenarios

### Scenario 1: Single Report
1. Open AdvancedReportingPanel
2. Select "Single Report"
3. Enter user ID, select category
4. Submit → Check database

### Scenario 2: Bulk Reports
1. Select "Bulk Reports"
2. Add 5 reports
3. Submit → Check results.successful length

### Scenario 3: Analytics
1. Login as admin
2. Open AnalyticsDashboard
3. Change time window (7→30 days)
4. Verify data updates

### Scenario 4: Aggregation
1. Create 5 reports for same user
2. Go to Aggregation tab
3. Should see user in serialOffenders
4. Should see escalation alert

### Scenario 5: Filtering
1. Go to Filters tab
2. Filter by reason + status
3. Verify results match criteria
4. Test pagination

---

## Next Phase Considerations

**Feature 6 (ML-Based):**
- Auto-categorize reports
- Confidence scoring
- Smart escalation

**Optimization:**
- Redis caching layer
- Elasticsearch for filtering
- Background job processing

**Enhancement:**
- Bulk export reports
- Custom dashboard widgets
- Integration with external moderation tools

---

## Support

For issues or questions:
1. Check [PHASE2_FEATURE5_COMPLETION_SUMMARY.md](PHASE2_FEATURE5_COMPLETION_SUMMARY.md)
2. Review backend service implementation
3. Check browser console for API errors
4. Verify authentication token is valid
