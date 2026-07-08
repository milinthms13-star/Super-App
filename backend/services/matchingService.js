/**
 * Advanced Matching Service
 * AI-powered collaborative filtering and content-based recommendation
 */

const MatrimonialProfile = require('../models/MatrimonialProfile');
const logger = require('../utils/logger');

class MatchingService {
  constructor() {
    this.userBehaviorWeights = {
      profileView: 1,
      interestSent: 3,
      interestAccepted: 5,
      messageSent: 4,
      callInitiated: 6,
      profileShortlisted: 2
    };
  }

  /**
   * Calculate advanced match score using multiple algorithms
   */
  async calculateAdvancedMatchScore(profile1, profile2, userBehavior = null) {
    try {
      // Content-based filtering (60%)
      const contentScore = this.calculateContentBasedScore(profile1, profile2);
      
      // Collaborative filtering (30%)
      const collaborativeScore = await this.calculateCollaborativeScore(profile1, profile2);
      
      // Behavioral analysis (10%)
      const behaviorScore = this.calculateBehaviorScore(profile1, profile2, userBehavior);

      // Weighted final score
      const finalScore = (
        contentScore * 0.6 +
        collaborativeScore * 0.3 +
        behaviorScore * 0.1
      );

      return {
        totalScore: Math.round(finalScore),
        breakdown: {
          contentBased: Math.round(contentScore),
          collaborative: Math.round(collaborativeScore),
          behavioral: Math.round(behaviorScore)
        }
      };
    } catch (error) {
      logger.error('Error calculating match score:', error);
      return { totalScore: 0, breakdown: {} };
    }
  }

  /**
   * Content-based filtering using profile attributes
   */
  calculateContentBasedScore(profile1, profile2) {
    let score = 0;
    let maxScore = 0;

    // Age compatibility (15 points)
    maxScore += 15;
    const ageDiff = Math.abs(profile1.age - profile2.age);
    if (ageDiff <= 3) {
      score += 15;
    } else if (ageDiff <= 5) {
      score += 12;
    } else if (ageDiff <= 7) {
      score += 8;
    } else if (ageDiff <= 10) {
      score += 4;
    }

    // Religion match (20 points)
    maxScore += 20;
    if (profile1.religion && profile2.religion) {
      if (profile1.religion.toLowerCase() === profile2.religion.toLowerCase()) {
        score += 20;
      }
    }

    // Caste match (10 points)
    maxScore += 10;
    if (profile1.caste && profile2.caste) {
      if (profile1.caste.toLowerCase() === profile2.caste.toLowerCase()) {
        score += 10;
      }
    }

    // Education level match (15 points)
    maxScore += 15;
    const educationScore = this.compareEducationLevels(profile1.education, profile2.education);
    score += educationScore * 15;

    // Location proximity (15 points)
    maxScore += 15;
    const locationScore = this.compareLocations(profile1.location, profile2.location);
    score += locationScore * 15;

    // Profession compatibility (10 points)
    maxScore += 10;
    const professionScore = this.compareProfessions(profile1.profession, profile2.profession);
    score += professionScore * 10;

    // Marital status compatibility (5 points)
    maxScore += 5;
    if (profile1.maritalStatus === profile2.maritalStatus) {
      score += 5;
    } else if (
      (profile1.maritalStatus === 'Divorced' || profile1.maritalStatus === 'Widowed') &&
      (profile2.maritalStatus === 'Divorced' || profile2.maritalStatus === 'Widowed')
    ) {
      score += 3;
    }

    // Language compatibility (5 points)
    maxScore += 5;
    const languageScore = this.compareArrays(profile1.languages || [], profile2.languages || []);
    score += languageScore * 5;

    // Hobbies compatibility (5 points)
    maxScore += 5;
    const hobbiesScore = this.compareArrays(profile1.hobbies || [], profile2.hobbies || []);
    score += hobbiesScore * 5;

    return (score / maxScore) * 100;
  }

  /**
   * Collaborative filtering based on similar user preferences
   */
  async calculateCollaborativeScore(profile1, profile2) {
    try {
      // Find users similar to profile1
      const similarUsers = await this.findSimilarUsers(profile1, 10);
      
      if (similarUsers.length === 0) {
        return 50; // Neutral score if no similar users
      }

      let totalScore = 0;
      let count = 0;

      for (const similarUser of similarUsers) {
        // Check if similar user showed interest in profile2 or similar profiles
        const interactionScore = await this.getUserInteractionScore(
          similarUser._id,
          profile2._id
        );
        
        if (interactionScore > 0) {
          totalScore += interactionScore;
          count++;
        }
      }

      if (count === 0) {
        return 50; // Neutral score
      }

      return (totalScore / count) * 100;
    } catch (error) {
      logger.error('Error in collaborative filtering:', error);
      return 50;
    }
  }

