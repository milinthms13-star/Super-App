import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../utils/api";
import { normalizeModuleId } from "../../utils/moduleRoutes";

const ratingToStars = (rating = 0) => {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  const full = Math.floor(r);
  const empty = 5 - full;
  return { full, empty, r };
};

const formatNumber = (n) => {
  const v = Number(n || 0);
  return Number.isFinite(v) ? v.toLocaleString("en-US") : "0";
};

const scorePill = (rating = 0, totalReviews = 0) => {
  const r = Number(rating || 0);
  const hasReviews = Number(totalReviews || 0) > 0;
  if (!hasReviews) return { label: "New / Low signal", tone: "muted" };
  if (r >= 4.5) return { label: "Strong", tone: "good" };
  if (r >= 3.8) return { label: "Good", tone: "good" };
  if (r >= 3.0) return { label: "Average", tone: "warn" };
  return { label: "Needs attention", tone: "bad" };
};

const ModuleRatings = () => {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE_URL}/app-data/module-ratings`, {
        params: { periodDays: 90 },
      });
      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to load module ratings");
      }
      setRatings(Array.isArray(res.data?.data?.ratings) ? res.data.data.ratings : []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo(() => {
    return (ratings || [])
      .map((r) => ({
        moduleId: normalizeModuleId(r.moduleId),
        displayName: r.moduleName || r.moduleId,
        rating: Number(r.rating || 0),
        totalReviews: Number(r.totalReviews || 0),
        reviewCount: Number(r.reviewCount || 0),
        lastUpdatedAt: r.updatedAt || r.lastUpdatedAt || null,
        score: Number(r.score || 0),
      }))
      .sort((a, b) => {
        // prefer score if present, else rating
        const aScore = a.score || a.rating;
        const bScore = b.score || b.rating;
        return bScore - aScore;
      });
  }, [ratings]);

  return (
    <div style={{ padding: 18, maxWidth: 1050, margin: "0 auto" }}>
      <h2 style={{ margin: "8px 0 12px", fontSize: 26 }}>Module Ratings</h2>
      <p style={{ margin: "0 0 18px", color: "#58657a", lineHeight: 1.6, fontSize: 14 }}>
        Hybrid score built from reviews/ratings where available and engagement analytics where reviews are missing.
      </p>

      {loading && <div className="app-loading">Loading module ratings...</div>}
      {error && (
        <div style={{ padding: 12, border: "1px solid #f2c0c0", borderRadius: 10, background: "#fff5f5", color: "#8a1f1f" }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Module</th>
                <th style={thStyle}>Rating</th>
                <th style={thStyle}>Reviews</th>
                <th style={thStyle}>Hybrid Score</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Last updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const stars = ratingToStars(row.rating);
                const pill = scorePill(row.rating, row.totalReviews);
                return (
                  <tr key={row.moduleId}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 800 }}>{row.displayName}</div>
                      <div style={{ color: "#8b96a9", fontSize: 12 }}>{row.moduleId}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ letterSpacing: 2, fontSize: 15, color: "#0d7a5f" }}>
                          {"★".repeat(stars.full)}{"☆".repeat(stars.empty)}
                        </div>
                        <div style={{ fontWeight: 800 }}>{row.rating ? row.rating.toFixed(1) : "—"}</div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 800 }}>{formatNumber(row.reviewCount || row.totalReviews)}</div>
                      <div style={{ color: "#8b96a9", fontSize: 12 }}>Total reviews: {formatNumber(row.totalReviews)}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 900 }}>{row.score ? row.score.toFixed(2) : "—"}</div>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 800,
                          border: `1px solid ${pillToneBorder[pill.tone]}`,
                          background: pillToneBg[pill.tone],
                          color: pillToneColor[pill.tone],
                        }}
                      >
                        {pill.label}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {row.lastUpdatedAt ? new Date(row.lastUpdatedAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && !loading && (
                <tr>
                  <td style={tdStyle} colSpan={6}>
                    No module ratings available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const thStyle = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid #d8dde6",
  background: "#f5f7fb",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.05,
  color: "#58657a",
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #eef2f7",
  verticalAlign: "top",
  fontSize: 14,
};

const pillToneBorder = {
  good: "#bfe9d8",
  warn: "#ffe2a8",
  bad: "#ffc2c2",
  muted: "#e2e6ee",
};
const pillToneBg = {
  good: "#ecfff6",
  warn: "#fff9eb",
  bad: "#fff1f1",
  muted: "#f5f7fb",
};
const pillToneColor = {
  good: "#0d7a5f",
  warn: "#8f6700",
  bad: "#8a1f1f",
  muted: "#58657a",
};

export default ModuleRatings;

