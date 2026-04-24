# Chatroom Facility - Quick Reference Guide

## Feature Comparison at a Glance

### 🌐 PUBLIC vs 🔒 PRIVATE

| Feature | Public | Private |
|---------|:------:|:-------:|
| **Anyone can join directly** | ✅ | ❌ |
| **Admin approval required** | ❌ | ✅ |
| **Visible in public browser** | ✅ | ❌ |
| **Search & discoverable** | ✅ | ❌ |
| **Can block members** | ✅ | ✅ |
| **Max member limits** | ✅ | ✅ |
| **File sharing enabled** | ✅* | ✅* |
| **Member invites allowed** | ✅* | ✅* |

*Can be configured by admin

---

## Quick Start

### I'm a User - Create a Chatroom in 3 Steps

1. **Click** "Create Chatroom" button
2. **Fill** name, description, type (Public/Private)
3. **Click** "✨ Create Chatroom"

### I'm a User - Join a Public Chatroom in 2 Steps

1. **Click** "Browse Chatrooms"
2. **Find** a room and click "Join"

### I'm a User - Request Access to Private Chatroom

1. **Click** "Browse Chatrooms"
2. **Find** private room (🔒 badge)
3. **Click** "Request Access"
4. **Wait** for admin approval

### I'm an Admin - Approve Join Requests

1. **Go to** chatroom's Admin tab
2. **See** pending requests
3. **Click** ✓ "Approve" or ✗ "Reject"
4. **Notify** user is sent automatically

---

## Key Commands & Actions

### Creating Chatrooms

| Action | Steps |
|--------|-------|
| Create public room | Create → Select "Public" → Create |
| Create private room | Create → Select "Private" → Create |
| Add tags | Create → Add comma-separated tags |
| Set max members | Create → Enter number or -1 |
| Allow file sharing | Create → Check "Allow file sharing" |

### Member Management

| Action | Steps |
|--------|-------|
| View members | Open chatroom → Members tab |
| Approve request | Admin tab → Click ✓ Approve |
| Reject request | Admin tab → Click ✗ Reject |
| Block member | Members tab → Click 🚫 |
| Leave chatroom | Click "Leave Chatroom" |

### Search & Filter

| Method | Result |
|--------|--------|
| Search by name | "Tech" → Shows all rooms with "Tech" |
| Filter by tag | Click tag → Shows rooms with that tag |
| Sort by members | Default: highest members first |
| Pagination | Page buttons at bottom |

---

## UI Elements Reference

### Badges & Icons

| Badge | Meaning |
|-------|---------|
| 🌐 Public | Public chatroom - anyone can join |
| 🔒 Private | Private chatroom - needs approval |
| 👑 Creator | This user created the chatroom |
| ⚙️ Admin | User is an admin |
| ✓ Member | You are already a member |
| 🚫 Block | Click to block this member |

### Buttons & Actions

| Button | Action |
|--------|--------|
| ✨ Create Chatroom | Create new chatroom |
| 🔍 Browse Chatrooms | Search public chatrooms |
| Join | Join public chatroom instantly |
| Request Access | Request to join private room |
| ✓ Approve | Approve join request (admin) |
| ✗ Reject | Reject join request (admin) |
| Leave Chatroom | Exit chatroom |

### Tabs

| Tab | Shows |
|-----|-------|
| ℹ️ Info | Description, tags, creator, created date |
| ⚙️ Admin | Pending requests (admin only) |
| 👥 Members | List of all members with roles |

---

## Common Tasks

### Task: Create Private Team Chatroom

```
1. Click "Create Chatroom"
2. Name: "Team Alpha"
3. Description: "Private discussion for Team Alpha members"
4. Select: 🔒 Private
5. Settings: 
   - Allow file sharing: ✓
   - Allow member invites: ✗ (admins only)
6. Create!
7. Share room with team members to request access
```

### Task: Find and Join Public Community

```
1. Click "Browse Chatrooms"
2. Search: type topic name
3. Filter by tags if needed
4. Click on chatroom to preview
5. Click "Join" button
6. Start chatting!
```

### Task: Manage Private Chatroom Access

```
1. Open your private chatroom
2. Click "⚙️ Admin" tab
3. See "Pending Join Requests" section
4. For each request:
   - Review user details
   - Click ✓ to approve or ✗ to reject
5. Go to "👥 Members" to see approved members
6. Click 🚫 to block disruptive members
```

### Task: Transfer Admin Rights

```
1. Note: Currently creator has all admin powers
2. Future feature: Will allow promoting other admins
3. For now: Contact creator for room transfers
```

---

## Status Messages

### Success Messages ✅

