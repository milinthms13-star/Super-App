import React, { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Save,
  CreditCard,
  CalendarDays,
  Package,
  IndianRupee,
  Layers,
  Sparkles,
  Copy,
} from "lucide-react";
import "./adminModuleSubscriptionDashboard.css";

const MODULES = [
  "Astrology",
  "Bill Pay",
  "Business Builder",
  "Classifieds",
  "Devadarshan",
  "Education",
  "Finance Hub",
  "Food Delivery",
  "Healthcare",
  "Hotel Booking",
  "Hyperlocal Delivery",
  "Job Portal",
  "Local Market",
  "Local Services",
  "Matrimonial",
  "Nila AI Hub",
  "Real Estate",
  "Resume Builder",
  "Skill Learning",
  "Tourism Market",
];

const METHODS = [
  "Free",
  "Monthly",
  "Quarterly",
  "Half-Yearly",
  "Yearly",
  "Lifetime",
  "Pay Per Use",
];
const DURATIONS = ["7 Days", "15 Days", "1 Month", "3 Months", "6 Months", "1 Year", "Lifetime"];
const PLAN_TYPES = ["Free", "Basic", "Standard", "Premium", "Pro", "Enterprise", "Custom"];

const initialFormState = {
  module: MODULES[0],
  planType: "Basic",
  planName: "",
  method: "Monthly",
  amount: "",
  duration: "1 Month",
  status: "Active",
  features: "",
  autoRenew: true,
  discountPct: 0,
  subscriptionMethod: "Monthly",
  trialDays: 0,
  currency: "INR",
};

