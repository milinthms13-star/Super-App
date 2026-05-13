# Social Media User Manual (Front-End)

> Module: `src/modules/socialmedia/SocialMedia.js` (VibeHub / Social workspace)

## 1) What this module does
**Social Media (VibeHub)** lets users interact in a social feed:
- View and create posts (Feed / For You)
- Manage stories
- Publish polls
- Follow/unfollow users
- Search users
- Chat via social messages
- View notifications
- View basic analytics (creator/insights)

Depending on your configuration, the module may also support real-time updates using sockets (new posts, notifications, presence, etc.).

## 2) Entry point in the app
1. Open the app dashboard/navigation.
2. Select **Social Media** (VibeHub / Socialmedia).

## 3) Main screen layout (what you see)

### 3.1 Sidebar navigation tabs
Use the left sidebar tabs (example):
- Feed
- For You
- Polls
- Analytics
- Search
- Stories
- Messages
- Notifications

### 3.2 Content/work area
- The tab you select determines the content area:
  - feed/polls/stories/messages/notifications/search results

### 3.3 Follow widgets (if present)
- Widgets like **Who to Follow** may appear with suggested users.

## 4) Step-by-step user flows

### 4.1 Browse posts (Feed)
1. Open **Feed**.
2. Scroll through posts.
3. Use any available post actions (like/comment/repost) if your UI shows them.

Expected result:
- You can view posts smoothly and interact using the post actions.

### 4.2 Use “For You”
1. Open **For You**.
2. Review suggested posts.
3. Follow/interact as supported.

Expected result:
- The feed shows personalized/suggested posts.

### 4.3 Follow / Unfollow users
1. Find a user in sidebar widgets (example: **Who to Follow**) or from search results.
2. Click:
   - **Follow** to start following, or
   - **Following** to unfollow (depending on your UI)

Expected result:
- The follow state updates in the UI.

### 4.4 Create or manage content (posts, stories, polls)

#### 4.4.1 Create/manage posts
1. In Feed/For You, locate your **Create/Add** controls (if enabled).
2. Compose your post content.
3. Click **Publish/Post**.

Expected result:
- Your post appears in the feed (or pending state, depending on moderation rules).

#### 4.4.2 Manage stories
1. Open **Stories**.
2. Use the upload/add action to create a story (if enabled).
3. View story groups as they appear.

Expected result:
- Your story is visible according to the story rules in the app.

#### 4.4.3 Publish polls
1. Open **Polls**.
2. Click **Create/Add Poll** (if available).
3. Enter poll question and options.
4. Publish.

Expected result:
- The poll appears in the polls list.

### 4.5 Search users
1. Open **Search**.
2. Type keywords.
3. Select a user/profile result (if your UI supports selecting from results).

Expected result:
- Search results update and you can view profiles and follow actions.

### 4.6 Messages
1. Open **Messages**.
2. Select a conversation.
3. Type your message.
4. Click **Send**.

Expected result:
- Messages are delivered in the selected thread.

### 4.7 Notifications
1. Open **Notifications**.
2. Review notification items (likes, follows, comments, system events).

Expected result:
- Notifications list updates as you receive new events.

## 5) Troubleshooting (UI-level)

- Updates not appearing / feels offline:
  - Check internet connectivity.
  - Wait for socket reconnect (some UIs show Live/Offline indicators).

- Follow button does nothing:
  - Refresh the page.
  - Confirm you’re logged in and your session/token is active.

- Search results look empty:
  - Try fewer/shorter keywords.
  - Try again after a refresh.

- Messages not sending:
  - Confirm you selected the correct conversation.
  - Check connectivity and retry.

## 6) UI sections reference
- Sidebar tab navigation
- Feed / For You content area
- Who-to-Follow widget
- Stories viewer/uploader (if enabled)
- Polls list + poll creation (if enabled)
- Creator Analytics section (if enabled)
- Search discovery panel
- Social messaging panel
- Notifications list
