const AVATAR_COLORS = ["#4f46e5", "#0f766e", "#c2410c", "#be185d", "#2563eb", "#7c3aed"];

const hashString = (value = "") =>
  String(value)
    .split("")
    .reduce((sum, character) => sum + character.charCodeAt(0), 0);

const isUrlLike = (value = "") =>
  /^(https?:|data:|blob:|\/)/i.test(String(value).trim());

const getInitials = (value = "") => {
  const tokens = String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!tokens.length) {
    return "VH";
  }

  return tokens.map((token) => token[0].toUpperCase()).join("");
};

const buildSvgDataUri = (label, background) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="18" fill="${background}" />
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#ffffff">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const getAvatarSrc = (avatar, fallbackLabel = "VH") => {
  if (isUrlLike(avatar)) {
    return avatar;
  }

  const label = getInitials(fallbackLabel || avatar || "VH");
  const background = AVATAR_COLORS[hashString(label) % AVATAR_COLORS.length];
  return buildSvgDataUri(label, background);
};

export const getMediaSrc = (value, fallbackLabel = "Post") => {
  if (isUrlLike(value)) {
    return value;
  }

  const label = String(value || fallbackLabel || "Post").slice(0, 12);
  const background = AVATAR_COLORS[hashString(label) % AVATAR_COLORS.length];
  return buildSvgDataUri(label, background);
};

export const normalizeSocialUser = (user, fallbackName = "VibeHub User") => {
  const name =
    user?.name || user?.fullName || user?.businessName || fallbackName;
  const email =
    user?.email || `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@vibehub.local`;

  return {
    _id: String(user?._id || user?.id || email),
    id: String(user?._id || user?.id || email),
    name,
    email,
    avatar: getAvatarSrc(user?.avatar, name),
  };
};