export default function AdminModuleSubscriptionScreen() {
  const [plans, setPlans] = useState([
    {
      id: 1,
      module: "Astrology",
      planType: "Basic",
      planName: "Astrology Basic",
      method: "Monthly",
      amount: 199,
      duration: "1 Month",
      status: "Active",
      features: "Daily horoscope, basic zodiac insights, monthly forecast",
      autoRenew: true,
      discountPct: 0,
    },
    {
      id: 3,
      module: "Astrology",
      planType: "Premium",
      planName: "Astrology Premium",
      method: "Yearly",
      amount: 1499,
      duration: "1 Year",
      status: "Active",
      features:
        "Birth chart, compatibility, remedies, yearly report, priority support",
      autoRenew: true,
      discountPct: 10,
    },
    {
      id: 2,
      module: "Resume Builder",
      planType: "Pro",
      planName: "Resume Pro",
      method: "Yearly",
      amount: 999,
      duration: "1 Year",
      status: "Active",
      features: "AI resume, cover letter, templates, PDF export",
      autoRenew: true,
      discountPct: 0,
    },
  ]);

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialFormState);

  const filteredPlans = useMemo(() => {
    const query = String(search || "").toLowerCase();
    return plans.filter(
      (plan) =>
        String(plan.module || "").toLowerCase().includes(query) ||
        String(plan.planName || "").toLowerCase().includes(query) ||
        String(plan.method || "").toLowerCase().includes(query)
    );
  }, [plans, search]);

  const resetForm = () => {
    setEditingId(null);
    setForm(initialFormState);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!String(form.planName || "").trim()) return alert("Please enter plan name");
    if (
      form.method !== "Free" &&
      form.method !== "Lifetime" &&
      Number(form.amount) < 0
    ) {
      return alert("Please enter a valid amount");
    }

    const payload = {
      ...form,
      amount: form.method === "Free" ? 0 : Number(form.amount || 0),
      subscriptionMethod: form.method,
      currency: form.currency || "INR",
    };

    if (editingId) {
      setPlans((prev) => prev.map((plan) => (plan.id === editingId ? { ...payload, id: editingId } : plan)));
    } else {
      setPlans((prev) => [{ ...payload, id: Date.now() }, ...prev]);
    }

    resetForm();
  };

  const handleEdit = (plan) => {
    setEditingId(plan.id);
    setForm({
      ...initialFormState,
      ...plan,
    });
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this subscription plan?")) {
      setPlans((prev) => prev.filter((plan) => plan.id !== id));
    }
  };

  const groupedPlans = useMemo(() => {
    return filteredPlans.reduce((groups, plan) => {
      if (!groups[plan.module]) groups[plan.module] = [];
      groups[plan.module].push(plan);
      return groups;
    }, {});
  }, [filteredPlans]);

  const totalRevenue = plans.reduce((sum, plan) => sum + Number(plan.amount || 0), 0);
  const activePlans = plans.filter((plan) => plan.status === "Active").length;
  const modulesWithPlans = new Set(plans.map((plan) => plan.module)).size;
  const totalSubscriptionValue = plans.reduce(
    (sum, plan) => sum + Number(plan.amount || 0) * 12,
    0
  );

  const sparkA = [12, 18, 15, 26, 22, 30, 28];
  const sparkB = [9, 11, 14, 13, 17, 19, 21];
  const sparkC = [6, 9, 8, 12, 15, 14, 18];
  const sparkD = [18, 14, 20, 22, 19, 25, 27];
  const sparkE = [10, 12, 16, 15, 18, 20, 23];

  const Sparkline = ({ values, stroke = "#22d3ee" }) => {
    const w = 150;
    const h = 34;
    const pad = 3;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(1e-6, max - min);
    const points = values
      .map((v, i) => {
        const x = pad + (i * (w - pad * 2)) / (values.length - 1);
        const y = pad + (h - pad * 2) * (1 - (v - min) / range);
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <svg className="admin-sub-spark" viewBox={`0 0 ${w} ${h}`}>
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={stroke} stopOpacity=".15" />
            <stop offset="1" stopColor={stroke} stopOpacity=".65" />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        <polyline
          fill="none"
          stroke="url(#g)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          opacity=".55"
        />
      </svg>
    );
  };

  const formatINR = (n) => {
    const value = Number(n || 0);
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return `₹${value}`;
    }
  };

  const mainStats = [
    {
      label: "Total Plans",
      value: plans.length,
      icon: <Package size={22} />,
      trend: { dir: "up", text: "+8.2%" },
      spark: sparkA,
      stroke: "#22d3ee",
      display: (v) => v,
    },
    {
      label: "Active Plans",
      value: activePlans,
      icon: <CreditCard size={22} />,
      trend: { dir: "up", text: "+3.1%" },
      spark: sparkB,
      stroke: "#a78bfa",
      display: (v) => v,
    },
    {
      label: "Modules Configured",
      value: modulesWithPlans,
      icon: <Layers size={22} />,
      trend: { dir: "up", text: "+1.4%" },
      spark: sparkC,
      stroke: "#34d399",
      display: (v) => v,
    },
    {
      label: "Monthly Revenue",
      value: totalRevenue,
      icon: <IndianRupee size={22} />,
      trend: { dir: "up", text: "+6.8%" },
      spark: sparkD,
      stroke: "#22c55e",
      display: (v) => formatINR(v),
    },
    {
      label: "Total Subscription Value",
      value: totalSubscriptionValue,
      icon: <Sparkles size={20} />,
      trend: { dir: "down", text: "-0.7%" },
      spark: sparkE,
      stroke: "#fbbf24",
      display: (v) => formatINR(v),
    },
  ];

  const breadcrumb = (
    <div className="admin-sub-breadcrumbs">
      <div className="admin-sub-crumb">
        <span style={{ opacity: 0.9 }}>Admin</span>
      </div>
      <span style={{ opacity: 0.35 }}>›</span>
      <div className="admin-sub-crumb">
        <span style={{ opacity: 0.95 }}>Module Subscription</span>
      </div>
      <span style={{ opacity: 0.35 }}>›</span>
      <div className="admin-sub-crumb" aria-current="page">
        Module Subscription Settings
      </div>
    </div>
  );

  const StatusPill = ({ status }) => {
    const s = String(status || "");
    const cls =
      s === "Active" ? "active" : s === "Inactive" ? "inactive" : s === "Coming Soon" ? "coming" : "inactive";
    const label = s || "Inactive";
    return <span className={`admin-sub-pill ${cls}`}>{label}</span>;
  };

  const Toggle = ({ checked, onChange, label }) => (
    <div className="admin-sub-toggleRow">
      <div>
        <div className="admin-sub-toggleLabel">{label}</div>
        <div className="admin-sub-toggleHelp">Auto-renew toggles billing behavior.</div>
      </div>
      <label className="admin-sub-switch" aria-label={label}>
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span />
      </label>
    </div>
  );

  const PreviewCard = ({ draft }) => {
    const price = draft.method === "Free" ? 0 : Number(draft.amount || 0);
    const discountText =
      typeof draft.discountPct === "number" && draft.discountPct > 0
        ? `${draft.discountPct}% off`
        : "No discount";

    return (
      <div className="admin-sub-preview">
        <div className="admin-sub-sectionTitle">
          <div>
            <div style={{ fontWeight: 950, fontSize: 14, letterSpacing: "-.01em" }}>
              Real-time Plan Preview
            </div>
            <div className="admin-sub-muted">How customers will see your plan.</div>
          </div>
          <span className={`admin-sub-pill ${draft.status === "Active" ? "active" : draft.status === "Inactive" ? "inactive" : "coming"}`}
            style={{ background: "rgba(255,255,255,.04)" }}>
            {draft.status || "Active"}
          </span>
        </div>
        <div style={{ height: 12 }} />
        <div className="admin-sub-planCard" style={{ gridColumn: "span 12", cursor: "default" }}>
          <div className="admin-sub-planCardHeader">
            <div>
              <div style={{ fontSize: 12, color: "rgba(234,240,255,.7)", fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em" }}>
                {draft.module}
              </div>
              <div style={{ marginTop: 6, fontWeight: 950, fontSize: 18, letterSpacing: "-.02em" }}>
                {draft.planName || "Untitled Plan"}
              </div>
              <div style={{ marginTop: 6, color: "rgba(234,240,255,.7)", fontSize: 12, lineHeight: 1.5 }}>
                {draft.features?.trim()
                  ? draft.features.trim()
                  : "Add features included to enrich this preview."}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 26, fontWeight: 1000, letterSpacing: "-.02em" }}>
                {draft.method === "Free" ? "Free" : `₹${price}`}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, fontWeight: 850, color: "rgba(234,240,255,.7)" }}>
                {draft.duration}
              </div>
            </div>
          </div>
          <div className="admin-sub-divider" />
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span className="admin-sub-pill active" style={{ background: "rgba(34,211,238,.10)", borderColor: "rgba(34,211,238,.35)", color: "#8AF3FF" }}>
              {draft.planType || "Basic"}
            </span>
            <span className="admin-sub-pill" style={{ background: "rgba(99,102,241,.10)", borderColor: "rgba(99,102,241,.32)", color: "#C4B5FD" }}>
              {draft.subscriptionMethod || draft.method || "Monthly"}
            </span>
            <span className="admin-sub-pill" style={{ background: "rgba(251,191,36,.12)", borderColor: "rgba(251,191,36,.32)", color: "#FFE9B3" }}>
              {discountText}
            </span>
            <span className={`admin-sub-pill ${draft.autoRenew ? "active" : "inactive"}`}>
              Auto Renew: {draft.autoRenew ? "On" : "Off"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-sub-root">
      <div className="admin-sub-container">
        <header className="admin-sub-header">
          <div className="admin-sub-header-inner">
            {breadcrumb}
            <div className="admin-sub-titleRow">
              <div>
                <div className="admin-sub-title">Module Subscription Settings</div>
                <div className="admin-sub-subtitle">
                  Premium control for modules, plans, billing cycles, and subscriber growth.
                </div>
              </div>
              <button onClick={resetForm} className="admin-sub-cta" type="button" title="Create New Plan">
                <Plus size={18} /> Create New Plan
              </button>
            </div>
          </div>
        </header>

        <section className="admin-sub-statsGrid">
          {mainStats.map((s, idx) => {
            const trendClass = s.trend.dir === "up" ? "up" : "down";
            return (
              <div key={idx} className="admin-sub-stat" style={{ gridColumn: "span 12" }}>
                <div className="admin-sub-statInner">
                  <div>
                    <div className="admin-sub-statLabel">{s.label}</div>
                    <div className="admin-sub-statValue">{s.display(s.value)}</div>
                  </div>
                  <div className="admin-sub-icon" aria-hidden="true">
                    {s.icon}
                  </div>
                </div>
                <div className="admin-sub-statFoot">
                  <span className={`admin-sub-badgeTrend ${trendClass}`}>{s.trend.text}</span>
                  <Sparkline values={s.spark} stroke={s.stroke} />
                </div>
              </div>
            );
          })}
        </section>

        <section className="admin-sub-panels">
          <div className="admin-sub-left">
            <form onSubmit={handleSubmit} className="admin-sub-formCard">
              <div className="admin-sub-sectionTitle">
                <div className="admin-sub-h2" style={{ fontSize: 16 }}>
                  <CalendarDays size={20} style={{ marginRight: 10, verticalAlign: "-4px" }} />
                  {editingId ? "Edit Subscription Plan" : "Create Subscription Plan"}
                </div>
                <div className="admin-sub-muted">Multi-plan per module supported</div>
              </div>
              <div className="admin-sub-divider" />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(12,minmax(0,1fr))", gap: 12 }}>
                <div style={{ gridColumn: "span 12" }} className="admin-sub-float">
                  <select
                    value={form.module}
                    onChange={(e) => setForm({ ...form, module: e.target.value })}
                    className="admin-sub-input"
                    placeholder=" "
                  >
                    {MODULES.map((module) => (
                      <option key={module} value={module}>
                        {module}
                      </option>
                    ))}
                  </select>
                  <label>Select Module</label>
                </div>

                <div style={{ gridColumn: "span 6" }} className="admin-sub-float">
                  <select
                    value={form.planType}
                    onChange={(e) => setForm({ ...form, planType: e.target.value })}
                    className="admin-sub-input"
                    placeholder=" "
                  >
                    {PLAN_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <label>Plan Type</label>
                </div>

                <div style={{ gridColumn: "span 6" }} className="admin-sub-float">
                  <input
                    value={form.planName}
                    onChange={(e) => setForm({ ...form, planName: e.target.value })}
                    placeholder=" "
                    className="admin-sub-input"
                  />
                  <label>Plan Name</label>
                </div>

                <div style={{ gridColumn: "span 6" }} className="admin-sub-float">
                  <select
                    value={form.method}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        method: e.target.value,
                        subscriptionMethod: e.target.value,
                        amount: e.target.value === "Free" ? 0 : form.amount,
                      })}
                    className="admin-sub-input"
                    placeholder=" "
                  >
                    {METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                  <label>Subscription Method</label>
                </div>

                <div style={{ gridColumn: "span 6" }} className="admin-sub-float">
                  <input
                    type="number"
                    value={form.amount}
                    disabled={form.method === "Free"}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder=" "
                    className="admin-sub-input"
                  />
                  <label>Amount</label>
                </div>

                <div style={{ gridColumn: "span 6" }} className="admin-sub-float">
                  <select
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="admin-sub-input"
                    placeholder=" "
                  >
                    {DURATIONS.map((duration) => (
                      <option key={duration} value={duration}>
                        {duration}
                      </option>
                    ))}
                  </select>
                  <label>Duration</label>
                </div>

                <div style={{ gridColumn: "span 6" }} className="admin-sub-float">
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="admin-sub-input"
                    placeholder=" "
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Coming Soon">Coming Soon</option>
                  </select>
                  <label>Status</label>
                </div>

                <div style={{ gridColumn: "span 12" }}>
                  <div style={{ fontWeight: 950, fontSize: 13, marginBottom: 10, color: "rgba(234,240,255,.86)" }}>
                    Features Included
                  </div>
                  <div className="admin-sub-float">
                    <textarea
                      rows={4}
                      value={form.features}
                      onChange={(e) => setForm({ ...form, features: e.target.value })}
                      placeholder=" "
                    />
                    <label>Features Included</label>
                  </div>
                  <div style={{ marginTop: 8, color: "rgba(234,240,255,.65)", fontSize: 12 }}>
                    Add up to a few bullet-like features for better conversion.
                  </div>
                </div>

                <div style={{ gridColumn: "span 12" }}>
                  <Toggle
                    label="Auto Renewal"
                    checked={Boolean(form.autoRenew)}
                    onChange={() => setForm({ ...form, autoRenew: !form.autoRenew })}
                  />
                </div>
              </div>

              <div className="admin-sub-divider" />

              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button type="submit" className="admin-sub-cta" style={{ flex: 1, justifyContent: "center" }}>
                  <Save size={17} /> {editingId ? "Update Plan" : "Save Plan"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    style={{
                      flex: 0,
                      borderRadius: 16,
                      padding: "10px 14px",
                      fontWeight: 900,
                      fontSize: 13,
                      border: "1px solid rgba(255,255,255,.16)",
                      background: "rgba(255,255,255,.04)",
                      color: "#EAF0FF",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <PreviewCard draft={form} />
          </div>

          <div className="admin-sub-right">
            <div className="admin-sub-formCard">
              <div className="admin-sub-sectionTitle">
                <div>
                  <div className="admin-sub-h2" style={{ fontSize: 16 }}>
                    Subscription Plans
                  </div>
                  <div className="admin-sub-muted">Search, manage, and drag to reorder per module.</div>
                </div>
                <div className="admin-sub-toolbar">
                  <div style={{ position: "relative", minWidth: 260 }}>
                    <Search
                      size={18}
                      style={{ position: "absolute", left: 12, top: 12, color: "rgba(234,240,255,.55)" }}
                    />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search module or plan"
                      className="admin-sub-input"
                      style={{ paddingLeft: 40, width: "100%" }}
                    />
                  </div>
                </div>
              </div>

              <div className="admin-sub-divider" />

              <div className="admin-sub-planCardsGrid">
                {Object.entries(groupedPlans).map(([moduleName, modulePlans]) => (
                  <div key={moduleName} style={{ gridColumn: "span 12" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 1000, letterSpacing: "-.01em" }}>{moduleName}</div>
                        <div className="admin-sub-muted" style={{ marginTop: 4 }}>
                          {modulePlans.length} plan{modulePlans.length > 1 ? "s" : ""} configured
                        </div>
                      </div>
                      <button
                        type="button"
                        className="admin-sub-iconBtn"
                        onClick={() => {
                          setEditingId(null);
                          setForm({
                            ...initialFormState,
                            module: moduleName,
                            planType: "Basic",
                            planName: "",
                            method: "Monthly",
                            amount: "",
                            duration: "1 Month",
                            status: "Active",
                            features: "",
                            autoRenew: true,
                          });
                        }}
                        title="Add Plan"
                      >
                        <Plus size={18} />
                      </button>
                    </div>

                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(12,minmax(0,1fr))" }}>
                      {modulePlans.map((plan) => (
                        <div
                          key={plan.id}
                          className="admin-sub-planCard"
                          style={{ gridColumn: "span 12" }}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", String(plan.id));
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const draggedId = Number(e.dataTransfer.getData("text/plain"));
                            const targetId = Number(plan.id);
                            if (!draggedId || draggedId === targetId) return;

                            setPlans((prev) => {
                              const current = prev.slice();
                              const draggedIndex = current.findIndex((p) => p.id === draggedId);
                              const targetIndex = current.findIndex((p) => p.id === targetId);
                              if (draggedIndex < 0 || targetIndex < 0) return prev;

                              const [moved] = current.splice(draggedIndex, 1);
                              current.splice(targetIndex, 0, moved);
                              return current;
                            });
                          }}
                        >
                          <div className="admin-sub-planCardHeader">
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                <span
                                  className="admin-sub-pill"
                                  style={{
                                    background: "rgba(99,102,241,.10)",
                                    borderColor: "rgba(99,102,241,.32)",
                                    color: "#C4B5FD",
                                  }}
                                >
                                  {plan.planType || "Basic"}
                                </span>
                                <StatusPill status={plan.status} />
                                {String(plan.planType || "").toLowerCase().includes("premium") && (
                                  <span className="admin-sub-popular">Popular</span>
                                )}
                              </div>
                              <div
                                style={{
                                  marginTop: 10,
                                  fontWeight: 1000,
                                  fontSize: 16,
                                  letterSpacing: "-.02em",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: 520,
                                }}
                              >
                                {plan.planName}
                              </div>
                              <div
                                style={{
                                  marginTop: 6,
                                  color: "rgba(234,240,255,.68)",
                                  fontSize: 12,
                                  lineHeight: 1.5,
                                  maxWidth: 720,
                                }}
                              >
                                {plan.features?.trim() ? plan.features.trim() : "No features added"}
                              </div>
                              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <span
                                  className="admin-sub-pill active"
                                  style={{
                                    background: "rgba(34,211,238,.10)",
                                    borderColor: "rgba(34,211,238,.35)",
                                    color: "#8AF3FF",
                                  }}
                                >
                                  {plan.method}
                                </span>
                                <span
                                  className="admin-sub-pill"
                                  style={{
                                    background: "rgba(148,163,184,.10)",
                                    borderColor: "rgba(148,163,184,.30)",
                                    color: "#D7E2FF",
                                  }}
                                >
                                  {plan.duration}
                                </span>
                                <span
                                  className="admin-sub-pill"
                                  style={{
                                    background: "rgba(251,191,36,.12)",
                                    borderColor: "rgba(251,191,36,.32)",
                                    color: "#FFE9B3",
                                  }}
                                >
                                  ₹{plan.amount}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                              <div className="admin-sub-pill" style={{ background: "rgba(255,255,255,.04)" }}>
                                Subscribers: {Math.max(0, (plan.amount || 0) / 10).toFixed(0)}
                              </div>
                              <div style={{ display: "flex", gap: 10 }}>
                                <div className="admin-sub-iconBtn" role="button" tabIndex={0} onClick={() => handleEdit(plan)} title="Edit">
                                  <Edit3 size={16} />
                                </div>
                                <div
                                  className="admin-sub-iconBtn"
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => {
                                    setPlans((prev) => [
                                      {
                                        ...plan,
                                        id: Date.now(),
                                        planName: `${plan.planName} (Copy)`,
                                      },
                                      ...prev,
                                    ]);
                                  }}
                                  title="Duplicate"
                                >
                                  <Copy size={16} />
                                </div>
                                <div
                                  className="admin-sub-iconBtn"
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => handleDelete(plan.id)}
                                  title="Delete"
                                  style={{ borderColor: "rgba(239,68,68,.25)" }}
                                >
                                  <Trash2 size={16} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {filteredPlans.length === 0 && (
                <div
                  style={{
                    marginTop: 10,
                    textAlign: "center",
                    color: "rgba(234,240,255,.62)",
                    padding: 22,
                    border: "1px solid rgba(255,255,255,.12)",
                    borderRadius: 18,
                    background: "rgba(255,255,255,.03)",
                  }}
                >
                  No subscription plans found.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

