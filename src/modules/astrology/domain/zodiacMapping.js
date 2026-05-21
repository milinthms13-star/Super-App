export const NAKSHATRA_NAMES = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
];

export const RASHI_NAMES = [
  "Mesha",
  "Vrishabha",
  "Mithuna",
  "Karka",
  "Simha",
  "Kanya",
  "Tula",
  "Vrischika",
  "Dhanu",
  "Makara",
  "Kumbha",
  "Meena",
];

export const ZODIAC_SIGNS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];

export const ZODIAC_ALIASES = {
  mesha: "aries",
  vrishabha: "taurus",
  mithuna: "gemini",
  karka: "cancer",
  karkata: "cancer",
  simha: "leo",
  kanya: "virgo",
  tula: "libra",
  vrischika: "scorpio",
  dhanu: "sagittarius",
  makara: "capricorn",
  kumbha: "aquarius",
  meena: "pisces",
};

const NAKSHATRA_DISPLAY_NAMES = {
  Ashwini: { en: "Aswathy", ml: "Aswathi" },
  Bharani: { en: "Bharani", ml: "Bharani" },
  Krittika: { en: "Karthika", ml: "Karthika" },
  Rohini: { en: "Rohini", ml: "Rohini" },
  Mrigashira: { en: "Makayiram", ml: "Makayiram" },
  Ardra: { en: "Thiruvathira", ml: "Thiruvathira" },
  Punarvasu: { en: "Punartham", ml: "Punartham" },
  Pushya: { en: "Pooyam", ml: "Pooyam" },
  Ashlesha: { en: "Aayilyam", ml: "Aayilyam" },
  Magha: { en: "Makam", ml: "Makam" },
  "Purva Phalguni": { en: "Pooram", ml: "Pooram" },
  "Uttara Phalguni": { en: "Uthram", ml: "Uthram" },
  Hasta: { en: "Atham", ml: "Atham" },
  Chitra: { en: "Chithira", ml: "Chithira" },
  Swati: { en: "Chothi", ml: "Chothi" },
  Vishakha: { en: "Vishakham", ml: "Vishakham" },
  Anuradha: { en: "Anizham", ml: "Anizham" },
  Jyeshtha: { en: "Thriketta", ml: "Thriketta" },
  Mula: { en: "Moolam", ml: "Moolam" },
  "Purva Ashadha": { en: "Pooradam", ml: "Pooradam" },
  "Uttara Ashadha": { en: "Uthradam", ml: "Uthradam" },
  Shravana: { en: "Thiruvonam", ml: "Thiruvonam" },
  Dhanishta: { en: "Avittam", ml: "Avittam" },
  Shatabhisha: { en: "Chathayam", ml: "Chathayam" },
  "Purva Bhadrapada": { en: "Pooruruttathi", ml: "Pooruruttathi" },
  "Uttara Bhadrapada": { en: "Uthrattathi", ml: "Uthrattathi" },
  Revati: { en: "Revathi", ml: "Revathi" },
};

const NAKSHATRA_ALIASES = {
  aswathi: "Ashwini",
  ashwathi: "Ashwini",
  aswathy: "Ashwini",
  ashwathy: "Ashwini",
  karthika: "Krittika",
  makayiram: "Mrigashira",
  thiruvathira: "Ardra",
  punartham: "Punarvasu",
  pooyam: "Pushya",
  aayilyam: "Ashlesha",
  makham: "Magha",
  pooram: "Purva Phalguni",
  uthram: "Uttara Phalguni",
  atham: "Hasta",
  chithira: "Chitra",
  chothi: "Swati",
  vishakham: "Vishakha",
  anizham: "Anuradha",
  thrikketta: "Jyeshtha",
  trikketta: "Jyeshtha",
  thriketta: "Jyeshtha",
  triketta: "Jyeshtha",
  moolam: "Mula",
  pooradam: "Purva Ashadha",
  uthradam: "Uttara Ashadha",
  thiruvonam: "Shravana",
  tiruvonam: "Shravana",
  sravana: "Shravana",
  shravan: "Shravana",
  avittam: "Dhanishta",
  chathayam: "Shatabhisha",
  pooruruttathi: "Purva Bhadrapada",
  poorattathi: "Purva Bhadrapada",
  uthrattathi: "Uttara Bhadrapada",
  revathi: "Revati",
};

