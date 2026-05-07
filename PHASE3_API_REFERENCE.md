# Phase 3 API Reference - Complete Endpoint Documentation

## Table of Contents
1. [Analytics Endpoints](#analytics-endpoints)
2. [Group Management Endpoints](#group-management-endpoints)
3. [Search Endpoints](#search-endpoints)
4. [Reaction Endpoints](#reaction-endpoints)
5. [Sync Endpoints](#sync-endpoints)

---

# Analytics Endpoints

## Feature 6: Message Analytics & Insights

### GET /api/messaging/analytics/v3/user-insights

**Description**: Retrieve comprehensive messaging analytics for the authenticated user

**Authentication**: Required ✅  
**Authorization**: User can access own data  
**Method**: GET

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| timeRange | string | No | Time range (7d, 30d, 90d) - default: 30d |
| groupBy | string | No | Group by (hour, day, week, month) - default: day |

**Request Example**:
```bash
curl -X GET "http://localhost:5000/api/messaging/analytics/v3/user-insights?timeRange=30d" \
  -H "Authorization: Bearer JWT_TOKEN"
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "messageFrequency": {
      "total": 450,
      "averagePerDay": 15,
      "averagePerHour": 0.625
    },
    "hourlyDistribution": [
      { "hour": 9, "count": 45 },
      { "hour": 10, "count": 52 },
      ...
    ],
    "messageTypes": {
      "text": 350,
      "file": 45,
      "media": 55
    },
    "totalStats": {
      "uniqueConversations": 12,
      "uniqueContacts": 45,
      "firstMessageTime": "2024-01-01T08:00:00Z"
    },
    "responseMetrics": {
      "averageResponseTime": 3600000,
      "responseRate": 95.2
    },
    "contactHeatmap": [
      { "userId": "user123", "messageCount": 85, "lastMessage": "2024-01-15T10:30:00Z" },
      ...
    ]
  }
}
```

**Error Responses**:
```json
{
  "success": false,
  "error": "Failed to fetch analytics",
  "details": "error message"
}
```

---

### GET /api/messaging/analytics/v3/real-time-dashboard

**Description**: Get real-time messaging metrics (Admin only)

**Authentication**: Required ✅  
**Authorization**: Admin only 🔒  
**Method**: GET

**Request Example**:
```bash
curl -X GET "http://localhost:5000/api/messaging/analytics/v3/real-time-dashboard" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "liveMessageCount": 1234,
    "activeUsersCount": 567,
    "messagesTrend": {
      "lastHour": 245,
      "lastDay": 4850,
      "trend": "up"
    },
    "systemHealth": "healthy",
    "serverLoad": 45.3,
    "databaseLatency": 12.5,
    "timestamp": "2024-01-15T10:35:00Z"
  }
}
```

---

### GET /api/messaging/analytics/v3/platform-insights

**Description**: Get platform-wide analytics (Admin only)

**Authentication**: Required ✅  
**Authorization**: Admin only 🔒  
**Method**: GET

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| period | string | No | Period (daily, weekly, monthly) - default: daily |
| days | number | No | Number of days to analyze - default: 30 |

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "timeSeries": [
      { "date": "2024-01-01", "messages": 1200, "users": 450 },
      ...
    ],
    "topUsers": [
      { "userId": "user123", "messages": 2456, "rank": 1 },
      ...
    ],
    "engagement": {
      "totalMessages": 125000,
      "totalUsers": 5000,
      "averageMessagesPerUser": 25,
      "engagementRate": 78.5
    },
    "abusePatterns": {
      "reportedMessages": 45,
      "suspiciousUsers": 12,
      "blockedMessages": 8
    }
  }
}
```

---

### GET /api/messaging/analytics/v3/export

**Description**: Export user analytics as CSV file

**Authentication**: Required ✅  
**Authorization**: User can export own data  
**Method**: GET

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| timeRange | string | No | Time range (7d, 30d, 90d) - default: 30d |
| format | string | No | Format (csv, json) - default: csv |

**Response (200 OK)**:
```
Content-Type: text/csv

userId,date,messageCount,uniqueContacts,responseRate
user123,2024-01-01,15,5,95.2
user123,2024-01-02,12,4,92.1
...
```

---

# Group Management Endpoints

## Feature 7: Group Chats & Channels

### POST /api/messaging/v3/groups

**Description**: Create a new group chat

**Authentication**: Required ✅  
**Authorization**: Any authenticated user  
**Method**: POST

**Request Body**:
```json
{
  "name": "Project Team Q4",
  "description": "Q4 project planning and execution",
  "avatar": "https://example.com/avatar.jpg",
  "isPublic": false,
  "e2eeEnabled": true
}
```

**Validation Rules**:
- `name`: Required, 3-100 characters
- `description`: Optional, max 500 characters
- `isPublic`: Optional, default false
- `e2eeEnabled`: Optional, default false

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "group_507f1f77bcf86cd799439011",
    "name": "Project Team Q4",
    "description": "Q4 project planning and execution",
    "avatar": "https://example.com/avatar.jpg",
    "createdBy": "user_507f1f77bcf86cd799439012",
    "admins": ["user_507f1f77bcf86cd799439012"],
    "memberCount": 1,
    "isPublic": false,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "message": "Group created successfully"
}
```

**Error Responses**:
```json
{
  "success": false,
  "error": "Group name must be 3-100 characters",
  "details": "Validation failed"
}
```

---

### GET /api/messaging/v3/groups

**Description**: List all groups for the authenticated user

**Authentication**: Required ✅  
**Authorization**: User can access own groups  
**Method**: GET

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| filter | string | No | Filter (active, archived, all) - default: active |
| limit | number | No | Results per page - default: 20 |
| offset | number | No | Pagination offset - default: 0 |

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "group_507f1f77bcf86cd799439011",
      "name": "Project Team Q4",
      "description": "Q4 project planning",
      "memberCount": 5,
      "lastActivityAt": "2024-01-15T10:30:00Z",
      "isArchived": false
    },
    ...
  ],
  "total": 12,
  "limit": 20,
  "offset": 0
}
```

---

### GET /api/messaging/v3/groups/:groupId

**Description**: Get detailed information about a specific group

**Authentication**: Required ✅  
**Authorization**: Group member or admin  
**Method**: GET

**URL Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| groupId | string | Yes | Unique group ID |

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "group_507f1f77bcf86cd799439011",
    "name": "Project Team Q4",
    "description": "Q4 project planning",
    "createdBy": "user_507f1f77bcf86cd799439012",
    "admins": ["user_507f1f77bcf86cd799439012"],
    "memberCount": 5,
    "isPublic": false,
    "e2eeEnabled": true,
    "pinnedMessage": "message_id_123",
    "createdAt": "2024-01-01T00:00:00Z",
    "lastActivityAt": "2024-01-15T10:30:00Z",
    "isArchived": false
  }
}
```

