import React, { useEffect, useMemo, useState } from "react";
import { buildApiUrl } from "../../utils/api";
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

const LOCAL_PROJECT_LIBRARY_KEY = "kids-story-video-project-library-v1";
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
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [projectLibrary, setProjectLibrary] = useState([]);

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
    try {
      const parsed = JSON.parse(window.localStorage.getItem(LOCAL_PROJECT_LIBRARY_KEY) || "[]");
      setProjectLibrary(Array.isArray(parsed) ? parsed : []);
    } catch (_error) {
      setProjectLibrary([]);
    }
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const persistProjectLibrary = (items) => {
    setProjectLibrary(items);
    window.localStorage.setItem(LOCAL_PROJECT_LIBRARY_KEY, JSON.stringify(items));
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

      const project = normalizeProjectForLocal(payload.project, {
        title: safeTitle,
        storyPrompt: storyContent,
        storySource,
      });

      setGeneratedProject(project);
      setGeneratedScenes(project.scenes || []);
      setStoryTitle(project.title || safeTitle);
      setVideoUrl(project.videoUrl || "");
      setMessage("AI project generated. Review scenes and render your video.");
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
    setGeneratedProject((current) => (current ? { ...current, scenes: nextScenes } : current));
  };

  const handleRenderVideo = async () => {
    if (!generatedProject) {
      setError("Generate the project before rendering.");
      return;
    }

    const renderProject = {
      ...generatedProject,
      title: sanitizeText(storyTitle || generatedProject.title || "AI Kids Story Video Generator"),
      storyPrompt: sanitizeText(storyText),
      scenes: generatedScenes,
      premiumExport: premiumHD,
      safeMode,
      style: styleId,
      videoSize: videoSizeId,
      language: languageId,
      voiceType,
      storyMode,
      ageFilter,
    };

    if (!Array.isArray(renderProject.scenes) || renderProject.scenes.length === 0) {
      setError("Please generate at least one scene before rendering.");
      return;
    }

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

      const nextProject = {
        ...renderProject,
        renderedAt: new Date().toISOString(),
        videoUrl: payload.videoUrl,
      };

      setGeneratedProject(nextProject);
      setVideoUrl(payload.videoUrl);
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

    const nextItems = [
      snapshot,
      ...projectLibrary.filter((item) => item.projectId !== snapshot.projectId),
    ].slice(0, 30);

    persistProjectLibrary(nextItems);
    setMessage("Project saved in My Projects.");
    setError("");
    setActiveTab("myprojects");
  };

  const handleLoadProject = (project) => {
    const snapshot = normalizeProjectForLocal(project);

    setGeneratedProject(snapshot);
    setGeneratedScenes(snapshot.scenes || []);
    setStoryTitle(snapshot.title || "AI Kids Story Video Generator");
    setStoryPrompt(snapshot.storyPrompt || "");
    setUploadedText(snapshot.storySource === "upload" ? snapshot.storyPrompt || "" : "");
    setStorySource(snapshot.storySource || "paste");
    setLanguageId(snapshot.language || LANGUAGE_OPTIONS[0].id);
    setStyleId(snapshot.style || STYLE_OPTIONS[0].id);
    setVideoSizeId(snapshot.videoSize || VIDEO_SIZE_OPTIONS[0].id);
    setVoiceType(snapshot.voiceType || VOICE_OPTIONS[0].id);
    setStoryMode(snapshot.storyMode || STORY_MODES[0].id);
    setAgeFilter(snapshot.ageFilter || AGE_FILTERS[1].id);
    setSafeMode(typeof snapshot.safeMode === "boolean" ? snapshot.safeMode : true);
    setPremiumHD(Boolean(snapshot.premiumExport));
    setVideoUrl(snapshot.videoUrl || "");

    setError("");
    setMessage(`Loaded project: ${snapshot.title}`);
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
                      <p>{character.appearance || "Child-safe design and consistent visual personality."}</p>
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
                <button className="download-button" onClick={handleDownloadVideo} disabled={!videoUrl}>
                  Download MP4
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