const SIGN_FOCUS_THEMES = {
  aries: {
    theme: "decisive action",
    workAction: "finish one difficult task before lunch",
    moneyAction: "delay non-essential spending for 24 hours",
    relationshipAction: "use direct but respectful words in key conversations",
  },
  taurus: {
    theme: "steady consistency",
    workAction: "follow your schedule and avoid last-minute switching",
    moneyAction: "review subscriptions and trim one leak",
    relationshipAction: "show support through practical help",
  },
  gemini: {
    theme: "clear communication",
    workAction: "send follow-up messages on pending items",
    moneyAction: "track small daily expenses before planning bigger buys",
    relationshipAction: "clarify expectations early instead of assuming",
  },
  cancer: {
    theme: "emotional stability",
    workAction: "set boundaries and protect your focus windows",
    moneyAction: "prioritize family essentials before optional spends",
    relationshipAction: "listen first, then respond calmly",
  },
  leo: {
    theme: "visible leadership",
    workAction: "lead one task and delegate one task",
    moneyAction: "postpone image-based purchases this week",
    relationshipAction: "balance confidence with appreciation",
  },
  virgo: {
    theme: "systems and precision",
    workAction: "improve one process and document it",
    moneyAction: "update your budget and set a strict cap",
    relationshipAction: "avoid overcorrecting and speak with warmth",
  },
  libra: {
    theme: "balanced choices",
    workAction: "prioritize quality over speed in one important task",
    moneyAction: "set a comfort-spend limit before shopping",
    relationshipAction: "address unresolved points diplomatically",
  },
  scorpio: {
    theme: "focused depth",
    workAction: "resolve one sensitive issue without delay",
    moneyAction: "recheck debt, dues, and payment dates",
    relationshipAction: "replace suspicion with clear questions",
  },
  sagittarius: {
    theme: "structured expansion",
    workAction: "start one new learning action tied to your goals",
    moneyAction: "split funds into essentials, growth, and reserve",
    relationshipAction: "be honest without being blunt",
  },
  capricorn: {
    theme: "discipline and long-term planning",
    workAction: "commit to a realistic milestone and complete it",
    moneyAction: "protect cash flow and avoid risky commitments",
    relationshipAction: "share plans early to prevent confusion",
  },
  aquarius: {
    theme: "innovative clarity",
    workAction: "pitch one practical improvement idea",
    moneyAction: "use a digital tracker for all transactions today",
    relationshipAction: "communicate unconventional ideas patiently",
  },
  pisces: {
    theme: "grounded intuition",
    workAction: "time-block your day to reduce distractions",
    moneyAction: "follow a fixed savings rule before spending",
    relationshipAction: "speak feelings clearly instead of hinting",
  },
};

export const HEURISTIC_PREVIEW_FLAGS = {
  lagnaFromTimeBuckets: true,
  dailyEnergyScore: true,
};

const normalizeLookupToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

const clampScore = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Math.round(Number(value) || 0)));

export const getNakshatraFromSign = (sign) =>
  ({
    aries: "Ashwini",
    taurus: "Rohini",
    gemini: "Mrigashira",
    cancer: "Pushya",
    leo: "Magha",
    virgo: "Hasta",
    libra: "Chitra",
    scorpio: "Anuradha",
    sagittarius: "Mula",
    capricorn: "Shravana",
    aquarius: "Shatabhisha",
    pisces: "Revati",
  }[sign] || "Ashwini");

export const getRashiFromSign = (sign) =>
  ({
    aries: "Mesha",
    taurus: "Vrishabha",
    gemini: "Mithuna",
    cancer: "Karka",
    leo: "Simha",
    virgo: "Kanya",
    libra: "Tula",
    scorpio: "Vrischika",
    sagittarius: "Dhanu",
    capricorn: "Makara",
    aquarius: "Kumbha",
    pisces: "Meena",
  }[sign] || "Mesha");

export const getSignFromRashi = (rashi = "") =>
  ({
    mesha: "aries",
    vrishabha: "taurus",
    mithuna: "gemini",
    karka: "cancer",
    simha: "leo",
    kanya: "virgo",
    tula: "libra",
    vrischika: "scorpio",
    dhanu: "sagittarius",
    makara: "capricorn",
    kumbha: "aquarius",
    meena: "pisces",
  }[String(rashi || "").trim().toLowerCase()] || "");

