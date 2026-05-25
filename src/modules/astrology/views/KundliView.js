import React from "react";

const KundliView = ({
  profileApi,
  handleBirthPlaceChange,
  BIRTH_LOCATION_OPTIONS,
  BIRTH_TIMEZONE_OPTIONS,
  handleBirthTimezoneChange,
  getCanonicalNakshatraName,
  handleNakshatraChange,
  NAKSHATRA_NAMES,
  getNakshatraDisplayName,
  language,
  GENDER_OPTIONS,
  question,
  setQuestion,
  detailedReport,
  setDetailedReport,
  handleGenerateReport,
  kundliApi,
  selectedSign,
  getRashiFromSign,
  squarePlanetChart,
  downloadingHoroscopePeriod,
  handleDownloadHoroscopeReport,
  downloadRetryPeriod,
  handleRetryHoroscopeDownload,
}) => (
  <div className="astro-card-grid">
    <article className="astrology-panel astro-result-card astro-span-2">
      <h4>Birth details</h4>
      <div className="astro-compact-form">
        <label className="astrology-field"><span>Date of birth</span><input type="date" value={profileApi.profileDraft.birthDate} onChange={(event) => profileApi.handleDraftChange("birthDate", event.target.value)} /></label>
        <label className="astrology-field"><span>Time of birth</span><input type="time" value={profileApi.profileDraft.birthTime} onChange={(event) => profileApi.handleDraftChange("birthTime", event.target.value)} /></label>
        <label className="astrology-field"><span>Place of birth</span><input type="text" list="astro-birth-place-options-kundli" value={profileApi.profileDraft.birthPlace} onChange={(event) => handleBirthPlaceChange(event.target.value)} /><datalist id="astro-birth-place-options-kundli">{BIRTH_LOCATION_OPTIONS.map((option) => <option key={option.label} value={option.label} />)}</datalist></label>
        <label className="astrology-field"><span>Birth timezone</span><select value={profileApi.profileDraft.birthTimezone || "Asia/Kolkata"} onChange={(event) => handleBirthTimezoneChange(event.target.value)}>{BIRTH_TIMEZONE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="astrology-field"><span>Birth star (Nakshatra)</span><select value={getCanonicalNakshatraName(profileApi.profileDraft.nakshatra)} onChange={(event) => handleNakshatraChange(event.target.value)}>{NAKSHATRA_NAMES.map((name) => <option key={name} value={name}>{getNakshatraDisplayName(name, language)}</option>)}</select></label>
        <label className="astrology-field"><span>Gender</span><select value={profileApi.profileDraft.gender} onChange={(event) => profileApi.handleDraftChange("gender", event.target.value)}>{GENDER_OPTIONS.map((option) => <option key={option.value || "unset"} value={option.value}>{option.label}</option>)}</select></label>
        <label className="astrology-field"><span>Topic / question</span><input type="text" value={question} onChange={(event) => setQuestion(event.target.value)} /></label>
      </div>
      <label className="astrology-field astrology-checkbox-field"><input type="checkbox" checked={detailedReport} onChange={(event) => setDetailedReport(event.target.checked)} /><span>Generate detailed personalized horoscope</span></label>
      <button type="button" className="astrology-save-button" onClick={handleGenerateReport}>Generate horoscope report</button>
    </article>
    <article className="astrology-panel astro-result-card"><h4>Kundli summary</h4><ul><li>Ascendant: {kundliApi.kundliData?.birthChart?.ascendant || profileApi.selectedProfile.lagna || "Mesha"}</li><li>Current dasha: {kundliApi.kundliData?.dasha?.current || "Venus"}</li><li>Rashi: {profileApi.selectedProfile.rashi || getRashiFromSign(selectedSign)}</li></ul></article>
    <article className="astrology-panel astro-result-card">
      <h4>Planetary square chart</h4>
      <div className="astro-square-chart">
        {[12, 1, 2, 3, 11, 4, 10, 5, 9, 8, 7, 6].map((house) => {
          const houseData = squarePlanetChart.find((item) => item.house === house) || { planets: [] };
          return (
            <div key={house} className="astro-square-cell">
              <span>H{house}</span>
              <strong>{houseData.planets.join(", ") || "-"}</strong>
            </div>
          );
        })}
        <div className="astro-square-center">
          <span>Ascendant</span>
          <strong>{kundliApi.kundliData?.birthChart?.ascendant || profileApi.selectedProfile.lagna || "Mesha"}</strong>
        </div>
      </div>
    </article>
    <article className="astrology-panel astro-result-card">
      <h4>Actions</h4>
      <button
        type="button"
        className="astrology-save-button"
        disabled={kundliApi.downloadingKundli || kundliApi.kundliLoading || downloadingHoroscopePeriod !== ""}
        onClick={kundliApi.handleDownloadKundliReport}
      >
        {kundliApi.downloadingKundli ? "Downloading..." : "Download Kundli PDF report"}
      </button>
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
      {kundliApi.activeKundliSnapshotId ? <button type="button" className="astrology-secondary-button" onClick={kundliApi.handleLoadLiveKundli}>Use live generation</button> : null}
    </article>
  </div>
);

export default KundliView;
