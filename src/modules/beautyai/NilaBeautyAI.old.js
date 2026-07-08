import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStoredAuthToken } from "../../utils/auth";
import {
  BeautyAIQuickStart,
  BeautyProgressTracker,
  BeautyTipsCarousel,
  BeautySelfieGallery,
  BeautyAdminPanel,
  BeautyConsent,
  BeautyUsageStats,
  BeautyProductRecommendations,
} from "./components";
import {
  fetchDailyTips,
  fetchMyPlans,
  fetchMySelfies,
  fetchUsageStatus,
  fetchConsentStatus,
  fetchSubscriptionRules,
  fetchAdminAlerts,
  fetchAdminStats,
  fetchProgressLogs,
  updatePlan,
  deletePlan,
  duplicatePlan,
  updatePlanPhoto,
  deleteSelfie,
  createTip,
  updateSubscriptionRules,
  grantConsent,
  revokeConsent,
} from "./services/beautyaiApi";
import { startAutoSync, stopAutoSync, getQueueStats } from "./services/offlineActionQueue";
import { DEFAULTS, STATUS_MESSAGES } from "./data/beautyaiConstants";
import "./NilaBeautyAI.css";

const decodeJwtSubject = (rawToken = "") => {
  const token = String(rawToken || "").trim();
  if (!token || !token.includes(".")) {
    return "";
  }
  try {
    const encodedPayload = token.split(".")[1] || "";
    const padded = encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, "=");
    const normalized = padded.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(normalized));
    return String(payload.sub || payload.userId || payload.id || payload._id || "").trim();
  } catch (_error) {
    return "";
  }
};

const decodeJwtSubject = (rawToken = "") => {
  const token = String(rawToken || "").trim();
  if (!token || !token.includes(".")) {
    return "";
  }
  try {
    const encodedPayload = token.split(".")[1] || "";
    const padded = encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, "=");
    const normalized = padded.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(normalized));
    return String(payload.sub || payload.userId || payload.id || payload._id || "").trim();
  } catch (_error) {
    return "";
  }
};

