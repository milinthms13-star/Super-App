/**
 * Matrimonial Integration Middleware
 * Enforces subscription entitlements, preference validation, and premium features gating
 */

const mongoose = require('mongoose');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const { subscriptionService } = require('../utils/subscriptionService');
const { blueTickService } = require('../utils/blueTickService');

const normalizeId = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'object') {
    return String(value._id || value.id || '').trim();
  }

  return String(value).trim();
};

const hasPreferenceValue = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return value !== null && value !== undefined;
};

const attachMatrimonialProfileContext = (req, profile) => {
  if (!profile) {
    return null;
  }

  const profileId = normalizeId(profile._id);
  req.matrimonialProfile = profile;
  req.matrimonialProfileId = profileId;

  if (req.user && profileId) {
    req.user.matrimonialProfileId = profileId;
  }

  return profile;
};

const loadCurrentMatrimonialProfile = async (req) => {
  if (req.matrimonialProfile) {
    return attachMatrimonialProfileContext(req, req.matrimonialProfile);
  }

  const requestProfileId = normalizeId(req.matrimonialProfileId || req.user?.matrimonialProfileId);
  if (requestProfileId && mongoose.Types.ObjectId.isValid(requestProfileId)) {
    const existingProfile = await MatrimonialProfile.findById(requestProfileId);
    if (existingProfile) {
      return attachMatrimonialProfileContext(req, existingProfile);
    }
  }

  const userId = normalizeId(req.user?._id || req.user?.id || req.auth?.sub);
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    const profileByUserId = await MatrimonialProfile.findOne({ userId });
    if (profileByUserId) {
      return attachMatrimonialProfileContext(req, profileByUserId);
    }
  }

  const userEmail = String(req.user?.email || req.auth?.email || '')
    .trim()
    .toLowerCase();
  if (userEmail) {
    const profileByEmail = await MatrimonialProfile.findOne({ email: userEmail });
    if (profileByEmail) {
      return attachMatrimonialProfileContext(req, profileByEmail);
    }
  }

  return null;
};