---

### PUT /api/messaging/v3/groups/:groupId

**Description**: Update group details (Admin only)

**Authentication**: Required ✅  
**Authorization**: Group admin only 🔒  
**Method**: PUT

**Request Body**:
```json
{
  "name": "Updated Group Name",
  "description": "Updated description",
  "avatar": "https://example.com/new-avatar.jpg",
  "e2eeEnabled": true
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "group_507f1f77bcf86cd799439011",
    "name": "Updated Group Name",
    "description": "Updated description"
  },
  "message": "Group updated successfully"
}
```

---

### POST /api/messaging/v3/groups/:groupId/members

**Description**: Add a member to the group

**Authentication**: Required ✅  
**Authorization**: Group admin  
**Method**: POST

**Request Body**:
```json
{
  "userId": "user_507f1f77bcf86cd799439013",
  "role": "member"
}
```

**Role Options**: `owner`, `admin`, `moderator`, `member`

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "groupId": "group_507f1f77bcf86cd799439011",
    "userId": "user_507f1f77bcf86cd799439013",
    "role": "member",
    "joinedAt": "2024-01-15T10:30:00Z"
  },
  "message": "Member added successfully"
}
```

---

### DELETE /api/messaging/v3/groups/:groupId/members/:userId

**Description**: Remove a member from the group

**Authentication**: Required ✅  
**Authorization**: Group admin or group moderator  
**Method**: DELETE

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

---

### GET /api/messaging/v3/groups/:groupId/members

**Description**: List all members in a group

**Authentication**: Required ✅  
**Authorization**: Group member  
**Method**: GET

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| role | string | No | Filter by role (admin, member) |
| limit | number | No | Results per page - default: 50 |
| offset | number | No | Pagination offset - default: 0 |

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "userId": "user_507f1f77bcf86cd799439012",
      "name": "John Doe",
      "role": "admin",
      "joinedAt": "2024-01-01T00:00:00Z",
      "permissions": {
        "canPostMessages": true,
        "canEditOwnMessages": true,
        ...
      }
    },
    ...
  ],
  "total": 5
}
```

