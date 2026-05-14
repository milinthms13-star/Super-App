const INDIA_TIME_ZONE = 'Asia/Kolkata';

const zodiacSigns = [
  {
    sign: 'aries',
    label: 'Aries',
    dateRange: 'Mar 21 - Apr 19',
    element: 'Fire',
    color: '#ff7a59',
    horoscope:
      'Take the lead on the task you have been postponing. Clear momentum comes from one confident first step.',
  },
  {
    sign: 'taurus',
    label: 'Taurus',
    dateRange: 'Apr 20 - May 20',
    element: 'Earth',
    color: '#5f8b4c',
    horoscope:
      'Steady choices pay off today. Focus on the routine that makes everything else feel easier.',
  },
  {
    sign: 'gemini',
    label: 'Gemini',
    dateRange: 'May 21 - Jun 20',
    element: 'Air',
    color: '#ffb347',
    horoscope:
      'A helpful conversation can unlock a stuck situation. Ask the direct question instead of guessing.',
  },
  {
    sign: 'cancer',
    label: 'Cancer',
    dateRange: 'Jun 21 - Jul 22',
    element: 'Water',
    color: '#6ca0dc',
    horoscope:
      'Protect your energy and choose the setting that feels supportive. Comfort helps you think clearly.',
  },
  {
    sign: 'leo',
    label: 'Leo',
    dateRange: 'Jul 23 - Aug 22',
    element: 'Fire',
    color: '#f4b400',
    horoscope:
      'Your confidence is contagious today. Use it to encourage someone else as much as yourself.',
  },
  {
    sign: 'virgo',
    label: 'Virgo',
    dateRange: 'Aug 23 - Sep 22',
    element: 'Earth',
    color: '#7b8d42',
    horoscope:
      'Small improvements matter more than perfect plans. Tidy the next detail and keep moving.',
  },
  {
    sign: 'libra',
    label: 'Libra',
    dateRange: 'Sep 23 - Oct 22',
    element: 'Air',
    color: '#c98bb9',
    horoscope:
      'Balance returns when you stop overexplaining. A calm decision is stronger than a complicated one.',
  },
  {
    sign: 'scorpio',
    label: 'Scorpio',
    dateRange: 'Oct 23 - Nov 21',
    element: 'Water',
    color: '#8b1e3f',
    horoscope:
      'Trust your instincts, but verify the facts. Insight works best when paired with patience.',
  },
  {
    sign: 'sagittarius',
    label: 'Sagittarius',
    dateRange: 'Nov 22 - Dec 21',
    element: 'Fire',
    color: '#e67e22',
    horoscope:
      'A new idea deserves a trial run. Keep it light, test it quickly, and learn from the result.',
  },
  {
    sign: 'capricorn',
    label: 'Capricorn',
    dateRange: 'Dec 22 - Jan 19',
    element: 'Earth',
    color: '#556b2f',
    horoscope:
      'Consistency beats urgency today. Put structure around your priorities and the noise will fade.',
  },
  {
    sign: 'aquarius',
    label: 'Aquarius',
    dateRange: 'Jan 20 - Feb 18',
    element: 'Air',
    color: '#3c91e6',
    horoscope:
      'Your unusual perspective is useful right now. Share the idea that feels a little ahead of its time.',
  },
  {
    sign: 'pisces',
    label: 'Pisces',
    dateRange: 'Feb 19 - Mar 20',
    element: 'Water',
    color: '#4f86c6',
    horoscope:
      'Make space for reflection before reacting. The right response becomes obvious once the rush settles.',
  },
];

const DAILY_OPENINGS = [
  'Today asks for steady attention instead of rushed certainty.',
  'The pace around you may feel uneven, but your next choice can still be clear.',
  'A small shift in timing can improve the whole day.',
  'The strongest move now is the one that removes friction, not the one that creates drama.',
  'You do not need to solve everything at once to make real progress today.',
  'A grounded start will make the rest of the day feel lighter.',
];

