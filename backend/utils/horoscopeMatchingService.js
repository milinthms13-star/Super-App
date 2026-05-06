/**
 * Horoscope Matching Service
 * Calculates compatibility scores between two horoscopes
 */

const logger = require('../utils/logger');

/**
 * Calculate Guna score (traditional vedic matching)
 * Score out of 36 (higher = better match)
 *
 * 8 categories × 4 gunas each = 36 total
 * Minimum acceptable: 18+ (50%)
 */
const calculateGunaScore = (horoscope1, horoscope2) => {
  let score = 0;
  let maxScore = 36;

  // 1. Varna (caste/class) - 1 point
  if (horoscope1.rashi && horoscope2.rashi) {
    const varna1 = getVarna(horoscope1.rashi);
    const varna2 = getVarna(horoscope2.rashi);
    if (varna1 === varna2) score += 1;
  }

  // 2. Vasya (mutual attraction) - 2 points
  if (horoscope1.rashi && horoscope2.rashi) {
    if (isVasyaCompatible(horoscope1.rashi, horoscope2.rashi)) score += 2;
  }

  // 3. Tara (longevity) - 3 points
  if (horoscope1.nakshatra && horoscope2.nakshatra) {
    if (isTaraCompatible(horoscope1.nakshatra, horoscope2.nakshatra)) score += 3;
  }

  // 4. Yoni (physical compatibility) - 4 points
  if (horoscope1.nakshatra && horoscope2.nakshatra) {
    if (isYoniCompatible(horoscope1.nakshatra, horoscope2.nakshatra)) score += 4;
  }

  // 5. Graha Maitri (planetary friendship) - 5 points
  if (horoscope1.moonSign && horoscope2.moonSign) {
    if (isGrahaMaitriCompatible(horoscope1.moonSign, horoscope2.moonSign)) score += 5;
  }

  // 6. Gana (nature/temperament) - 6 points
  if (horoscope1.nakshatra && horoscope2.nakshatra) {
    if (isGanaCompatible(horoscope1.nakshatra, horoscope2.nakshatra)) score += 6;
  }

  // 7. Bhakoot (financial & general happiness) - 7 points
  if (horoscope1.rashi && horoscope2.rashi) {
    if (isBhakootCompatible(horoscope1.rashi, horoscope2.rashi)) score += 7;
  }

  // 8. Nadi (genetic compatibility) - 8 points (most important)
  if (horoscope1.nakshatra && horoscope2.nakshatra) {
    if (isNadiCompatible(horoscope1.nakshatra, horoscope2.nakshatra)) score += 8;
  }

  return {
    gunaScore: score,
    maxScore,
    percentage: (score / maxScore) * 100,
    minAcceptable: 18,
    isSuitable: score >= 18,
  };
};

/**
 * Get Varna from Rashi (zodiac sign)
 */
const getVarna = (rashi) => {
  const varnas = {
    Aries: 'Brahmin',
    Taurus: 'Kshatriya',
    Gemini: 'Vaishya',
    Cancer: 'Shudra',
    Leo: 'Brahmin',
    Virgo: 'Kshatriya',
    Libra: 'Vaishya',
    Scorpio: 'Shudra',
    Sagittarius: 'Brahmin',
    Capricorn: 'Kshatriya',
    Aquarius: 'Vaishya',
    Pisces: 'Shudra',
  };
  return varnas[rashi];
};

/**
 * Check Vasya (mutual attraction) compatibility
 */
const isVasyaCompatible = (rashi1, rashi2) => {
  const vasya = {
    Aries: ['Taurus', 'Capricorn'],
    Taurus: ['Gemini', 'Aquarius', 'Cancer'],
    Gemini: ['Cancer', 'Pisces'],
    Cancer: ['Leo', 'Taurus'],
    Leo: ['Virgo', 'Gemini'],
    Virgo: ['Libra', 'Cancer'],
    Libra: ['Scorpio', 'Leo'],
    Scorpio: ['Sagittarius', 'Virgo'],
    Sagittarius: ['Capricorn', 'Libra'],
    Capricorn: ['Aquarius', 'Scorpio'],
    Aquarius: ['Pisces', 'Sagittarius'],
    Pisces: ['Aries', 'Capricorn'],
  };

  return vasya[rashi1]?.includes(rashi2) || vasya[rashi2]?.includes(rashi1);
};

