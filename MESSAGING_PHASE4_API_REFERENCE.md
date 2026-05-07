# 📖 PHASE 4 COMPLETE API REFERENCE

**Version**: 4.0  
**Status**: Production Ready  
**Last Updated**: May 7, 2026  
**Total Endpoints**: 38+  

---

## TABLE OF CONTENTS

1. [Feature 11: Message Scheduling](#feature-11-message-scheduling)
2. [Feature 12: Bookmarks & Polls](#feature-12-bookmarks--polls)
3. [Feature 13: Backup & Restore](#feature-13-backup--restore)
4. [Feature 14: Real-Time Optimization](#feature-14-real-time-optimization)
5. [Feature 15: Data Management](#feature-15-data-management)

---

## FEATURE 11: MESSAGE SCHEDULING

### 1. Schedule a Message
```http
POST /api/messaging/v4/scheduled
Content-Type: application/json
Authorization: Bearer {token}

{
  "chatId": "507f1f77bcf86cd799439011",
  "content": "Hello! This is a scheduled message.",
  "scheduledTime": "2026-05-10T15:30:00Z",
  "messageType": "text",
  "mediaUrls": [],
  "timezone": "UTC"
}
```

**Response** (201 Created):
```json
{
  "message": "Message scheduled successfully",
  "data": {
    "_id": "607f1f77bcf86cd799439012",
    "chatId": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439010",
    "content": "Hello! This is a scheduled message.",
    "scheduledTime": "2026-05-10T15:30:00Z",
    "status": "scheduled",
    "messageType": "text",
    "retryCount": 0,
    "createdAt": "2026-05-07T10:00:00Z"
  }
}
```

### 2. List Scheduled Messages
```http
GET /api/messaging/v4/scheduled?chatId={chatId}&status=scheduled&page=1&limit=10
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "messages": [
    {
      "_id": "607f1f77bcf86cd799439012",
      "chatId": "507f1f77bcf86cd799439011",
      "content": "Hello! This is a scheduled message.",
      "scheduledTime": "2026-05-10T15:30:00Z",
      "status": "scheduled"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

### 3. Update Scheduled Message
```http
PUT /api/messaging/v4/scheduled/{id}
Content-Type: application/json
Authorization: Bearer {token}

{
  "content": "Updated message content",
  "scheduledTime": "2026-05-10T16:00:00Z"
}
```

**Response** (200 OK): Updated message object

### 4. Cancel Scheduled Message
```http
DELETE /api/messaging/v4/scheduled/{id}
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "message": "Scheduled message cancelled successfully",
  "data": {
    "_id": "607f1f77bcf86cd799439012",
    "status": "cancelled"
  }
}
```

### 5. Set Message Expiration
```http
POST /api/messaging/v4/scheduled/messages/{messageId}/expire
Content-Type: application/json
Authorization: Bearer {token}

{
  "expiresInSeconds": 3600,
  "expirationType": "timed"
}
```

**Expiration Types**:
- `timed` - Delete after specified seconds
- `self-destruct-after-read` - Delete after user reads
- `self-destruct-after-view` - Delete after user views

**Response** (201 Created):
```json
{
  "message": "Message expiration set successfully",
  "data": {
    "_id": "607f1f77bcf86cd799439013",
    "messageId": "507f1f77bcf86cd799439020",
    "expiresAt": "2026-05-07T11:00:00Z",
    "expirationType": "timed"
  }
}
```

### 6. Enable Self-Destruct
```http
POST /api/messaging/v4/scheduled/messages/{messageId}/self-destruct
Content-Type: application/json
Authorization: Bearer {token}

{
  "timerSeconds": 10
}
```

**Response** (201 Created): Expiration object

---

## FEATURE 12: BOOKMARKS & POLLS

### Bookmark Endpoints

#### 1. Bookmark a Message
```http
POST /api/messaging/v4/bookmarks
Content-Type: application/json
Authorization: Bearer {token}

{
  "messageId": "507f1f77bcf86cd799439020",
  "tag": "important"
}
```

**Response** (201 Created):
```json
{
  "message": "Message bookmarked successfully",
  "data": {
    "_id": "607f1f77bcf86cd799439030",
    "userId": "507f1f77bcf86cd799439010",
    "messageId": "507f1f77bcf86cd799439020",
    "messageContent": "Saved message",
    "tag": "important",
    "star": false,
    "createdAt": "2026-05-07T10:00:00Z"
  }
}
```

#### 2. List Bookmarks
```http
GET /api/messaging/v4/bookmarks?tag=important&page=1&limit=20
Authorization: Bearer {token}
```

**Query Parameters**:
- `tag` - Filter by tag
- `folder` - Filter by folder
- `star` - Filter starred bookmarks (true/false)
- `page` - Page number
- `limit` - Items per page

**Response** (200 OK):
```json
{
  "bookmarks": [
    {
      "_id": "607f1f77bcf86cd799439030",
      "messageContent": "Important message",
      "tag": "important",
      "senderName": "John Doe",
      "createdAt": "2026-05-07T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

#### 3. Search Bookmarks
```http
GET /api/messaging/v4/bookmarks/search/{query}?tag=important&page=1&limit=20
Authorization: Bearer {token}
```

**Response** (200 OK): Bookmarks matching query

#### 4. Update Bookmark
```http
PUT /api/messaging/v4/bookmarks/{messageId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "tag": "urgent",
  "notes": "Follow up with John",
  "star": true
}
```

**Response** (200 OK): Updated bookmark

#### 5. Remove Bookmark
```http
DELETE /api/messaging/v4/bookmarks/{messageId}
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "message": "Bookmark removed successfully"
}
```

### Poll Endpoints

#### 1. Create Poll
```http
POST /api/messaging/v4/bookmarks/polls
Content-Type: application/json
Authorization: Bearer {token}

{
  "chatId": "507f1f77bcf86cd799439011",
  "question": "What's your favorite color?",
  "options": ["Red", "Blue", "Green", "Yellow"],
  "pollConfig": {
    "allowMultipleVotes": false,
    "isAnonymous": false,
    "pollType": "single-choice",
    "expiresAt": "2026-05-08T15:30:00Z"
  }
}
```

**Poll Types**:
- `single-choice` - Choose one option
- `multiple-choice` - Choose multiple options
- `rating` - Rate 1-5
- `ranking` - Rank options

**Response** (201 Created):
```json
{
  "message": "Poll created successfully",
  "data": {
    "_id": "607f1f77bcf86cd799439050",
    "chatId": "507f1f77bcf86cd799439011",
    "question": "What's your favorite color?",
    "options": [
      {"optionIndex": 0, "text": "Red"},
      {"optionIndex": 1, "text": "Blue"},
      {"optionIndex": 2, "text": "Green"},
      {"optionIndex": 3, "text": "Yellow"}
    ],
    "totalVotes": 0,
    "isClosed": false,
    "createdAt": "2026-05-07T10:00:00Z"
  }
}
```

#### 2. Vote on Poll
```http
POST /api/messaging/v4/bookmarks/polls/{pollId}/vote
Content-Type: application/json
Authorization: Bearer {token}

{
  "selectedOptions": [0]
}
```

**Response** (201 Created):
```json
{
  "message": "Vote recorded successfully",
  "data": {
    "_id": "607f1f77bcf86cd799439051",
    "pollId": "607f1f77bcf86cd799439050",
    "userId": "507f1f77bcf86cd799439010",
    "selectedOptions": [0],
    "createdAt": "2026-05-07T10:05:00Z"
  }
}
```

#### 3. Get Poll Results
```http
GET /api/messaging/v4/bookmarks/polls/{pollId}/results
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "message": "Poll results retrieved successfully",
  "data": {
    "poll": {
      "_id": "607f1f77bcf86cd799439050",
      "question": "What's your favorite color?"
    },
    "totalVotes": 4,
    "options": [
      {
        "optionIndex": 0,
        "text": "Red",
        "votes": 2,
        "percentage": 50
      },
      {
        "optionIndex": 1,
        "text": "Blue",
        "votes": 1,
        "percentage": 25
      },
      {
        "optionIndex": 2,
        "text": "Green",
        "votes": 1,
        "percentage": 25
      },
      {
        "optionIndex": 3,
        "text": "Yellow",
        "votes": 0,
        "percentage": 0
      }
    ]
  }
}
```

#### 4. Delete Poll
```http
DELETE /api/messaging/v4/bookmarks/polls/{pollId}
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "message": "Poll deleted successfully"
}
```

---

## FEATURE 13: BACKUP & RESTORE

### 1. Create Backup
```http
POST /api/messaging/v4/backups/create
Content-Type: application/json
Authorization: Bearer {token}

{
  "chatId": "507f1f77bcf86cd799439011",
  "backupType": "single-chat"
}
```

**Backup Types**:
- `single-chat` - Backup one chat
- `all-chats` - Backup all user chats
- `archive` - Create archive backup

**Response** (201 Created):
```json
{
  "message": "Backup initiated successfully",
  "data": {
    "_id": "607f1f77bcf86cd799439060",
    "userId": "507f1f77bcf86cd799439010",
    "chatId": "507f1f77bcf86cd799439011",
    "backupType": "single-chat",
    "status": "in-progress",
    "progress": 0,
    "createdAt": "2026-05-07T10:00:00Z"
  }
}
```

### 2. List Backups
```http
GET /api/messaging/v4/backups?status=completed&backupType=single-chat&page=1&limit=10
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "backups": [
    {
      "_id": "607f1f77bcf86cd799439060",
      "backupName": "backup_2026-05-07",
      "backupType": "single-chat",
      "status": "completed",
      "messageCount": 150,
      "mediaCount": 25,
      "backupSize": 5242880,
      "completedAt": "2026-05-07T10:15:00Z"
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

### 3. Restore from Backup
```http
POST /api/messaging/v4/backups/{backupId}/restore
Authorization: Bearer {token}
```

**Response** (201 Created):
```json
{
  "message": "Restoration initiated successfully",
  "data": {
    "_id": "607f1f77bcf86cd799439061",
    "backupId": "607f1f77bcf86cd799439060",
    "status": "pending",
    "progress": 0,
    "createdAt": "2026-05-07T10:20:00Z"
  }
}
```

### 4. Get Restoration Status
```http
GET /api/messaging/v4/backups/restore/{restoreId}/status
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "message": "Restoration status retrieved successfully",
  "data": {
    "_id": "607f1f77bcf86cd799439061",
    "status": "in-progress",
    "progress": 45,
    "processedMessages": 67,
    "totalMessages": 150,
    "startedAt": "2026-05-07T10:20:00Z",
    "estimatedTimeRemaining": 180
  }
}
```

### 5. Delete Backup
```http
DELETE /api/messaging/v4/backups/{backupId}
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "message": "Backup deleted successfully"
}
```

### 6. Download Backup
```http
GET /api/messaging/v4/backups/{backupId}/download
Authorization: Bearer {token}
```

**Response** (200 OK): File download

### 7. Export as JSON
```http
POST /api/messaging/v4/backups/export/json
Content-Type: application/json
Authorization: Bearer {token}

{
  "chatId": "507f1f77bcf86cd799439011"
}
```

**Response** (200 OK): JSON file download

### 8. Export as CSV
```http
POST /api/messaging/v4/backups/export/csv
Content-Type: application/json
Authorization: Bearer {token}

{
  "chatId": "507f1f77bcf86cd799439011"
}
```

**Response** (200 OK): CSV file download

---

## FEATURE 14: REAL-TIME OPTIMIZATION

### 1. Enable Optimizations
```http
POST /api/messaging/v4/optimize/enable
Content-Type: application/json
Authorization: Bearer {token}

{
  "enableDeltaSync": true,
  "enableCompression": true,
  "enableHeartbeat": true,
  "enableBatching": true
}
```

**Response** (200 OK):
```json
{
  "message": "Optimizations enabled successfully",
  "config": {
    "deltaSync": true,
    "compression": true,
    "heartbeat": true,
    "batching": true
  }
}
```

### 2. Get Performance Metrics
```http
GET /api/messaging/v4/optimize/metrics/performance?timeframe=24h
Authorization: Bearer {token}
```

**Timeframes**:
- `24h` - Last 24 hours
- `7d` - Last 7 days
- `30d` - Last 30 days

**Response** (200 OK):
```json
{
  "message": "Performance metrics retrieved successfully",
  "data": {
    "timeframe": "24h",
    "totalMetrics": 1250,
    "totalDuration": 125000,
    "eventMetrics": {
      "message-send": {
        "count": 250,
        "totalDuration": 25000,
        "avgDuration": 100,
        "minDuration": 50,
        "maxDuration": 500
      },
      "read-receipt": {
        "count": 300,
        "totalDuration": 18000,
        "avgDuration": 60,
        "minDuration": 30,
        "maxDuration": 200
      }
    }
  }
}
```

### 3. Get Latency Statistics
```http
GET /api/messaging/v4/optimize/metrics/latency?chatId={chatId}
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "message": "Latency statistics retrieved successfully",
  "data": {
    "sampleCount": 100,
    "avgLatency": 125,
    "minLatency": 50,
    "maxLatency": 500,
    "p95Latency": 350,
    "p99Latency": 450
  }
}
```

### 4. Send Heartbeat
```http
POST /api/messaging/v4/optimize/heartbeat
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "message": "Heartbeat recorded",
  "timestamp": "2026-05-07T10:30:00Z",
  "config": {
    "heartbeatEnabled": true,
    "interval": 30000,
    "type": "ping-pong",
    "expiresAfterMissed": 3
  }
}
```

### 5. Check Optimization Status
```http
GET /api/messaging/v4/optimize/status
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "optimizationsActive": true,
  "features": {
    "deltaSync": true,
    "compression": true,
    "batching": true,
    "heartbeat": true,
    "duplicateDetection": true
  },
  "timestamp": "2026-05-07T10:30:00Z"
}
```

---

## FEATURE 15: DATA MANAGEMENT

### 1. Get Detailed Statistics
```http
GET /api/messaging/v4/statistics/detailed?fromDate=2026-05-01&toDate=2026-05-07
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "message": "Detailed statistics retrieved successfully",
  "data": {
    "totalMessages": 1250,
    "totalChats": 15,
    "mediaMessages": 150,
    "messagesByType": {
      "text": 800,
      "image": 300,
      "video": 100,
      "audio": 50
    },
    "accountCreatedAt": "2025-01-15T08:00:00Z"
  }
}
```

### 2. Get Most Active Chats
```http
GET /api/messaging/v4/statistics/active-chats?limit=10
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "message": "Most active chats retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Team Discussion",
      "type": "group",
      "messageCount": 450,
      "lastMessageAt": "2026-05-07T09:30:00Z"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Direct Chat with John",
      "type": "direct",
      "messageCount": 320,
      "lastMessageAt": "2026-05-07T08:15:00Z"
    }
  ]
}
```

### 3. Get Message Trends
```http
GET /api/messaging/v4/statistics/trends?timeframe=month
Authorization: Bearer {token}
```

**Timeframes**:
- `week` - Daily breakdown for past 7 days
- `month` - Daily breakdown for past month
- `year` - Monthly breakdown for past year

**Response** (200 OK):
```json
{
  "message": "Message trends retrieved successfully",
  "data": {
    "timeframe": "month",
    "trends": [
      {
        "_id": "2026-05-01",
        "messageCount": 85,
        "mediaCount": 12
      },
      {
        "_id": "2026-05-02",
        "messageCount": 120,
        "mediaCount": 18
      }
    ]
  }
}
```

### 4. Get Media Usage Statistics
```http
GET /api/messaging/v4/statistics/media-usage
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "message": "Media usage statistics retrieved successfully",
  "data": {
    "totalMediaMessages": 150,
    "byType": [
      {
        "_id": "image",
        "count": 100,
        "totalSize": 104857600
      },
      {
        "_id": "video",
        "count": 30,
        "totalSize": 524288000
      },
      {
        "_id": "audio",
        "count": 20,
        "totalSize": 52428800
      }
    ]
  }
}
```

### 5. Set Retention Policy
```http
POST /api/messaging/v4/retention-policy
Content-Type: application/json
Authorization: Bearer {token}

