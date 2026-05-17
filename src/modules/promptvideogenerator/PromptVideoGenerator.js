import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../utils/api";
import "./PromptVideoGenerator.css";

const DEFAULT_CHARACTER = {
  name: "",
  role: "",
  appearance: "",
  voiceProfile: "kid-female",
};

const VOICE_OPTIONS = [
  "kid-female",
  "kid-male",
  "soft-female",
  "warm-male",
  "magic-robot",
];

const STYLE_OPTIONS = [
  { id: "real-cinematic", label: "Real Feel Cinematic" },
  { id: "cartoon", label: "Cartoon" },
  { id: "storybook", label: "Storybook" },
  { id: "anime", label: "Anime" },
];

const VIDEO_SIZE_OPTIONS = [
  { id: "youtube", label: "YouTube (16:9)" },
  { id: "shorts", label: "Shorts (9:16)" },
  { id: "whatsapp", label: "Square (1:1)" },
];

const STORY_MODE_OPTIONS = [
  "adventure",
  "educational",
  "moral",
  "bedtime",
  "funny",
  "science",
];

const PromptVideoGenerator = () => {
  const [prompt, setPrompt] = useState("A real-feel space adventure where two kids help a lost star return home.");
  const [styleId, setStyleId] = useState("real-cinematic");
  const [voiceType, setVoiceType] = useState("kid-female");
  const [videoSizeId, setVideoSizeId] = useState("youtube");
  const [storyMode, setStoryMode] = useState("adventure");
  const [sceneCount, setSceneCount] = useState(5);
  const [safeMode, setSafeMode] = useState(true);
  const [realFeel, setRealFeel] = useState(true);
  const [autoRender, setAutoRender] = useState(true);
  const [useCustomerCharacters, setUseCustomerCharacters] = useState(true);
  const [premiumHD, setPremiumHD] = useState(false);
  const [characterInputs, setCharacterInputs] = useState([{ ...DEFAULT_CHARACTER }]);
  const [characterImages, setCharacterImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const characterImagePreviews = useMemo(
    () =>
      characterImages.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    [characterImages]
  );

  useEffect(
    () => () => {
      characterImagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    },
    [characterImagePreviews]
  );

  const handleCharacterChange = (index, key, value) => {
    setCharacterInputs((current) =>
      current.map((item, idx) => (idx === index ? { ...item, [key]: value } : item))
    );
  };

  const handleAddCharacter = () => {
    setCharacterInputs((current) => [...current, { ...DEFAULT_CHARACTER }]);
  };

  const handleRemoveCharacter = (index) => {
    setCharacterInputs((current) => current.filter((_, idx) => idx !== index));
  };

  const handleImagesSelected = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    setCharacterImages(selectedFiles.slice(0, 8));
  };

  const getCleanCharacters = () =>
    characterInputs
      .map((item) => ({
        name: String(item.name || "").trim(),
        role: String(item.role || "").trim(),
        appearance: String(item.appearance || "").trim(),
        voiceProfile: String(item.voiceProfile || "").trim(),
      }))
      .filter((item) => item.name || item.role || item.appearance);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("styleId", styleId);
      formData.append("voiceType", voiceType);
      formData.append("videoSizeId", videoSizeId);
      formData.append("storyMode", storyMode);
      formData.append("sceneCount", String(sceneCount));
      formData.append("safeMode", String(safeMode));
      formData.append("realFeel", String(realFeel));
      formData.append("autoRender", String(autoRender));
      formData.append("useCustomerCharacters", String(useCustomerCharacters));
      formData.append("premiumHD", String(premiumHD));

      const cleanCharacters = getCleanCharacters();
      if (cleanCharacters.length > 0) {
        formData.append("characters", JSON.stringify(cleanCharacters));
      }

      characterImages.forEach((file) => {
        formData.append("characterImages", file);
      });

      const response = await axios.post(`${API_BASE_URL}/prompt-video/generate`, formData);
      setResult(response?.data || null);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.error
          || requestError?.message
          || "Failed to generate video module response."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="prompt-video-module">
      <header className="prompt-video-hero">
        <h1>Prompt Video Generator</h1>
        <p>Create real-feel AI videos from a prompt, with optional customer character UI upload.</p>
      </header>

      <form className="prompt-video-form" onSubmit={handleSubmit}>
        <label htmlFor="prompt-video-text">Video Prompt</label>
        <textarea
          id="prompt-video-text"
          rows={5}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe the story and tone for the video..."
          required
        />

        <div className="prompt-video-grid">
          <div>
            <label htmlFor="prompt-style-id">Style</label>
            <select id="prompt-style-id" value={styleId} onChange={(event) => setStyleId(event.target.value)}>
              {STYLE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="prompt-voice-type">Voice</label>
            <select id="prompt-voice-type" value={voiceType} onChange={(event) => setVoiceType(event.target.value)}>
              {VOICE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="prompt-video-size">Frame Size</label>
            <select id="prompt-video-size" value={videoSizeId} onChange={(event) => setVideoSizeId(event.target.value)}>
              {VIDEO_SIZE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="prompt-story-mode">Story Mode</label>
            <select id="prompt-story-mode" value={storyMode} onChange={(event) => setStoryMode(event.target.value)}>
              {STORY_MODE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="prompt-scene-count">Scenes</label>
            <input
              id="prompt-scene-count"
              type="number"
              min={3}
              max={8}
              value={sceneCount}
              onChange={(event) => setSceneCount(Number(event.target.value || 5))}
            />
          </div>
        </div>

        <div className="toggle-grid">
          <label><input type="checkbox" checked={realFeel} onChange={(event) => setRealFeel(event.target.checked)} /> Real feel mode</label>
          <label><input type="checkbox" checked={safeMode} onChange={(event) => setSafeMode(event.target.checked)} /> Safe mode</label>
          <label><input type="checkbox" checked={useCustomerCharacters} onChange={(event) => setUseCustomerCharacters(event.target.checked)} /> Use customer character setup</label>
          <label><input type="checkbox" checked={autoRender} onChange={(event) => setAutoRender(event.target.checked)} /> Auto render video</label>
          <label><input type="checkbox" checked={premiumHD} onChange={(event) => setPremiumHD(event.target.checked)} /> Premium HD export</label>
        </div>

        <section className="character-section">
          <h2>Characters (Optional)</h2>
          <p>Add character details manually, upload customer character UI images, or do both.</p>
          {characterInputs.map((character, index) => (
            <div className="character-row" key={`character-${index + 1}`}>
              <input
                type="text"
                value={character.name}
                onChange={(event) => handleCharacterChange(index, "name", event.target.value)}
                placeholder="Character name"
              />
              <input
                type="text"
                value={character.role}
                onChange={(event) => handleCharacterChange(index, "role", event.target.value)}
                placeholder="Role"
              />
              <input
                type="text"
                value={character.appearance}
                onChange={(event) => handleCharacterChange(index, "appearance", event.target.value)}
                placeholder="Appearance notes"
              />
              <button
                type="button"
                className="ghost-danger"
                onClick={() => handleRemoveCharacter(index)}
                disabled={characterInputs.length === 1}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="ghost-button" onClick={handleAddCharacter}>
            Add Character
          </button>
        </section>

        <section className="upload-section">
          <h2>Character UI Upload (Optional)</h2>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImagesSelected}
          />
          {characterImagePreviews.length > 0 && (
            <div className="preview-grid">
              {characterImagePreviews.map((preview) => (
                <figure key={preview.url} className="preview-card">
                  <img src={preview.url} alt={preview.name} />
                  <figcaption>{preview.name}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>

        <button type="submit" className="primary-action" disabled={loading}>
          {loading ? "Generating..." : "Generate Full Video"}
        </button>
      </form>

      {error && <div className="status-card error">{error}</div>}

      {result && (
        <section className="result-panel">
          <h2>Generation Result</h2>
          <div className="result-meta">
            <p><strong>Project ID:</strong> {result.projectId || result.project?.projectId || "N/A"}</p>
            <p><strong>Character Mode:</strong> {result.characterMode || "auto-generated"}</p>
          </div>

          {result.videoUrl ? (
            <div className="video-card">
              <video controls src={result.videoUrl} className="video-player" />
              <a href={result.videoUrl} target="_blank" rel="noreferrer" className="video-link">
                Open video in new tab
              </a>
            </div>
          ) : (
            <p>Video was not auto-rendered. You can render later from project data.</p>
          )}

          <details>
            <summary>Project JSON</summary>
            <pre>{JSON.stringify(result.project || result, null, 2)}</pre>
          </details>
        </section>
      )}
    </div>
  );
};

export default PromptVideoGenerator;
