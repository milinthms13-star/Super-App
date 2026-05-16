import React from "react";

const SceneCards = React.memo(function SceneCards({
  scenes,
  getSceneId,
  onMoveScene,
  onFieldChange,
  onDurationChange,
  onDuplicateScene,
  onRemoveScene,
  onRegenerateScene,
  onRegenerateDialogue,
  isRegeneratingSceneId,
  isRegeneratingDialogueId,
}) {
  if (!scenes.length) {
    return <p>No scenes yet. Use Create to build your video pipeline.</p>;
  }

  return scenes.map((scene, index) => {
    const sceneId = getSceneId(scene, index);
    return (
      <article key={sceneId} className="scene-card">
        <div className="scene-title-row">
          <span className="scene-number">Scene {sceneId}</span>
          <span className="scene-emotion">{scene.emotion || "gentle"}</span>
        </div>
        <div className="story-actions">
          <button className="secondary-button" onClick={() => onMoveScene(index, "up")} disabled={index === 0}>
            Move Up
          </button>
          <button
            className="secondary-button"
            onClick={() => onMoveScene(index, "down")}
            disabled={index === scenes.length - 1}
          >
            Move Down
          </button>
          <button className="secondary-button" onClick={() => onDuplicateScene(sceneId)}>
            Duplicate
          </button>
          <button
            className="download-button"
            onClick={() => onRemoveScene(sceneId)}
            disabled={scenes.length <= 1}
          >
            Remove
          </button>
          <button
            className="secondary-button"
            onClick={() => onRegenerateScene(sceneId)}
            disabled={Boolean(isRegeneratingSceneId || isRegeneratingDialogueId)}
          >
            {isRegeneratingSceneId === String(sceneId) ? "Regenerating..." : "Regenerate This Scene"}
          </button>
          <button
            className="secondary-button"
            onClick={() => onRegenerateDialogue(sceneId)}
            disabled={Boolean(isRegeneratingSceneId || isRegeneratingDialogueId)}
          >
            {isRegeneratingDialogueId === String(sceneId) ? "Regenerating..." : "Regenerate Dialogue"}
          </button>
        </div>

        <label htmlFor={`scene-title-${sceneId}`}>Title</label>
        <input
          id={`scene-title-${sceneId}`}
          type="text"
          value={scene.title || ""}
          onChange={(event) => onFieldChange(sceneId, "title", event.target.value)}
        />

        <label htmlFor={`scene-description-${sceneId}`}>Description</label>
        <textarea
          id={`scene-description-${sceneId}`}
          rows={4}
          value={scene.description || scene.summary || ""}
          onChange={(event) => onFieldChange(sceneId, "description", event.target.value)}
        />

        <label htmlFor={`scene-dialogue-${sceneId}`}>Dialogue</label>
        <textarea
          id={`scene-dialogue-${sceneId}`}
          rows={3}
          value={scene.dialogue || ""}
          onChange={(event) => onFieldChange(sceneId, "dialogue", event.target.value)}
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
              onChange={(event) => onDurationChange(sceneId, event.target.value)}
            />
          </div>
          <div>
            <label htmlFor={`scene-weather-${sceneId}`}>Weather</label>
            <input
              id={`scene-weather-${sceneId}`}
              type="text"
              value={scene.weather || ""}
              onChange={(event) => onFieldChange(sceneId, "weather", event.target.value)}
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
              onChange={(event) => onFieldChange(sceneId, "timeOfDay", event.target.value)}
            />
          </div>
          <div>
            <label htmlFor={`scene-camera-${sceneId}`}>Camera</label>
            <input
              id={`scene-camera-${sceneId}`}
              type="text"
              value={scene.cameraActions || ""}
              onChange={(event) => onFieldChange(sceneId, "cameraActions", event.target.value)}
            />
          </div>
        </div>

        <label htmlFor={`scene-bg-${sceneId}`}>Background</label>
        <textarea
          id={`scene-bg-${sceneId}`}
          rows={2}
          value={scene.background || ""}
          onChange={(event) => onFieldChange(sceneId, "background", event.target.value)}
        />

        <div className="scene-meta">Camera: {scene.cameraActions || "soft pan"}</div>
      </article>
    );
  });
});

export default SceneCards;
