# Chatroom Facility Guide

## Overview

The Chatroom Facility is a comprehensive communication platform within NilaHub that supports both **public** and **private** chatrooms. This guide covers all features, usage, and administrative functions.

---

## Table of Contents

1. [Chatroom Types](#chatroom-types)
2. [Creating Chatrooms](#creating-chatrooms)
3. [Public Chatrooms](#public-chatrooms)
4. [Private Chatrooms](#private-chatrooms)
5. [Admin Panel](#admin-panel)
6. [Member Management](#member-management)
7. [Chatroom Settings](#chatroom-settings)
8. [API Endpoints](#api-endpoints)

---

## Chatroom Types

### 🌐 Public Chatrooms

**Public chatrooms** are open to all users. Anyone can join directly without requiring admin approval.

**Characteristics:**
- ✓ Anyone can join instantly
- ✓ Visible in the public chatroom browser
- ✓ Searchable by name, description, and tags
- ✓ Sortable by member count
- ✓ No approval process required
- ✓ Great for communities, discussions, support groups

**Use Cases:**
- General discussions
- Community support
- Interest-based groups
- Product announcements
- Help and Q&A forums

### 🔒 Private Chatrooms

**Private chatrooms** require admin approval for users to join. Users must request access, and admins review and approve/reject requests.

**Characteristics:**
- 🔒 Users must request access
- 🔒 Admin approval required before joining
- 🔒 Not visible in public browser (except to members)
- 🔒 Admin receives notifications of join requests
- 🔒 Can block members from rejoining
- 🔒 Great for restricted access groups

**Use Cases:**
- Team/department groups
- Client-specific discussions
- VIP members only
- Restricted content discussions
- Internal company communications

---

## Creating Chatrooms

### Step-by-Step Guide

1. **Navigate to Chatrooms**
   - Open the messaging module
   - Click on "Create Chatroom" button

2. **Fill in Basic Information**
   - **Chatroom Name** (Required)
     - Keep it descriptive and engaging
     - Max 100 characters
     - Examples: "Tech Lovers", "Product Feedback", "Team Alpha"
   
   - **Description** (Optional)
     - Explain the purpose of the chatroom
     - Max 500 characters
     - Helps users decide if they want to join
   
   - **Tags** (Optional)
     - Add comma-separated tags for better discoverability
     - Examples: `tech, gaming, music`
     - Users can filter by tags

3. **Choose Access Control**
   - **Public**: Anyone can join directly
   - **Private**: Users must request access and get admin approval

4. **Configure Settings**
   - **Max Members** (Optional)
     - Leave blank or use -1 for unlimited members
     - Useful for limiting chatroom size
   
   - **Allow File Sharing**
     - Toggle whether members can share files
     - Default: Enabled
   
   - **Allow Member Invites**
     - Toggle whether members can invite others
     - Default: Disabled (admins only)

5. **Create**
   - Click "✨ Create Chatroom" button
   - You're automatically added as creator and admin
   - Success message confirms creation

---

## Public Chatrooms

### Joining a Public Chatroom

1. **Browse Available Chatrooms**
   - Go to "Browse Chatrooms"
   - Search by name or keywords
   - Filter by tags
   - Sort by member count

2. **View Chatroom Details**
   - Click on any chatroom card to see:
     - Full description
     - Current member count
     - Tags and categories
     - Creator information
     - Public badge (🌐)

3. **Join**
   - Click "Join" button
   - Instant access granted
   - You're added to members list
   - Can start chatting immediately

### Managing Public Chatrooms (Admin)

As creator/admin of a public chatroom:

- **View Members**
  - Access Members tab in chatroom panel
  - See list of all joined members
  - View member details

- **Update Settings**
  - Change chatroom name, description
  - Add or modify tags
  - Adjust file sharing settings

- **Leave Chatroom**
  - Click "Leave Chatroom" button
  - If you're the only admin, ownership transfers to another member
  - Room deactivates if no members remain

---

## Private Chatrooms

### Requesting Access to Private Chatrooms

1. **Browse Private Chatrooms**
   - Search for private chatrooms (🔒 badge shown)
   - View description and member count
   - Check creator information

2. **Send Access Request**
   - Click "Request Access" button
   - Admins receive notification
   - Status shows "Pending" in your requests

3. **Wait for Approval**
   - Admins review your request
   - You'll receive notification when:
     - ✓ Request is approved → You're added to members
     - ✗ Request is rejected → You can request again later

### Creating a Private Chatroom

1. Select the "🔒 Private" option when creating
2. You become the admin automatically
3. Users will see the 🔒 Private badge
4. Users must request access through the browser

### Admin Panel for Private Chatrooms

The **Admin Tab** is available only to admins in private chatrooms.

#### Features:

**📥 Pending Join Requests Section**
```
Shows all users requesting access with:
- User avatar and name
- Username
- Request date
- Action buttons: ✓ Approve / ✗ Reject
```

**Approve Request:**
1. Review user profile
2. Click "✓ Approve"
3. User is immediately added to members
4. User receives notification of approval
5. User can now join the chatroom

**Reject Request:**
1. Click "✗ Reject"
2. Optional reason can be provided
3. User receives notification of rejection
4. User can request access again later

#### Blocking Members

**To Block a Member:**
1. Go to Members tab
2. Find the member
3. Click 🚫 (block button)
4. Confirm action
5. Member is:
   - Removed from members list
   - Added to blocked list
   - Cannot rejoin without admin intervention

**Note:** Blocking prevents re-joining. Use carefully!

---

## Admin Panel

### Accessing Admin Features

The Admin Panel is available only to chatroom admins/creators:

1. **View pending join requests** (private chatrooms only)
2. **Approve new members**
3. **Reject access requests**
4. **Block members**
5. **View member list**
6. **Manage settings**

### Admin Responsibilities

**For Public Chatrooms:**
- Monitor discussions
- Remove spam/inappropriate content
- Set guidelines for members
- Help with technical issues

**For Private Chatrooms:**
- Review join requests
- Approve qualified members
- Block disruptive members
- Maintain chatroom quality

---

## Member Management

### Member Roles

**👑 Creator**
- Original founder of the chatroom
- Has all admin privileges
- Can delete the chatroom
- Shown with orange "Creator" badge

**⚙️ Admin**
- Can approve/reject join requests (private)
- Can block members
- Can manage settings
- Shown with blue "Admin" badge

**👤 Regular Member**
- Can send messages
- Can view all members
- Can leave anytime
- If allowed: can invite others or share files

### Member Lists

**View Members:**
1. Open chatroom
2. Click "Members" tab
3. See all current members
4. View user details and roles

### Removing Members

**As Admin:**
1. Go to Members tab
2. Click 🚫 next to member
3. Confirm blocking action
4. Member is blocked and removed

**Member Leaving:**
1. Click "Leave Chatroom"
2. Confirm action
3. You're removed from members list

---

## Chatroom Settings

### Initial Settings

When creating a chatroom, you can set:

| Setting | Options | Default |
|---------|---------|---------|
| **Type** | Public / Private | Public |
| **Max Members** | Any number or -1 (unlimited) | -1 |
| **File Sharing** | Enabled / Disabled | Enabled |
| **Member Invites** | Enabled / Disabled | Disabled |

### Modifying Settings (Admin)

1. Open chatroom
2. Click Admin tab
3. Edit settings:
   - Name
   - Description
   - Tags
   - File sharing
   - Member invites

### Special Features

**File Sharing**
- Members can upload and share files
- Useful for document collaboration
- Can be disabled for privacy

**Member Invites**
- If enabled, members can invite others
- Useful for community growth
- If disabled, only admins can add members

---

## API Endpoints

### Public Endpoints

#### Create Chatroom
```
POST /api/messaging/chatrooms
Body: {
  name: string (required),
  description: string,
  isPrivate: boolean,
  tags: [string],
  maxMembers: number,
  settings: {
    allowFileSharing: boolean,
    allowMemberInvites: boolean
  }
}
Response: { chatroom: {...} }
```

#### Get Public Chatrooms
```
GET /api/messaging/chatrooms/public/list?page=1&limit=20&search=query&tags=tech,gaming
Response: {
  chatrooms: [...],
  pagination: { total, page, limit, pages }
}
```

#### Get My Chatrooms
```
GET /api/messaging/chatrooms/my-rooms
Response: { chatrooms: [...] }
```

#### Get Chatroom Details
```
GET /api/messaging/chatrooms/:chatroomId
Response: { chatroom: {...}, isMember: bool, isAdmin: bool }
```

### Join Operations

#### Join Public Chatroom
```
POST /api/messaging/chatrooms/:chatroomId/join
Response: { chatroom: {...}, message: "Successfully joined..." }
```

#### Request Access to Private Chatroom
```
POST /api/messaging/chatrooms/:chatroomId/request-join
Response: { message: "Join request sent. Waiting for admin approval." }
```

### Admin Operations

#### Get Pending Requests
```
GET /api/messaging/chatrooms/:chatroomId/pending-requests
Response: { pendingRequests: [...] }
```

#### Approve Request
```
POST /api/messaging/chatrooms/:chatroomId/approve-request/:userId
Response: { message: "Request approved. User added to chatroom." }
```

#### Reject Request
```
POST /api/messaging/chatrooms/:chatroomId/reject-request/:userId
Body: { reason?: string }
Response: { message: "Request rejected" }
```

#### Block Member
```
POST /api/messaging/chatrooms/:chatroomId/block-member/:userId
Response: { message: "Member blocked successfully" }
```

#### Leave Chatroom
```
POST /api/messaging/chatrooms/:chatroomId/leave
Response: { message: "Left chatroom successfully" }
```

#### Update Chatroom (Admin)
```
PUT /api/messaging/chatrooms/:chatroomId
Body: { name?, description?, tags?, settings? }
Response: { chatroom: {...}, message: "..." }
```

#### Delete Chatroom (Creator Only)
```
DELETE /api/messaging/chatrooms/:chatroomId
Response: { message: "Chatroom deleted successfully" }
```

---

## Best Practices

### For Creators

✅ **DO:**
- Write clear, descriptive chatroom names
- Set appropriate descriptions
- Use relevant tags for discoverability
- Monitor discussions regularly
- Welcome new members
- Review join requests promptly (private chatrooms)

❌ **DON'T:**
- Create duplicate chatrooms
- Use spam/misleading names
- Ignore member requests
- Block members without reason
- Leave chatrooms without appointing new admin

### For Members

✅ **DO:**
- Read chatroom description before joining
- Follow chatroom guidelines
- Be respectful to other members
- Ask admins before sharing large files
- Report inappropriate behavior

❌ **DON'T:**
- Post spam or promotional content
- Share personal information
- Disrupt discussions
- Spam join requests
- Impersonate others

---

## Troubleshooting

### Common Issues

**Q: I can't find a private chatroom to join**
- Private chatrooms are not visible in public browser
- Ask admin for direct invite
- Get username of admin to request access

**Q: My join request was rejected**
- Admin may have criteria for members
- Try a different chatroom
- Reach out to admin for feedback

**Q: I want to leave but I'm the only admin**
- Transfer admin rights to another member first
- Go to Members tab
- Promote another member to admin (if available)

**Q: Can I change a public chatroom to private?**
- Yes, contact current admin
- Admin can update chatroom settings
- Note: Existing members keep access

**Q: What happens if I block a member?**
- Member is removed immediately
- Member cannot rejoin without unblocking
- Blocking is permanent until removed by admin

---

## Summary

| Feature | Public | Private |
|---------|--------|---------|
| **Join Type** | Direct | Request + Approval |
| **Visible in Browser** | Yes | No (members only) |
| **Admin Approval** | No | Yes ✓ |
| **Blocking Available** | Yes (admin) | Yes (admin) |
| **Best For** | Open communities | Restricted groups |
| **Use Case** | Support, Q&A, Forums | Teams, VIP, Internal |

---

## Support

For issues or questions about chatrooms:
1. Check this guide
2. Contact your chatroom admin
3. Reach out to NilaHub support

---

**Last Updated:** April 2026
**Version:** 1.0
