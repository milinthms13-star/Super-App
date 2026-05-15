import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { buildApiUrl } from "../../utils/api";
import { getStoredAuthToken } from "../../utils/auth";
import "./NilaBeautyAI.css";

const MAIN_CONCERNS = ["Acne", "Pigmentation", "Dark circles", "Wrinkles", "Tanning", "Hair fall"];
const QUICK_CARDS = ["Skin Care", "Hair Care", "Makeup", "Bridal Care", "Men Grooming", "Home Remedies"];
const FLOW_STEPS = ["Upload Selfie", "Profile Questions", "AI Analysis", "Routine Plan", "Progress Tracking"];

const NilaBeautyAI = () => {
  const selfieInputRef = useRef(null);
  const token = getStoredAuthToken();

  const [selfieFile, setSelfieFile] = useState(null);
  const [selfieSource, setSelfieSource] = useState("");
  const [selfiePreview, setSelfiePreview] = useState("");
  const [selfieConsent, setSelfieConsent] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [busyKey, setBusyKey] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [todaysTip, setTodaysTip] = useState("");
  const [tips, setTips] = useState([]);
  const [adminTipForm, setAdminTipForm] = useState({
    title: "",
    text: "",
    category: "general",
    language: "en",
  });
  const [subscriptionRules, setSubscriptionRules] = useState(null);
  const [isAdminControlsVisible, setIsAdminControlsVisible] = useState(false);
  const [checklistDays, setChecklistDays] = useState(
    Array.from({ length: 7 }, (_, index) => ({ day: index + 1, done: false, note: "" }))
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
    severeConcernDetected: false,
    warning: "",
  });

  const request = useMemo(
    () =>
      axios.create({
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
    [token]
  );

  const progressCount = useMemo(
    () => checklistDays.filter((item) => item.done).length,
    [checklistDays]
  );

  const withBusy = useCallback(async (key, fn) => {
    setBusyKey(key);
    try {
      await fn();
    } finally {
      setBusyKey("");
    }
  }, []);

  const pushStatus = useCallback((type, text) => {
    setStatus({ type, text });
  }, []);

  const handleFile = async (file, source) => {
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      pushStatus("error", "Please upload an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      pushStatus("error", "Image is too large. Keep selfie under 8MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelfieFile(file);
      setSelfiePreview(String(reader.result || ""));
      setSelfieSource(source);
      setReportReady(false);
      setActiveTab("builder");
      pushStatus("success", "Selfie uploaded. Continue with profile questions.");
    };
    reader.readAsDataURL(file);
  };

  const loadTips = useCallback(async () => {
    await withBusy("tips", async () => {
      try {
        const response = await request.get(buildApiUrl("/beauty-ai/tips/today"), {
          params: { language: "en" },
        });
        const tipText = response.data?.todayTip?.text || "Hydrate and keep your skincare routine consistent.";
        setTodaysTip(tipText);
        setTips(response.data?.tips || []);
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to load beauty tips.");
      }
    });
  }, [pushStatus, request, withBusy]);

  const loadProgress = useCallback(async () => {
    await withBusy("progress", async () => {
      try {
        const response = await request.get(buildApiUrl("/beauty-ai/progress-log/mine"));
        const logs = Array.isArray(response.data?.logs) ? response.data.logs : [];
        setChecklistDays((current) =>
          current.map((item) => {
            const found = logs.find((log) => Number(log.day) === Number(item.day));
            return found ? { ...item, done: Boolean(found.done), note: found.note || "" } : item;
          })
        );
      } catch (_error) {
        // Ignore noisy errors for first-time users with no logs.
      }
    });
  }, [request, withBusy]);

  const loadAdminSettings = useCallback(async () => {
    await withBusy("admin-settings", async () => {
      try {
        const response = await request.get(buildApiUrl("/beauty-ai/admin/subscription-rules"));
        setSubscriptionRules(response.data?.subscriptionRules || null);
        setIsAdminControlsVisible(true);
      } catch (_error) {
        setIsAdminControlsVisible(false);
      }
    });
  }, [request, withBusy]);

  useEffect(() => {
    loadTips();
    loadProgress();
  }, [loadProgress, loadTips]);

  useEffect(() => {
    if (activeTab === "admin") {
      loadAdminSettings();
    }
  }, [activeTab, loadAdminSettings]);

  const runAnalysis = useCallback(async () => {
    if (!selfiePreview || !selfieFile) {
      pushStatus("error", "Upload a selfie first to generate AI beauty tips.");
      return;
    }
    if (!selfieConsent) {
      pushStatus("error", "Please confirm selfie consent to continue.");
      return;
    }

    await withBusy("analysis", async () => {
      try {
        const analysisResponse = await request.post(buildApiUrl("/beauty-ai/analyze-selfie"), {
          ...form,
          selfieConsent,
          selfieMeta: {
            fileName: selfieFile.name,
            fileSize: selfieFile.size,
            mimeType: selfieFile.type,
          },
        });

        const analysis = analysisResponse.data?.analysis;
        if (!analysis) {
          throw new Error("Analysis response is empty.");
        }

        const planResponse = await request.post(buildApiUrl("/beauty-ai/generate-plan"), {
          ...form,
          skinScore: analysis.skinScore,
          concern: form.concern,
          eventMode: form.eventMode,
        });
        const plan = planResponse.data?.plan;
        if (!plan) {
          throw new Error("Plan response is empty.");
        }

        const productResponse = await request.get(buildApiUrl("/beauty-ai/products/recommendations"), {
          params: {
            budget: form.budget,
            concern: form.concern,
          },
        });

        setReport({
          skinType: plan.skinType || analysis.skinType,
          skinScore: analysis.skinScore || plan.skinScore || 0,
          concernsDetected: Array.isArray(plan.concernsDetected) ? plan.concernsDetected : [],
          morningRoutine: Array.isArray(plan.morningRoutine) ? plan.morningRoutine : [],
          nightRoutine: Array.isArray(plan.nightRoutine) ? plan.nightRoutine : [],
          weeklyPlan: Array.isArray(plan.weeklyPlan) ? plan.weeklyPlan : [],
          dos: Array.isArray(plan.dos) ? plan.dos : [],
          donts: Array.isArray(plan.donts) ? plan.donts : [],
          products: Array.isArray(productResponse.data?.products)
            ? productResponse.data.products
            : Array.isArray(plan.products)
              ? plan.products
              : [],
          remedies: Array.isArray(plan.remedies) ? plan.remedies : [],
          severeConcernDetected: Boolean(analysis.severeConcernDetected),
          warning: analysis.warning || "",
        });

        setReportReady(true);
        setActiveTab("report");
        pushStatus("success", "AI report generated. Review routine and safety guidance.");
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || error.message || "Failed to generate AI beauty report.");
      }
    });
  }, [form, pushStatus, request, selfieConsent, selfieFile, selfiePreview, withBusy]);

  const toggleDay = useCallback(
    async (dayNumber) => {
      const currentItem = checklistDays.find((item) => item.day === dayNumber);
      const nextDone = !currentItem?.done;

      setChecklistDays((current) =>
        current.map((item) => (item.day === dayNumber ? { ...item, done: nextDone } : item))
      );

      try {
        await request.post(buildApiUrl("/beauty-ai/progress-log"), {
          day: dayNumber,
          done: nextDone,
          note: nextDone ? "Challenge completed" : "",
          skinScore: report.skinScore,
        });
      } catch (_error) {
        // Roll back UI state if API fails.
        setChecklistDays((current) =>
          current.map((item) => (item.day === dayNumber ? { ...item, done: !nextDone } : item))
        );
        pushStatus("error", "Could not update progress log.");
      }
    },
    [checklistDays, pushStatus, report.skinScore, request]
  );

  const saveAdminTip = useCallback(async () => {
    await withBusy("save-tip", async () => {
      try {
        await request.post(buildApiUrl("/beauty-ai/admin/tip-library"), adminTipForm);
        setAdminTipForm({ title: "", text: "", category: "general", language: "en" });
        pushStatus("success", "Tip added to beauty tip library.");
        loadTips();
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to add tip.");
      }
    });
  }, [adminTipForm, loadTips, pushStatus, request, withBusy]);

  const saveSubscriptionRules = useCallback(async () => {
    if (!subscriptionRules) return;
    await withBusy("save-rules", async () => {
      try {
        const response = await request.put(
          buildApiUrl("/beauty-ai/admin/subscription-rules"),
          subscriptionRules
        );
        setSubscriptionRules(response.data?.subscriptionRules || subscriptionRules);
        pushStatus("success", "Subscription rules updated.");
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to update subscription rules.");
      }
    });
  }, [pushStatus, request, subscriptionRules, withBusy]);

  return (
    <section className="beauty-shell">
      <header className="beauty-hero">
        <p className="beauty-kicker">Lifestyle Module</p>
        <h1>Nila Beauty AI</h1>
        <p>
          Selfie-based beauty guidance with skin insights, routine plans, progress tracking, safety rules,
          and API-backed admin controls.
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

      {status.text ? (
        <div className={`beauty-status ${status.type === "error" ? "error" : ""}`}>{status.text}</div>
      ) : null}

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
              <button
                type="button"
                className="beauty-primary ghost"
                onClick={runAnalysis}
                disabled={busyKey === "analysis"}
              >
                {busyKey === "analysis" ? "Analyzing..." : "Get AI Beauty Tips"}
              </button>
              <p>Source: {selfieSource || "None"}</p>
              {selfiePreview ? <img src={selfiePreview} alt="Selfie preview" className="beauty-preview" /> : null}
              <label className="beauty-consent">
                <input
                  type="checkbox"
                  checked={selfieConsent}
                  onChange={(event) => setSelfieConsent(event.target.checked)}
                />
                I consent to selfie analysis for beauty guidance.
              </label>
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
                <p>{todaysTip || "Loading tip..."}</p>
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
              <button type="button" className="beauty-primary" onClick={runAnalysis} disabled={busyKey === "analysis"}>
                {busyKey === "analysis" ? "Building..." : "Build My Beauty Plan"}
              </button>
            </div>
            <div>
              <h3>Detected AI Features</h3>
              <ul className="beauty-list">
                <li>Skin type estimation and concern mapping</li>
                <li>Acne / pigmentation / dark circles signals</li>
                <li>Daily morning + night routine generation</li>
                <li>Budget-aware product recommendations</li>
                <li>Natural remedy alternatives</li>
                <li>Progress log sync across sessions</li>
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
                <p><strong>Main concerns:</strong> {report.concernsDetected.join(", ") || "General care"}</p>

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
            {report.warning ? <p><strong>Safety alert:</strong> {report.warning}</p> : null}
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

              {isAdminControlsVisible ? (
                <div className="beauty-admin-panel">
                  <h3>Add Tip to Library</h3>
                  <label>
                    Title
                    <input
                      value={adminTipForm.title}
                      onChange={(event) => setAdminTipForm((cur) => ({ ...cur, title: event.target.value }))}
                    />
                  </label>
                  <label>
                    Tip text
                    <input
                      value={adminTipForm.text}
                      onChange={(event) => setAdminTipForm((cur) => ({ ...cur, text: event.target.value }))}
                    />
                  </label>
                  <label>
                    Category
                    <input
                      value={adminTipForm.category}
                      onChange={(event) => setAdminTipForm((cur) => ({ ...cur, category: event.target.value }))}
                    />
                  </label>
                  <button type="button" className="beauty-primary" onClick={saveAdminTip} disabled={busyKey === "save-tip"}>
                    {busyKey === "save-tip" ? "Saving..." : "Save Tip"}
                  </button>

                  {subscriptionRules ? (
                    <div className="beauty-subscription-editor">
                      <h3>Subscription Rules</h3>
                      <label>
                        Free daily analysis limit
                        <input
                          type="number"
                          value={subscriptionRules.free.dailyAnalysisLimit}
                          onChange={(event) =>
                            setSubscriptionRules((cur) => ({
                              ...cur,
                              free: { ...cur.free, dailyAnalysisLimit: Number(event.target.value || 0) },
                            }))
                          }
                        />
                      </label>
                      <label>
                        Premium daily analysis limit
                        <input
                          type="number"
                          value={subscriptionRules.premium.dailyAnalysisLimit}
                          onChange={(event) =>
                            setSubscriptionRules((cur) => ({
                              ...cur,
                              premium: { ...cur.premium, dailyAnalysisLimit: Number(event.target.value || 0) },
                            }))
                          }
                        />
                      </label>
                      <button type="button" className="beauty-primary" onClick={saveSubscriptionRules} disabled={busyKey === "save-rules"}>
                        {busyKey === "save-rules" ? "Updating..." : "Update Rules"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p>Admin API controls visible only for admin users.</p>
              )}
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
              <h3>Tip Library Preview</h3>
              <ul className="beauty-list">
                {tips.slice(0, 4).map((tip) => (
                  <li key={tip.id || tip.title}>{tip.title}: {tip.text}</li>
                ))}
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
              <h3>API Contract (Live)</h3>
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
