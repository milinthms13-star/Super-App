# Phase 3 Quick Reference Guide

## Quick Start

### Install & Run
```bash
cd backend
npm install          # If needed
node server.js       # Starts with Phase 3 routes
```

### Authentication
All requests require Bearer token header:
```bash
Authorization: Bearer <JWT_TOKEN>
```

---

## Feature 6: Analytics 📊

### Get User Analytics
```bash
GET /api/messaging/analytics/v3/user-insights

Response:
{
  "success": true,
  "data": {
    "messageFrequency": {...},
    "hourlyDistribution": {...},
    "responseMetrics": {...},
    "contactHeatmap": {...}
  }
}
```

### Get Real-Time Dashboard (Admin)
```bash
GET /api/messaging/analytics/v3/real-time-dashboard

Response:
{
  "success": true,
  "data": {
    "liveMessageCount": 1234,
    "activeUsersCount": 567,
    "systemHealth": "healthy"
  }
}
```

### Export Analytics
```bash
GET /api/messaging/analytics/v3/export

Response: CSV file download
```

---

## Feature 7: Groups & Channels 👥

### Create Group
```bash
POST /api/messaging/v3/groups
Content-Type: application/json

{
  "name": "Project Team",
  "description": "Q4 Project Team",
  "isPublic": false
}

Response:
{
  "success": true,
  "data": {
    "id": "group123",
    "name": "Project Team",
    "createdBy": "user456",
    "admins": ["user456"]
  }
}
```

### List My Groups
```bash
GET /api/messaging/v3/groups?filter=active

Response:
{
  "success": true,
  "data": [
    { "id": "...", "name": "...", "memberCount": 5 },
    ...
  ]
}
```

### Add Member to Group
```bash
POST /api/messaging/v3/groups/group123/members
Content-Type: application/json

{
  "userId": "newuser789"
}

Response:
{
  "success": true,
  "message": "Member added successfully"
}
```

### Promote to Admin
```bash
POST /api/messaging/v3/groups/group123/members/user789/promote

Response:
{
  "success": true,
  "message": "User promoted to admin"
}
```

### Mute Member
```bash
POST /api/messaging/v3/groups/group123/members/user789/mute
Content-Type: application/json

{
  "reason": "Spam",
  "durationMs": 3600000  // 1 hour
}
```

### Create Channel
```bash
POST /api/messaging/v3/channels
Content-Type: application/json

{
  "name": "announcements",
  "displayName": "Announcements",
  "topic": "announcements",
  "isPublic": true
}

Response:
{
  "success": true,
  "data": { "id": "channel123", "name": "announcements" }
}
```

### Subscribe to Channel
```bash
POST /api/messaging/v3/channels/channel123/subscribe

Response:
{
  "success": true,
  "message": "Subscribed successfully"
}
```

---

## Feature 8: Search 🔍

### Basic Search
```bash
GET /api/messaging/v3/search?q=meeting&limit=20

Response:
{
  "success": true,
  "data": [
    {
      "id": "msg123",
      "content": "...",
      "sender": "user456",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    ...
  ]
}
```

### Advanced Search
```bash
GET /api/messaging/v3/search/advanced?q=from:john date:2024-01-15 project

Syntax:
  from:username       - Messages from specific user
  date:YYYY-MM-DD     - Specific date
  before:YYYY-MM-DD   - Before date
  after:YYYY-MM-DD    - After date
  type:text           - Filter by type
```

### Fuzzy Search (Typo-Tolerant)
```bash
GET /api/messaging/v3/search/fuzzy?q=meting

Response: Matches "meeting" despite typo
```

### Trending Keywords
```bash
GET /api/messaging/v3/search/trending-keywords?timeRange=7&limit=20

Response:
{
  "success": true,
  "data": [
    { "keyword": "#project", "count": 156 },
    { "keyword": "#meeting", "count": 142 },
    ...
  ]
}
```

### Search by Date Range
```bash
GET /api/messaging/v3/search/by-date?fromDate=2024-01-01&toDate=2024-01-31

Response: All messages within date range
```

---

## Feature 9: Reactions & Editing 😊

### Add Reaction
```bash
POST /api/messaging/v3/reactions
Content-Type: application/json

{
  "messageId": "msg123",
  "emoji": "👍"
}

Response:
{
  "success": true,
  "data": {
    "id": "reaction456",
    "messageId": "msg123",
    "emoji": "👍"
  }
}
```

### Remove Reaction
```bash
DELETE /api/messaging/v3/reactions/reaction456

Response:
{
  "success": true,
  "message": "Reaction removed"
}
```

### Get Reactions on Message
```bash
GET /api/messaging/v3/messages/msg123/reactions

Response:
{
  "success": true,
  "data": {
    "reactions": [...],
    "summary": {
      "👍": { "count": 5, "reactors": ["user1", "user2", ...] },
      "❤️": { "count": 3, "reactors": [...] }
    }
  }
}
```

### Who Reacted
```bash
GET /api/messaging/v3/reactions/reactors/msg123?emoji=👍

Response:
{
  "success": true,
  "data": [
    { "userId": "user1", "name": "John" },
    { "userId": "user2", "name": "Jane" }
  ]
}
```

### Edit Message
```bash
PUT /api/messaging/v3/messages/msg123
Content-Type: application/json

{
  "content": "Updated message content",
  "reason": "Typo fix"
}

Response:
{
  "success": true,
  "data": {
    "id": "msg123",
    "content": "Updated message content",
    "edited": true
  }
}
```

### Get Edit History
```bash
GET /api/messaging/v3/messages/msg123/edit-history

Response:
{
  "success": true,
  "data": [
    {
      "originalContent": "...",
      "newContent": "...",
      "editedAt": "2024-01-15T10:30:00Z",
      "reason": "Typo fix"
    },
    ...
  ]
}
```

