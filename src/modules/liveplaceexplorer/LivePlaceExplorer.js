import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { buildApiUrl } from "../../utils/api";
import "./LivePlaceExplorer.css";

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";
const OPENWEATHER_API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY || "";

const CATEGORY_CHIPS = [
  { id: "beach", label: "Beach", query: "Beach" },
  { id: "temple", label: "Temple", query: "Temple" },
  { id: "city", label: "City", query: "City center" },
  { id: "traffic", label: "Traffic hotspot", query: "Traffic intersection" },
  { id: "tourism", label: "Tourism landmark", query: "Popular tourist place" },
];

const SAMPLE_PLACES = [
  {
    place_id: "sample-marina-beach",
    name: "Marina Beach",
    formatted_address: "Chennai, Tamil Nadu, India",
    geometry: { location: { lat: 13.0500, lng: 80.2820 } },
    rating: 4.5,
    photos: [],
    liveStreamAvailable: false,
    type: "Beach",
  },
  {
    place_id: "sample-gateway-india",
    name: "Gateway of India",
    formatted_address: "Apollo Bunder, Mumbai, Maharashtra, India",
    geometry: { location: { lat: 18.9220, lng: 72.8347 } },
    rating: 4.4,
    photos: [],
    liveStreamAvailable: false,
    type: "Tourism",
  },
  {
    place_id: "sample-sach-pass",
    name: "Sach Pass",
    formatted_address: "Himachal Pradesh, India",
    geometry: { location: { lat: 32.5206, lng: 77.4460 } },
    rating: 4.7,
    photos: [],
    liveStreamAvailable: false,
    type: "Tourism",
  },
];

const buildGooglePlacesSearchUrl = (query) =>
  `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;

const buildStreetViewUrl = (lat, lng) => {
  if (!GOOGLE_MAPS_API_KEY) {
    return "";
  }

  return `https://maps.googleapis.com/maps/api/streetview?size=640x360&location=${lat},${lng}&fov=100&heading=160&pitch=0&key=${GOOGLE_MAPS_API_KEY}`;
};

const buildPlacePhotoUrl = (photoReference) => {
  if (!GOOGLE_MAPS_API_KEY || !photoReference) {
    return "";
  }

  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=640&photoreference=${photoReference}&key=${GOOGLE_MAPS_API_KEY}`;
};

const buildMapEmbedUrl = (lat, lng) => {
  if (GOOGLE_MAPS_API_KEY) {
    return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${lat},${lng}&zoom=15`;
  }

  return `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
};

const buildWeatherUrl = (lat, lng) =>
  OPENWEATHER_API_KEY
    ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${OPENWEATHER_API_KEY}`
    : "";

const createFallbackGuide = (place, weather, traffic, question) => {
  const lines = [];
  lines.push(`Explore ${place.name} in ${place.formatted_address}.`);
  lines.push(`This location offers ${place.type || "attractions"} plus map-based travel insights.`);
  if (weather) {
    lines.push(`Current weather is ${weather.description} at ${Math.round(weather.temp)}°C.`);
  }
  if (traffic) {
    lines.push(`Traffic is ${traffic}.`);
  }
  lines.push(`Use the map preview, street view image, and nearby photos to discover the place before you visit.`);
  if (question) {
    lines.push(`Answer: ${question} is best explored by checking the local map and nearby guides.`);
  }
  return lines.join(" ");
};