/**
 * Check Tara (longevity) compatibility
 * Based on Nakshatra positions (simplified version)
 */
const isTaraCompatible = (nakshatra1, nakshatra2) => {
  // Simplified - full calculation requires detailed Tara tables
  // For MVP: consider compatible if different nakshatras
  return nakshatra1 !== nakshatra2;
};

/**
 * Check Yoni (physical/sexual compatibility)
 */
const isYoniCompatible = (nakshatra1, nakshatra2) => {
  const yoni = {
    Ashwini: 'Horse',
    Bharani: 'Elephant',
    Krittika: 'Goat',
    Rohini: 'Serpent',
    Mrigashirsha: 'Serpent',
    Ardra: 'Dog',
    Punarvasu: 'Cat',
    Pushya: 'Sheep',
    Ashlesha: 'Serpent',
    Magha: 'Rat',
    'Purva Phalguni': 'Rat',
    'Uttara Phalguni': 'Bull',
    Hasta: 'Buffalo',
    Chitra: 'Tiger',
    Swati: 'Buffalo',
    Vishakha: 'Tiger',
    Anuradha: 'Deer',
    Jyeshtha: 'Deer',
    Mula: 'Dog',
    'Purva Ashadha': 'Monkey',
    'Uttara Ashadha': 'Mongoose',
    Shravana: 'Monkey',
    Dhanishtha: 'Lion',
    Shatabhisha: 'Horse',
    'Purva Bhadrapada': 'Lion',
    'Uttara Bhadrapada': 'Cow',
    Revati: 'Elephant',
  };

  const animal1 = yoni[nakshatra1];
  const animal2 = yoni[nakshatra2];

  // Certain animals are highly compatible
  const compatiblePairs = [
    ['Horse', 'Buffalo'],
    ['Serpent', 'Mongoose'],
    ['Tiger', 'Deer'],
    ['Lion', 'Elephant'],
  ];

  for (const pair of compatiblePairs) {
    if ((animal1 === pair[0] && animal2 === pair[1]) ||
        (animal1 === pair[1] && animal2 === pair[0])) {
      return true;
    }
  }

  return animal1 === animal2; // Same animals also compatible
};

/**
 * Check Graha Maitri (planetary friendship)
 */
const isGrahaMaitriCompatible = (moonSign1, moonSign2) => {
  const friends = {
    Aries: ['Leo', 'Sagittarius'],
    Taurus: ['Capricorn', 'Virgo'],
    Gemini: ['Aquarius', 'Libra'],
    Cancer: ['Scorpio', 'Pisces'],
    Leo: ['Aries', 'Sagittarius'],
    Virgo: ['Taurus', 'Capricorn'],
    Libra: ['Gemini', 'Aquarius'],
    Scorpio: ['Cancer', 'Pisces'],
    Sagittarius: ['Aries', 'Leo'],
    Capricorn: ['Taurus', 'Virgo'],
    Aquarius: ['Gemini', 'Libra'],
    Pisces: ['Cancer', 'Scorpio'],
  };

  return friends[moonSign1]?.includes(moonSign2) || friends[moonSign2]?.includes(moonSign1);
};

/**
 * Check Gana (nature/temperament) compatibility
 */
