const express = require('express');
const Joi = require('joi');
const mongoose = require('mongoose');
const SocialPost = require('../models/SocialPost');
const SocialComment = require('../models/SocialComment');
const SocialFollow = require('../models/SocialFollow');
const SocialProfile = require('../models/SocialProfile');
const SocialNotification = require('../models/SocialNotification');
const SocialReport = require('../models/SocialReport');
const SocialStory = require('../models/SocialStory');
const SocialMessage = require('../models/SocialMessage');
const SocialConversation = require('../models/SocialConversation');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// ============ POST ROUTES ============

// Create a new post
router.post('/posts/create', authenticate, async (req, res, next) => {
  try {
    const { content, images, videos, privacy, allowedUsers, location, hashtags, mentions } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Post content is required' });
    }

    const newPost = new SocialPost({
      author: req.user._id,
      content: content.trim(),
      images: images || [],
      videos: videos || [],
      privacy: privacy || 'public',
      allowedUsers: allowedUsers || [],
      location: location || '',
      hashtags: hashtags || [],
      mentions: mentions || [],
    });

    await newPost.save();
    await newPost.populate('author', 'name avatar email');

    // Update user post count
    await SocialProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $inc: { postCount: 1 } }
    );

    logger.info(`Post created by ${req.user._id}`);
    res.status(201).json({ post: newPost });
  } catch (err) {
    next(err);
  }
});

// Get post by ID
router.get('/posts/:postId', authenticate, async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await SocialPost.findById(postId)
      .populate('author', 'name avatar email')
      .populate('comments')
      .lean();

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json({ post });
  } catch (err) {
    next(err);
  }
});

// Get user's feed
router.get('/feed', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort = 'recent' } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 50);

    // Get user's following list
    const following = await SocialFollow.find(
      { follower: req.user._id, status: 'following' },
      'following'
    ).lean();

    const followingIds = following.map(f => f.following);
    followingIds.push(req.user._id); // Include own posts

    let sortBy = { createdAt: -1 };
    if (sort === 'trending') {
      sortBy = { likeCount: -1, commentCount: -1, createdAt: -1 };
    }

    const posts = await SocialPost.find({
      author: { $in: followingIds },
      visibility: 'visible',
      isDeleted: false,
    })
      .populate('author', 'name avatar email')
      .sort(sortBy)
      .skip(skip)
      .limit(pageLimit)
      .lean();

    const total = await SocialPost.countDocuments({
      author: { $in: followingIds },
      visibility: 'visible',
      isDeleted: false,
    });

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Update post
router.put('/posts/:postId', authenticate, async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { content, privacy, allowedUsers } = req.body;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await SocialPost.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this post' });
    }

    if (content) {
      post.content = content.trim();
    }
    if (privacy) {
      post.privacy = privacy;
    }
    if (allowedUsers) {
      post.allowedUsers = allowedUsers;
    }

    post.isEdited = true;
    post.editedAt = new Date();

    await post.save();
    await post.populate('author', 'name avatar email');

    logger.info(`Post ${postId} updated by ${req.user._id}`);
    res.json({ post });
  } catch (err) {
    next(err);
  }
});

// Delete post
router.delete('/posts/:postId', authenticate, async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await SocialPost.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await SocialPost.findByIdAndDelete(postId);

    // Update user post count
    await SocialProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $inc: { postCount: -1 } }
    );

    logger.info(`Post ${postId} deleted by ${req.user._id}`);
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ============ LIKE/REACTION ROUTES ============

// Like/React to post
router.post('/posts/:postId/like', authenticate, async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { reactionType = 'like' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await SocialPost.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const existingLike = post.likes.find(l => l.userId.toString() === req.user._id.toString());

    if (existingLike) {
      post.likeCount -= 1;
      post.likes = post.likes.filter(l => l.userId.toString() !== req.user._id.toString());
    } else {
      post.likes.push({
        userId: req.user._id,
        reactionType,
        createdAt: new Date(),
      });
      post.likeCount += 1;

      // Create notification
      if (post.author.toString() !== req.user._id.toString()) {
        await SocialNotification.create({
          recipient: post.author,
          actor: req.user._id,
          notificationType: 'like',
          relatedObject: {
            type: 'post',
            id: postId,
          },
          title: `${req.user.name} liked your post`,
          description: post.content.substring(0, 50),
          actionUrl: `/posts/${postId}`,
        });
      }
    }

    await post.save();
    res.json({ post, liked: !existingLike, reactionType });
  } catch (err) {
    next(err);
  }
});

