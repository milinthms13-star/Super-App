import React, { useState } from "react";
import { SKIN_TYPE_LABELS } from "../data/beautyaiConstants";
import "../NilaBeautyAI.css";

/**
 * BeautySelfieGallery Component
 * Displays a gallery of user's selfies with analysis results
 */

const BeautySelfieGallery = ({
  selfies = [],
  onDelete,
  onSelect,
  isDeleting = false,
}) => {
  const [selectedSelfie, setSelectedSelfie] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState("date-desc"); // 'date-desc', 'date-asc', 'score-desc', 'score-asc'

  const sortedSelfies = [...selfies].sort((a, b) => {
    switch (sortBy) {
      case "date-desc":
        return new Date(b.createdAt) - new Date(a.createdAt);
      case "date-asc":
        return new Date(a.createdAt) - new Date(b.createdAt);
      case "score-desc":
        return (b.analysis?.skinScore || 0) - (a.analysis?.skinScore || 0);
      case "score-asc":
        return (a.analysis?.skinScore || 0) - (b.analysis?.skinScore || 0);
      default:
        return 0;
    }
  });

  const handleSelfieClick = (selfie) => {
    setSelectedSelfie(selfie);
    if (onSelect) {
      onSelect(selfie);
    }
  };

  const handleDelete = (selfieId, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this selfie? This action cannot be undone.")) {
      onDelete(selfieId);
      if (selectedSelfie?._id === selfieId) {
        setSelectedSelfie(null);
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (selfies.length === 0) {
    return (
      <section className="beauty-selfie-gallery empty">
        <div className="empty-state">
          <span className="empty-icon">📸</span>
          <h3>No Selfies Yet</h3>
          <p>Upload a selfie to get personalized beauty analysis and recommendations!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="beauty-selfie-gallery">
      <div className="gallery-header">
        <h3>My Selfies ({selfies.length})</h3>
        <div className="gallery-controls">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="score-desc">Highest Score</option>
            <option value="score-asc">Lowest Score</option>
          </select>
          <div className="view-toggle">
            <button
              type="button"
              className={viewMode === "grid" ? "active" : ""}
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              ⊞
            </button>
            <button
              type="button"
              className={viewMode === "list" ? "active" : ""}
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      <div className={`gallery-content ${viewMode}-view`}>
        {sortedSelfies.map((selfie) => (
          <div
            key={selfie._id}
            className={`selfie-card ${selectedSelfie?._id === selfie._id ? "selected" : ""}`}
            onClick={() => handleSelfieClick(selfie)}
          >
            <div className="selfie-image">
              <img
                src={selfie.thumbnailUrl || selfie.photoUrl}
                alt={`Selfie from ${formatDate(selfie.createdAt)}`}
                loading="lazy"
              />
              <button
                type="button"
                className="delete-btn"
                onClick={(e) => handleDelete(selfie._id, e)}
                disabled={isDeleting}
                aria-label="Delete selfie"
              >
                🗑
              </button>
            </div>

            <div className="selfie-info">
              <div className="selfie-date">{formatDate(selfie.createdAt)}</div>
              {selfie.analysis && (
                <div className="selfie-analysis">
                  <div className="skin-score">
                    Score: <strong>{selfie.analysis.skinScore || 0}/100</strong>
                  </div>
                  {selfie.analysis.skinType && (
                    <div className="skin-type">
                      {SKIN_TYPE_LABELS[selfie.analysis.skinType] || selfie.analysis.skinType}
                    </div>
                  )}
                  {selfie.analysis.detectedConcerns && selfie.analysis.detectedConcerns.length > 0 && (
                    <div className="detected-concerns">
                      {selfie.analysis.detectedConcerns.slice(0, 2).map((concern, idx) => (
                        <span key={idx} className="concern-badge">
                          {concern}
                        </span>
                      ))}
                      {selfie.analysis.detectedConcerns.length > 2 && (
                        <span className="concern-badge more">
                          +{selfie.analysis.detectedConcerns.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedSelfie && (
        <div className="selfie-detail-modal" onClick={() => setSelectedSelfie(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="close-modal"
              onClick={() => setSelectedSelfie(null)}
            >
              ✕
            </button>

            <div className="detail-image">
              <img
                src={selectedSelfie.photoUrl}
                alt={`Selfie from ${formatDate(selectedSelfie.createdAt)}`}
              />
            </div>

            <div className="detail-info">
              <h4>Analysis Results</h4>
              <p className="detail-date">{formatDate(selectedSelfie.createdAt)}</p>

              {selectedSelfie.analysis && (
                <>
                  <div className="detail-score">
                    <span className="label">Skin Score:</span>
                    <span className="value">{selectedSelfie.analysis.skinScore || 0}/100</span>
                  </div>

                  {selectedSelfie.analysis.skinType && (
                    <div className="detail-skin-type">
                      <span className="label">Skin Type:</span>
                      <span className="value">
                        {SKIN_TYPE_LABELS[selectedSelfie.analysis.skinType] ||
                          selectedSelfie.analysis.skinType}
                      </span>
                    </div>
                  )}

                  {selectedSelfie.analysis.detectedConcerns &&
                    selectedSelfie.analysis.detectedConcerns.length > 0 && (
                      <div className="detail-concerns">
                        <span className="label">Detected Concerns:</span>
                        <ul>
                          {selectedSelfie.analysis.detectedConcerns.map((concern, idx) => (
                            <li key={idx}>{concern}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {selectedSelfie.analysis.recommendations &&
                    selectedSelfie.analysis.recommendations.length > 0 && (
                      <div className="detail-recommendations">
                        <span className="label">Recommendations:</span>
                        <ul>
                          {selectedSelfie.analysis.recommendations.map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default BeautySelfieGallery;