export const normalizeZodiacKey = (value) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (!raw) return "";
  if (ZODIAC_SIGNS.includes(raw)) return raw;
  return ZODIAC_ALIASES[raw] || "";
};

export const getLagnaFromTime = (time) => {
  if (!time) return "Mesha";
  const hour = Number(String(time).split(":")[0] || 6);
  if (hour < 4) return "Meena";
  if (hour < 8) return "Mesha";
  if (hour < 12) return "Vrishabha";
  if (hour < 16) return "Karkata";
  if (hour < 20) return "Simha";
  return "Tula";
};

export const getCanonicalNakshatraName = (value) => {
  const input = String(value || "").trim();
  if (!input) return "";
  const direct = NAKSHATRA_NAMES.find((item) => item.toLowerCase() === input.toLowerCase());
  if (direct) return direct;
  const token = normalizeLookupToken(input);
  const alias = NAKSHATRA_ALIASES[token];
  if (alias) return alias;
  const fromDisplay = NAKSHATRA_NAMES.find((item) => {
    const display = NAKSHATRA_DISPLAY_NAMES[item];
    return (
      normalizeLookupToken(display?.en) === token ||
      normalizeLookupToken(display?.ml) === token
    );
  });
  return fromDisplay || input;
};

export const getNakshatraDisplayName = (value, language) => {
  const canonical = getCanonicalNakshatraName(value);
  const mapped = NAKSHATRA_DISPLAY_NAMES[canonical];
  if (!mapped) return canonical;
  return language === "ml" ? mapped.ml : mapped.en;
};

export const detectSignFromBirthDate = (birthDate) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(birthDate || "").trim())) return "";
  const [, monthText, dayText] = String(birthDate).split("-");
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return "";
  const key = month * 100 + day;
  if (key >= 321 && key <= 419) return "aries";
  if (key >= 420 && key <= 520) return "taurus";
  if (key >= 521 && key <= 620) return "gemini";
  if (key >= 621 && key <= 722) return "cancer";
  if (key >= 723 && key <= 822) return "leo";
  if (key >= 823 && key <= 922) return "virgo";
  if (key >= 923 && key <= 1022) return "libra";
  if (key >= 1023 && key <= 1121) return "scorpio";
  if (key >= 1122 && key <= 1221) return "sagittarius";
  if (key >= 1222 || key <= 119) return "capricorn";
  if (key <= 218) return "aquarius";
  return "pisces";
};

export const getLuckyNumber = (sign) =>
  ({
    aries: 9,
    taurus: 6,
    gemini: 5,
    cancer: 2,
    leo: 1,
    virgo: 5,
    libra: 6,
    scorpio: 9,
    sagittarius: 3,
    capricorn: 8,
    aquarius: 4,
    pisces: 7,
  }[sign] || 7);

export const getTodayEnergyScore = (sign, date = new Date()) =>
  ((getLuckyNumber(sign) + new Date(date).getDate()) % 10) || 10;

export const getRashiSummary = (sign) =>
  ({
    aries: "Today is best for quick decisions backed by a family discussion.",
    taurus: "Planned progress will feel more rewarding than immediate gain.",
    gemini: "A short trip or message will open the right door.",
    cancer: "Trust small rituals to steady your day.",
    leo: "Stay warm, keep your presence generous, and avoid unnecessary conflict.",
    virgo: "Detail work is powerful now. Use it to simplify plans.",
    libra: "Balance activity with rest and let others join you.",
    scorpio: "Focus on shared values, not control.",
    sagittarius: "A creative idea can become a practical plan if you start small.",
    capricorn: "Stick to routine, especially with money and health.",
    aquarius: "A friend or sibling brings useful perspective today.",
    pisces: "A calming habit will help you stay centered through change.",
  }[sign] || "Create structure before you expand energy outward.");

export const getCareerAdvice = (sign) =>
  ({
    aries: "Take lead on one pending task and close it before noon.",
    taurus: "Steady, practical work beats fast changes today.",
    gemini: "Communication and follow-ups will unlock momentum.",
    cancer: "Prioritize team trust and clear boundaries at work.",
    leo: "Use visibility wisely; support others while leading.",
    virgo: "Process improvements bring immediate gains.",
    libra: "Negotiate calmly; balance speed with precision.",
    scorpio: "Handle sensitive issues directly, without delay.",
    sagittarius: "Explore one new skill path that supports your goals.",
    capricorn: "Long-term planning and disciplined execution are favored.",
    aquarius: "Innovative suggestions will be well received.",
    pisces: "Focus windows and reduced distraction will boost output.",
  }[sign] || "Stay consistent and complete what is already open.");

