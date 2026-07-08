import React from "react";
import AstrologyQuickStartPanel from "./AstrologyQuickStartPanel";
import { useAstrologyHomeController } from "./hooks/useAstrologyHomeController";
import { astrologyService } from "../../services/astrologyService";
import { DEFAULT_BIRTH_TIME_ZONE } from "./data/astrologyConstants";
import TodayView from "./views/TodayView";
import KundliView from "./views/KundliView";
import ConsultView from "./views/ConsultView";
import YearlyView from "./views/YearlyView";
import TotalView from "./views/TotalView";
import ProfileView from "./views/ProfileView";
import SavedView from "./views/SavedView";
import AIView from "./views/AIView";
import PanchangamView from "./views/PanchangamView";
import CareerView from "./views/CareerView";
import FinanceView from "./views/FinanceView";
import MatchView from "./views/MatchView";
import RemediesView from "./views/RemediesView";
import FamilyProfilesView from "./views/FamilyProfilesView";
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
    familyProfilesApi,
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
            <YearlyView
              yearlyHoroscopeContent={yearlyHoroscopeContent}
              downloadingHoroscopePeriod={downloadingHoroscopePeriod}
              handleDownloadHoroscopeReport={handleDownloadHoroscopeReport}
              downloadRetryPeriod={downloadRetryPeriod}
              handleRetryHoroscopeDownload={handleRetryHoroscopeDownload}
            />
          ) : null}

          {activeSection === "total" ? (
            <TotalView
              totalLifeReadingContent={totalLifeReadingContent}
              handleGenerateReport={handleGenerateReport}
              downloadingHoroscopePeriod={downloadingHoroscopePeriod}
              handleDownloadHoroscopeReport={handleDownloadHoroscopeReport}
              downloadRetryPeriod={downloadRetryPeriod}
              handleRetryHoroscopeDownload={handleRetryHoroscopeDownload}
            />
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

          {activeSection === "career" ? (
            <CareerView
              selectedSign={selectedSign}
              getCareerAdvice={getCareerAdvice}
              profileApi={profileApi}
            />
          ) : null}
          
          {activeSection === "finance" ? (
            <FinanceView
              selectedSign={selectedSign}
              getFinanceAdvice={getFinanceAdvice}
            />
          ) : null}

          {activeSection === "match" ? (
            <MatchView
              selectedSign={selectedSign}
              setSelectedSign={setSelectedSign}
              signs={signs}
              kundliApi={kundliApi}
            />
          ) : null}

          {activeSection === "remedies" ? (
            <RemediesView
              selectedSign={selectedSign}
              getRemedyTips={getRemedyTips}
            />
          ) : null}

          {activeSection === "panchangam" ? (
            <PanchangamView
              panchangam={panchangam}
              panchangamLoading={panchangamLoading}
              panchangamNotice={panchangamNotice}
              festivals={festivals}
              getNakshatraDisplayName={getNakshatraDisplayName}
              language={language}
            />
          ) : null}

          {activeSection === "ai" ? (
            <AIView
              aiQuestion={aiQuestion}
              setAiQuestion={setAiQuestion}
              handleAskAssistant={handleAskAssistant}
              aiLoading={aiLoading}
              assistantRetryQuestion={assistantRetryQuestion}
              handleRetryAssistantQuestion={handleRetryAssistantQuestion}
              assistantAnswer={assistantAnswer}
              assistantHistory={assistantHistory}
            />
          ) : null}

          {activeSection === "saved" ? (
            <SavedView
              profileApi={profileApi}
              kundliApi={kundliApi}
              handleRestoreSavedReading={handleRestoreSavedReading}
              formatSavedReadingDate={formatSavedReadingDate}
              setActiveSection={setActiveSection}
            />
          ) : null}

          {activeSection === "profile" ? (
            <ProfileView
              profileApi={profileApi}
              handleBirthPlaceChange={handleBirthPlaceChange}
              handleBirthTimezoneChange={handleBirthTimezoneChange}
              handleQuickSave={handleQuickSave}
              BIRTH_LOCATION_OPTIONS={BIRTH_LOCATION_OPTIONS}
              BIRTH_TIMEZONE_OPTIONS={BIRTH_TIMEZONE_OPTIONS}
              GENDER_OPTIONS={GENDER_OPTIONS}
              isProfileFieldMissing={isProfileFieldMissing}
            />
          ) : null}

          {activeSection === "consult" ? (
            <ConsultView consultApi={consultApi} />
          ) : null}

          {activeSection === "family" ? (
            <FamilyProfilesView
              familyProfilesApi={familyProfilesApi}
              signs={signs}
              GENDER_OPTIONS={GENDER_OPTIONS}
              BIRTH_LOCATION_OPTIONS={BIRTH_LOCATION_OPTIONS}
              BIRTH_TIMEZONE_OPTIONS={BIRTH_TIMEZONE_OPTIONS}
              NAKSHATRA_NAMES={NAKSHATRA_NAMES}
              getNakshatraDisplayName={getNakshatraDisplayName}
              language={language}
            />
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
