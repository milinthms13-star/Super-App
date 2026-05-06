/**
 * Horoscope Integration Service
 * Integrates horoscope matching into matrimonial search and discovery
 */

const Horoscope = require('../models/Horoscope');
const MatrimonialProfile = require('../models/MatrimonialProfile');

/**
 * Calculate horoscope compatibility for search
 */
const getHoroscopeCompatibility = async (profile1Id, profile2Id) => {
  try {
    const horoscope1 = await Horoscope.findOne({ profileId: profile1Id });
    const horoscope2 = await Horoscope.findOne({ profileId: profile2Id });

    if (!horoscope1 || !horoscope2) {
      return null;
    }

    // Call horoscope matching service
    const horoscopeService = require('./horoscopeMatchingService');
    const compatibility = await horoscopeService.calculateCompatibilityScore(
      horoscope1,
      horoscope2
    );

    return compatibility;
  } catch (error) {
    console.error('Error calculating horoscope compatibility:', error);
    return null;
  }
};

/**
 * Filter profiles by horoscope compatibility
 */
const filterByHoroscopeCompatibility = async (profiles, userHoroscopeId, minScore = 50) => {
  try {
    const userHoroscope = await Horoscope.findById(userHoroscopeId);
    if (!userHoroscope) {
      return profiles;
    }

    const compatibleProfiles = [];
    const horoscopeService = require('./horoscopeMatchingService');

    for (const profile of profiles) {
      const horoscope = await Horoscope.findOne({ profileId: profile._id });
      if (horoscope) {
        const compatibility = await horoscopeService.calculateCompatibilityScore(
          userHoroscope,
          horoscope
        );

        if (compatibility.overallScore >= minScore) {
          compatibleProfiles.push({
            ...profile.toObject(),
            horoscopeMatch: {
              score: compatibility.overallScore,
              level: compatibility.compatibilityLevel,
              gunaScore: compatibility.gunaScore
            }
          });
        }
      } else {
        // Include profiles without horoscope data
        compatibleProfiles.push(profile);
      }
    }

    return compatibleProfiles;
  } catch (error) {
    console.error('Error filtering by horoscope compatibility:', error);
    return profiles;
  }
};

/**
 * Add horoscope match info to profile for display
 */
const enrichProfileWithHoroscope = async (profile, viewerHoroscopeId) => {
  try {
    if (!viewerHoroscopeId) {
      return profile;
    }

    const horoscope = await Horoscope.findOne({ profileId: profile._id });
    if (!horoscope) {
      return profile;
    }

    const compatibility = await getHoroscopeCompatibility(
      viewerHoroscopeId.toString(),
      profile._id.toString()
    );

    return {
      ...profile,
      horoscopeMatch: compatibility ? {
        score: compatibility.overallScore,
        level: compatibility.compatibilityLevel,
        gunaScore: compatibility.gunaScore,
        recommendation: compatibility.recommendation
      } : null
    };
  } catch (error) {
    console.error('Error enriching profile with horoscope:', error);
    return profile;
  }
};

/**
 * Get horoscope recommendations for profile
 */
const getHoroscopeRecommendations = async (profileId) => {
  try {
    const horoscope = await Horoscope.findOne({ profileId });
    if (!horoscope) {
      return null;
    }

    // Find profiles with matching rashi, nakshatra, or compatible doshas
    const recommendedProfiles = await MatrimonialProfile.find({
      _id: { $ne: profileId }
    }).limit(20);

    const recommendations = [];
    const horoscopeService = require('./horoscopeMatchingService');

    for (const profile of recommendedProfiles) {
      const candidateHoroscope = await Horoscope.findOne({ profileId: profile._id });
      if (candidateHoroscope) {
        const compatibility = await horoscopeService.calculateCompatibilityScore(
          horoscope,
          candidateHoroscope
        );

        if (compatibility.overallScore >= 50) {
          recommendations.push({
            profileId: profile._id,
            name: profile.name,
            score: compatibility.overallScore,
            level: compatibility.compatibilityLevel
          });
        }
      }
    }

    // Sort by score
    recommendations.sort((a, b) => b.score - a.score);

    return recommendations.slice(0, 10);
  } catch (error) {
    console.error('Error getting horoscope recommendations:', error);
    return [];
  }
};