export const normalizeSocialPosts = (posts = []) =>
  (Array.isArray(posts) ? posts : []).map((post, index) => {
    const author =
      typeof post?.author === "object" && post.author !== null
        ? normalizeSocialUser(post.author, `User ${index + 1}`)
        : normalizeSocialUser(
            {
              id: `author-${index + 1}`,
              name: post?.author || `User ${index + 1}`,
              email: post?.authorEmail,
              avatar: post?.avatar,
            },
            `User ${index + 1}`
          );

    const commentCount = Number(post?.commentCount ?? post?.comments ?? 0);
    const reactions = Array.isArray(post?.reactions) ? post.reactions : [];
    const commentsList =
      Array.isArray(post?.commentsList) && post.commentsList.length > 0
        ? post.commentsList.map((comment, commentIndex) => ({
            _id: String(comment?._id || comment?.id || `${post?.id || index}-comment-${commentIndex + 1}`),
            author: normalizeSocialUser(comment?.author || {}, `Commenter ${commentIndex + 1}`),
            content: comment?.content || "",
            createdAt: comment?.createdAt || new Date(Date.now() - commentIndex * 600000).toISOString(),
          }))
        : reactions.slice(0, Math.min(commentCount, 2)).map((reaction, reactionIndex) => ({
            _id: `${post?.id || index}-comment-seed-${reactionIndex + 1}`,
            author: normalizeSocialUser(
              { name: reaction?.author || `Follower ${reactionIndex + 1}` },
              `Follower ${reactionIndex + 1}`
            ),
            content: reaction?.comment || "Love this update.",
            createdAt: new Date(Date.now() - (reactionIndex + 1) * 7200000).toISOString(),
          }));

    const images = Array.isArray(post?.images) && post.images.length > 0
      ? post.images.map((image, imageIndex) => ({
          url: getMediaSrc(image?.url || image, `${author.name} ${imageIndex + 1}`),
        }))
      : post?.image
        ? [{ url: getMediaSrc(post.image, `${author.name} post`) }]
        : [];

    return {
      _id: String(post?._id || post?.id || `post-${index + 1}`),
      author,
      content: post?.content || "",
      images,
      likeCount: Number(post?.likeCount ?? post?.likes ?? 0),
      commentCount,
      shareCount: Number(post?.shareCount ?? Math.max(0, Math.round(commentCount / 3))),
      liked: Boolean(post?.liked),
      saved: Boolean(post?.saved),
      commentsList,
      hashtags:
        Array.isArray(post?.hashtags) && post.hashtags.length > 0
          ? post.hashtags
          : (post?.content?.match(/#\w+/g) || []).map((item) => item.replace("#", "")),
      createdAt:
        post?.createdAt || new Date(Date.now() - index * 3600000 * 6).toISOString(),
      timestamp: post?.timestamp || "",
    };
  });

export const buildStoryGroups = (stories = []) =>
  (Array.isArray(stories) ? stories : []).map((group, index) => {
    const author = normalizeSocialUser(
      {
        id: group?._id || group?.id || `story-author-${index + 1}`,
        name: group?.name || group?.author?.name || `Story User ${index + 1}`,
        email: group?.author?.email,
        avatar: group?.avatar || group?.author?.avatar,
      },
      `Story User ${index + 1}`
    );
    const count = Number(group?.storyCount ?? group?.stories?.length ?? 1) || 1;
    const storiesList =
      Array.isArray(group?.stories) && group.stories.length > 0
        ? group.stories
        : Array.from({ length: count }, (_, storyIndex) => ({
            _id: `${author._id}-story-${storyIndex + 1}`,
            author,
            content: `${author.name}'s story update ${storyIndex + 1}`,
            mediaUrl: getMediaSrc(group?.image || `${author.name} ${storyIndex + 1}`, `${author.name} ${storyIndex + 1}`),
            viewCount: 24 + storyIndex * 13,
            reactions: [
              { emoji: "Like", author: "Asha" },
              { emoji: "Love", author: "Nikhil" },
            ],
            createdAt: new Date(Date.now() - storyIndex * 3600000).toISOString(),
          }));

    return {
      _id: String(group?._id || group?.id || author._id),
      author,
      stories: storiesList.map((story, storyIndex) => ({
        _id: String(story?._id || story?.id || `${author._id}-story-${storyIndex + 1}`),
        author,
        content: story?.content || `${author.name}'s story update ${storyIndex + 1}`,
        mediaUrl: getMediaSrc(story?.mediaUrl || story?.image || `${author.name} ${storyIndex + 1}`, `${author.name} ${storyIndex + 1}`),
        viewCount: Number(story?.viewCount ?? 40 + storyIndex * 9),
        reactions:
          Array.isArray(story?.reactions) && story.reactions.length > 0
            ? story.reactions
            : [{ emoji: "Like" }, { emoji: "Wow" }],
        createdAt: story?.createdAt || new Date(Date.now() - storyIndex * 5400000).toISOString(),
      })),
    };
  });

export const buildConversations = (conversations = [], currentUser) => {
  const me = normalizeSocialUser(currentUser, "You");

  return (Array.isArray(conversations) ? conversations : []).map((conversation, index) => {
    const otherParticipant = normalizeSocialUser(
      {
        id: conversation?._id || conversation?.id || `conversation-${index + 1}`,
        name: conversation?.name || conversation?.participant?.name || `Contact ${index + 1}`,
        avatar: conversation?.avatar || conversation?.participant?.avatar,
      },
      `Contact ${index + 1}`
    );
    const baseTime = new Date(Date.now() - index * 4500000);
    const initialMessages =
      Array.isArray(conversation?.messages) && conversation.messages.length > 0
        ? conversation.messages.map((message, messageIndex) => ({
            _id: String(message?._id || message?.id || `${otherParticipant._id}-message-${messageIndex + 1}`),
            sender:
              String(message?.sender?._id || message?.sender?.id || message?.senderId) === me._id
                ? me
                : normalizeSocialUser(message?.sender || otherParticipant, otherParticipant.name),
            content: message?.content || "",
            createdAt:
              message?.createdAt || new Date(baseTime.getTime() + messageIndex * 120000).toISOString(),
          }))
        : [
            {
              _id: `${otherParticipant._id}-message-1`,
              sender: otherParticipant,
              content: conversation?.lastMessage || "Hey, how are you doing?",
              createdAt: baseTime.toISOString(),
            },
          ];

    return {
      _id: String(conversation?._id || conversation?.id || `conversation-${index + 1}`),
      conversationType: "direct",
      participants: [me, otherParticipant],
      messages: initialMessages,
      lastMessage: initialMessages[initialMessages.length - 1] || null,
      unreadCount: conversation?.unread ? 1 : 0,
    };
  });
};

export const buildNotifications = (posts = [], conversations = []) => {
  const postNotifications = posts.slice(0, 4).map((post, index) => ({
    _id: `notification-post-${post._id}`,
    notificationType: index % 2 === 0 ? "like" : "comment",
    actor: post.author,
    title:
      index % 2 === 0
        ? `${post.author.name} liked a post`
        : `${post.author.name} commented on a post`,
    description:
      index % 2 === 0
        ? `Your network is engaging with "${post.content.slice(0, 40)}".`
        : `"${post.content.slice(0, 40)}" is starting a conversation.`,
    isRead: index > 1,
    createdAt: new Date(Date.now() - (index + 1) * 1800000).toISOString(),
  }));

  const messageNotifications = conversations.slice(0, 2).map((conversation, index) => {
    const actor = conversation.participants[1];

    return {
      _id: `notification-message-${conversation._id}`,
      notificationType: "message",
      actor,
      title: `${actor.name} sent a message`,
      description: conversation.lastMessage?.content || "New message received.",
      isRead: index > 0,
      createdAt: new Date(Date.now() - (index + 1) * 2700000).toISOString(),
    };
  });

  return [...messageNotifications, ...postNotifications];
};

const isValidObjectId = (value = "") => /^[0-9a-fA-F]{24}$/.test(String(value));

export const buildSearchUsers = (posts = [], storyGroups = [], conversations = []) => {
  const users = new Map();

  [...posts.map((post) => post.author), ...storyGroups.map((group) => group.author), ...conversations.flatMap((conversation) => conversation.participants.slice(1))]
    .forEach((user) => {
      if (!user?._id || !isValidObjectId(user._id)) {
        return;
      }

      users.set(user._id, user);
    });

  return Array.from(users.values());
};