---

### POST /api/messaging/v3/groups/:groupId/members/:userId/promote

**Description**: Promote member to admin

**Authentication**: Required ✅  
**Authorization**: Group admin  
**Method**: POST

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "User promoted to admin",
  "data": {
    "userId": "user_507f1f77bcf86cd799439013",
    "role": "admin"
  }
}
```

---

### POST /api/messaging/v3/groups/:groupId/members/:userId/demote

**Description**: Demote admin to member

**Authentication**: Required ✅  
**Authorization**: Group admin  
**Method**: POST

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "User demoted to member",
  "data": {
    "userId": "user_507f1f77bcf86cd799439013",
    "role": "member"
  }
}
```

---

### POST /api/messaging/v3/groups/:groupId/members/:userId/mute

**Description**: Mute a group member

**Authentication**: Required ✅  
**Authorization**: Group admin/moderator  
**Method**: POST

**Request Body**:
```json
{
  "reason": "Spam",
  "durationMs": 3600000,
  "message": "Please follow community guidelines"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Member muted successfully",
  "data": {
    "userId": "user_507f1f77bcf86cd799439013",
    "isMuted": true,
    "mutedUntil": "2024-01-15T11:30:00Z"
  }
}
```

---

### POST /api/messaging/v3/groups/:groupId/members/:userId/ban

**Description**: Ban a group member

**Authentication**: Required ✅  
**Authorization**: Group admin  
**Method**: POST

**Request Body**:
```json
{
  "reason": "Harassment",
  "message": "You have been banned for violation of community guidelines"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Member banned successfully",
  "data": {
    "userId": "user_507f1f77bcf86cd799439013",
    "isBanned": true,
    "bannedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### POST /api/messaging/v3/channels

**Description**: Create a new channel

**Authentication**: Required ✅  
**Authorization**: Any authenticated user  
**Method**: POST

**Request Body**:
```json
{
  "name": "announcements",
  "displayName": "Announcements",
  "description": "Important announcements",
  "topic": "announcements",
  "isPublic": true,
  "autoModeration": true,
  "messageRetentionDays": 90
}
```

**Valid Topics**: `announcements`, `general`, `support`, `feedback`, `other`

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "channel_507f1f77bcf86cd799439011",
    "name": "announcements",
    "displayName": "Announcements",
    "createdBy": "user_507f1f77bcf86cd799439012",
    "isPublic": true,
    "subscriberCount": 0,
    "messageCount": 0,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### GET /api/messaging/v3/channels

**Description**: List all channels

**Authentication**: Required ✅  
**Method**: GET

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| filter | string | No | Filter (subscribed, all, public) - default: all |
| topic | string | No | Filter by topic |
| limit | number | No | Results per page - default: 20 |

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "channel_507f1f77bcf86cd799439011",
      "name": "announcements",
      "displayName": "Announcements",
      "topic": "announcements",
      "subscriberCount": 1250,
      "messageCount": 456,
      "isSubscribed": true
    },
    ...
  ]
}
```

