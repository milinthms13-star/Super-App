import React, { useMemo, useRef, useState } from "react";
import "./NilaBeautyAI.css";

const MAIN_CONCERNS = [
  "Acne",
  "Pigmentation",
  "Dark circles",
  "Wrinkles",
  "Tanning",
  "Hair fall",
];

const QUICK_CARDS = [
  "Skin Care",
  "Hair Care",
  "Makeup",
  "Bridal Care",
  "Men Grooming",
  "Home Remedies",
];

const MOCK_PRODUCTS = {
  low: ["Gentle face wash", "Niacinamide serum (budget)", "SPF 30 sunscreen"],
  medium: ["Ceramide cleanser", "Vitamin C serum", "SPF 50 PA++++ sunscreen"],
  high: ["Barrier repair cleanser", "Retinol night serum", "Broad-spectrum matte sunscreen"],
};

const FLOW_STEPS = [
  "Upload Selfie",
  "Profile Questions",
  "AI Analysis",
  "Routine Plan",
  "Progress Tracking",
];

const budgetKeyFromValue = (value = "medium") => {
  if (value === "low") return "low";
  if (value === "high") return "high";
  return "medium";
};

const NilaBeautyAI = () => {
  const selfieInputRef = useRef(null);
  const [selfieSource, setSelfieSource] = useState("");
  const [selfiePreview, setSelfiePreview] = useState("");
  const [reportReady, setReportReady] = useState(false);
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [checklistDays, setChecklistDays] = useState(
    Array.from({ length: 7 }, (_, day) => ({ day: day + 1, done: false }))
  );

  const [form, setForm] = useState({
    ageRange: "22-30",
    knownSkinType: "Not sure",
    concern: "Acne",
    budget: "medium",
    preference: "Balanced",
    gender: "Prefer not to say",
    eventDate: "",
    eventMode: "Daily care",
  });

  const [report, setReport] = useState({
    skinType: "Combination",
    skinScore: 0,
    concernsDetected: [],
    morningRoutine: [],
    nightRoutine: [],
    weeklyPlan: [],
    dos: [],
    donts: [],
    products: [],
    remedies: [],
  });

  const todaysTip = useMemo(() => {
    const tips = [
      "Apply sunscreen 15 minutes before stepping out.",
      "Patch-test new products for 24 hours before full use.",
      "Hydrate and keep your routine minimal during humid days.",
      "Avoid harsh scrubbing when active acne is present.",
    ];
    return tips[new Date().getDate() % tips.length];
  }, []);

  const progressCount = useMemo(
    () => checklistDays.filter((item) => item.done).length,
    [checklistDays]
  );

  const handleFile = async (file, source) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelfiePreview(String(reader.result || ""));
      setSelfieSource(source);
      setStatus("Selfie uploaded. Continue with profile questions.");
      setReportReady(false);
      setActiveTab("builder");
    };
    reader.readAsDataURL(file);
  };

  const runAnalysis = () => {
    if (!selfiePreview) {
      setStatus("Upload a selfie first to generate AI beauty tips.");
      return;
    }

    const concernSet = [form.concern];
    if (form.concern !== "Acne") concernSet.push("Acne");
    if (form.eventMode === "Bridal prep") concernSet.push("Tanning");

    const routineMorning = [
      "Gentle cleanse",
      "Hydrating serum",
      "Moisturizer",
      "Broad-spectrum sunscreen",
    ];
    const routineNight = [
      "Double cleanse",
      "Target treatment for concern",
      "Moisturizer",
      "Lip and under-eye care",
    ];
    const weekly = [
      "2x soothing mask",
      "1x exfoliation (mild, if tolerated)",
      "Hair oil + scalp cleanse schedule",
    ];

    const nextReport = {
      skinType: form.knownSkinType === "Not sure" ? "Combination (AI-estimated)" : form.knownSkinType,
      skinScore: 74,
      concernsDetected: concernSet,
      morningRoutine: routineMorning,
      nightRoutine: routineNight,
      weeklyPlan: weekly,
      dos: [
        "Patch-test all new products.",
        "Use sunscreen daily, even on cloudy days.",
        "Keep pillow covers and makeup tools clean.",
      ],
      donts: [
        "Do not use steroid creams without doctor advice.",
        "Do not over-layer active ingredients on one night.",
        "Avoid aggressive bleaching routines.",
      ],
      products: MOCK_PRODUCTS[budgetKeyFromValue(form.budget)],
      remedies: [
        "Aloe vera gel (patch-tested) for soothing",
        "Cold green tea compress for puffy under-eye area",
        "Honey + yogurt mask once weekly (if no allergy)",
      ],
    };

    setReport(nextReport);
    setReportReady(true);
    setStatus("AI report generated. Review routine and safety guidance.");
    setActiveTab("report");
  };

  const toggleDay = (dayNumber) => {
    setChecklistDays((current) =>
      current.map((item) => (item.day === dayNumber ? { ...item, done: !item.done } : item))
    );
  };

  return (
    <section className="beauty-shell">
      <header className="beauty-hero">
        <p className="beauty-kicker">Lifestyle Module</p>
        <h1>Nila Beauty AI</h1>
        <p>
          Selfie-based beauty guidance module with skin insights, daily routines, safety rules, admin controls,
          and monetization readiness.
        </p>
      </header>

      <nav className="beauty-tabs">
        <button type="button" className={activeTab === "home" ? "active" : ""} onClick={() => setActiveTab("home")}>
          Home
        </button>
        <button type="button" className={activeTab === "builder" ? "active" : ""} onClick={() => setActiveTab("builder")}>
          AI Builder
        </button>
        <button type="button" className={activeTab === "report" ? "active" : ""} onClick={() => setActiveTab("report")}>
          Report
        </button>
        <button type="button" className={activeTab === "admin" ? "active" : ""} onClick={() => setActiveTab("admin")}>
          Admin + Revenue
        </button>
        <button type="button" className={activeTab === "spec" ? "active" : ""} onClick={() => setActiveTab("spec")}>
          Implementation
        </button>
      </nav>

      {status ? <div className="beauty-status">{status}</div> : null}

      {activeTab === "home" ? (
        <section className="beauty-card">
          <h2>First Screen</h2>
          <div className="beauty-grid two">
            <div>
              <button type="button" className="beauty-primary" onClick={() => selfieInputRef.current?.click()}>
                Upload Selfie / Take Photo
              </button>
              <input
                ref={selfieInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="beauty-hidden"
                onChange={(event) => handleFile(event.target.files?.[0], "camera-or-gallery")}
              />
              <button type="button" className="beauty-primary ghost" onClick={runAnalysis}>
                Get AI Beauty Tips
              </button>
              <p>Source: {selfieSource || "None"}</p>
              {selfiePreview ? <img src={selfiePreview} alt="Selfie preview" className="beauty-preview" /> : null}
            </div>
            <div>
              <h3>Quick Cards</h3>
              <div className="beauty-chip-wall">
                {QUICK_CARDS.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
              <article className="beauty-tip">
                <h3>Today's Beauty Tip</h3>
                <p>{todaysTip}</p>
              </article>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "builder" ? (
        <section className="beauty-card">
          <h2>AI Flow</h2>
          <ol className="beauty-flow">
            {FLOW_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="beauty-grid two">
            <div className="beauty-form">
              <label>
                Age range
                <select value={form.ageRange} onChange={(event) => setForm((cur) => ({ ...cur, ageRange: event.target.value }))}>
                  <option>13-17</option>
                  <option>18-21</option>
                  <option>22-30</option>
                  <option>31-40</option>
                  <option>41+</option>
                </select>
              </label>
              <label>
                Skin type (if known)
                <select
                  value={form.knownSkinType}
                  onChange={(event) => setForm((cur) => ({ ...cur, knownSkinType: event.target.value }))}
                >
                  <option>Not sure</option>
                  <option>Oily</option>
                  <option>Dry</option>
                  <option>Normal</option>
                  <option>Combination</option>
                  <option>Sensitive</option>
                </select>
              </label>
              <label>
                Main concern
                <select value={form.concern} onChange={(event) => setForm((cur) => ({ ...cur, concern: event.target.value }))}>
                  {MAIN_CONCERNS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                Budget
                <select value={form.budget} onChange={(event) => setForm((cur) => ({ ...cur, budget: event.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label>
                Preference
                <select value={form.preference} onChange={(event) => setForm((cur) => ({ ...cur, preference: event.target.value }))}>
                  <option>Natural</option>
                  <option>Product-based</option>
                  <option>Balanced</option>
                </select>
              </label>
              <label>
                Gender (optional)
                <input value={form.gender} onChange={(event) => setForm((cur) => ({ ...cur, gender: event.target.value }))} />
              </label>
              <label>
                Mode
                <select value={form.eventMode} onChange={(event) => setForm((cur) => ({ ...cur, eventMode: event.target.value }))}>
                  <option>Daily care</option>
                  <option>Bridal prep</option>
                  <option>Festival glow</option>
                  <option>Men grooming</option>
                  <option>Teen skincare</option>
                </select>
              </label>
              <label>
                Event date (optional)
                <input type="date" value={form.eventDate} onChange={(event) => setForm((cur) => ({ ...cur, eventDate: event.target.value }))} />
              </label>
              <button type="button" className="beauty-primary" onClick={runAnalysis}>
                Build My Beauty Plan
              </button>
            </div>
            <div>
              <h3>Detected AI Features</h3>
              <ul className="beauty-list">
                <li>Skin type detection</li>
                <li>Acne / pigmentation / dark circles detection</li>
                <li>Daily morning + night routine generation</li>
                <li>Weather and event-based beauty suggestions</li>
                <li>Budget-aware product recommendations</li>
                <li>Natural remedy alternatives</li>
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "report" ? (
        <section className="beauty-card">
          <h2>AI Beauty Report</h2>
          {!reportReady ? <p>Generate a report from AI Builder to view output.</p> : null}
          {reportReady ? (
            <div className="beauty-grid two">
              <div>
                <p><strong>Skin score:</strong> {report.skinScore}/100</p>
                <p><strong>Skin type:</strong> {report.skinType}</p>
                <p><strong>Main concerns:</strong> {report.concernsDetected.join(", ")}</p>

                <h3>Morning Routine</h3>
                <ul className="beauty-list">{report.morningRoutine.map((item) => <li key={item}>{item}</li>)}</ul>
                <h3>Night Routine</h3>
                <ul className="beauty-list">{report.nightRoutine.map((item) => <li key={item}>{item}</li>)}</ul>
                <h3>Weekly Plan</h3>
                <ul className="beauty-list">{report.weeklyPlan.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <h3>Do's</h3>
                <ul className="beauty-list">{report.dos.map((item) => <li key={item}>{item}</li>)}</ul>
                <h3>Don'ts</h3>
                <ul className="beauty-list">{report.donts.map((item) => <li key={item}>{item}</li>)}</ul>
                <h3>Suggested Products</h3>
                <ul className="beauty-list">{report.products.map((item) => <li key={item}>{item}</li>)}</ul>
                <h3>Home Remedies</h3>
                <ul className="beauty-list">{report.remedies.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            </div>
          ) : null}

          <h3>7-Day Glow Challenge</h3>
          <div className="beauty-challenge">
            {checklistDays.map((item) => (
              <label key={item.day} className="beauty-check">
                <input type="checkbox" checked={item.done} onChange={() => toggleDay(item.day)} />
                Day {item.day}
              </label>
            ))}
          </div>
          <p>Progress: {progressCount}/7 completed</p>

          <div className="beauty-safety">
            <h3>Safety Rules</h3>
            <p>
              This module does not provide medical diagnosis. For severe acne, infection, burns, allergy, or skin
              disease symptoms, consult a dermatologist immediately.
            </p>
            <p>Patch-test products/remedies. Avoid unsafe bleaching and steroid-cream self-medication.</p>
            <p>Face photos should not be stored without explicit user consent.</p>
          </div>
        </section>
      ) : null}

      {activeTab === "admin" ? (
        <section className="beauty-card">
          <h2>Admin + Monetization</h2>
          <div className="beauty-grid two">
            <article>
              <h3>Admin Controls</h3>
              <ul className="beauty-list">
                <li>Add beauty categories and tip libraries</li>
                <li>Manage products, remedies, and sponsored brands</li>
                <li>Control subscription plans and premium reports</li>
                <li>Run push campaigns and user analytics</li>
              </ul>
            </article>
            <article>
              <h3>Revenue Streams</h3>
              <ul className="beauty-list">
                <li>Premium AI skin report</li>
                <li>Monthly beauty subscription</li>
                <li>Affiliate product sales</li>
                <li>Salon/bridal booking commission</li>
                <li>Sponsored brand placements</li>
                <li>Dermatologist consultation referrals</li>
              </ul>
            </article>
          </div>
        </section>
      ) : null}

      {activeTab === "spec" ? (
        <section className="beauty-card">
          <h2>Implementation-Ready Blueprint</h2>
          <div className="beauty-grid two">
            <article>
              <h3>Core Screens</h3>
              <ul className="beauty-list">
                <li>Beauty Home</li>
                <li>Selfie Capture / Upload</li>
                <li>AI Questionnaire</li>
                <li>Beauty Report + Routine</li>
                <li>Progress Tracker (7/30 day plans)</li>
                <li>AR Makeup Try-on</li>
                <li>Marketplace + Bookings</li>
              </ul>
              <h3>Data Collections</h3>
              <ul className="beauty-list">
                <li>BeautyProfile</li>
                <li>BeautyAnalysis</li>
                <li>BeautyRoutinePlan</li>
                <li>BeautyTipLibrary</li>
                <li>BeautyProductRecommendation</li>
                <li>BeautySubscription</li>
                <li>BeautyProgressLog</li>
              </ul>
            </article>
            <article>
              <h3>API Contract (Starter)</h3>
              <ul className="beauty-list">
                <li>POST `/beauty-ai/analyze-selfie`</li>
                <li>POST `/beauty-ai/generate-plan`</li>
                <li>GET `/beauty-ai/tips/today`</li>
                <li>POST `/beauty-ai/progress-log`</li>
                <li>GET `/beauty-ai/progress-log/mine`</li>
                <li>GET `/beauty-ai/products/recommendations`</li>
                <li>POST `/beauty-ai/admin/tip-library`</li>
                <li>PUT `/beauty-ai/admin/subscription-rules`</li>
              </ul>
              <h3>AI/AR Extensions</h3>
              <ul className="beauty-list">
                <li>AI makeup try-on</li>
                <li>AR lipstick/foundation shade try-on</li>
                <li>Face-shape hairstyle advisor</li>
                <li>Bridal timeline planner</li>
              </ul>
            </article>
          </div>
        </section>
      ) : null}
    </section>
  );
};

export default NilaBeautyAI;
