import React, { useEffect, useMemo, useState } from "react";
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

const DEFAULT_STORY_PROMPT =
  "A curious child discovers a glowing map in the attic and sets off on a magical journey to make new friends.";

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

const getStyleDescription = (styleId) => {
  const style = STYLE_OPTIONS.find((item) => item.id === styleId);
  return style ? style.description : "An expressive animation style for kids.";
};

const getModeDescription = (modeId) => {
  const mode = STORY_MODES.find((item) => item.id === modeId);
  return mode ? `${mode.label} stories with age-appropriate pacing and tone.` : "A kid-safe story mode.";
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

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const handleUploadStory = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setUploadedText(text);
    setMessage(`Uploaded story file: ${file.name}`);
    setError("");
  };

  const parseApiResponse = async (response) => {
    const text = await response.text();
    if (!text) {
      throw new Error(`Server returned empty response (${response.status})`);
    }
    try {
      return JSON.parse(text);
    } catch (parseError) {
      throw new Error(`Invalid JSON response from server: ${text}`);
    }
  };

  const handleGenerateProject = async () => {
    const storyContent = storyText.trim();
    if (!storyContent) {
      setError("Please provide a story before generating.");
      setMessage("");
      return;
    }

    setError("");
    setMessage("Creating your AI storyboard and animation pipeline...");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/video-studio/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      if (!payload.success) {
        throw new Error(payload.error || payload.message || "AI pipeline generation failed.");
      }
      const project = payload.project;
      setGeneratedProject(project);
      setGeneratedScenes(project.scenes || []);
      setStoryTitle(project.title || "AI Kids Story Video Generator");
      setMessage("AI project generated. Review scenes and render your video.");
      setActiveTab("scenes");
    } catch (err) {
      setError(err.message || "Unable to generate the AI story project.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRenderVideo = async () => {
    if (!generatedProject) {
      setError("Generate the project before rendering.");
      return;
    }

    setError("");
    setMessage("Rendering your MP4 with AI visuals and subtitles...");
    setIsRendering(true);

    try {
      const response = await fetch("/api/video-studio/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: generatedProject, premiumHD: false }),
      });
      const payload = await parseApiResponse(response);
      if (!payload.success) {
        throw new Error(payload.error || payload.message || "Video render failed.");
      }
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
    if (voice) utterance.voice = voice;
    speech.speak(utterance);
  };

  const handleDownloadVideo = () => {
    if (!videoUrl) {
      setError("Render the video first to download it.");
      return;
    }

    const link = document.createElement("a");
    link.href = videoUrl;
    link.download = `${generatedProject.title.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "kids_story_video"}.mp4`;
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

    const projectKey = `kids-story-video-project-${Date.now()}`;
    window.localStorage.setItem(projectKey, JSON.stringify(generatedProject));
    setMessage("Project saved locally for later editing.");
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

  const creditsUsed = generatedScenes.length ? generatedScenes.length * 5 : 20;

  return (
    <div className="kids-story-video-maker page-shell">
      <section className="kids-story-hero">
        <div className="kids-story-hero-copy">
          <p className="kids-story-badge">AI Kids Animation Studio</p>
          <h1>Paste a story. Choose language. Create a cartoon video.</h1>
          <p>Fast auto mode with parser, storyboard, voice, subtitles, and MP4 export for kid-safe animation.</p>
          <div className="hero-badges">
            <span>Bedtime mode</span>
            <span>Safe mode</span>
            <span>Premium export</span>
          </div>
        </div>
        <div className="studio-hero-panel">
          <div className="studio-status-card">
            <h2>Studio pipeline</h2>
            <p>AI story parser, prompt generator, image/animation engine, and video renderer in one workflow.</p>
            <ul>
              <li>Step 1: Story analysis → scenes, emotions, camera moves</li>
              <li>Step 2: Prompt creation → image, animation, background</li>
              <li>Step 3: Render MP4 with subtitles</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="studio-tabs">
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'create', label: 'Create' },
          { id: 'characters', label: 'Characters' },
          { id: 'scenes', label: 'Scenes' },
          { id: 'audio', label: 'Audio' },
          { id: 'export', label: 'Export' },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`studio-tab ${activeTab === tab.id ? 'active' : ''}`}
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
              <button className={`pill-toggle ${safeMode ? 'on' : 'off'}`} onClick={() => setSafeMode((prev) => !prev)}>
                {safeMode ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            <div className="studio-stats-card">
              <p>Estimated credits</p>
              <strong>{creditsUsed}</strong>
            </div>
          </div>

          <div className="studio-card features-card">
            <h3>Superapp features</h3>
            <ul>
              <li>Free preview with watermark</li>
              <li>Premium HD export</li>
              <li>Voice packs & music templates</li>
              <li>Upload story or paste text</li>
            </ul>
          </div>
        </aside>

        <main className="studio-main">
          {activeTab === 'dashboard' && (
            <div className="studio-card dashboard-card">
              <h2>Dashboard</h2>
              <p>Track your current animation studio project, mode, and export readiness.</p>
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
                  <span>Mode</span>
                  <strong>{storyMode}</strong>
                </div>
              </div>
              {generatedProject && (
                <div className="dashboard-welcome">
                  <h3>{generatedProject.title}</h3>
                  <p>{generatedProject.storyPrompt.slice(0, 120)}{generatedProject.storyPrompt.length > 120 ? '...' : ''}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <div className="studio-card create-card">
              <h2>Create</h2>
              <p>Paste your story or upload a text file. The AI pipeline builds scenes, dialogue, and prompts automatically.</p>
              <div className="story-source-row">
                <label>
                  <input
                    type="radio"
                    name="storySource"
                    value="paste"
                    checked={storySource === 'paste'}
                    onChange={() => setStorySource('paste')}
                  />
                  Paste story
                </label>
                <label>
                  <input
                    type="radio"
                    name="storySource"
                    value="upload"
                    checked={storySource === 'upload'}
                    onChange={() => setStorySource('upload')}
                  />
                  Upload .txt
                </label>
              </div>

              {storySource === 'upload' && (
                <div className="upload-control">
                  <input type="file" accept=".txt" onChange={handleUploadStory} />
                  {uploadedText && <p className="upload-hint">Uploaded story length: {uploadedText.length} chars</p>}
                </div>
              )}

              <label htmlFor="storyPrompt">Story text</label>
              <textarea
                id="storyPrompt"
                rows={10}
                value={storySource === 'upload' ? uploadedText || storyPrompt : storyPrompt}
                onChange={(event) => {
                  setStoryPrompt(event.target.value);
                  if (storySource === 'upload') {
                    setUploadedText(event.target.value);
                  }
                }}
                placeholder={DEFAULT_STORY_PROMPT}
              />

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
                  {isGenerating ? 'Building AI storyboard…' : 'Generate Story Pipeline'}
                </button>
                <button className="secondary-button" onClick={handlePlayNarration} disabled={!generatedProject || isNarrating}>
                  {isNarrating ? 'Playing narration…' : 'Preview narration'}
                </button>
              </div>

              <button className="secondary-button advanced-toggle" onClick={handleToggleAdvanced}>
                {advancedOpen ? 'Hide Advanced Creator Studio' : 'Show Advanced Creator Studio'}
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

          {activeTab === 'characters' && (
            <div className="studio-card characters-card">
              <h2>Characters</h2>
              <p>AI character consistency keeps the same face, costume, color palette, and voice across scenes.</p>
              {generatedProject ? (
                <div className="character-grid">
                  {generatedProject.characters?.map((character, index) => (
                    <div key={index} className="character-card">
                      <div className="character-avatar">{character.name?.charAt(0) || 'C'}</div>
                      <div className="character-details">
                        <strong>{character.name}</strong>
                        <span>{character.role}</span>
                        <span>{character.voiceProfile || voiceType}</span>
                      </div>
                      <p>{character.appearance || 'Child-safe design and consistent visual personality.'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Generate the story pipeline to preview your AI characters.</p>
              )}
            </div>
          )}

          {activeTab === 'scenes' && (
            <div className="studio-card scenes-card">
              <h2>Scenes</h2>
              <p>Review the parsed storyboard with camera action, emotions, and scene beats.</p>
              <div className="preview-grid">
                {generatedScenes.length ? (
                  generatedScenes.map((scene) => (
                    <article key={scene.id} className="scene-card">
                      <div className="scene-title-row">
                        <span className="scene-number">Scene {scene.id}</span>
                        <span className="scene-emotion">{scene.emotion || 'gentle'}</span>
                      </div>
                      <h3>{scene.title}</h3>
                      <p>{scene.description || scene.summary}</p>
                      <div className="scene-meta">Camera: {scene.cameraActions || 'soft pan'}</div>
                      <div className="scene-meta">Dialogue: {scene.dialogue || 'Narration-driven moment'}</div>
                    </article>
                  ))
                ) : (
                  <p>No scenes yet. Use Create to build your video pipeline.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'audio' && (
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
                <p>{generatedProject?.narration || 'Narration appears after generating the pipeline.'}</p>
              </div>
              <button className="secondary-button" onClick={handlePlayNarration} disabled={!generatedProject}>
                {isNarrating ? 'Playing narration…' : 'Listen to narration'}
              </button>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="studio-card export-card">
              <h2>Export</h2>
              <p>Render MP4, preview the timeline, and create a shareable video output.</p>
              <div className="video-preview-card">
                <div className="video-preview-player">
                  {videoUrl ? (
                    <video controls src={videoUrl} className="story-video-player" />
                  ) : (
                    <div className="video-preview-poster">
                      <span>{isRendering ? 'Rendering your video…' : 'Render to preview the final MP4'}</span>
                    </div>
                  )}
                </div>
                <div className="video-preview-meta">
                  <p><strong>Title:</strong> {generatedProject?.title || 'Not generated yet'}</p>
                  <p><strong>Language:</strong> {languageLabel}</p>
                  <p><strong>Style:</strong> {styleLabel}</p>
                  <p><strong>Video size:</strong> {videoSizeLabel}</p>
                  <p><strong>Mode:</strong> {storyMode}</p>
                  <p><strong>Safe mode:</strong> {safeMode ? 'On' : 'Off'}</p>
                </div>
              </div>
              <div className="timeline-grid">
                {generatedScenes.length ? generatedScenes.map((scene) => (
                  <div key={scene.id} className="timeline-card">
                    <div className="timeline-number">{scene.id}</div>
                    <div>
                      <strong>{scene.title}</strong>
                      <p>{scene.description || scene.summary}</p>
                    </div>
                  </div>
                )) : <p>Create the project to build your scene timeline.</p>}
              </div>
              <div className="project-actions export-actions">
                <button className="primary-button" onClick={handleRenderVideo} disabled={!generatedProject || isRendering}>
                  {isRendering ? 'Rendering video…' : 'Render MP4'}
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

          {error && activeTab !== 'create' && <div className="message error">{error}</div>}
          {message && activeTab !== 'create' && !error && <div className="message success">{message}</div>}
        </main>
      </div>
    </div>
  );
};

export default KidsStoryVideoMaker;