---

### POST /api/messaging/v3/channels/:channelId/subscribe

**Description**: Subscribe to a channel

**Authentication**: Required ✅  
**Method**: POST

**Request Body**:
```json
{
  "notificationLevel": "mentions"
}
```

**Notification Levels**: `all`, `mentions`, `important`, `none`

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Subscribed to channel",
  "data": {
    "channelId": "channel_507f1f77bcf86cd799439011",
    "isSubscribed": true,
    "subscribedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### POST /api/messaging/v3/channels/:channelId/unsubscribe

**Description**: Unsubscribe from a channel

**Authentication**: Required ✅  
**Method**: POST

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Unsubscribed from channel",
  "data": {
    "channelId": "channel_507f1f77bcf86cd799439011",
    "isSubscribed": false,
    "unsubscribedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### GET /api/messaging/v3/channels/:channelId/subscribers

**Description**: List channel subscribers (moderator only)

**Authentication**: Required ✅  
**Authorization**: Channel moderator  
**Method**: GET

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "userId": "user_507f1f77bcf86cd799439012",
      "name": "John Doe",
      "subscribedAt": "2024-01-01T00:00:00Z",
      "notificationLevel": "mentions"
    },
    ...
  ],
  "total": 1250
}
```

---

### POST /api/messaging/v3/groups/:groupId/pin-message

**Description**: Pin a message in a group (moderator only)

**Authentication**: Required ✅  
**Authorization**: Group moderator/admin  
**Method**: POST

**Request Body**:
```json
{
  "messageId": "message_507f1f77bcf86cd799439011"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Message pinned successfully",
  "data": {
    "groupId": "group_507f1f77bcf86cd799439011",
    "messageId": "message_507f1f77bcf86cd799439011",
    "pinnedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

# Search Endpoints

## Feature 8: Message Search & Discovery

### GET /api/messaging/v3/search

**Description**: Basic keyword search

**Authentication**: Required ✅  
**Method**: GET

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query |
| conversationId | string | No | Filter by conversation |
| senderId | string | No | Filter by sender |
| fromDate | string | No | Start date (ISO 8601) |
| toDate | string | No | End date (ISO 8601) |
| type | string | No | Message type (text, file, media) |
| limit | number | No | Results per page - default: 20 |
| offset | number | No | Pagination offset - default: 0 |

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "message_507f1f77bcf86cd799439011",
      "content": "Meeting at 3 PM today",
      "sender": {
        "id": "user_507f1f77bcf86cd799439012",
        "name": "John Doe"
      },
      "conversationId": "conv_507f1f77bcf86cd799439013",
      "createdAt": "2024-01-15T10:30:00Z",
      "matchScore": 0.95
    },
    ...
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

---

### GET /api/messaging/v3/search/advanced

**Description**: Advanced search with syntax support

**Authentication**: Required ✅  
**Method**: GET

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query with syntax |

**Search Syntax**:
```
from:username           Filter by sender username
date:YYYY-MM-DD         Messages from specific date
before:YYYY-MM-DD       Before specific date
after:YYYY-MM-DD        After specific date
type:text               Filter by type
has:attachment          Messages with attachments
keyword1 keyword2       AND operator (both must match)
```

**Example Query**:
```
GET /api/messaging/v3/search/advanced?q=from:john after:2024-01-01 meeting
```

**Response**: Same as basic search with syntax-parsed results

---

### GET /api/messaging/v3/search/fuzzy

**Description**: Fuzzy search with typo tolerance

**Authentication**: Required ✅  
**Method**: GET

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query (typos tolerated) |
| limit | number | No | Results per page - default: 20 |

**Example**: Query "meting" returns results for "meeting"

**Response**: Same as basic search

---

### GET /api/messaging/v3/search/by-sender/:senderId

**Description**: Get all messages from a specific sender

**Authentication**: Required ✅  
**Method**: GET

**URL Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| senderId | string | Yes | User ID of sender |

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | number | No | Results per page - default: 50 |
| offset | number | No | Pagination offset - default: 0 |

**Response**: Array of messages from sender

---

### GET /api/messaging/v3/search/by-date

**Description**: Search messages within date range

**Authentication**: Required ✅  
**Method**: GET

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| fromDate | string | Yes | Start date (ISO 8601) |
| toDate | string | Yes | End date (ISO 8601) |
| limit | number | No | Results per page - default: 50 |

**Response**: Array of messages within date range

---

### GET /api/messaging/v3/search/trending-keywords

**Description**: Get trending keywords/hashtags

**Authentication**: Required ✅  
**Method**: GET

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| timeRange | number | No | Days to analyze - default: 7 |
| limit | number | No | Top results - default: 20 |

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    { "keyword": "#project", "count": 156, "trend": "up" },
    { "keyword": "#meeting", "count": 142, "trend": "stable" },
    { "keyword": "#deadline", "count": 98, "trend": "down" },
    ...
  ],
  "timeRange": 7,
  "limit": 20
}
```

---

### GET /api/messaging/v3/search/history

**Description**: Get user's search history

**Authentication**: Required ✅  
**Method**: GET

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | number | No | Recent searches - default: 20 |

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "search_507f1f77bcf86cd799439011",
      "query": "meeting",
      "resultCount": 45,
      "searchedAt": "2024-01-15T10:30:00Z",
      "saved": false
    },
    ...
  ]
}
```

