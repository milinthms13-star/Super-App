import React from "react";

const HoroscopeCard = ({
  sign,
  horoscope,
  loading = false,
  notice = "",
  energyScore = null,
  futureTimeline = [],
  actionScenarios = [],
}) => {
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
      {notice ? <p className="astrology-card-notice">{notice}</p> : null}

      {!loading ? <p className="astrology-card-body">{description}</p> : null}

      {!loading ? (
        <div className="astrology-card-signal-row">
          <span className="astrology-card-signal">
            <strong>Theme</strong>
            <em>{sign?.element || "Cosmic flow"}</em>
          </span>
          <span className="astrology-card-signal">
            <strong>Energy</strong>
            <em>{energyScore ? `${energyScore}/10` : "Balanced"}</em>
          </span>
          <span className="astrology-card-signal">
            <strong>Mode</strong>
            <em>{energyScore >= 7 ? "Act" : "Observe and plan"}</em>
          </span>
        </div>
      ) : null}

      {!loading && actionScenarios.length ? (
        <div className="astrology-card-outcomes">
          <h3>Action clarity</h3>
          {actionScenarios.slice(0, 2).map((item) => (
            <article key={item.title} className="astrology-card-outcome">
              <strong>{item.title}</strong>
              <p>{item.action}</p>
              <small>{item.ifDone}</small>
            </article>
          ))}
        </div>
      ) : null}

      {!loading && futureTimeline.length ? (
        <div className="astrology-card-timeline">
          {futureTimeline.map((item) => (
            <div key={item.window}>
              <strong>{item.window}</strong>
              <p>{item.guidance}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="astrology-card-footer">
        <span>{sign?.label ? `${sign.label} outlook` : "Personal guidance"}</span>
        <span>{generatedAt || "Freshly prepared for today"}</span>
      </div>
    </article>
  );
};

export default HoroscopeCard;
