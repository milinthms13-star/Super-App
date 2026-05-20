export const AGE_GROUPS = [
  { key: "3-5", label: "3-5 years - very simple" },
  { key: "5-8", label: "5-8 years - short story" },
  { key: "8-11", label: "8-11 years - adventure" },
  { key: "12+", label: "12+ years - deeper story" },
];

export const STORY_MODES = [
  { key: "bedtime", label: "Bedtime", icon: "Moon" },
  { key: "moral", label: "Moral", icon: "Leaf" },
  { key: "school", label: "School", icon: "Book" },
  { key: "mythology", label: "Mythology Safe", icon: "Temple" },
];

export const SAFETY_DEFAULTS = {
  noViolence: true,
  noScaryScenes: true,
  noBadLanguage: true,
  noUnsafeActions: true,
  parentFriendly: true,
};

const LANGUAGE_CONTENT = {
  ml: {
    titlePrefix: "Kids Story",
    once: "In a peaceful Kerala town",
    hero: "a kind child",
    learned: "the child learned a beautiful lesson",
    moralLabel: "Moral of the story",
    quiz: [
      "Who is the main character?",
      "What did the character learn?",
      "What would you do in this situation?",
    ],
    vocabulary: [
      { word: "Snehom", meaning: "A caring bond with others" },
      { word: "Karuna", meaning: "Helping others with compassion" },
      { word: "Dhairyam", meaning: "Doing right even when afraid" },
    ],
  },
  hi: {
    titlePrefix: "Kids Story",
    once: "In a small town",
    hero: "a kind child",
    learned: "the child learned a good lesson",
    moralLabel: "Moral of the story",
    quiz: [
      "Who is the main character?",
      "What did the character learn?",
      "What would you do in this situation?",
    ],
    vocabulary: [
      { word: "Dosti", meaning: "A caring friendship" },
      { word: "Dayaluta", meaning: "Helping others kindly" },
      { word: "Sahas", meaning: "Courage to do good" },
    ],
  },
  en: {
    titlePrefix: "Kids Story",
    once: "In a small village",
    hero: "a kind child",
    learned: "they learned a beautiful lesson",
    moralLabel: "Moral of the story",
    quiz: [
      "Who is the main character?",
      "What did the character learn?",
      "What would you do in this situation?",
    ],
    vocabulary: [
      { word: "Friendship", meaning: "A caring bond with others" },
      { word: "Kindness", meaning: "Helping others with love" },
      { word: "Courage", meaning: "Doing the right thing even when afraid" },
    ],
  },
};

const sentenceByAge = {
  "3-5": 5,
  "5-8": 8,
  "8-11": 12,
  "12+": 16,
};

export const buildLocalKidsStory = (form = {}) => {
  const lang = LANGUAGE_CONTENT[form.language] || LANGUAGE_CONTENT.en;
  const hero = String(form.heroName || "").trim() || lang.hero;
  const idea = String(form.idea || "").trim();
  const sentenceCount = sentenceByAge[form.ageGroup] || 8;
  const moral = String(form.moral || "").trim() || "Be kind and helpful";

  const base = [
    `${lang.once}, ${hero} had a special thought: ${idea}.`,
    `${hero} wanted to do something good, but the path was not easy.`,
    `With patience, kindness and courage, ${hero} tried again and again.`,
    `Friends and family noticed the good heart of ${hero} and came forward to help.`,
    `At the end, ${lang.learned}: ${moral}.`,
  ];

  const extra = Array.from({ length: Math.max(0, sentenceCount - base.length) }, (_, index) =>
    `${hero} took one more small step ${index + 1}, making the day brighter for everyone.`
  );

  const storyText = [...base.slice(0, 3), ...extra, ...base.slice(3)].join("\n\n");
  const titleIdea = idea.slice(0, 42);
  const titleSuffix = idea.length > 42 ? "..." : "";

  return {
    title: `${lang.titlePrefix}: ${titleIdea}${titleSuffix}`,
    storyText,
    moral: `${lang.moralLabel}: ${moral}`,
    vocabulary: lang.vocabulary,
    quiz: lang.quiz,
    characters: [
      {
        name: hero,
        personality: "kind, curious, brave",
        visualConsistencyPrompt: `${hero}, same face, same dress, same colors, child-safe cartoon style in every scene`,
      },
    ],
    scenes: splitIntoScenes(storyText, hero),
    safety: form.safety || { ...SAFETY_DEFAULTS },
    language: form.language || "en",
    ageGroup: form.ageGroup || "5-8",
  };
};

const splitIntoScenes = (storyText, hero) =>
  String(storyText || "")
    .split(/\n\n+/)
    .map((text) => text.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((text, index) => ({
      sceneNo: index + 1,
      narration: text,
      visualPrompt: `Scene ${index + 1}: ${hero} in a warm colorful child-safe cartoon world. Keep character design consistent. ${text}`,
    }));

const formatStory = (story) =>
  `${story.title}\n\n${story.storyText}\n\n${story.moral}\n\nQuestions:\n${(story.quiz || [])
    .map((question, index) => `${index + 1}. ${question}`)
    .join("\n")}`;

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));

export const copyStoryToClipboard = async (story) => {
  if (!navigator?.clipboard?.writeText) {
    throw new Error("Clipboard is not available in this browser.");
  }
  await navigator.clipboard.writeText(formatStory(story));
};

export const shareStoryToWhatsApp = (story) => {
  const text = encodeURIComponent(formatStory(story).slice(0, 1800));
  window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
};

export const downloadStoryAsHtml = (story) => {
  const safeTitle = String(story?.title || "kids-story");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
    safeTitle
  )}</title></head><body><h1>${escapeHtml(safeTitle)}</h1><pre style="font-family:Arial, sans-serif;white-space:pre-wrap">${escapeHtml(
    formatStory(story)
  )}</pre></body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.html`;
  link.click();
  URL.revokeObjectURL(url);
};
