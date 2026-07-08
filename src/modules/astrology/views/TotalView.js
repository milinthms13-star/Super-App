import React from "react";

const TotalView = ({
  totalLifeReadingContent,
  handleGenerateReport,
  downloadingHoroscopePeriod,
  handleDownloadHoroscopeReport,
  downloadRetryPeriod,
  handleRetryHoroscopeDownload,
}) => (
  <div className="astro-card-grid">
    <article className="astrology-panel astro-result-card astro-span-2 astro-total-card">
      <h4>Total life reading</h4>
      <p>{totalLifeReadingContent.headline}</p>
      <strong className="astro-total-guiding-principle">{totalLifeReadingContent.guidingPrinciple}</strong>
    </article>
    {totalLifeReadingContent.pillars.map((pillar) => (
      <article key={pillar.title} className="astrology-panel astro-result-card">
        <h4>{pillar.title}</h4>
        <p>{pillar.text}</p>
      </article>
    ))}
    <article className="astrology-panel astro-result-card astro-span-2">
      <h4>Total report actions</h4>
      <div className="astrology-inline-actions">
        <button type="button" className="astrology-save-button" onClick={handleGenerateReport}>
          Refresh total reading
        </button>
        <button
          type="button"
          className="astrology-secondary-button"
          disabled={downloadingHoroscopePeriod !== ""}
          onClick={() => handleDownloadHoroscopeReport("total")}
        >
          {downloadingHoroscopePeriod === "total" ? "Downloading total..." : "Download total horoscope"}
        </button>
        {downloadRetryPeriod === "total" ? (
          <button
            type="button"
            className="astrology-secondary-button"
            disabled={downloadingHoroscopePeriod !== ""}
            onClick={handleRetryHoroscopeDownload}
          >
            Retry total download
          </button>
        ) : null}
      </div>
    </article>
  </div>
);

export default TotalView;