  /**
   * Find users similar to given profile
   */
  async findSimilarUsers(profile, limit = 10) {
    try {
      const query = {
        _id: { $ne: profile._id },
        age: { $gte: profile.age - 5, $lte: profile.age + 5 }
      };

      if (profile.religion) {
        query.religion = profile.religion;
      }

      if (profile.location) {
        query.location = { $regex: profile.location, $options: 'i' };
      }

      const similarProfiles = await MatrimonialProfile.find(query)
        .limit(limit)
        .select('_id interests messages');

      return similarProfiles;
    } catch (error) {
      logger.error('Error finding similar users:', error);
      return [];
    }
  }

  /**
   * Get user interaction score with a profile
   */
  async getUserInteractionScore(userId, targetProfileId) {
    try {
      const userProfile = await MatrimonialProfile.findOne({ userId })
        .select('interests messages');

      if (!userProfile) {
        return 0;
      }

      let score = 0;

      // Check interests
      const interest = userProfile.interests.find(
        i => i.toProfileId?.toString() === targetProfileId.toString()
      );
      if (interest) {
        if (interest.status === 'accepted') {
          score += 5;
        } else if (interest.status === 'sent') {
          score += 3;
        }
      }

      // Check messages
      const messageCount = userProfile.messages.filter(
        m => m.toProfileId?.toString() === targetProfileId.toString()
      ).length;
      score += Math.min(messageCount * 0.5, 2);

      return score;
    } catch (error) {
      logger.error('Error getting interaction score:', error);
      return 0;
    }
  }

  /**
   * Calculate score based on user behavior patterns
   */
  calculateBehaviorScore(profile1, profile2, userBehavior) {
    if (!userBehavior) {
      return 50; // Neutral score
    }

    let score = 50; // Base score

    // Analyze viewing patterns
    if (userBehavior.viewedProfiles) {
      const similarViewedProfiles = userBehavior.viewedProfiles.filter(p =>
        this.areProfilesSimilar(p, profile2)
      );
      score += Math.min(similarViewedProfiles.length * 5, 20);
    }

    // Analyze interest patterns
    if (userBehavior.interestedProfiles) {
      const similarInterestedProfiles = userBehavior.interestedProfiles.filter(p =>
        this.areProfilesSimilar(p, profile2)
      );
      score += Math.min(similarInterestedProfiles.length * 10, 30);
    }

    return Math.min(score, 100);
  }

  /**
   * Compare education levels
   */
  compareEducationLevels(edu1, edu2) {
    if (!edu1 || !edu2) return 0.5;

    const levels = {
      'high school': 1,
      'diploma': 2,
      'bachelor': 3,
      'master': 4,
      'phd': 5,
      'doctorate': 5
    };

    const level1 = this.getEducationLevel(edu1, levels);
    const level2 = this.getEducationLevel(edu2, levels);

    const diff = Math.abs(level1 - level2);
    
    if (diff === 0) return 1;
    if (diff === 1) return 0.8;
    if (diff === 2) return 0.5;
    return 0.3;
  }

  getEducationLevel(education, levels) {
    const lowerEdu = education.toLowerCase();
    for (const [key, value] of Object.entries(levels)) {
      if (lowerEdu.includes(key)) {
        return value;
      }
    }
    return 3; // Default to bachelor level
  }

  /**
   * Compare locations
   */
  compareLocations(loc1, loc2) {
    if (!loc1 || !loc2) return 0.5;

    const location1 = loc1.toLowerCase();
    const location2 = loc2.toLowerCase();

    // Same city/town
    if (location1 === location2) return 1;

    // Same state/region (simple check)
    const parts1 = location1.split(',').map(p => p.trim());
    const parts2 = location2.split(',').map(p => p.trim());

    if (parts1.some(p => parts2.includes(p))) {
      return 0.7;
    }

    return 0.3;
  }

