import React, { useMemo, useState } from "react";
import {
  AGE_GROUPS,
  SAFETY_DEFAULTS,
  STORY_MODES,
  copyStoryToClipboard,
  downloadStoryAsHtml,
  shareStoryToWhatsApp,
} from "./kidsStoryGeneratorUtils";
import { generateKidsStoryWithFallback } from "./kidsStoryGeneratorService";
import "./KidsStoryGeneratorUpgrade.css";

const initialForm = {
  idea: "",
  ageGroup: "5-8",
  language: "ml",
  mode: "bedtime",
  heroName: "",
  moral: "Be kind and helpful",
  safety: { ...SAFETY_DEFAULTS },
};

const KidsStoryGeneratorPanel = ({ onConvertToVideo }) => {
  const [form, setForm] = useState(initialForm);
  const [story, setStory] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");

  const canGenerate = useMemo(() => String(form.idea || "").trim().length >= 5, [form.idea]);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSafety = (key) => {
    setForm((prev) => ({
      ...prev,
      safety: { ...prev.safety, [key]: !prev.safety[key] },
    }));
  };

  const generateStory = async () => {
    if (!canGenerate) {
      setMessage("Please enter a story idea first.");
      return;
    }

    setIsGenerating(true);
    setMessage("Creating a safe child-friendly story...");
    try {
      const generated = await generateKidsStoryWithFallback(form);
      setStory(generated);
      setMessage("Story ready. You can edit, copy, download, share, or convert to video.");
    } catch (error) {
      setMessage(error?.message || "Story generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateStoryText = (field, value) => {
    setStory((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <section className="kids-story-generator-shell">
      <div className="kids-story-hero-card">
        <div>
          <p className="kids-story-eyebrow">Kids Story Generator</p>
          <h2>Create safe stories, picture-book drafts and video-ready scenes</h2>
          <p>
            Generate Malayalam, English or Hindi stories with moral lesson, quiz, vocabulary and
            parent safety controls.
          </p>
        </div>
        <div className="kids-story-mode-pills">
          {STORY_MODES.map((mode) => (
            <button
              key={mode.key}
              type="button"
              className={form.mode === mode.key ? "active" : ""}
              onClick={() => updateForm("mode", mode.key)}
            >
              <span>{mode.icon}</span>
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="kids-story-form-grid">
        <label className="kids-story-field story-idea-field">
          <span>Story idea</span>
          <textarea
            rows={4}
            value={form.idea}
            placeholder="Example: A rabbit learns to share mangoes with friends"
            onChange={(event) => updateForm("idea", event.target.value)}
          />
        </label>

        <label className="kids-story-field">
          <span>Child age</span>
          <select value={form.ageGroup} onChange={(event) => updateForm("ageGroup", event.target.value)}>
            {AGE_GROUPS.map((group) => (
              <option key={group.key} value={group.key}>
                {group.label}
              </option>
            ))}
          </select>
        </label>

        <label className="kids-story-field">
          <span>Language</span>
          <select value={form.language} onChange={(event) => updateForm("language", event.target.value)}>
            <option value="ml">Malayalam</option>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
          </select>
        </label>

        <label className="kids-story-field">
          <span>Main character name</span>
          <input
            value={form.heroName}
            placeholder="Optional"
            onChange={(event) => updateForm("heroName", event.target.value)}
          />
        </label>

        <label className="kids-story-field">
          <span>Moral lesson</span>
          <input value={form.moral} onChange={(event) => updateForm("moral", event.target.value)} />
        </label>
      </div>

      <div className="kids-story-safety-card">
        <h3>Parent safety controls</h3>
        <div className="kids-story-safety-grid">
          {Object.entries(form.safety).map(([key, enabled]) => (
            <button
              type="button"
              key={key}
              className={enabled ? "enabled" : ""}
              onClick={() => toggleSafety(key)}
            >
              {enabled ? "[x]" : "[ ]"} {key.replace(/([A-Z])/g, " $1")}
            </button>
          ))}
        </div>
      </div>

      <button
        className="kids-story-generate-btn"
        type="button"
        disabled={!canGenerate || isGenerating}
        onClick={generateStory}
      >
        {isGenerating ? "Creating story..." : "Generate Story"}
      </button>

      {message && <p className="kids-story-status">{message}</p>}

      {story && (
        <div className="kids-story-output-card">
          <div className="kids-story-output-header">
            <div>
              <p className="kids-story-eyebrow">Editable Draft</p>
              <input
                className="kids-story-title-input"
                value={story.title}
                onChange={(event) => updateStoryText("title", event.target.value)}
              />
            </div>
            <div className="kids-story-actions">
              <button type="button" onClick={() => copyStoryToClipboard(story)}>
                Copy
              </button>
              <button type="button" onClick={() => downloadStoryAsHtml(story)}>
                Download
              </button>
              <button type="button" onClick={() => shareStoryToWhatsApp(story)}>
                WhatsApp
              </button>
              <button type="button" className="primary" onClick={() => onConvertToVideo?.(story)}>
                Convert to Video
              </button>
            </div>
          </div>

          <textarea
            className="kids-story-textarea"
            value={story.storyText}
            onChange={(event) => updateStoryText("storyText", event.target.value)}
          />

          <div className="kids-story-extra-grid">
            <div>
              <h3>Moral</h3>
              <p>{story.moral}</p>
            </div>
            <div>
              <h3>New words</h3>
              <ul>
                {(story.vocabulary || []).map((word) => (
                  <li key={word.word}>
                    <strong>{word.word}</strong>: {word.meaning}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Questions</h3>
              <ol>
                {(story.quiz || []).map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ol>
            </div>
            <div>
              <h3>Video-ready scenes</h3>
              <ol>
                {(story.scenes || []).map((scene) => (
                  <li key={scene.sceneNo}>{scene.visualPrompt}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default KidsStoryGeneratorPanel;
