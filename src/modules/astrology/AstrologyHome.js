import React from "react";
import AstrologyQuickStartPanel from "./AstrologyQuickStartPanel";
import { useAstrologyHomeController } from "./hooks/useAstrologyHomeController";
import { astrologyService } from "../../services/astrologyService";
import { DEFAULT_BIRTH_TIME_ZONE } from "./data/astrologyConstants";
import TodayView from "./views/TodayView";
import KundliView from "./views/KundliView";
import ConsultView from "./views/ConsultView";
import "../../styles/Astrology.css";
import "./AstrologyUpgrade.css";

const AstrologyHome = () => {
  const {
    FEATURE_TABS,
    MOBILE_NAV_ITEMS,
    GENDER_OPTIONS,
    BIRTH_TIMEZONE_OPTIONS,
    BIRTH_LOCATION_OPTIONS,
    NAKSHATRA_NAMES,
    localize,
    formatSavedReadingDate,
    getNakshatraDisplayName,
    getNakshatraFromSign,
    getCanonicalNakshatraName,
    getRashiFromSign,
    getRashiSummary,
    getCareerAdvice,
    getFinanceAdvice,
    getRemedyTips,
    language,
    setLanguage,
    searchQuery,
    setSearchQuery,
    headerMenuOpen,
    setHeaderMenuOpen,
    activeSection,
    setActiveSection,
    showFullPrediction,
    personalizedReady,
    question,
    setQuestion,
    detailedReport,
    setDetailedReport,
    signs,
    selectedSign,
    setSelectedSign,
    reading,
    loading,
    signsNotice,
    readingNotice,
    saveState,
    requiredProfileFields,
    festivals,
    panchangam,
    panchangamNotice,
    panchangamLoading,
    aiQuestion,
    setAiQuestion,
    assistantAnswer,
    assistantHistory,
    assistantRetryQuestion,
    aiLoading,
    downloadingHoroscopePeriod,
    downloadRetryPeriod,
    selectedSignDetails,
    heroPrediction,
    filteredSigns,
    todayEnergyScore,
    futureClarityMetrics,
    actionOutcomeScenarios,
    futureTimelineCards,
    yearlyHoroscopeContent,
    totalLifeReadingContent,
    squarePlanetChart,
    profileApi,
    consultApi,
    kundliApi,
    handleSectionChange,
    handleQuickStartDraftChange,
    handleBirthPlaceChange,
    handleBirthTimezoneChange,
    handleNakshatraChange,
    handleQuickSave,
    handleRestoreSavedReading,
    handleGenerateReport,
    handleAskAssistant,
    handleRetryAssistantQuestion,
    handleDownloadHoroscopeReport,
    handleRetryHoroscopeDownload,
  } = useAstrologyHomeController();

  const isProfileFieldMissing = (fieldName) => requiredProfileFields.includes(fieldName);
  return (
    <section className="astrology-home" lang={language === "ml" ? "ml" : "en"}>
      <div className="astrology-shell">
        <header className="astrology-panel astro-top-header">
          <div className="astro-branding">
            <div className="astro-logo">AN</div>
            <div>
              <p className="astro-brand-eyebrow">AstroNila</p>
              <h1>Astrology</h1>
            </div>
          </div>
          <form className="astro-search" onSubmit={(event) => event.preventDefault()}>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={localize("Search sign or feature...", "\u0d30\u0d3e\u0d36\u0d3f \u0d05\u0d32\u0d4d\u0d32\u0d46\u0d19\u0d4d\u0d15\u0d3f\u0d32\u0d4d\u200d \u0d2b\u0d40\u0d1a\u0d4d\u0d1a\u0d7c \u0d24\u0d3f\u0d30\u0d2f\u0d41\u0d15...", language)}
            />
          </form>
          <div className="astro-top-actions">
            <button type="button" className="astrology-secondary-button" onClick={() => setLanguage((prev) => (prev === "en" ? "ml" : "en"))}>
              {language === "en" ? "Switch to Malayalam" : "Switch to English"}
            </button>
            <button type="button" className="astrology-secondary-button" onClick={() => setActiveSection("profile")}>
              Profile
            </button>
            <div className="astro-menu-wrap">
              <button type="button" className="astrology-secondary-button" onClick={() => setHeaderMenuOpen((prev) => !prev)}>
                Menu
              </button>
              {headerMenuOpen ? (
                <div className="astro-menu-popover">
                  <button type="button" onClick={() => setActiveSection("consult")}>Consultations</button>
                  <button type="button" onClick={() => setActiveSection("saved")}>Saved Reports</button>
                  <a href="/dashboard">Dashboard</a>
                  <a href="/astrology-analytics">Analytics</a>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <AstrologyQuickStartPanel
          language={language}
          profileDraft={profileApi.profileDraft}
          selectedSign={selectedSign}
          savingProfile={profileApi.savingProfile}
          onDraftChange={handleQuickStartDraftChange}
          onGenerate={handleGenerateReport}
          onTabChange={handleSectionChange}
          onAskAI={(text) => {
            if (String(text || "").trim()) {
              setAiQuestion(String(text || "").trim());
            }
            setActiveSection("ai");
          }}
        />

        

        <section className="astrology-panel astro-zodiac-strip">
          <div className="astro-zodiac-chips">
            {(filteredSigns.length ? filteredSigns : signs).map((item) => (
              <button key={item.sign} type="button" className={`astro-zodiac-chip ${selectedSign === item.sign ? "is-active" : ""}`} onClick={() => setSelectedSign(item.sign)}>
                <strong>{item.label}</strong>
                <span>{item.dateRange}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="astrology-panel astro-tab-panel">
          <div className="astro-feature-tabs" role="tablist">
            {FEATURE_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                className={`astro-tab-button ${activeSection === tab.key ? "is-active" : ""}`}
                onClick={() => handleSectionChange(tab.key)}
              >
                {localize(tab.label, tab.labelMl, language)}
              </button>
            ))}
          </div>
          {(readingNotice || signsNotice || saveState.message || profileApi.profileNotice) ? (
            <div className="astro-inline-messages">
              {readingNotice || signsNotice ? <p className="astrology-inline-message astrology-inline-message-warning">{readingNotice || signsNotice}</p> : null}
              {profileApi.profileNotice ? <p className="astrology-inline-message astrology-inline-message-warning">{profileApi.profileNotice}</p> : null}
              {saveState.message ? <p className={`astrology-inline-message ${saveState.type === "error" ? "astrology-inline-message-error" : "astrology-inline-message-success"}`}>{saveState.message}</p> : null}
            </div>
          ) : null}

          {activeSection === "today" ? (
            <TodayView
              personalizedReady={personalizedReady}
              localize={localize}
              language={language}
              heroPrediction={heroPrediction}
              selectedSign={selectedSign}
              getRashiSummary={getRashiSummary}
              getCareerAdvice={getCareerAdvice}
              getFinanceAdvice={getFinanceAdvice}
              getRemedyTips={getRemedyTips}
              panchangam={panchangam}
              getNakshatraDisplayName={getNakshatraDisplayName}
              profileApi={profileApi}
              getNakshatraFromSign={getNakshatraFromSign}
              handleQuickSave={handleQuickSave}
              futureClarityMetrics={futureClarityMetrics}
              actionOutcomeScenarios={actionOutcomeScenarios}
              futureTimelineCards={futureTimelineCards}
              handleGenerateReport={handleGenerateReport}
              downloadingHoroscopePeriod={downloadingHoroscopePeriod}
              handleDownloadHoroscopeReport={handleDownloadHoroscopeReport}
              showFullPrediction={showFullPrediction}
              selectedSignDetails={selectedSignDetails}
              reading={reading}
              loading={loading}
              readingNotice={readingNotice}
              signsNotice={signsNotice}
              todayEnergyScore={todayEnergyScore}
              downloadRetryPeriod={downloadRetryPeriod}
              handleRetryHoroscopeDownload={handleRetryHoroscopeDownload}
            />
          ) : null}

          {activeSection === "yearly" ? (
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
          ) : null}

          {activeSection === "total" ? (
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
          ) : null}

          {activeSection === "kundli" ? (
            <KundliView
              profileApi={profileApi}
              handleBirthPlaceChange={handleBirthPlaceChange}
              BIRTH_LOCATION_OPTIONS={BIRTH_LOCATION_OPTIONS}
              BIRTH_TIMEZONE_OPTIONS={BIRTH_TIMEZONE_OPTIONS}
              handleBirthTimezoneChange={handleBirthTimezoneChange}
              getCanonicalNakshatraName={getCanonicalNakshatraName}
              handleNakshatraChange={handleNakshatraChange}
              NAKSHATRA_NAMES={NAKSHATRA_NAMES}
              getNakshatraDisplayName={getNakshatraDisplayName}
              language={language}
              GENDER_OPTIONS={GENDER_OPTIONS}
              question={question}
              setQuestion={setQuestion}
              detailedReport={detailedReport}
              setDetailedReport={setDetailedReport}
              handleGenerateReport={handleGenerateReport}
              kundliApi={kundliApi}
              selectedSign={selectedSign}
              getRashiFromSign={getRashiFromSign}
              squarePlanetChart={squarePlanetChart}
              downloadingHoroscopePeriod={downloadingHoroscopePeriod}
              handleDownloadHoroscopeReport={handleDownloadHoroscopeReport}
              downloadRetryPeriod={downloadRetryPeriod}
              handleRetryHoroscopeDownload={handleRetryHoroscopeDownload}
            />
          ) : null}

          {activeSection === "career" ? <div className="astro-card-grid"><article className="astrology-panel astro-result-card"><h4>Career forecast</h4><p>{getCareerAdvice(selectedSign)}</p></article></div> : null}
          {activeSection === "finance" ? <div className="astro-card-grid"><article className="astrology-panel astro-result-card"><h4>Finance forecast</h4><p>{getFinanceAdvice(selectedSign)}</p></article></div> : null}

          {activeSection === "match" ? (
            <div className="astro-card-grid">
              <article className="astrology-panel astro-result-card astro-span-2">
                <h4>Marriage compatibility</h4>
                <div className="astrology-form-grid">
                  <label className="astrology-field"><span>Your sign</span><select value={selectedSign} onChange={(event) => setSelectedSign(event.target.value)}>{signs.map((item) => <option key={item.sign} value={item.sign}>{item.label}</option>)}</select></label>
                  <label className="astrology-field"><span>Partner sign</span><select value={kundliApi.partnerSign} onChange={(event) => kundliApi.setPartnerSign(event.target.value)}>{signs.map((item) => <option key={item.sign} value={item.sign}>{item.label}</option>)}</select></label>
                </div>
                <button type="button" className="astrology-save-button" onClick={kundliApi.handleCompatibilitySubmit}>Check porutham</button>
              </article>
              {kundliApi.compatibility ? <article className="astrology-panel astro-result-card"><h4>Score</h4><p>{kundliApi.compatibility.summary}</p><strong>{Number(kundliApi.compatibility.score || 0)}%</strong>{kundliApi.compatibility?.quality?.note ? <p className="astrology-inline-message astrology-inline-message-warning">{kundliApi.compatibility.quality.note}</p> : null}</article> : null}
            </div>
          ) : null}

          {activeSection === "remedies" ? <div className="astro-card-grid"><article className="astrology-panel astro-result-card"><h4>Remedies</h4><ul>{getRemedyTips(selectedSign).map((tip) => <li key={tip}>{tip}</li>)}</ul></article></div> : null}

          {activeSection === "panchangam" ? (
            <div className="astro-card-grid">
              <article className="astrology-panel astro-result-card"><h4>Panchangam today</h4>{panchangamLoading ? <p className="astrology-inline-message">Loading...</p> : <ul><li>Tithi: {panchangam?.tithi || "Shukla Paksha Tritiya"}</li><li>Nakshatra: {getNakshatraDisplayName(panchangam?.nakshatra || "Revati", language)}</li><li>Rahu Kalam: {panchangam?.rahuKalam || "10:30 AM - 12:00 PM"}</li><li>Yamagandam: {panchangam?.yamagandam || "03:00 PM - 04:30 PM"}</li></ul>}{panchangam?._meta?.note ? <p className="astrology-inline-message astrology-inline-message-warning">{panchangam._meta.note}</p> : null}{panchangamNotice ? <p className="astrology-inline-message astrology-inline-message-warning">{panchangamNotice}</p> : null}</article>
              <article className="astrology-panel astro-result-card"><h4>Festival updates</h4>{festivals.length ? <ul>{festivals.map((festival) => <li key={festival.name}><strong>{festival.name}</strong> - {festival.date}</li>)}</ul> : <p>No festival updates.</p>}{festivals?.[0]?._meta?.note ? <p className="astrology-inline-message astrology-inline-message-warning">{festivals[0]._meta.note}</p> : null}</article>
            </div>
          ) : null}

          {activeSection === "ai" ? (
            <div className="astro-card-grid">
              <article className="astrology-panel astro-result-card astro-span-2">
                <h4>Ask AI Astrology</h4>
                <label className="astrology-field"><span>Your question</span><textarea rows={4} value={aiQuestion} onChange={(event) => setAiQuestion(event.target.value)} /></label>
                <div className="astrology-inline-actions">
                  <button type="button" className="astrology-save-button" onClick={handleAskAssistant} disabled={aiLoading}>{aiLoading ? "Thinking..." : "Ask now"}</button>
                  {assistantRetryQuestion ? (
                    <button type="button" className="astrology-secondary-button" disabled={aiLoading} onClick={handleRetryAssistantQuestion}>
                      Retry last question
                    </button>
                  ) : null}
                </div>
              </article>
              {assistantAnswer ? <article className="astrology-panel astro-result-card astro-span-2"><h4>Answer</h4><p>{assistantAnswer.answer}</p>{assistantAnswer.tips?.length ? <ul>{assistantAnswer.tips.map((tip, index) => <li key={`${tip}-${index}`}>{tip}</li>)}</ul> : null}{assistantAnswer?.quality?.note ? <p className="astrology-inline-message astrology-inline-message-warning">{assistantAnswer.quality.note}</p> : null}</article> : null}
              {assistantHistory.length ? (
                <article className="astrology-panel astro-result-card astro-span-2">
                  <h4>Question history</h4>
                  <div className="astrology-mini-history-list">
                    {assistantHistory.slice(0, 6).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="astrology-mini-history-item"
                        onClick={() => setAiQuestion(item.question)}
                      >
                        <strong>{item.question}</strong>
                        <span>{item.answer || "No answer captured."}</span>
                      </button>
                    ))}
                  </div>
                </article>
              ) : null}
            </div>
          ) : null}

          {activeSection === "saved" ? (
            <div className="astro-card-grid">
              <article className="astrology-panel astro-result-card"><h4>Saved daily reports</h4>{profileApi.recentSavedReadings.length ? <div className="astrology-mini-history-list">{profileApi.recentSavedReadings.map((item) => <button key={`${item.sign}-${item.readingDate}`} type="button" className="astrology-mini-history-item" onClick={() => handleRestoreSavedReading(item)}><strong>{astrologyService.getFallbackSign(item.sign).label}</strong><span>{formatSavedReadingDate(item.readingDate)}</span></button>)}</div> : <p className="astrology-history-empty">No saved daily reports.</p>}</article>
              <article className="astrology-panel astro-result-card"><h4>Saved Kundli</h4>{kundliApi.kundliHistory.length ? <div className="astrology-mini-history-list">{kundliApi.kundliHistory.slice(0, 6).map((item) => <button key={item.id} type="button" className="astrology-mini-history-item" onClick={() => { kundliApi.handleRestoreKundliSnapshot(item); setActiveSection("kundli"); }}><strong>{item.profileName || "Profile"}</strong><span>{formatSavedReadingDate(item.createdAt)}</span></button>)}</div> : <p className="astrology-history-empty">No saved Kundli reports.</p>}</article>
            </div>
          ) : null}

          {activeSection === "profile" ? (
            <div className="astro-card-grid">
              <article className="astrology-panel astro-result-card astro-span-2">
                <h4>Profile settings</h4>
                <div className="astro-compact-form">
                  <label className={`astrology-field ${isProfileFieldMissing("birthDate") ? "astrology-field-missing" : ""}`}><span>Birth date</span><input type="date" value={profileApi.profileDraft.birthDate} onChange={(event) => profileApi.handleDraftChange("birthDate", event.target.value)} /></label>
                  <label className={`astrology-field ${isProfileFieldMissing("birthTime") ? "astrology-field-missing" : ""}`}><span>Birth time</span><input type="time" value={profileApi.profileDraft.birthTime} onChange={(event) => profileApi.handleDraftChange("birthTime", event.target.value)} /></label>
                  <label className={`astrology-field ${isProfileFieldMissing("birthPlace") ? "astrology-field-missing" : ""}`}><span>Birth place</span><input type="text" list="astro-birth-place-options-profile" value={profileApi.profileDraft.birthPlace} onChange={(event) => handleBirthPlaceChange(event.target.value)} /><datalist id="astro-birth-place-options-profile">{BIRTH_LOCATION_OPTIONS.map((option) => <option key={option.label} value={option.label} />)}</datalist></label>
                  <label className="astrology-field"><span>Birth timezone</span><select value={profileApi.profileDraft.birthTimezone || DEFAULT_BIRTH_TIME_ZONE} onChange={(event) => handleBirthTimezoneChange(event.target.value)}>{BIRTH_TIMEZONE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                  <label className={`astrology-field ${isProfileFieldMissing("gender") ? "astrology-field-missing" : ""}`}><span>Gender</span><select value={profileApi.profileDraft.gender} onChange={(event) => profileApi.handleDraftChange("gender", event.target.value)}>{GENDER_OPTIONS.map((option) => <option key={option.value || "unset"} value={option.value}>{option.label}</option>)}</select></label>
                  <label className="astrology-field"><span>Favorite topics</span><input type="text" value={profileApi.profileDraft.favoriteTopics} onChange={(event) => profileApi.handleDraftChange("favoriteTopics", event.target.value)} /></label>
                </div>
                <button type="button" className="astrology-save-button" onClick={handleQuickSave}>Save profile</button>
              </article>
            </div>
          ) : null}

          {activeSection === "consult" ? (
            <ConsultView consultApi={consultApi} />
          ) : null}
        </section>
      </div>
      <nav className="astro-mobile-nav" aria-label="Astrology quick navigation">
        {MOBILE_NAV_ITEMS.map((item, index) => (
          <button
            key={`${item.key}-${index}`}
            type="button"
            className={`astro-mobile-nav-button ${activeSection === item.key ? "is-active" : ""}`}
            onClick={() => handleSectionChange(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </section>
  );
};

export default AstrologyHome;