// Unlike post
router.post('/posts/:postId/unlike', authenticate, async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await SocialPost.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const existingLike = post.likes.find(l => l.userId.toString() === req.user._id.toString());

    if (existingLike) {
      post.likeCount = Math.max(0, post.likeCount - 1);
      post.likes = post.likes.filter(l => l.userId.toString() !== req.user._id.toString());
      await post.save();
    }

    res.json({ message: 'Post unliked', post });
  } catch (err) {
    next(err);
  }
});

// Get post likes
router.get('/posts/:postId/likes', authenticate, async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 50);

    const post = await SocialPost.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const likes = await SocialPost.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(postId) } },
      { $unwind: '$likes' },
      { $skip: skip },
      { $limit: pageLimit },
      {
        $lookup: {
          from: 'users',
          localField: 'likes.userId',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
    ]);

    res.json({
      likes,
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total: post.likeCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============ COMMENT ROUTES ============

// Add comment
router.post('/posts/:postId/comments', authenticate, async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { content, mentions, parentCommentId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await SocialPost.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const newComment = new SocialComment({
      post: postId,
      author: req.user._id,
      content: content.trim(),
      mentions: mentions || [],
      parentComment: parentCommentId || null,
    });

    await newComment.save();
    await newComment.populate('author', 'name avatar email');

    post.comments.push(newComment._id);
    post.commentCount += 1;
    await post.save();

    // Create notification
    if (post.author.toString() !== req.user._id.toString()) {
      await SocialNotification.create({
        recipient: post.author,
        actor: req.user._id,
        notificationType: 'comment',
        relatedObject: {
          type: 'post',
          id: postId,
        },
        title: `${req.user.name} commented on your post`,
        description: content.substring(0, 50),
        actionUrl: `/posts/${postId}`,
      });
    }

    res.status(201).json({ comment: newComment });
  } catch (err) {
    next(err);
  }
});

// Get post comments
router.get('/posts/:postId/comments', authenticate, async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 50);

    const comments = await SocialComment.find({
      post: postId,
      isDeleted: false,
      parentComment: null,
    })
      .populate('author', 'name avatar email')
      .populate('replies')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean();

    const total = await SocialComment.countDocuments({
      post: postId,
      isDeleted: false,
      parentComment: null,
    });

    res.json({
      comments,
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============ FOLLOW ROUTES ============

// Follow user
router.post('/users/:userId/follow', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let follow = await SocialFollow.findOne({
      follower: req.user._id,
      following: userId,
    });

    if (follow && follow.status === 'following') {
      return res.status(400).json({ message: 'Already following this user' });
    }

    if (!follow) {
      follow = new SocialFollow({
        follower: req.user._id,
        following: userId,
        status: 'following',
      });
    } else {
      follow.status = 'following';
    }

    await follow.save();

    // Update follower/following counts
    await SocialProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $inc: { followingCount: 1 } }
    );

    await SocialProfile.findOneAndUpdate(
      { userId },
      { $inc: { followerCount: 1 } }
    );

    // Create notification
    await SocialNotification.create({
      recipient: userId,
      actor: req.user._id,
      notificationType: 'follow',
      relatedObject: {
        type: 'user',
        id: req.user._id,
      },
      title: `${req.user.name} started following you`,
      actionUrl: `/profile/${req.user._id}`,
    });

    logger.info(`User ${req.user._id} followed ${userId}`);
    res.json({ message: 'User followed successfully', follow });
  } catch (err) {
    next(err);
  }
});

