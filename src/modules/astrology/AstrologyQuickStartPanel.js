import React, { useMemo, useState } from "react";
import {
  ASTROLOGY_PRIMARY_TABS,
  buildAstrologyPreview,
  getAstrologyMissingFields,
  getAstrologyUpsellMessage,
  normalizeAstrologyProfilePayload,
} from "./astrologyUpgradeUtils";

const localize = (en, ml, language) => (language === "ml" ? ml || en : en);

export default function AstrologyQuickStartPanel({
  language = "en",
  profileDraft,
  selectedSign = "aries",
  savingProfile = false,
  onDraftChange,
  onGenerate,
  onTabChange,
  onAskAI,
}) {
  const [question, setQuestion] = useState("");

  const preview = useMemo(
    () => buildAstrologyPreview(profileDraft, selectedSign),
    [profileDraft, selectedSign]
  );

  const missingFields = useMemo(
    () => getAstrologyMissingFields(profileDraft),
    [profileDraft]
  );

  const canGenerate = missingFields.length === 0;

  const handleGenerate = () => {
    const payload = normalizeAstrologyProfilePayload(profileDraft);
    onGenerate?.({ ...payload, question: question.trim() });
  };

  return (
    <section className="astro-upgrade-start-panel">
      <div className="astro-upgrade-hero">
        <p className="astro-upgrade-kicker">
          {localize("Personal Astrology", "വ്യക്തിഗത ജ്യോതിഷം", language)}
        </p>
        <h2>
          {localize(
            "Start with DOB, time and place",
            "ജനന തീയതി, സമയം, സ്ഥലം നൽകി തുടങ്ങൂ",
            language
          )}
        </h2>
        <p>
          {localize(
            "Users should get an instant personalized preview first, then deeper paid reports.",
            "ആദ്യം ഇൻസ്റ്റന്റ് പ്രിവ്യൂ, പിന്നെ കൂടുതൽ വിശദമായ പെയ്ഡ് റിപ്പോർട്ടുകൾ.",
            language
          )}
        </p>
      </div>

      <div className="astro-upgrade-grid">
        <article className="astro-upgrade-card astro-upgrade-form-card">
          <h3>{localize("Birth details", "ജനന വിവരങ്ങൾ", language)}</h3>

          <div className="astro-upgrade-form-grid">
            <label>
              <span>{localize("Date of birth", "ജനന തീയതി", language)}</span>
              <input
                type="date"
                value={profileDraft?.birthDate || ""}
                onChange={(e) => onDraftChange?.("birthDate", e.target.value)}
              />
            </label>

            <label>
              <span>{localize("Time of birth", "ജനന സമയം", language)}</span>
              <input
                type="time"
                value={profileDraft?.birthTime || ""}
                onChange={(e) => onDraftChange?.("birthTime", e.target.value)}
              />
            </label>

            <label className="astro-upgrade-full">
              <span>{localize("Place of birth", "ജനന സ്ഥലം", language)}</span>
              <input
                type="text"
                placeholder="Kollam, Kerala"
                value={profileDraft?.birthPlace || ""}
                onChange={(e) => onDraftChange?.("birthPlace", e.target.value)}
              />
            </label>

            <label>
              <span>{localize("Gender", "ലിംഗം", language)}</span>
              <select
                value={profileDraft?.gender || ""}
                onChange={(e) => onDraftChange?.("gender", e.target.value)}
              >
                <option value="">
                  {localize("Select", "തിരഞ്ഞെടുക്കുക", language)}
                </option>
                <option value="female">{localize("Female", "സ്ത്രീ", language)}</option>
                <option value="male">{localize("Male", "പുരുഷൻ", language)}</option>
                <option value="other">{localize("Other", "മറ്റുള്ളവർ", language)}</option>
              </select>
            </label>

            <label>
              <span>{localize("Timezone", "ടൈംസോൺ", language)}</span>
              <select
                value={profileDraft?.birthTimezone || "Asia/Kolkata"}
                onChange={(e) => onDraftChange?.("birthTimezone", e.target.value)}
              >
                <option value="Asia/Kolkata">India - Asia/Kolkata</option>
                <option value="Asia/Dubai">UAE - Asia/Dubai</option>
                <option value="Europe/London">UK - Europe/London</option>
                <option value="America/New_York">US Eastern</option>
              </select>
            </label>
          </div>

          {!canGenerate ? (
            <p className="astro-upgrade-warning">
              {localize("Missing:", "ബാക്കി:", language)} {missingFields.join(", ")}
            </p>
          ) : null}

          <label className="astro-upgrade-ai-question">
            <span>{localize("Ask one question", "ഒരു ചോദ്യം ചോദിക്കൂ", language)}</span>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={localize(
                "Example: How is my finance this month?",
                "ഉദാ: ഈ മാസം ധനകാര്യത്തിൽ എങ്ങനെയായിരിക്കും?",
                language
              )}
            />
          </label>

          <div className="astro-upgrade-actions">
            <button
              type="button"
              className="astro-upgrade-primary"
              disabled={savingProfile || !canGenerate}
              onClick={handleGenerate}
            >
              {savingProfile
                ? localize("Generating...", "തയ്യാറാക്കുന്നു...", language)
                : localize("Generate My Prediction", "എന്റെ ഫലം കാണിക്കുക", language)}
            </button>
            <button
              type="button"
              className="astro-upgrade-secondary"
              onClick={() => onAskAI?.(question)}
              disabled={!question.trim()}
            >
              {localize("Ask Astro AI", "Astro AI ചോദിക്കൂ", language)}
            </button>
          </div>
        </article>

        <article className="astro-upgrade-card astro-upgrade-preview-card">
          <h3>{localize("Instant preview", "ഇൻസ്റ്റന്റ് പ്രിവ്യൂ", language)}</h3>
          <ul>
            <li><span>Rashi</span><strong>{preview.rashi}</strong></li>
            <li><span>Nakshatra</span><strong>{preview.nakshatra}</strong></li>
            <li><span>Lagna</span><strong>{preview.lagna}</strong></li>
            <li><span>Lucky color</span><strong>{preview.luckyColor}</strong></li>
            <li><span>Best time</span><strong>{preview.bestTime}</strong></li>
          </ul>
          <div className="astro-upgrade-upsell">
            {getAstrologyUpsellMessage(language)}
          </div>
        </article>
      </div>

      <div className="astro-upgrade-tabs">
        {ASTROLOGY_PRIMARY_TABS.map((tab) => (
          <button type="button" key={tab.key} onClick={() => onTabChange?.(tab.key)}>
            <span>{tab.icon}</span>
            {localize(tab.label, tab.labelMl, language)}
          </button>
        ))}
      </div>
    </section>
  );
}

