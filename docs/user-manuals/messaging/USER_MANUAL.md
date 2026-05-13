# Messaging User Manual (Front-End)

> Module: `src/modules/messaging/Messaging.js`  
> Product name in UI: **LinkUp Messaging** (chat, calls, files, groups, notifications, privacy controls)

## 1) What this module does
Messaging is a real-time communication workspace with:
- Direct **chats** and **chatrooms / groups**
- **Chat list** + **chat window** (message thread)
- **Contacts** browsing with filters (all / blocked / favorites / family)
- **Voice/video/audio call windows** (emergency and regular calls)
- **File upload** inside chats
- **AI Smart Replies / suggestions**
- Notification center (bell) + optional desktop/pwa notifications
- Privacy & visibility controls:
  - visibility settings
  - contact means settings
  - scheduled/block/family access management
- Optional end-to-end style **encryption status** display (per chat, backend-driven)

## 2) Entry point in the app
1. Open **Messaging / LinkUp** from main navigation/menu.

## 3) Main areas (internal UI)
Depending on what’s active, the module shows:
- **Chat List** (your chats)
- **Chat Window** (messages for selected chat)
- **Contacts List** (browse/filter who you can connect/chat with)
- **Call Window** (when a call is incoming/active)
- **Settings / Visibility** and other management panels (via internal tabs)

## 4) Start a conversation (direct chat / invitations)
### 4.1 Send an invitation (connect)
1. Go to **Contacts**.
2. Find a user and send an invitation.
3. The recipient can accept/reject from their side.

Expected behavior:
- After acceptance, you can chat.
- Pending invitations are tracked and displayed.

### 4.2 Accept / reject invitations
When you have pending invitations:
- **Accept**: opens access to chat and reloads contacts/chats
- **Reject**: marks invitation rejected (and reloads the invitation list)

## 5) View chats (Chat List)
In the chat list you can see for each conversation:
- chat title (group name or other participant name)
- preview of the last message
- last activity time
- unread count
- online indicator for the other participant

The chat list supports real-time updates via socket events:
- new messages received
- message updates/deletions
- read status updates (seen)

## 6) Open a chat and send messages
1. Select a chat from the chat list.
2. In the chat window:
   - type a message
   - optionally attach a file using **FileUpload**
   - optionally request/insert AI Smart Replies

3. Click **Send**.

Validation:
- If the message draft is empty, the UI asks you to type a message.

Expected behavior:
- Messages are sent to backend.
- If the network is offline or backend is delayed, the UI can retry queued outbox messages automatically.

## 7) Message history + pagination
When you open/scroll for older messages:
- the module loads messages by pages (default page size 20)
- it can append older messages when requested

Cleared chats:
- If you clear chats, the UI keeps track of clear timestamps and filters messages accordingly.

## 8) Calls (incoming/active/ended/declined)
When a call invitation arrives:
- the module opens a call experience (CallWindow)
- notifications are also generated (including desktop notification when permitted)

Call lifecycle (UI behavior):
- **Incoming call**: shown in messaging UI + optional desktop notification
- **Accepted**: active call window opens
- **Declined**: call window closes and a notification is added
- **Ended**: call window closes when the active/incoming call ends

### Emergency calls
The module supports emergency call events:
- if an emergency call event is triggered, it can reopen the relevant chat context for the caller

## 9) Chatrooms / groups
If your workspace uses chatrooms:
- navigate to chatrooms section
- browse your rooms
- select a chatroom to view messages (same messaging experience as direct chats)

## 10) Contacts & filters
Use the contacts filters to view:
- **All**
- **Blocked**
- **Favorites**
- **Family** contacts (family permission-aware behavior may apply)

## 11) Notifications
The messaging module loads notifications from backend and displays them in the UI (bell panel).
You can enable desktop/pwa notifications:
- via **Enable notifications** action

If browser permission is not granted:
- notifications won’t trigger desktop popups, but in-app notifications still work.

## 12) Privacy, visibility, and access controls
Messaging includes multiple management panels:
- **Visibility Settings**
- **Contact Means Settings**
- **Scheduled Block Manager**
- **Family Access Manager**
These controls affect who can reach you and what contact actions are allowed (exact enforcement is backend-driven).

## 13) Encryption status (per chat)
When a chat is selected:
- the module checks encryption status for that chat
- UI reflects whether encryption is enabled for the selected conversation (based on backend response)

## 14) Troubleshooting
- Messages don’t send:
  - check network connectivity (online/offline)
  - wait for queued outbox retry (the module flushes outbox on reconnect)
- No chats load:
  - ensure user is logged in and apiCall is functional
- Notifications don’t appear:
  - verify browser permission in notification settings
- Call issues:
  - confirm socket connection is working and call event payload contains the correct chat id

## 15) UI sections reference (quick)
- Chat list: conversation selection + unread preview
- Chat window: compose + send messages, files, AI hints
- Contacts: browse and send invitations
- Call window: manage call lifecycle + emergency calls
- Chatrooms panels: group chat browsing/selection
- Settings: visibility/contact means + scheduled block + family access
