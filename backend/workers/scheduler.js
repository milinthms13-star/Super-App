const SocialPost = require('../models/SocialPost');

async function publishDueScheduledPosts(authorIds = []) {
  const query = {
    status: 'scheduled',
    scheduledFor: { $lte: new Date() },
    isDeleted: false,
  };

  if (authorIds.length > 0) {
    query.author = { $in: authorIds };
  }

  await SocialPost.updateMany(
    query,
    {
      $set: {
        status: 'published',
        publishedAt: new Date(),
        scheduledFor: null,
      },
    }
  );
}

module.exports = { publishDueScheduledPosts };