---

### POST /api/messaging/v3/search/save

**Description**: Save a search for quick access

**Authentication**: Required ✅  
**Method**: POST

**Request Body**:
```json
{
  "query": "from:john after:2024-01-01",
  "name": "John's Recent Messages",
  "description": "All messages from John since Jan 1"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "saved_search_507f1f77bcf86cd799439011",
    "name": "John's Recent Messages",
    "query": "from:john after:2024-01-01",
    "savedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### GET /api/messaging/v3/search/export

**Description**: Export search results as CSV

**Authentication**: Required ✅  
**Method**: GET

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query |
| format | string | No | Format (csv, json) - default: csv |

**Response (200 OK)**:
```
Content-Type: text/csv

messageId,sender,senderName,content,conversationId,createdAt,messageType
msg123,user456,John Doe,Meeting at 3 PM,conv789,2024-01-15T10:30:00Z,text
...
```

---

# Reaction Endpoints

## Feature 9: Message Reactions & Editing

### POST /api/messaging/v3/reactions

**Description**: Add emoji reaction to a message

**Authentication**: Required ✅  
**Method**: POST

**Request Body**:
```json
{
  "messageId": "message_507f1f77bcf86cd799439011",
  "emoji": "👍"
}
```

**Valid Emoji**: Any valid Unicode emoji

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "reaction_507f1f77bcf86cd799439011",
    "messageId": "message_507f1f77bcf86cd799439011",
    "userId": "user_507f1f77bcf86cd799439012",
    "emoji": "👍",
    "type": "emoji",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "message": "Reaction added successfully"
}
```

---

### DELETE /api/messaging/v3/reactions/:reactionId

**Description**: Remove a reaction

**Authentication**: Required ✅  
**Authorization**: Reaction owner or admin  
**Method**: DELETE

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Reaction removed successfully"
}
```

---

### GET /api/messaging/v3/messages/:messageId/reactions

**Description**: Get all reactions on a message

**Authentication**: Required ✅  
**Method**: GET

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "reactions": [
      {
        "id": "reaction_507f1f77bcf86cd799439011",
        "userId": "user_507f1f77bcf86cd799439012",
        "emoji": "👍"
      },
      ...
    ],
    "summary": {
      "👍": {
        "count": 5,
        "reactors": [
          { "userId": "user1", "name": "John" },
          { "userId": "user2", "name": "Jane" },
          ...
        ]
      },
      "❤️": {
        "count": 3,
        "reactors": [...]
      }
    }
  }
}
```

---

### GET /api/messaging/v3/reactions/reactors/:messageId

