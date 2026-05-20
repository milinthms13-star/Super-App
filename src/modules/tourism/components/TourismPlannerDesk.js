import React, { useMemo, useState } from "react";
import { formatInr } from "../tourismData";
import { buildAiTourItinerary } from "../tourismUpgradeUtils";

const TourismPlannerDesk = ({
  packages = [],
  onBookPackage,
  onOpenCustomDesk,
}) => {
  const [plannerInput, setPlannerInput] = useState({
    destination: "Munnar",
    days: 3,
    travelerType: "Family",
    budget: 25000,
  });

  const itinerary = useMemo(
    () => buildAiTourItinerary(plannerInput),
    [plannerInput]
  );

  const destinationPackages = useMemo(() => {
    const target = String(plannerInput.destination || "").toLowerCase();
    if (!target) return packages.slice(0, 4);
    const matched = packages.filter((pkg) =>
      `${pkg.destination || ""} ${pkg.title || ""}`.toLowerCase().includes(target)
    );
    return matched.slice(0, 4);
  }, [packages, plannerInput.destination]);

  return (
    <section className="tourism-section">
      <div className="tourism-section-heading">
        <h2>AI Itinerary + Nearby Explorer</h2>
        <p>Build a day-wise trip plan, check nearby highlights, and jump to booking instantly.</p>
      </div>

      <div className="tourism-planner-grid">
        <article className="tourism-panel">
          <h3>Plan Your Trip</h3>
          <div className="tourism-custom-form">
            <label className="tourism-field">
              <span>Destination</span>
              <input
                type="text"
                value={plannerInput.destination}
                onChange={(event) =>
                  setPlannerInput((current) => ({ ...current, destination: event.target.value }))
                }
                placeholder="Munnar / Alleppey / Wayanad / Kovalam"
              />
            </label>
            <label className="tourism-field">
              <span>Days</span>
              <input
                type="number"
                min="1"
                max="10"
                value={plannerInput.days}
                onChange={(event) =>
                  setPlannerInput((current) => ({ ...current, days: Number(event.target.value) }))
                }
              />
            </label>
            <label className="tourism-field">
              <span>Traveler Type</span>
              <select
                value={plannerInput.travelerType}
                onChange={(event) =>
                  setPlannerInput((current) => ({ ...current, travelerType: event.target.value }))
                }
              >
                <option value="Family">Family</option>
                <option value="Couple">Couple</option>
                <option value="Group">Group</option>
                <option value="Solo">Solo</option>
              </select>
            </label>
            <label className="tourism-field">
              <span>Budget (INR)</span>
              <input
                type="number"
                min="5000"
                step="500"
                value={plannerInput.budget}
                onChange={(event) =>
                  setPlannerInput((current) => ({ ...current, budget: Number(event.target.value) }))
                }
              />
            </label>
          </div>

          <div className="tourism-price-summary-card">
            <div>
              <span>Planner Confidence</span>
              <strong>{itinerary.confidence}%</strong>
            </div>
            <div>
              <span>Budget / Day</span>
              <strong>{formatInr(itinerary.budgetSummary.perDayBudget)}</strong>
            </div>
            <div>
              <span>Total Budget</span>
              <strong>{formatInr(itinerary.budgetSummary.totalBudget)}</strong>
            </div>
          </div>

          <div className="tourism-safety-note">
            Travel Safety: Share emergency contacts, keep local ID copies, and use verified vendors for transport and stay.
          </div>

          <div className="tourism-inline-actions">
            <button type="button" className="tourism-primary-button" onClick={onOpenCustomDesk}>
              Request Vendor Callback
            </button>
          </div>
        </article>

        <article className="tourism-panel">
          <h3>{itinerary.destination} Day-wise Itinerary</h3>
          <p className="tourism-card-meta">{itinerary.budgetSummary.recommendation}</p>
          <div className="tourism-planner-itinerary">
            {itinerary.dayPlan.map((day) => (
              <div key={`itinerary-day-${day.day}`} className="tourism-planner-day">
                <strong>{day.title}</strong>
                <p>{day.summary}</p>
                <ul className="tourism-itinerary-list">
                  {day.details.map((detail) => (
                    <li key={`${day.day}-${detail}`}>{detail}</li>
                  ))}
                </ul>
                <small>{day.transport} | {day.travelerNote}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="tourism-panel">
          <h3>Nearby Discovery</h3>
          <div className="tourism-planner-nearby">
            <div>
              <h4>Attractions</h4>
              <ul className="tourism-itinerary-list">
                {itinerary.nearby.attractions.map((item) => (
                  <li key={`attraction-${item}`}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Food</h4>
              <ul className="tourism-itinerary-list">
                {itinerary.nearby.food.map((item) => (
                  <li key={`food-${item}`}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Stay Options</h4>
              <ul className="tourism-itinerary-list">
                {itinerary.nearby.stays.map((item) => (
                  <li key={`stay-${item}`}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Transport</h4>
              <ul className="tourism-itinerary-list">
                {itinerary.nearby.transport.map((item) => (
                  <li key={`transport-${item}`}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </article>
      </div>

      <div className="tourism-panel">
        <div className="tourism-results-header">
          <h3>Matching Packages</h3>
          <span>Fast-book from AI planner results.</span>
        </div>
        <div className="tourism-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Package</th>
                <th>Destination</th>
                <th>Days</th>
                <th>Price</th>
                <th>Vendor</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {destinationPackages.map((pkg) => (
                <tr key={`planner-pkg-${pkg.id}`}>
                  <td>{pkg.title}</td>
                  <td>{pkg.destination}</td>
                  <td>{pkg.durationDays}</td>
                  <td>{formatInr(pkg.startPrice)}</td>
                  <td>{pkg.vendor}</td>
                  <td>
                    <button
                      type="button"
                      className="tourism-secondary-button"
                      onClick={() => onBookPackage(pkg.id)}
                    >
                      Book / Enquire
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default TourismPlannerDesk;
