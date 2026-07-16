const express = require('express');
const router = express.Router();
const BehavioralLearning = require('../models/BehavioralLearning');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const { authenticate } = require('../middleware/auth');

// Get or create behavioral learning profile
router.get('/profile/:profileId', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;

    // Verify access
    const profile = await MatrimonialProfile.findOne({
      _id: profileId,
      userId: req.user._id
    });

    if (!profile) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let learning = await BehavioralLearning.findOne({ profileId });

    if (!learning) {
      learning = new BehavioralLearning({
        profileId,
        userId: req.user._id
      });
      await learning.save();
    }

    res.json({ learning });
  } catch (error) {
    console.error('Error fetching behavioral learning:', error);
    res.status(500).json({ error: 'Failed to fetch behavioral data' });
  }
});

// Log interaction
router.post('/profile/:profileId/interaction', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { targetProfileId, interactionType, duration, metadata } = req.body;

    // Verify access
    const profile = await MatrimonialProfile.findOne({
      _id: profileId,
      userId: req.user._id
    });

    if (!profile) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let learning = await BehavioralLearning.findOne({ profileId });

    if (!learning) {
      learning = new BehavioralLearning({
        profileId,
        userId: req.user._id
      });
    }

    // Log the interaction
    learning.logInteraction(targetProfileId, interactionType, duration || 0, metadata || {});

    // Learn from the profile if it's a meaningful interaction
    if (['like', 'interest_sent', 'interest_rejected', 'skip', 'profile_saved'].includes(interactionType)) {
      const targetProfile = await MatrimonialProfile.findById(targetProfileId);
      if (targetProfile) {
        await learning.learnFromProfile(targetProfile, interactionType);
      }
    }

    await learning.save();

    res.json({
      message: 'Interaction logged',
      engagementScore: learning.engagementScore
    });
  } catch (error) {
    console.error('Error logging interaction:', error);
    res.status(500).json({ error: 'Failed to log interaction' });
  }
});

// Get preference patterns
router.get('/profile/:profileId/patterns', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;

    const learning = await BehavioralLearning.findOne({ profileId });

    if (!learning) {
      return res.json({ patterns: [], idealProfile: null });
    }

    // Generate ideal profile if not already done or outdated
    const daysSinceUpdate = learning.idealProfile.updatedAt 
      ? (new Date() - learning.idealProfile.updatedAt) / (1000 * 60 * 60 * 24)
      : 999;

    if (daysSinceUpdate > 7) {
      learning.generateIdealProfile();
      await learning.save();
    }

    res.json({
      patterns: learning.preferencePatterns,
      idealProfile: learning.idealProfile,
      dealBreakers: learning.dealBreakers,
      statistics: learning.statistics
    });
  } catch (error) {
    console.error('Error fetching patterns:', error);
    res.status(500).json({ error: 'Failed to fetch preference patterns' });
  }
});