**Description**: Get users who reacted with specific emoji

**Authentication**: Required ✅  
**Method**: GET

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| emoji | string | Yes | Emoji to filter by |

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    { "userId": "user_507f1f77bcf86cd799439012", "name": "John Doe" },
    { "userId": "user_507f1f77bcf86cd799439013", "name": "Jane Smith" },
    ...
  ],
  "emoji": "👍"
}
```

---

### GET /api/messaging/v3/reactions/counts/:messageId

**Description**: Get reaction count summary

**Authentication**: Required ✅  
**Method**: GET

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    { "emoji": "👍", "count": 5 },
    { "emoji": "❤️", "count": 3 },
    { "emoji": "😂", "count": 2 },
    ...
  ],
  "totalReactions": 10
}
```

---

### PUT /api/messaging/v3/messages/:messageId

**Description**: Edit a message (24-hour window)

**Authentication**: Required ✅  
**Authorization**: Message owner or admin  
**Method**: PUT

**Request Body**:
```json
{
  "content": "Updated message content",
  "reason": "Typo fix"
}
```

**Edit Window**: 24 hours from message creation

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "message_507f1f77bcf86cd799439011",
    "content": "Updated message content",
    "edited": true,
    "editedAt": "2024-01-15T10:35:00Z"
  },
  "message": "Message edited successfully"
}
```

**Error (403 Forbidden - Edit Window Expired)**:
```json
{
  "success": false,
  "error": "Edit window expired (24 hours)",
  "details": "Message cannot be edited after 24 hours"
}
```

---

### DELETE /api/messaging/v3/messages/:messageId

**Description**: Soft delete a message

**Authentication**: Required ✅  
**Authorization**: Message owner or admin  
**Method**: DELETE

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

**Note**: Soft delete marks message as deleted but keeps record for audit trail

---

### DELETE /api/messaging/v3/messages/:messageId/permanent

**Description**: Permanently delete a message (admin only)

**Authentication**: Required ✅  
**Authorization**: Admin only 🔒  
**Method**: DELETE

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Message permanently deleted"
}
```

**Note**: Hard delete removes all traces and reactions

---

### GET /api/messaging/v3/messages/:messageId/edit-history

**Description**: Get message edit history

**Authentication**: Required ✅  
**Method**: GET

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "edit_507f1f77bcf86cd799439011",
      "messageId": "message_507f1f77bcf86cd799439012",
      "originalContent": "Original message text",
      "newContent": "Edited message text",
      "editedAt": "2024-01-15T10:35:00Z",
      "reason": "Typo fix"
    },
    ...
  ],
  "editCount": 2
}
```

---

### POST /api/messaging/v3/reactions/format-preview

**Description**: Get markdown preview and formatting

**Authentication**: Required ✅  
**Method**: POST

**Request Body**:
```json
{
  "content": "**Bold text** and *italic text* with #hashtag and @john",
  "maxLength": 200
}
```

**Supported Markdown**:
- `**text**` → Bold
- `*text*` → Italic
- `` `code` `` → Monospace
- ` ```code``` ` → Code block
- `[text](url)` → Link
- `@username` → Mention
- `#hashtag` → Hashtag

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "preview": "Bold text and italic text with #hashtag and @john",
    "formatted": "<b>Bold text</b> and <i>italic text</i> with #hashtag and @john",
    "mentions": ["john"],
    "hashtags": ["hashtag"],
    "isEmpty": false
  }
}
```

---

### GET /api/messaging/v3/trending-reactions

**Description**: Get trending emoji reactions

**Authentication**: Required ✅  
**Method**: GET

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| timeRange | number | No | Days to analyze - default: 7 |
| limit | number | No | Top results - default: 20 |

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    { "emoji": "👍", "count": 2456, "trend": "up" },
    { "emoji": "❤️", "count": 1834, "trend": "stable" },
    { "emoji": "😂", "count": 1567, "trend": "up" },
    ...
  ],
  "timeRange": 7,
  "limit": 20
}
```

---

# Sync Endpoints