const ensureMatrimonialProfileContext = async (req, res, next) => {
  try {
    const profile = await loadCurrentMatrimonialProfile(req);
    if (!profile) {
      return res.status(404).json({
        error: 'Complete your matrimonial profile before accessing this feature',
      });
    }

    return next();
  } catch (error) {
    console.error('Matrimonial profile context error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Check if user has completed mandatory partner preferences
 */
const ensurePartnerPreferencesComplete = async (req, res, next) => {
  try {
    if (!req.user && !req.auth) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const profile = await loadCurrentMatrimonialProfile(req);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const preferences = profile.preferences || profile.partnerPreferences || {};
    const required = ['ageMin', 'ageMax', 'religion', 'location'];
    const hasRequired = required.every((field) => hasPreferenceValue(preferences[field]));

    if (!hasRequired) {
      return res.status(403).json({
        error: 'Partner preferences are mandatory before accessing matrimonial features',
        missingFields: required.filter((field) => !hasPreferenceValue(preferences[field])),
      });
    }

    attachMatrimonialProfileContext(req, profile);
    return next();
  } catch (error) {
    console.error('Partner preference validation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Check subscription entitlement for specific feature
 */
const checkSubscriptionEntitlement = (feature) => {
  return async (req, res, next) => {
    try {
      const userEmail = req.user?.email;
      if (!userEmail) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hasAccess = await subscriptionService.hasEntitlement(userEmail, feature);
      
      if (!hasAccess) {
        const subscription = await subscriptionService.getUserSubscription(userEmail);
        return res.status(403).json({
          error: `${feature} requires a premium subscription`,
          currentTier: subscription.tier || 'free',
          requiredTier: feature === 'unlimited_chat' ? 'gold' : 'gold'
        });
      }

      next();
    } catch (error) {
      console.error('Subscription check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Check if profile is verified (blue tick or pending)
 */
const ensureProfileVerified = async (req, res, next) => {
  try {
    const profileId = normalizeId(req.params.profileId || req.body?.profileId || req.query?.profileId);
    const profile =
      profileId && mongoose.Types.ObjectId.isValid(profileId)
        ? await MatrimonialProfile.findById(profileId)
        : await loadCurrentMatrimonialProfile(req);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (profile.verificationStatus === 'rejected') {
      return res.status(403).json({
        error: 'Profile verification failed. Contact support.',
        verificationStatus: profile.verificationStatus
      });
    }

    attachMatrimonialProfileContext(req, profile);
    return next();
  } catch (error) {
    console.error('Profile verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Enforce subscription limits (profile views, messages sent, etc.)
 */
const enforceSubscriptionLimits = (limitType) => {
  return async (req, res, next) => {
    try {
      const userEmail = req.user?.email;
      if (!userEmail) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const subscription = await subscriptionService.getUserSubscription(userEmail);
      
      // Get limits based on tier
      const limits = {
        profileViews: subscription.tier === 'free' ? 50 : subscription.tier === 'gold' ? 500 : subscription.tier === 'premium' ? 2000 : Infinity,
        messagesPerDay: subscription.tier === 'free' ? 3 : subscription.tier === 'gold' ? 50 : subscription.tier === 'premium' ? 200 : Infinity,
        interestsPerDay: subscription.tier === 'free' ? 5 : subscription.tier === 'gold' ? 20 : subscription.tier === 'premium' ? 50 : Infinity
      };

      req.subscriptionLimits = limits;
      req.subscription = subscription;

      // Check if still within limit
      const userProfile = await loadCurrentMatrimonialProfile(req);
      if (userProfile) {
        const thisMonth = new Date();
        thisMonth.setDate(1);

        // Count this month's usage
        const viewsThisMonth = userProfile.viewHistory?.filter(v => 
          new Date(v.viewedAt) >= thisMonth
        ).length || 0;

        if (limitType === 'profileView' && viewsThisMonth >= limits.profileViews) {
          return res.status(429).json({
            error: 'Profile view limit reached for this month',
            limit: limits.profileViews,
            used: viewsThisMonth,
            resetDate: new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 1)
          });
        }
      }

      return next();
    } catch (error) {
      console.error('Subscription limit error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Check if user is blocked from contacting profile
 */
const checkBlockStatus = async (req, res, next) => {
  try {
    const fromProfile = await loadCurrentMatrimonialProfile(req);
    const fromProfileId = normalizeId(fromProfile?._id);
    const toProfileId = normalizeId(req.body?.toProfileId || req.params.profileId);

    if (!fromProfileId || !toProfileId) {
      return res.status(400).json({ error: 'Profile IDs required' });
    }

    if (!mongoose.Types.ObjectId.isValid(toProfileId)) {
      return res.status(400).json({ error: 'Invalid profile ID' });
    }

    const toProfile = await MatrimonialProfile.findById(toProfileId);
    if (!toProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const targetBlockedCurrent = Array.isArray(fromProfile?.blockedBy)
      && fromProfile.blockedBy.some((entry) => normalizeId(entry) === toProfileId);
    if (targetBlockedCurrent) {
      return res.status(403).json({
        error: 'This user has blocked you. You cannot contact them.'
      });
    }

    const currentBlockedTarget = Array.isArray(toProfile?.blockedBy)
      && toProfile.blockedBy.some((entry) => normalizeId(entry) === fromProfileId);
    if (currentBlockedTarget) {
      return res.status(403).json({
        error: 'You have blocked this user. Unblock to contact.'
      });
    }

    attachMatrimonialProfileContext(req, fromProfile);
    return next();
  } catch (error) {
    console.error('Block status check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Enforce contact visibility based on privacy settings
 */
const checkContactVisibility = async (req, res, next) => {
  try {
    const viewerEmail = req.user?.email;
    const profileId = req.params.profileId || req.body.profileId;

    if (!profileId) {
      return res.status(400).json({ error: 'Profile ID required' });
    }

    const profile = await MatrimonialProfile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const viewerProfile = await loadCurrentMatrimonialProfile(req);
    const isOwner = viewerProfile
      ? normalizeId(viewerProfile._id) === normalizeId(profile._id)
      : viewerEmail === profile.email;
    const isPremiumViewer = await subscriptionService.hasEntitlement(viewerEmail, 'view_contact_details');

    // Check contact visibility
    if (profile.privacy?.hidePhone || profile.premiumOnlyContact) {
      if (!isPremiumViewer && !isOwner) {
        return res.status(403).json({
          error: 'Contact details are hidden. Requires premium membership.',
          phone: 'Premium member only'
        });
      }
    }

    req.canViewContactDetails = isPremiumViewer || isOwner;
    return next();
  } catch (error) {
    console.error('Contact visibility check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  ensureMatrimonialProfileContext,
  ensurePartnerPreferencesComplete,
  checkSubscriptionEntitlement,
  ensureProfileVerified,
  enforceSubscriptionLimits,
  checkBlockStatus,
  checkContactVisibility
};