const SIGN_THEMES = {
  aries: [
    'Move first on the task that has been waiting for courage.',
    'Direct action will work better than another round of planning.',
    'If something matters, claim space for it early.',
  ],
  taurus: [
    'Protect the routine that keeps your energy reliable.',
    'Choose comfort that supports momentum, not comfort that delays it.',
    'A practical decision now will prevent avoidable stress later.',
  ],
  gemini: [
    'One honest conversation can clear more than a day of guesswork.',
    'Ask the sharper question instead of carrying a vague doubt.',
    'Your flexibility is useful, but give one idea enough focus to land.',
  ],
  cancer: [
    'Set the tone around you before you take on other people\'s needs.',
    'A quiet reset will help you trust your judgment again.',
    'Protect your attention from noise that does not belong to you.',
  ],
  leo: [
    'Use your confidence to create momentum for yourself and someone beside you.',
    'Leadership looks strongest when it is warm, not loud.',
    'A visible decision from you can steady the room.',
  ],
  virgo: [
    'Cleaning up one detail will unlock a bigger result than expected.',
    'Progress comes from finishing the next useful step, not perfecting every step.',
    'Let precision serve momentum today instead of slowing it.',
  ],
  libra: [
    'Clarity arrives when you stop carrying both sides of every choice.',
    'A balanced answer is available, but it does not need endless revision.',
    'Choose the option that feels calm in your body, not just elegant on paper.',
  ],
  scorpio: [
    'Your instincts are sharp, and they will serve you best when paired with patience.',
    'Look beneath the first answer before you commit your energy.',
    'A measured response will carry more weight than an intense one.',
  ],
  sagittarius: [
    'Test the new idea in a lightweight way before you promise too much to it.',
    'Curiosity is your advantage today, especially when it stays practical.',
    'Give the bold plan a clear first experiment instead of a dramatic launch.',
  ],
  capricorn: [
    'Structure will quiet the noise faster than urgency will.',
    'A disciplined hour now can protect the rest of your week.',
    'Let consistency do the work that pressure usually tries to do.',
  ],
  aquarius: [
    'Your different angle is valuable, especially if you explain it simply.',
    'The idea that feels slightly ahead of schedule may be the useful one.',
    'Innovation lands better today when it is paired with clear language.',
  ],
  pisces: [
    'Reflection will help more than reacting on impulse.',
    'Let your sensitivity guide your timing without letting it overrun your focus.',
    'A softer pace can reveal the clearest answer.',
  ],
};

const ELEMENT_GUIDANCE = {
  Fire: [
    'Keep your pace strong, but leave enough room to finish with care.',
    'Channel your drive into one clear priority before you spread it too thin.',
    'Momentum is available, especially if you protect it from distractions.',
  ],
  Earth: [
    'Choose the practical win that improves tomorrow as much as today.',
    'Steady effort will outperform any last-minute burst.',
    'Ground your decisions in what can be maintained, not just what feels impressive.',
  ],
  Air: [
    'Communication is your lever now, so say the useful thing clearly.',
    'A flexible plan will serve you better than a rigid one today.',
    'Leave room for a better idea to emerge mid-conversation.',
  ],
  Water: [
    'Protect your energy first and the right decision will be easier to hear.',
    'Quiet time is not avoidance today; it is part of your accuracy.',
    'Let emotional clarity come before commitment whenever you can.',
  ],
};

const normalizeSign = (value = '') => String(value || '').trim().toLowerCase();

const getSignDetails = (sign) => zodiacSigns.find((entry) => entry.sign === normalizeSign(sign));

const hashString = (value = '') => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
};

const coerceDate = (value = new Date()) => {
  const parsedDate = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
};

const getReadingDateKey = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: INDIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const formattedParts = formatter.formatToParts(coerceDate(date));
  const year = formattedParts.find((part) => part.type === 'year')?.value || '1970';
  const month = formattedParts.find((part) => part.type === 'month')?.value || '01';
  const day = formattedParts.find((part) => part.type === 'day')?.value || '01';

  return `${year}-${month}-${day}`;
};

const normalizeAngle = (degrees) => ((degrees % 360) + 360) % 360;
const toRadians = (degrees) => (degrees * Math.PI) / 180;
const sinDeg = (degrees) => Math.sin(toRadians(degrees));
const DEFAULT_BIRTH_TIME_ZONE = 'Asia/Kolkata';
const parseBirthDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const dateString = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const NAKSHATRA_NAMES = [
  'Ashwini',
  'Bharani',
  'Krittika',
  'Rohini',
  'Mrigashira',
  'Ardra',
  'Punarvasu',
  'Pushya',
  'Ashlesha',
  'Magha',
  'Purva Phalguni',
  'Uttara Phalguni',
  'Hasta',
  'Chitra',
  'Swati',
  'Vishakha',
  'Anuradha',
  'Jyeshtha',
  'Mula',
  'Purva Ashadha',
  'Uttara Ashadha',
  'Shravana',
  'Dhanishta',
  'Shatabhisha',
  'Purva Bhadrapada',
  'Uttara Bhadrapada',
  'Revati',
];

