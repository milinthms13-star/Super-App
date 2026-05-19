import React from "react";

const CharacterCards = React.memo(function CharacterCards({
  characters,
  voiceType,
  onCharacterChange,
  onCharacterToggleLock,
  onCharacterRemove,
  getCharacterFacePreview,
  onCharacterFaceUpload,
  onCharacterFaceClear,
}) {
  return (
    <div className="character-grid">
      {(characters || []).map((character, index) => (
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
            onChange={(event) => onCharacterChange(index, "name", event.target.value)}
          />
          <label>Appearance</label>
          <textarea
            rows={2}
            value={character.appearance || ""}
            onChange={(event) => onCharacterChange(index, "appearance", event.target.value)}
          />
          <label>Voice</label>
          <input
            type="text"
            value={character.voiceProfile || ""}
            onChange={(event) => onCharacterChange(index, "voiceProfile", event.target.value)}
          />
          <label>Face Reference</label>
          <div className="character-face-upload">
            {getCharacterFacePreview?.(character, index) ? (
              <img
                className="character-face-preview"
                src={getCharacterFacePreview(character, index)}
                alt={`${character.name || `Character ${index + 1}`} face reference`}
              />
            ) : (
              <p className="character-face-placeholder">
                Upload a face image to keep this character look consistent.
              </p>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(event) => onCharacterFaceUpload?.(index, character, event)}
            />
            {getCharacterFacePreview?.(character, index) ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => onCharacterFaceClear?.(index, character)}
              >
                Clear Face
              </button>
            ) : null}
          </div>
          <div className="studio-toggle-row">
            <span>Character Lock</span>
            <button
              className={`pill-toggle ${character.locked !== false ? "on" : "off"}`}
              onClick={() => onCharacterToggleLock(index)}
            >
              {character.locked !== false ? "Locked" : "Unlocked"}
            </button>
          </div>
          <button
            className="download-button"
            onClick={() => onCharacterRemove(index)}
            disabled={(characters || []).length <= 1}
          >
            Remove Character
          </button>
        </div>
      ))}
    </div>
  );
});

export default CharacterCards;
