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

const normalizeSign = (value = '') => String(value).trim().toLowerCase();

const getSignDetails = (sign) => zodiacSigns.find((entry) => entry.sign === normalizeSign(sign));

module.exports = {
  zodiacSigns,
  normalizeSign,
  getSignDetails,
};