export const getFinanceAdvice = (sign) =>
  ({
    aries: "Avoid impulse purchases and review recurring expenses.",
    taurus: "Conservative spending helps preserve near-term stability.",
    gemini: "Track small leaks in spending and fix them first.",
    cancer: "Family-linked planning decisions can improve savings.",
    leo: "Delay non-essential upgrades for a better window.",
    virgo: "Budget reviews and structured planning work well today.",
    libra: "Balance comfort spending with clear limits.",
    scorpio: "Revisit debt and subscription commitments carefully.",
    sagittarius: "Split funds between essentials and future opportunities.",
    capricorn: "Discipline with cash flow gives better control.",
    aquarius: "Digital expense tracking will reveal patterns quickly.",
    pisces: "Use a simple savings rule to avoid emotional spending.",
  }[sign] || "Keep spending simple and aligned to your plan.");

export const getSignFocusTheme = (sign) =>
  SIGN_FOCUS_THEMES[sign] || {
    theme: "steady progress",
    workAction: "complete pending priorities one by one",
    moneyAction: "keep spending aligned to essentials",
    relationshipAction: "keep communication calm and clear",
  };

export const getFutureClarityMetrics = (sign, energyScore) => {
  const signWeight = {
    aries: 2,
    taurus: 4,
    gemini: 6,
    cancer: 8,
    leo: 10,
    virgo: 12,
    libra: 14,
    scorpio: 16,
    sagittarius: 18,
    capricorn: 20,
    aquarius: 22,
    pisces: 24,
  }[sign] || 11;
  const normalizedEnergy = clampScore(energyScore, 1, 10);
  const momentum = clampScore(48 + signWeight + normalizedEnergy * 2, 35, 95);
  const stability = clampScore(44 + Math.floor(signWeight / 2) + normalizedEnergy * 2, 32, 93);
  const caution = clampScore(72 - normalizedEnergy * 3 + (signWeight % 6), 12, 88);
  return { momentum, stability, caution };
};

export const getActionOutcomeScenarios = (sign) => {
  const focus = getSignFocusTheme(sign);
  return [
    {
      title: "Work and Goals",
      action: focus.workAction,
      ifDone:
        "Likely outcome: stronger momentum, faster closure on pending tasks, and less pressure by evening.",
      ifSkipped:
        "Likely outcome: delay spillover into the next day and avoidable stress around unfinished priorities.",
    },
    {
      title: "Money and Decisions",
      action: focus.moneyAction,
      ifDone:
        "Likely outcome: better control over cash flow and more confidence for upcoming financial choices.",
      ifSkipped:
        "Likely outcome: impulse-led decisions may reduce flexibility later this week.",
    },
    {
      title: "Relationships and Communication",
      action: focus.relationshipAction,
      ifDone:
        "Likely outcome: cleaner conversations, improved trust, and fewer misunderstandings.",
      ifSkipped:
        "Likely outcome: small communication gaps can become bigger emotional friction.",
    },
  ];
};

export const getFutureTimelineCards = (sign) => {
  const focus = getSignFocusTheme(sign);
  return [
    {
      window: "Next 48 hours",
      guidance: `Stay close to ${focus.theme}. Keep plans simple and avoid over-committing.`,
    },
    {
      window: "Next 7 days",
      guidance:
        "Consistency matters more than intensity. Small daily actions will produce visible results by week end.",
    },
    {
      window: "Next 30 days",
      guidance:
        "If you keep discipline in work, money, and communication, this period can become a clear growth cycle.",
    },
  ];
};

