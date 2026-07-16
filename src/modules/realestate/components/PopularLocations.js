import React, { useMemo } from "react";
import { MARKET_TRENDS } from "../realEstateConstants";

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

/**
 * PopularLocations — shows real listing counts from the properties array
 * and enriches each city with market trend data where available.
 */
const PopularLocations = ({ locations = [], properties = [], onLocationClick }) => {
  const enrichedLocations = useMemo(() => {
    // Build real listing counts from properties
    const countMap = {};
    (properties || []).forEach((p) => {
      const city = (p.location || "").trim();
      if (city && city !== "All") countMap[city] = (countMap[city] || 0) + 1;
    });

    // Fallback: use the locations array with 0 counts if no property data
    const cityList = Object.keys(countMap).length > 0
      ? Object.entries(countMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([name, count]) => ({ name, count }))
      : (locations || [])
          .filter((l) => l !== "All")
          .slice(0, 8)
          .map((name) => ({ name, count: 0 }));

    return cityList.map((item, idx) => {
      const trendKey = Object.keys(MARKET_TRENDS).find(
        (k) => k.toLowerCase() === item.name.toLowerCase()
      );
      const trend = trendKey ? MARKET_TRENDS[trendKey] : null;
      return {
        ...item,
        gradient: LOCATION_GRADIENTS[idx % LOCATION_GRADIENTS.length],
        yoyGrowth: trend?.yoyGrowthPct ?? null,
        demandIndex: trend?.demandIndex ?? null,
        avgPpsf: trend?.avgPricePerSqft ?? null,
      };
    });
  }, [locations, properties]);

  if (enrichedLocations.length === 0) return null;

  return (
    <section className="homesphere-popular-locations">
      <article className="homesphere-surface-card">
        <div className="realestate-section-heading">
          <h2>Popular Locations</h2>
          <p>Browse by city — real listing counts and market signals</p>
        </div>

        <div className="homesphere-locations-carousel">
          {enrichedLocations.map((location) => (
            <button
              key={location.name}
              type="button"
              className="re-location-card"
              onClick={() => onLocationClick?.(location.name)}
              aria-label={`Browse ${location.name} — ${location.count} listings`}
            >
              <div
                className="re-location-image"
                style={{ background: location.gradient }}
                aria-hidden="true"
              >
                <span className="re-location-initial">
                  {location.name.charAt(0)}
                </span>
              </div>

              <div className="re-location-content">
                <strong>{location.name}</strong>
                <span className="re-location-count">
                  {location.count > 0
                    ? `${location.count} listing${location.count !== 1 ? "s" : ""}`
                    : "Listings available"}
                </span>

                {location.yoyGrowth != null && (
                  <span className="re-location-growth">
                    📈 +{location.yoyGrowth}% YoY
                  </span>
                )}
                {location.demandIndex && (
                  <span className="re-location-demand">{location.demandIndex} demand</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </article>
    </section>
  );
};

export default PopularLocations;
