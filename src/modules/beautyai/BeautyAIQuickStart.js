import React, { useMemo, useState } from "react";
import {
  BEAUTY_CONCERNS,
  BEAUTY_EVENTS,
  BEAUTY_LANGUAGES,
  buildBeautyRequest,
  extractSelfieSignals,
  getBeautyPlanFallback,
  getMalayalamHelperPrompts,
  getSafetyWarnings,
  shareBeautyPlanWhatsApp,
} from "./beautyAiUpgradeUtils";
import { buildApiUrl } from "../../utils/api";

const DEFAULT_FORM = {
  language: "ml",
  gender: "Female",
  age: "",
  concern: "acne",
  budget: "low",
  eventType: "daily-glow",
  skinType: "normal",
  hairType: "normal",
  selectedConcerns: [],
  notes: "",
  sensitiveSkin: false,
  knownAllergy: "",
  pregnantOrBreastfeeding: false,
  usingSkinMedicine: false,
  consent: false,
};

const DEFAULT_PLAN = {
  title: "",
  score: 0,
  morning: [],
  night: [],
  hair: [],
  avoid: [],
  products: [],
  eventPlan: [],
};

const buildSelfieMeta = (file) => ({
  fileName: String(file?.name || ""),
  fileSize: Number(file?.size || 0),
  mimeType: String(file?.type || ""),
});