export const getYearlyHoroscopeContent = (sign, year, metrics) => {
  const focus = getSignFocusTheme(sign);
  const intensity = metrics.momentum >= 70 ? "high" : metrics.momentum >= 55 ? "steady" : "measured";
  const financialWindow =
    metrics.stability >= 65
      ? "Q2 and Q4 are stronger for savings and long-term planning."
      : "Protect cashflow in Q1 and Q3, then scale gradually.";
  return {
    headline: `${year} is a ${intensity} growth year with ${focus.theme} as your anchor.`,
    quarterPlan: [
      "Q1: Build foundations through discipline and routines.",
      "Q2: Expand with careful decisions and calculated risks.",
      "Q3: Review health, spending, and unfinished commitments.",
      "Q4: Consolidate gains and prepare the next yearly cycle.",
    ],
    keyWins: [
      "Career opportunities improve when communication stays consistent.",
      "Partnerships perform better with clear expectations and boundaries.",
      financialWindow,
    ],
    caution:
      metrics.caution >= 60
        ? "Avoid rushed commitments in emotionally intense weeks."
        : "Use moderation and avoid overconfidence while momentum rises.",
  };
};

export const getTotalLifeReadingContent = (sign, birthDate, metrics) => {
  const focus = getSignFocusTheme(sign);
  const birthYear = Number(String(birthDate || "").slice(0, 4));
  const age = Number.isFinite(birthYear) ? Math.max(18, new Date().getFullYear() - birthYear) : null;
  const stage =
    age === null
      ? "current life stage"
      : age < 30
        ? "foundation stage"
        : age < 45
          ? "expansion stage"
          : age < 60
            ? "stability and leadership stage"
            : "wisdom and legacy stage";
  return {
    headline: `Your total reading highlights ${focus.theme} as a lifelong strength in your ${stage}.`,
    pillars: [
      {
        title: "Purpose and Karma",
        text: "Progress grows when you align actions with values and stay consistent under pressure.",
      },
      {
        title: "Relationships and Family",
        text: "Emotional maturity and clear communication shape long-term harmony.",
      },
      {
        title: "Wealth and Security",
        text:
          metrics.stability >= 65
            ? "Wealth compounds through disciplined planning, not sudden risk."
            : "Stability increases when you simplify obligations and avoid reactive spending.",
      },
      {
        title: "Health and Energy",
        text:
          metrics.caution >= 60
            ? "Protect rest, digestion, and stress levels to avoid energy dips."
            : "Maintain sleep and movement rhythm to preserve sustained performance.",
      },
    ],
    guidingPrinciple: `When in doubt, choose the path that strengthens ${focus.theme} and long-term stability.`,
  };
};

export const getRemedyTips = (sign) => [
  ({
    aries: "Recite Ganapathi mantra before starting major work.",
    taurus: "Offer white flowers on Friday for peace and stability.",
    gemini: "Write intentions clearly before important calls.",
    cancer: "Light a lamp in the evening and keep family space calm.",
    leo: "Chant Surya mantra and plan your day early.",
    virgo: "Donate food items and avoid overthinking minor delays.",
    libra: "Wear gentle colors and maintain emotional balance.",
    scorpio: "Avoid conflict windows and focus on constructive speech.",
    sagittarius: "Read one spiritual verse and take measured action.",
    capricorn: "Do a disciplined morning routine before money decisions.",
    aquarius: "Help a friend and keep communication clean.",
    pisces: "Practice silence for a short duration to settle mind.",
  }[sign] || "Keep routines steady for grounded results."),
  "Begin the day with a short prayer or mindful breathing.",
  "Offer a simple act of kindness before sunset.",
];

export const createEmptyPlanetHouseMap = () =>
  Array.from({ length: 12 }, (_, index) => ({ house: index + 1, planets: [] }));

export const derivePlanetHouseMap = (selectedSign, kundliData) => {
  const ascendantKey = normalizeZodiacKey(kundliData?.birthChart?.ascendant) || selectedSign || "aries";
  const ascendantIndex = Math.max(0, ZODIAC_SIGNS.indexOf(ascendantKey));
  const entries = createEmptyPlanetHouseMap();
  const planets = Array.isArray(kundliData?.planets) ? kundliData.planets : [];
  planets.forEach((entry) => {
    const planetName = String(entry?.planet || "").trim();
    const positionSignToken = String(entry?.position || "").split(" ").slice(-1)[0];
    const planetSignKey = normalizeZodiacKey(positionSignToken);
    if (!planetName || !planetSignKey) return;
    const planetIndex = ZODIAC_SIGNS.indexOf(planetSignKey);
    if (planetIndex < 0) return;
    const house = ((planetIndex - ascendantIndex + 12) % 12) + 1;
    entries[house - 1].planets.push(planetName);
  });
  return entries;
};