/**
 * Check if two profiles have compatible doshas (critical factors)
 */
const checkDoshaCompatibility = async (profile1Id, profile2Id) => {
  try {
    const horoscope1 = await Horoscope.findOne({ profileId: profile1Id });
    const horoscope2 = await Horoscope.findOne({ profileId: profile2Id });

    if (!horoscope1 || !horoscope2) {
      return { compatible: true, critical: false };
    }

    const issues = [];

    // Check Mangal Dosha (Mars defect)
    if (horoscope1.doshas?.mangalDosh && horoscope2.doshas?.mangalDosh) {
      issues.push('Both have Mangal Dosha - can be compatible');
    } else if (horoscope1.doshas?.mangalDosh || horoscope2.doshas?.mangalDosh) {
      issues.push('One partner has Mangal Dosha - may require caution');
    }

    // Check Kalasar Dosha
    if (horoscope1.doshas?.kalasarpaDosh && horoscope2.doshas?.kalasarpaDosh) {
      issues.push('Both have Kalasar Dosha');
    }

    // Check Nadi compatibility (most important)
    const nadi1 = horoscope1.nakshatra?.split('-')[0]; // e.g., "Aswini-Vata" => "Aswini"
    const nadi2 = horoscope2.nakshatra?.split('-')[0];

    if (nadi1 && nadi2) {
      if (nadi1 === nadi2) {
        issues.push('Same Nadi - may have compatibility issues');
        return { compatible: false, critical: true, issues };
      }
    }

    return {
      compatible: issues.length === 0,
      critical: false,
      issues
    };
  } catch (error) {
    console.error('Error checking dosha compatibility:', error);
    return { compatible: true, critical: false };
  }
};

/**
 * Get horoscope-based match suggestions for discovery
 */
const getMatchSuggestionsByHoroscope = async (userProfileId, limit = 10) => {
  try {
    const userProfile = await MatrimonialProfile.findById(userProfileId);
    const userHoroscope = await Horoscope.findOne({ profileId: userProfileId });

    if (!userProfile || !userHoroscope) {
      return [];
    }

    // Find profiles with compatible characteristics
    const allProfiles = await MatrimonialProfile.find({
      _id: { $ne: userProfileId },
      gender: userProfile.partnerPreferences?.gender || 'female',
      verificationStatus: 'verified'
    }).limit(50);

    const suggestions = [];
    const horoscopeService = require('./horoscopeMatchingService');

    for (const profile of allProfiles) {
      const profileHoroscope = await Horoscope.findOne({ profileId: profile._id });

      if (profileHoroscope) {
        const compatibility = await horoscopeService.calculateCompatibilityScore(
          userHoroscope,
          profileHoroscope
        );

        if (compatibility.overallScore >= 50) {
          const doshaCompat = await checkDoshaCompatibility(userProfileId, profile._id);

          suggestions.push({
            profile,
            horoscopeMatch: {
              score: compatibility.overallScore,
              level: compatibility.compatibilityLevel,
              gunaScore: compatibility.gunaScore
            },
            doshaIssues: doshaCompat.issues,
            overallRecommendation: doshaCompat.critical ? 'Consult astrologer' : 'Good match'
          });
        }
      }
    }

    // Sort by score
    suggestions.sort((a, b) => b.horoscopeMatch.score - a.horoscopeMatch.score);

    return suggestions.slice(0, limit);
  } catch (error) {
    console.error('Error getting horoscope match suggestions:', error);
    return [];
  }
};

module.exports = {
  getHoroscopeCompatibility,
  filterByHoroscopeCompatibility,
  enrichProfileWithHoroscope,
  getHoroscopeRecommendations,
  checkDoshaCompatibility,
  getMatchSuggestionsByHoroscope
};
