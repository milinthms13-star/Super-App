import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/api";
import { getStoredAuthToken } from "../../utils/auth";
import BeautyAIQuickStart from "./BeautyAIQuickStart";
import BeautyProgressTracker from "./BeautyProgressTracker";
import "./NilaBeautyAI.css";

const NilaBeautyAI = () => {
  const token = getStoredAuthToken();
  const navigate = useNavigate();

  const [status, setStatus] = useState({ type: "", text: "" });
  const [tips, setTips] = useState([]);
  const [todaysTip, setTodaysTip] = useState("");
  const [planBundle, setPlanBundle] = useState(null);
  const [progressLogs, setProgressLogs] = useState([]);
  const [isAdminControlsVisible, setIsAdminControlsVisible] = useState(false);
  const [subscriptionRules, setSubscriptionRules] = useState(null);
  const [adminTipForm, setAdminTipForm] = useState({
    title: "",
    text: "",
    category: "general",
    language: "en",
  });
  const [busyKey, setBusyKey] = useState("");

  const request = useMemo(
    () =>
      axios.create({
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
    [token]
  );

  const pushStatus = useCallback((type, text) => {
    setStatus({ type, text });
  }, []);

  const withBusy = useCallback(async (key, fn) => {
    setBusyKey(key);
    try {
      await fn();
    } finally {
      setBusyKey("");
    }
  }, []);

  const loadTips = useCallback(async () => {
    await withBusy("tips", async () => {
      try {
        const response = await request.get(buildApiUrl("/beauty-ai/tips/today"), {
          params: { language: "en" },
        });
        const tipText =
          response.data?.todayTip?.text || "Hydrate, sleep well, and keep your routine consistent.";
        setTodaysTip(tipText);
        setTips(Array.isArray(response.data?.tips) ? response.data.tips : []);
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to load beauty tips.");
      }
    });
  }, [pushStatus, request, withBusy]);

  const loadProgress = useCallback(async () => {
    await withBusy("progress", async () => {
      try {
        const response = await request.get(buildApiUrl("/beauty-ai/progress-log/mine"));
        setProgressLogs(Array.isArray(response.data?.logs) ? response.data.logs : []);
      } catch (_error) {
        setProgressLogs([]);
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
    loadAdminSettings();
  }, [loadAdminSettings, loadProgress, loadTips]);

  const handlePlanReady = useCallback(
    (bundle) => {
      setPlanBundle(bundle);
      loadProgress();
    },
    [loadProgress]
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
        pushStatus={pushStatus}
      />

      <BeautyProgressTracker
        request={request}
        logs={progressLogs}
        latestScore={Number(planBundle?.plan?.score || 0)}
        selfiePreview={planBundle?.selfiePreview || ""}
        pushStatus={pushStatus}
        onEntriesUpdate={() => {}}
      />

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