const BeautyAIQuickStart = ({
  request,
  onPlanReady,
  onBookSalon,
  onOrderProducts,
  onSavePlan,
  pushStatus,
}) => {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [selfieFile, setSelfieFile] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState("");
  const [plan, setPlan] = useState(DEFAULT_PLAN);
  const [routineChecks, setRoutineChecks] = useState({});

  const warnings = useMemo(() => getSafetyWarnings(form), [form]);
  const malayalamPrompts = useMemo(() => getMalayalamHelperPrompts(), []);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const toggleConcern = (concern) =>
    setForm((prev) => ({
      ...prev,
      selectedConcerns: prev.selectedConcerns.includes(concern)
        ? prev.selectedConcerns.filter((item) => item !== concern)
        : [...prev.selectedConcerns, concern],
    }));

  const handleSelfie = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      pushStatus?.("error", "Please upload an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      pushStatus?.("error", "Selfie must be under 8MB.");
      return;
    }

    setSelfieFile(file);
    const reader = new FileReader();
    reader.onload = () => setSelfiePreview(String(reader.result || ""));
    reader.readAsDataURL(file);
    pushStatus?.("success", "Photo uploaded. Continue to generate your plan.");
  };

  const generatePlan = async () => {
    if (!form.consent) {
      pushStatus?.("error", "Please confirm consent before analysis.");
      return;
    }

    setLoading(true);
    try {
      const selfieSignals = selfieFile
        ? await extractSelfieSignals(selfieFile)
        : {
            rednessScore: 0.3,
            textureScore: 0.3,
            brightnessScore: 0.5,
            confidence: 0.4,
          };
      const primaryConcern = form.selectedConcerns[0] || form.concern;
      const payload = buildBeautyRequest(form, buildSelfieMeta(selfieFile), selfieSignals);
      payload.concern = primaryConcern;

      let apiPlan = null;
      let apiScore = 0;
      try {
        const response = await request.post(buildApiUrl("/beauty-ai/plan"), payload);
        apiPlan = response?.data?.plan || null;
        apiScore = Number(response?.data?.analysis?.skinScore || apiPlan?.score || 0);
      } catch (error) {
        pushStatus?.(
          "error",
          error?.response?.data?.message || "Live beauty plan endpoint unavailable, showing fallback plan."
        );
      }

      const fallbackPlan = getBeautyPlanFallback(form, Math.max(60, apiScore || 0));
      const finalPlan = apiPlan
        ? {
            ...fallbackPlan,
            ...apiPlan,
            score: Number(apiPlan.score || fallbackPlan.score || 0),
            morning: Array.isArray(apiPlan.morning) ? apiPlan.morning : fallbackPlan.morning,
            night: Array.isArray(apiPlan.night) ? apiPlan.night : fallbackPlan.night,
            avoid: Array.isArray(apiPlan.avoid) ? apiPlan.avoid : fallbackPlan.avoid,
            products: Array.isArray(apiPlan.products) ? apiPlan.products : fallbackPlan.products,
            eventPlan: Array.isArray(apiPlan.eventPlan) ? apiPlan.eventPlan : fallbackPlan.eventPlan,
            hair: Array.isArray(apiPlan.hair) ? apiPlan.hair : fallbackPlan.hair || [],
          }
        : fallbackPlan;

      setPlan(finalPlan);
      setRoutineChecks({});
      onPlanReady?.({
        plan: finalPlan,
        selfiePreview,
        selfieMeta: buildSelfieMeta(selfieFile),
        selfieSignals,
        profile: {
          gender: form.gender,
          age: form.age,
          skinType: form.skinType,
          hairType: form.hairType,
          budget: form.budget,
          language: form.language,
          eventType: form.eventType,
          selectedConcerns: form.selectedConcerns,
        },
      });
      pushStatus?.("success", "Beauty plan generated. Review routine, avoid list, and event plan.");
    } finally {
      setLoading(false);
    }
  };

  const routineCheckKey = (group, index) => `${group}-${index}`;
  const toggleRoutineCheck = (group, index) => {
    const key = routineCheckKey(group, index);
    setRoutineChecks((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <section className="beauty-ai-quick-start">
      <div className="beauty-ai-hero-card">
        <div>
          <p className="beauty-ai-eyebrow">AI Beauty Companion</p>
          <h2>Upload selfie, select concern, budget, and get your beauty plan</h2>
          <p className="beauty-ai-subtitle">
            Malayalam-ready skincare and event grooming plans with safety-first guidance.
          </p>
        </div>
        <div className="beauty-ai-hero-badge">Consent required</div>
      </div>

      <div className="beauty-ai-form-grid">
        <label>
          Upload selfie (optional)
          <input type="file" accept="image/*" capture="user" onChange={handleSelfie} />
        </label>
        <label>
          Gender
          <select value={form.gender} onChange={(event) => update("gender", event.target.value)}>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <label>
          Age
          <input
            type="number"
            min="0"
            max="120"
            value={form.age}
            onChange={(event) => update("age", event.target.value)}
            placeholder="Age"
          />
        </label>
        <label>
          Primary concern
          <select value={form.concern} onChange={(event) => update("concern", event.target.value)}>
            <option value="acne">Pimples / Acne</option>
            <option value="pigmentation">Pigmentation / Dark spots</option>
            <option value="dryness">Dry skin</option>
            <option value="oiliness">Oily skin</option>
            <option value="hairfall">Hair fall</option>
            <option value="bridal-glow">Bridal glow</option>
            <option value="men-grooming">Men grooming</option>
          </select>
        </label>
        <label>
          Budget
          <select value={form.budget} onChange={(event) => update("budget", event.target.value)}>
            <option value="low">Low budget / home care</option>
            <option value="medium">Medium budget</option>
            <option value="high">Premium care</option>
          </select>
        </label>
        <label>
          Event plan
          <select value={form.eventType} onChange={(event) => update("eventType", event.target.value)}>
            {BEAUTY_EVENTS.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Skin type
          <select value={form.skinType} onChange={(event) => update("skinType", event.target.value)}>
            <option value="normal">Normal</option>
            <option value="dry">Dry</option>
            <option value="oily">Oily</option>
            <option value="combination">Combination</option>
            <option value="sensitive">Sensitive</option>
          </select>
        </label>
        <label>
          Hair type
          <select value={form.hairType} onChange={(event) => update("hairType", event.target.value)}>
            <option value="normal">Normal</option>
            <option value="dry">Dry</option>
            <option value="oily">Oily</option>
            <option value="curly">Curly</option>
            <option value="frizzy">Frizzy</option>
          </select>
        </label>
        <label>
          Language
          <select value={form.language} onChange={(event) => update("language", event.target.value)}>
            {BEAUTY_LANGUAGES.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="beauty-ai-concern-chips">
        <strong>Select concerns</strong>
        <div className="beauty-ai-chip-wrap">
          {BEAUTY_CONCERNS.map((concern) => (
            <button
              key={concern}
              type="button"
              className={form.selectedConcerns.includes(concern) ? "active" : ""}
              onClick={() => toggleConcern(concern)}
            >
              {concern}
            </button>
          ))}
        </div>
      </div>

      <div className="beauty-ai-safety-box">
        <strong>Safety questions</strong>
        <label>
          <input
            type="checkbox"
            checked={form.sensitiveSkin}
            onChange={(event) => update("sensitiveSkin", event.target.checked)}
          />
          Sensitive skin
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.pregnantOrBreastfeeding}
            onChange={(event) => update("pregnantOrBreastfeeding", event.target.checked)}
          />
          Pregnant / breastfeeding
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.usingSkinMedicine}
            onChange={(event) => update("usingSkinMedicine", event.target.checked)}
          />
          Currently using skin medicine
        </label>
        <label>
          Known allergy
          <input
            value={form.knownAllergy}
            onChange={(event) => update("knownAllergy", event.target.value)}
            placeholder="Example: fragrance, aloe vera"
          />
        </label>
        <label className="beauty-consent-row">
          <input type="checkbox" checked={form.consent} onChange={(event) => update("consent", event.target.checked)} />
          I consent to selfie analysis for personalized beauty guidance.
        </label>
      </div>

      {warnings.length > 0 ? (
        <div className="beauty-ai-warning-box">
          {warnings.map((warning) => (
            <p key={warning}>Warning: {warning}</p>
          ))}
        </div>
      ) : null}

      <label className="beauty-ai-notes">
        Tell your beauty goal
        <textarea
          value={form.notes}
          onChange={(event) => update("notes", event.target.value)}
          placeholder="Example: Ente mukhath pimples undu, natural remedy venam"
        />
      </label>

      {form.language === "ml" ? (
        <div className="beauty-ai-ml-hints">
          <strong>Malayalam prompt ideas</strong>
          <ul>
            {malayalamPrompts.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <button type="button" className="beauty-ai-primary-btn" onClick={generatePlan} disabled={loading}>
        {loading ? "Preparing plan..." : "Get My Beauty Plan"}
      </button>

      {selfiePreview ? (
        <div className="beauty-ai-selfie-preview">
          <img src={selfiePreview} alt="Beauty selfie preview" />
        </div>
      ) : (
        <p className="beauty-ai-disclaimer">Photo is optional. You can still generate a guided plan.</p>
      )}

      {plan.title ? (
        <div className="beauty-ai-plan-card">
          <div className="beauty-ai-plan-header">
            <h3>{plan.title}</h3>
            <span>{Number(plan.score || 0)}/100</span>
          </div>

          <div className="beauty-ai-plan-section">
            <h4>Morning routine</h4>
            {(plan.morning || []).map((step, index) => (
              <label key={step} className="beauty-ai-check">
                <input
                  type="checkbox"
                  checked={Boolean(routineChecks[routineCheckKey("morning", index)])}
                  onChange={() => toggleRoutineCheck("morning", index)}
                />
                {step}
              </label>
            ))}
          </div>

          <div className="beauty-ai-plan-section">
            <h4>Night routine</h4>
            {(plan.night || []).map((step, index) => (
              <label key={step} className="beauty-ai-check">
                <input
                  type="checkbox"
                  checked={Boolean(routineChecks[routineCheckKey("night", index)])}
                  onChange={() => toggleRoutineCheck("night", index)}
                />
                {step}
              </label>
            ))}
          </div>

          <div className="beauty-ai-plan-section">
            <h4>Hair routine</h4>
            {(plan.hair || []).map((step, index) => (
              <label key={step} className="beauty-ai-check">
                <input
                  type="checkbox"
                  checked={Boolean(routineChecks[routineCheckKey("hair", index)])}
                  onChange={() => toggleRoutineCheck("hair", index)}
                />
                {step}
              </label>
            ))}
          </div>

          <div className="beauty-ai-plan-section">
            <h4>Products by budget</h4>
            <ul>
              {(plan.products || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="beauty-ai-plan-section">
            <h4>Do not use</h4>
            <ul>
              {(plan.avoid || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="beauty-ai-plan-section">
            <h4>Event plan</h4>
            <ul>
              {(plan.eventPlan || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="beauty-ai-actions-row">
            <button type="button" onClick={() => shareBeautyPlanWhatsApp(plan)}>
              Share WhatsApp
            </button>
            <button type="button" onClick={() => onBookSalon?.(plan)}>
              Book Salon
            </button>
            <button type="button" onClick={() => onOrderProducts?.(plan.products || [])}>
              Order Products
            </button>
            <button type="button" onClick={() => onSavePlan?.({ form, plan, selfiePreview, selfieFile })}>
              Save Plan
            </button>
          </div>
        </div>
      ) : null}

      <p className="beauty-ai-disclaimer">
        Beauty guidance only. Avoid steroid creams, bleaching creams, unknown fairness creams, and strong
        active ingredients without dermatologist advice.
      </p>
    </section>
  );
};

export default BeautyAIQuickStart;
