import React, { useMemo, useState } from "react";
import {
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
  concern: "acne",
  budget: "low",
  eventType: "daily-glow",
  skinType: "normal",
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
  pushStatus,
}) => {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [selfieFile, setSelfieFile] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState("");
  const [plan, setPlan] = useState(DEFAULT_PLAN);

  const warnings = useMemo(() => getSafetyWarnings(form), [form]);
  const malayalamPrompts = useMemo(() => getMalayalamHelperPrompts(), []);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

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
    pushStatus?.("success", "Selfie uploaded. Complete safety questions and generate your plan.");
  };

  const generatePlan = async () => {
    if (!selfieFile) {
      pushStatus?.("error", "Please upload a selfie first.");
      return;
    }
    if (!form.consent) {
      pushStatus?.("error", "Please confirm consent before analysis.");
      return;
    }

    setLoading(true);
    try {
      const selfieSignals = await extractSelfieSignals(selfieFile);
      const payload = buildBeautyRequest(form, buildSelfieMeta(selfieFile), selfieSignals);

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
          }
        : fallbackPlan;

      setPlan(finalPlan);
      onPlanReady?.({
        plan: finalPlan,
        selfiePreview,
        selfieMeta: buildSelfieMeta(selfieFile),
      });
      pushStatus?.("success", "Beauty plan generated. Review routine, avoid list, and event plan.");
    } finally {
      setLoading(false);
    }
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
          Upload selfie
          <input type="file" accept="image/*" capture="user" onChange={handleSelfie} />
        </label>
        <label>
          Concern
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
      ) : null}

      {plan.title ? (
        <div className="beauty-ai-plan-card">
          <div className="beauty-ai-plan-header">
            <h3>{plan.title}</h3>
            <span>{Number(plan.score || 0)}/100</span>
          </div>

          <div className="beauty-ai-plan-section">
            <h4>Morning routine</h4>
            <ol>
              {(plan.morning || []).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="beauty-ai-plan-section">
            <h4>Night routine</h4>
            <ol>
              {(plan.night || []).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
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
