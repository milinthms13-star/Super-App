import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  deletePlan as apiDeletePlan,
  duplicatePlan as apiDuplicatePlan,
  updatePlanPhoto,
  deleteSelfie,
  createTip,
  updateSubscriptionRules as apiUpdateSubscriptionRules,
  grantConsent,
  revokeConsent,
} from "./services/beautyaiApi";
import { startAutoSync, stopAutoSync, getQueueStats } from "./services/offlineActionQueue";
import { DEFAULTS, STATUS_MESSAGES } from "./data/beautyaiConstants";
import "./NilaBeautyAI.css";

const decodeJwtSubject = (rawToken = "") => {
  const token = String(rawToken || "").trim();
  if (!token || !token.includes(".")) return "";
  
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
  const [activeTab, setActiveTab] = useState("home"); // 'home', 'consent', 'usage', 'products', 'gallery'
  
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
    if (type === "success" || type === "info") {
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

  // Data Loading Functions
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
      setProgressLogs(result.success ? result.data : []);
    });
  }, [withBusy]);

  const loadSavedPlans = useCallback(async () => {
    await withBusy("saved-plans", async () => {
      const result = await fetchMyPlans();
      setSavedPlans(result.success ? result.data : []);
    });
  }, [withBusy]);

  const loadSavedSelfies = useCallback(async () => {
    await withBusy("saved-selfies", async () => {
      const result = await fetchMySelfies();
      setSavedSelfies(result.success ? result.data : []);
    });
  }, [withBusy]);

  const loadUsageStatus = useCallback(async () => {
    await withBusy("usage", async () => {
      const result = await fetchUsageStatus();
      if (result.success) {
        setUsageStatus(result.data?.usage || null);
        setFeatureFlags(result.data?.featureFlags || null);
      }
    });
  }, [withBusy]);

  const loadConsentStatus = useCallback(async () => {
    await withBusy("consent", async () => {
      const result = await fetchConsentStatus();
      setConsentStatus(result.success ? result.data : null);
    });
  }, [withBusy]);

  const loadAdminSettings = useCallback(async () => {
    await withBusy("admin-settings", async () => {
      const [rulesResult, alertsResult, statsResult] = await Promise.all([
        fetchSubscriptionRules(),
        fetchAdminAlerts(),
        fetchAdminStats(),
      ]);
      
      if (rulesResult.success) {
        setSubscriptionRules(rulesResult.data);
        setIsAdminControlsVisible(true);
      }
      if (alertsResult.success) setAdminAlerts(alertsResult.data);
      if (statsResult.success) setAdminStats(statsResult.data);
    });
  }, [withBusy]);

  // Initialize
  useEffect(() => {
    startAutoSync(30000, (progress) => {
      if (progress) pushStatus("info", STATUS_MESSAGES.INFO.SYNCING);
    });

    loadTips();
    loadSavedPlans();
    loadSavedSelfies();
    loadUsageStatus();
    loadConsentStatus();
    loadAdminSettings();

    const queueInterval = setInterval(() => {
      setOfflineQueueStats(getQueueStats());
    }, 5000);

    return () => {
      stopAutoSync();
      clearInterval(queueInterval);
    };
  }, [loadAdminSettings, loadConsentStatus, loadSavedPlans, loadSavedSelfies, loadTips, loadUsageStatus, pushStatus]);

  useEffect(() => {
    loadProgress(activePlanId);
  }, [activePlanId, loadProgress]);

  // Event Handlers
  const handlePlanReady = useCallback((bundle) => {
    setPlanBundle(bundle);
    if (!activePlanId) {
      setActivePlanTitle(String(bundle?.plan?.title || ""));
    }
    loadProgress(activePlanId);
    loadUsageStatus();
    loadConsentStatus();
  }, [activePlanId, loadConsentStatus, loadProgress, loadUsageStatus]);

  const handleDeleteSelfie = useCallback(async (selfieId) => {
    await withBusy(`delete-selfie-${selfieId}`, async () => {
      const result = await deleteSelfie(selfieId);
      if (result.success) {
        pushStatus("success", STATUS_MESSAGES.SUCCESS.PLAN_SAVED);
        loadSavedSelfies();
      } else {
        pushStatus("error", result.error);
      }
    });
  }, [loadSavedSelfies, pushStatus, withBusy]);

  const handleDeletePlan = useCallback(async (planId) => {
    if (!window.confirm("Are you sure you want to delete this plan?")) return;
    
    await withBusy(`delete-plan-${planId}`, async () => {
      const result = await apiDeletePlan(planId);
      if (result.success) {
        if (activePlanId === planId) {
          setActivePlanId("");
          setActivePlanTitle("");
          setPlanBundle(null);
        }
        pushStatus("success", STATUS_MESSAGES.SUCCESS.PLAN_SAVED);
        loadSavedPlans();
      } else {
        pushStatus("error", result.error);
      }
    });
  }, [activePlanId, loadSavedPlans, pushStatus, withBusy]);

  const handleDuplicatePlan = useCallback(async (planId) => {
    await withBusy(`duplicate-plan-${planId}`, async () => {
      const result = await apiDuplicatePlan(planId);
      if (result.success) {
        pushStatus("success", "Plan duplicated successfully!");
        loadSavedPlans();
      } else {
        pushStatus("error", result.error);
      }
    });
  }, [loadSavedPlans, pushStatus, withBusy]);

  const handleGrantConsent = useCallback(async (consentType) => {
    await withBusy(`consent-${consentType}`, async () => {
      const result = await grantConsent(consentType);
      if (result.success) {
        pushStatus("success", STATUS_MESSAGES.SUCCESS.CONSENT_GRANTED);
        loadConsentStatus();
      } else {
        pushStatus("error", result.error);
      }
    });
  }, [loadConsentStatus, pushStatus, withBusy]);

  const handleRevokeConsent = useCallback(async (consentType) => {
    await withBusy(`consent-${consentType}`, async () => {
      const result = await revokeConsent(consentType);
      if (result.success) {
        pushStatus("success", "Consent revoked successfully!");
        loadConsentStatus();
      } else {
        pushStatus("error", result.error);
      }
    });
  }, [loadConsentStatus, pushStatus, withBusy]);

  const handleCreateTip = useCallback(async (tipData) => {
    await withBusy("create-tip", async () => {
      const result = await createTip(tipData);
      if (result.success) {
        pushStatus("success", STATUS_MESSAGES.SUCCESS.TIP_CREATED);
        loadTips();
      } else {
        pushStatus("error", result.error);
      }
    });
  }, [loadTips, pushStatus, withBusy]);

  const handleUpdateSubscriptionRules = useCallback(async (rules) => {
    await withBusy("update-rules", async () => {
      const result = await apiUpdateSubscriptionRules(rules);
      if (result.success) {
        pushStatus("success", "Subscription rules updated!");
        setSubscriptionRules(rules);
      } else {
        pushStatus("error", result.error);
      }
    });
  }, [pushStatus, withBusy]);

  const handleBookSalon = useCallback(() => {
    pushStatus("success", "Opening Local Services for salon bookings.");
    navigate("/localservices");
  }, [navigate, pushStatus]);

  const handleOrderProducts = useCallback((products = []) => {
    pushStatus("success", "Opening product marketplace.");
    navigate("/ecommerce");
  }, [navigate, pushStatus]);

  const handleUpgrade = useCallback(() => {
    pushStatus("info", "Opening subscription page.");
    navigate("/dashboard");
  }, [navigate, pushStatus]);

  return (
    <section className="beauty-shell">
      <header className="beauty-hero">
        <p className="beauty-kicker">Lifestyle Module</p>
        <h1>✨ Nila Beauty AI</h1>
        <p>
          Personalized beauty care with AI-powered selfie analysis, custom plans, progress tracking, 
          and product recommendations.
        </p>
        {offlineQueueStats.pending > 0 && (
          <div className="offline-banner">
            📡 {offlineQueueStats.pending} changes pending sync
          </div>
        )}
      </header>

      {status.text && (
        <div className={`beauty-status ${status.type}`}>
          {status.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="beauty-tabs">
        <button
          type="button"
          className={activeTab === "home" ? "active" : ""}
          onClick={() => setActiveTab("home")}
        >
          Home
        </button>
        <button
          type="button"
          className={activeTab === "consent" ? "active" : ""}
          onClick={() => setActiveTab("consent")}
        >
          Privacy & Consent
        </button>
        <button
          type="button"
          className={activeTab === "usage" ? "active" : ""}
          onClick={() => setActiveTab("usage")}
        >
          Usage Stats
        </button>
        <button
          type="button"
          className={activeTab === "gallery" ? "active" : ""}
          onClick={() => setActiveTab("gallery")}
        >
          My Selfies ({savedSelfies.length})
        </button>
        <button
          type="button"
          className={activeTab === "products" ? "active" : ""}
          onClick={() => setActiveTab("products")}
        >
          Products
        </button>
        {isAdminControlsVisible && (
          <button
            type="button"
            className={activeTab === "admin" ? "active" : ""}
            onClick={() => setActiveTab("admin")}
          >
            Admin
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === "home" && (
        <>
          <BeautyTipsCarousel tips={tips} todaysTip={todaysTip} language={DEFAULTS.LANGUAGE} />
          
          <BeautyAIQuickStart
            onPlanReady={handlePlanReady}
            onBookSalon={handleBookSalon}
            onOrderProducts={handleOrderProducts}
            pushStatus={pushStatus}
            usageStatus={usageStatus}
            consentStatus={consentStatus}
            savedSelfies={savedSelfies}
            onRefreshSavedSelfies={loadSavedSelfies}
            initialPlanBundle={planBundle}
          />

          <BeautyProgressTracker
            logs={progressLogs}
            planId={activePlanId}
            planLabel={activePlanTitle}
            latestScore={Number(planBundle?.plan?.score || 0)}
            selfiePreview={planBundle?.selfiePreview || planBundle?.photoUrl || ""}
            snapshotScopeKey={snapshotScopeKey}
            pushStatus={pushStatus}
            onEntriesUpdate={() => {}}
          />
        </>
      )}

      {activeTab === "consent" && (
        <BeautyConsent
          consentStatus={consentStatus}
          onGrantConsent={handleGrantConsent}
          onRevokeConsent={handleRevokeConsent}
          isLoading={busyKey.startsWith("consent")}
        />
      )}

      {activeTab === "usage" && (
        <BeautyUsageStats
          usageStatus={usageStatus}
          featureFlags={featureFlags}
          onUpgrade={handleUpgrade}
        />
      )}

      {activeTab === "gallery" && (
        <BeautySelfieGallery
          selfies={savedSelfies}
          onDelete={handleDeleteSelfie}
          isDeleting={busyKey.startsWith("delete-selfie")}
        />
      )}

      {activeTab === "products" && (
        <BeautyProductRecommendations
          products={planBundle?.plan?.products || []}
          budget={planBundle?.profile?.budget || DEFAULTS.BUDGET}
          plan={planBundle?.plan || planBundle}
          onBudgetChange={(newBudget) => {
            if (planBundle?.plan?.id) {
              updatePlan(planBundle.plan.id, { budget: newBudget }).then(() => {
                pushStatus("success", "Budget preference updated");
                loadSavedPlans();
              });
            }
          }}
        />
      )}

      {activeTab === "admin" && isAdminControlsVisible && (
        <BeautyAdminPanel
          subscriptionRules={subscriptionRules}
          alerts={adminAlerts}
          stats={adminStats}
          onUpdateRules={handleUpdateSubscriptionRules}
          onCreateTip={handleCreateTip}
          isLoading={busyKey === "update-rules" || busyKey === "create-tip"}
        />
      )}
    </section>
  );
};

export default NilaBeautyAI;
