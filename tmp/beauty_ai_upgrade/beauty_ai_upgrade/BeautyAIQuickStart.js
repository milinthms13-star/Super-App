import React, { useMemo, useState } from "react";
import {
  BEAUTY_EVENTS,
  BEAUTY_LANGUAGES,
  buildBeautyRequest,
  getSafetyWarnings,
  getBeautyPlanFallback,
  shareBeautyPlanWhatsApp,
} from "./beautyAiUpgradeUtils";

const DEFAULT_FORM = {
  language: "ml",
  concern: "acne",
  budget: "low",
  eventType: "daily-glow",
  skinType: "normal",
  selfie: null,
  notes: "",
  sensitiveSkin: false,
  knownAllergy: "",
  pregnantOrBreastfeeding: false,
  usingSkinMedicine: false,
};

export default function BeautyAIQuickStart({ onPlanReady, onBookSalon, onOrderProducts }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const warnings = useMemo(() => getSafetyWarnings(form), [form]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSelfie = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    update("selfie", file);
  };

  const generatePlan = async () => {
    setLoading(true);
    try {
      const payload = buildBeautyRequest(form);
      // Connect this endpoint to your existing Beauty AI backend if available.
      // Fallback keeps demo working even without paid AI/image API.
      const response = await fetch("/api/beauty-ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);

      let data = null;
      if (response?.ok) data = await response.json();
      const finalPlan = data?.plan || getBeautyPlanFallback(form);
      setPlan(finalPlan);
      onPlanReady?.(finalPlan);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="beauty-ai-quick-start">
      <div className="beauty-ai-hero-card">
        <div>
          <p className="beauty-ai-eyebrow">AI Beauty Companion</p>
          <h2>Upload selfie, select concern, get a safe beauty plan</h2>
          <p className="beauty-ai-subtitle">
            Malayalam friendly skincare, grooming and event glow planning with safety checks.
          </p>
        </div>
        <div className="beauty-ai-hero-badge">Selfie consent required</div>
      </div>

      <div className="beauty-ai-form-grid">
        <label>
          Upload selfie
          <input type="file" accept="image/*" onChange={handleSelfie} />
          <small>Used only to personalize beauty guidance. Do not upload private or unrelated images.</small>
        </label>

        <label>
          Concern
          <select value={form.concern} onChange={(e) => update("concern", e.target.value)}>
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
          <select value={form.budget} onChange={(e) => update("budget", e.target.value)}>
            <option value="low">Low budget / home care</option>
            <option value="medium">Medium budget</option>
            <option value="premium">Premium care</option>
          </select>
        </label>

        <label>
          Event plan
          <select value={form.eventType} onChange={(e) => update("eventType", e.target.value)}>
            {BEAUTY_EVENTS.map((event) => (
              <option key={event.value} value={event.value}>{event.label}</option>
            ))}
          </select>
        </label>

        <label>
          Skin type
          <select value={form.skinType} onChange={(e) => update("skinType", e.target.value)}>
            <option value="normal">Normal</option>
            <option value="dry">Dry</option>
            <option value="oily">Oily</option>
            <option value="combination">Combination</option>
            <option value="sensitive">Sensitive</option>
          </select>
        </label>

        <label>
          Language
          <select value={form.language} onChange={(e) => update("language", e.target.value)}>
            {BEAUTY_LANGUAGES.map((language) => (
              <option key={language.value} value={language.value}>{language.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="beauty-ai-safety-box">
        <strong>Safety questions</strong>
        <label><input type="checkbox" checked={form.sensitiveSkin} onChange={(e) => update("sensitiveSkin", e.target.checked)} /> Sensitive skin</label>
        <label><input type="checkbox" checked={form.pregnantOrBreastfeeding} onChange={(e) => update("pregnantOrBreastfeeding", e.target.checked)} /> Pregnant / breastfeeding</label>
        <label><input type="checkbox" checked={form.usingSkinMedicine} onChange={(e) => update("usingSkinMedicine", e.target.checked)} /> Currently using skin medicine</label>
        <label>
          Known allergy
          <input value={form.knownAllergy} onChange={(e) => update("knownAllergy", e.target.value)} placeholder="Example: aloe vera, fragrance" />
        </label>
      </div>

      {warnings.length > 0 && (
        <div className="beauty-ai-warning-box">
          {warnings.map((warning) => <p key={warning}>⚠️ {warning}</p>)}
        </div>
      )}

      <label className="beauty-ai-notes">
        Tell your beauty goal
        <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Example: Ente mukhath pimples undu, natural remedy venam" />
      </label>

      <button className="beauty-ai-primary-btn" type="button" onClick={generatePlan} disabled={loading}>
        {loading ? "Preparing plan..." : "Get My Beauty Plan"}
      </button>

      {plan && (
        <div className="beauty-ai-plan-card">
          <div className="beauty-ai-plan-header">
            <h3>{plan.title}</h3>
            <span>{plan.score}/100 care score</span>
          </div>

          <div className="beauty-ai-plan-section">
            <h4>Morning routine</h4>
            <ol>{plan.morning.map((step) => <li key={step}>{step}</li>)}</ol>
          </div>

          <div className="beauty-ai-plan-section">
            <h4>Night routine</h4>
            <ol>{plan.night.map((step) => <li key={step}>{step}</li>)}</ol>
          </div>

          <div className="beauty-ai-plan-section">
            <h4>Do not use</h4>
            <ul>{plan.avoid.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>

          <div className="beauty-ai-actions-row">
            <button type="button" onClick={() => shareBeautyPlanWhatsApp(plan)}>Share WhatsApp</button>
            <button type="button" onClick={() => onBookSalon?.(plan)}>Book Salon</button>
            <button type="button" onClick={() => onOrderProducts?.(plan.products)}>Order Products</button>
          </div>
        </div>
      )}

      <p className="beauty-ai-disclaimer">
        Beauty and skincare suggestions are general guidance only. Avoid steroid creams, bleaching creams,
        unknown fairness creams and strong actives without dermatologist advice.
      </p>
    </section>
  );
}
