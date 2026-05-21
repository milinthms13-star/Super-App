import React from "react";
import HoroscopeCard from "../HoroscopeCard";

const TodayView = ({
  personalizedReady,
  localize,
  language,
  heroPrediction,
  selectedSign,
  getRashiSummary,
  getCareerAdvice,
  getFinanceAdvice,
  getRemedyTips,
  panchangam,
  getNakshatraDisplayName,
  profileApi,
  getNakshatraFromSign,
  handleQuickSave,
  futureClarityMetrics,
  actionOutcomeScenarios,
  futureTimelineCards,
  handleGenerateReport,
  downloadingHoroscopePeriod,
  handleDownloadHoroscopeReport,
  showFullPrediction,
  selectedSignDetails,
  reading,
  loading,
  readingNotice,
  signsNotice,
  todayEnergyScore,
}) => (
  <div className="astro-card-grid">
    {personalizedReady ? (
      <>
        <article className="astrology-panel astro-result-card"><h4>Summary</h4><p>{heroPrediction}</p></article>
        <article className="astrology-panel astro-result-card"><h4>Today's guidance</h4><p>{getRashiSummary(selectedSign)}</p></article>
        <article className="astrology-panel astro-result-card"><h4>Career advice</h4><p>{getCareerAdvice(selectedSign)}</p></article>
        <article className="astrology-panel astro-result-card"><h4>Finance advice</h4><p>{getFinanceAdvice(selectedSign)}</p></article>
        <article className="astrology-panel astro-result-card"><h4>Remedies</h4><ul>{getRemedyTips(selectedSign).map((tip) => <li key={tip}>{tip}</li>)}</ul></article>
        <article className="astrology-panel astro-result-card">
          <h4>Panchangam</h4>
          <ul>
            <li>Tithi: {panchangam?.tithi || "Shukla Paksha Tritiya"}</li>
            <li>Nakshatra: {getNakshatraDisplayName(panchangam?.nakshatra || profileApi.profileDraft.nakshatra || getNakshatraFromSign(selectedSign), language)}</li>
            <li>Rahu Kalam: {panchangam?.rahuKalam || "10:30 AM - 12:00 PM"}</li>
          </ul>
          <button type="button" className="astrology-save-button" onClick={handleQuickSave}>Save report</button>
        </article>
        <article className="astrology-panel astro-result-card astro-span-2 astro-future-clarity-card">
          <h4>Future clarity dashboard</h4>
          <p>Use this directional map for planning. If you act with consistency, outcomes usually improve in the same cycle.</p>
          <div className="astro-future-metric-grid">
            <div className="astro-future-metric-card">
              <span>Momentum</span>
              <strong>{futureClarityMetrics.momentum}%</strong>
              <div className="astro-future-meter"><span style={{ width: `${futureClarityMetrics.momentum}%` }} /></div>
            </div>
            <div className="astro-future-metric-card">
              <span>Stability</span>
              <strong>{futureClarityMetrics.stability}%</strong>
              <div className="astro-future-meter"><span style={{ width: `${futureClarityMetrics.stability}%` }} /></div>
            </div>
            <div className="astro-future-metric-card">
              <span>Caution</span>
              <strong>{futureClarityMetrics.caution}%</strong>
              <div className="astro-future-meter is-caution"><span style={{ width: `${futureClarityMetrics.caution}%` }} /></div>
            </div>
          </div>
        </article>
        <article className="astrology-panel astro-result-card astro-span-2">
          <h4>If you do this, this is likely to happen</h4>
          <div className="astro-outcome-grid">
            {actionOutcomeScenarios.map((scenario) => (
              <article key={scenario.title} className="astro-outcome-card">
                <h5>{scenario.title}</h5>
                <p className="astro-outcome-action"><strong>Action:</strong> {scenario.action}</p>
                <p><span className="astro-outcome-badge is-positive">Likely if done</span>{scenario.ifDone}</p>
                <p><span className="astro-outcome-badge is-warning">If ignored</span>{scenario.ifSkipped}</p>
              </article>
            ))}
          </div>
        </article>
        <article className="astrology-panel astro-result-card astro-span-2">
          <h4>Future timeline</h4>
          <div className="astro-timeline-grid">
            {futureTimelineCards.map((item) => (
              <article key={item.window} className="astro-timeline-card">
                <strong>{item.window}</strong>
                <p>{item.guidance}</p>
              </article>
            ))}
          </div>
        </article>
        <article className="astrology-panel astro-result-card">
          <h4>Horoscope actions</h4>
          <button type="button" className="astrology-save-button" onClick={handleGenerateReport}>Generate horoscope report</button>
          <button
            type="button"
            className="astrology-secondary-button"
            disabled={downloadingHoroscopePeriod !== ""}
            onClick={() => handleDownloadHoroscopeReport("year")}
          >
            {downloadingHoroscopePeriod === "year"
              ? "Downloading yearly..."
              : "Download yearly horoscope"}
          </button>
          <button
            type="button"
            className="astrology-secondary-button"
            disabled={downloadingHoroscopePeriod !== ""}
            onClick={() => handleDownloadHoroscopeReport("total")}
          >
            {downloadingHoroscopePeriod === "total"
              ? "Downloading total..."
              : "Download total horoscope"}
          </button>
        </article>
        {showFullPrediction ? (
          <HoroscopeCard
            sign={selectedSignDetails}
            horoscope={reading}
            loading={loading}
            notice={readingNotice || signsNotice}
            energyScore={todayEnergyScore}
            futureTimeline={futureTimelineCards}
            actionScenarios={actionOutcomeScenarios}
          />
        ) : null}
      </>
    ) : (
      <article className="astrology-panel astro-result-card astro-span-2">
        <h4>{localize("Personal details needed", "\u0d35\u0d4d\u0d2f\u0d15\u0d4d\u0d24\u0d3f\u0d17\u0d24 \u0d35\u0d3f\u0d35\u0d30\u0d19\u0d4d\u0d19\u0d7e \u0d06\u0d35\u0d36\u0d4d\u0d2f\u0d2e\u0d3e\u0d23\u0d4d", language)}</h4>
        <p>{localize("Enter DOB, birth time, place, and gender in the Kundli or Profile tab to unlock personalized predictions.", "Kundli/Profile \u0d1f\u0d3e\u0d2c\u0d3f\u0d7d DOB, \u0d1c\u0d28\u0d28\u0d38\u0d2e\u0d2f\u0d02, \u0d38\u0d4d\u0d25\u0d32\u0d02, \u0d32\u0d3f\u0d02\u0d17\u0d02 \u0d28\u0d7d\u0d15\u0d3f \u0d35\u0d4d\u0d2f\u0d15\u0d4d\u0d24\u0d3f\u0d17\u0d24 \u0d2b\u0d32\u0d02 \u0d05\u0d7a\u0d32\u0d4b\u0d15\u0d4d \u0d1a\u0d46\u0d2f\u0d4d\u0d2f\u0d42.", language)}</p>
      </article>
    )}
  </div>
);

export default TodayView;

