import React from "react";

const HoroscopeCard = ({ sign, horoscope, loading = false, error = "" }) => {
  const cardAccent = sign?.color || "#bd8b28";
  const label = sign?.label || sign?.sign || "Astrology";
  const description =
    horoscope?.horoscope ||
    sign?.horoscope ||
    "Gentle progress comes from staying consistent with the work already in front of you.";

  const generatedAt = horoscope?.generatedAt
    ? new Date(horoscope.generatedAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

  return (
    <article className="astrology-card" style={{ "--astrology-accent": cardAccent }}>
      <div className="astrology-card-header">
        <div>
          <span className="astrology-card-kicker">Daily Reading</span>
          <h2>{label}</h2>
        </div>
        <div className="astrology-card-meta">
          <span>{sign?.dateRange || "Today"}</span>
          <strong>{sign?.element || "Cosmic"}</strong>
        </div>
      </div>

      {loading ? <p className="astrology-card-loading">Reading the chart...</p> : null}
      {error ? <p className="astrology-card-error">{error}</p> : null}

      {!loading ? <p className="astrology-card-body">{description}</p> : null}

      <div className="astrology-card-footer">
        <span>{sign?.label ? `${sign.label} outlook` : "Personal guidance"}</span>
        <span>{generatedAt || "Freshly prepared for today"}</span>
      </div>
    </article>
  );
};

export default HoroscopeCard;