## Feature 10: Offline Sync & Message Queuing

### POST /api/messaging/v3/sync/queue

**Description**: Queue a message for offline delivery

**Authentication**: Required ✅  
**Method**: POST

**Request Body**:
```json
{
  "deviceId": "device_507f1f77bcf86cd799439011",
  "action": "sendMessage",
  "clientMessageId": "client_msg_123",
  "conversationId": "conv_507f1f77bcf86cd799439012",
  "payload": {
    "content": "Hello, offline message",
    "conversationId": "conv_507f1f77bcf86cd799439012"
  }
}
```

**Valid Actions**: `sendMessage`, `editMessage`, `deleteMessage`, `reaction`

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "queue_507f1f77bcf86cd799439011",
    "deviceId": "device_507f1f77bcf86cd799439011",
    "action": "sendMessage",
    "clientMessageId": "client_msg_123",
    "status": "pending",
    "retryCount": 0,
    "createdAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-01-16T10:30:00Z"
  },
  "message": "Message queued for offline delivery"
}
```

---

### GET /api/messaging/v3/sync/pending

**Description**: Get pending messages for a device

**Authentication**: Required ✅  
**Method**: GET

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| deviceId | string | Yes | Device ID |

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "queue_507f1f77bcf86cd799439011",
      "action": "sendMessage",
      "clientMessageId": "client_msg_123",
      "status": "pending",
      "payload": {...},
      "retryCount": 0,
      "createdAt": "2024-01-15T10:30:00Z"
    },
    ...
  ],
  "count": 5
}
```

---

### GET /api/messaging/v3/sync/failed

**Description**: Get failed messages for a device

**Authentication**: Required ✅  
**Method**: GET

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| deviceId | string | Yes | Device ID |

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "queue_507f1f77bcf86cd799439011",
      "action": "sendMessage",
      "status": "failed",
      "failureReason": "Network timeout",
      "retryCount": 3,
      "lastRetryAt": "2024-01-15T10:35:00Z"
    },
    ...
  ],
  "count": 2
}
```

---

### PUT /api/messaging/v3/sync/:queueItemId/synced

**Description**: Mark queued item as synced

**Authentication**: Required ✅  
**Authorization**: Queue owner or admin  
**Method**: PUT

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "queue_507f1f77bcf86cd799439011",
    "status": "synced",
    "syncedAt": "2024-01-15T10:35:00Z"
  },
  "message": "Message marked as synced"
}
```

---

### PUT /api/messaging/v3/sync/:queueItemId/failed

**Description**: Mark queued item as failed

**Authentication**: Required ✅  
**Authorization**: Queue owner or admin  
**Method**: PUT

**Request Body**:
```json
{
  "reason": "Network timeout"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "queue_507f1f77bcf86cd799439011",
    "status": "failed",
    "failureReason": "Network timeout",
    "failedAt": "2024-01-15T10:35:00Z"
  },
  "message": "Message marked as failed"
}
```

---

### PUT /api/messaging/v3/sync/:queueItemId/retry

**Description**: Retry syncing a message

