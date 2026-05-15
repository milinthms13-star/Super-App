import React from "react";

/**
 * PopularLocations
 * Shows trending/popular locations as a horizontal carousel.
 * Helps users discover property hotspots without scrolling.
 */
const PopularLocations = ({ locations, onLocationClick }) => {
  // Show top 8 locations with property counts
  const topLocations = locations
    .filter((loc) => loc !== "All")
    .slice(0, 8)
    .map((loc, idx) => ({
      name: loc,
      count: Math.floor(Math.random() * 500) + 10, // Mock count
      image: `https://images.unsplash.com/photo-${1500000000000 + idx * 100000}?w=300&h=200&fit=crop`,
    }));

  return (
    <section className="homesphere-popular-locations">
      <article className="homesphere-surface-card">
        <div className="realestate-section-heading">
          <h2>Popular Locations</h2>
          <p>Discover trending neighborhoods</p>
        </div>
        <div className="homesphere-locations-carousel">
          {topLocations.map((location) => (
            <button
              key={location.name}
              type="button"
              className="homesphere-location-card"
              onClick={() => onLocationClick?.(location.name)}
            >
              <div className="homesphere-location-image">
                {/* Mock image */}
                <div
                  className="homesphere-location-image-placeholder"
                  style={{
                    backgroundColor: `hsl(${Math.random() * 360}, 70%, 60%)`,
                  }}
                />
              </div>
              <div className="homesphere-location-content">
                <strong>{location.name}</strong>
                <span>{location.count}+ listings</span>
              </div>
            </button>
          ))}
        </div>
      </article>
    </section>
  );
};

export default PopularLocations;
