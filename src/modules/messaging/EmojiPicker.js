import React, { useState, useRef, useEffect } from 'react';
import { STICKERS, STICKER_CATEGORIES } from './stickerCatalog';

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

const EmojiPicker = ({ onSelectEmoji, onSelectSticker, onClose, position }) => {
  const [activeTab, setActiveTab] = useState('emoji');
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [activeStickerCategory, setActiveStickerCategory] = useState('reactions');
  const [stickerQuery, setStickerQuery] = useState('');
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

  const sortedStickerPool = [...STICKERS].sort((firstSticker, secondSticker) => {
    if (firstSticker.trending === secondSticker.trending) {
      return firstSticker.name.localeCompare(secondSticker.name);
    }

    return firstSticker.trending ? -1 : 1;
  });

  const stickersWithSearch = sortedStickerPool.filter((sticker) => {
    if (!stickerQuery.trim()) {
      return true;
    }

    const query = stickerQuery.trim().toLowerCase();
    return (
      sticker.name.toLowerCase().includes(query) ||
      sticker.category.toLowerCase().includes(query) ||
      sticker.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const getVisibleStickers = () => {
    if (activeStickerCategory === 'recent') {
      return recentStickerIds
        .map((stickerId) => STICKERS.find((sticker) => sticker.id === stickerId))
        .filter((sticker) => sticker && stickersWithSearch.some((entry) => entry.id === sticker.id));
    }

    if (activeStickerCategory === 'favorites') {
      const favoriteLookup = new Set(favoriteStickerIds);
      return stickersWithSearch.filter((sticker) => favoriteLookup.has(sticker.id));
    }

    if (activeStickerCategory === 'trending') {
      return stickersWithSearch.filter((sticker) => sticker.trending);
    }

    return stickersWithSearch.filter((sticker) => sticker.category === activeStickerCategory);
  };

  const visibleStickers = getVisibleStickers();
  const fallbackStickers = [
    ...sortedStickerPool.filter((sticker) => sticker.trending),
    ...recentStickerIds
      .map((stickerId) => STICKERS.find((sticker) => sticker.id === stickerId))
      .filter(Boolean),
    ...favoriteStickerIds
      .map((stickerId) => STICKERS.find((sticker) => sticker.id === stickerId))
      .filter(Boolean),
  ].reduce((accumulator, sticker) => {
    if (!sticker) {
      return accumulator;
    }

    if (!accumulator.some((entry) => entry.id === sticker.id)) {
      accumulator.push(sticker);
    }

    return accumulator;
  }, []).slice(0, 6);

  const toggleFavoriteSticker = (stickerId) => {
    const nextFavoriteStickerIds = favoriteStickerIds.includes(stickerId)
      ? favoriteStickerIds.filter((entryId) => entryId !== stickerId)
      : [stickerId, ...favoriteStickerIds.filter((entryId) => entryId !== stickerId)];

    setFavoriteStickerIds(nextFavoriteStickerIds);
    persistStickerIds('malabarbazaar-stickers-favorites', nextFavoriteStickerIds);
  };

  const markStickerAsRecent = (stickerId) => {
    const nextRecentStickerIds = [
      stickerId,
      ...recentStickerIds.filter((entryId) => entryId !== stickerId),
    ].slice(0, MAX_RECENT_STICKERS);

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
          <input
            type="text"
            className="sticker-search-input"
            placeholder="Search stickers..."
            value={stickerQuery}
            onChange={(event) => setStickerQuery(event.target.value)}
          />

          <div className="sticker-categories-row">
            {[
              { id: 'recent', label: '🕘 Recent' },
              { id: 'favorites', label: '⭐ Favorites' },
              { id: 'trending', label: '🔥 Trending' },
              ...STICKER_CATEGORIES.map((category) => ({
                id: category.id,
                label: `${category.icon} ${category.label}`,
              })),
            ].map((category) => (
              <button
                key={category.id}
                type="button"
                className={`sticker-category-chip ${
                  activeStickerCategory === category.id ? 'active' : ''
                }`}
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
                </div>
              ))
            ) : (
              <div className="sticker-empty-state">
                <p>No exact sticker match. Try trending or recent favorites below.</p>
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