// Get engagement insights
router.get('/profile/:profileId/insights', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;

    const learning = await BehavioralLearning.findOne({ profileId });

    if (!learning) {
      return res.json({ insights: [] });
    }

    const insights = [];
    const stats = learning.statistics;

    // Generate insights based on behavior
    if (stats.likeToViewRatio < 10) {
      insights.push({
        type: 'tip',
        message: 'You\'re viewing many profiles but liking few. Try narrowing your search criteria to find better matches.',
        category: 'search'
      });
    }

    if (stats.acceptanceRate < 20 && stats.interestsSent > 10) {
      insights.push({
        type: 'warning',
        message: 'Your acceptance rate is low. Consider refining your approach or reaching out to more compatible matches.',
        category: 'matching'
      });
    }

    if (stats.averageViewDuration < 30) {
      insights.push({
        type: 'tip',
        message: 'Spend more time viewing profiles to understand compatibility better.',
        category: 'engagement'
      });
    }

    if (learning.dealBreakers.length > 0) {
      insights.push({
        type: 'info',
        message: `We've identified ${learning.dealBreakers.length} deal-breaker(s) from your rejections. We'll avoid showing similar profiles.`,
        category: 'preferences',
        dealBreakers: learning.dealBreakers
      });
    }

    if (learning.preferencePatterns.length > 5) {
      const topPreferences = learning.preferencePatterns
        .sort((a, b) => b.weightage - a.weightage)
        .slice(0, 3)
        .map(p => p.attribute);

      insights.push({
        type: 'success',
        message: `Your top preferences are: ${topPreferences.join(', ')}. We're showing you more matches based on these.`,
        category: 'preferences'
      });
    }

    if (stats.totalViews > 100 && stats.interestsSent === 0) {
      insights.push({
        type: 'prompt',
        message: 'You\'ve viewed many profiles but haven\'t sent any interests. Don\'t hesitate to reach out!',
        category: 'engagement'
      });
    }

    res.json({ insights, engagementScore: learning.engagementScore });
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// Get recommended matches based on behavioral learning
router.get('/profile/:profileId/smart-recommendations', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { limit = 10 } = req.query;

    const learning = await BehavioralLearning.findOne({ profileId });

    if (!learning || learning.preferencePatterns.length === 0) {
      // Not enough data, return basic matches
      return res.json({
        recommendations: [],
        message: 'Not enough behavioral data yet. View more profiles to get personalized recommendations.'
      });
    }

    const profile = await MatrimonialProfile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Build query based on learned preferences
    const query = {
      _id: { $ne: profileId },
      gender: profile.gender === 'male' ? 'female' : 'male',
      isActive: true
    };

    // Add ideal profile filters
    if (learning.idealProfile.ageRange.min) {
      query.age = {
        $gte: learning.idealProfile.ageRange.min,
        $lte: learning.idealProfile.ageRange.max
      };
    }

    if (learning.idealProfile.heightRange.min) {
      query.height = {
        $gte: learning.idealProfile.heightRange.min,
        $lte: learning.idealProfile.heightRange.max
      };
    }

    if (learning.idealProfile.educationLevels && learning.idealProfile.educationLevels.length > 0) {
      query.education = { $in: learning.idealProfile.educationLevels };
    }

    if (learning.idealProfile.professions && learning.idealProfile.professions.length > 0) {
      query.profession = { $in: learning.idealProfile.professions };
    }

    if (learning.idealProfile.locations && learning.idealProfile.locations.length > 0) {
      query.city = { $in: learning.idealProfile.locations };
    }

    // Exclude deal breakers
    learning.dealBreakers.forEach(dealBreaker => {
      if (dealBreaker.confidence > 70) {
        query[dealBreaker.attribute] = { $ne: dealBreaker.value };
      }
    });

    // Exclude already interacted profiles (except views)
    const interactedProfiles = learning.interactions
      .filter(i => ['interest_sent', 'interest_rejected', 'profile_blocked'].includes(i.interactionType))
      .map(i => i.targetProfileId);

    if (interactedProfiles.length > 0) {
      query._id = { $nin: interactedProfiles };
    }

    const recommendations = await MatrimonialProfile.find(query)
      .limit(parseInt(limit))
      .select('name age height education profession city religion caste photo');

    res.json({
      recommendations,
      basedOn: {
        patterns: learning.preferencePatterns.length,
        interactions: learning.interactions.length,
        idealProfile: learning.idealProfile
      }
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Get interaction history
router.get('/profile/:profileId/history', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { type, limit = 50 } = req.query;

    const learning = await BehavioralLearning.findOne({ profileId })
      .populate('interactions.targetProfileId', 'name age city profession photo');

    if (!learning) {
      return res.json({ history: [] });
    }

    let history = learning.interactions.slice(-parseInt(limit));

    if (type) {
      history = history.filter(i => i.interactionType === type);
    }

    res.json({ history: history.reverse() });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch interaction history' });
  }
});

// Reset behavioral learning (clear history)
router.post('/profile/:profileId/reset', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;

    // Verify access
    const profile = await MatrimonialProfile.findOne({
      _id: profileId,
      userId: req.user._id
    });

    if (!profile) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const learning = await BehavioralLearning.findOne({ profileId });
    if (learning) {
      learning.interactions = [];
      learning.preferencePatterns = [];
      learning.dealBreakers = [];
      learning.statistics = {
        totalViews: 0,
        totalLikes: 0,
        totalSkips: 0,
        interestsSent: 0,
        interestsAccepted: 0,
        interestsRejected: 0,
        averageViewDuration: 0,
        likeToViewRatio: 0,
        acceptanceRate: 0
      };
      learning.idealProfile = {};
      learning.engagementScore = 0;

      await learning.save();
    }

    res.json({ message: 'Behavioral data reset successfully' });
  } catch (error) {
    console.error('Error resetting behavioral data:', error);
    res.status(500).json({ error: 'Failed to reset behavioral data' });
  }
});

// Get engagement score breakdown
router.get('/profile/:profileId/engagement-breakdown', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;

    const learning = await BehavioralLearning.findOne({ profileId });

    if (!learning) {
      return res.json({ score: 0, breakdown: {} });
    }

    const stats = learning.statistics;
    
    const breakdown = {
      activityLevel: {
        score: Math.min(40, (stats.totalViews / 100) * 40),
        max: 40,
        description: 'Based on profile views and overall activity'
      },
      qualityOfEngagement: {
        score: Math.min(30, stats.likeToViewRatio * 0.3),
        max: 30,
        description: 'Based on like-to-view ratio'
      },
      successRate: {
        score: Math.min(30, stats.acceptanceRate * 0.3),
        max: 30,
        description: 'Based on interest acceptance rate'
      }
    };

    res.json({
      totalScore: learning.engagementScore,
      breakdown,
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching engagement breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch engagement breakdown' });
  }
});

module.exports = router;
