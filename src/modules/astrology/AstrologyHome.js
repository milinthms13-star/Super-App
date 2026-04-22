import React, { useEffect, useState } from "react";
import HoroscopeCard from "./HoroscopeCard";
import { astrologyService } from "../../services/astrologyService";
import useI18n from "../../hooks/useI18n";
import "../../styles/Astrology.css";

const AstrologyHome = () => {
  const { t } = useI18n();
  const [signs, setSigns] = useState([]);
  const [selectedSign, setSelectedSign] = useState("");
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadSigns = async () => {
      try {
        const nextSigns = await astrologyService.getSigns();
        if (!active) {
          return;
        }

        setSigns(nextSigns);
        setSelectedSign(nextSigns[0]?.sign || "aries");
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Unable to load astrology signs.");
        }
      }
    };

    loadSigns();

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
        setError("");
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Unable to load the daily horoscope.");
        }
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
    signs.find((entry) => entry.sign === selectedSign) || reading || astrologyService.getFallbackSign(selectedSign);

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
          <aside className="astrology-panel astrology-selector">
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
          </aside>

          <div className="astrology-main">
            <HoroscopeCard
              sign={selectedSignDetails}
              horoscope={reading}
              loading={loading}
              error={error}
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