const RASHI_NAMES = [
  'Mesha',
  'Vrishabha',
  'Mithuna',
  'Karka',
  'Simha',
  'Kanya',
  'Tula',
  'Vrischika',
  'Dhanu',
  'Makara',
  'Kumbha',
  'Meena',
];

const normalizeTimeZoneValue = (value) => {
  const text = String(value || '').trim();
  if (!text) {
    return DEFAULT_BIRTH_TIME_ZONE;
  }
  return text;
};

const parseUtcOffsetMinutes = (value) => {
  const match = String(value || '')
    .trim()
    .match(/^([+-])(\d{2}):?(\d{2})$/);
  if (!match) {
    return null;
  }
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours > 14 ||
    minutes > 59
  ) {
    return null;
  }
  return sign * (hours * 60 + minutes);
};

const isValidIanaTimeZone = (timeZone) => {
  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch (error) {
    return false;
  }
};

const getTimeZoneOffsetMinutes = (utcDate, timeZone) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(utcDate);
  const findPart = (type) => Number(parts.find((entry) => entry.type === type)?.value || 0);
  const year = findPart('year');
  const month = findPart('month');
  const day = findPart('day');
  let hour = findPart('hour');
  const minute = findPart('minute');
  const second = findPart('second');
  if (hour === 24) {
    hour = 0;
  }
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return (asUtc - utcDate.getTime()) / 60000;
};

const getUtcMillisFromLocalDateTime = (dateString, timeString, timeZone) => {
  const parsedDateString = parseBirthDate(dateString);
  if (!parsedDateString) return null;
  const [year, month, day] = parsedDateString.split('-').map(Number);
  if (![year, month, day].every(Number.isFinite)) return null;
  const [hour = 0, minute = 0] = String(timeString || '00:00').split(':').map(Number);
  if (![hour, minute].every(Number.isFinite)) return null;
  const normalizedTimeZone = normalizeTimeZoneValue(timeZone);
  const offsetMinutes = parseUtcOffsetMinutes(normalizedTimeZone);

  if (offsetMinutes !== null) {
    return Date.UTC(year, month - 1, day, hour, minute) - offsetMinutes * 60000;
  }

  const safeTimeZone = isValidIanaTimeZone(normalizedTimeZone)
    ? normalizedTimeZone
    : DEFAULT_BIRTH_TIME_ZONE;
  const localUtcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const offsetGuess = getTimeZoneOffsetMinutes(new Date(localUtcGuess), safeTimeZone);
  let correctedUtc = localUtcGuess - offsetGuess * 60000;
  const correctedOffset = getTimeZoneOffsetMinutes(new Date(correctedUtc), safeTimeZone);
  if (correctedOffset !== offsetGuess) {
    correctedUtc = localUtcGuess - correctedOffset * 60000;
  }
  return correctedUtc;
};

const getJulianDayFromBirthDetails = (dateString, timeString, timeZone) => {
  const utcMs = getUtcMillisFromLocalDateTime(dateString, timeString, timeZone);
  if (!Number.isFinite(utcMs)) return null;
  const date = new Date(utcMs);
  const Y = date.getUTCFullYear();
  const M = date.getUTCMonth() + 1;
  const D =
    date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400;
  let y = Y;
  let m = M;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    D +
    B -
    1524.5
  );
};

