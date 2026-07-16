import React, { useMemo } from "react";
import { MARKET_TRENDS, STAMP_DUTY_RATES } from "../realEstateConstants";

/**
 * PriceInsightsPanel
 * Displays market price trends, price/sqft comparison, stamp duty costs,
 * and demand index — all sourced from free/static government data references.
 */
const DEMAND_COLORS = {
  "Very High": "#0d7a69",
  High: "#2196a0",
  Medium: "#c98a2e",
  Low: "#c84d4d",
};

const PriceInsightsPanel = ({ property }) => {
  const cityKey = useMemo(() => {
    if (!property?.location) return null;
    return Object.keys(MARKET_TRENDS).find(
      (k) => k.toLowerCase() === (property.location || "").toLowerCase()
    );
  }, [property?.location]);

  const trend = cityKey ? MARKET_TRENDS[cityKey] : null;

  const stateKey = useMemo(() => {
    if (!property?.state && !property?.location) return null;
    // Try to match state from location name
    const stateGuess = Object.keys(STAMP_DUTY_RATES).find((s) =>
      (property.state || "").toLowerCase().includes(s.toLowerCase()) ||
      ["Kerala", "Karnataka", "Telangana", "Maharashtra"].find(
        (k) => k.toLowerCase() === (property.location || "").toLowerCase()
      ) === s
    );
    // Fallback: detect state by city
    const cityToState = {
      Kochi: "Kerala", Trivandrum: "Kerala", Kozhikode: "Kerala", Thrissur: "Kerala",
      Bangalore: "Karnataka", Mysore: "Karnataka",
      Hyderabad: "Telangana",
      Chennai: "Tamil Nadu", Coimbatore: "Tamil Nadu",
      Mumbai: "Maharashtra", Pune: "Maharashtra",
      Ahmedabad: "Gujarat", Surat: "Gujarat",
      Jaipur: "Rajasthan",
      Kolkata: "West Bengal",
      Lucknow: "Uttar Pradesh", Kanpur: "Uttar Pradesh",
      Delhi: "Delhi NCR", Gurgaon: "Delhi NCR", Noida: "Delhi NCR",
    };
    return stateGuess || cityToState[property.location] || null;
  }, [property?.location, property?.state]);

  const stampDuty = stateKey ? STAMP_DUTY_RATES[stateKey] : null;

  const pricePerSqft = useMemo(() => {
    if (!property?.priceValue || !property?.areaSqft) return null;
    return Math.round((property.priceValue * 100000) / property.areaSqft);
  }, [property?.priceValue, property?.areaSqft]);

  const acquisitionCost = useMemo(() => {
    if (!property?.priceValue || !stampDuty) return null;
    const basePrice = property.priceValue * 100000;
    const stampAmt = (basePrice * stampDuty.stampDuty) / 100;
    const regAmt = (basePrice * stampDuty.registration) / 100;
    const gst = property.intent !== "sale" ? 0 : property.underConstruction ? (basePrice * 5) / 100 : 0;
    const total = basePrice + stampAmt + regAmt + gst;
    return {
      base: basePrice,
      stamp: stampAmt,
      reg: regAmt,
      gst,
      total,
      stampPct: stampDuty.stampDuty,
      regPct: stampDuty.registration,
    };
  }, [property?.priceValue, stampDuty, property?.intent, property?.underConstruction]);

  const formatInr = (amount) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    return `₹${Math.round(amount).toLocaleString("en-IN")}`;
  };

  if (!property) return null;

  return (
    <section className="re-insights-panel">
      {/* PRICE PER SQFT */}
      <div className="re-insights-card">
        <div className="re-insights-card-header">
          <h4>Price per sq ft</h4>
          <span className="re-insights-badge">Market data</span>
        </div>
        <div className="re-insights-ppsf-row">
          <div className="re-insights-ppsf-value">
            {pricePerSqft ? (
              <>
                <strong>₹{pricePerSqft.toLocaleString("en-IN")}</strong>
                <span>/sq ft</span>
              </>
            ) : (
              <span className="re-insights-muted">Price not specified</span>
            )}
          </div>
          {trend && (
            <div className="re-insights-ppsf-compare">
              <span>City avg</span>
              <strong>₹{trend.avgPricePerSqft.toLocaleString("en-IN")}/sqft</strong>
              {pricePerSqft && (
                <span
                  className={`re-insights-delta ${
                    pricePerSqft <= trend.avgPricePerSqft ? "below" : "above"
                  }`}
                >
                  {pricePerSqft <= trend.avgPricePerSqft ? "▼ Below avg" : "▲ Above avg"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MARKET TREND */}
      {trend && (
        <div className="re-insights-card">
          <div className="re-insights-card-header">
            <h4>Market pulse — {cityKey}</h4>
            <span
              className="re-insights-demand-badge"
              style={{ background: DEMAND_COLORS[trend.demandIndex] || "#888" }}
            >
              {trend.demandIndex} demand
            </span>
          </div>

          <div className="re-insights-trend-row">
            <div className="re-insights-trend-stat">
              <span>YoY growth</span>
              <strong className="re-insights-growth">+{trend.yoyGrowthPct}%</strong>
            </div>
            <div className="re-insights-trend-stat">
              <span>Avg price/sqft</span>
              <strong>₹{trend.avgPricePerSqft.toLocaleString("en-IN")}</strong>
            </div>
          </div>

          {/* CSS-only mini bar chart for growth */}
          <div className="re-insights-bar-chart" aria-label="Price growth indicator">
            <div className="re-insights-bar-label">Growth rate vs national avg (7%)</div>
            <div className="re-insights-bar-track">
              <div
                className="re-insights-bar-fill national"
                style={{ width: "70%" }}
                title="National avg ~7%"
              />
            </div>
            <div className="re-insights-bar-track">
              <div
                className="re-insights-bar-fill city"
                style={{ width: `${Math.min(100, (trend.yoyGrowthPct / 20) * 100)}%` }}
                title={`${cityKey}: +${trend.yoyGrowthPct}%`}
              />
            </div>
            <div className="re-insights-bar-legend">
              <span><span className="re-dot national" />National avg ~7%</span>
              <span><span className="re-dot city" />{cityKey} +{trend.yoyGrowthPct}%</span>
            </div>
          </div>

          <div className="re-insights-hot-localities">
            <span className="re-insights-label">Hot localities</span>
            <div className="re-insights-chips">
              {trend.hotLocalities.map((loc) => (
                <span key={loc} className="re-insights-chip">{loc}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TOTAL COST OF ACQUISITION */}
      {acquisitionCost && (
        <div className="re-insights-card">
          <div className="re-insights-card-header">
            <h4>Total cost of acquisition</h4>
            {stateKey && <span className="re-insights-badge">{stateKey}</span>}
          </div>

          <div className="re-insights-cost-breakdown">
            <div className="re-insights-cost-row">
              <span>Base price</span>
              <strong>{formatInr(acquisitionCost.base)}</strong>
            </div>
            <div className="re-insights-cost-row">
              <span>Stamp duty ({acquisitionCost.stampPct}%)</span>
              <strong>{formatInr(acquisitionCost.stamp)}</strong>
            </div>
            <div className="re-insights-cost-row">
              <span>Registration ({acquisitionCost.regPct}%)</span>
              <strong>{formatInr(acquisitionCost.reg)}</strong>
            </div>
            {acquisitionCost.gst > 0 && (
              <div className="re-insights-cost-row">
                <span>GST (5% — under construction)</span>
                <strong>{formatInr(acquisitionCost.gst)}</strong>
              </div>
            )}
            <div className="re-insights-cost-row total">
              <span>Total acquisition cost</span>
              <strong>{formatInr(acquisitionCost.total)}</strong>
            </div>
          </div>

          {stampDuty?.notes && (
            <p className="re-insights-stamp-note">ℹ️ {stampDuty.notes}</p>
          )}
        </div>
      )}

      {/* NO DATA FALLBACK */}
      {!trend && !stampDuty && (
        <div className="re-insights-card re-insights-empty">
          <p>Market insights not available for <strong>{property.location}</strong> yet.</p>
          <p className="re-insights-muted">Data is available for Kochi, Bangalore, Hyderabad, Chennai, Mumbai, and Pune.</p>
        </div>
      )}

      <p className="re-insights-disclaimer">
        * Market data is sourced from public records and industry reports. Verify with a certified valuer before transacting.
      </p>
    </section>
  );
};

export default PriceInsightsPanel;
