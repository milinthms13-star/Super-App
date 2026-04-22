import React, { useState } from 'react';

const ImageLightbox = ({ images = [], initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setIsZoomed(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setIsZoomed(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') handlePrevious();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'Escape') onClose();
  };

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="lightbox-header">
          <span className="lightbox-counter">
            {currentIndex + 1} / {images.length}
          </span>
          <div className="lightbox-controls">
            <button
              type="button"
              className="lightbox-btn"
              onClick={() => setIsZoomed(!isZoomed)}
              title="Toggle zoom"
            >
              {isZoomed ? '🔍−' : '🔍+'}
            </button>
            <button
              type="button"
              className="lightbox-btn"
              onClick={onClose}
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className={`lightbox-image-wrapper ${isZoomed ? 'zoomed' : ''}`}>
          <img
            src={currentImage.data || currentImage.url || currentImage}
            alt={`Image ${currentIndex + 1}`}
            className="lightbox-image"
            onClick={() => setIsZoomed(!isZoomed)}
          />
        </div>

        {/* Navigation */}
        <div className="lightbox-navigation">
          <button
            type="button"
            className="lightbox-nav-btn lightbox-nav-prev"
            onClick={handlePrevious}
            title="Previous (←)"
          >
            ❮
          </button>

          {/* Thumbnail Strip */}
          <div className="lightbox-thumbnails">
            {images.map((img, idx) => (
              <div
                key={idx}
                className={`lightbox-thumbnail ${idx === currentIndex ? 'active' : ''}`}
                onClick={() => {
                  setCurrentIndex(idx);
                  setIsZoomed(false);
                }}
              >
                <img
                  src={img.data || img.url || img}
                  alt={`Thumbnail ${idx + 1}`}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            className="lightbox-nav-btn lightbox-nav-next"
            onClick={handleNext}
            title="Next (→)"
          >
            ❯
          </button>
        </div>

        {/* Image Info */}
        <div className="lightbox-info">
          <span className="lightbox-image-name">{currentImage.name || `Image ${currentIndex + 1}`}</span>
        </div>
      </div>
    </div>
  );
};

export default ImageLightbox;
