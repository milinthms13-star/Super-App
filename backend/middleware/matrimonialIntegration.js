/**
 * Matrimonial Integration Middleware
 * Enforces subscription entitlements, preference validation, and premium features gating
 */

const mongoose = require('mongoose');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const { subscriptionService } = require('../utils/subscriptionService');
const { blueTickService } = require('../utils/blueTickService');

/**
 * Check if user has completed mandatory partner preferences
 */
const ensurePartnerPreferencesComplete = async (req, res, next) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const profile = await MatrimonialProfile.findOne({ email: userEmail });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const preferences = profile.partnerPreferences;
    const required = ['ageMin', 'ageMax', 'religion', 'location'];
    const hasRequired = required.every(field => preferences && preferences[field] !== null && preferences[field] !== undefined);

    if (!hasRequired) {
      return res.status(403).json({
        error: 'Partner preferences are mandatory before accessing matrimonial features',
        missingFields: required.filter(field => !preferences?.[field])
      });
    }

    req.matrimonialProfile = profile;
    next();
  } catch (error) {
    console.error('Partner preference validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    const profileId = req.params.profileId || req.user?.matrimonialProfileId;
    if (!profileId) {
      return res.status(400).json({ error: 'Profile ID required' });
    }

    const profile = await MatrimonialProfile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (profile.verificationStatus === 'rejected') {
      return res.status(403).json({
        error: 'Profile verification failed. Contact support.',
        verificationStatus: profile.verificationStatus
      });
    }

    req.matrimonialProfile = profile;
    next();
  } catch (error) {
    console.error('Profile verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
      const userProfile = await MatrimonialProfile.findOne({ email: userEmail });
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

      next();
    } catch (error) {
      console.error('Subscription limit error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Check if user is blocked from contacting profile
 */
const checkBlockStatus = async (req, res, next) => {
  try {
    const fromProfileId = req.user?.matrimonialProfileId;
    const toProfileId = req.body.toProfileId || req.params.profileId;

    if (!fromProfileId || !toProfileId) {
      return res.status(400).json({ error: 'Profile IDs required' });
    }

    const toProfile = await MatrimonialProfile.findById(toProfileId);
    if (toProfile?.blockedBy?.includes(fromProfileId)) {
      return res.status(403).json({
        error: 'This user has blocked you. You cannot contact them.'
      });
    }

    const fromProfile = await MatrimonialProfile.findById(fromProfileId);
    if (fromProfile?.blockedProfiles?.includes(toProfileId)) {
      return res.status(403).json({
        error: 'You have blocked this user. Unblock to contact.'
      });
    }

    next();
  } catch (error) {
    console.error('Block status check error:', error);
    res.status(500).json({ error: 'Internal server error' });
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

    const isPremiumViewer = await subscriptionService.hasEntitlement(viewerEmail, 'view_contact_details');

    // Check contact visibility
    if (profile.privacy?.hidePhone || profile.premiumOnlyContact) {
      if (!isPremiumViewer && viewerEmail !== profile.email) {
        return res.status(403).json({
          error: 'Contact details are hidden. Requires premium membership.',
          phone: 'Premium member only'
        });
      }
    }

    req.canViewContactDetails = isPremiumViewer || viewerEmail === profile.email;
    next();
  } catch (error) {
    console.error('Contact visibility check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  ensurePartnerPreferencesComplete,
  checkSubscriptionEntitlement,
  ensureProfileVerified,
  enforceSubscriptionLimits,
  checkBlockStatus,
  checkContactVisibility
};
