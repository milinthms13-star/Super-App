/**
 * Astrology Service
 * Kundali generation, Guna Milan (Ashtakoot), Dosha detection
 */

const axios = require('axios');
const logger = require('../utils/logger');

// Calculate Nakshatra from Moon position
const calculateNakshatra = (moonDegree) => {
  const nakshatras = [
    'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
    'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
    'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
    'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
    'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
  ];

  const nakshatraIndex = Math.floor(moonDegree / 13.333333);
  return nakshatras[nakshatraIndex] || 'Unknown';
};

// Calculate Rashi (Moon sign) from Moon position
const calculateRashi = (moonDegree) => {
  const rashis = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];

  const rashiIndex = Math.floor(moonDegree / 30);
  return rashis[rashiIndex] || 'Unknown';
};

// Generate Kundali using Vedic Astrology API or calculations
const generateKundali = async (birthDetails) => {
  try {
    const { dateOfBirth, timeOfBirth, placeOfBirth, latitude, longitude } = birthDetails;

    // Option 1: Use third-party API (Prokerala, AstroSage, etc.)
    if (process.env.ASTROLOGY_API_KEY) {
      const response = await axios.post(
        'https://api.prokerala.com/v2/astrology/kundli',
        {
          ayanamsa: 1, // Lahiri ayanamsa
          datetime: `${dateOfBirth}T${timeOfBirth}`,
          coordinates: `${latitude},${longitude}`,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.ASTROLOGY_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        data: response.data,
      };
    }

    // Option 2: Basic calculation (simplified Vedic astrology)
    const birthDate = new Date(`${dateOfBirth}T${timeOfBirth}`);
    
    // Simplified planetary positions (in real implementation, use Swiss Ephemeris)
    const kundali = {
      basicDetails: {
        name: birthDetails.name,
        dateOfBirth,
        timeOfBirth,
        placeOfBirth,
        latitude,
        longitude,
      },
      ascendant: calculateAscendant(birthDate, latitude, longitude),
      moonSign: calculateRashi(150), // Placeholder
      sunSign: calculateRashi(120), // Placeholder
      nakshatra: calculateNakshatra(150), // Placeholder
      planets: {
        sun: { sign: 'Leo', house: 5, degree: 15.5 },
        moon: { sign: 'Cancer', house: 4, degree: 22.3 },
        mars: { sign: 'Aries', house: 1, degree: 8.7 },
        mercury: { sign: 'Virgo', house: 6, degree: 12.4 },
        jupiter: { sign: 'Sagittarius', house: 9, degree: 18.9 },
        venus: { sign: 'Libra', house: 7, degree: 25.1 },
        saturn: { sign: 'Capricorn', house: 10, degree: 5.6 },
        rahu: { sign: 'Gemini', house: 3, degree: 19.8 },
        ketu: { sign: 'Sagittarius', house: 9, degree: 19.8 },
      },
      doshas: detectDoshas({
        mars: { sign: 'Aries', house: 1 },
        saturn: { sign: 'Capricorn', house: 10 },
      }),
    };

    return {
      success: true,
      data: kundali,
    };
  } catch (error) {
    logger.error('Kundali generation failed:', error);
    return { success: false, error: error.message };
  }
};

// Calculate Ascendant (Lagna)
const calculateAscendant = (birthDate, latitude, longitude) => {
  // Simplified calculation - in production, use Swiss Ephemeris
  const hour = birthDate.getHours();
  const ascendantSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                          'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  
  const index = (hour * 2 + Math.floor(latitude / 15)) % 12;
  return ascendantSigns[index];
};

// Guna Milan (Ashtakoot) - 36-point compatibility system
const calculateGunaMilan = (profile1Kundali, profile2Kundali) => {
  const gunas = {
    varna: calculateVarna(profile1Kundali.nakshatra, profile2Kundali.nakshatra),
    vashya: calculateVashya(profile1Kundali.moonSign, profile2Kundali.moonSign),
    tara: calculateTara(profile1Kundali.nakshatra, profile2Kundali.nakshatra),
    yoni: calculateYoni(profile1Kundali.nakshatra, profile2Kundali.nakshatra),
    graha: calculateGrahaMaitri(profile1Kundali.moonSign, profile2Kundali.moonSign),
    gana: calculateGana(profile1Kundali.nakshatra, profile2Kundali.nakshatra),
    bhakoot: calculateBhakoot(profile1Kundali.moonSign, profile2Kundali.moonSign),
    nadi: calculateNadi(profile1Kundali.nakshatra, profile2Kundali.nakshatra),
  };

  const totalPoints = Object.values(gunas).reduce((sum, val) => sum + val.points, 0);
  const maxPoints = 36;
  const percentage = (totalPoints / maxPoints) * 100;

  let compatibility = 'Poor';
  if (percentage >= 70) compatibility = 'Excellent';
  else if (percentage >= 50) compatibility = 'Good';
  else if (percentage >= 30) compatibility = 'Average';

  return {
    gunas,
    totalPoints,
    maxPoints,
    percentage: Math.round(percentage),
    compatibility,
    recommendation: getCompatibilityRecommendation(totalPoints),
  };
};

// Individual Guna calculations
const calculateVarna = (nakshatra1, nakshatra2) => {
  // Varna (Class) compatibility - max 1 point
  const varnaMap = {
    'Ashwini': 'Vaishya', 'Bharani': 'Vaishya', 'Krittika': 'Brahmin',
    // ... (add all nakshatras)
  };
  
  const points = varnaMap[nakshatra1] === varnaMap[nakshatra2] ? 1 : 0;
  return { points, max: 1, name: 'Varna' };
};

const calculateVashya = (moonSign1, moonSign2) => {
  // Vashya (Attraction) - max 2 points
  const vashyaGroups = {
    'Aries': ['Leo', 'Sagittarius'],
    'Taurus': ['Cancer', 'Libra'],
    // ... (add all signs)
  };

  const points = vashyaGroups[moonSign1]?.includes(moonSign2) ? 2 : 0;
  return { points, max: 2, name: 'Vashya' };
};

const calculateTara = (nakshatra1, nakshatra2) => {
  // Tara (Birth star) - max 3 points
  const nakshatraIndex1 = getNakshatraIndex(nakshatra1);
  const nakshatraIndex2 = getNakshatraIndex(nakshatra2);
  const difference = Math.abs(nakshatraIndex1 - nakshatraIndex2);
  
  const points = difference % 9 === 0 ? 3 : difference % 9 <= 3 ? 1.5 : 0;
  return { points, max: 3, name: 'Tara' };
};

const calculateYoni = (nakshatra1, nakshatra2) => {
  // Yoni (Animal nature) - max 4 points
  const yoniMap = {
    'Ashwini': 'Horse', 'Bharani': 'Elephant', 'Krittika': 'Sheep',
    // ... (add all)
  };

  const yoni1 = yoniMap[nakshatra1];
  const yoni2 = yoniMap[nakshatra2];
  
  if (yoni1 === yoni2) return { points: 4, max: 4, name: 'Yoni' };
  return { points: 2, max: 4, name: 'Yoni' };
};

const calculateGrahaMaitri = (moonSign1, moonSign2) => {
  // Graha Maitri (Planetary friendship) - max 5 points
  const lordMap = {
    'Aries': 'Mars', 'Taurus': 'Venus', 'Gemini': 'Mercury',
    'Cancer': 'Moon', 'Leo': 'Sun', 'Virgo': 'Mercury',
    'Libra': 'Venus', 'Scorpio': 'Mars', 'Sagittarius': 'Jupiter',
    'Capricorn': 'Saturn', 'Aquarius': 'Saturn', 'Pisces': 'Jupiter',
  };

  const lord1 = lordMap[moonSign1];
  const lord2 = lordMap[moonSign2];

  const friendship = {
    'Sun': ['Moon', 'Mars', 'Jupiter'],
    'Moon': ['Sun', 'Mercury'],
    'Mars': ['Sun', 'Moon', 'Jupiter'],
    'Mercury': ['Sun', 'Venus'],
    'Jupiter': ['Sun', 'Moon', 'Mars'],
    'Venus': ['Mercury', 'Saturn'],
    'Saturn': ['Mercury', 'Venus'],
  };

  if (lord1 === lord2) return { points: 5, max: 5, name: 'Graha Maitri' };
  if (friendship[lord1]?.includes(lord2)) return { points: 4, max: 5, name: 'Graha Maitri' };
  return { points: 1, max: 5, name: 'Graha Maitri' };
};

const calculateGana = (nakshatra1, nakshatra2) => {
  // Gana (Temperament) - max 6 points
  const ganaMap = {
    'Ashwini': 'Deva', 'Bharani': 'Manushya', 'Krittika': 'Rakshasa',
    // ... (add all)
  };

  const gana1 = ganaMap[nakshatra1];
  const gana2 = ganaMap[nakshatra2];

  if (gana1 === gana2) return { points: 6, max: 6, name: 'Gana' };
  if ((gana1 === 'Deva' && gana2 === 'Manushya') || (gana1 === 'Manushya' && gana2 === 'Deva')) {
    return { points: 5, max: 6, name: 'Gana' };
  }
  return { points: 0, max: 6, name: 'Gana' };
};

const calculateBhakoot = (moonSign1, moonSign2) => {
  // Bhakoot (Love & affection) - max 7 points
  const signIndex1 = getSignIndex(moonSign1);
  const signIndex2 = getSignIndex(moonSign2);
  const difference = Math.abs(signIndex1 - signIndex2);

  if ([2, 5, 9, 12].includes(difference)) return { points: 7, max: 7, name: 'Bhakoot' };
  return { points: 0, max: 7, name: 'Bhakoot' };
};

const calculateNadi = (nakshatra1, nakshatra2) => {
  // Nadi (Health & genes) - max 8 points
  const nadiMap = {
    'Ashwini': 'Adi', 'Bharani': 'Madhya', 'Krittika': 'Antya',
    // ... (add all)
  };

  const nadi1 = nadiMap[nakshatra1];
  const nadi2 = nadiMap[nakshatra2];

  return nadi1 !== nadi2 ? { points: 8, max: 8, name: 'Nadi' } : { points: 0, max: 8, name: 'Nadi' };
};

// Helper functions
const getNakshatraIndex = (nakshatra) => {
  const nakshatras = ['Ashwini', 'Bharani', 'Krittika', /* ... all 27 */];
  return nakshatras.indexOf(nakshatra) + 1;
};

const getSignIndex = (sign) => {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  return signs.indexOf(sign) + 1;
};

const getCompatibilityRecommendation = (points) => {
  if (points >= 28) return 'Excellent match! Marriage is highly recommended.';
  if (points >= 24) return 'Very good match. Marriage can proceed with blessings.';
  if (points >= 18) return 'Good match. Consider other factors and family approval.';
  if (points >= 12) return 'Average match. Consult an astrologer for detailed analysis.';
  return 'Low compatibility. Reconsider or seek expert astrological guidance.';
};

// Dosha Detection
const detectDoshas = (planets) => {
  const doshas = [];

  // Mangal Dosha (Mars Dosha)
  const mangalDosha = checkMangalDosha(planets.mars);
  if (mangalDosha.present) {
    doshas.push({
      name: 'Mangal Dosha',
      severity: mangalDosha.severity,
      description: 'Mars in certain houses can cause marital discord',
      remedies: mangalDosha.remedies,
    });
  }

  // Kaal Sarp Dosha
  const kaalSarpDosha = checkKaalSarpDosha(planets);
  if (kaalSarpDosha.present) {
    doshas.push({
      name: 'Kaal Sarp Dosha',
      severity: kaalSarpDosha.severity,
      description: 'All planets between Rahu and Ketu',
      remedies: kaalSarpDosha.remedies,
    });
  }

  // Pitra Dosha
  // Nadi Dosha
  // etc.

  return doshas;
};

const checkMangalDosha = (mars) => {
  const mangalHouses = [1, 2, 4, 7, 8, 12];
  const present = mangalHouses.includes(mars.house);

  return {
    present,
    severity: present ? (mars.house === 7 || mars.house === 8 ? 'High' : 'Medium') : 'None',
    remedies: present ? [
      'Marry a person with similar Mangal Dosha',
      'Perform Mangal Shanti Puja',
      'Donate red lentils on Tuesdays',
      'Recite Hanuman Chalisa daily',
    ] : [],
  };
};

const checkKaalSarpDosha = (planets) => {
  // Simplified check - in production, verify all planets are on one side of Rahu-Ketu axis
  return {
    present: false,
    severity: 'None',
    remedies: [],
  };
};

module.exports = {
  generateKundali,
  calculateGunaMilan,
  detectDoshas,
  calculateNakshatra,
  calculateRashi,
};