- "Chatroom '[Name]' created successfully!"
- "Successfully joined chatroom"
- "Request approved!"
- "Member blocked successfully"

### Pending/Info Messages ℹ️

- "Access request sent. Waiting for admin approval."
- "[X] pending requests"
- "You already have a pending request"

### Error Messages ❌

- "Chatroom name is required"
- "Already a member of this chatroom"
- "This is a private chatroom. Please request access."
- "Your request was rejected"
- "You are blocked from this chatroom"
- "Chatroom is full"

---

## Notifications

**Real-time alerts you'll receive:**

### For All Users
- ✓ When someone approves your request
- ✗ When someone rejects your request
- Approval/rejection reasons (if provided)

### For Admins
- 🔔 New join request received
- User name and profile
- Ability to approve/reject directly

---

## Keyboard Shortcuts

*Coming in future version*

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New chatroom |
| `Ctrl+F` | Find chatroom |
| `Ctrl+L` | Leave chatroom |

---

## Settings Reference

### When Creating Chatroom

| Setting | Options | Use Case |
|---------|---------|----------|
| **Type** | Public / Private | Control who can join |
| **Max Members** | Any number / -1 | Limit room size or unlimited |
| **File Sharing** | On / Off | Allow file uploads |
| **Member Invites** | On / Off | Who can invite others |

### Tags

Good tag examples:
- By topic: `tech, gaming, music, business`
- By audience: `beginners, advanced, professionals`
- By region: `asia, europe, america`
- By language: `english, spanish, hindi`

**Use 3-5 tags per room for best discoverability**

---

## Privacy & Security

### Your Privacy
- Private chatrooms: hidden from non-members
- Your profile visible only to chatroom members
- Blocked members cannot see your messages

### Admin Powers
- Approve/reject who joins private rooms
- Block disruptive members
- View all member list
- Update chatroom settings

### Best Practices
- Don't share personal info in public rooms
- Use private rooms for sensitive discussions
- Block spam/harassment immediately
- Report inappropriate content

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't find chatroom | Use search, check tags, verify it's public |
| Join button disabled | You're already a member |
| Request pending too long | Contact admin directly |
| Blocked from room | Contact admin to discuss unblocking |
| Too many members | Create additional room or ask admin |

---

## FAQ

**Q: Can I create a chatroom with the same name?**  
A: Yes, but use unique names for clarity

**Q: Can I change chatroom from public to private?**  
A: Yes, admin can update settings

**Q: What if I'm the admin and I leave?**  
A: Room gets reassigned or deactivates

**Q: Can blocked members request again?**  
A: No, blocking is permanent until unblocked

**Q: How many chatrooms can I create?**  
A: Unlimited!

**Q: Can I delete a chatroom?**  
A: Yes, only the creator can delete it

---

## Admin Checklist

- [ ] Review pending requests regularly
- [ ] Approve qualified members promptly
- [ ] Block disruptive members
- [ ] Keep chatroom description updated
- [ ] Enforce community guidelines
- [ ] Welcome new members
- [ ] Monitor chat activity
- [ ] Archive old discussions
- [ ] Update tags for discoverability

---

## Key Statistics Tracked

- Total chatrooms created
- Members in each room
- Pending requests count
- Total join requests received
- Total messages sent
- Last activity timestamp

---

## Keyboard Navigation

Tab order:
1. Search input
2. Chatroom cards
3. Action buttons
4. Member list
5. Admin controls

---

## Browser Compatibility

✅ Tested and working on:
- Chrome/Chromium (v90+)
- Firefox (v88+)
- Safari (v14+)
- Edge (v90+)

Mobile:
- ✅ iOS Safari
- ✅ Android Chrome

---

## Performance Tips

- Clear old chatroom data periodically
- Archive inactive chatrooms
- Limit tags to 5 per room
- Use max members for large communities
- Enable file sharing selectively

---

## Useful Links

- **Create Chatroom**: Click "Create Chatroom" button
- **Browse**: Click "Browse Chatrooms"
- **My Chatrooms**: Your joined rooms list
- **Notifications**: Check notification center

---

## Version Info

- **Current Version**: 1.0
- **Release Date**: April 2026
- **Status**: ✅ Production Ready
- **Last Updated**: April 2026

---

## Getting Help

1. Read [CHATROOM_FACILITY_GUIDE.md](CHATROOM_FACILITY_GUIDE.md) for detailed guide
2. Check [CHATROOM_TECHNICAL_IMPLEMENTATION.md](CHATROOM_TECHNICAL_IMPLEMENTATION.md) for technical details
3. Contact your chatroom admin
4. Reach out to NilaHub support

---

**Enjoy chatting! 💬**