// Unfollow user
router.post('/users/:userId/unfollow', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const follow = await SocialFollow.findOne({
      follower: req.user._id,
      following: userId,
      status: 'following',
    });

    if (!follow) {
      return res.status(404).json({ message: 'Not following this user' });
    }

    await SocialFollow.findByIdAndDelete(follow._id);

    // Update follower/following counts
    await SocialProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $inc: { followingCount: -1 } }
    );

    await SocialProfile.findOneAndUpdate(
      { userId },
      { $inc: { followerCount: -1 } }
    );

    logger.info(`User ${req.user._id} unfollowed ${userId}`);
    res.json({ message: 'User unfollowed successfully' });
  } catch (err) {
    next(err);
  }
});

// Get followers
router.get('/users/:userId/followers', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 50);

    const followers = await SocialFollow.find({
      following: userId,
      status: 'following',
    })
      .populate('follower', 'name avatar email')
      .skip(skip)
      .limit(pageLimit)
      .lean();

    const total = await SocialFollow.countDocuments({
      following: userId,
      status: 'following',
    });

    res.json({
      followers: followers.map(f => f.follower),
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get following
router.get('/users/:userId/following', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 50);

    const following = await SocialFollow.find({
      follower: userId,
      status: 'following',
    })
      .populate('following', 'name avatar email')
      .skip(skip)
      .limit(pageLimit)
      .lean();

    const total = await SocialFollow.countDocuments({
      follower: userId,
      status: 'following',
    });

    res.json({
      following: following.map(f => f.following),
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============ PROFILE ROUTES ============

// Get or create user profile
router.get('/profile/:userId', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let profile = await SocialProfile.findOne({ userId });

    if (!profile) {
      profile = new SocialProfile({
        userId,
        username: user.email.split('@')[0] + '_' + userId.toString().slice(-4),
      });
      await profile.save();
    }

    // Get follow status
    const followStatus = await SocialFollow.findOne({
      follower: req.user._id,
      following: userId,
    });

    res.json({
      user: user.toObject(),
      profile: profile.toObject(),
      isFollowing: followStatus?.status === 'following',
      isOwnProfile: req.user._id.toString() === userId,
    });
  } catch (err) {
    next(err);
  }
});

// Update profile
router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const { username, bio, website, location, dateOfBirth, interests, profession } = req.body;

    let profile = await SocialProfile.findOne({ userId: req.user._id });

    if (!profile) {
      profile = new SocialProfile({
        userId: req.user._id,
      });
    }

    if (username) {
      profile.username = username.toLowerCase();
    }
    if (bio) {
      profile.bio = bio;
    }
    if (website) {
      profile.website = website;
    }
    if (location) {
      profile.location = location;
    }
    if (dateOfBirth) {
      profile.dateOfBirth = dateOfBirth;
    }
    if (interests) {
      profile.interests = interests;
    }
    if (profession) {
      profile.profession = profession;
    }

    await profile.save();
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

// Get user's posts
router.get('/profile/:userId/posts', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 50);

    const posts = await SocialPost.find({
      author: userId,
      visibility: 'visible',
      isDeleted: false,
    })
      .populate('author', 'name avatar email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean();

    const total = await SocialPost.countDocuments({
      author: userId,
      visibility: 'visible',
      isDeleted: false,
    });

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============ NOTIFICATION ROUTES ============

// Get notifications
router.get('/notifications', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 50);

    const query = { recipient: req.user._id };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await SocialNotification.find(query)
      .populate('actor', 'name avatar email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean();

    const total = await SocialNotification.countDocuments(query);

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', authenticate, async (req, res, next) => {
  try {
    const { notificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }

    const notification = await SocialNotification.findByIdAndUpdate(
      notificationId,
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ notification });
  } catch (err) {
    next(err);
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', authenticate, async (req, res, next) => {
  try {
    await SocialNotification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

// ============ SEARCH ROUTES ============

// Search users
router.get('/search/users', authenticate, async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 50);

    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    })
      .select('-password')
      .skip(skip)
      .limit(pageLimit)
      .lean();

    const total = await User.countDocuments({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    });

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Search posts by hashtag
router.get('/search/hashtags/:hashtag', authenticate, async (req, res, next) => {
  try {
    const { hashtag } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!hashtag || hashtag.trim().length === 0) {
      return res.status(400).json({ message: 'Hashtag is required' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 50);

    const posts = await SocialPost.find({
      hashtags: hashtag.toLowerCase(),
      visibility: 'visible',
      isDeleted: false,
    })
      .populate('author', 'name avatar email')
      .sort({ likeCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean();

    const total = await SocialPost.countDocuments({
      hashtags: hashtag.toLowerCase(),
      visibility: 'visible',
      isDeleted: false,
    });

    res.json({
      hashtag,
      posts,
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============ REPORT ROUTES ============

// Report post/user/comment
router.post('/report', authenticate, async (req, res, next) => {
  try {
    const { reportedObjectType, reportedObjectId, reportReason, description } = req.body;

    if (!['post', 'comment', 'user', 'message'].includes(reportedObjectType)) {
      return res.status(400).json({ message: 'Invalid report type' });
    }

    if (!mongoose.Types.ObjectId.isValid(reportedObjectId)) {
      return res.status(400).json({ message: 'Invalid object ID' });
    }

    const report = new SocialReport({
      reporter: req.user._id,
      reportedObject: {
        type: reportedObjectType,
        id: reportedObjectId,
      },
      reportReason,
      description: description || '',
    });

    await report.save();

    // Increment report count on the object
    if (reportedObjectType === 'post') {
      await SocialPost.findByIdAndUpdate(
        reportedObjectId,
        { $inc: { reportCount: 1 } }
      );
    }

    logger.info(`Report created for ${reportedObjectType} ${reportedObjectId}`);
    res.status(201).json({ report });
  } catch (err) {
    next(err);
  }
});

// ============ MESSAGING ROUTES ============

// Get or create conversation
router.post('/conversations/get-or-create', authenticate, async (req, res, next) => {
  try {
    const { participantId, conversationType = 'direct' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      return res.status(400).json({ message: 'Invalid participant ID' });
    }

    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({ message: 'User not found' });
    }

    // For direct conversations, check if already exists
    if (conversationType === 'direct') {
      const existing = await SocialConversation.findOne({
        conversationType: 'direct',
        participants: { $all: [req.user._id, participantId] },
      });

      if (existing) {
        return res.json({ conversation: existing });
      }
    }

    // Create new conversation
    const conversation = new SocialConversation({
      participants: [req.user._id, participantId],
      conversationType: 'direct',
    });

    await conversation.save();
    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
});

// Send message
router.post('/conversations/:conversationId/messages', authenticate, async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { content, messageType = 'text', mediaUrl, mediaFileId, fileName } = req.body;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

    if (!content || (messageType === 'text' && content.trim().length === 0)) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const conversation = await SocialConversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to send messages in this conversation' });
    }

    const message = new SocialMessage({
      conversationId,
      sender: req.user._id,
      messageType,
      content: content.trim(),
      mediaUrl: mediaUrl || null,
      mediaFileId: mediaFileId || null,
      fileName: fileName || null,
    });

    await message.save();
    await message.populate('sender', 'name avatar email');

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageTime = new Date();
    conversation.messageCount += 1;
    await conversation.save();

    logger.info(`Message sent in conversation ${conversationId}`);
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
});

// Get conversation messages
router.get('/conversations/:conversationId/messages', authenticate, async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 30 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

    const conversation = await SocialConversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 50);

    const messages = await SocialMessage.find({ conversationId, isDeleted: false })
      .populate('sender', 'name avatar email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    const total = await SocialMessage.countDocuments({ conversationId, isDeleted: false });

    res.json({
      messages: messages.reverse(),
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get user conversations
router.get('/conversations', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 50);

    const conversations = await SocialConversation.find({
      participants: req.user._id,
      archivedBy: { $ne: req.user._id },
    })
      .populate('participants', 'name avatar email')
      .populate('lastMessage')
      .sort({ lastMessageTime: -1 })
      .skip(skip)
      .limit(pageLimit);

    const total = await SocialConversation.countDocuments({
      participants: req.user._id,
      archivedBy: { $ne: req.user._id },
    });

    res.json({
      conversations,
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Mark messages as read
router.put('/conversations/:conversationId/mark-read', authenticate, async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

    const conversation = await SocialConversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    await SocialMessage.updateMany(
      {
        conversationId,
        sender: { $ne: req.user._id },
      },
      {
        $push: {
          readBy: {
            userId: req.user._id,
            readAt: new Date(),
          },
        },
      }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (err) {
    next(err);
  }
});

// Delete message
router.delete('/messages/:messageId', authenticate, async (req, res, next) => {
  try {
    const { messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }

    const message = await SocialMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await SocialMessage.findByIdAndUpdate(messageId, { isDeleted: true });
    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ============ STORY ROUTES ============

// Create story
router.post('/stories/create', authenticate, async (req, res, next) => {
  try {
    const { content, mediaType = 'image', mediaUrl, mediaFileId, privacy = 'public', allowedViewers } = req.body;

    if (!mediaUrl || mediaUrl.trim().length === 0) {
      return res.status(400).json({ message: 'Story media URL is required' });
    }

    // Set expiry to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const story = new SocialStory({
      author: req.user._id,
      content: content || '',
      mediaType,
      mediaUrl,
      mediaFileId: mediaFileId || null,
      privacy,
      allowedViewers: allowedViewers || [],
      expiresAt,
    });

    await story.save();
    await story.populate('author', 'name avatar email');

    logger.info(`Story created by ${req.user._id}`);
    res.status(201).json({ story });
  } catch (err) {
    next(err);
  }
});

// Get user stories
router.get('/stories/:userId', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const now = new Date();
    const stories = await SocialStory.find({
      author: userId,
      expiresAt: { $gt: now },
      $or: [
        { privacy: 'public' },
        { privacy: 'friends', author: { $in: userId } },
        { privacy: 'custom', allowedViewers: req.user._id },
      ],
    })
      .populate('author', 'name avatar email')
      .sort({ createdAt: -1 });

    res.json({ stories });
  } catch (err) {
    next(err);
  }
});

// Get all stories for feed
router.get('/stories', authenticate, async (req, res, next) => {
  try {
    const now = new Date();

    // Get stories from following users
    const following = await SocialFollow.find(
      { follower: req.user._id, status: 'following' },
      'following'
    ).lean();

    const followingIds = following.map(f => f.following);
    followingIds.push(req.user._id); // Include own stories

    const stories = await SocialStory.find({
      author: { $in: followingIds },
      expiresAt: { $gt: now },
      hiddenFrom: { $ne: req.user._id },
    })
      .populate('author', 'name avatar email')
      .sort({ createdAt: -1 })
      .lean();

    // Group by author
    const groupedStories = {};
    stories.forEach(story => {
      const authorId = story.author._id.toString();
      if (!groupedStories[authorId]) {
        groupedStories[authorId] = {
          author: story.author,
          stories: [],
        };
      }
      groupedStories[authorId].stories.push(story);
    });

    res.json({ stories: Object.values(groupedStories) });
  } catch (err) {
    next(err);
  }
});

// View story
router.post('/stories/:storyId/view', authenticate, async (req, res, next) => {
  try {
    const { storyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({ message: 'Invalid story ID' });
    }

    const story = await SocialStory.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    // Check if already viewed
    const alreadyViewed = story.views.find(v => v.userId.toString() === req.user._id.toString());

    if (!alreadyViewed) {
      story.views.push({
        userId: req.user._id,
        viewedAt: new Date(),
      });
      story.viewCount += 1;
      await story.save();
    }

    res.json({ message: 'Story viewed', viewCount: story.viewCount });
  } catch (err) {
    next(err);
  }
});

// Delete story
router.delete('/stories/:storyId', authenticate, async (req, res, next) => {
  try {
    const { storyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({ message: 'Invalid story ID' });
    }

    const story = await SocialStory.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    if (story.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this story' });
    }

    await SocialStory.findByIdAndDelete(storyId);
    logger.info(`Story ${storyId} deleted by ${req.user._id}`);
    res.json({ message: 'Story deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// React to story
router.post('/stories/:storyId/react', authenticate, async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const { emoji } = req.body;

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({ message: 'Invalid story ID' });
    }

    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' });
    }

    const story = await SocialStory.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    const existingReaction = story.reactions.find(r => r.userId.toString() === req.user._id.toString());

    if (existingReaction) {
      existingReaction.emoji = emoji;
    } else {
      story.reactions.push({
        userId: req.user._id,
        emoji,
        reactedAt: new Date(),
      });
    }

    await story.save();
    res.json({ message: 'Story reacted', reactions: story.reactions.length });
  } catch (err) {
    next(err);
  }
});

// ============ ADDITIONAL ROUTES ============

// Block user
router.post('/users/:userId/block', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add to profile's blocked users list (if not using a separate model)
    let profile = await SocialProfile.findOne({ userId: req.user._id });
    if (!profile) {
      profile = new SocialProfile({ userId: req.user._id });
    }

    if (!profile.blockedUsers) {
      profile.blockedUsers = [];
    }

    if (!profile.blockedUsers.includes(userId)) {
      profile.blockedUsers.push(userId);
      await profile.save();
    }

    logger.info(`User ${req.user._id} blocked ${userId}`);
    res.json({ message: 'User blocked successfully' });
  } catch (err) {
    next(err);
  }
});

// Unblock user
router.post('/users/:userId/unblock', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const profile = await SocialProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    profile.blockedUsers = profile.blockedUsers.filter(id => id.toString() !== userId);
    await profile.save();

    logger.info(`User ${req.user._id} unblocked ${userId}`);
    res.json({ message: 'User unblocked successfully' });
  } catch (err) {
    next(err);
  }
});

// Save post
router.post('/posts/:postId/save', authenticate, async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await SocialPost.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (!post.savedBy) {
      post.savedBy = [];
    }

    const alreadySaved = post.savedBy.find(id => id.toString() === req.user._id.toString());

    if (!alreadySaved) {
      post.savedBy.push(req.user._id);
      await post.save();
      res.json({ message: 'Post saved successfully', saved: true });
    } else {
      res.json({ message: 'Post already saved', saved: true });
    }
  } catch (err) {
    next(err);
  }
});

// Unsave post
router.post('/posts/:postId/unsave', authenticate, async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await SocialPost.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.savedBy = post.savedBy.filter(id => id.toString() !== req.user._id.toString());
    await post.save();

    res.json({ message: 'Post unsaved successfully', saved: false });
  } catch (err) {
    next(err);
  }
});

// Get saved posts
router.get('/posts/saved', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 50);

    const posts = await SocialPost.find({
      savedBy: req.user._id,
      isDeleted: false,
    })
      .populate('author', 'name avatar email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean();

    const total = await SocialPost.countDocuments({
      savedBy: req.user._id,
      isDeleted: false,
    });

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Share post
router.post('/posts/:postId/share', authenticate, async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { caption } = req.body;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const originalPost = await SocialPost.findById(postId);
    if (!originalPost) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Create a share record
    const sharedPost = new SocialPost({
      author: req.user._id,
      content: caption || `Shared: ${originalPost.content}`,
      sharedFrom: postId,
      images: originalPost.images,
      privacy: 'public',
    });

    await sharedPost.save();
    await sharedPost.populate('author', 'name avatar email');

    originalPost.shareCount = (originalPost.shareCount || 0) + 1;
    await originalPost.save();

    logger.info(`Post ${postId} shared by ${req.user._id}`);
    res.status(201).json({ post: sharedPost });
  } catch (err) {
    next(err);
  }
});

// Get trending posts
router.get('/posts/trending', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 50);

    // Get posts from last 7 days, sorted by engagement
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const posts = await SocialPost.find({
      createdAt: { $gte: sevenDaysAgo },
      visibility: 'visible',
      isDeleted: false,
    })
      .populate('author', 'name avatar email')
      .sort({ likeCount: -1, commentCount: -1, shareCount: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean();

    const total = await SocialPost.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
      visibility: 'visible',
      isDeleted: false,
    });

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get user statistics
router.get('/stats/:userId', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const profile = await SocialProfile.findOne({ userId }).lean();
    const postCount = await SocialPost.countDocuments({ author: userId, isDeleted: false });
    const totalLikes = await SocialPost.aggregate([
      { $match: { author: mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, totalLikes: { $sum: '$likeCount' } } },
    ]);

    const stats = {
      userId,
      postCount,
      followerCount: profile?.followerCount || 0,
      followingCount: profile?.followingCount || 0,
      totalLikes: totalLikes[0]?.totalLikes || 0,
      engagementScore: profile?.engagementScore || 0,
    };

    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