const LivePlaceExplorer = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [weatherInfo, setWeatherInfo] = useState(null);
  const [guideText, setGuideText] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);
  const [favoritePlaceIds, setFavoritePlaceIds] = useState([]);

  const favoritePlaces = useMemo(
    () => new Set(favoritePlaceIds || []),
    [favoritePlaceIds]
  );

  useEffect(() => {
    const stored = window.localStorage.getItem("live-place-explorer:favorites");
    if (stored) {
      try {
        setFavoritePlaceIds(JSON.parse(stored) || []);
      } catch (error) {
        setFavoritePlaceIds([]);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "live-place-explorer:favorites",
      JSON.stringify(favoritePlaceIds)
    );
  }, [favoritePlaceIds]);

  useEffect(() => {
    if (!searchResults.length && !searchTerm) {
      setSearchResults(SAMPLE_PLACES);
    }
  }, [searchResults.length, searchTerm]);

  const searchPlaces = async (query) => {
    if (!query) {
      setSearchResults(SAMPLE_PLACES);
      setStatusMessage("Enter a place name or choose a category to explore.");
      return;
    }

    setIsSearching(true);
    setStatusMessage("Looking for places...");

    try {
      if (!GOOGLE_MAPS_API_KEY) {
        const fallback = SAMPLE_PLACES.filter((place) =>
          place.name.toLowerCase().includes(query.toLowerCase()) ||
          place.formatted_address.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(fallback.length ? fallback : SAMPLE_PLACES);
        setStatusMessage(
          "Google Maps API key is not configured. Showing sample locations."
        );
        return;
      }

      const response = await axios.get(buildGooglePlacesSearchUrl(query));
      const results = Array.isArray(response.data.results)
        ? response.data.results.map((item) => ({
            place_id: item.place_id,
            name: item.name,
            formatted_address: item.formatted_address,
            geometry: item.geometry,
            rating: item.rating,
            photos: item.photos || [],
            liveStreamAvailable: false,
            type: item.types?.[0] || "Place",
          }))
        : SAMPLE_PLACES;

      setSearchResults(results);
      setStatusMessage(results.length ? "Select a place to explore." : "No matching places were found.");
    } catch (error) {
      console.error("LivePlaceExplorer search error", error);
      setSearchResults(SAMPLE_PLACES);
      setStatusMessage(
        "Unable to perform live search. Showing sample locations instead."
      );
    } finally {
      setIsSearching(false);
    }
  };

  const selectPlace = async (place) => {
    setSelectedPlace(place);
    setGuideText("");
    setAiAnswer("");
    setStatusMessage("Loading place information...");
    setWeatherInfo(null);

    const lat = place.geometry?.location?.lat;
    const lng = place.geometry?.location?.lng;

    if (lat && lng) {
      await Promise.all([fetchWeather(lat, lng), generateGuide(place)]);
    }

    setStatusMessage("");
  };

  const fetchWeather = async (lat, lng) => {
    if (!OPENWEATHER_API_KEY) {
      setWeatherInfo(null);
      return;
    }

    try {
      const response = await axios.get(buildWeatherUrl(lat, lng));
      const data = response.data;
      setWeatherInfo({
        description: data.weather?.[0]?.description || "Clear skies",
        temp: data.main?.temp,
        humidity: data.main?.humidity,
        windSpeed: data.wind?.speed,
      });
    } catch (error) {
      console.warn("LivePlaceExplorer weather fetch failed", error);
      setWeatherInfo(null);
    }
  };

  const generateGuide = async (place, question = "") => {
    if (!place) {
      return;
    }

    setIsGeneratingGuide(true);
    setStatusMessage("Generating AI guide...");
    const requestBody = {
      placeName: place.name,
      address: place.formatted_address,
      description: place.types?.join(", ") || "public place",
      weather: weatherInfo ? `${weatherInfo.description}, ${Math.round(weatherInfo.temp)}°C` : "",
      traffic: "Moderate traffic expected nearby",
      liveStatus: place.liveStreamAvailable ? "Live" : "Not Live",
      question,
    };

    try {
      const response = await axios.post(
        buildApiUrl("/live-place-explorer/guide"),
        requestBody
      );

      if (response.data?.success && response.data.guide) {
        if (question) {
          setAiAnswer(response.data.guide);
        } else {
          setGuideText(response.data.guide);
        }
      } else {
        const fallback = createFallbackGuide(place, weatherInfo, "moderate", question);
        if (question) {
          setAiAnswer(fallback);
        } else {
          setGuideText(fallback);
        }
      }
    } catch (error) {
      console.warn("AI guide request failed", error);
      const fallback = createFallbackGuide(place, weatherInfo, "moderate", question);
      if (question) {
        setAiAnswer(fallback);
      } else {
        setGuideText(fallback);
      }
    } finally {
      setIsGeneratingGuide(false);
      setStatusMessage("");
    }
  };

  const handleAiQuestionSubmit = async (event) => {
    event.preventDefault();
    if (!selectedPlace || !aiQuestion.trim()) {
      return;
    }

    await generateGuide(selectedPlace, aiQuestion.trim());
  };

  const toggleFavorite = () => {
    if (!selectedPlace) return;
    const placeId = selectedPlace.place_id;
    setFavoritePlaceIds((current) => {
      const next = new Set(current);
      if (next.has(placeId)) {
        next.delete(placeId);
      } else {
        next.add(placeId);
      }
      return Array.from(next);
    });
  };

  const copyShareLink = () => {
    if (!selectedPlace) {
      return;
    }

    const shareText = `Explore ${selectedPlace.name} on Live Place Explorer: ${window.location.href}`;
    if (navigator.share) {
      navigator.share({ title: selectedPlace.name, text: shareText, url: window.location.href });
      return;
    }

    navigator.clipboard
      .writeText(shareText)
      .then(() => setStatusMessage("Place link copied to clipboard."))
      .catch(() => setStatusMessage("Unable to copy share link."));
  };

  const reportIssue = async () => {
    if (!selectedPlace) return;
    try {
      await axios.post(buildApiUrl("/live-place-explorer/report"), {
        placeId: selectedPlace.place_id,
        placeName: selectedPlace.name,
        issue: "Public feed unavailable or inaccurate",
      });
      setStatusMessage("Report submitted. Thank you for your feedback.");
    } catch (error) {
      console.warn("LivePlaceExplorer report error", error);
      setStatusMessage("Unable to submit report right now.");
    }
  };

  const mapUrl = selectedPlace
    ? buildMapEmbedUrl(
        selectedPlace.geometry?.location?.lat,
        selectedPlace.geometry?.location?.lng
      )
    : "";

  const streetViewUrl = selectedPlace
    ? buildStreetViewUrl(
        selectedPlace.geometry?.location?.lat,
        selectedPlace.geometry?.location?.lng
      )
    : "";

  const placePhotos = selectedPlace?.photos?.slice(0, 4).map((photo) =>
    buildPlacePhotoUrl(photo.photo_reference)
  );

  const hasLiveFeed = selectedPlace?.liveStreamAvailable;

  return (
    <div className="live-place-explorer">
      <div className="live-place-explorer__header">
        <div>
          <h1>Live Place Explorer</h1>
          <p>Search places, preview maps, 360 views, weather, photos and an AI guide.</p>
        </div>
        <div className="live-place-explorer__status-banner">{statusMessage}</div>
      </div>

      <div className="live-place-explorer__search-panel">
        <div className="live-place-explorer__search-input">
          <input
            type="search"
            value={searchTerm}
            placeholder="Search for a place or landmark"
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyUp={(event) => event.key === "Enter" && searchPlaces(searchTerm)}
          />
          <button type="button" onClick={() => searchPlaces(searchTerm)} disabled={isSearching}>
            {isSearching ? "Searching…" : "Search"}
          </button>
        </div>

        <div className="live-place-explorer__chips">
          {CATEGORY_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={chip.query === placeCategory ? "active" : ""}
              onClick={() => {
                setPlaceCategory(chip.id);
                setSearchTerm(chip.query);
                searchPlaces(chip.query);
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="live-place-explorer__content-grid">
        <div className="live-place-explorer__results-section">
          <div className="live-place-explorer__section-header">
            <h2>Place search results</h2>
            <span>{searchResults.length} results</span>
          </div>
          <div className="live-place-explorer__results-list">
            {searchResults.map((place) => (
              <button
                key={place.place_id}
                type="button"
                className={`live-place-explorer__place-card ${selectedPlace?.place_id === place.place_id ? "selected" : ""}`}
                onClick={() => selectPlace(place)}
              >
                <div>
                  <strong>{place.name}</strong>
                  <p>{place.formatted_address}</p>
                </div>
                <div className="live-place-explorer__badges">
                  <span>{place.type}</span>
                  <span>{place.liveStreamAvailable ? "Live" : "Not Live"}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="live-place-explorer__detail-section">
          {selectedPlace ? (
            <>
              <div className="live-place-explorer__detail-header">
                <div>
                  <h2>{selectedPlace.name}</h2>
                  <p>{selectedPlace.formatted_address}</p>
                </div>
                <div className="live-place-explorer__detail-actions">
                  <button type="button" onClick={toggleFavorite}>
                    {favoritePlaces.has(selectedPlace.place_id) ? "★ Favorite" : "☆ Save"}
                  </button>
                  <button type="button" onClick={copyShareLink}>Share</button>
                </div>
              </div>

              <div className="live-place-explorer__overview-badges">
                <span className={hasLiveFeed ? "live" : "offline"}>{hasLiveFeed ? "Live camera available" : "Live camera not available"}</span>
                <span>{streetViewUrl ? "360° Street View" : "360° View pending"}</span>
                <span>{weatherInfo ? "Weather info" : "Weather data"}</span>
                <span>{placePhotos?.length ? "Nearby photos" : "Photos only"}</span>
              </div>

              <div className="live-place-explorer__viewer-grid">
                <div className="live-place-explorer__viewer-card">
                  <h3>Map preview</h3>
                  <div className="live-place-explorer__map-frame">
                    {mapUrl ? (
                      <iframe title="Map preview" src={mapUrl} loading="lazy" />
                    ) : (
                      <div className="live-place-explorer__placeholder">Map preview is unavailable.</div>
                    )}
                  </div>
                </div>

                <div className="live-place-explorer__viewer-card">
                  <h3>360° street view</h3>
                  {streetViewUrl ? (
                    <img src={streetViewUrl} alt={`360 view for ${selectedPlace.name}`} />
                  ) : (
                    <div className="live-place-explorer__placeholder">
                      Street View requires a Google Maps API key.
                    </div>
                  )}
                </div>
              </div>

              <div className="live-place-explorer__feature-panel">
                <div className="live-place-explorer__feature-card">
                  <h3>Weather</h3>
                  {weatherInfo ? (
                    <div>
                      <p>{weatherInfo.description}</p>
                      <p>{Math.round(weatherInfo.temp)}°C • Humidity {weatherInfo.humidity}%</p>
                      <p>Wind {weatherInfo.windSpeed} m/s</p>
                    </div>
                  ) : (
                    <p>OpenWeather API key is required for live weather data.</p>
                  )}
                </div>

                <div className="live-place-explorer__feature-card">
                  <h3>Nearby photos</h3>
                  <div className="live-place-explorer__photo-grid">
                    {placePhotos?.length ? (
                      placePhotos.map((photoUrl, index) => (
                        <img key={`${photoUrl}-${index}`} src={photoUrl} alt={`${selectedPlace.name} nearby ${index + 1}`} />
                      ))
                    ) : (
                      <div className="live-place-explorer__placeholder">No nearby photos are available.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="live-place-explorer__guide-panel">
                <div className="live-place-explorer__guide-header">
                  <h3>AI Guide</h3>
                  {isGeneratingGuide && <span>Generating AI guide…</span>}
                </div>
                <p>{guideText || "Select a place to receive an AI travel guide."}</p>
                <form className="live-place-explorer__question-form" onSubmit={handleAiQuestionSubmit}>
                  <label htmlFor="ai-question">Ask a question about this place</label>
                  <input
                    id="ai-question"
                    value={aiQuestion}
                    onChange={(event) => setAiQuestion(event.target.value)}
                    placeholder="e.g. Best time to visit?"
                  />
                  <button type="submit" disabled={!aiQuestion.trim() || isGeneratingGuide}>
                    Ask
                  </button>
                </form>
                {aiAnswer && (
                  <div className="live-place-explorer__answer-box">
                    <strong>Answer</strong>
                    <p>{aiAnswer}</p>
                  </div>
                )}
              </div>

              <div className="live-place-explorer__report-panel">
                <button type="button" className="report-button" onClick={reportIssue}>
                  Report wrong feed
                </button>
                <p className="live-place-explorer__live-badge">
                  {hasLiveFeed ? "Live camera public feed is available." : "Live camera is not publicly available for this place. You can still explore 360° view, photos, map and AI guide."}
                </p>
              </div>
            </>
          ) : (
            <div className="live-place-explorer__empty-state">
              <p>Select a place result to open the discovery panel and preview map, camera, photos and guide.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LivePlaceExplorer;
