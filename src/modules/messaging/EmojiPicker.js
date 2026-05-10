import React, { useState, useRef, useEffect } from 'react';
import { STICKERS, STICKER_CATEGORIES, createSticker } from './stickerCatalog';

const EMOJI_CATEGORIES = {
  smileys: ['😀', '😃', '😄', '😁', '😆', '😂', '😊', '🙂', '😉', '😍', '😘', '🤗'],
  gestures: ['👋', '👌', '👍', '👏', '🙏', '✌️', '🤝', '🤟', '👊', '🙌', '🤙', '🫶'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '🤎', '💕', '💖', '💯', '🔥'],
  extras: ['🎉', '✨', '🚀', '🎯', '💡', '📌', '✅', '❗', '🎵', '📎', '☕', '🌟'],
};

const CATEGORY_LABELS = {
  smileys: 'Faces',
  gestures: 'Hands',
  hearts: 'Hearts',
  extras: 'More',
};

const MAX_RECENT_STICKERS = 24;
const MAX_CUSTOM_STICKERS = 48;
const CUSTOM_STICKERS_STORAGE_KEY = 'malabarbazaar-stickers-custom';
const CUSTOM_STICKER_CATEGORY_ID = 'custom';

const CUSTOM_STICKER_PALETTES = [
  { id: 'ocean', label: 'Ocean', colors: ['#0284c7', '#06b6d4'] },
  { id: 'sunset', label: 'Sunset', colors: ['#ea580c', '#f43f5e'] },
  { id: 'mint', label: 'Mint', colors: ['#0f766e', '#34d399'] },
  { id: 'violet', label: 'Violet', colors: ['#7c3aed', '#a78bfa'] },
  { id: 'gold', label: 'Gold', colors: ['#ca8a04', '#f59e0b'] },
];

const readStoredStickerIds = (key) => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) {
      return [];
    }
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const persistStickerIds = (key, ids) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch (error) {
    // Ignore local persistence failures.
  }
};

const readStoredCustomStickers = (key) => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (sticker) =>
        sticker &&
        typeof sticker.id === 'string' &&
        typeof sticker.name === 'string' &&
        typeof sticker.url === 'string'
    );
  } catch (error) {
    return [];
  }
};

const persistCustomStickers = (key, stickers) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(stickers));
  } catch (error) {
    // Ignore local persistence failures.
  }
};