{
  "messageRetentionDays": 365,
  "mediaRetentionDays": 90,
  "autoDeleteMode": "soft-delete",
  "autoArchiveAfterDays": 180
}
```

**Auto-Delete Modes**:
- `disabled` - No auto-deletion
- `soft-delete` - Mark as deleted (recoverable)
- `hard-delete` - Permanently delete

**Response** (201 Created):
```json
{
  "message": "Retention policy set successfully",
  "data": {
    "_id": "607f1f77bcf86cd799439070",
    "userId": "507f1f77bcf86cd799439010",
    "messageRetentionDays": 365,
    "mediaRetentionDays": 90,
    "autoDeleteMode": "soft-delete",
    "policyStatus": "active",
    "statistics": {
      "totalMessagesDeleted": 0,
      "nextExecutionAt": "2026-05-14T03:00:00Z"
    }
  }
}
```

### 6. Get Retention Policy
```http
GET /api/messaging/v4/retention-policy
Authorization: Bearer {token}
```

**Response** (200 OK): Retention policy object

### 7. Archive Old Messages
```http
POST /api/messaging/v4/data/archive
Content-Type: application/json
Authorization: Bearer {token}

{
  "olderThanDays": 365
}
```

**Response** (200 OK):
```json
{
  "message": "Messages archived successfully",
  "data": {
    "archivedCount": 500
  }
}
```

### 8. Export User Data (GDPR)
```http
POST /api/messaging/v4/data/export
Authorization: Bearer {token}
```

**Response** (200 OK): JSON file with all user data
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439010",
    "username": "johndoe",
    "email": "john@example.com",
    "createdAt": "2025-01-15T08:00:00Z"
  },
  "statistics": {
    "totalMessages": 1250,
    "totalChats": 15,
    "mediaMessages": 150
  },
  "chats": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Team Discussion",
      "type": "group"
    }
  ],
  "messageCount": 1250,
  "exportedAt": "2026-05-07T10:40:00Z"
}
```

---

## ERROR RESPONSES

### 400 Bad Request
```json
{
  "error": "Missing required fields: chatId, content, scheduledTime"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized access"
}
```

### 404 Not Found
```json
{
  "error": "Backup not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

**Documentation Version**: 1.0  
**Last Updated**: May 7, 2026  
**API Compatibility**: Phase 1-4  
**Authentication**: JWT Bearer Token Required
