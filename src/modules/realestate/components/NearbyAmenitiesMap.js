import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * NearbyAmenitiesMap
 *
 * Uses the free Overpass API (OpenStreetMap data) to fetch real nearby amenities
 * (schools, hospitals, bus stops, metro, restaurants) within a radius.
 * Falls back to the stored property data (nearbySchoolKm, etc.) if coordinates
 * are unavailable or the API call fails.
 *
 * API: https://overpass-api.de/api/interpreter — completely free, no key needed.
 */

const CATEGORY_CONFIG = [
  {
    key: "school",
    label: "Schools",
    icon: "🏫",
    query: (lat, lng, r) =>
      `node["amenity"~"school|kindergarten"](around:${r},${lat},${lng});`,
    color: "#2196a0",
  },
  {
    key: "hospital",
    label: "Hospitals",
    icon: "🏥",
    query: (lat, lng, r) =>
      `node["amenity"~"hospital|clinic|doctors"](around:${r},${lat},${lng});`,
    color: "#c84d4d",
  },
  {
    key: "transit",
    label: "Transit",
    icon: "🚌",
    query: (lat, lng, r) =>
      `node["highway"="bus_stop"](around:${r},${lat},${lng});
       node["railway"~"station|subway_entrance"](around:${r},${lat},${lng});`,
    color: "#7b5ea7",
  },
  {
    key: "supermarket",
    label: "Supermarkets",
    icon: "🛒",
    query: (lat, lng, r) =>
      `node["shop"~"supermarket|convenience"](around:${r},${lat},${lng});`,
    color: "#c98a2e",
  },
  {
    key: "park",
    label: "Parks",
    icon: "🌳",
    query: (lat, lng, r) =>
      `node["leisure"~"park|garden"](around:${r},${lat},${lng});
       way["leisure"~"park|garden"](around:${r},${lat},${lng});`,
    color: "#0d7a69",
  },
];

const RADIUS_OPTIONS = [500, 1000, 2000];

const buildOverpassQuery = (lat, lng, radius) => {
  const parts = CATEGORY_CONFIG.flatMap((cat) =>
    cat.query(lat, lng, radius).trim().split("\n").map((l) => l.trim())
  );
  return `[out:json][timeout:20];(${parts.join("")});out body;`;
};

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const categoriseElement = (el) => {
  const tags = el.tags || {};
  if (tags.amenity === "hospital" || tags.amenity === "clinic" || tags.amenity === "doctors") return "hospital";
  if (tags.amenity === "school" || tags.amenity === "kindergarten") return "school";
  if (tags.highway === "bus_stop" || tags.railway) return "transit";
  if (tags.shop === "supermarket" || tags.shop === "convenience") return "supermarket";
  if (tags.leisure === "park" || tags.leisure === "garden") return "park";
  return null;
};

