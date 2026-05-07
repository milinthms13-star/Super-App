# Phase 4.5: Draft Expiration - Quick Reference

**Status**: ✅ COMPLETE | **Build**: ✅ Compiled with warnings | **Date**: May 8, 2026

---

## What This Does

Automatically deletes old draft entries (7+ days) to keep your database clean.

---

## Quick Start

### 1. Setup (One Time)

```bash
# Install scheduler (optional but recommended)
npm install node-cron

# Add to .env
DIARY_DRAFT_RETENTION_DAYS=7

# Restart server
npm start
```

### 2. Check What Will Be Deleted

```bash
curl http://localhost:5000/api/diary/admin/draft-expiration/stats
```

### 3. Run Cleanup Manually

```bash
curl -X POST http://localhost:5000/api/diary/admin/cleanup-drafts
```

### 4. Check Settings

```bash
curl http://localhost:5000/api/diary/admin/draft-expiration/config
```

---

## How It Works

**Automatic** (if node-cron installed):
- Runs daily at 3 AM UTC
- Finds drafts not touched for 7+ days
- Soft-deletes them (marks as deleted but preserves data)
- Logs results

**Manual** (via API):
- Call cleanup endpoint anytime
- Same process as automatic
- Returns deletion statistics

---

## Files Changed

| File | Change |
|------|--------|
| backend/server.js | Added scheduler initialization |
| backend/routes/diary.js | Added 3 new API endpoints |
| **NEW**: backend/utils/diaryDraftExpiration.js | Core cleanup logic |
| **NEW**: backend/services/draftExpirationScheduler.js | Scheduler wrapper |

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/diary/admin/draft-expiration/stats | Preview deletions |
| POST | /api/diary/admin/cleanup-drafts | Trigger cleanup |
| GET | /api/diary/admin/draft-expiration/config | View settings |

---

## Configuration

```
DIARY_DRAFT_RETENTION_DAYS=7  # Delete drafts older than this many days
```

**Schedule**: 03:00 AM UTC daily (via node-cron, if installed)

---

## Examples

### Get Statistics
```javascript
// Returns: expiredDraftCount, oldest/newest draft, count per user
{
  retentionDays: 7,
  cutoffDate: "2026-05-01T00:00:00.000Z",
  expiredDraftCount: 42,
  expiredByUser: { user123: 5, user456: 37 }
}
```

### Run Cleanup
```javascript
// Returns: totalDeleted, totalFailed, batches, duration
{
  totalProcessed: 42,
  totalDeleted: 40,
  totalFailed: 2,
  batches: 1,
  duration: 2341
}
```

---

## Soft Delete Behavior

Drafts are marked as deleted, not permanently removed:

```
Before: isDraft=true, isDeleted=false
After:  isDraft=false, isDeleted=true, deletedAt=now
```

Users' app won't show these drafts, but data is recoverable if needed.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| node-cron not found | `npm install node-cron` |
| Scheduler didn't start | Check logs: `npm start` and look for initialization message |
| No drafts deleted | Check stats: `GET /stats` - see what's expired |
| Want permanent delete | Use `hardDeleteOldDrafts(90)` in code for 90+ days |

---

## Testing

```bash
# 1. Check current stats
curl http://localhost:5000/api/diary/admin/draft-expiration/stats

# 2. Create a draft (via UI or API)

# 3. Run cleanup
curl -X POST http://localhost:5000/api/diary/admin/cleanup-drafts

# 4. Verify deletion stats returned
```

---

## Monitoring

Server logs show cleanup activity:

```
[DIARY-DRAFT-EXPIRATION] Scheduler initialized successfully
[DIARY-DRAFT-EXPIRATION] Starting job: Removing drafts older than 7 days
[DIARY-DRAFT-EXPIRATION] Batch 1: Deleted 100/100 drafts
[DIARY-DRAFT-EXPIRATION] Job completed: Deleted 100 drafts in 1 batch
```

---

## What's Next (Phase 4.6+)

- [ ] Diff view for version comparison
- [ ] Version comments/notes
- [ ] Export history as PDF
- [ ] Share version links
- [ ] Draft recovery notification (24h before deletion)

---

**Build Status**: ✅ npm run build PASSED