**Authentication**: Required ✅  
**Authorization**: Queue owner or admin  
**Method**: PUT

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "queue_507f1f77bcf86cd799439011",
    "status": "pending",
    "retryCount": 2,
    "nextRetryAt": "2024-01-15T10:40:00Z"
  },
  "message": "Message retry attempted"
}
```

---

### POST /api/messaging/v3/sync

**Description**: Full sync - pull all new messages

**Authentication**: Required ✅  
**Method**: POST

**Request Body**:
```json
{
  "deviceId": "device_507f1f77bcf86cd799439011",
  "lastSyncTimestamp": "2024-01-15T10:00:00Z",
  "limit": 100
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "message_507f1f77bcf86cd799439011",
      "content": "New message",
      "sender": {
        "id": "user_507f1f77bcf86cd799439012",
        "name": "John Doe"
      },
      "createdAt": "2024-01-15T10:30:00Z"
    },
    ...
  ],
  "syncTimestamp": "2024-01-15T10:35:00Z",
  "messageCount": 15
}
```

---

### POST /api/messaging/v3/sync/batch

**Description**: Batch sync multiple operations

**Authentication**: Required ✅  
**Method**: POST

**Request Body**:
```json
{
  "deviceId": "device_507f1f77bcf86cd799439011",
  "operations": [
    {
      "action": "syncPending",
      "params": {}
    },
    {
      "action": "markRead",
      "params": { "messageId": "message_507f1f77bcf86cd799439011" }
    },
    {
      "action": "getMetadata",
      "params": {}
    }
  ]
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    { "action": "syncPending", "result": [...] },
    { "action": "markRead", "result": {} },
    { "action": "getMetadata", "result": {...} }
  ],
  "operationCount": 3
}
```

---

### POST /api/messaging/v3/sync/status

**Description**: Update message delivery status

**Authentication**: Required ✅  
**Method**: POST

**Request Body**:
```json
{
  "messageStatuses": [
    {
      "messageId": "message_507f1f77bcf86cd799439011",
      "status": "delivered"
    },
    {
      "messageId": "message_507f1f77bcf86cd799439012",
      "status": "read"
    }
  ]
}
```

**Valid Statuses**: `sent`, `delivered`, `read`, `failed`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "messageId": "message_507f1f77bcf86cd799439011",
      "status": "delivered",
      "updatedAt": "2024-01-15T10:35:00Z"
    },
    ...
  ],
  "updatedCount": 2
}
```

---

### GET /api/messaging/v3/sync/metadata

**Description**: Get sync metadata and state

**Authentication**: Required ✅  
**Method**: GET

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "lastSyncTime": "2024-01-15T10:05:00Z",
    "syncToken": "sync_token_12345",
    "pendingCount": 3,
    "failedCount": 1,
    "totalQueued": 150,
    "successRate": 96.7
  }
}
```

---

### GET /api/messaging/v3/sync/statistics

**Description**: Get sync statistics

**Authentication**: Required ✅  
**Method**: GET

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "totalQueued": 150,
    "totalSynced": 145,
    "totalFailed": 5,
    "averageSyncTime": 1234,
    "successRate": 96.7,
    "lastSyncAt": "2024-01-15T10:35:00Z",
    "nextSyncDue": "2024-01-15T10:40:00Z"
  }
}
```

---

### POST /api/messaging/v3/sync/cleanup

**Description**: Cleanup expired offline queue items (admin only)

**Authentication**: Required ✅  
**Authorization**: Admin only 🔒  
**Method**: POST

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "itemsDeleted": 25,
    "spaceFreed": 15234,
    "cleanupTime": 1234
  },
  "message": "Cleanup completed"
}
```

---

### GET /api/messaging/v3/sync/export

**Description**: Export offline queue (debug/owner only)

**Authentication**: Required ✅  
**Authorization**: Queue owner or admin  
**Method**: GET

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| deviceId | string | No | Filter by device |

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "totalItems": 150,
    "pending": 3,
    "synced": 142,
    "failed": 5,
    "items": [
      {
        "id": "queue_507f1f77bcf86cd799439011",
        "action": "sendMessage",
        "status": "pending",
        "payload": {...}
      },
      ...
    ]
  },
  "exportTimestamp": "2024-01-15T10:35:00Z"
}
```

---

## Response Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST creating new resource |
| 400 | Bad Request | Missing/invalid parameters |
| 401 | Unauthorized | Missing/invalid authentication |
| 403 | Forbidden | Authenticated but no permission |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate/conflict error |
| 500 | Server Error | Unexpected server error |

---

## Rate Limiting

Currently no rate limiting. Future versions may implement:
- 100 requests/minute per user
- 10 search requests/minute
- 1000 sync operations/day

---

## Version Information

- **API Version**: v3 (Phase 3)
- **Last Updated**: 2024-01-15
- **Status**: Production Ready
- **Backward Compatibility**: Full compatibility with Phase 1-2