const isGanaCompatible = (nakshatra1, nakshatra2) => {
  const gana = {
    Ashwini: 'Deva',
    Bharani: 'Manushya',
    Krittika: 'Rakshasa',
    Rohini: 'Deva',
    Mrigashirsha: 'Manushya',
    Ardra: 'Rakshasa',
    Punarvasu: 'Deva',
    Pushya: 'Deva',
    Ashlesha: 'Rakshasa',
    Magha: 'Rakshasa',
    'Purva Phalguni': 'Rakshasa',
    'Uttara Phalguni': 'Manushya',
    Hasta: 'Manushya',
    Chitra: 'Deva',
    Swati: 'Manushya',
    Vishakha: 'Rakshasa',
    Anuradha: 'Deva',
    Jyeshtha: 'Rakshasa',
    Mula: 'Rakshasa',
    'Purva Ashadha': 'Manushya',
    'Uttara Ashadha': 'Deva',
    Shravana: 'Deva',
    Dhanishtha: 'Rakshasa',
    Shatabhisha: 'Rakshasa',
    'Purva Bhadrapada': 'Rakshasa',
    'Uttara Bhadrapada': 'Manushya',
    Revati: 'Deva',
  };

  const gana1 = gana[nakshatra1];
  const gana2 = gana[nakshatra2];

  // Deva-Deva, Manushya-Manushya are good
  // Rakshasa-Rakshasa is acceptable
  // Mixed is problematic
  if (gana1 === gana2) return true;
  if (gana1 === 'Manushya' && gana2 === 'Deva') return true; // Manushya accepts Deva
  if (gana1 === 'Deva' && gana2 === 'Manushya') return true;

  return false;
};

/**
 * Check Bhakoot (financial & general happiness)
 */
const isBhakootCompatible = (rashi1, rashi2) => {
  const bhakoot = {
    Aries: { good: ['Sagittarius', 'Leo'], bad: ['Cancer', 'Libra'] },
    Taurus: { good: ['Capricorn', 'Virgo'], bad: ['Leo', 'Scorpio'] },
    Gemini: { good: ['Aquarius', 'Libra'], bad: ['Virgo', 'Sagittarius'] },
    Cancer: { good: ['Scorpio', 'Pisces'], bad: ['Aries', 'Capricorn'] },
    Leo: { good: ['Aries', 'Sagittarius'], bad: ['Taurus', 'Aquarius'] },
    Virgo: { good: ['Taurus', 'Capricorn'], bad: ['Gemini', 'Pisces'] },
    Libra: { good: ['Gemini', 'Aquarius'], bad: ['Cancer', 'Aries'] },
    Scorpio: { good: ['Cancer', 'Pisces'], bad: ['Leo', 'Taurus'] },
    Sagittarius: { good: ['Aries', 'Leo'], bad: ['Virgo', 'Gemini'] },
    Capricorn: { good: ['Taurus', 'Virgo'], bad: ['Libra', 'Cancer'] },
    Aquarius: { good: ['Gemini', 'Libra'], bad: ['Scorpio', 'Leo'] },
    Pisces: { good: ['Cancer', 'Scorpio'], bad: ['Virgo', 'Sagittarius'] },
  };

  return bhakoot[rashi1]?.good?.includes(rashi2) || bhakoot[rashi2]?.good?.includes(rashi1);
};

/**
 * Check Nadi (genetic compatibility) - MOST IMPORTANT
 * Ensures no genetic conflicts
 */
const isNadiCompatible = (nakshatra1, nakshatra2) => {
  const nadi = {
    Ashwini: 'Vata',
    Bharani: 'Pitta',
    Krittika: 'Pitta',
    Rohini: 'Kapha',
    Mrigashirsha: 'Vata',
    Ardra: 'Vata',
    Punarvasu: 'Kapha',
    Pushya: 'Kapha',
    Ashlesha: 'Pitta',
    Magha: 'Pitta',
    'Purva Phalguni': 'Pitta',
    'Uttara Phalguni': 'Kapha',
    Hasta: 'Kapha',
    Chitra: 'Vata',
    Swati: 'Vata',
    Vishakha: 'Pitta',
    Anuradha: 'Kapha',
    Jyeshtha: 'Pitta',
    Mula: 'Vata',
    'Purva Ashadha': 'Pitta',
    'Uttara Ashadha': 'Kapha',
    Shravana: 'Vata',
    Dhanishtha: 'Kapha',
    Shatabhisha: 'Vata',
    'Purva Bhadrapada': 'Kapha',
    'Uttara Bhadrapada': 'Kapha',
    Revati: 'Kapha',
  };

  const nadi1 = nadi[nakshatra1];
  const nadi2 = nadi[nakshatra2];

  // Same Nadi = NOT good (genetic conflict)
  // Different Nadi = Compatible
  return nadi1 !== nadi2;
};

/**
 * Calculate overall compatibility score (0-100)
 */