const EmojiPicker = ({ onSelectEmoji, onSelectSticker, onClose, position }) => {
  const [activeTab, setActiveTab] = useState('emoji');
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [activeStickerCategory, setActiveStickerCategory] = useState('reactions');
  const [stickerQuery, setStickerQuery] = useState('');
  const [showStickerCreator, setShowStickerCreator] = useState(false);
  const [stickerCreatorError, setStickerCreatorError] = useState('');
  const [customStickerName, setCustomStickerName] = useState('');
  const [customStickerText, setCustomStickerText] = useState('');
  const [customPaletteId, setCustomPaletteId] = useState(CUSTOM_STICKER_PALETTES[0].id);
  const [customStickers, setCustomStickers] = useState(() =>
    readStoredCustomStickers(CUSTOM_STICKERS_STORAGE_KEY)
  );
  const [recentStickerIds, setRecentStickerIds] = useState(() =>
    readStoredStickerIds('malabarbazaar-stickers-recent')
  );
  const [favoriteStickerIds, setFavoriteStickerIds] = useState(() =>
    readStoredStickerIds('malabarbazaar-stickers-favorites')
  );
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const stickerPool = [...customStickers, ...STICKERS];
  const selectedCustomPalette =
    CUSTOM_STICKER_PALETTES.find((palette) => palette.id === customPaletteId) || CUSTOM_STICKER_PALETTES[0];
  const sortedStickerPool = [...stickerPool].sort((firstSticker, secondSticker) => {
    if (firstSticker.trending === secondSticker.trending) {
      return firstSticker.name.localeCompare(secondSticker.name);
    }

    return firstSticker.trending ? -1 : 1;
  });
  const stickerById = sortedStickerPool.reduce((lookup, sticker) => {
    lookup[sticker.id] = sticker;
    return lookup;
  }, {});

  const stickersWithSearch = sortedStickerPool.filter((sticker) => {
    if (!stickerQuery.trim()) {
      return true;
    }

    const query = stickerQuery.trim().toLowerCase();
    const stickerTags = Array.isArray(sticker.tags) ? sticker.tags : [];
    return (
      sticker.name.toLowerCase().includes(query) ||
      sticker.category.toLowerCase().includes(query) ||
      stickerTags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const getVisibleStickers = () => {
    if (activeStickerCategory === 'recent') {
      return recentStickerIds
        .map((stickerId) => stickerById[stickerId])
        .filter((sticker) => sticker && stickersWithSearch.some((entry) => entry.id === sticker.id));
    }

    if (activeStickerCategory === 'favorites') {
      const favoriteLookup = new Set(favoriteStickerIds);
      return stickersWithSearch.filter((sticker) => favoriteLookup.has(sticker.id));
    }

    if (activeStickerCategory === 'trending') {
      return stickersWithSearch.filter((sticker) => sticker.trending);
    }

    if (activeStickerCategory === CUSTOM_STICKER_CATEGORY_ID) {
      return stickersWithSearch.filter((sticker) => sticker.category === CUSTOM_STICKER_CATEGORY_ID);
    }

    return stickersWithSearch.filter((sticker) => sticker.category === activeStickerCategory);
  };

  const visibleStickers = getVisibleStickers();
  const fallbackStickers = [
    ...sortedStickerPool.filter((sticker) => sticker.trending),
    ...recentStickerIds.map((stickerId) => stickerById[stickerId]).filter(Boolean),
    ...favoriteStickerIds.map((stickerId) => stickerById[stickerId]).filter(Boolean),
  ]
    .reduce((accumulator, sticker) => {
      if (!accumulator.some((entry) => entry.id === sticker.id)) {
        accumulator.push(sticker);
      }

      return accumulator;
    }, [])
    .slice(0, 6);

  const toggleFavoriteSticker = (stickerId) => {
    const nextFavoriteStickerIds = favoriteStickerIds.includes(stickerId)
      ? favoriteStickerIds.filter((entryId) => entryId !== stickerId)
      : [stickerId, ...favoriteStickerIds.filter((entryId) => entryId !== stickerId)];

    setFavoriteStickerIds(nextFavoriteStickerIds);
    persistStickerIds('malabarbazaar-stickers-favorites', nextFavoriteStickerIds);
  };

  const markStickerAsRecent = (stickerId) => {
    const nextRecentStickerIds = [stickerId, ...recentStickerIds.filter((entryId) => entryId !== stickerId)].slice(
      0,
      MAX_RECENT_STICKERS
    );

    setRecentStickerIds(nextRecentStickerIds);
    persistStickerIds('malabarbazaar-stickers-recent', nextRecentStickerIds);
  };

  const handleStickerSelect = (sticker) => {
    markStickerAsRecent(sticker.id);

    if (onSelectSticker) {
      onSelectSticker(sticker);
    }

    onClose();
  };

  const handleCreateSticker = (event) => {
    event.preventDefault();

    const stickerName = customStickerName.trim();
    const stickerText = customStickerText.trim();
    const normalizedName = stickerName || stickerText;
    const normalizedText = (stickerText || normalizedName).toUpperCase();

    if (!normalizedName) {
      setStickerCreatorError('Add a name or text before creating a sticker.');
      return;
    }

    const nextSticker = createSticker({
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: normalizedName,
      text: normalizedText,
      category: CUSTOM_STICKER_CATEGORY_ID,
      palette: selectedCustomPalette.colors,
      tags: ['custom', 'user-created'],
    });

    const nextCustomStickers = [nextSticker, ...customStickers].slice(0, MAX_CUSTOM_STICKERS);
    setCustomStickers(nextCustomStickers);
    persistCustomStickers(CUSTOM_STICKERS_STORAGE_KEY, nextCustomStickers);
    setStickerCreatorError('');
    setCustomStickerName('');
    setCustomStickerText('');
    setActiveStickerCategory(CUSTOM_STICKER_CATEGORY_ID);
    markStickerAsRecent(nextSticker.id);
  };

  const handleDeleteCustomSticker = (stickerId) => {
    const nextCustomStickers = customStickers.filter((sticker) => sticker.id !== stickerId);
    setCustomStickers(nextCustomStickers);
    persistCustomStickers(CUSTOM_STICKERS_STORAGE_KEY, nextCustomStickers);

    if (favoriteStickerIds.includes(stickerId)) {
      const nextFavoriteStickerIds = favoriteStickerIds.filter((entryId) => entryId !== stickerId);
      setFavoriteStickerIds(nextFavoriteStickerIds);
      persistStickerIds('malabarbazaar-stickers-favorites', nextFavoriteStickerIds);
    }

    if (recentStickerIds.includes(stickerId)) {
      const nextRecentStickerIds = recentStickerIds.filter((entryId) => entryId !== stickerId);
      setRecentStickerIds(nextRecentStickerIds);
      persistStickerIds('malabarbazaar-stickers-recent', nextRecentStickerIds);
    }
  };

  const customStickerPreview = createSticker({
    id: 'custom-preview',
    label: customStickerName.trim() || customStickerText.trim() || 'My Sticker',
    text: customStickerText.trim() || customStickerName.trim() || 'NILAHUB',
    category: CUSTOM_STICKER_CATEGORY_ID,
    palette: selectedCustomPalette.colors,
    tags: ['custom-preview'],
  });

  return (
    <div
      className="emoji-picker linkup-emoji-picker"
      ref={pickerRef}
      style={
        position
          ? {
              top: `${position.y}px`,
              left: `${position.x}px`,
              right: 'auto',
              bottom: 'auto',
            }
          : {}
      }
    >
      <div className="picker-tabs">
        <button
          type="button"
          className={`picker-tab-btn ${activeTab === 'emoji' ? 'active' : ''}`}
          onClick={() => setActiveTab('emoji')}
        >
          Emoji
        </button>
        <button
          type="button"
          className={`picker-tab-btn ${activeTab === 'sticker' ? 'active' : ''}`}
          onClick={() => setActiveTab('sticker')}
        >
          Stickers
        </button>
      </div>

      {activeTab === 'emoji' ? (
        <>
          <div className="emoji-categories">
            {Object.keys(EMOJI_CATEGORIES).map((category) => (
              <button
                key={category}
                className={`category-btn ${activeCategory === category ? 'active' : ''}`}
                onClick={() => setActiveCategory(category)}
                type="button"
                title={CATEGORY_LABELS[category]}
              >
                {CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>

          <div className="emoji-grid">
            {EMOJI_CATEGORIES[activeCategory].map((emoji) => (
              <button
                key={emoji}
                className="emoji-btn"
                onClick={() => {
                  onSelectEmoji(emoji);
                  onClose();
                }}
                type="button"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="sticker-picker-content">
          <div className="sticker-creator-section">
            <button
              type="button"
              className={`sticker-creator-toggle ${showStickerCreator ? 'active' : ''}`}
              onClick={() => setShowStickerCreator(!showStickerCreator)}
            >
              {showStickerCreator ? 'Hide creator' : 'Create sticker'}
            </button>

            {showStickerCreator && (
              <form className="sticker-creator-form" onSubmit={handleCreateSticker}>
                <input
                  type="text"
                  className="sticker-creator-input"
                  placeholder="Sticker name"
                  value={customStickerName}
                  onChange={(event) => setCustomStickerName(event.target.value)}
                  maxLength={32}
                />
                <input
                  type="text"
                  className="sticker-creator-input"
                  placeholder="Sticker text"
                  value={customStickerText}
                  onChange={(event) => setCustomStickerText(event.target.value)}
                  maxLength={32}
                />

                <div className="sticker-palette-row">
                  {CUSTOM_STICKER_PALETTES.map((palette) => (
                    <button
                      key={palette.id}
                      type="button"
                      className={`sticker-palette-chip ${customPaletteId === palette.id ? 'active' : ''}`}
                      style={{
                        background: `linear-gradient(135deg, ${palette.colors[0]} 0%, ${palette.colors[1]} 100%)`,
                      }}
                      onClick={() => setCustomPaletteId(palette.id)}
                      title={palette.label}
                    />
                  ))}
                </div>

                <div className="sticker-creator-preview">
                  <img src={customStickerPreview.url} alt="Sticker preview" className="sticker-image" loading="lazy" />
                  <span className="sticker-name">{customStickerPreview.name}</span>
                </div>

                {stickerCreatorError ? <p className="sticker-creator-error">{stickerCreatorError}</p> : null}

                <button type="submit" className="sticker-creator-save-btn">
                  Save sticker
                </button>
              </form>
            )}
          </div>

          <input
            type="text"
            className="sticker-search-input"
            placeholder="Search stickers..."
            value={stickerQuery}
            onChange={(event) => setStickerQuery(event.target.value)}
          />

          <div className="sticker-categories-row">
            {[
              { id: 'recent', label: 'Recent' },
              { id: 'favorites', label: 'Favorites' },
              { id: 'trending', label: 'Trending' },
              { id: CUSTOM_STICKER_CATEGORY_ID, label: 'My Stickers' },
              ...STICKER_CATEGORIES.map((category) => ({
                id: category.id,
                label: `${category.icon} ${category.label}`,
              })),
            ].map((category) => (
              <button
                key={category.id}
                type="button"
                className={`sticker-category-chip ${activeStickerCategory === category.id ? 'active' : ''}`}
                onClick={() => setActiveStickerCategory(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="sticker-grid">
            {visibleStickers.length > 0 ? (
              visibleStickers.map((sticker) => (
                <div key={sticker.id} className="sticker-card-wrap">
                  <button
                    type="button"
                    className="sticker-card"
                    onClick={() => handleStickerSelect(sticker)}
                    title={sticker.name}
                  >
                    <img src={sticker.url} alt={sticker.name} className="sticker-image" loading="lazy" />
                    <span className="sticker-name">{sticker.name}</span>
                  </button>
                  <button
                    type="button"
                    className={`sticker-fav-btn ${favoriteStickerIds.includes(sticker.id) ? 'active' : ''}`}
                    onClick={() => toggleFavoriteSticker(sticker.id)}
                    title="Toggle favorite"
                  >
                    ★
                  </button>
                  {sticker.category === CUSTOM_STICKER_CATEGORY_ID ? (
                    <button
                      type="button"
                      className="sticker-delete-btn"
                      onClick={() => handleDeleteCustomSticker(sticker.id)}
                      title="Delete sticker"
                    >
                      x
                    </button>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="sticker-empty-state">
                <p>
                  {activeStickerCategory === CUSTOM_STICKER_CATEGORY_ID
                    ? 'No custom stickers yet. Create one above.'
                    : 'No exact sticker match. Try trending or recent favorites below.'}
                </p>
                <div className="sticker-empty-fallback-grid">
                  {fallbackStickers.length > 0 ? (
                    fallbackStickers.map((sticker) => (
                      <button
                        key={sticker.id}
                        type="button"
                        className="sticker-card sticker-card-fallback"
                        onClick={() => handleStickerSelect(sticker)}
                        title={sticker.name}
                      >
                        <img src={sticker.url} alt={sticker.name} className="sticker-image" loading="lazy" />
                        <span className="sticker-name">{sticker.name}</span>
                      </button>
                    ))
                  ) : (
                    <span className="sticker-empty-fallback-copy">No recent stickers yet. Explore categories above.</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmojiPicker;
