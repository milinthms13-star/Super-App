const { contentModerationService } = require('../services/contentModerationService');
const { errorTrackingService } = require('../services/errorTrackingService');

/**
 * Middleware to moderate request body text fields
 */
const moderateContent = (fields = []) => {
  return async (req, res, next) => {
    try {
      if (!Array.isArray(fields) || fields.length === 0) {
        return next();
      }

      const moderationResults = [];

      for (const field of fields) {
        const text = req.body[field];
        
        if (text && typeof text === 'string') {
          const result = await contentModerationService.moderateText(text, field);
          
          moderationResults.push({
            field,
            ...result
          });

          // If content should be blocked, return immediately
          if (result.action === 'block') {
            return res.status(400).json({
              error: 'Content violates community guidelines',
              field,
              flags: result.flags,
              message: 'Your content has been flagged for inappropriate content. Please revise and try again.'
            });
          }

          // If content is flagged, add to request for later processing
          if (result.action === 'flag') {
            req.contentFlags = req.contentFlags || [];
            req.contentFlags.push({
              field,
              flags: result.flags,
              score: result.score
            });
          }
        }
      }

      // Attach moderation results to request
      req.moderationResults = moderationResults;

      next();
    } catch (error) {
      errorTrackingService.captureError(error, { 
        userId: req.user?.id,
        context: 'content-moderation-middleware' 
      });
      // Don't block request on moderation failure
      next();
    }
  };
};

/**
 * Middleware to check spam rate limits
 */
const checkSpamRate = (action) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return next();
      }

      const isSpamming = await contentModerationService.checkSpamRate(req.user.id, action);

      if (isSpamming) {
        return res.status(429).json({
          error: 'Too many requests',
          message: 'You are sending too many requests. Please slow down and try again later.',
          retryAfter: 3600
        });
      }

      next();
    } catch (error) {
      errorTrackingService.captureError(error, {
        userId: req.user?.id,
        action,
        context: 'spam-rate-check'
      });
      // Don't block on error
      next();
    }
  };
};

/**
 * Middleware to moderate profile data
 */
const moderateProfile = async (req, res, next) => {
  try {
    const profileData = req.body;

    const result = await contentModerationService.moderateProfile(profileData);

    if (result.action === 'block') {
      return res.status(400).json({
        error: 'Profile content violates community guidelines',
        flags: result.flags,
        message: 'Your profile contains inappropriate content. Please review and revise.'
      });
    }

    if (result.action === 'flag') {
      req.profileFlags = {
        flags: result.flags,
        score: result.score,
        requiresReview: true
      };
    }

    req.profileModerationResult = result;

    next();
  } catch (error) {
    errorTrackingService.captureError(error, {
      userId: req.user?.id,
      context: 'profile-moderation-middleware'
    });
    // Don't block on error
    next();
  }
};

/**
 * Middleware to moderate messages
 */
const moderateMessage = async (req, res, next) => {
  try {
    const message = req.body.content || req.body.message;

    if (!message) {
      return next();
    }

    const result = await contentModerationService.moderateMessage(message, {
      senderId: req.user?.id,
      receiverId: req.body.receiverId
    });

    if (result.action === 'block') {
      return res.status(400).json({
        error: 'Message violates community guidelines',
        flags: result.flags,
        message: 'Your message contains inappropriate content and cannot be sent.'
      });
    }

    if (result.action === 'flag') {
      req.messageFlags = {
        flags: result.flags,
        score: result.score
      };
    }

    req.messageModerationResult = result;

    next();
  } catch (error) {
    errorTrackingService.captureError(error, {
      userId: req.user?.id,
      context: 'message-moderation-middleware'
    });
    // Don't block on error
    next();
  }
};

module.exports = {
  moderateContent,
  checkSpamRate,
  moderateProfile,
  moderateMessage
};
