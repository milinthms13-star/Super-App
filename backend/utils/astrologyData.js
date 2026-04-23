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
};
