import React, { useEffect, useMemo, useState } from "react";
import HoroscopeCard from "./HoroscopeCard";
import { astrologyService } from "../../services/astrologyService";
import { useApp } from "../../contexts/AppContext";
import useI18n from "../../hooks/useI18n";
import "../../styles/Astrology.css";

const createProfileDraft = (profile = null) => ({
  birthDate: profile?.birthDate || "",
  birthTime: profile?.birthTime || "",
  birthPlace: profile?.birthPlace || "",
  receiveDailyHoroscope: profile?.preferences?.receiveDailyHoroscope !== false,
  favoriteTopics: Array.isArray(profile?.preferences?.favoriteTopics)
    ? profile.preferences.favoriteTopics.join(", ")
    : "",
});

const parseFavoriteTopics = (value = "") =>
  String(value || "")
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean);

const formatSavedReadingDate = (value) => {
  if (!value) {
    return "Today";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const AstrologyHome = () => {
  const { t } = useI18n();
  const { currentUser } = useApp();
  const [signs, setSigns] = useState([]);
  const [selectedSign, setSelectedSign] = useState("");
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signsNotice, setSignsNotice] = useState("");
  const [readingNotice, setReadingNotice] = useState("");
  const [profile, setProfile] = useState(null);
  const [profileDraft, setProfileDraft] = useState(() => createProfileDraft());
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileNotice, setProfileNotice] = useState("");
  const [saveState, setSaveState] = useState({ type: "", message: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    let active = true;

    const loadSigns = async () => {
      try {
        const nextSigns = await astrologyService.getSigns();
        if (!active) {
          return;
        }

        setSigns(nextSigns);
        setSelectedSign((currentSign) => currentSign || nextSigns[0]?.sign || "aries");
        setSignsNotice("");
      } catch (loadError) {
        if (!active) {
          return;
        }

        const fallbackSigns = loadError.fallbackData || astrologyService.getFallbackSigns();
        setSigns(fallbackSigns);
        setSignsNotice(
          loadError.message ||
            "Live astrology signs are unavailable right now. Built-in sign data is being shown."
        );
        setSelectedSign((currentSign) => currentSign || fallbackSigns[0]?.sign || "aries");
      }
    };

    loadSigns();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setProfileLoading(true);

      try {
        const nextProfile = await astrologyService.getProfile();
        if (!active) {
          return;
        }

        setProfile(nextProfile);
        setProfileDraft(createProfileDraft(nextProfile));
        setProfileNotice("");

        if (nextProfile?.sign) {
          setSelectedSign(nextProfile.sign);
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        setProfile(null);
        setProfileDraft(createProfileDraft());
        setProfileNotice(loadError.message || "Unable to load your astrology profile.");
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedSign) {
      return;
    }

    let active = true;
    setLoading(true);

    const loadReading = async () => {
      try {
        const nextReading = await astrologyService.getDailyHoroscope(selectedSign);
        if (!active) {
          return;
        }

        setReading(nextReading);
        setReadingNotice("");
      } catch (loadError) {
        if (!active) {
          return;
        }

        setReading(loadError.fallbackData || astrologyService.getFallbackReading(selectedSign));
        setReadingNotice(
          loadError.message ||
            "Live astrology is unavailable right now. Showing an offline reading instead."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadReading();

    return () => {
      active = false;
    };
  }, [selectedSign]);

  const selectedSignDetails =
    signs.find((entry) => entry.sign === selectedSign) ||
    reading ||
    astrologyService.getFallbackSign(selectedSign);

  const cardNotice = readingNotice || signsNotice;
  const recentSavedReadings = useMemo(
    () =>
      [...(profile?.savedReadings || [])]
        .sort((left, right) => new Date(right.readingDate) - new Date(left.readingDate))
        .slice(0, 4),
    [profile?.savedReadings]
  );

  const handleDraftChange = (field, value) => {
    setProfileDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
    setSaveState({ type: "", message: "" });
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setSaveState({ type: "", message: "" });

    try {
      const updatedProfile = await astrologyService.updateProfile({
        sign: selectedSign || signs[0]?.sign || "aries",
        birthDate: profileDraft.birthDate,
        birthTime: profileDraft.birthTime,
        birthPlace: profileDraft.birthPlace,
        preferences: {
          receiveDailyHoroscope: profileDraft.receiveDailyHoroscope,
          favoriteTopics: parseFavoriteTopics(profileDraft.favoriteTopics),
        },
      });

      setProfile(updatedProfile);
      setProfileDraft(createProfileDraft(updatedProfile));
      setSelectedSign(updatedProfile.sign || selectedSign);
      setProfileNotice("");
      setSaveState({
        type: "success",
        message:
          "Your astrology profile was saved, and today's reading is now stored in your recent history.",
      });
    } catch (saveError) {
      setSaveState({
        type: "error",
        message: saveError.message || "Unable to save your astrology profile.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <section className="astrology-home">
      <div className="astrology-shell">
        <header className="astrology-hero">
          <span className="astrology-kicker">{t("modules.astrology", "AstroNila")}</span>
          <h1>{t("astrology.title", "Daily horoscope with a Kerala-first feel")}</h1>
          <p>
            {t(
              "astrology.subtitle",
              "Choose your sign to see today's energy, timing, and a grounded next step."
            )}
          </p>
        </header>

        <div className="astrology-layout">
          <aside className="astrology-sidebar">
            <div className="astrology-panel astrology-selector">
              <h2>{t("astrology.selectSign", "Select your sign")}</h2>
              <div className="astrology-sign-grid">
                {signs.map((sign) => (
                  <button
                    key={sign.sign}
                    type="button"
                    className={`astrology-sign-button ${
                      selectedSign === sign.sign ? "is-active" : ""
                    }`}
                    onClick={() => setSelectedSign(sign.sign)}
                  >
                    <span className="astrology-sign-name">{sign.label}</span>
                    <span className="astrology-sign-range">{sign.dateRange}</span>
                  </button>
                ))}
              </div>
            </div>

            <form className="astrology-panel astrology-profile" onSubmit={handleProfileSave}>
              <div className="astrology-profile-header">
                <div>
                  <span className="astrology-note-label">Profile</span>
                  <h2>Save your astrology details</h2>
                </div>
                <span className="astrology-profile-chip">
                  {selectedSignDetails?.label || "Sign"}
                </span>
              </div>

              <p className="astrology-profile-copy">
                Save your preferred sign, birth details, and favorite topics for{" "}
                {currentUser?.name || "your account"}.
              </p>

              {profileLoading ? (
                <p className="astrology-inline-message">Loading your saved profile...</p>
              ) : null}
              {profileNotice ? (
                <p className="astrology-inline-message astrology-inline-message-warning">
                  {profileNotice}
                </p>
              ) : null}
              {saveState.message ? (
                <p
                  className={`astrology-inline-message ${
                    saveState.type === "error"
                      ? "astrology-inline-message-error"
                      : "astrology-inline-message-success"
                  }`}
                >
                  {saveState.message}
                </p>
              ) : null}

              <div className="astrology-form-grid">
                <label className="astrology-field">
                  <span>Birth date</span>
                  <input
                    type="date"
                    value={profileDraft.birthDate}
                    onChange={(event) => handleDraftChange("birthDate", event.target.value)}
                  />
                </label>

                <label className="astrology-field">
                  <span>Birth time</span>
                  <input
                    type="time"
                    value={profileDraft.birthTime}
                    onChange={(event) => handleDraftChange("birthTime", event.target.value)}
                  />
                </label>
              </div>

              <label className="astrology-field">
                <span>Birth place</span>
                <input
                  type="text"
                  value={profileDraft.birthPlace}
                  onChange={(event) => handleDraftChange("birthPlace", event.target.value)}
                  placeholder="Kochi, Kerala"
                />
              </label>

              <label className="astrology-field">
                <span>Favorite topics</span>
                <input
                  type="text"
                  value={profileDraft.favoriteTopics}
                  onChange={(event) => handleDraftChange("favoriteTopics", event.target.value)}
                  placeholder="career, relationships, finance"
                />
              </label>

              <label className="astrology-checkbox">
                <input
                  type="checkbox"
                  checked={profileDraft.receiveDailyHoroscope}
                  onChange={(event) =>
                    handleDraftChange("receiveDailyHoroscope", event.target.checked)
                  }
                />
                <span>Keep daily horoscope reminders enabled for this profile.</span>
              </label>

              <button type="submit" className="astrology-save-button" disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save profile and today's reading"}
              </button>

              <div className="astrology-history">
                <div className="astrology-history-header">
                  <h3>Recent saved readings</h3>
                  <span>{recentSavedReadings.length}</span>
                </div>

                {recentSavedReadings.length > 0 ? (
                  recentSavedReadings.map((savedReading) => (
                    <button
                      key={`${savedReading.sign}-${savedReading.readingDate}`}
                      type="button"
                      className="astrology-history-item"
                      onClick={() => setSelectedSign(savedReading.sign)}
                    >
                      <div className="astrology-history-meta">
                        <strong>
                          {astrologyService.getFallbackSign(savedReading.sign).label}
                        </strong>
                        <span>{formatSavedReadingDate(savedReading.readingDate)}</span>
                      </div>
                      <p>{savedReading.horoscope}</p>
                    </button>
                  ))
                ) : (
                  <p className="astrology-history-empty">
                    Save your profile once to keep a small history of recent readings here.
                  </p>
                )}
              </div>
            </form>
          </aside>

          <div className="astrology-main">
            <HoroscopeCard
              sign={selectedSignDetails}
              horoscope={reading}
              loading={loading}
              notice={cardNotice}
            />

            <div className="astrology-notes">
              <article className="astrology-panel">
                <span className="astrology-note-label">
                  {t("astrology.element", "Element")}
                </span>
                <h3>{selectedSignDetails?.element || "Cosmic Flow"}</h3>
                <p>
                  {selectedSignDetails?.element === "Fire"
                    ? "Lead with action, but keep your pace steady enough to finish well."
                    : selectedSignDetails?.element === "Earth"
                      ? "Choose practical wins today. Small consistent steps will compound."
                      : selectedSignDetails?.element === "Air"
                        ? "Communication opens doors. Ask, clarify, and keep your plans flexible."
                        : "Protect your energy first. Clarity comes after a little quiet."}
                </p>
              </article>

              <article className="astrology-panel">
                <span className="astrology-note-label">
                  {t("astrology.guidance", "Guidance")}
                </span>
                <h3>{t("astrology.bestMove", "Best move for today")}</h3>
                <p>
                  {reading?.horoscope ||
                    "A thoughtful choice made early in the day will reduce stress later."}
                </p>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AstrologyHome;
