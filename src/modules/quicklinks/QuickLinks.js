import React, { useState, useCallback, useMemo, useEffect } from "react";
import "../../styles/QuickLinks.css";
import { LINK_PRESETS, normalizeCustomLink } from "../../utils/customLinks";

const INITIAL_LINK_FORM = {
  preset: "custom",
  title: "",
  url: "",
  description: "",
  category: "general",
};

const QUICKLINK_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "social", label: "Social" },
  { value: "work", label: "Work" },
  { value: "payments", label: "Payments" },
  { value: "productivity", label: "Productivity" },
];

const PRESET_CATEGORY_MAP = {
  facebook: "social",
  gmail: "productivity",
};

const getCategoryForPreset = (preset) => PRESET_CATEGORY_MAP[preset] || "general";

const formatLastOpened = (dateString) => {
  if (!dateString) {
    return "Never opened";
  }

  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const QuickLinks = ({ customLinks = [], onCustomLinksChange = () => {} }) => {
  const [linkForm, setLinkForm] = useState(INITIAL_LINK_FORM);
  const [linkError, setLinkError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedLinkIndex, setSelectedLinkIndex] = useState(0);

  const safeCustomLinks = useMemo(
    () =>
      customLinks.map((link) => ({
        ...normalizeCustomLink(link),
        category: link.category || getCategoryForPreset(link.preset),
        pinned: Boolean(link.pinned),
        usageCount: typeof link.usageCount === "number" ? link.usageCount : 0,
        lastOpened: link.lastOpened || null,
      })),
    [customLinks]
  );

  const pinnedLinks = useMemo(
    () => safeCustomLinks.filter((link) => link.pinned),
    [safeCustomLinks]
  );

  const workspaceLinks = pinnedLinks.length > 0 ? pinnedLinks : safeCustomLinks.slice(0, 5);
  const selectedWorkspaceLink = workspaceLinks[selectedLinkIndex] || null;

  useEffect(() => {
    if (workspaceLinks.length === 0) {
      setSelectedLinkIndex(0);
      return;
    }

    if (selectedLinkIndex >= workspaceLinks.length) {
      setSelectedLinkIndex(0);
    }
  }, [workspaceLinks.length, selectedLinkIndex]);

  const totalCategories = useMemo(
    () => new Set(safeCustomLinks.map((link) => link.category)).size,
    [safeCustomLinks]
  );

  const suggestedPresets = useMemo(
    () =>
      Object.entries(LINK_PRESETS)
        .filter(
          ([presetKey]) =>
            presetKey !== "custom" && !safeCustomLinks.some((link) => link.preset === presetKey)
        )
        .map(([presetKey, preset]) => ({
          ...normalizeCustomLink({
            id: `preset-${presetKey}`,
            preset: presetKey,
            ...preset,
          }),
          category: getCategoryForPreset(presetKey),
        })),
    [safeCustomLinks]
  );

  const handleLinkFormChange = useCallback((event) => {
    const { name, value } = event.target;

    if (name === "preset") {
      const preset = LINK_PRESETS[value] || LINK_PRESETS.custom;
      setLinkForm({
        preset: value,
        title: preset.title,
        url: preset.url,
        description: preset.description,
        category: getCategoryForPreset(value),
      });
      setLinkError(null);
      return;
    }

    setLinkForm((current) => ({
      ...current,
      [name]: value,
    }));
    setLinkError(null);
  }, []);

  const displaySuccess = useCallback((message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  const handleAddCustomLink = useCallback(
    (event) => {
      event.preventDefault();

      const nextLink = {
        ...normalizeCustomLink({
          id: `custom-link-${Date.now()}`,
          ...linkForm,
        }),
        category: linkForm.category || "general",
        pinned: false,
        usageCount: 0,
        lastOpened: null,
      };

      if (!nextLink.title || !nextLink.url) {
        setLinkError("Link title and URL are required.");
        return;
      }

      try {
        new URL(nextLink.url);
      } catch (validationError) {
        setLinkError("Enter a valid URL like https://facebook.com or mail.google.com.");
        return;
      }

      onCustomLinksChange((currentLinks) => [...currentLinks, nextLink]);
      setLinkForm(INITIAL_LINK_FORM);
      setLinkError(null);
      displaySuccess("Quick link added successfully!");
    },
    [displaySuccess, linkForm, onCustomLinksChange]
  );

  const handleRemoveCustomLink = useCallback(
    (linkId) => {
      onCustomLinksChange((currentLinks) => currentLinks.filter((link) => link.id !== linkId));
      displaySuccess("Quick link removed!");
    },
    [displaySuccess, onCustomLinksChange]
  );

  const handleOpenLink = useCallback(
    (linkId, url) => {
      window.open(url, "_blank", "noopener,noreferrer");
      onCustomLinksChange((currentLinks) =>
        currentLinks.map((link) =>
          link.id === linkId
            ? {
                ...link,
                usageCount: (typeof link.usageCount === "number" ? link.usageCount : 0) + 1,
                lastOpened: new Date().toISOString(),
              }
            : link
        )
      );
    },
    [onCustomLinksChange]
  );

  const togglePinLink = useCallback(
    (linkId) => {
      onCustomLinksChange((currentLinks) =>
        currentLinks.map((link) =>
          link.id === linkId
            ? {
                ...link,
                pinned: !Boolean(link.pinned),
              }
            : link
        )
      );
    },
    [onCustomLinksChange]
  );

  const handleAddSuggestion = useCallback(
    (presetKey) => {
      const preset = LINK_PRESETS[presetKey];
      if (!preset) {
        return;
      }

      const nextLink = {
        ...normalizeCustomLink({
          id: `custom-link-${Date.now()}`,
          preset: presetKey,
          ...preset,
        }),
        category: getCategoryForPreset(presetKey),
        pinned: true,
        usageCount: 0,
        lastOpened: null,
      };

      onCustomLinksChange((currentLinks) => [...currentLinks, nextLink]);
      displaySuccess(`${preset.label} added to your 360 workspace.`);
    },
    [displaySuccess, onCustomLinksChange]
  );

  const handleSelectWorkspaceLink = useCallback((index) => {
    setSelectedLinkIndex(index);
  }, []);

  const handleNavigateWorkspace = useCallback(
    (direction) => {
      if (workspaceLinks.length === 0) {
        return;
      }

      setSelectedLinkIndex((currentIndex) => {
        const nextIndex = currentIndex + direction;
        if (nextIndex < 0) {
          return workspaceLinks.length - 1;
        }
        if (nextIndex >= workspaceLinks.length) {
          return 0;
        }
        return nextIndex;
      });
    },
    [workspaceLinks.length]
  );

  return (
    <div className="quicklinks-container">
      <div className="quicklinks-header">
        <h1>Quick Links</h1>
        <p>Manage shortcuts in a 360 workspace with pinning, categories, and smart suggestions.</p>
      </div>

      <section className="quicklinks-workspace-panel">
        <div className="quicklinks-360-header">
          <div>
            <p className="quicklinks-360-pretitle">Quick Links Studio</p>
            <h2>360 Workspace Preview</h2>
          </div>
          <div className="quicklinks-360-stats">
            <span>{safeCustomLinks.length} shortcuts</span>
            <span>{pinnedLinks.length} favorites</span>
            <span>{totalCategories} categories</span>
          </div>
        </div>

        <div className="quicklinks-360-board">
          <div className="quicklinks-360-card">
            {selectedWorkspaceLink ? (
              <>
                <div className="quicklinks-360-card-header">
                  <div>
                    <span className="quicklinks-card-category">{selectedWorkspaceLink.category}</span>
                    <h3>{selectedWorkspaceLink.title}</h3>
                  </div>
                  <span className="quicklinks-card-badge quicklinks-card-badge-light">
                    {selectedWorkspaceLink.pinned ? "Pinned" : "Workspace"}
                  </span>
                </div>

                <p className="quicklinks-360-card-description">
                  {selectedWorkspaceLink.description || "A high-priority shortcut in your workspace."}
                </p>

                <div className="quicklinks-360-card-meta">
                  <div>
                    <strong>Last opened:</strong> {formatLastOpened(selectedWorkspaceLink.lastOpened)}
                  </div>
                  <div>
                    <strong>Visits:</strong> {selectedWorkspaceLink.usageCount || 0}
                  </div>
                </div>

                <div className="quicklinks-360-actions">
                  <button
                    type="button"
                    className="quicklinks-btn-open"
                    onClick={() => handleOpenLink(selectedWorkspaceLink.id, selectedWorkspaceLink.url)}
                  >
                    Open Link
                  </button>
                  <button
                    type="button"
                    className="quicklinks-btn-remove"
                    onClick={() => togglePinLink(selectedWorkspaceLink.id)}
                  >
                    {selectedWorkspaceLink.pinned ? "Unpin" : "Pin"}
                  </button>
                </div>
              </>
            ) : (
              <div className="quicklinks-360-empty">
                <h3>Build your 360 workspace</h3>
                <p>Pin your favorite links to see them in the workspace preview and navigate them quickly.</p>
              </div>
            )}
          </div>

          <div className="quicklinks-360-carousel">
            <button
              type="button"
              className="quicklinks-360-nav"
              onClick={() => handleNavigateWorkspace(-1)}
              aria-label="Previous workspace card"
            >
              ◀
            </button>

            <div className="quicklinks-360-track">
              {workspaceLinks.length > 0 ? (
                workspaceLinks.map((link, index) => (
                  <button
                    key={link.id}
                    type="button"
                    className={`quicklinks-360-chip ${index === selectedLinkIndex ? "active" : ""}`}
                    onClick={() => handleSelectWorkspaceLink(index)}
                  >
                    <span className="quicklinks-chip-label">{link.title}</span>
                    <span className="quicklinks-chip-category">{link.category}</span>
                  </button>
                ))
              ) : (
                <div className="quicklinks-360-empty-chip">
                  Add a pinned link to populate your workspace carousel.
                </div>
              )}
            </div>

            <button
              type="button"
              className="quicklinks-360-nav"
              onClick={() => handleNavigateWorkspace(1)}
              aria-label="Next workspace card"
            >
              ▶
            </button>
          </div>

          {suggestedPresets.length > 0 && (
            <div className="quicklinks-suggestions">
              <div className="quicklinks-suggestions-header">
                <h3>Smart suggestions</h3>
                <p>Quick actions you can add with one click.</p>
              </div>
              <div className="quicklinks-suggestions-list">
                {suggestedPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="quicklinks-suggestion-pill"
                    onClick={() => handleAddSuggestion(preset.preset)}
                  >
                    {preset.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="quicklinks-content">
        <section className="quicklinks-form-section">
          <div className="quicklinks-section-header">
            <h2>Add New Quick Link</h2>
            <p>Create shortcuts for faster access to your favorite websites</p>
          </div>

          <form className="quicklinks-form" onSubmit={handleAddCustomLink}>
            {linkError && <div className="quicklinks-error-message">{linkError}</div>}
            {successMessage && <div className="quicklinks-success-message">{successMessage}</div>}

            <div className="quicklinks-form-grid">
              <div className="quicklinks-form-group">
                <label htmlFor="preset-select">Service</label>
                <select
                  id="preset-select"
                  name="preset"
                  value={linkForm.preset}
                  onChange={handleLinkFormChange}
                  className="quicklinks-select"
                >
                  {Object.entries(LINK_PRESETS).map(([value, preset]) => (
                    <option key={value} value={value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="quicklinks-form-group">
                <label htmlFor="title-input">Link Title *</label>
                <input
                  id="title-input"
                  type="text"
                  name="title"
                  value={linkForm.title}
                  onChange={handleLinkFormChange}
                  placeholder="Facebook, Gmail, Business mail"
                  className="quicklinks-input"
                  required
                />
              </div>

              <div className="quicklinks-form-group">
                <label htmlFor="url-input">URL *</label>
                <input
                  id="url-input"
                  type="text"
                  name="url"
                  value={linkForm.url}
                  onChange={handleLinkFormChange}
                  placeholder="https://mail.google.com/"
                  className="quicklinks-input"
                  required
                />
              </div>

              <div className="quicklinks-form-group">
                <label htmlFor="category-select">Category</label>
                <select
                  id="category-select"
                  name="category"
                  value={linkForm.category}
                  onChange={handleLinkFormChange}
                  className="quicklinks-select"
                >
                  {QUICKLINK_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="quicklinks-form-group">
                <label htmlFor="description-input">Description</label>
                <input
                  id="description-input"
                  type="text"
                  name="description"
                  value={linkForm.description}
                  onChange={handleLinkFormChange}
                  placeholder="Optional card description"
                  className="quicklinks-input"
                />
              </div>
            </div>

            <div className="quicklinks-form-actions">
              <button type="submit" className="quicklinks-btn-primary">
                Save Quick Link
              </button>
            </div>
          </form>
        </section>

        <section className="quicklinks-list-section">
          <div className="quicklinks-section-header">
            <h2>Your Quick Links</h2>
            <p>Total: {safeCustomLinks.length} links</p>
          </div>

          {safeCustomLinks.length > 0 ? (
            <div className="quicklinks-grid">
              {safeCustomLinks.map((link) => (
                <div key={link.id} className="quicklinks-card">
                  <div className="quicklinks-card-header">
                    <div className="quicklinks-card-title">
                      <h3>{link.title}</h3>
                      <span className="quicklinks-card-badge">{link.category}</span>
                    </div>
                    <button
                      type="button"
                      className={`quicklinks-pin-button ${link.pinned ? "pinned" : ""}`}
                      onClick={() => togglePinLink(link.id)}
                      title={link.pinned ? "Unpin this link" : "Pin this link"}
                    >
                      {link.pinned ? "★" : "☆"}
                    </button>
                  </div>

                  <p className="quicklinks-card-description">
                    {link.description || "Custom shortcut for quick access"}
                  </p>

                  <p className="quicklinks-card-url">{link.url}</p>

                  <div className="quicklinks-card-meta">
                    <span>{link.usageCount || 0} visits</span>
                    <span>{formatLastOpened(link.lastOpened)}</span>
                  </div>

                  <div className="quicklinks-card-actions">
                    <button
                      type="button"
                      className="quicklinks-btn-open"
                      onClick={() => handleOpenLink(link.id, link.url)}
                      title="Open in new window"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className="quicklinks-btn-remove"
                      onClick={() => handleRemoveCustomLink(link.id)}
                      title="Remove this link"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="quicklinks-empty-state">
              <div className="quicklinks-empty-icon">🔗</div>
              <h3>No quick links yet</h3>
              <p>
                Create your first quick link above! Save Gmail, Facebook, or any website here
                and it will appear on the launch page and home page next to the fixed categories.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default QuickLinks;