const NilaBeautyAI = () => {
  const token = getStoredAuthToken();
  const navigate = useNavigate();
  const snapshotScopeKey = useMemo(() => decodeJwtSubject(token) || "anonymous", [token]);

  // UI State
  const [status, setStatus] = useState({ type: "", text: "" });
  const [busyKey, setBusyKey] = useState("");
  const [activeView, setActiveView] = useState("main"); // 'main', 'consent', 'usage', 'products', 'gallery'
  
  // Data State
  const [tips, setTips] = useState([]);
  const [todaysTip, setTodaysTip] = useState(null);
  const [planBundle, setPlanBundle] = useState(null);
  const [progressLogs, setProgressLogs] = useState([]);
  const [savedPlans, setSavedPlans] = useState([]);
  const [savedSelfies, setSavedSelfies] = useState([]);
  const [usageStatus, setUsageStatus] = useState(null);
  const [featureFlags, setFeatureFlags] = useState(null);
  const [consentStatus, setConsentStatus] = useState(null);
  const [activePlanId, setActivePlanId] = useState("");
  const [activePlanTitle, setActivePlanTitle] = useState("");
  
  // Admin State
  const [isAdminControlsVisible, setIsAdminControlsVisible] = useState(false);
  const [subscriptionRules, setSubscriptionRules] = useState(null);
  const [adminAlerts, setAdminAlerts] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  
  // Offline State
  const [offlineQueueStats, setOfflineQueueStats] = useState({ total: 0, pending: 0 });

  const pushStatus = useCallback((type, text) => {
    setStatus({ type, text });
    // Auto-clear success messages after 5 seconds
    if (type === "success") {
      setTimeout(() => setStatus({ type: "", text: "" }), 5000);
    }
  }, []);

  const withBusy = useCallback(async (key, fn) => {
    setBusyKey(key);
    try {
      await fn();
    } finally {
      setBusyKey("");
    }
  }, []);

  // Load Data Functions using new API service
  const loadTips = useCallback(async () => {
    await withBusy("tips", async () => {
      const result = await fetchDailyTips({ language: DEFAULTS.LANGUAGE });
      if (result.success) {
        setTodaysTip(result.data?.todayTip || null);
        setTips(result.data?.tips || []);
      } else {
        pushStatus("error", result.error || STATUS_MESSAGES.ERROR.NETWORK);
      }
    });
  }, [pushStatus, withBusy]);

  const loadProgress = useCallback(async (planId = "") => {
    await withBusy("progress", async () => {
      const result = await fetchProgressLogs(planId);
      if (result.success) {
        setProgressLogs(result.data);
      } else {
        setProgressLogs([]);
      }
    });
  }, [withBusy]);

  const loadSavedPlans = useCallback(async () => {
    await withBusy("saved-plans", async () => {
      const result = await fetchMyPlans();
      if (result.success) {
        setSavedPlans(result.data);
      } else {
        setSavedPlans([]);
      }
    });
  }, [withBusy]);

  const loadSavedSelfies = useCallback(async () => {
    await withBusy("saved-selfies", async () => {
      const result = await fetchMySelfies();
      if (result.success) {
        setSavedSelfies(result.data);
      } else {
        setSavedSelfies([]);
      }
    });
  }, [withBusy]);

  const loadUsageStatus = useCallback(async () => {
    await withBusy("usage", async () => {
      const result = await fetchUsageStatus();
      if (result.success) {
        setUsageStatus(result.data?.usage || null);
        setFeatureFlags(result.data?.featureFlags || null);
      } else {
        setUsageStatus(null);
        setFeatureFlags(null);
      }
    });
  }, [withBusy]);

  const loadConsentStatus = useCallback(async () => {
    await withBusy("consent", async () => {
      const result = await fetchConsentStatus();
      if (result.success) {
        setConsentStatus(result.data);
      } else {
        setConsentStatus(null);
      }
    });
  }, [withBusy]);

  const loadAdminSettings = useCallback(async () => {
    await withBusy("admin-settings", async () => {
      try {
        const [rulesResult, alertsResult, statsResult] = await Promise.all([
          fetchSubscriptionRules(),
          fetchAdminAlerts(),
          fetchAdminStats(),
        ]);
        
        if (rulesResult.success) {
          setSubscriptionRules(rulesResult.data);
          setIsAdminControlsVisible(true);
        }
        
        if (alertsResult.success) {
          setAdminAlerts(alertsResult.data);
        }
        
        if (statsResult.success) {
          setAdminStats(statsResult.data);
        }
      } catch (_error) {
        setIsAdminControlsVisible(false);
        setAdminAlerts([]);
      }
    });
  }, [withBusy]);

  // Initialize offline sync and load data
  useEffect(() => {
    // Start offline sync
    startAutoSync(30000, (progress) => {
      if (progress) {
        pushStatus("info", `Syncing: ${progress.current}/${progress.total}`);
      }
    });

    // Load initial data
    loadTips();
    loadSavedPlans();
    loadSavedSelfies();
    loadUsageStatus();
    loadConsentStatus();
    loadAdminSettings();

    // Update offline queue stats periodically
    const queueInterval = setInterval(() => {
      setOfflineQueueStats(getQueueStats());
    }, 5000);

    // Cleanup
    return () => {
      stopAutoSync();
      clearInterval(queueInterval);
    };
  }, [loadAdminSettings, loadConsentStatus, loadSavedPlans, loadSavedSelfies, loadTips, loadUsageStatus, pushStatus]);

  useEffect(() => {
    loadProgress(activePlanId);
  }, [activePlanId, loadProgress]);

  const handlePlanReady = useCallback(
    (bundle) => {
      setPlanBundle(bundle);
      if (!activePlanId) {
        setActivePlanTitle(String(bundle?.plan?.title || ""));
      }
      loadProgress(activePlanId);
      loadUsageStatus();
      loadConsentStatus();
    },
    [activePlanId, loadConsentStatus, loadProgress, loadUsageStatus]
  );

  const saveCurrentPlan = useCallback(
    async (bundle) => {
      const source = bundle || planBundle;
      if (!source?.plan) {
        pushStatus("error", "Generate a plan before saving.");
        return;
      }
      await withBusy("save-plan", async () => {
        try {
          const profile = source.profile || source.form || {};
          const payload = {
            gender: profile.gender || "",
            age: profile.age || null,
            skinType: profile.skinType || "",
            hairType: profile.hairType || "",
            budget: profile.budget || "",
            language: profile.language || "en",
            selectedConcerns: profile.selectedConcerns || [],
            // Store only secure uploaded URLs; avoid persisting inline base64 data.
            photoUrl: source.uploadedPhotoUrl || "",
            photoStorageKey: source.uploadedPhotoStorageKey || "",
            photoStorageProvider: source.uploadedPhotoStorageProvider || "",
            photoName: source.selfieMeta?.fileName || source.selfieFile?.name || "",
            plan: source.plan,
            eventType: profile.eventType || "daily-glow",
            selfieSignals: source.selfieSignals || {},
          };
          const response = await request.post(buildApiUrl("/beauty-ai/plans"), payload);
          const savedId = String(response?.data?.data?._id || "");
          if (savedId) {
            setActivePlanId(savedId);
            setActivePlanTitle(String(source?.plan?.title || "Saved plan"));
            loadProgress(savedId);
          }
          pushStatus("success", "Beauty plan saved.");
          loadSavedPlans();
          loadUsageStatus();
        } catch (error) {
          pushStatus("error", error?.response?.data?.message || "Failed to save beauty plan.");
        }
      });
    },
    [loadProgress, loadSavedPlans, loadUsageStatus, planBundle, pushStatus, request, withBusy]
  );

  const archivePlan = useCallback(
    async (planId) => {
      await withBusy(`archive-${planId}`, async () => {
        try {
          await request.put(buildApiUrl(`/beauty-ai/plans/${encodeURIComponent(planId)}/archive`));
          pushStatus("success", "Beauty plan archived.");
          loadSavedPlans();
        } catch (error) {
          pushStatus("error", error?.response?.data?.message || "Failed to archive beauty plan.");
        }
      });
    },
    [loadSavedPlans, pushStatus, request, withBusy]
  );

  const duplicatePlan = useCallback(
    async (planId) => {
      await withBusy(`duplicate-${planId}`, async () => {
        try {
          const response = await request.post(
            buildApiUrl(`/beauty-ai/plans/${encodeURIComponent(planId)}/duplicate`)
          );
          pushStatus("success", "Beauty plan duplicated.");
          const duplicated = response.data?.data;
          if (duplicated?._id) {
            setActivePlanId(String(duplicated._id));
            setActivePlanTitle(String(duplicated?.plan?.title || "Duplicated plan"));
          }
          loadSavedPlans();
          loadProgress(String(response.data?.data?._id || ""));
        } catch (error) {
          pushStatus("error", error?.response?.data?.message || "Failed to duplicate beauty plan.");
        }
      });
    },
    [loadProgress, loadSavedPlans, pushStatus, request, withBusy]
  );

  const deletePlan = useCallback(
    async (planId) => {
      await withBusy(`delete-${planId}`, async () => {
        try {
          await request.delete(buildApiUrl(`/beauty-ai/plans/${encodeURIComponent(planId)}`));
          if (activePlanId === String(planId)) {
            setActivePlanId("");
            setActivePlanTitle("");
            setPlanBundle(null);
            loadProgress("");
          }
          pushStatus("success", "Beauty plan deleted.");
          loadSavedPlans();
        } catch (error) {
          pushStatus("error", error?.response?.data?.message || "Failed to delete beauty plan.");
        }
      });
    },
    [activePlanId, loadProgress, loadSavedPlans, pushStatus, request, withBusy]
  );

  const resumePlan = useCallback(
    async (planId) => {
      await withBusy(`resume-${planId}`, async () => {
        try {
          const response = await request.get(
            buildApiUrl(`/beauty-ai/plans/${encodeURIComponent(planId)}`)
          );
          const plan = response.data?.data;
          if (!plan?._id) {
            pushStatus("error", "Unable to load selected plan.");
            return;
          }
          const nextBundle = {
            plan: plan.plan || null,
            photoUrl: plan.photoUrl || "",
            photoStorageKey: plan.photoStorageKey || "",
            photoStorageProvider: plan.photoStorageProvider || "",
            selfieId: "",
            profile: {
              gender: plan.gender || "",
              age: plan.age || "",
              skinType: plan.skinType || "",
              hairType: plan.hairType || "",
              budget: plan.budget || "",
              language: plan.language || "en",
              eventType: plan.eventType || "daily-glow",
              selectedConcerns: Array.isArray(plan.selectedConcerns) ? plan.selectedConcerns : [],
              notes: plan.notes || "",
            },
          };
          setPlanBundle(nextBundle);
          setActivePlanId(String(plan._id));
          setActivePlanTitle(String(plan?.plan?.title || "Saved plan"));
          setEditingPlanId("");
          setEditingPlanNotes("");
          loadProgress(String(plan._id));
          pushStatus("success", "Plan resumed. Continue routine tracking for this plan.");
        } catch (error) {
          pushStatus("error", error?.response?.data?.message || "Failed to resume plan.");
        }
      });
    },
    [loadProgress, pushStatus, request, withBusy]
  );

  const startPlanNotesEdit = useCallback((entry) => {
    setEditingPlanId(String(entry?._id || ""));
    setEditingPlanNotes(String(entry?.notes || ""));
  }, []);

  const cancelPlanNotesEdit = useCallback(() => {
    setEditingPlanId("");
    setEditingPlanNotes("");
  }, []);

  const savePlanNotes = useCallback(
    async (planId) => {
      await withBusy(`save-notes-${planId}`, async () => {
        try {
          await request.put(buildApiUrl(`/beauty-ai/plans/${encodeURIComponent(planId)}`), {
            notes: String(editingPlanNotes || "").trim(),
          });
          pushStatus("success", "Plan notes updated.");
          setEditingPlanId("");
          setEditingPlanNotes("");
          loadSavedPlans();
        } catch (error) {
          pushStatus("error", error?.response?.data?.message || "Failed to update plan notes.");
        }
      });
    },
    [editingPlanNotes, loadSavedPlans, pushStatus, request, withBusy]
  );

  const triggerReplaceSelfieInput = useCallback((planId) => {
    const input = replaceSelfieInputRefs.current[String(planId)];
    if (input) {
      input.click();
    }
  }, []);

  const replacePlanSelfie = useCallback(
    async (planId, file) => {
      if (!file) return;
      const formData = new FormData();
      formData.append("selfie", file);
      await withBusy(`replace-selfie-${planId}`, async () => {
        try {
          await request.put(
            buildApiUrl(`/beauty-ai/plans/${encodeURIComponent(planId)}/photo`),
            formData
          );
          pushStatus("success", "Plan selfie replaced.");
          loadSavedPlans();
          loadSavedSelfies();
        } catch (error) {
          pushStatus("error", error?.response?.data?.message || "Failed to replace plan selfie.");
        }
      });
    },
    [loadSavedPlans, loadSavedSelfies, pushStatus, request, withBusy]
  );

  const removePlanSelfie = useCallback(
    async (planId) => {
      await withBusy(`remove-selfie-${planId}`, async () => {
        try {
          await request.delete(
            buildApiUrl(`/beauty-ai/plans/${encodeURIComponent(planId)}/photo`)
          );
          pushStatus("success", "Plan selfie removed.");
          loadSavedPlans();
        } catch (error) {
          pushStatus("error", error?.response?.data?.message || "Failed to remove plan selfie.");
        }
      });
    },
    [loadSavedPlans, pushStatus, request, withBusy]
  );

  const handleBookSalon = useCallback(
    () => {
      pushStatus("success", "Opening Local Services for salon or bridal bookings.");
      navigate("/localservices");
    },
    [navigate, pushStatus]
  );

  const handleOrderProducts = useCallback(
    (products = []) => {
      if (products.length) {
        pushStatus(
          "success",
          `Opening Hyperlocal Delivery to order recommended products: ${products.join(", ")}.`
        );
      } else {
        pushStatus("success", "Opening Hyperlocal Delivery for skincare product ordering.");
      }
      navigate("/hyperlocal");
    },
    [navigate, pushStatus]
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
          Selfie-guided skincare and grooming plans with safety checks, Malayalam-ready prompts,
          weekly progress tracking, and booking hooks for salon and product purchase.
        </p>
      </header>

      {status.text ? (
        <div className={`beauty-status ${status.type === "error" ? "error" : ""}`}>{status.text}</div>
      ) : null}

      <BeautyAIQuickStart
        request={request}
        onPlanReady={handlePlanReady}
        onBookSalon={handleBookSalon}
        onOrderProducts={handleOrderProducts}
        onSavePlan={saveCurrentPlan}
        pushStatus={pushStatus}
        usageStatus={usageStatus}
        consentStatus={consentStatus}
        savedSelfies={savedSelfies}
        onRefreshSavedSelfies={loadSavedSelfies}
        initialPlanBundle={planBundle}
      />

      <BeautyProgressTracker
        request={request}
        logs={progressLogs}
        planId={activePlanId}
        planLabel={activePlanTitle}
        latestScore={Number(planBundle?.plan?.score || 0)}
        selfiePreview={planBundle?.selfiePreview || planBundle?.photoUrl || ""}
        snapshotScopeKey={snapshotScopeKey}
        pushStatus={pushStatus}
        onEntriesUpdate={() => {}}
      />
      {activePlanId ? (
        <div className="beauty-active-plan-banner">
          <p>
            Progress is scoped to: <strong>{activePlanTitle || "Saved plan"}</strong>
          </p>
          <button
            type="button"
            onClick={() => {
              setActivePlanId("");
              setActivePlanTitle("");
              setPlanBundle(null);
            }}
          >
            Switch to session plan
          </button>
        </div>
      ) : null}

      <section className="beauty-card">
        <h2>My Selfies</h2>
        {busyKey === "saved-selfies" ? <p>Loading selfies...</p> : null}
        {!savedSelfies.length ? <p>No saved selfies yet.</p> : null}
        <div className="beauty-selfie-grid">
          {savedSelfies.map((entry) => (
            <article key={entry._id} className="beauty-selfie-card">
              {entry.photoUrl ? <img src={entry.photoUrl} alt="Saved beauty selfie" /> : null}
              <p>{entry.photoName || "Saved selfie"}</p>
              <p>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "Date unavailable"}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="beauty-card">
        <h2>Saved Beauty Plans</h2>
        {busyKey === "saved-plans" ? <p>Loading plans...</p> : null}
        {!savedPlans.length ? <p>No saved beauty plans yet.</p> : null}
        <div className="beauty-saved-plan-grid">
          {savedPlans.map((entry) => (
            <article key={entry._id} className="beauty-saved-plan-card">
              <h3>{entry?.plan?.title || "Beauty Plan"}</h3>
              <p>
                {entry.skinType || "Skin type N/A"} | {entry.hairType || "Hair type N/A"} |{" "}
                {(entry.selectedConcerns || []).join(", ") || "No concerns selected"}
              </p>
              <p>Status: {entry.status || "Active"}</p>
              <p>Saved: {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : "N/A"}</p>
              <p>Notes: {entry.notes || "No notes saved."}</p>
              {entry.photoUrl ? <img src={entry.photoUrl} alt="Saved beauty plan selfie" /> : null}
              <input
                ref={(node) => {
                  replaceSelfieInputRefs.current[String(entry._id)] = node;
                }}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(event) => replacePlanSelfie(entry._id, event.target.files?.[0])}
              />
              {editingPlanId === String(entry._id) ? (
                <div className="beauty-plan-notes-editor">
                  <textarea
                    value={editingPlanNotes}
                    onChange={(event) => setEditingPlanNotes(event.target.value)}
                    rows={3}
                  />
                  <div className="beauty-saved-plan-actions">
                    <button
                      type="button"
                      className="beauty-primary"
                      onClick={() => savePlanNotes(entry._id)}
                      disabled={busyKey === `save-notes-${entry._id}`}
                    >
                      {busyKey === `save-notes-${entry._id}` ? "Saving..." : "Save notes"}
                    </button>
                    <button type="button" onClick={cancelPlanNotesEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="beauty-saved-plan-actions">
                <button
                  type="button"
                  className="beauty-primary"
                  onClick={() => resumePlan(entry._id)}
                  disabled={busyKey === `resume-${entry._id}`}
                >
                  {busyKey === `resume-${entry._id}` ? "Resuming..." : "Resume routine"}
                </button>
                <button
                  type="button"
                  onClick={() => duplicatePlan(entry._id)}
                  disabled={busyKey === `duplicate-${entry._id}`}
                >
                  {busyKey === `duplicate-${entry._id}` ? "Duplicating..." : "Duplicate"}
                </button>
                <button type="button" onClick={() => startPlanNotesEdit(entry)}>
                  Edit notes
                </button>
                <button
                  type="button"
                  onClick={() => triggerReplaceSelfieInput(entry._id)}
                  disabled={busyKey === `replace-selfie-${entry._id}`}
                >
                  {busyKey === `replace-selfie-${entry._id}` ? "Replacing..." : "Replace selfie"}
                </button>
                <button
                  type="button"
                  onClick={() => removePlanSelfie(entry._id)}
                  disabled={busyKey === `remove-selfie-${entry._id}`}
                >
                  {busyKey === `remove-selfie-${entry._id}` ? "Removing..." : "Remove selfie"}
                </button>
                {entry.status !== "Archived" ? (
                  <button
                    type="button"
                    onClick={() => archivePlan(entry._id)}
                    disabled={busyKey === `archive-${entry._id}`}
                  >
                    {busyKey === `archive-${entry._id}` ? "Archiving..." : "Archive"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => deletePlan(entry._id)}
                  disabled={busyKey === `delete-${entry._id}`}
                >
                  {busyKey === `delete-${entry._id}` ? "Deleting..." : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="beauty-card">
        <h2>Safety and Do-Not-Use Guidance</h2>
        <div className="beauty-safety">
          <p>
            This module is for guidance only and not medical diagnosis. For severe acne, infections,
            allergy reactions, burns, pregnancy-related concerns, or medicine interactions, consult a dermatologist.
          </p>
          <ul className="beauty-list">
            <li>Avoid steroid creams without dermatologist advice.</li>
            <li>Avoid bleaching creams and unknown fairness products.</li>
            <li>Avoid mixing strong actives with ongoing acne or skin medicines.</li>
            <li>Patch test all new products before full-face application.</li>
          </ul>
        </div>
      </section>

      <section className="beauty-card">
        <h2>Tip Library</h2>
        <article className="beauty-tip">
          <h3>Today's Beauty Tip</h3>
          <p>{todaysTip || "Loading tip..."}</p>
        </article>
        <ul className="beauty-list">
          {tips.slice(0, 6).map((tip) => (
            <li key={tip.id || tip.title}>
              <strong>{tip.title}:</strong> {tip.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="beauty-card">
        <h2>Admin Controls</h2>
        {isAdminControlsVisible ? (
          <div className="beauty-grid two">
            <div className="beauty-admin-panel">
              <h3>Operational alerts</h3>
              {!adminAlerts.length ? <p>No alert signals detected in the current window.</p> : null}
              {adminAlerts.map((alert) => (
                <article key={alert.key} className="beauty-tip">
                  <p>
                    <strong>{alert.label}</strong>
                  </p>
                  <p>
                    Last 24h: {Number(alert.count24h || 0)} | Last 7d: {Number(alert.count7d || 0)}
                  </p>
                  <p>
                    Severity:{" "}
                    <strong
                      style={{
                        color:
                          alert.severity24h === "red"
                            ? "#b42318"
                            : alert.severity24h === "amber"
                              ? "#b54708"
                              : "#027a48",
                      }}
                    >
                      {String(alert.severity24h || "green").toUpperCase()}
                    </strong>
                  </p>
                </article>
              ))}
            </div>

            <div className="beauty-admin-panel">
              <h3>Add tip to library</h3>
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
              <button
                type="button"
                className="beauty-primary"
                onClick={saveAdminTip}
                disabled={busyKey === "save-tip"}
              >
                {busyKey === "save-tip" ? "Saving..." : "Save Tip"}
              </button>
            </div>

            {subscriptionRules ? (
              <div className="beauty-subscription-editor">
                <h3>Subscription rules</h3>
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
                <button
                  type="button"
                  className="beauty-primary"
                  onClick={saveSubscriptionRules}
                  disabled={busyKey === "save-rules"}
                >
                  {busyKey === "save-rules" ? "Updating..." : "Update Rules"}
                </button>
              </div>
            ) : (
              <p>Subscription rules are unavailable for this account.</p>
            )}
          </div>
        ) : (
          <p>Admin controls are only visible to admin accounts.</p>
        )}
      </section>
    </section>
  );
};

export default NilaBeautyAI;
