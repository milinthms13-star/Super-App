import React, { useMemo } from "react";

/**
 * PropertyComparePanel
 * Side-by-side comparison of up to 3 selected properties.
 * Compares: price, price/sqft, area, bedrooms, amenities, trust score, proximity.
 * Zero external dependencies — pure React + CSS.
 */

const TRUST_FLAGS = [
  { key: "verified", label: "Owner verified", check: (p) => p.verified },
  { key: "reraNumber", label: "RERA", check: (p) => Boolean(p.reraNumber) },
  { key: "titleDeedStatus", label: "Title deed", check: (p) => p.titleDeedStatus === "verified" },
  { key: "taxReceipt", label: "Tax receipt", check: (p) => p.taxReceipt },
  { key: "buildingPermit", label: "Building permit", check: (p) => p.buildingPermit },
  { key: "encumbranceCertificate", label: "EC", check: (p) => p.encumbranceCertificate },
];

const formatInr = (val) => {
  if (!val) return "—";
  if (val >= 100) return `₹${(val / 100).toFixed(2)} Cr`;
  return `₹${val} L`;
};

const BestBadge = ({ show }) =>
  show ? <span className="re-compare-best" aria-label="Best value">Best</span> : null;

const PropertyComparePanel = ({ properties = [], compareIds = [], onRemove, onClose }) => {
  const compareProperties = useMemo(
    () => compareIds.map((id) => properties.find((p) => p.id === id)).filter(Boolean),
    [properties, compareIds]
  );

  const pricePerSqfts = useMemo(
    () =>
      compareProperties.map((p) =>
        p.priceValue > 0 && p.areaSqft > 0
          ? Math.round((p.priceValue * 100000) / p.areaSqft)
          : null
      ),
    [compareProperties]
  );

  const trustScores = useMemo(
    () =>
      compareProperties.map(
        (p) => TRUST_FLAGS.filter((f) => f.check(p)).length
      ),
    [compareProperties]
  );

  // Find best values for highlighting
  const minPpsf = Math.min(...pricePerSqfts.filter(Boolean));
  const maxTrust = Math.max(...trustScores);
  const maxArea = Math.max(...compareProperties.map((p) => p.areaSqft || 0));
  const minPrice = Math.min(...compareProperties.filter((p) => p.priceValue > 0).map((p) => p.priceValue));

  // All unique amenities across compared properties
  const allAmenities = useMemo(() => {
    const set = new Set();
    compareProperties.forEach((p) => (p.amenities || []).forEach((a) => set.add(a)));
    return [...set].sort();
  }, [compareProperties]);

  if (compareProperties.length === 0) return null;

  return (
    <div className="re-compare-panel" role="dialog" aria-label="Property comparison">
      <div className="re-compare-header">
        <h3>Compare properties ({compareProperties.length})</h3>
        <button type="button" className="re-compare-close" onClick={onClose} aria-label="Close comparison">✕</button>
      </div>

      <div className="re-compare-scroll">
        <table className="re-compare-table" aria-label="Property comparison table">
          <thead>
            <tr>
              <th className="re-compare-row-label">Feature</th>
              {compareProperties.map((p) => (
                <th key={p.id} className="re-compare-col-header">
                  <div className="re-compare-prop-header">
                    {p.image && (
                      <img
                        src={p.image}
                        alt={p.title}
                        className="re-compare-thumb"
                        loading="lazy"
                      />
                    )}
                    <span>{p.title}</span>
                    <span className="re-compare-prop-location">📍 {p.location}</span>
                    <button
                      type="button"
                      className="re-compare-remove"
                      onClick={() => onRemove(p.id)}
                      aria-label={`Remove ${p.title} from comparison`}
                    >
                      ✕
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* PRICE */}
            <tr>
              <td className="re-compare-row-label">Price</td>
              {compareProperties.map((p, i) => (
                <td key={p.id} className={`re-compare-cell ${p.priceValue === minPrice ? "re-compare-highlight" : ""}`}>
                  {p.priceLabel}
                  <BestBadge show={p.priceValue === minPrice} />
                </td>
              ))}
            </tr>

            {/* PRICE / SQFT */}
            <tr>
              <td className="re-compare-row-label">Price / sq ft</td>
              {compareProperties.map((p, i) => (
                <td key={p.id} className={`re-compare-cell ${pricePerSqfts[i] === minPpsf ? "re-compare-highlight" : ""}`}>
                  {pricePerSqfts[i] != null ? `₹${pricePerSqfts[i].toLocaleString("en-IN")}` : "—"}
                  <BestBadge show={pricePerSqfts[i] === minPpsf} />
                </td>
              ))}
            </tr>

            {/* AREA */}
            <tr>
              <td className="re-compare-row-label">Area</td>
              {compareProperties.map((p) => (
                <td key={p.id} className={`re-compare-cell ${p.areaSqft === maxArea ? "re-compare-highlight" : ""}`}>
                  {p.area}
                  <BestBadge show={p.areaSqft === maxArea} />
                </td>
              ))}
            </tr>

            {/* BEDROOMS */}
            <tr>
              <td className="re-compare-row-label">Bedrooms</td>
              {compareProperties.map((p) => (
                <td key={p.id} className="re-compare-cell">
                  {p.bedrooms > 0 ? `${p.bedrooms} BHK` : "Studio"}
                </td>
              ))}
            </tr>

            {/* TYPE & POSSESSION */}
            <tr>
              <td className="re-compare-row-label">Type</td>
              {compareProperties.map((p) => (
                <td key={p.id} className="re-compare-cell">{p.type}</td>
              ))}
            </tr>
            <tr>
              <td className="re-compare-row-label">Possession</td>
              {compareProperties.map((p) => (
                <td key={p.id} className="re-compare-cell">
                  {p.readyToMove ? (
                    <span className="re-compare-ready">Ready ✓</span>
                  ) : (
                    p.possession || "TBA"
                  )}
                </td>
              ))}
            </tr>

            {/* TRUST SCORE */}
            <tr>
              <td className="re-compare-row-label">Trust score</td>
              {compareProperties.map((p, i) => (
                <td key={p.id} className={`re-compare-cell ${trustScores[i] === maxTrust ? "re-compare-highlight" : ""}`}>
                  <div className="re-compare-trust-bar-wrap">
                    <div className="re-compare-trust-bar-track">
                      <div
                        className="re-compare-trust-bar-fill"
                        style={{ width: `${Math.round((trustScores[i] / TRUST_FLAGS.length) * 100)}%` }}
                      />
                    </div>
                    <span>{trustScores[i]}/{TRUST_FLAGS.length}</span>
                  </div>
                  <BestBadge show={trustScores[i] === maxTrust} />
                </td>
              ))}
            </tr>

            {/* RERA */}
            <tr>
              <td className="re-compare-row-label">RERA</td>
              {compareProperties.map((p) => (
                <td key={p.id} className="re-compare-cell">
                  {p.reraNumber ? (
                    <span className="re-compare-yes">✓ {p.reraNumber}</span>
                  ) : (
                    <span className="re-compare-no">—</span>
                  )}
                </td>
              ))}
            </tr>

            {/* NEARBY */}
            <tr>
              <td className="re-compare-row-label">School nearby</td>
              {compareProperties.map((p) => (
                <td key={p.id} className="re-compare-cell">
                  {p.nearbySchoolKm != null ? `${p.nearbySchoolKm} km` : "—"}
                </td>
              ))}
            </tr>
            <tr>
              <td className="re-compare-row-label">Hospital nearby</td>
              {compareProperties.map((p) => (
                <td key={p.id} className="re-compare-cell">
                  {p.nearbyHospitalKm != null ? `${p.nearbyHospitalKm} km` : "—"}
                </td>
              ))}
            </tr>
            <tr>
              <td className="re-compare-row-label">Metro nearby</td>
              {compareProperties.map((p) => (
                <td key={p.id} className="re-compare-cell">
                  {p.nearbyMetroKm != null ? `${p.nearbyMetroKm} km` : "—"}
                </td>
              ))}
            </tr>

            {/* AMENITIES DIFF */}
            {allAmenities.length > 0 && (
              <tr>
                <td className="re-compare-row-label re-compare-section-head" colSpan={compareProperties.length + 1}>
                  Amenities
                </td>
              </tr>
            )}
            {allAmenities.map((amenity) => (
              <tr key={amenity}>
                <td className="re-compare-row-label re-compare-amenity-label">{amenity}</td>
                {compareProperties.map((p) => (
                  <td key={p.id} className="re-compare-cell">
                    {(p.amenities || []).includes(amenity) ? (
                      <span className="re-compare-yes" aria-label="Available">✓</span>
                    ) : (
                      <span className="re-compare-no" aria-label="Not available">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PropertyComparePanel;
