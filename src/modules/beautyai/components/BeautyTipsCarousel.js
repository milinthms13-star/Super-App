import React, { useEffect, useState } from "react";
import { TIP_CATEGORY_LABELS } from "../data/beautyaiConstants";
import "../NilaBeautyAI.css";

/**
 * BeautyTipsCarousel Component
 * Displays rotating beauty tips with category filtering
 */

const BeautyTipsCarousel = ({ tips = [], todaysTip = null, language = "en" }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const filteredTips = selectedCategory === "all"
    ? tips
    : tips.filter((tip) => tip.category === selectedCategory);

  const displayTips = filteredTips.length > 0 ? filteredTips : tips;

  useEffect(() => {
    if (!isAutoPlaying || displayTips.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayTips.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, displayTips.length]);

  const handlePrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + displayTips.length) % displayTips.length);
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % displayTips.length);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentIndex(0);
    setIsAutoPlaying(true);
  };

  const categories = ["all", ...new Set(tips.map((tip) => tip.category))];

  if (displayTips.length === 0) {
    return (
      <section className="beauty-tips-carousel">
        <h3>Beauty Tips</h3>
        <p>No tips available at the moment. Check back soon!</p>
      </section>
    );
  }

  const currentTip = displayTips[currentIndex];

  return (
    <section className="beauty-tips-carousel">
      <div className="carousel-header">
        <h3>✨ Beauty Tips of the Day</h3>
        {todaysTip && (
          <div className="todays-tip-badge">
            <span>Today's Featured Tip</span>
          </div>
        )}
      </div>

      <div className="category-filters">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={selectedCategory === category ? "active" : ""}
            onClick={() => handleCategoryChange(category)}
          >
            {category === "all" ? "All" : TIP_CATEGORY_LABELS[category] || category}
          </button>
        ))}
      </div>

      <div className="carousel-content">
        <button
          type="button"
          className="carousel-nav prev"
          onClick={handlePrevious}
          aria-label="Previous tip"
        >
          ‹
        </button>

        <div className="tip-card">
          <div className="tip-category">
            {TIP_CATEGORY_LABELS[currentTip.category] || currentTip.category}
          </div>
          <h4>{currentTip.title}</h4>
          <p>{currentTip.text}</p>
          {currentTip._id === todaysTip?._id && (
            <span className="featured-badge">Featured Today</span>
          )}
        </div>

        <button
          type="button"
          className="carousel-nav next"
          onClick={handleNext}
          aria-label="Next tip"
        >
          ›
        </button>
      </div>

      <div className="carousel-indicators">
        {displayTips.map((_, index) => (
          <button
            key={index}
            type="button"
            className={index === currentIndex ? "active" : ""}
            onClick={() => {
              setCurrentIndex(index);
              setIsAutoPlaying(false);
            }}
            aria-label={`Go to tip ${index + 1}`}
          />
        ))}
      </div>

      <div className="carousel-controls">
        <span className="tip-counter">
          {currentIndex + 1} / {displayTips.length}
        </span>
        <button
          type="button"
          className="autoplay-toggle"
          onClick={() => setIsAutoPlaying(!isAutoPlaying)}
        >
          {isAutoPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
      </div>
    </section>
  );
};

export default BeautyTipsCarousel;
