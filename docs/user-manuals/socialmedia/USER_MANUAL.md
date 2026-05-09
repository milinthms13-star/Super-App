# Social Media User Manual (Front-End)

> Module: `src/modules/socialmedia/SocialMedia.js` (VibeHub / Social workspace)

## 1) What this module does
Social Media (VibeHub) lets users:
- View and create posts (feed / for-you)
- Manage stories
- Publish polls
- See analytics (creator/insights)
- Search users
- Chat in social messages
- View notifications
- Follow/unfollow users

This module also supports real-time updates using sockets (new posts, notifications, presence).

## 2) Entry point in the app
1. Open the app dashboard/navigation.
2. Select **Social Media** (VibeHub / Socialmedia).

## 3) Step-by-step user flow

### 3.1 Understand the tabs
Use the left sidebar tabs (example):
- Feed
- For You
- Polls
- Analytics
- Search
- Stories
- Messages
- Notifications

### 3.2 View posts (Feed)
1. Go to **Feed**.
2. Scroll through posts.
3. Use follow actions from posts/user widgets (if shown).

### 3.3 For You feed
1. Go to **For You**.
2. View personalized/suggested posts.

### 3.4 Follow / Unfollow users
1. In the sidebar widgets (Who to Follow), find a user.
2. Click **Follow** or **Following**.

Expected result:
- The UI updates follow state.

### 3.5 Create or manage content (posts, stories, polls)
Depending on which components are enabled in your UI:
- Posts: create/publish flow (typically in feed area)
- Stories: upload/post story and view story groups
- Polls: create/view polls

(Use the in-module “Create” / “Add” buttons to perform actions.)

### 3.6 Search users
1. Open **Search** tab.
2. Enter keywords.
3. Select a result (profile/user card) if supported.

### 3.7 Messages
1. Open **Messages** tab.
2. Select a conversation.
3. Compose and send messages.

### 3.8 Notifications
1. Open **Notifications** tab.
2. Review notification items.

## 4) Troubleshooting (UI-level)
- Offline/updates not appearing:
  - Check internet connectivity.
  - Wait for socket reconnect (UI may show Offline/Live indicator).
- Follow button does nothing:
  - Refresh the page.
  - Confirm you are logged in and token exists.

## 5) UI sections reference
- Sidebar tab navigation
- Feed / For You content area
- Who-to-Follow widget
- Stories viewer
- Polls list
- Creator Analytics section
- Search discovery panel
- Social messaging panel
- Notifications list

