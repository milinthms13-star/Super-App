import { MATCH_SCORE_WEIGHTS } from './constants.js';

export const calculatePreferenceMatch = (profile, preferences) => {
  let score = 0;

  if (profile.age >= Number(preferences.ageMin) && profile.age <= Number(preferences.ageMax)) {
    score += MATCH_SCORE_WEIGHTS.AGE;
  }

  if (preferences.religion === "Any" || profile.religion === preferences.religion) {
    score += MATCH_SCORE_WEIGHTS.RELIGION;
  }

  if (preferences.caste === "Any" || profile.caste === preferences.caste) {
    score += MATCH_SCORE_WEIGHTS.CASTE;
  }

  if (preferences.location === "Any" || profile.location === preferences.location) {
    score += MATCH_SCORE_WEIGHTS.LOCATION;
  }

  if (preferences.education === "Any" || profile.education === preferences.education) {
    score += MATCH_SCORE_WEIGHTS.EDUCATION;
  }

  if (preferences.profession === "Any" || profile.profession === preferences.profession) {
    score += MATCH_SCORE_WEIGHTS.PROFESSION;
  }

  return score;
};

export const calculateSimilarityMatch = (profile, viewerProfile) => {
  let score = 0;

  if (profile.location === viewerProfile.location) {
    score += 10;
  }

  if (profile.religion === viewerProfile.religion) {
    score += 5;
  }

  if (profile.community === viewerProfile.community) {
    score += 5;
  }

  return score;
};

export const getMatchScore = (profile, preferences, viewerProfile) =>
  Math.min(98, calculatePreferenceMatch(profile, preferences) + calculateSimilarityMatch(profile, viewerProfile));

export const getSimilarityScore = (profile, viewerProfile) => calculateSimilarityMatch(profile, viewerProfile);

// Score breakdown for transparency
export const getScoreBreakdown = (profile, preferences, viewerProfile) => {
  const breakdown = {
    age: profile.age >= Number(preferences.ageMin) && profile.age <= Number(preferences.ageMax) ? MATCH_SCORE_WEIGHTS.AGE : 0,
    religion: (preferences.religion === "Any" || profile.religion === preferences.religion) ? MATCH_SCORE_WEIGHTS.RELIGION : 0,
    caste: (preferences.caste === "Any" || profile.caste === preferences.caste) ? MATCH_SCORE_WEIGHTS.CASTE : 0,
    location: (preferences.location === "Any" || profile.location === preferences.location) ? MATCH_SCORE_WEIGHTS.LOCATION : 0,
    education: (preferences.education === "Any" || profile.education === preferences.education) ? MATCH_SCORE_WEIGHTS.EDUCATION : 0,
    profession: (preferences.profession === "Any" || profile.profession === preferences.profession) ? MATCH_SCORE_WEIGHTS.PROFESSION : 0,
    similarity: calculateSimilarityMatch(profile, viewerProfile),
  };
  
  const total = Math.min(98, Object.values(breakdown).reduce((sum, val) => sum + val, 0));
  
  return {
    ...breakdown,
    total,
    matches: Object.entries(breakdown)
      .filter(([_, val]) => val > 0)
      .map(([key, val]) => `${key}: +${val}pt`)
      .join(', '),
  };
};