import React, { useEffect, useMemo, useRef, useState } from "react";
import { BACKEND_BASE_URL, buildApiUrl } from "../../utils/api";
import "./KidsStoryVideoMaker.css";

const LANGUAGE_OPTIONS = [
  { id: "english", label: "English", code: "en-US" },
  { id: "hindi", label: "Hindi", code: "hi-IN" },
  { id: "malayalam", label: "Malayalam", code: "ml-IN" },
];

const STYLE_OPTIONS = [
  { id: "cartoon", label: "Cartoon", description: "Bright animations, playful characters, and joyful motion." },
  { id: "storybook", label: "Storybook", description: "Illustrated scenes with gentle textures and dreamy storytelling." },
  { id: "anime", label: "Anime", description: "Vivid characters, dramatic movement, and cinematic energy." },
  { id: "puppet", label: "Puppet", description: "Warm stage-style motion with charming puppetry feel." },
  { id: "three-d", label: "3D", description: "Modern 3D look with depth, camera moves, and polished animation." },
];

const VIDEO_SIZE_OPTIONS = [
  { id: "youtube", label: "YouTube (16:9)" },
  { id: "shorts", label: "Shorts (9:16)" },
  { id: "whatsapp", label: "WhatsApp (1:1)" },
];

const VOICE_OPTIONS = [
  { id: "kid-female", label: "Kid Female" },
  { id: "kid-male", label: "Kid Male" },
  { id: "soft-female", label: "Soft Female" },
  { id: "warm-male", label: "Warm Male" },
  { id: "magic-robot", label: "Magic Robot" },
];

const STORY_MODES = [
  { id: "bedtime", label: "Bedtime" },
  { id: "educational", label: "Educational" },
  { id: "moral", label: "Moral" },
  { id: "funny", label: "Funny" },
  { id: "mythology", label: "Mythology" },
  { id: "science", label: "Science" },
];

const AGE_FILTERS = [
  { id: "3-5", label: "3-5 years" },
  { id: "5-8", label: "5-8 years" },
  { id: "8-11", label: "8-11 years" },
  { id: "12+", label: "12+ years" },
];

const STORY_TEMPLATES = [
  {
    id: "treasure-map",
    label: "Magic map adventure",
    prompt:
      "A curious child discovers a glowing map in the attic and sets off on a magical journey to make new friends.",
  },
  {
    id: "space-science",
    label: "Space science quest",
    prompt:
      "Two siblings build a tiny rocket in their backyard and learn planets, teamwork, and courage while helping a lost star.",
  },
  {
    id: "kindness-village",
    label: "Kindness moral story",
    prompt:
      "In a small village, a shy kid helps neighbors one by one and discovers that kindness returns as friendship and confidence.",
  },
  {
    id: "festival-joy",
    label: "Festival celebration",
    prompt:
      "Children prepare for a colorful local festival, share food, music, and stories, and solve a funny mix-up together.",
  },
];

const DEFAULT_STORY_PROMPT = STORY_TEMPLATES[0].prompt;

const LOCAL_SCHEMA_VERSION = 2;
const LOCAL_PROJECT_LIBRARY_KEY = "kids-story-video-project-library-v1";
const LOCAL_CHARACTER_PRESET_KEY = "kids-story-character-presets-v1";
const MAX_STORY_LENGTH = 7000;
const MIN_STORY_LENGTH = 40;
const MAX_UPLOAD_SIZE_BYTES = 500 * 1024;

const UNSAFE_THEME_PATTERNS = [
  /suicide/i,
  /self[-\s]?harm/i,
  /weapon/i,
  /gore/i,
  /kill/i,
  /terror/i,
  /abuse/i,
  /explicit/i,
  /adult content/i,
];

const getStyleDescription = (styleId) => {
  const style = STYLE_OPTIONS.find((item) => item.id === styleId);
  return style ? style.description : "An expressive animation style for kids.";
};

const getModeDescription = (modeId) => {
  const mode = STORY_MODES.find((item) => item.id === modeId);
  return mode ? `${mode.label} stories with age-appropriate pacing and tone.` : "A kid-safe story mode.";
};

const sanitizeText = (value = "") => String(value).replace(/\u0000/g, "").trim();

const hasUnsafeThemes = (value = "") => UNSAFE_THEME_PATTERNS.some((pattern) => pattern.test(value));

