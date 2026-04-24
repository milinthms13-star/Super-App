import React, { useState, useCallback } from "react";
import "../../styles/QuickLinks.css";
import { LINK_PRESETS, normalizeCustomLink } from "../../utils/customLinks";

const INITIAL_LINK_FORM = {
  preset: "custom",
  title: "",
  url: "",
  description: "",
};

const QuickLinks = ({ customLinks = [], onCustomLinksChange = () => {} }) => {
  const [linkForm, setLinkForm] = useState(INITIAL_LINK_FORM);
  const [linkError, setLinkError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleLinkFormChange = (event) => {
    const { name, value } = event.target;

    if (name === "preset") {
      const preset = LINK_PRESETS[value] || LINK_PRESETS.custom;
      setLinkForm({
        preset: value,
        title: preset.title,
        url: preset.url,
        description: preset.description,
      });
      setLinkError(null);
      return;
    }

    setLinkForm((current) => ({
      ...current,
      [name]: value,
    }));
    setLinkError(null);
  };

  const handleAddCustomLink = (event) => {
    event.preventDefault();

    const nextLink = normalizeCustomLink({
      id: `custom-link-${Date.now()}`,
      ...linkForm,
    });

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
    setSuccessMessage("Quick link added successfully!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleRemoveCustomLink = (linkId) => {
    onCustomLinksChange((currentLinks) => currentLinks.filter((link) => link.id !== linkId));
    setSuccessMessage("Quick link removed!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="quicklinks-container">
      <div className="quicklinks-header">
        <h1>Quick Links</h1>
        <p>Add Facebook, Gmail, or any custom shortcut</p>
      </div>

      <div className="quicklinks-content">
        <section className="quicklinks-form-section">
          <div className="quicklinks-section-header">
            <h2>Add New Quick Link</h2>
            <p>Create shortcuts for faster access to your favorite websites</p>
          </div>

          <form className="quicklinks-form" onSubmit={handleAddCustomLink}>
            {linkError && (
              <div className="quicklinks-error-message">
                {linkError}
              </div>
            )}

            {successMessage && (
              <div className="quicklinks-success-message">
                {successMessage}
              </div>
            )}

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
            <p>Total: {customLinks.length} links</p>
          </div>

          {customLinks.length > 0 ? (
            <div className="quicklinks-grid">
              {customLinks.map((link) => (
                <div key={link.id} className="quicklinks-card">
                  <div className="quicklinks-card-header">
                    <div className="quicklinks-card-title">
                      <h3>{link.title}</h3>
                      <span className="quicklinks-card-badge">Quick Link</span>
                    </div>
                  </div>

                  <p className="quicklinks-card-description">
                    {link.description || "Custom shortcut for quick access"}
                  </p>

                  <p className="quicklinks-card-url">{link.url}</p>

                  <div className="quicklinks-card-actions">
                    <button
                      type="button"
                      className="quicklinks-btn-open"
                      onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
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
