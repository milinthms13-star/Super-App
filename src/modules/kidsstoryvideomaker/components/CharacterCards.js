import React from "react";

const CharacterCards = React.memo(function CharacterCards({
  characters,
  voiceType,
  onCharacterChange,
  onCharacterToggleLock,
  onCharacterRemove,
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