const parseApiResponse = async (response) => {
  const text = await response.text();
  if (!text) {
    const emptyError = new Error(
      `Video service returned empty response (${response.status}). Please verify backend API availability.`
    );
    emptyError.status = response.status;
    throw emptyError;
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch (_error) {
    throw new Error("Server returned invalid JSON.");
  }

  if (!response.ok) {
    const requestError = new Error(payload?.error || payload?.message || `Request failed (${response.status}).`);
    requestError.status = response.status;
    throw requestError;
  }

  return payload;
};

const buildSubtitlesFromScenes = (scenes = []) => {
  let offset = 0;
  return scenes.map((scene, index) => {
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

const normalizeSceneForRender = (scene, index) => ({
  id: index + 1,
  title: sanitizeText(scene?.title || `Scene ${index + 1}`),
  description: sanitizeText(scene?.description || scene?.summary || ""),
  dialogue: sanitizeText(scene?.dialogue || ""),
  emotion: sanitizeText(scene?.emotion || "wonder"),
  background: sanitizeText(scene?.background || ""),
  weather: sanitizeText(scene?.weather || ""),
  timeOfDay: sanitizeText(scene?.timeOfDay || ""),
  cameraActions: sanitizeText(scene?.cameraActions || "soft pan"),
  durationSeconds: Math.max(2, Math.min(15, Number(scene?.durationSeconds) || 4)),
  characters: Array.isArray(scene?.characters) ? scene.characters : [],
});

const normalizeScenesForRender = (scenes = []) =>
  (Array.isArray(scenes) ? scenes : []).map((scene, index) => normalizeSceneForRender(scene, index));

const validateScenesForRender = (scenes = []) => {
  if (!Array.isArray(scenes) || scenes.length === 0) {
    return "Please generate at least one scene before rendering.";
  }

  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index];
    if (!sanitizeText(scene?.title)) {
      return `Scene ${index + 1} is missing title.`;
    }
    if (!sanitizeText(scene?.description || scene?.summary)) {
      return `Scene ${index + 1} is missing description.`;
    }
    const duration = Number(scene?.durationSeconds) || 4;
    if (duration < 2 || duration > 15) {
      return `Scene ${index + 1} duration must be between 2 and 15 seconds.`;
    }
  }

  return "";
};

const loadLocalCollection = (key) => {
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

const saveLocalCollection = (key, items = []) => {
  window.localStorage.setItem(
    key,
    JSON.stringify({
      version: LOCAL_SCHEMA_VERSION,
      items: Array.isArray(items) ? items : [],
      updatedAt: new Date().toISOString(),
    })
  );
};

const normalizeMediaUrl = (value = "", preferredOrigin = "") => {
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
  if (rawValue.startsWith("/")) {
    if (safePreferredOrigin) {
      return `${safePreferredOrigin}${rawValue}`;
    }
    return `${BACKEND_BASE_URL}${rawValue}`;
  }

  if (safePreferredOrigin) {
    return `${safePreferredOrigin}/${rawValue}`;
  }
  return `${BACKEND_BASE_URL}/${rawValue}`;
};

const FALLBACK_SCENE_TITLES = ["Beginning", "Adventure", "Challenge", "Magic", "Celebration"];
const FALLBACK_CAMERA_ACTIONS = ["soft zoom", "gentle pan", "wide reveal", "close-up", "dolly in"];

const createClientFallbackProject = ({
  storyTitle,
  storyPrompt,
  languageId,
  styleId,
  voiceType,
  videoSizeId,
  storyMode,
  safeMode,
  ageFilter,
  storySource,
}) => {
  const rawLines = sanitizeText(storyPrompt)
    .split(/[\.\?\!]+/)
    .map((line) => sanitizeText(line))
    .filter(Boolean);

  const lines = rawLines.length ? rawLines.slice(0, 5) : ["A child discovers a magical surprise and learns teamwork."];

  const scenes = lines.map((line, index) => ({
    id: index + 1,
    title: FALLBACK_SCENE_TITLES[index] || `Scene ${index + 1}`,
    description: line,
    emotion: index === 0 ? "curious" : index === 2 ? "brave" : index === 4 ? "joyful" : "wonder",
    characters: [{ name: "Main Hero", role: "Hero", voice: voiceType }],
    cameraActions: FALLBACK_CAMERA_ACTIONS[index] || "subtle move",
    dialogue: `"${line}"`,
  }));

  return {
    projectId: `local-${Date.now()}`,
    createdAt: new Date().toISOString(),
    title: sanitizeText(storyTitle || "AI Kids Story Video Generator"),
    storyPrompt: sanitizeText(storyPrompt),
    storySource,
    language: languageId,
    style: styleId,
    videoSize: videoSizeId,
    voiceType,
    storyMode,
    safeMode,
    ageFilter,
    premiumExport: false,
    mode: storyMode,
    themes: [storyMode],
    characters: [
      {
        name: "Minku Rabbit",
        role: "Hero",
        appearance: "white rabbit with a purple vest and glowing eyes",
        voiceProfile: "kid-friendly playful narrator",
        colorPalette: ["lavender", "peach", "sky blue"],
      },
      {
        name: "Luna Fairy",
        role: "Guide",
        appearance: "sparkling fairy with pastel wings and a lantern",
        voiceProfile: "soft storytelling voice",
        colorPalette: ["rose gold", "mint", "cream"],
      },
    ],
    scenes,
    subtitles: scenes.map((scene, index) => ({
      start: index * 4,
      end: index * 4 + 4,
      text: `${scene.title}: ${scene.description}`,
    })),
    promptHints: scenes.map((scene) => ({
      imagePrompt: `Child-safe ${styleId} scene with ${scene.emotion} emotion`,
      animationPrompt: "Gentle movement, smooth transitions, and playful motion",
      backgroundPrompt: `Warm ${storyMode} environment with soft pastel colors`,
    })),
    narration: `${sanitizeText(storyTitle || "Story time")}. ${scenes
      .map((scene) => `${scene.title}: ${scene.description}`)
      .join(" ")}`,
  };
};

const getSceneId = (scene, index) => String(scene?.id || index + 1);

const normalizeProjectForLocal = (project, overrides = {}) => {
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
  };
};

const KidsStoryVideoMaker = () => {
  const recognitionRef = useRef(null);
  const voiceTargetRef = useRef("");
  const mainContentRef = useRef(null);
  const [subjectInput, setSubjectInput] = useState("Rabbit and Tortoise");
  const [storyTitle, setStoryTitle] = useState("AI Kids Story Video Generator");
  const [storyPrompt, setStoryPrompt] = useState(DEFAULT_STORY_PROMPT);
  const [storySource, setStorySource] = useState("paste");
  const [uploadedText, setUploadedText] = useState("");
  const [languageId, setLanguageId] = useState(LANGUAGE_OPTIONS[0].id);
  const [styleId, setStyleId] = useState(STYLE_OPTIONS[0].id);
  const [videoSizeId, setVideoSizeId] = useState(VIDEO_SIZE_OPTIONS[0].id);
  const [voiceType, setVoiceType] = useState(VOICE_OPTIONS[0].id);
  const [storyMode, setStoryMode] = useState(STORY_MODES[0].id);
  const [ageFilter, setAgeFilter] = useState(AGE_FILTERS[1].id);
  const [safeMode, setSafeMode] = useState(true);
  const [premiumHD, setPremiumHD] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [generatedProject, setGeneratedProject] = useState(null);
  const [generatedScenes, setGeneratedScenes] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const [isAutopilotGenerating, setIsAutopilotGenerating] = useState(false);
  const [isStageRegenerating, setIsStageRegenerating] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceListeningTarget, setVoiceListeningTarget] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [projectLibrary, setProjectLibrary] = useState([]);
  const [characterPresets, setCharacterPresets] = useState([]);

  const languageLabel = useMemo(
    () => LANGUAGE_OPTIONS.find((option) => option.id === languageId)?.label || "English",
    [languageId]
  );

  const styleLabel = useMemo(
    () => STYLE_OPTIONS.find((option) => option.id === styleId)?.label || "Storybook",
    [styleId]
  );

  const videoSizeLabel = useMemo(
    () => VIDEO_SIZE_OPTIONS.find((option) => option.id === videoSizeId)?.label || "YouTube",
    [videoSizeId]
  );

  const storyText = storySource === "upload" ? uploadedText || storyPrompt : storyPrompt;
  const storyLength = storyText.trim().length;

  const creditsUsed = generatedScenes.length ? generatedScenes.length * 5 : 20;
  const estimatedDurationSeconds = generatedScenes.length * 4;

  const pipelineProgress = useMemo(() => {
    if (!generatedProject) {
      return { value: 0, label: "No project yet" };
    }
    if (videoUrl) {
      return { value: 100, label: "Rendered and ready" };
    }
    if (generatedScenes.length) {
      return { value: 65, label: "Storyboard ready" };
    }
    return { value: 35, label: "Project generated" };
  }, [generatedProject, generatedScenes.length, videoUrl]);

  useEffect(() => {
    setProjectLibrary(loadLocalCollection(LOCAL_PROJECT_LIBRARY_KEY));
  }, []);

  useEffect(() => {
    setCharacterPresets(loadLocalCollection(LOCAL_CHARACTER_PRESET_KEY));
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      if (recognitionRef.current?.abort) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.lang =
      LANGUAGE_OPTIONS.find((option) => option.id === languageId)?.code || "en-US";

    recognition.onresult = (event) => {
      const transcript = sanitizeText(event?.results?.[0]?.[0]?.transcript || "");
      if (!transcript) {
        setMessage("No speech detected. Please try again.");
        return;
      }

      if (voiceTargetRef.current === "subject") {
        setSubjectInput(transcript);
        setMessage("Voice subject captured. Tap One Click Story Movie.");
      } else if (voiceTargetRef.current === "story") {
        setStorySource("paste");
        setStoryPrompt((prev) => sanitizeText(`${prev ? `${prev} ` : ""}${transcript}`));
        setUploadedText("");
        setMessage("Voice story text captured.");
      }
      setError("");
    };

    recognition.onerror = () => {
      setError("Voice recognition failed. Please try again or type manually.");
      setMessage("");
      setVoiceListeningTarget("");
    };

    recognition.onend = () => {
      voiceTargetRef.current = "";
      setVoiceListeningTarget("");
    };

    recognitionRef.current = recognition;
    setSpeechSupported(true);
  }, [languageId]);

  const persistProjectLibrary = (items) => {
    setProjectLibrary(items);
    saveLocalCollection(LOCAL_PROJECT_LIBRARY_KEY, items);
  };

  const persistCharacterPresets = (items) => {
    setCharacterPresets(items);
    saveLocalCollection(LOCAL_CHARACTER_PRESET_KEY, items);
  };

  useEffect(() => {
    const focusTarget = mainContentRef.current?.querySelector("h2");
    if (focusTarget && typeof focusTarget.focus === "function") {
      focusTarget.setAttribute("tabindex", "-1");
      focusTarget.focus();
    }
  }, [activeTab]);

  const handleSaveCharacterPreset = () => {
    const currentCharacters = generatedProject?.characters;
    if (!Array.isArray(currentCharacters) || !currentCharacters.length) {
      setError("Generate characters before saving a preset.");
      setMessage("");
      return;
    }

    const preset = {
      id: `preset-${Date.now()}`,
      title: sanitizeText(generatedProject?.storyTitle || generatedProject?.title || subjectInput || "Character Pack"),
      createdAt: new Date().toISOString(),
      characters: currentCharacters.map((character) => ({
        id: character.id || `char-${Math.random().toString(36).slice(2, 9)}`,
        name: character.name || "Character",
        role: character.role || "Story role",
        appearance: character.appearance || "",
        voiceProfile: character.voiceProfile || voiceType,
        emotionStyle: character.emotionStyle || "friendly",
        locked: character.locked !== false,
      })),
    };

    const next = [preset, ...characterPresets.filter((item) => item.id !== preset.id)].slice(0, 20);
    persistCharacterPresets(next);
    setError("");
    setMessage("Character preset saved.");
  };

  const handleApplyCharacterPreset = (preset) => {
    if (!preset?.characters?.length) {
      return;
    }

    setGeneratedProject((current) =>
      current
        ? {
            ...current,
            characters: preset.characters.map((character) => ({
              ...character,
              locked: character.locked !== false,
            })),
          }
        : current
    );
    setError("");
    setMessage(`Applied character preset: ${preset.title || "Preset"}`);
  };

  const handleDeleteCharacterPreset = (presetId) => {
    const next = characterPresets.filter((preset) => preset.id !== presetId);
    persistCharacterPresets(next);
    setError("");
    setMessage("Character preset removed.");
  };

  const applyProjectSnapshotToStudio = (incomingProject, successText = "Project loaded.") => {
    if (!incomingProject) {
      return;
    }

    const normalized = normalizeProjectForLocal(incomingProject, {
      title: incomingProject.storyTitle || incomingProject.title || storyTitle,
      storyPrompt:
        incomingProject.storyPrompt ||
        incomingProject.script?.synopsis ||
        incomingProject.story?.synopsis ||
        storyPrompt,
      storySource: incomingProject.storySource || "paste",
      language: incomingProject.language || languageId,
      style: incomingProject.style || styleId,
      videoSize: incomingProject.videoSize || videoSizeId,
      voiceType: incomingProject.voiceType || voiceType,
      storyMode: incomingProject.storyMode || storyMode,
      safeMode:
        typeof incomingProject.safeMode === "boolean" ? incomingProject.safeMode : safeMode,
      ageFilter: incomingProject.ageFilter || ageFilter,
      scenes: Array.isArray(incomingProject.scenes) ? incomingProject.scenes : [],
      videoUrl: normalizeMediaUrl(incomingProject.videoUrl || ""),
      premiumExport: Boolean(incomingProject.premiumExport),
    });

    const enrichedProject = {
      ...normalized,
      subject: incomingProject.subject || subjectInput,
      script: incomingProject.script || null,
      voicePlan: incomingProject.voicePlan || null,
      musicPlan: incomingProject.musicPlan || null,
      animationPlan: incomingProject.animationPlan || null,
      editCapabilities: Array.isArray(incomingProject.editCapabilities)
        ? incomingProject.editCapabilities
        : [],
      storyTitle: incomingProject.storyTitle || normalized.title,
    };

    setGeneratedProject(enrichedProject);
    setGeneratedScenes(normalized.scenes || []);
    setStoryTitle(normalized.title || storyTitle);
    setStoryPrompt(normalized.storyPrompt || storyPrompt);
    setStorySource(normalized.storySource || "paste");
    setUploadedText(
      (normalized.storySource || "paste") === "upload" ? normalized.storyPrompt || "" : ""
    );
    setLanguageId(normalized.language || languageId);
    setStyleId(normalized.style || styleId);
    setVideoSizeId(normalized.videoSize || videoSizeId);
    setVoiceType(normalized.voiceType || voiceType);
    setStoryMode(normalized.storyMode || storyMode);
    setAgeFilter(normalized.ageFilter || ageFilter);
    setSafeMode(typeof normalized.safeMode === "boolean" ? normalized.safeMode : safeMode);
    setPremiumHD(Boolean(normalized.premiumExport));
    setVideoUrl(normalizeMediaUrl(normalized.videoUrl || ""));
    setSubjectInput(incomingProject.subject || subjectInput);
    setError("");
    setMessage(successText);
  };

  const patchCurrentProject = async (partialPayload, successText = "Project updated.") => {
    if (!generatedProject?.projectId) {
      return;
    }

    const response = await fetch(
      buildApiUrl(`/video-studio/projects/${generatedProject.projectId}`),
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partialPayload),
      }
    );
    const payload = await parseApiResponse(response);
    if (!payload.success || !payload.project) {
      throw new Error(payload.error || payload.message || "Failed to update project.");
    }
    applyProjectSnapshotToStudio(payload.project, successText);
  };

  const handleAutopilotGenerate = async () => {
    const cleanSubject = sanitizeText(subjectInput);
    if (!cleanSubject) {
      setError("Please enter a story subject like Rabbit and Tortoise.");
      setMessage("");
      return;
    }

    setIsAutopilotGenerating(true);
    setError("");
    setMessage("Generating full script, characters, scenes, animation plan, and voice map...");

    try {
      const response = await fetch(buildApiUrl("/video-studio/autopilot/create"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: cleanSubject,
          languageId,
          styleId,
          voiceType,
          videoSizeId,
          storyMode,
          safeMode,
          ageFilter,
          sceneCount: generatedScenes.length || 5,
        }),
      });
      const payload = await parseApiResponse(response);
      if (!payload.success || !payload.project) {
        throw new Error(payload.error || payload.message || "Autopilot generation failed.");
      }

      applyProjectSnapshotToStudio(payload.project, "Autopilot project generated. You can edit every stage.");
      setActiveTab("characters");
    } catch (err) {
      setError(err.message || "Unable to generate autopilot project.");
    } finally {
      setIsAutopilotGenerating(false);
    }
  };

  const handleVoiceInput = (target) => {
    if (!recognitionRef.current || !speechSupported) {
      setError("Voice input is not supported in this browser.");
      setMessage("");
      return;
    }

    try {
      if (voiceListeningTarget) {
        recognitionRef.current.stop();
        voiceTargetRef.current = "";
        setVoiceListeningTarget("");
        setMessage("Voice capture stopped.");
        return;
      }

      voiceTargetRef.current = target;
      setVoiceListeningTarget(target);
      setError("");
      setMessage(
        target === "subject"
          ? "Listening... Say a subject like Rabbit and Tortoise."
          : "Listening... Say your full story prompt."
      );
      recognitionRef.current.lang =
        LANGUAGE_OPTIONS.find((option) => option.id === languageId)?.code || "en-US";
      recognitionRef.current.start();
    } catch (_error) {
      setVoiceListeningTarget("");
      setError("Unable to start microphone. Please allow mic permission.");
      setMessage("");
    }
  };

  const handleRegenerateStage = async (stage) => {
    if (!generatedProject?.projectId) {
      setError("Generate a project first.");
      return;
    }

    setIsStageRegenerating(stage);
    setError("");
    setMessage(`Regenerating ${stage} stage...`);
    try {
      const response = await fetch(
        buildApiUrl(`/video-studio/projects/${generatedProject.projectId}/regenerate/${stage}`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: subjectInput,
            sceneCount: generatedScenes.length || 5,
          }),
        }
      );
      const payload = await parseApiResponse(response);
      if (!payload.success || !payload.project) {
        throw new Error(payload.error || payload.message || `Failed to regenerate ${stage}.`);
      }
      applyProjectSnapshotToStudio(payload.project, `${stage} stage regenerated.`);
    } catch (err) {
      setError(err.message || `Unable to regenerate ${stage}.`);
    } finally {
      setIsStageRegenerating("");
    }
  };

  const handleUploadStory = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const name = String(file.name || "").toLowerCase();
    if (!name.endsWith(".txt") && !name.endsWith(".md")) {
      setError("Please upload only .txt or .md files.");
      setMessage("");
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setError("Story file is too large. Keep it under 500KB.");
      setMessage("");
      return;
    }

    const text = sanitizeText(await file.text());
    setUploadedText(text);
    setStoryPrompt(text);
    setMessage(`Uploaded story file: ${file.name}`);
    setError("");
  };

  const applyTemplatePrompt = (templatePrompt) => {
    setStorySource("paste");
    setStoryPrompt(templatePrompt);
    setUploadedText("");
    setError("");
    setMessage("Template applied. Customize it before generating.");
  };

  const handleGenerateProject = async () => {
    const storyContent = sanitizeText(storyText);
    const safeTitle = sanitizeText(storyTitle || "AI Kids Story Video Generator");

    if (storyContent.length < MIN_STORY_LENGTH) {
      setError(`Please provide at least ${MIN_STORY_LENGTH} characters for a meaningful story.`);
      setMessage("");
      return;
    }

    if (storyContent.length > MAX_STORY_LENGTH) {
      setError(`Story is too long. Keep it under ${MAX_STORY_LENGTH} characters.`);
      setMessage("");
      return;
    }

    if (safeMode && hasUnsafeThemes(storyContent)) {
      setError("Safe mode blocked this prompt. Please remove unsafe themes and try again.");
      setMessage("");
      return;
    }

    setError("");
    setMessage("Creating your AI storyboard and animation pipeline...");
    setIsGenerating(true);

    try {
      const response = await fetch(buildApiUrl("/video-studio/create"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyTitle: safeTitle,
          storyPrompt: storyContent,
          languageId,
          styleId,
          voiceType,
          videoSizeId,
          storyMode,
          safeMode,
          ageFilter,
          storySource,
        }),
      });

      const payload = await parseApiResponse(response);
      if (!payload.success || !payload.project) {
        throw new Error(payload.error || payload.message || "AI pipeline generation failed.");
      }
      const serviceOrigin = (() => {
        try {
          return new URL(response.url).origin;
        } catch (_error) {
          return "";
        }
      })();

      const project = normalizeProjectForLocal(payload.project, {
        title: safeTitle,
        storyPrompt: storyContent,
        storySource,
      });

      const resolvedVideoUrl = normalizeMediaUrl(project.videoUrl, serviceOrigin);
      applyProjectSnapshotToStudio(
        {
          ...payload.project,
          ...project,
          videoUrl: resolvedVideoUrl,
        },
        "AI project generated. Review scenes and render your video."
      );
      setActiveTab("scenes");
    } catch (err) {
      const isServiceIssue =
        /empty response|invalid json|failed to fetch|network/i.test(String(err?.message || "")) ||
        Number(err?.status) >= 500;

      if (!isServiceIssue) {
        setError(err.message || "Unable to generate the AI story project.");
        return;
      }

      const fallbackProject = createClientFallbackProject({
        storyTitle: safeTitle,
        storyPrompt: storyContent,
        languageId,
        styleId,
        voiceType,
        videoSizeId,
        storyMode,
        safeMode,
        ageFilter,
        storySource,
      });

      setGeneratedProject(fallbackProject);
      setGeneratedScenes(fallbackProject.scenes || []);
      setStoryTitle(fallbackProject.title || safeTitle);
      setVideoUrl("");
      setError("");
      setMessage(
        `AI service is unavailable right now (${err.message || "unknown error"}). Loaded local storyboard fallback.`
      );
      setActiveTab("scenes");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSceneFieldChange = (sceneId, field, value) => {
    const nextScenes = generatedScenes.map((scene, index) => {
      const id = getSceneId(scene, index);
      if (id !== String(sceneId)) {
        return scene;
      }
      return { ...scene, [field]: value };
    });

    setGeneratedScenes(nextScenes);
    setGeneratedProject((current) =>
      current
        ? {
            ...current,
            scenes: nextScenes,
            subtitles: buildSubtitlesFromScenes(nextScenes),
          }
        : current
    );
  };

  const handleSceneDurationChange = (sceneId, value) => {
    const duration = Math.max(2, Math.min(15, Number(value) || 4));
    handleSceneFieldChange(sceneId, "durationSeconds", duration);
  };

  const handleMoveScene = (fromIndex, direction) => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= generatedScenes.length) {
      return;
    }

    const reordered = [...generatedScenes];
    const [picked] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, picked);

    const normalized = reordered.map((scene, index) => ({
      ...scene,
      id: index + 1,
    }));

    setGeneratedScenes(normalized);
    setGeneratedProject((current) =>
      current
        ? {
            ...current,
            scenes: normalized,
            subtitles: buildSubtitlesFromScenes(normalized),
          }
        : current
    );
    setMessage("Scene order updated. Save scene edits to persist.");
    setError("");
  };

  const handleRenderVideo = async () => {
    if (!generatedProject) {
      setError("Generate the project before rendering.");
      return;
    }

    const normalizedScenes = normalizeScenesForRender(generatedScenes);
    const sceneValidationError = validateScenesForRender(normalizedScenes);
    if (sceneValidationError) {
      setError(sceneValidationError);
      return;
    }

    const normalizedStoryPrompt = sanitizeText(storyText);
    if (!normalizedStoryPrompt) {
      setError("Story text is missing. Please add a story before rendering.");
      return;
    }

    const renderProject = {
      ...generatedProject,
      title: sanitizeText(storyTitle || generatedProject.title || "AI Kids Story Video Generator"),
      storyPrompt: normalizedStoryPrompt,
      scenes: normalizedScenes,
      subtitles: buildSubtitlesFromScenes(normalizedScenes),
      premiumExport: premiumHD,
      safeMode,
      style: styleId,
      videoSize: videoSizeId,
      language: languageId,
      voiceType,
      storyMode,
      ageFilter,
    };

    setError("");
    setMessage("Rendering your MP4 with AI visuals and subtitles...");
    setIsRendering(true);

    try {
      const response = await fetch(buildApiUrl("/video-studio/render"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: renderProject, premiumHD }),
      });

      const payload = await parseApiResponse(response);
      if (!payload.success) {
        throw new Error(payload.error || payload.message || "Video render failed.");
      }
      const serviceOrigin = (() => {
        try {
          return new URL(response.url).origin;
        } catch (_error) {
          return "";
        }
      })();

      const nextProject = {
        ...renderProject,
        renderedAt: new Date().toISOString(),
        videoUrl: normalizeMediaUrl(payload.videoUrl, serviceOrigin),
      };

      setGeneratedProject(nextProject);
      setVideoUrl(nextProject.videoUrl);
      setMessage("Video rendered successfully. Preview and export your MP4.");
      setActiveTab("export");
    } catch (err) {
      setError(err.message || "Unable to render the video.");
    } finally {
      setIsRendering(false);
    }
  };

  const handlePlayNarration = () => {
    if (!generatedProject?.narration) {
      setError("Generate the project first to play narration.");
      return;
    }

    const speech = window.speechSynthesis;
    if (!speech) {
      setError("Speech synthesis is not supported in this browser.");
      return;
    }

    speech.cancel();
    const utterance = new SpeechSynthesisUtterance(generatedProject.narration);
    utterance.lang = LANGUAGE_OPTIONS.find((option) => option.id === languageId)?.code || "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => setIsNarrating(true);
    utterance.onend = () => setIsNarrating(false);
    utterance.onerror = () => {
      setIsNarrating(false);
      setError("Unable to play narration aloud.");
    };

    const voices = speech.getVoices();
    const voice = voices.find((item) => item.lang.toLowerCase().startsWith(utterance.lang.toLowerCase()));
    if (voice) {
      utterance.voice = voice;
    }

    speech.speak(utterance);
  };

  const handleCopyNarration = async () => {
    if (!generatedProject?.narration) {
      setError("No narration available yet.");
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedProject.narration);
      setError("");
      setMessage("Narration copied to clipboard.");
    } catch (_error) {
      setError("Clipboard access is blocked in this browser.");
    }
  };

  const handleVoicePlanFieldChange = (field, value) => {
    setGeneratedProject((current) => {
      if (!current) return current;
      return {
        ...current,
        voicePlan: {
          ...(current.voicePlan || {}),
          narrator: {
            ...((current.voicePlan && current.voicePlan.narrator) || {}),
            [field]: value,
          },
        },
      };
    });
  };

  const handleMusicPlanFieldChange = (field, value) => {
    setGeneratedProject((current) => {
      if (!current) return current;

      const nextMusicPlan = { ...(current.musicPlan || {}) };
      if (field === "sfx") {
        nextMusicPlan.sfx = String(value || "")
          .split(",")
          .map((item) => sanitizeText(item))
          .filter(Boolean);
      } else {
        nextMusicPlan[field] = value;
      }

      return {
        ...current,
        musicPlan: nextMusicPlan,
      };
    });
  };

  const handleDownloadVideo = () => {
    if (!videoUrl) {
      setError("Render the video first to download it.");
      return;
    }

    const baseTitle = sanitizeText(generatedProject?.title || storyTitle || "kids_story_video")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();

    const link = document.createElement("a");
    link.href = videoUrl;
    link.download = `${baseTitle || "kids_story_video"}.mp4`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setMessage("Download started. Your MP4 is ready.");
  };

  const handleDownloadProjectJson = () => {
    if (!generatedProject) {
      setError("Generate a project first.");
      return;
    }

    const exportPayload = {
      ...generatedProject,
      title: storyTitle,
      storyPrompt: storyText,
      scenes: generatedScenes,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const baseName = sanitizeText(storyTitle || "kids_story_project")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();

    const link = document.createElement("a");
    link.href = url;
    link.download = `${baseName || "kids_story_project"}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage("Project JSON downloaded.");
    setError("");
  };

  const handleSaveProject = () => {
    if (!generatedProject) {
      setError("Generate the project before saving.");
      return;
    }

    const snapshot = normalizeProjectForLocal(generatedProject, {
      title: storyTitle,
      storyPrompt: storyText,
      storySource,
      language: languageId,
      style: styleId,
      videoSize: videoSizeId,
      voiceType,
      storyMode,
      safeMode,
      ageFilter,
      scenes: generatedScenes,
      videoUrl,
      premiumExport: premiumHD,
    });

    const enrichedSnapshot = {
      ...snapshot,
      subject: generatedProject.subject || subjectInput,
      storyTitle: generatedProject.storyTitle || snapshot.title,
      script: generatedProject.script || null,
      voicePlan: generatedProject.voicePlan || null,
      musicPlan: generatedProject.musicPlan || null,
      animationPlan: generatedProject.animationPlan || null,
      editCapabilities: Array.isArray(generatedProject.editCapabilities)
        ? generatedProject.editCapabilities
        : [],
    };

    const nextItems = [
      enrichedSnapshot,
      ...projectLibrary.filter((item) => item.projectId !== enrichedSnapshot.projectId),
    ].slice(0, 30);

    persistProjectLibrary(nextItems);
    setMessage("Project saved in My Projects.");
    setError("");
    setActiveTab("myprojects");
  };

  const handleLoadProject = (project) => {
    const snapshot = normalizeProjectForLocal(project);
    applyProjectSnapshotToStudio(
      { ...project, ...snapshot },
      `Loaded project: ${snapshot.title}`
    );
    setActiveTab("scenes");
  };

  const handleDeleteProject = (projectId) => {
    const nextItems = projectLibrary.filter((item) => item.projectId !== projectId);
    persistProjectLibrary(nextItems);
    setMessage("Project removed from My Projects.");
    setError("");
  };

  const handleToggleAdvanced = () => {
    setAdvancedOpen((prev) => !prev);
    setMessage("");
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError("");
    setMessage("");
  };

  return (
    <div className="kids-story-video-maker page-shell">
      <section className="kids-story-hero">
        <div className="kids-story-hero-copy">
          <p className="kids-story-badge">AI Kids Animation Studio</p>
          <h1>Create child-safe story videos with AI scenes, narration, and export.</h1>
          <p>
            Full creator flow with templates, story parsing, editable scenes, narration preview,
            premium HD toggle, and local project library.
          </p>
          <div className="hero-badges">
            <span>Bedtime mode</span>
            <span>Safe mode</span>
            <span>My Projects</span>
            <span>Premium HD</span>
          </div>
        </div>
        <div className="studio-hero-panel">
          <div className="studio-status-card">
            <h2>Studio pipeline</h2>
            <p>Story parse, character consistency, narration script, subtitles, and MP4 render.</p>
            <ul>
              <li>Step 1: Story input and safety checks</li>
              <li>Step 2: AI storyboard with editable scenes</li>
              <li>Step 3: Render and save/export</li>
            </ul>
            <div className="pipeline-progress-card">
              <div className="pipeline-progress-head">
                <span>Progress</span>
                <strong>{pipelineProgress.value}%</strong>
              </div>
              <div className="pipeline-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pipelineProgress.value}>
                <div className="pipeline-progress-fill" style={{ width: `${pipelineProgress.value}%` }} />
              </div>
              <p>{pipelineProgress.label}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="studio-tabs">
        {[
          { id: "dashboard", label: "Dashboard" },
          { id: "create", label: "Create" },
          { id: "characters", label: "Characters" },
          { id: "scenes", label: "Scenes" },
          { id: "audio", label: "Audio" },
          { id: "export", label: "Export" },
          { id: "myprojects", label: "My Projects" },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`studio-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </section>

      <div className="studio-grid">
        <aside className="studio-sidebar">
          <div className="studio-card sidebar-card">
            <h3>Quick studio</h3>
            <div className="studio-panel-row">
              <label>Story mode</label>
              <select value={storyMode} onChange={(event) => setStoryMode(event.target.value)}>
                {STORY_MODES.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
              <small>{getModeDescription(storyMode)}</small>
            </div>
            <div className="studio-panel-row">
              <label>Age category</label>
              <select value={ageFilter} onChange={(event) => setAgeFilter(event.target.value)}>
                {AGE_FILTERS.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="studio-toggle-row">
              <span>Safe mode</span>
              <button className={`pill-toggle ${safeMode ? "on" : "off"}`} onClick={() => setSafeMode((prev) => !prev)}>
                {safeMode ? "Enabled" : "Disabled"}
              </button>
            </div>
            <div className="studio-toggle-row">
              <span>Premium HD</span>
              <button className={`pill-toggle ${premiumHD ? "on" : "off"}`} onClick={() => setPremiumHD((prev) => !prev)}>
                {premiumHD ? "Enabled" : "Disabled"}
              </button>
            </div>
            <div className="studio-stats-card">
              <p>Estimated credits</p>
              <strong>{creditsUsed}</strong>
              <p>Duration: {estimatedDurationSeconds || 0}s</p>
            </div>
          </div>

          <div className="studio-card features-card">
            <h3>Module features</h3>
            <ul>
              <li>Template prompt quick start</li>
              <li>Safe mode keyword guardrail</li>
              <li>Editable scenes before render</li>
              <li>Project library save/load/delete</li>
            </ul>
          </div>
        </aside>

        <main className="studio-main">
          {activeTab === "dashboard" && (
            <div className="studio-card dashboard-card">
              <h2>Dashboard</h2>
              <p>Track project readiness, scenes, exports, and saved library.</p>
              <div className="dashboard-grid">
                <div className="dashboard-item">
                  <span>Projects</span>
                  <strong>{generatedProject ? 1 : 0}</strong>
                </div>
                <div className="dashboard-item">
                  <span>Scenes</span>
                  <strong>{generatedScenes.length}</strong>
                </div>
                <div className="dashboard-item">
                  <span>Exports</span>
                  <strong>{videoUrl ? 1 : 0}</strong>
                </div>
                <div className="dashboard-item soft">
                  <span>Saved Projects</span>
                  <strong>{projectLibrary.length}</strong>
                </div>
              </div>
              {generatedProject && (
                <div className="dashboard-welcome">
                  <h3>{generatedProject.title}</h3>
                  <p>{generatedProject.storyPrompt?.slice(0, 160)}{generatedProject.storyPrompt?.length > 160 ? "..." : ""}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "create" && (
            <div className="studio-card create-card">
              <h2>Create</h2>
              <p>Paste your story or upload text. AI builds scenes, dialogue, and narration automatically.</p>

              <label htmlFor="subjectInput">One-click story subject</label>
              <input
                id="subjectInput"
                type="text"
                value={subjectInput}
                onChange={(event) => setSubjectInput(event.target.value)}
                placeholder="Example: Rabbit and Tortoise"
              />
              <div className="story-actions">
                <button
                  className="secondary-button"
                  onClick={() => handleVoiceInput("subject")}
                  disabled={!speechSupported}
                >
                  {voiceListeningTarget === "subject"
                    ? "Stop Subject Mic"
                    : speechSupported
                      ? "Speak Subject"
                      : "Voice Unsupported"}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => handleVoiceInput("story")}
                  disabled={!speechSupported}
                >
                  {voiceListeningTarget === "story"
                    ? "Stop Story Mic"
                    : speechSupported
                      ? "Speak Story"
                      : "Voice Unsupported"}
                </button>
              </div>
              <div className="story-actions">
                <button
                  className="primary-button"
                  onClick={handleAutopilotGenerate}
                  disabled={isAutopilotGenerating}
                >
                  {isAutopilotGenerating ? "Creating full AI movie pipeline..." : "One Click Story Movie"}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => handleRegenerateStage("script")}
                  disabled={!generatedProject?.projectId || isStageRegenerating === "script"}
                >
                  {isStageRegenerating === "script" ? "Regenerating script..." : "Regenerate Script"}
                </button>
              </div>

              <label htmlFor="storyTitle">Project title</label>
              <input
                id="storyTitle"
                type="text"
                value={storyTitle}
                onChange={(event) => setStoryTitle(event.target.value)}
                maxLength={120}
                placeholder="Ex: The Lantern Forest Adventure"
              />

              <div className="template-row">
                {STORY_TEMPLATES.map((template) => (
                  <button key={template.id} type="button" className="template-chip" onClick={() => applyTemplatePrompt(template.prompt)}>
                    {template.label}
                  </button>
                ))}
              </div>

              <div className="story-source-row">
                <label>
                  <input
                    type="radio"
                    name="storySource"
                    value="paste"
                    checked={storySource === "paste"}
                    onChange={() => setStorySource("paste")}
                  />
                  Paste story
                </label>
                <label>
                  <input
                    type="radio"
                    name="storySource"
                    value="upload"
                    checked={storySource === "upload"}
                    onChange={() => setStorySource("upload")}
                  />
                  Upload text
                </label>
              </div>

              {storySource === "upload" && (
                <div className="upload-control">
                  <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={handleUploadStory} />
                  {uploadedText && <p className="upload-hint">Uploaded story length: {uploadedText.length} chars</p>}
                </div>
              )}

              <label htmlFor="storyPrompt">Story text</label>
              <textarea
                id="storyPrompt"
                rows={10}
                value={storySource === "upload" ? uploadedText || storyPrompt : storyPrompt}
                onChange={(event) => {
                  setStoryPrompt(event.target.value);
                  if (storySource === "upload") {
                    setUploadedText(event.target.value);
                  }
                }}
                placeholder={DEFAULT_STORY_PROMPT}
              />
              <p className={`char-counter ${storyLength > MAX_STORY_LENGTH ? "danger" : ""}`}>
                {storyLength} / {MAX_STORY_LENGTH} characters
              </p>

              <div className="create-grid">
                <div>
                  <label>Language</label>
                  <select value={languageId} onChange={(event) => setLanguageId(event.target.value)}>
                    {LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Style</label>
                  <select value={styleId} onChange={(event) => setStyleId(event.target.value)}>
                    {STYLE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="create-grid">
                <div>
                  <label>Video size</label>
                  <select value={videoSizeId} onChange={(event) => setVideoSizeId(event.target.value)}>
                    {VIDEO_SIZE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Voice style</label>
                  <select value={voiceType} onChange={(event) => setVoiceType(event.target.value)}>
                    {VOICE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="style-hint">{getStyleDescription(styleId)}</p>

              {generatedProject?.script && (
                <div className="advanced-panel">
                  <h3>AI Script Writer Output (Editable)</h3>
                  <label>Synopsis</label>
                  <textarea
                    rows={3}
                    value={generatedProject.script?.synopsis || ""}
                    onChange={(event) => {
                      const nextSynopsis = event.target.value;
                      setGeneratedProject((current) =>
                        current
                          ? {
                              ...current,
                              script: { ...(current.script || {}), synopsis: nextSynopsis },
                              storyPrompt: nextSynopsis,
                            }
                          : current
                      );
                      setStoryPrompt(nextSynopsis);
                    }}
                  />
                  <label>Moral Message</label>
                  <input
                    type="text"
                    value={generatedProject.script?.moral || ""}
                    onChange={(event) => {
                      const nextMoral = event.target.value;
                      setGeneratedProject((current) =>
                        current
                          ? { ...current, script: { ...(current.script || {}), moral: nextMoral } }
                          : current
                      );
                    }}
                  />
                  <div className="story-actions">
                    <button
                      className="secondary-button"
                      onClick={async () => {
                        try {
                          await patchCurrentProject(
                            {
                              script: generatedProject.script,
                              storyPrompt: generatedProject.script?.synopsis || storyPrompt,
                            },
                            "Script edits saved."
                          );
                        } catch (err) {
                          setError(err.message || "Unable to save script edits.");
                        }
                      }}
                      disabled={!generatedProject?.projectId}
                    >
                      Save Script Edits
                    </button>
                  </div>
                </div>
              )}

              <div className="story-actions">
                <button className="primary-button" onClick={handleGenerateProject} disabled={isGenerating}>
                  {isGenerating ? "Building AI storyboard..." : "Generate Story Pipeline"}
                </button>
                <button className="secondary-button" onClick={handlePlayNarration} disabled={!generatedProject || isNarrating}>
                  {isNarrating ? "Playing narration..." : "Preview narration"}
                </button>
              </div>

              <button className="secondary-button advanced-toggle" onClick={handleToggleAdvanced}>
                {advancedOpen ? "Hide Advanced Creator Studio" : "Show Advanced Creator Studio"}
              </button>

              {advancedOpen && (
                <div className="advanced-panel">
                  <h3>Advanced studio controls</h3>
                  <p>Adjust story mode and age filter while keeping automatic scene and character generation active.</p>
                  <div className="advanced-settings-grid">
                    <div>
                      <label>Story mode</label>
                      <select value={storyMode} onChange={(event) => setStoryMode(event.target.value)}>
                        {STORY_MODES.map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>Age category</label>
                      <select value={ageFilter} onChange={(event) => setAgeFilter(event.target.value)}>
                        {AGE_FILTERS.map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {error && <div className="message error">{error}</div>}
              {message && !error && <div className="message success">{message}</div>}
            </div>
          )}

          {activeTab === "characters" && (
            <div className="studio-card characters-card">
              <h2>Characters</h2>
              <p>AI character consistency keeps the same face, costume, palette, and voice across scenes.</p>
              <div className="story-actions">
                <button
                  className="secondary-button"
                  onClick={() => handleRegenerateStage("characters")}
                  disabled={!generatedProject?.projectId || isStageRegenerating === "characters"}
                >
                  {isStageRegenerating === "characters" ? "Regenerating..." : "Regenerate Characters"}
                </button>
                <button
                  className="secondary-button"
                  onClick={async () => {
                    try {
                      await patchCurrentProject(
                        { characters: generatedProject?.characters || [] },
                        "Character edits saved."
                      );
                    } catch (err) {
                      setError(err.message || "Unable to save characters.");
                    }
                  }}
                  disabled={!generatedProject?.projectId}
                >
                  Save Character Edits
                </button>
                <button
                  className="secondary-button"
                  onClick={handleSaveCharacterPreset}
                  disabled={!generatedProject?.characters?.length}
                >
                  Save Character Preset
                </button>
              </div>
              {characterPresets.length > 0 && (
                <div className="project-library-grid" style={{ marginBottom: 16 }}>
                  {characterPresets.map((preset) => (
                    <article key={preset.id} className="project-library-card">
                      <h3>{preset.title || "Character Preset"}</h3>
                      <p>Characters: {preset.characters?.length || 0}</p>
                      <div className="project-library-actions">
                        <button
                          className="secondary-button"
                          onClick={() => handleApplyCharacterPreset(preset)}
                        >
                          Apply
                        </button>
                        <button
                          className="download-button"
                          onClick={() => handleDeleteCharacterPreset(preset.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {generatedProject ? (
                <div className="character-grid">
                  {(generatedProject.characters || []).map((character, index) => (
                    <div key={index} className="character-card">
                      <div className="character-avatar">{character.name?.charAt(0) || "C"}</div>
                      <div className="character-details">
                        <strong>{character.name || `Character ${index + 1}`}</strong>
                        <span>{character.role || "Story role"}</span>
                        <span>{character.voiceProfile || voiceType}</span>
                      </div>
                      <label>Name</label>
                      <input
                        type="text"
                        value={character.name || ""}
                        onChange={(event) => {
                          setGeneratedProject((current) => {
                            if (!current) return current;
                            const characters = [...(current.characters || [])];
                            characters[index] = { ...characters[index], name: event.target.value };
                            return { ...current, characters };
                          });
                        }}
                      />
                      <label>Appearance</label>
                      <textarea
                        rows={2}
                        value={character.appearance || ""}
                        onChange={(event) => {
                          setGeneratedProject((current) => {
                            if (!current) return current;
                            const characters = [...(current.characters || [])];
                            characters[index] = { ...characters[index], appearance: event.target.value };
                            return { ...current, characters };
                          });
                        }}
                      />
                      <label>Voice</label>
                      <input
                        type="text"
                        value={character.voiceProfile || ""}
                        onChange={(event) => {
                          setGeneratedProject((current) => {
                            if (!current) return current;
                            const characters = [...(current.characters || [])];
                            characters[index] = { ...characters[index], voiceProfile: event.target.value };
                            return { ...current, characters };
                          });
                        }}
                      />
                      <div className="studio-toggle-row">
                        <span>Character Lock</span>
                        <button
                          className={`pill-toggle ${character.locked !== false ? "on" : "off"}`}
                          onClick={() => {
                            setGeneratedProject((current) => {
                              if (!current) return current;
                              const characters = [...(current.characters || [])];
                              characters[index] = {
                                ...characters[index],
                                locked: characters[index]?.locked === false,
                              };
                              return { ...current, characters };
                            });
                          }}
                        >
                          {character.locked !== false ? "Locked" : "Unlocked"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Generate the story pipeline to preview your AI characters.</p>
              )}
            </div>
          )}

          {activeTab === "scenes" && (
            <div className="studio-card scenes-card">
              <h2>Scenes</h2>
              <p>Review and edit the storyboard before rendering.</p>
              <div className="story-actions">
                <button
                  className="secondary-button"
                  onClick={() => handleRegenerateStage("scenes")}
                  disabled={!generatedProject?.projectId || isStageRegenerating === "scenes"}
                >
                  {isStageRegenerating === "scenes" ? "Regenerating..." : "Regenerate Scenes"}
                </button>
                <button
                  className="secondary-button"
                  onClick={async () => {
                    try {
                      await patchCurrentProject({ scenes: generatedScenes }, "Scene edits saved.");
                    } catch (err) {
                      setError(err.message || "Unable to save scenes.");
                    }
                  }}
                  disabled={!generatedProject?.projectId}
                >
                  Save Scene Edits
                </button>
              </div>
              <div className="preview-grid">
                {generatedScenes.length ? (
                  generatedScenes.map((scene, index) => {
                    const sceneId = getSceneId(scene, index);
                    return (
                      <article key={sceneId} className="scene-card">
                        <div className="scene-title-row">
                          <span className="scene-number">Scene {sceneId}</span>
                          <span className="scene-emotion">{scene.emotion || "gentle"}</span>
                        </div>
                        <div className="story-actions">
                          <button
                            className="secondary-button"
                            onClick={() => handleMoveScene(index, "up")}
                            disabled={index === 0}
                          >
                            Move Up
                          </button>
                          <button
                            className="secondary-button"
                            onClick={() => handleMoveScene(index, "down")}
                            disabled={index === generatedScenes.length - 1}
                          >
                            Move Down
                          </button>
                        </div>

                        <label htmlFor={`scene-title-${sceneId}`}>Title</label>
                        <input
                          id={`scene-title-${sceneId}`}
                          type="text"
                          value={scene.title || ""}
                          onChange={(event) => handleSceneFieldChange(sceneId, "title", event.target.value)}
                        />

                        <label htmlFor={`scene-description-${sceneId}`}>Description</label>
                        <textarea
                          id={`scene-description-${sceneId}`}
                          rows={4}
                          value={scene.description || scene.summary || ""}
                          onChange={(event) => handleSceneFieldChange(sceneId, "description", event.target.value)}
                        />

                        <label htmlFor={`scene-dialogue-${sceneId}`}>Dialogue</label>
                        <textarea
                          id={`scene-dialogue-${sceneId}`}
                          rows={3}
                          value={scene.dialogue || ""}
                          onChange={(event) => handleSceneFieldChange(sceneId, "dialogue", event.target.value)}
                        />

                        <div className="create-grid">
                          <div>
                            <label htmlFor={`scene-duration-${sceneId}`}>Duration (seconds)</label>
                            <input
                              id={`scene-duration-${sceneId}`}
                              type="number"
                              min={2}
                              max={15}
                              value={scene.durationSeconds || 4}
                              onChange={(event) => handleSceneDurationChange(sceneId, event.target.value)}
                            />
                          </div>
                          <div>
                            <label htmlFor={`scene-weather-${sceneId}`}>Weather</label>
                            <input
                              id={`scene-weather-${sceneId}`}
                              type="text"
                              value={scene.weather || ""}
                              onChange={(event) => handleSceneFieldChange(sceneId, "weather", event.target.value)}
                            />
                          </div>
                        </div>

                        <div className="create-grid">
                          <div>
                            <label htmlFor={`scene-time-${sceneId}`}>Time</label>
                            <input
                              id={`scene-time-${sceneId}`}
                              type="text"
                              value={scene.timeOfDay || ""}
                              onChange={(event) => handleSceneFieldChange(sceneId, "timeOfDay", event.target.value)}
                            />
                          </div>
                          <div>
                            <label htmlFor={`scene-camera-${sceneId}`}>Camera</label>
                            <input
                              id={`scene-camera-${sceneId}`}
                              type="text"
                              value={scene.cameraActions || ""}
                              onChange={(event) => handleSceneFieldChange(sceneId, "cameraActions", event.target.value)}
                            />
                          </div>
                        </div>

                        <label htmlFor={`scene-bg-${sceneId}`}>Background</label>
                        <textarea
                          id={`scene-bg-${sceneId}`}
                          rows={2}
                          value={scene.background || ""}
                          onChange={(event) => handleSceneFieldChange(sceneId, "background", event.target.value)}
                        />

                        <div className="scene-meta">Camera: {scene.cameraActions || "soft pan"}</div>
                      </article>
                    );
                  })
                ) : (
                  <p>No scenes yet. Use Create to build your video pipeline.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "audio" && (
            <div className="studio-card audio-card">
              <h2>Audio</h2>
              <p>Choose voice style and preview narration for your story.</p>
              <div className="create-grid">
                <div>
                  <label>Voice type</label>
                  <select value={voiceType} onChange={(event) => setVoiceType(event.target.value)}>
                    {VOICE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="story-actions">
                <button
                  className="secondary-button"
                  onClick={() => handleRegenerateStage("voice")}
                  disabled={!generatedProject?.projectId || isStageRegenerating === "voice"}
                >
                  {isStageRegenerating === "voice" ? "Regenerating..." : "Regenerate Voice Plan"}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => handleRegenerateStage("music")}
                  disabled={!generatedProject?.projectId || isStageRegenerating === "music"}
                >
                  {isStageRegenerating === "music" ? "Regenerating..." : "Regenerate Music + SFX"}
                </button>
              </div>
              <div className="narration-summary-card">
                <h3>Narration script</h3>
                <p>{generatedProject?.narration || "Narration appears after generating the pipeline."}</p>
              </div>
              <div className="audio-actions">
                <button className="secondary-button" onClick={handlePlayNarration} disabled={!generatedProject}>
                  {isNarrating ? "Playing narration..." : "Listen to narration"}
                </button>
                <button className="secondary-button" onClick={handleCopyNarration} disabled={!generatedProject?.narration}>
                  Copy narration
                </button>
              </div>
            </div>
          )}

          {activeTab === "export" && (
            <div className="studio-card export-card">
              <h2>Export</h2>
              <p>Render MP4, preview timeline, and create a shareable output.</p>
              <div className="video-preview-card">
                <div className="video-preview-player">
                  {videoUrl ? (
                    <video controls src={videoUrl} className="story-video-player" />
                  ) : (
                    <div className="video-preview-poster">
                      <span>{isRendering ? "Rendering your video..." : "Render to preview the final MP4"}</span>
                    </div>
                  )}
                </div>
                <div className="video-preview-meta">
                  <p><strong>Title:</strong> {generatedProject?.title || "Not generated yet"}</p>
                  <p><strong>Language:</strong> {languageLabel}</p>
                  <p><strong>Style:</strong> {styleLabel}</p>
                  <p><strong>Video size:</strong> {videoSizeLabel}</p>
                  <p><strong>Mode:</strong> {storyMode}</p>
                  <p><strong>Safe mode:</strong> {safeMode ? "On" : "Off"}</p>
                  <p><strong>Premium HD:</strong> {premiumHD ? "On" : "Off"}</p>
                </div>
              </div>

              <div className="timeline-grid">
                {generatedScenes.length ? generatedScenes.map((scene, index) => {
                  const sceneId = getSceneId(scene, index);
                  return (
                    <div key={sceneId} className="timeline-card">
                      <div className="timeline-number">{sceneId}</div>
                      <div>
                        <strong>{scene.title || `Scene ${sceneId}`}</strong>
                        <p>{scene.description || scene.summary}</p>
                      </div>
                    </div>
                  );
                }) : <p>Create the project to build your scene timeline.</p>}
              </div>

              <div className="project-actions export-actions">
                <button className="primary-button" onClick={handleRenderVideo} disabled={!generatedProject || isRendering}>
                  {isRendering ? "Rendering video..." : "Render MP4"}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => handleRegenerateStage("animation")}
                  disabled={!generatedProject?.projectId || isStageRegenerating === "animation"}
                >
                  {isStageRegenerating === "animation" ? "Regenerating..." : "Regenerate Animation Plan"}
                </button>
                <button className="download-button" onClick={handleDownloadVideo} disabled={!videoUrl}>
                  Download MP4
                </button>
                <button className="secondary-button" onClick={handleDownloadProjectJson} disabled={!generatedProject}>
                  Download Project JSON
                </button>
                <button className="secondary-button" onClick={handleSaveProject} disabled={!generatedProject}>
                  Save Project
                </button>
              </div>
            </div>
          )}

          {activeTab === "myprojects" && (
            <div className="studio-card projects-card">
              <h2>My Projects</h2>
              <p>Local project library saved on this device.</p>
              {projectLibrary.length === 0 ? (
                <p>No saved projects yet. Generate and save one from Export.</p>
              ) : (
                <div className="project-library-grid">
                  {projectLibrary.map((project) => (
                    <article key={project.projectId} className="project-library-card">
                      <h3>{project.title || "Untitled project"}</h3>
                      <p>{project.storyPrompt?.slice(0, 120)}{project.storyPrompt?.length > 120 ? "..." : ""}</p>
                      <div className="project-library-meta">
                        <span>Scenes: {Array.isArray(project.scenes) ? project.scenes.length : 0}</span>
                        <span>Mode: {project.storyMode || "bedtime"}</span>
                      </div>
                      <div className="project-library-actions">
                        <button className="secondary-button" onClick={() => handleLoadProject(project)}>Load</button>
                        <button className="download-button" onClick={() => handleDeleteProject(project.projectId)}>Delete</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && activeTab !== "create" && <div className="message error">{error}</div>}
          {message && activeTab !== "create" && !error && <div className="message success">{message}</div>}
        </main>
      </div>
    </div>
  );
};

export default KidsStoryVideoMaker;
