import React from "react";

const LOCATION_GRADIENTS = [
  "linear-gradient(135deg, #8dc5b6 0%, #2c7a7b 100%)",
  "linear-gradient(135deg, #7ca2e0 0%, #3048a1 100%)",
  "linear-gradient(135deg, #f0c27b 0%, #8c6239 100%)",
  "linear-gradient(135deg, #77c5d5 0%, #2f4f8f 100%)",
  "linear-gradient(135deg, #f2a7a7 0%, #8f4651 100%)",
  "linear-gradient(135deg, #a8d28e 0%, #3d7f4d 100%)",
  "linear-gradient(135deg, #b99ae0 0%, #5d3d8f 100%)",
  "linear-gradient(135deg, #f5c38b 0%, #b57a2f 100%)",
];

const PopularLocations = ({ locations, onLocationClick }) => {
  const topLocations = locations
    .filter((loc) => loc !== "All")
    .slice(0, 8)
    .map((loc, idx) => ({
      name: loc,
      count: 48 + idx * 13,
      gradient: LOCATION_GRADIENTS[idx % LOCATION_GRADIENTS.length],
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
                <div
                  className="homesphere-location-image-placeholder"
                  style={{ background: location.gradient }}
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