### Delete Message
```bash
DELETE /api/messaging/v3/messages/msg123

Response:
{
  "success": true,
  "message": "Message deleted"
}
```

### Format Preview
```bash
POST /api/messaging/v3/reactions/format-preview
Content-Type: application/json

{
  "content": "**Bold** and *italic* text"
}

Response:
{
  "success": true,
  "data": {
    "preview": "Bold and italic text",
    "formatted": "<b>Bold</b> and <i>italic</i> text",
    "mentions": [],
    "hashtags": []
  }
}
```

### Trending Reactions
```bash
GET /api/messaging/v3/trending-reactions?timeRange=7&limit=10

Response:
{
  "success": true,
  "data": [
    { "emoji": "👍", "count": 2456 },
    { "emoji": "❤️", "count": 1834 },
    ...
  ]
}
```

---

## Feature 10: Offline Sync 📱

### Queue Message for Offline Delivery
```bash
POST /api/messaging/v3/sync/queue
Content-Type: application/json

{
  "deviceId": "device123",
  "action": "sendMessage",
  "clientMessageId": "client456",
  "conversationId": "conv789",
  "payload": {
    "content": "Hello",
    "conversationId": "conv789"
  }
}

Response:
{
  "success": true,
  "data": {
    "id": "queue123",
    "status": "pending",
    "retryCount": 0
  }
}
```

### Get Pending Messages
```bash
GET /api/messaging/v3/sync/pending?deviceId=device123

Response:
{
  "success": true,
  "data": [
    {
      "id": "queue123",
      "action": "sendMessage",
      "status": "pending",
      "payload": {...}
    },
    ...
  ],
  "count": 5
}
```

### Get Failed Messages
```bash
GET /api/messaging/v3/sync/failed?deviceId=device123

Response: Failed messages list
```

### Full Sync
```bash
POST /api/messaging/v3/sync
Content-Type: application/json

{
  "deviceId": "device123",
  "lastSyncTimestamp": "2024-01-15T10:00:00Z",
  "limit": 100
}

Response:
{
  "success": true,
  "data": [
    { "id": "msg123", "content": "..." },
    { "id": "msg124", "content": "..." }
  ],
  "syncTimestamp": "2024-01-15T10:05:00Z"
}
```

### Batch Sync
```bash
POST /api/messaging/v3/sync/batch
Content-Type: application/json

{
  "deviceId": "device123",
  "operations": [
    { "action": "syncPending", "params": {} },
    { "action": "markRead", "params": { "messageId": "msg123" } }
  ]
}

Response:
{
  "success": true,
  "data": [...]
}
```

### Update Message Status
```bash
POST /api/messaging/v3/sync/status
Content-Type: application/json

{
  "messageStatuses": [
    { "messageId": "msg123", "status": "delivered" },
    { "messageId": "msg124", "status": "read" }
  ]
}

Response:
{
  "success": true,
  "updatedCount": 2
}
```

### Get Sync Metadata
```bash
GET /api/messaging/v3/sync/metadata

Response:
{
  "success": true,
  "data": {
    "lastSyncTime": "2024-01-15T10:05:00Z",
    "syncToken": "token123",
    "pendingCount": 3
  }
}
```

### Get Sync Statistics
```bash
GET /api/messaging/v3/sync/statistics

Response:
{
  "success": true,
  "data": {
    "totalQueued": 150,
    "totalSynced": 145,
    "totalFailed": 5,
    "successRate": 96.7
  }
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional context"
}
```

### Common Status Codes
- `200` - OK
- `201` - Created
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing auth)
- `403` - Forbidden (no permission)
- `404` - Not found
- `500` - Server error

---

## Rich Text Formatting

### Markdown Support
```markdown
**bold text**           →  Bold
*italic text*           →  Italic
`inline code`           →  Monospace
```code block```         →  Code block
[link text](url)        →  Clickable link
@username               →  Mention (auto-parsed)
#hashtag                →  Hashtag (auto-parsed)
```

---

## Permissions & Roles

### Group Roles
- **Owner**: Full control, can delete group
- **Admin**: Manage members, moderate, pin messages
- **Moderator**: Moderate, pin messages
- **Member**: Send/receive messages

### Permission Flags (GroupMember)
- canPostMessages
- canEditOwnMessages
- canDeleteOwnMessages
- canReact
- canSearch
- canViewMembers
- canViewAnalytics
- (and 5 more)

---

## Database Collections Reference

### Phase 3 Collections
| Collection | Purpose | Indexes |
|-----------|---------|---------|
| chatgroups | Multi-user groups | 6 compound |
| groupmembers | Group membership | 1 unique |
| channels | Topic channels | 5 compound |
| channelsubscriptions | Channel subscriptions | 1 unique |
| messagereactions | Emoji reactions | 1 unique |
| edithistory | Edit audit trail | 1 on messageId |
| offlinequeues | Offline messages | 1 compound + 1 TTL |

---

## Tips & Best Practices

1. **Always include deviceId** for sync operations
2. **Use advanced search syntax** for complex queries
3. **Batch operations** when possible for better performance
4. **Monitor sync statistics** to detect issues
5. **Subscribe to public channels** for announcements
6. **Use mute instead of remove** for temporary silencing
7. **Save frequently used searches** for quick access
8. **Check trending keywords** for community insights
9. **Review edit history** for transparency
10. **Clean up expired offline items** regularly

---

## Support

For issues or questions:
1. Check error response details
2. Verify authentication token
3. Ensure deviceId matches
4. Check collection in MongoDB
5. Review service logs
