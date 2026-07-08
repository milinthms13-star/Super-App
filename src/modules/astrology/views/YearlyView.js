import React from "react";

const YearlyView = ({
  yearlyHoroscopeContent,
  downloadingHoroscopePeriod,
  handleDownloadHoroscopeReport,
  downloadRetryPeriod,
  handleRetryHoroscopeDownload,
}) => (
  <div className="astro-card-grid">
    <article className="astrology-panel astro-result-card astro-span-2 astro-yearly-card">
      <h4>{new Date().getFullYear()} yearly horoscope</h4>
      <p>{yearlyHoroscopeContent.headline}</p>
      <div className="astro-yearly-pillars">
        {yearlyHoroscopeContent.quarterPlan.map((line) => (
          <div key={line} className="astro-yearly-pillar">
            <strong>{line.split(":")[0]}</strong>
            <p>{line.split(":").slice(1).join(":").trim()}</p>
          </div>
        ))}
      </div>
    </article>
    <article className="astrology-panel astro-result-card">
      <h4>Yearly opportunities</h4>
      <ul>
        {yearlyHoroscopeContent.keyWins.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
    <article className="astrology-panel astro-result-card">
      <h4>Yearly caution</h4>
      <p>{yearlyHoroscopeContent.caution}</p>
      <button
        type="button"
        className="astrology-secondary-button"
        disabled={downloadingHoroscopePeriod !== ""}
        onClick={() => handleDownloadHoroscopeReport("year")}
      >
        {downloadingHoroscopePeriod === "year" ? "Downloading yearly..." : "Download yearly horoscope"}
      </button>
      {downloadRetryPeriod === "year" ? (
        <button
          type="button"
          className="astrology-secondary-button"
          disabled={downloadingHoroscopePeriod !== ""}
          onClick={handleRetryHoroscopeDownload}
        >
          Retry yearly download
        </button>
      ) : null}
    </article>
  </div>
);

export default YearlyView;
