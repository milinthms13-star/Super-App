const sanitizeText = (value = "") => String(value ?? "").replace(/\u0000/g, "").trim();

const normalizeScene = (scene, index) => ({
  id: Number(scene?.id) || index + 1,
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

const normalizeProject = (project = {}) => {
  const scenes = Array.isArray(project?.scenes) ? project.scenes.map(normalizeScene) : [];
  return {
    ...project,
    projectId: sanitizeText(project?.projectId || ""),
    title: sanitizeText(project?.title || project?.storyTitle || "AI Kids Story Video Generator"),
    storyTitle: sanitizeText(project?.storyTitle || project?.title || "AI Kids Story Video Generator"),
    storyPrompt: sanitizeText(project?.storyPrompt || ""),
    narration: sanitizeText(project?.narration || ""),
    language: sanitizeText(project?.language || "english"),
    style: sanitizeText(project?.style || "cartoon"),
    voiceType: sanitizeText(project?.voiceType || "kid-female"),
    videoSize: sanitizeText(project?.videoSize || "youtube"),
    storyMode: sanitizeText(project?.storyMode || "bedtime"),
    safeMode: project?.safeMode !== false,
    premiumExport: Boolean(project?.premiumExport),
    scenes,
    characters: Array.isArray(project?.characters) ? project.characters : [],
    subtitles: Array.isArray(project?.subtitles) ? project.subtitles : [],
    promptHints: Array.isArray(project?.promptHints) ? project.promptHints : [],
    editCapabilities: Array.isArray(project?.editCapabilities) ? project.editCapabilities : [],
  };
};

const assertProjectShape = (project, context = "project") => {
  const normalized = normalizeProject(project);
  if (!normalized.projectId) {
    throw new Error(`Invalid ${context}: missing projectId.`);
  }
  if (!normalized.title) {
    throw new Error(`Invalid ${context}: missing title.`);
  }
  if (!Array.isArray(normalized.scenes) || normalized.scenes.length === 0) {
    throw new Error(`Invalid ${context}: scenes are required.`);
  }
  return normalized;
};

const assertPayloadSuccess = (payload, context = "response") => {
  if (!payload || typeof payload !== "object") {
    throw new Error(`Invalid ${context}: expected JSON object.`);
  }
  if (!payload.success) {
    throw new Error(payload?.error || payload?.message || `Invalid ${context}: success=false.`);
  }
  return payload;
};

const assertRenderResponse = (payload) => {
  assertPayloadSuccess(payload, "render response");
  if (!sanitizeText(payload?.videoUrl)) {
    throw new Error("Invalid render response: missing videoUrl.");
  }
  return payload;
};

export {
  assertPayloadSuccess,
  assertProjectShape,
  assertRenderResponse,
  normalizeProject,
};