const NearbyAmenitiesMap = ({ property }) => {
  const [radius, setRadius] = useState(1000);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error | no-coords
  const [amenities, setAmenities] = useState({});
  const [activeCategory, setActiveCategory] = useState("school");
  const abortRef = useRef(null);

  const lat = property?.mapLocationLat;
  const lng = property?.mapLocationLng;
  const hasCoords = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);

  const fetchAmenities = useCallback(async () => {
    if (!hasCoords) {
      setStatus("no-coords");
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setStatus("loading");
    setAmenities({});

    try {
      const query = buildOverpassQuery(lat, lng, radius);
      const resp = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: abortRef.current.signal,
      });

      if (!resp.ok) throw new Error(`Overpass API error: ${resp.status}`);

      const data = await resp.json();
      const grouped = {};

      (data.elements || []).forEach((el) => {
        const cat = categoriseElement(el);
        if (!cat) return;
        if (!grouped[cat]) grouped[cat] = [];
        const elLat = el.lat ?? (el.center?.lat);
        const elLng = el.lon ?? (el.center?.lon);
        const distKm =
          elLat != null && elLng != null
            ? haversineKm(lat, lng, elLat, elLng)
            : null;
        const name = el.tags?.name || el.tags?.["name:en"] || "Unnamed";
        grouped[cat].push({
          id: el.id,
          name,
          distKm: distKm != null ? Math.round(distKm * 100) / 100 : null,
          address: el.tags?.["addr:full"] || el.tags?.["addr:street"] || "",
        });
      });

      // Sort each category by distance
      Object.values(grouped).forEach((items) =>
        items.sort((a, b) => (a.distKm ?? 99) - (b.distKm ?? 99))
      );

      setAmenities(grouped);
      setStatus("success");
    } catch (err) {
      if (err.name === "AbortError") return;
      setStatus("error");
    }
  }, [hasCoords, lat, lng, radius]);

  useEffect(() => {
    fetchAmenities();
    return () => abortRef.current?.abort();
  }, [fetchAmenities]);

  const activeCat = CATEGORY_CONFIG.find((c) => c.key === activeCategory);
  const activeItems = (amenities[activeCategory] || []).slice(0, 8);

  // Fallback data from property fields
  const fallbackItems = [];
  if (!hasCoords) {
    if (property?.nearbySchoolKm)
      fallbackItems.push({ key: "school", label: `School within ${property.nearbySchoolKm} km`, icon: "🏫" });
    if (property?.nearbyHospitalKm)
      fallbackItems.push({ key: "hospital", label: `Hospital within ${property.nearbyHospitalKm} km`, icon: "🏥" });
    if (property?.nearbyMetroKm)
      fallbackItems.push({ key: "transit", label: `Metro within ${property.nearbyMetroKm} km`, icon: "🚇" });
  }

  const osmMapUrl =
    hasCoords
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02}%2C${lat - 0.02}%2C${lng + 0.02}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lng}`
      : null;

  return (
    <section className="re-nearby-panel">
      <div className="re-nearby-header">
        <h4>Nearby Amenities</h4>
        {hasCoords && (
          <div className="re-nearby-radius-select">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                className={`re-nearby-radius-btn ${radius === r ? "active" : ""}`}
                onClick={() => setRadius(r)}
              >
                {r >= 1000 ? `${r / 1000} km` : `${r} m`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* EMBEDDED MAP */}
      {osmMapUrl && (
        <div className="re-nearby-map-embed">
          <iframe
            title="Nearby amenities map"
            src={osmMapUrl}
            loading="lazy"
            allowFullScreen
          />
          <a
            href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
            target="_blank"
            rel="noreferrer"
            className="re-nearby-map-link"
          >
            Open full map ↗
          </a>
        </div>
      )}

      {/* CATEGORY TABS */}
      {hasCoords && (
        <div className="re-nearby-category-tabs" role="tablist">
          {CATEGORY_CONFIG.map((cat) => {
            const count = (amenities[cat.key] || []).length;
            return (
              <button
                key={cat.key}
                type="button"
                role="tab"
                aria-selected={activeCategory === cat.key}
                className={`re-nearby-cat-tab ${activeCategory === cat.key ? "active" : ""}`}
                style={activeCategory === cat.key ? { borderColor: cat.color, color: cat.color } : {}}
                onClick={() => setActiveCategory(cat.key)}
              >
                {cat.icon} {cat.label}
                {status === "success" && (
                  <span className="re-nearby-count">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* STATUS: LOADING */}
      {status === "loading" && (
        <div className="re-nearby-status">
          <div className="re-nearby-spinner" aria-label="Loading amenities" />
          <span>Fetching live data from OpenStreetMap…</span>
        </div>
      )}

      {/* STATUS: ERROR */}
      {status === "error" && (
        <div className="re-nearby-status re-nearby-status-error">
          <span>⚠️ Could not fetch live amenity data.</span>
          <button type="button" className="realestate-inline-button" onClick={fetchAmenities}>
            Retry
          </button>
        </div>
      )}

      {/* STATUS: NO COORDS */}
      {status === "no-coords" && (
        <div className="re-nearby-fallback">
          {fallbackItems.length > 0 ? (
            <>
              <p className="re-nearby-fallback-note">GPS coordinates not set — showing stored data.</p>
              <ul className="re-nearby-fallback-list">
                {fallbackItems.map((f) => (
                  <li key={f.key}>
                    <span>{f.icon}</span>
                    <span>{f.label}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="re-nearby-fallback-note">No location coordinates or nearby data available for this listing.</p>
          )}
        </div>
      )}

      {/* RESULTS LIST */}
      {status === "success" && (
        <>
          {activeItems.length === 0 ? (
            <p className="re-nearby-empty">
              No {activeCat?.label.toLowerCase()} found within {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}.
            </p>
          ) : (
            <ul className="re-nearby-list">
              {activeItems.map((item) => (
                <li key={item.id} className="re-nearby-item">
                  <span className="re-nearby-item-icon">{activeCat?.icon}</span>
                  <div className="re-nearby-item-info">
                    <strong>{item.name}</strong>
                    {item.address && <span>{item.address}</span>}
                  </div>
                  {item.distKm != null && (
                    <span className="re-nearby-dist">{item.distKm} km</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="re-nearby-source">
            Data: <a href="https://www.openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a> via Overpass API · Free &amp; open
          </p>
        </>
      )}
    </section>
  );
};

export default NearbyAmenitiesMap;
