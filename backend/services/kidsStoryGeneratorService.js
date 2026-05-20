const AGE_RULES = {
  "3-5": "Use very short sentences, simple words, and a gentle bedtime tone.",
  "5-8": "Use short paragraphs, light adventure, and clear moral learning.",
  "8-11": "Use richer adventure and problem solving without fear content.",
  "12+": "Use deeper emotions and practical life learning.",
};

const LANGUAGE_RULES = {
  ml: "Write naturally in Malayalam style with child-friendly words and local warmth. Avoid literal translation tone.",
  hi: "Write naturally in Hindi with simple child-friendly words.",
  en: "Write naturally in English with child-friendly words.",
};

const sanitizeText = (value, max = 1200) => String(value || "").trim().slice(0, max);

const sanitizeSafety = (safety = {}) => ({
  noViolence: safety.noViolence !== false,
  noScaryScenes: safety.noScaryScenes !== false,
  noBadLanguage: safety.noBadLanguage !== false,
  noUnsafeActions: safety.noUnsafeActions !== false,
  parentFriendly: safety.parentFriendly !== false,
});

const buildKidsStoryPrompt = (payload = {}) => {
  const cleanPayload = {
    idea: sanitizeText(payload.idea, 300),
    language: sanitizeText(payload.language, 10) || "en",
    ageGroup: sanitizeText(payload.ageGroup, 10) || "5-8",
    mode: sanitizeText(payload.mode, 40) || "moral",
    heroName: sanitizeText(payload.heroName, 80),
    moral: sanitizeText(payload.moral, 180) || "kindness and honesty",
    safety: sanitizeSafety(payload.safety),
  };

  return `Create a safe kids story.
Language: ${LANGUAGE_RULES[cleanPayload.language] || LANGUAGE_RULES.en}
Age: ${cleanPayload.ageGroup}. ${AGE_RULES[cleanPayload.ageGroup] || AGE_RULES["5-8"]}
Story mode: ${cleanPayload.mode}
Story idea: ${cleanPayload.idea}
Main character: ${cleanPayload.heroName || "create a suitable child-friendly character"}
Moral lesson: ${cleanPayload.moral}
Safety rules:
- No violence: ${cleanPayload.safety.noViolence}
- No scary scenes: ${cleanPayload.safety.noScaryScenes}
- No bad language: ${cleanPayload.safety.noBadLanguage}
- No unsafe actions: ${cleanPayload.safety.noUnsafeActions}
- Parent friendly: ${cleanPayload.safety.parentFriendly}

Return JSON only with:
{
  "title": "",
  "storyText": "",
  "moral": "",
  "characters": [{"name":"", "personality":"", "visualConsistencyPrompt":""}],
  "scenes": [{"sceneNo":1, "narration":"", "visualPrompt":""}],
  "vocabulary": [{"word":"", "meaning":""}],
  "quiz": ["", "", ""]
}`;
};

const fallbackKidsStory = (payload = {}) => {
  const hero = sanitizeText(payload.heroName, 80) || "Minnu";
  const idea = sanitizeText(payload.idea, 300) || "a child learns to help friends";
  const moral = sanitizeText(payload.moral, 180) || "Kindness makes every journey better.";

  return {
    title: `Kids Story - ${idea.slice(0, 50)}`,
    storyText: `${hero} had a small dream: ${idea}.\n\nAt first it was difficult, but ${hero} did not give up.\n\nWith kindness and courage, ${hero} helped friends and learned a beautiful lesson.`,
    moral: `Moral: ${moral}`,
    characters: [
      {
        name: hero,
        personality: "kind and curious",
        visualConsistencyPrompt: `${hero}, same face, same dress, same colors in every scene`,
      },
    ],
    scenes: [
      {
        sceneNo: 1,
        narration: `${hero} starts the journey.`,
        visualPrompt: `${hero} in a colorful safe cartoon village`,
      },
      {
        sceneNo: 2,
        narration: `${hero} helps friends.`,
        visualPrompt: `${hero} helping friends, same character design`,
      },
      {
        sceneNo: 3,
        narration: `${hero} learns the moral.`,
        visualPrompt: `${hero} smiling with friends, warm happy ending`,
      },
    ],
    vocabulary: [
      { word: "Kindness", meaning: "Helping others with love" },
      { word: "Courage", meaning: "Doing good even when it is hard" },
    ],
    quiz: [
      "Who is the hero?",
      "What did the hero learn?",
      "How can you help a friend today?",
    ],
  };
};

module.exports = {
  buildKidsStoryPrompt,
  fallbackKidsStory,
  sanitizeText,
};
