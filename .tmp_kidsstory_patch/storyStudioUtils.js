import { BACKEND_BASE_URL } from "../../utils/api";

export const LOCAL_SCHEMA_VERSION = 3;
export const LOCAL_PROJECT_LIBRARY_KEY = "kids-story-video-project-library-v1";
export const LOCAL_CHARACTER_PRESET_KEY = "kids-story-character-presets-v1";

export const MAX_STORY_LENGTH = 7000;
export const MIN_STORY_LENGTH = 40;
export const MAX_UPLOAD_SIZE_BYTES = 500 * 1024;

const SAFETY_RULES = [
  { code: "self_harm", pattern: /suicide|self[-\s]?harm/i, reason: "self-harm or suicide" },
  { code: "weapons", pattern: /weapon/i, reason: "weapons" },
  { code: "graphic_violence", pattern: /gore|kill|terror/i, reason: "graphic violence" },
  { code: "abuse", pattern: /abuse/i, reason: "abuse" },
  { code: "adult", pattern: /explicit|adult content/i, reason: "adult content" },
];

export const sanitizeText = (value = "") => String(value).replace(/\u0000/g, "").trim();

export const getSafetyFailure = (value = "") => {
  const cleanValue = sanitizeText(value);
  const reasons = SAFETY_RULES.filter((rule) => rule.pattern.test(cleanValue)).map((rule) => ({
    code: rule.code,
    reason: rule.reason,
  }));

  return {
    blocked: reasons.length > 0,
    reasons,
  };
};

export const hasUnsafeThemes = (value = "") => getSafetyFailure(value).blocked;

export const buildSubtitlesFromScenes = (scenes = []) => {
  let offset = 0;
  return (Array.isArray(scenes) ? scenes : []).map((scene, index) => {
    const duration = Math.max(2, Math.min(15, Number(scene?.durationSeconds) || 4));
    const subtitle = {
      start: offset,
      end: offset + duration,
      text: `${sanitizeText(scene?.title || `Scene ${index + 1}`)}: ${sanitizeText(
        scene?.description || scene?.summary || ""
      )}`.trim(),
    };
    offset += duration;
    return subtitle;
  });
};

export const normalizeSceneForRender = (scene, index) => ({
  id: index + 1,
  title: sanitizeText(scene?.title || `Scene ${index + 1}`),
  description: sanitizeText(scene?.description || scene?.summary || ""),
  dialogue: sanitizeText(scene?.dialogue || "Narration continues."),
  emotion: sanitizeText(scene?.emotion || "wonder"),
  background: sanitizeText(scene?.background || ""),
  weather: sanitizeText(scene?.weather || ""),
  timeOfDay: sanitizeText(scene?.timeOfDay || ""),
  cameraActions: sanitizeText(scene?.cameraActions || "soft pan"),
  durationSeconds: Math.max(2, Math.min(15, Number(scene?.durationSeconds) || 4)),
  characters: Array.isArray(scene?.characters) ? scene.characters : [],
});

export const normalizeScenesForRender = (scenes = []) =>
  (Array.isArray(scenes) ? scenes : []).map((scene, index) => normalizeSceneForRender(scene, index));

export const validateScenesForRender = (scenes = []) => {
  if (!Array.isArray(scenes) || scenes.length === 0) {
    return "Please generate at least one scene before rendering.";
  }

  if (scenes.length > 20) {
    return "Please keep the storyboard to 20 scenes or fewer for rendering.";
  }

  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index];
    if (!sanitizeText(scene?.title)) {
      return `Scene ${index + 1} is missing title.`;
    }
    if (!sanitizeText(scene?.description || scene?.summary)) {
      return `Scene ${index + 1} is missing description.`;
    }
    if (!sanitizeText(scene?.dialogue)) {
      return `Scene ${index + 1} is missing dialogue.`;
    }

    const duration = Number(scene?.durationSeconds) || 4;
    if (duration < 2 || duration > 15) {
      return `Scene ${index + 1} duration must be between 2 and 15 seconds.`;
    }
  }

  return "";
};

export const normalizeMediaUrl = (value = "", preferredOrigin = "", fallbackBaseUrl = BACKEND_BASE_URL) => {
  const rawValue = sanitizeText(value);
  if (!rawValue) {
    return "";
  }

  if (/^(https?:|data:|blob:)/i.test(rawValue)) {
    return rawValue;
  }

  if (rawValue.startsWith("//")) {
    return `${window.location.protocol}${rawValue}`;
  }

  const safePreferredOrigin = sanitizeText(preferredOrigin).replace(/\/+$/, "");
  const safeFallback = sanitizeText(fallbackBaseUrl).replace(/\/+$/, "");

  if (rawValue.startsWith("/")) {
    if (safePreferredOrigin) {
      return `${safePreferredOrigin}${rawValue}`;
    }
    return `${safeFallback}${rawValue}`;
  }

  if (safePreferredOrigin) {
    return `${safePreferredOrigin}/${rawValue}`;
  }

  return `${safeFallback}/${rawValue}`;
};

export const normalizeProjectForLocal = (project, overrides = {}) => {
  const scenes = Array.isArray(overrides.scenes)
    ? overrides.scenes
    : Array.isArray(project?.scenes)
      ? project.scenes
      : [];

  return {
    projectId: project?.projectId || `local-${Date.now()}`,
    title: sanitizeText(overrides.title || project?.title || "AI Kids Story Video Generator"),
    storyPrompt: sanitizeText(overrides.storyPrompt || project?.storyPrompt || ""),
    storySource: overrides.storySource || project?.storySource || "paste",
    language: overrides.language || project?.language || "english",
    style: overrides.style || project?.style || "cartoon",
    videoSize: overrides.videoSize || project?.videoSize || "youtube",
    voiceType: overrides.voiceType || project?.voiceType || "kid-female",
    storyMode: overrides.storyMode || project?.storyMode || "bedtime",
    safeMode:
      typeof overrides.safeMode === "boolean"
        ? overrides.safeMode
        : typeof project?.safeMode === "boolean"
          ? project.safeMode
          : true,
    ageFilter: overrides.ageFilter || project?.ageFilter || "5-8",
    narration: overrides.narration || project?.narration || "",
    scenes,
    subtitles: Array.isArray(project?.subtitles) ? project.subtitles : [],
    characters: Array.isArray(project?.characters) ? project.characters : [],
    promptHints: Array.isArray(project?.promptHints) ? project.promptHints : [],
    createdAt: project?.createdAt || new Date().toISOString(),
    renderedAt: project?.renderedAt || null,
    videoUrl: overrides.videoUrl || project?.videoUrl || "",
    premiumExport:
      typeof overrides.premiumExport === "boolean"
        ? overrides.premiumExport
        : Boolean(project?.premiumExport),
    savedAt: new Date().toISOString(),
    schemaVersion: LOCAL_SCHEMA_VERSION,
  };
};

export const loadLocalCollection = (key) => {
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return [];
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (_error) {
    return [];
  }

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    Number(parsed.version) >= 1 &&
    Array.isArray(parsed.items)
  ) {
    return parsed.items;
  }

  return [];
};

export const saveLocalCollection = (key, items = []) => {
  window.localStorage.setItem(
    key,
    JSON.stringify({
      version: LOCAL_SCHEMA_VERSION,
      items: Array.isArray(items) ? items : [],
      updatedAt: new Date().toISOString(),
    })
  );
};