const getMoonEclipticLongitude = (jd) => {
  const D = jd - 2451545.0;
  const T = D / 36525.0;
  const L0 = normalizeAngle(
    218.3164477 +
      481267.88123421 * T -
      0.0015786 * T * T +
      T * T * T / 538841 -
      T * T * T * T / 65194000
  );
  const M = normalizeAngle(
    134.9633964 +
      477198.8675055 * T +
      0.0087414 * T * T +
      T * T * T / 69699 -
      T * T * T * T / 14712000
  );
  const Mprime = normalizeAngle(
    357.5291092 +
      35999.0502909 * T -
      0.0001536 * T * T +
      T * T * T / 24490000
  );
  const Dprime = normalizeAngle(
    297.8501921 +
      445267.1114034 * T -
      0.0018819 * T * T +
      T * T * T / 545868 -
      T * T * T * T / 113065000
  );
  const F = normalizeAngle(
    93.272095 +
      483202.0175233 * T -
      0.0036539 * T * T -
      T * T * T / 3526000 +
      T * T * T * T / 863310000
  );

  let lon = L0;
  lon += 6.289 * sinDeg(M);
  lon += 1.274 * sinDeg(2 * Dprime - M);
  lon += 0.658 * sinDeg(2 * Dprime);
  lon += 0.214 * sinDeg(2 * M);
  lon += -0.186 * sinDeg(Mprime);
  lon += -0.059 * sinDeg(2 * Dprime - 2 * M);
  lon += -0.057 * sinDeg(2 * Dprime - Mprime - M);
  lon += 0.053 * sinDeg(2 * Dprime + M);
  lon += 0.046 * sinDeg(2 * Dprime - Mprime);
  lon += 0.041 * sinDeg(Mprime - M);
  lon += -0.035 * sinDeg(Dprime);
  lon += -0.031 * sinDeg(M + Mprime);
  lon += 0.015 * sinDeg(2 * F - 2 * Dprime);
  lon += 0.011 * sinDeg(2 * Dprime - 4 * M);

  return normalizeAngle(lon);
};

const getLahiriAyanamsa = (jd) => {
  const T = (jd - 2451545.0) / 36525.0;
  const ayanamsaAtJ2000 = 23.853222;
  const precessionArcSeconds = 5028.796195 * T + 1.1054348 * T * T;
  return ayanamsaAtJ2000 + precessionArcSeconds / 3600;
};

const calculateBirthAstroProfile = (birthDate, birthTime, options = {}) => {
  const timeZone = normalizeTimeZoneValue(options?.timeZone || options?.birthTimeZone);
  const jd = getJulianDayFromBirthDetails(birthDate, birthTime, timeZone);
  if (!jd) return undefined;
  const moonLongitude = getMoonEclipticLongitude(jd);
  const siderealMoonLongitude = normalizeAngle(moonLongitude - getLahiriAyanamsa(jd));
  const nakshatraIndex = Math.floor(siderealMoonLongitude / (360 / 27));
  const rashiIndex = Math.floor(siderealMoonLongitude / 30);

  return {
    nakshatra: NAKSHATRA_NAMES[nakshatraIndex] || undefined,
    rashi: RASHI_NAMES[rashiIndex] || undefined,
    siderealMoonLongitude,
    moonLongitude,
    ayanamsa: getLahiriAyanamsa(jd),
  };
};

const calculateNakshatra = (birthDate, birthTime, options = {}) => {
  const profile = calculateBirthAstroProfile(birthDate, birthTime, options);
  return profile?.nakshatra;
};

const pickMessage = (messages, seed, offset = 0) => {
  const safeMessages = Array.isArray(messages) && messages.length > 0 ? messages : [''];
  const index = Math.abs(seed + offset * 17) % safeMessages.length;
  return safeMessages[index];
};

const getDailyHoroscope = (sign, date = new Date()) => {
  const signDetails = getSignDetails(sign);

  if (!signDetails) {
    return null;
  }

  const parsedDate = coerceDate(date);
  const readingDate = getReadingDateKey(parsedDate);
  const seed = hashString(`${signDetails.sign}:${readingDate}`);
  const horoscope = [
    pickMessage(DAILY_OPENINGS, seed, 1),
    pickMessage(SIGN_THEMES[signDetails.sign] || [signDetails.horoscope], seed, 2),
    pickMessage(ELEMENT_GUIDANCE[signDetails.element] || [signDetails.horoscope], seed, 3),
  ]
    .filter(Boolean)
    .join(' ');

  return {
    ...signDetails,
    horoscope,
    readingDate,
    generatedAt: parsedDate.toISOString(),
  };
};

module.exports = {
  zodiacSigns,
  normalizeSign,
  getSignDetails,
  getReadingDateKey,
  getDailyHoroscope,
  calculateNakshatra,
  calculateBirthAstroProfile,
};