const calculateCompatibilityScore = (horoscope1, horoscope2) => {
  try {
    const gunaScore = calculateGunaScore(horoscope1, horoscope2);

    // Additional factors (weights)
    let additionalScore = 0;
    let additionalWeight = 0;

    // Dosha compatibility (20 points if both have same dosha severity)
    if (horoscope1.doshas?.mangalDosh && horoscope2.doshas?.mangalDosh) {
      if (horoscope1.doshas.mangalDosh.present === horoscope2.doshas.mangalDosh.present) {
        additionalScore += 10;
      }
      additionalWeight += 10;
    }

    // Age gap compatibility (10 points)
    if (horoscope1.dateOfBirth && horoscope2.dateOfBirth) {
      const age1 = new Date().getFullYear() - horoscope1.dateOfBirth.getFullYear();
      const age2 = new Date().getFullYear() - horoscope2.dateOfBirth.getFullYear();
      if (Math.abs(age1 - age2) <= 10) {
        additionalScore += 10;
      }
      additionalWeight += 10;
    }

    // Calculate final score
    const gunaPercentage = gunaScore.percentage;
    const additionalPercentage = additionalWeight > 0 ? (additionalScore / additionalWeight) * 100 : 0;

    const finalScore = (gunaPercentage * 0.8 + additionalPercentage * 0.2);

    return {
      overallScore: Math.round(finalScore),
      gunaScore,
      compatibility: getCompatibilityLevel(finalScore),
      recommendation: getMatchingRecommendation(finalScore, gunaScore),
      details: {
        gunaPoints: gunaScore.gunaScore,
        additionalPoints: additionalScore,
        rashiMatch: isRashiCompatible(horoscope1.rashi, horoscope2.rashi),
        nakshatraMatch: isNadiCompatible(horoscope1.nakshatra, horoscope2.nakshatra),
      },
    };
  } catch (error) {
    logger.error(`Error calculating compatibility: ${error.message}`);
    return {
      overallScore: 0,
      compatibility: 'error',
      recommendation: 'Unable to calculate compatibility. Please ensure both horoscopes are complete.',
    };
  }
};

/**
 * Get compatibility level description
 */
const getCompatibilityLevel = (score) => {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'very_good';
  if (score >= 50) return 'good';
  if (score >= 36) return 'acceptable';
  return 'poor';
};

/**
 * Get matching recommendation
 */
const getMatchingRecommendation = (score, gunaScore) => {
  if (score >= 85) {
    return 'Highly recommended match. Very strong compatibility in all aspects.';
  }
  if (score >= 70) {
    return 'Good match. Strong compatibility with excellent potential.';
  }
  if (score >= 50) {
    return 'Compatible match. Reasonable compatibility. Can proceed with consultation.';
  }
  if (score >= 36 && gunaScore.isSuitable) {
    return 'Acceptable match. Minimum suitability met. Recommend astrologer consultation.';
  }
  return 'Not recommended. Significant incompatibilities detected. Suggest reconsidering.';
};

/**
 * Simple Rashi compatibility check
 */
const isRashiCompatible = (rashi1, rashi2) => {
  const compatible = {
    Aries: ['Leo', 'Sagittarius'],
    Taurus: ['Virgo', 'Capricorn'],
    Gemini: ['Libra', 'Aquarius'],
    Cancer: ['Scorpio', 'Pisces'],
    Leo: ['Aries', 'Sagittarius'],
    Virgo: ['Taurus', 'Capricorn'],
    Libra: ['Gemini', 'Aquarius'],
    Scorpio: ['Cancer', 'Pisces'],
    Sagittarius: ['Aries', 'Leo'],
    Capricorn: ['Taurus', 'Virgo'],
    Aquarius: ['Gemini', 'Libra'],
    Pisces: ['Cancer', 'Scorpio'],
  };

  return compatible[rashi1]?.includes(rashi2) || compatible[rashi2]?.includes(rashi1);
};

module.exports = {
  calculateCompatibilityScore,
  calculateGunaScore,
  getCompatibilityLevel,
  getMatchingRecommendation,
  isRashiCompatible,
  isNadiCompatible,
};
