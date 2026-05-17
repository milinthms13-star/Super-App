import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./KidsStoryVideoMaker.css";
import {
  LOCAL_CHARACTER_PRESET_KEY,
  LOCAL_PROJECT_LIBRARY_KEY,
  MAX_STORY_LENGTH,
  MAX_UPLOAD_SIZE_BYTES,
  MIN_STORY_LENGTH,
  buildSubtitlesFromScenes,
  getSafetyFailure,
  loadLocalCollection,
  normalizeMediaUrl,
  normalizeProjectForLocal,
  normalizeScenesForRender,
  sanitizeText,
  saveLocalCollection,
  validateScenesForRender,
} from "./storyStudioUtils";
import {
  VideoStudioApiError,
  createAutopilotProject,
  createProject,
  getProjectDownloadLink,
  patchProject,
  regenerateScene,
  regenerateSceneDialogue,
  regenerateStage,
  renderProject,
  renderPromptVideoHf,
  waitForRenderedVideo,
} from "./videoStudioApi";
import SceneCards from "./components/SceneCards";
import TimelineCards from "./components/TimelineCards";
import CharacterCards from "./components/CharacterCards";

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
const AI_PROVIDER_OPTIONS = [
  { id: "huggingface", label: "Hugging Face (Recommended)" },
  { id: "pollinations", label: "Pollinations" },
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

const getStyleDescription = (styleId) => {
  const style = STYLE_OPTIONS.find((item) => item.id === styleId);
  return style ? style.description : "An expressive animation style for kids.";
};

const getModeDescription = (modeId) => {
  const mode = STORY_MODES.find((item) => item.id === modeId);
  return mode ? `${mode.label} stories with age-appropriate pacing and tone.` : "A kid-safe story mode.";
};

const FALLBACK_SCENE_TITLES = ["Beginning", "Adventure", "Challenge", "Magic", "Celebration"];
const FALLBACK_CAMERA_ACTIONS = ["soft zoom", "gentle pan", "wide reveal", "close-up", "dolly in"];
const createDraftCharacter = (index = 0) => ({
  id: `char-${Date.now()}-${index + 1}`,
  name: `Character ${index + 1}`,
  role: "Story role",
  appearance: "friendly cartoon character",
  voiceProfile: "kid-female",
  emotionStyle: "friendly",
  locked: true,
});
const createDraftScene = (index = 0) => ({
  id: index + 1,
  title: `Scene ${index + 1}`,
  description: "Describe what happens in this scene.",
  dialogue: "Narrator: Add dialogue here.",
  emotion: "wonder",
  background: "colorful cartoon world",
  weather: "sunny",
  timeOfDay: "Morning",
  cameraActions: "soft pan",
  durationSeconds: 4,
  characters: [],
});

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
  aiProvider,
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
    aiProvider: aiProvider || "huggingface",
    mode: storyMode,
    themes: [storyMode],
    characters: [
      {
        name: "Ari",
        role: "Hero",
        appearance: "curious explorer with a bright backpack",
        voiceProfile: "kid-friendly playful narrator",
        colorPalette: ["sky blue", "sunny yellow", "mint"],
      },
      {
        name: "Milo",
        role: "Guide",
        appearance: "friendly sidekick with expressive eyes and a warm smile",
        voiceProfile: "soft storytelling voice",
        colorPalette: ["peach", "teal", "cream"],
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

const buildCartoonRenderPayload = ({
  project,
  scenes,
  storyTitle,
  storyPrompt,
  languageId,
  styleId,
  voiceType,
  videoSizeId,
  storyMode,
  ageFilter,
  safeMode,
  premiumHD,
  aiProvider,
}) => {
  const projectCharacters =
    Array.isArray(project?.characters) && project.characters.length
      ? project.characters
      : [
          {
            id: "hero",
            name: "Hero",
            role: "Main Character",
            appearance: "bright-eyed child cartoon hero with colorful clothes",
            voiceProfile: voiceType,
            colorPalette: ["#ff8fb3", "#ffd166", "#7bdff2"],
          },
          {
            id: "guide",
            name: "Guide",
            role: "Mentor",
            appearance: "friendly smiling cartoon guide",
            voiceProfile: "soft narrator",
            colorPalette: ["#b8f2e6", "#f7d6e0", "#f6bd60"],
          },
        ];

  const normalizedScenes = normalizeScenesForRender(scenes).map((scene, index) => {
    const sceneCharacters =
      Array.isArray(scene.characters) && scene.characters.length
        ? scene.characters
        : projectCharacters.slice(0, 2).map((character) => ({
            name: character.name,
            role: character.role,
            appearance: character.appearance,
            voiceProfile: character.voiceProfile || voiceType,
          }));

    const spokenLines = String(scene.dialogue || scene.description || "")
      .split(/\n+/)
      .map((line) => sanitizeText(line))
      .filter(Boolean)
      .map((line, lineIndex) => {
        const match = line.match(/^([^:]{1,40}):\s*(.+)$/);
        return {
          speaker: match?.[1] || sceneCharacters[lineIndex % sceneCharacters.length]?.name || "Narrator",
          text: match?.[2] || line,
          emotion: scene.emotion || "wonder",
        };
      });

    const cleanDialogue =
      spokenLines.length > 0
        ? spokenLines.map((line) => `${line.speaker}: ${line.text}`).join("\n")
        : `Narrator: ${scene.description}`;

    return {
      ...scene,
      characters: sceneCharacters,
      dialogue: cleanDialogue,
      spokenLines,
      visualPrompt: [
        `REAL CARTOON ANIMATION FRAME, ${styleId} kids cartoon style`,
        `scene title: ${scene.title}`,
        `background: ${scene.background || scene.description}`,
        `characters visible on screen: ${sceneCharacters
          .map(
            (character) =>
              `${character.name}, ${character.role}, ${character.appearance || "cartoon child character"}`
          )
          .join("; ")}`,
        `emotion: ${scene.emotion || "happy wonder"}`,
        `camera motion: ${scene.cameraActions || "gentle zoom and pan"}`,
        "full body characters, expressive faces, mouth animation, child-safe, colorful, no text-only slide",
      ].join(". "),
      animationPlan: {
        shotType: index === 0 ? "wide establishing shot" : "medium character shot",
        cameraMotion: scene.cameraActions || "gentle zoom",
        characterMotion: "characters blink, wave, walk slightly, and mouth opens while speaking",
        lipSync: true,
        renderMode: "cartoon_characters_not_slides",
      },
      audioPlan: {
        narration: cleanDialogue,
        spokenLines,
        voiceType,
        musicMood: storyMode,
        sfx: ["soft whoosh transition", "gentle sparkle", "kid-friendly ambience"],
      },
      durationSeconds: Math.max(5, Number(scene.durationSeconds) || 6),
    };
  });

  return {
    ...project,
    title: sanitizeText(storyTitle || project?.title || "AI Kids Story Video Generator"),
    storyPrompt: sanitizeText(storyPrompt),
    scenes: normalizedScenes,
    characters: projectCharacters,
    subtitles: buildSubtitlesFromScenes(normalizedScenes),
    premiumExport: premiumHD,
    safeMode,
    style: styleId,
    videoSize: videoSizeId,
    language: languageId,
    voiceType,
    storyMode,
    ageFilter,
    aiProvider: sanitizeText(aiProvider || project?.aiProvider || "huggingface").toLowerCase(),
    renderMode: "real-cartoon",
    requireCharacters: true,
    requireDialogueVoice: true,
    requireLipSync: true,
    requireSceneImages: false,
  };
};

const getSceneId = (scene, index) => String(scene?.id || index + 1);

const KidsStoryVideoMaker = () => {
  const { t } = useTranslation();
  const recognitionRef = useRef(null);
  const voiceTargetRef = useRef("");
  const mainContentRef = useRef(null);
  const voiceCatalogReadyRef = useRef(false);
  const requestControllersRef = useRef({});
  const renderProgressIntervalRef = useRef(null);
  const [subjectInput, setSubjectInput] = useState("Space adventure with a lost star");
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
  const [aiProvider, setAiProvider] = useState("huggingface");
  const [generatedProject, setGeneratedProject] = useState(null);
  const [generatedScenes, setGeneratedScenes] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderProgressLabel, setRenderProgressLabel] = useState("");
  const [isNarrating, setIsNarrating] = useState(false);
  const [isAutopilotGenerating, setIsAutopilotGenerating] = useState(false);
  const [isStageRegenerating, setIsStageRegenerating] = useState("");
  const [isRegeneratingSceneId, setIsRegeneratingSceneId] = useState("");
  const [isRegeneratingDialogueId, setIsRegeneratingDialogueId] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceListeningTarget, setVoiceListeningTarget] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [projectLibrary, setProjectLibrary] = useState([]);
  const [characterPresets, setCharacterPresets] = useState([]);
  const [serviceCapabilities, setServiceCapabilities] = useState({
    freeMode: false,
    aiProviderEnabled: false,
    realCartoonModeEnabled: false,
    defaultAiProvider: "huggingface",
  });
  const [dirtySections, setDirtySections] = useState({
    script: false,
    characters: false,
    scenes: false,
    voice: false,
    music: false,
  });

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

  const hasUnsavedEdits = Object.values(dirtySections).some(Boolean);

  const applyServiceCapabilities = (payload) => {
    if (!payload || typeof payload !== "object") {
      return;
    }
    setServiceCapabilities((current) => ({
      ...current,
      freeMode: Boolean(payload.freeMode),
      aiProviderEnabled: Boolean(payload.aiProviderEnabled),
      realCartoonModeEnabled: Boolean(payload.realCartoonModeEnabled),
      defaultAiProvider: sanitizeText(payload.defaultAiProvider || current.defaultAiProvider || "huggingface").toLowerCase(),
    }));
  };

  const markSectionDirty = (section) => {
    setDirtySections((current) => ({ ...current, [section]: true }));
  };

  const clearSectionDirty = (section) => {
    setDirtySections((current) => ({ ...current, [section]: false }));
  };

  const formatSafetyError = (apiError) => {
    if (!(apiError instanceof VideoStudioApiError) || !apiError.safety?.reasons?.length) {
      return apiError?.message || "Request failed.";
    }
    const reasons = apiError.safety.reasons.map((item) => item.reason).join(", ");
    return `Safety guardrail blocked this request: ${reasons}.`;
  };

  const runCancelableRequest = async (key, requestFactory) => {
    const currentController = requestControllersRef.current[key];
    if (currentController) {
      currentController.abort();
    }

    const controller = new AbortController();
    requestControllersRef.current[key] = controller;
    try {
      return await requestFactory(controller.signal);
    } finally {
      if (requestControllersRef.current[key] === controller) {
        delete requestControllersRef.current[key];
      }
    }
  };

  const stopRenderProgress = (reset = false) => {
    if (renderProgressIntervalRef.current) {
      clearInterval(renderProgressIntervalRef.current);
      renderProgressIntervalRef.current = null;
    }
    if (reset) {
      setRenderProgress(0);
      setRenderProgressLabel("");
    }
  };

  const startRenderProgress = () => {
    stopRenderProgress();
    const startedAt = Date.now();
    setRenderProgress(8);
    setRenderProgressLabel("Preparing render request...");

    renderProgressIntervalRef.current = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      let target = 92;
      let label = "Finalizing MP4 output...";

      if (elapsedSeconds < 15) {
        target = 20;
        label = "Uploading scene and timeline data...";
      } else if (elapsedSeconds < 120) {
        target = 70;
        label = "Rendering scenes and subtitles...";
      } else if (elapsedSeconds < 300) {
        target = 86;
        label = "Encoding video and audio track...";
      }

      setRenderProgress((current) => Math.min(target, current + 2));
      setRenderProgressLabel(label);
    }, 1400);
  };

  const shouldAttemptRenderRecovery = (err) => {
    const code = String(err?.code || "").toUpperCase();
    const status = Number(err?.status || 0);
    const message = String(err?.message || "").toLowerCase();
    if (code === "EMPTY_RESPONSE" || code === "REQUEST_TIMEOUT" || code === "NETWORK_ERROR" || code === "INVALID_JSON") {
      return true;
    }
    if (status === 408 || status === 502 || status === 503 || status === 504) {
      return true;
    }
    return /empty response|timed out|network|aborted/i.test(message);
  };

  useEffect(() => {
    setProjectLibrary(loadLocalCollection(LOCAL_PROJECT_LIBRARY_KEY));
  }, []);

  useEffect(() => {
    setCharacterPresets(loadLocalCollection(LOCAL_CHARACTER_PRESET_KEY));
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      Object.values(requestControllersRef.current).forEach((controller) => controller?.abort?.());
      stopRenderProgress(true);
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

  useEffect(() => {
    if (!window.speechSynthesis) {
      return undefined;
    }

    const handleVoicesChanged = () => {
      voiceCatalogReadyRef.current = true;
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      voiceCatalogReadyRef.current = true;
    }

    window.speechSynthesis.addEventListener?.("voiceschanged", handleVoicesChanged);
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", handleVoicesChanged);
    };
  }, []);

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
    markSectionDirty("characters");
    setError("");
    setMessage(`Applied character preset: ${preset.title || "Preset"}`);
  };

  const handleDeleteCharacterPreset = (presetId) => {
    const next = characterPresets.filter((preset) => preset.id !== presetId);
    persistCharacterPresets(next);
    setError("");
    setMessage("Character preset removed.");
  };

  const handleCharacterFieldChange = (index, field, value) => {
    setGeneratedProject((current) => {
      if (!current) return current;
      const characters = [...(current.characters || [])];
      characters[index] = { ...characters[index], [field]: value };
      return { ...current, characters };
    });
    markSectionDirty("characters");
  };

  const handleCharacterLockToggle = (index) => {
    setGeneratedProject((current) => {
      if (!current) return current;
      const characters = [...(current.characters || [])];
      characters[index] = {
        ...characters[index],
        locked: characters[index]?.locked === false,
      };
      return { ...current, characters };
    });
    markSectionDirty("characters");
  };

  const handleAddCharacter = () => {
    setGeneratedProject((current) => {
      if (!current) return current;
      const nextCharacters = [...(current.characters || []), createDraftCharacter((current.characters || []).length)];
      return { ...current, characters: nextCharacters };
    });
    markSectionDirty("characters");
    setMessage("Character added. Update details and save.");
    setError("");
  };

  const handleRemoveCharacter = (index) => {
    setGeneratedProject((current) => {
      if (!current) return current;
      const characters = [...(current.characters || [])];
      if (characters.length <= 1) {
        return current;
      }
      characters.splice(index, 1);
      return { ...current, characters };
    });
    markSectionDirty("characters");
    setMessage("Character removed. Save character edits to persist.");
    setError("");
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
      aiProvider: sanitizeText(incomingProject.aiProvider || aiProvider).toLowerCase(),
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
    setAiProvider(sanitizeText(incomingProject.aiProvider || normalized.aiProvider || serviceCapabilities.defaultAiProvider || "huggingface").toLowerCase());
    setVideoUrl(normalizeMediaUrl(normalized.videoUrl || ""));
    setSubjectInput(incomingProject.subject || subjectInput);
    setDirtySections({
      script: false,
      characters: false,
      scenes: false,
      voice: false,
      music: false,
    });
    setError("");
    setMessage(successText);
  };

  const patchCurrentProject = async (partialPayload, successText = "Project updated.") => {
    if (!generatedProject?.projectId) {
      return;
    }

    const { payload } = await runCancelableRequest("patch-project", (signal) =>
      patchProject(generatedProject.projectId, partialPayload, { signal })
    );
    if (!payload.success || !payload.project) {
      throw new Error(payload.error || payload.message || "Failed to update project.");
    }
    applyProjectSnapshotToStudio(payload.project, successText);
  };

  const handleAutopilotGenerate = async () => {
    const cleanSubject = sanitizeText(subjectInput);
    if (!cleanSubject) {
      setError("Please enter any story subject, like space adventure, jungle mystery, or robot school.");
      setMessage("");
      return;
    }

    setIsAutopilotGenerating(true);
    setError("");
    setMessage("Generating full script, characters, scenes, animation plan, and voice map...");

    try {
      const { payload } = await runCancelableRequest("autopilot-create", (signal) =>
        createAutopilotProject(
          {
            subject: cleanSubject,
            languageId,
            styleId,
          voiceType,
          videoSizeId,
          storyMode,
            safeMode,
            ageFilter,
            sceneCount: generatedScenes.length || 5,
            aiProvider,
          },
          { signal }
        )
      );
      if (!payload.success || !payload.project) {
        throw new Error(payload.error || payload.message || "Autopilot generation failed.");
      }
      applyServiceCapabilities(payload);

      applyProjectSnapshotToStudio(payload.project, "Autopilot project generated. You can edit every stage.");
      setActiveTab("characters");
    } catch (err) {
      setError(formatSafetyError(err));
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
          ? "Listening... Say any story subject."
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

    const stageToDirtySection = {
      script: "script",
      characters: "characters",
      scenes: "scenes",
      voice: "voice",
      music: "music",
    };
    const dirtyKey = stageToDirtySection[stage];
    if (dirtyKey && dirtySections[dirtyKey]) {
      const confirmed = window.confirm(
        `You have unsaved ${dirtyKey} edits. Regenerating ${stage} will overwrite them. Continue?`
      );
      if (!confirmed) {
        setMessage("Regeneration cancelled to preserve unsaved edits.");
        setError("");
        return;
      }
    }

    setIsStageRegenerating(stage);
    setError("");
    setMessage(`Regenerating ${stage} stage...`);
    try {
      const { payload } = await runCancelableRequest(`regenerate-${stage}`, (signal) =>
        regenerateStage(
          generatedProject.projectId,
          stage,
          {
            subject: subjectInput,
            sceneCount: generatedScenes.length || 5,
          },
          { signal }
        )
      );
      if (!payload.success || !payload.project) {
        throw new Error(payload.error || payload.message || `Failed to regenerate ${stage}.`);
      }
      applyProjectSnapshotToStudio(payload.project, `${stage} stage regenerated.`);
    } catch (err) {
      setError(formatSafetyError(err));
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

    const localSafety = getSafetyFailure(storyContent);
    if (safeMode && localSafety.blocked) {
      const reasons = localSafety.reasons.map((item) => item.reason).join(", ");
      setError(`Safe mode blocked this prompt due to: ${reasons}.`);
      setMessage("");
      return;
    }

    setError("");
    setMessage("Creating your AI storyboard and animation pipeline...");
    setIsGenerating(true);

    try {
      const { payload, response } = await runCancelableRequest("create-project", (signal) =>
        createProject(
          {
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
            aiProvider,
          },
          { signal }
        )
      );
      if (!payload.success || !payload.project) {
        throw new Error(payload.error || payload.message || "AI pipeline generation failed.");
      }
      applyServiceCapabilities(payload);
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
        setError(formatSafetyError(err));
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
        aiProvider,
      });

      setGeneratedProject(fallbackProject);
      setGeneratedScenes(fallbackProject.scenes || []);
      setStoryTitle(fallbackProject.title || safeTitle);
      setVideoUrl("");
      setDirtySections({
        script: false,
        characters: false,
        scenes: false,
        voice: false,
        music: false,
      });
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
    markSectionDirty("scenes");
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
    markSectionDirty("scenes");
    setMessage("Scene order updated. Save scene edits to persist.");
    setError("");
  };

  const handleAddScene = () => {
    const nextScenes = [...generatedScenes, createDraftScene(generatedScenes.length)].map((scene, index) => ({
      ...scene,
      id: index + 1,
    }));
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
    markSectionDirty("scenes");
    setMessage("Scene added. Edit it and save scene edits.");
    setError("");
  };

  const handleDuplicateScene = (sceneId) => {
    const sourceIndex = generatedScenes.findIndex((scene, index) => getSceneId(scene, index) === String(sceneId));
    if (sourceIndex < 0) {
      return;
    }
    const sourceScene = generatedScenes[sourceIndex];
    const duplicated = {
      ...sourceScene,
      title: `${sourceScene.title || `Scene ${sourceIndex + 1}`} Copy`,
    };
    const nextScenes = [...generatedScenes];
    nextScenes.splice(sourceIndex + 1, 0, duplicated);
    const normalized = nextScenes.map((scene, index) => ({ ...scene, id: index + 1 }));
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
    markSectionDirty("scenes");
    setMessage("Scene duplicated. Customize dialogue and details, then save.");
    setError("");
  };

  const handleRemoveScene = (sceneId) => {
    if (generatedScenes.length <= 1) {
      return;
    }
    const filtered = generatedScenes.filter((scene, index) => getSceneId(scene, index) !== String(sceneId));
    const normalized = filtered.map((scene, index) => ({ ...scene, id: index + 1 }));
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
    markSectionDirty("scenes");
    setMessage("Scene removed. Save scene edits to persist.");
    setError("");
  };

  const handleRegenerateSingleScene = async (sceneId) => {
    if (!generatedProject?.projectId) {
      setError("Generate a project first.");
      return;
    }
    const targetScene = generatedScenes.find((scene, index) => getSceneId(scene, index) === String(sceneId));
    setIsRegeneratingSceneId(String(sceneId));
    setError("");
    setMessage(`Regenerating Scene ${sceneId}...`);
    try {
      const { payload } = await runCancelableRequest(`regenerate-scene-${sceneId}`, (signal) =>
        regenerateScene(
          generatedProject.projectId,
          sceneId,
          {
            direction: sanitizeText(
              `${targetScene?.title || ""}. ${targetScene?.description || ""}`.trim()
            ),
          },
          { signal }
        )
      );
      if (!payload.success || !payload.project) {
        throw new Error(payload.error || payload.message || "Failed to regenerate scene.");
      }
      applyServiceCapabilities(payload);
      applyProjectSnapshotToStudio(payload.project, `Scene ${sceneId} regenerated.`);
      setActiveTab("scenes");
    } catch (err) {
      setError(formatSafetyError(err));
    } finally {
      setIsRegeneratingSceneId("");
    }
  };

  const handleRegenerateSingleDialogue = async (sceneId) => {
    if (!generatedProject?.projectId) {
      setError("Generate a project first.");
      return;
    }
    const targetScene = generatedScenes.find((scene, index) => getSceneId(scene, index) === String(sceneId));
    setIsRegeneratingDialogueId(String(sceneId));
    setError("");
    setMessage(`Regenerating dialogue for Scene ${sceneId}...`);
    try {
      const { payload } = await runCancelableRequest(`regenerate-dialogue-${sceneId}`, (signal) =>
        regenerateSceneDialogue(
          generatedProject.projectId,
          sceneId,
          {
            direction: sanitizeText(targetScene?.description || targetScene?.title || ""),
          },
          { signal }
        )
      );
      if (!payload.success || !payload.project) {
        throw new Error(payload.error || payload.message || "Failed to regenerate dialogue.");
      }
      applyServiceCapabilities(payload);
      applyProjectSnapshotToStudio(payload.project, `Scene ${sceneId} dialogue regenerated.`);
      setActiveTab("scenes");
    } catch (err) {
      setError(formatSafetyError(err));
    } finally {
      setIsRegeneratingDialogueId("");
    }
  };

  const handleRenderVideo = async () => {
    const normalizedStoryPrompt = sanitizeText(storyText);
    if (!normalizedStoryPrompt) {
      setError("Story text is missing. Please add a story before rendering.");
      return;
    }

    const useCleanHfPipeline = aiProvider === "huggingface";
    if (!generatedProject && !useCleanHfPipeline) {
      setError("Generate the project before rendering.");
      return;
    }

    if (useCleanHfPipeline) {
      const fallbackSceneCount = Math.max(
        3,
        Math.min(8, Number(normalizeScenesForRender(generatedScenes).length || 5))
      );

      setError("");
      setMessage("Rendering with Hugging Face clean pipeline (fresh scenes + character visuals)...");
      setIsRendering(true);
      startRenderProgress();

      try {
        const { payload, response } = await runCancelableRequest("render-video", (signal) =>
          renderPromptVideoHf(
            {
              prompt: normalizedStoryPrompt,
              storyPrompt: normalizedStoryPrompt,
              storyTitle: sanitizeText(storyTitle || generatedProject?.title || "AI Kids Story Video Generator"),
              sceneCount: fallbackSceneCount,
              videoSize: videoSizeId,
              videoSizeId,
              storyMode,
              voiceType,
            },
            { signal }
          )
        );

        applyServiceCapabilities(payload);
        const serviceOrigin = (() => {
          try {
            return new URL(response.url).origin;
          } catch (_error) {
            return "";
          }
        })();

        const normalizedVideoUrl = normalizeMediaUrl(payload.videoUrl, serviceOrigin);
        const returnedProject = payload?.project && typeof payload.project === "object" ? payload.project : null;
        const nextScenes = Array.isArray(returnedProject?.scenes) ? returnedProject.scenes : [];

        const nextProject = {
          ...(generatedProject || {}),
          ...(returnedProject || {}),
          projectId:
            payload.projectId ||
            returnedProject?.projectId ||
            generatedProject?.projectId ||
            `hf-${Date.now()}`,
          title: sanitizeText(storyTitle || returnedProject?.title || generatedProject?.title || "AI Kids Story Video Generator"),
          storyPrompt: normalizedStoryPrompt,
          aiProvider: "huggingface",
          renderedAt: new Date().toISOString(),
          videoUrl: normalizedVideoUrl,
        };

        if (nextScenes.length) {
          setGeneratedScenes(nextScenes);
        }
        setGeneratedProject(nextProject);
        setVideoUrl(normalizedVideoUrl);
        setRenderProgress(100);
        setRenderProgressLabel("Render complete.");
        setMessage(
          payload.aiImagesEnabled
            ? "Hugging Face render complete with regenerated scenes and AI visuals."
            : "Render complete using fallback visuals. Add HF API key for stronger character images."
        );
        setActiveTab("export");
      } catch (err) {
        setError(formatSafetyError(err));
      } finally {
        stopRenderProgress();
        setIsRendering(false);
      }
      return;
    }

    const normalizedScenes = normalizeScenesForRender(generatedScenes);
    const sceneValidationError = validateScenesForRender(normalizedScenes);
    if (sceneValidationError) {
      setError(sceneValidationError);
      return;
    }

    const renderPayload = buildCartoonRenderPayload({
      project: generatedProject,
      scenes: normalizedScenes,
      storyTitle,
      storyPrompt: normalizedStoryPrompt,
      languageId,
      styleId,
      voiceType,
      videoSizeId,
      storyMode,
      ageFilter,
      safeMode,
      premiumHD,
      aiProvider,
    });

    setError("");
    setMessage(
      "Rendering real cartoon characters with spoken dialogue, scene visuals, music, and subtitles..."
    );
    setIsRendering(true);
    startRenderProgress();

    try {
      const { payload, response } = await runCancelableRequest("render-video", (signal) =>
        renderProject({ project: renderPayload, premiumHD }, { signal })
      );
      if (!payload.success) {
        throw new Error(payload.error || payload.message || "Video render failed.");
      }
      applyServiceCapabilities(payload);
      const serviceOrigin = (() => {
        try {
          return new URL(response.url).origin;
        } catch (_error) {
          return "";
        }
      })();

      const nextProject = {
        ...renderPayload,
        renderedAt: new Date().toISOString(),
        videoUrl: normalizeMediaUrl(payload.videoUrl, serviceOrigin),
      };

      setGeneratedProject(nextProject);
      setVideoUrl(nextProject.videoUrl);
      setRenderProgress(100);
      setRenderProgressLabel("Render complete.");
      setMessage(
        payload.aiProviderEnabled
          ? "Video rendered successfully with AI character visuals and voice. Preview and export your MP4."
          : "Video rendered successfully. AI providers are disabled, so quality may use fallback visuals/audio."
      );
      setActiveTab("export");
    } catch (err) {
      const canRecover = shouldAttemptRenderRecovery(err) && Boolean(generatedProject?.projectId);

      if (canRecover) {
        try {
          setRenderProgress((current) => Math.max(current, 85));
          setRenderProgressLabel("Render processing on server. Checking video status...");
          setMessage("Render request finished without response. Checking video availability...");

          const { payload } = await runCancelableRequest("render-download-poll", (signal) =>
            waitForRenderedVideo(generatedProject.projectId, {
              signal,
              maxAttempts: 24,
              intervalMs: 5000,
              timeoutMs: 20000,
              previousVideoUrl: generatedProject.videoUrl || videoUrl || "",
            })
          );

          const recoveredVideoUrl = normalizeMediaUrl(payload.downloadUrl || payload.videoUrl || "");
          if (!recoveredVideoUrl) {
            throw new Error("Rendered video is not available yet. Please retry in a minute.");
          }

          const nextProject = {
            ...renderPayload,
            renderedAt: new Date().toISOString(),
            videoUrl: recoveredVideoUrl,
          };

          setGeneratedProject(nextProject);
          setVideoUrl(nextProject.videoUrl);
          setRenderProgress(100);
          setRenderProgressLabel("Render complete.");
          setError("");
          setMessage("Video rendered successfully. Preview and export your MP4.");
          setActiveTab("export");
          return;
        } catch (recoveryError) {
          setError(formatSafetyError(recoveryError));
        }
      } else {
        setError(formatSafetyError(err));
      }
    } finally {
      stopRenderProgress();
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

    const applyVoiceAndSpeak = () => {
      const voices = speech.getVoices();
      const voice = voices.find((item) =>
        item.lang.toLowerCase().startsWith(utterance.lang.toLowerCase())
      );
      if (voice) {
        utterance.voice = voice;
      }
      speech.speak(utterance);
    };

    if (!voiceCatalogReadyRef.current && speech.getVoices().length === 0) {
      setTimeout(() => {
        applyVoiceAndSpeak();
      }, 120);
      return;
    }

    applyVoiceAndSpeak();
  };

  const handleStopNarration = () => {
    if (!window.speechSynthesis) {
      return;
    }
    window.speechSynthesis.cancel();
    setIsNarrating(false);
    setMessage("Narration stopped.");
    setError("");
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
    markSectionDirty("voice");
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
    markSectionDirty("music");
  };

  const handleDownloadVideo = async () => {
    if (!videoUrl) {
      setError("Render the video first to download it.");
      return;
    }

    const baseTitle = sanitizeText(generatedProject?.title || storyTitle || "kids_story_video")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();

    const triggerDownload = (url) => {
      const link = document.createElement("a");
      link.href = url;
      link.download = `${baseTitle || "kids_story_video"}.mp4`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    };

    try {
      triggerDownload(videoUrl);
      setMessage("Download started. Your MP4 is ready.");
      setError("");
    } catch (_error) {
      if (!generatedProject?.projectId) {
        setError("Download failed. Please try again.");
        return;
      }

      try {
        const { payload } = await runCancelableRequest("download-link", (signal) =>
          getProjectDownloadLink(generatedProject.projectId, { signal })
        );
        const resolvedUrl = normalizeMediaUrl(payload?.downloadUrl || payload?.videoUrl || "");
        if (!resolvedUrl) {
          throw new Error("No download URL is available for this project.");
        }
        triggerDownload(resolvedUrl);
        setMessage("Download started using fallback URL.");
        setError("");
      } catch (innerError) {
        setError(innerError?.message || "Unable to download this video right now.");
      }
    }
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
    setMessage("Project saved locally in My Projects. Use Save stage edits to persist to server.");
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
          { id: "dashboard", label: t("kidsstory.tabs.dashboard", { defaultValue: "Dashboard" }) },
          { id: "create", label: t("kidsstory.tabs.create", { defaultValue: "Create" }) },
          { id: "characters", label: t("kidsstory.tabs.characters", { defaultValue: "Characters" }) },
          { id: "scenes", label: t("kidsstory.tabs.scenes", { defaultValue: "Scenes" }) },
          { id: "audio", label: t("kidsstory.tabs.audio", { defaultValue: "Audio" }) },
          { id: "export", label: t("kidsstory.tabs.export", { defaultValue: "Export" }) },
          { id: "myprojects", label: t("kidsstory.tabs.myProjects", { defaultValue: "My Projects" }) },
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

      {hasUnsavedEdits && (
        <div className="save-state-banner" role="status" aria-live="polite">
          You have unsaved edits in this project. Save stage edits to persist to server before regeneration.
        </div>
      )}

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
            {generatedProject && (
              <small>
                Render quality mode:{" "}
                {serviceCapabilities.aiProviderEnabled && serviceCapabilities.realCartoonModeEnabled
                  ? "Real AI cartoon + voice"
                  : "Fallback mode (AI provider off)"}
              </small>
            )}
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

        <main className="studio-main" ref={mainContentRef}>
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
                placeholder="Example: Space explorer and moon dragon"
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
                      markSectionDirty("script");
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
                      markSectionDirty("script");
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
                          clearSectionDirty("script");
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
                    <div>
                      <label>AI image provider</label>
                      <select value={aiProvider} onChange={(event) => setAiProvider(event.target.value)}>
                        {AI_PROVIDER_OPTIONS.map((option) => (
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
                      clearSectionDirty("characters");
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
                <button className="secondary-button" onClick={handleAddCharacter} disabled={!generatedProject}>
                  Add Character
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
                <CharacterCards
                  characters={generatedProject.characters || []}
                  voiceType={voiceType}
                  onCharacterChange={handleCharacterFieldChange}
                  onCharacterToggleLock={handleCharacterLockToggle}
                  onCharacterRemove={handleRemoveCharacter}
                />
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
                      clearSectionDirty("scenes");
                    } catch (err) {
                      setError(err.message || "Unable to save scenes.");
                    }
                  }}
                  disabled={!generatedProject?.projectId}
                >
                  Save Scene Edits
                </button>
                <button className="secondary-button" onClick={handleAddScene} disabled={!generatedProject}>
                  Add Scene
                </button>
              </div>
              <div className="preview-grid">
                <SceneCards
                  scenes={generatedScenes}
                  getSceneId={getSceneId}
                  onMoveScene={handleMoveScene}
                  onFieldChange={handleSceneFieldChange}
                  onDurationChange={handleSceneDurationChange}
                  onDuplicateScene={handleDuplicateScene}
                  onRemoveScene={handleRemoveScene}
                  onRegenerateScene={handleRegenerateSingleScene}
                  onRegenerateDialogue={handleRegenerateSingleDialogue}
                  isRegeneratingSceneId={isRegeneratingSceneId}
                  isRegeneratingDialogueId={isRegeneratingDialogueId}
                />
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
              {generatedProject?.voicePlan && (
                <div className="advanced-panel">
                  <h3>Voice Plan</h3>
                  <label>Narrator voice</label>
                  <input
                    type="text"
                    value={generatedProject.voicePlan?.narrator?.voice || ""}
                    onChange={(event) => handleVoicePlanFieldChange("voice", event.target.value)}
                  />
                  <label>Narrator language</label>
                  <input
                    type="text"
                    value={generatedProject.voicePlan?.narrator?.language || ""}
                    onChange={(event) => handleVoicePlanFieldChange("language", event.target.value)}
                  />
                  <label>Narrator text</label>
                  <textarea
                    rows={3}
                    value={generatedProject.voicePlan?.narrator?.text || ""}
                    onChange={(event) => handleVoicePlanFieldChange("text", event.target.value)}
                  />
                  <button
                    className="secondary-button"
                    onClick={async () => {
                      try {
                        await patchCurrentProject({ voicePlan: generatedProject.voicePlan }, "Voice plan saved.");
                        clearSectionDirty("voice");
                      } catch (err) {
                        setError(formatSafetyError(err));
                      }
                    }}
                    disabled={!generatedProject?.projectId}
                  >
                    Save Voice Plan
                  </button>
                </div>
              )}
              {generatedProject?.musicPlan && (
                <div className="advanced-panel">
                  <h3>Music + SFX Plan</h3>
                  <label>Background track</label>
                  <input
                    type="text"
                    value={generatedProject.musicPlan?.backgroundTrack || ""}
                    onChange={(event) => handleMusicPlanFieldChange("backgroundTrack", event.target.value)}
                  />
                  <label>Mix style</label>
                  <input
                    type="text"
                    value={generatedProject.musicPlan?.mixStyle || ""}
                    onChange={(event) => handleMusicPlanFieldChange("mixStyle", event.target.value)}
                  />
                  <label>Sound effects (comma separated)</label>
                  <input
                    type="text"
                    value={Array.isArray(generatedProject.musicPlan?.sfx) ? generatedProject.musicPlan.sfx.join(", ") : ""}
                    onChange={(event) => handleMusicPlanFieldChange("sfx", event.target.value)}
                  />
                  <button
                    className="secondary-button"
                    onClick={async () => {
                      try {
                        await patchCurrentProject({ musicPlan: generatedProject.musicPlan }, "Music plan saved.");
                        clearSectionDirty("music");
                      } catch (err) {
                        setError(formatSafetyError(err));
                      }
                    }}
                    disabled={!generatedProject?.projectId}
                  >
                    Save Music Plan
                  </button>
                </div>
              )}
              <div className="narration-summary-card">
                <h3>Narration script</h3>
                <p>{generatedProject?.narration || "Narration appears after generating the pipeline."}</p>
              </div>
              <div className="audio-actions">
                <button className="secondary-button" onClick={handlePlayNarration} disabled={!generatedProject}>
                  {isNarrating ? "Playing narration..." : "Listen to narration"}
                </button>
                <button className="secondary-button" onClick={handleStopNarration} disabled={!isNarrating}>
                  Stop narration
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
                  <p><strong>AI provider:</strong> {aiProvider}</p>
                  <p><strong>Premium HD:</strong> {premiumHD ? "On" : "Off"}</p>
                </div>
              </div>

              <div className="timeline-grid">
                <TimelineCards scenes={generatedScenes} getSceneId={getSceneId} />
              </div>

              <div className="project-actions export-actions">
                <button
                  className="primary-button"
                  onClick={handleRenderVideo}
                  disabled={(!generatedProject && aiProvider !== "huggingface") || isRendering}
                >
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

              {(isRendering || renderProgress > 0) && (
                <div className="render-progress-card" aria-live="polite">
                  <div className="render-progress-head">
                    <strong>Render progress</strong>
                    <span>{Math.min(100, Math.max(0, Math.round(renderProgress)))}%</span>
                  </div>
                  <div className="render-progress-track">
                    <div className="render-progress-fill" style={{ width: `${Math.min(100, Math.max(0, renderProgress))}%` }} />
                  </div>
                  <p>{renderProgressLabel || (isRendering ? "Rendering your video..." : "Ready")}</p>
                </div>
              )}
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