  /**
   * Compare professions
   */
  compareProfessions(prof1, prof2) {
    if (!prof1 || !prof2) return 0.5;

    const profession1 = prof1.toLowerCase();
    const profession2 = prof2.toLowerCase();

    // Same profession
    if (profession1 === profession2) return 1;

    // Similar profession fields
    const fields = {
      it: ['software', 'developer', 'engineer', 'programmer', 'IT'],
      medical: ['doctor', 'nurse', 'medical', 'healthcare'],
      education: ['teacher', 'professor', 'education', 'lecturer'],
      business: ['business', 'entrepreneur', 'commerce', 'manager'],
      government: ['government', 'civil', 'administrative']
    };

    for (const [field, keywords] of Object.entries(fields)) {
      const in1 = keywords.some(k => profession1.includes(k.toLowerCase()));
      const in2 = keywords.some(k => profession2.includes(k.toLowerCase()));
      if (in1 && in2) return 0.8;
    }

    return 0.4;
  }

  /**
   * Compare arrays (languages, hobbies)
   */
  compareArrays(arr1, arr2) {
    if (!arr1.length || !arr2.length) return 0;

    const set1 = new Set(arr1.map(item => item.toLowerCase()));
    const set2 = new Set(arr2.map(item => item.toLowerCase()));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Check if two profiles are similar
   */
  areProfilesSimilar(profile1, profile2, threshold = 70) {
    const score = this.calculateContentBasedScore(profile1, profile2);
    return score >= threshold;
  }

  /**
   * Get recommended profiles using hybrid approach
   */
  async getRecommendedProfiles(userId, limit = 20) {
    try {
      const userProfile = await MatrimonialProfile.findOne({ userId })
        .select('-messages -interests');

      if (!userProfile) {
        return [];
      }

      // Get all potential matches
      const potentialMatches = await MatrimonialProfile.find({
        _id: { $ne: userProfile._id },
        gender: userProfile.preferences?.gender || { $ne: userProfile.gender },
        age: {
          $gte: userProfile.preferences?.ageMin || 18,
          $lte: userProfile.preferences?.ageMax || 70
        },
        verificationStatus: 'verified'
      })
        .select('-messages -interests')
        .limit(100);

      // Calculate scores for each match
      const scoredMatches = await Promise.all(
        potentialMatches.map(async (match) => {
          const scoreData = await this.calculateAdvancedMatchScore(userProfile, match);
          return {
            profile: match,
            score: scoreData.totalScore,
            breakdown: scoreData.breakdown
          };
        })
      );

      // Sort by score and return top matches
      scoredMatches.sort((a, b) => b.score - a.score);

      return scoredMatches.slice(0, limit);
    } catch (error) {
      logger.error('Error getting recommended profiles:', error);
      return [];
    }
  }

  /**
   * Update user behavior data
   */
  async updateUserBehavior(userId, action, targetProfileId) {
    try {
      // This would store user behavior in a separate collection
      // For now, we'll log it
      logger.info(`User behavior: ${userId} ${action} ${targetProfileId}`);
      
      return { success: true };
    } catch (error) {
      logger.error('Error updating user behavior:', error);
      return { success: false };
    }
  }

  /**
   * Get match explanation (why profiles match)
   */
  getMatchExplanation(profile1, profile2, score) {
    const reasons = [];

    if (profile1.religion === profile2.religion) {
      reasons.push('Same religion');
    }

    const ageDiff = Math.abs(profile1.age - profile2.age);
    if (ageDiff <= 3) {
      reasons.push('Similar age');
    }

    if (profile1.location && profile2.location) {
      const locScore = this.compareLocations(profile1.location, profile2.location);
      if (locScore >= 0.7) {
        reasons.push('Same location/region');
      }
    }

    const eduScore = this.compareEducationLevels(profile1.education, profile2.education);
    if (eduScore >= 0.8) {
      reasons.push('Similar education level');
    }

    const commonLanguages = (profile1.languages || []).filter(lang =>
      (profile2.languages || []).includes(lang)
    );
    if (commonLanguages.length > 0) {
      reasons.push(`Common languages: ${commonLanguages.join(', ')}`);
    }

    const commonHobbies = (profile1.hobbies || []).filter(hobby =>
      (profile2.hobbies || []).includes(hobby)
    );
    if (commonHobbies.length > 0) {
      reasons.push(`Shared interests: ${commonHobbies.join(', ')}`);
    }

    return {
      score,
      reasons,
      summary: reasons.length > 0 
        ? `Strong match based on ${reasons.length} compatibility factors` 
        : 'Potential match based on preferences'
    };
  }
}

// Singleton instance
const matchingService = new MatchingService();

module.exports = matchingService;
