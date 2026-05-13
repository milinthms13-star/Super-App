import React, { useEffect, useMemo, useState } from "react";
import { calculateHoroscopeMatching } from "./api.js";

const getCompatibilityColor = (score) => {
  if (score >= 85) return "#4caf50";
  if (score >= 70) return "#8bc34a";
  if (score >= 50) return "#ffc107";
  if (score >= 36) return "#ff9800";
  return "#f44336";
};

const getCompatibilityLevel = (score) => {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Very Good";
  if (score >= 50) return "Good";
  if (score >= 36) return "Acceptable";
  return "Poor";
};

const HoroscopeMatching = ({ profile1Id, profile2Id, onClose }) => {
  const [matching, setMatching] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const gunaBreakdown = useMemo(() => {
    const guna = matching?.gunaScore || {};
    return [
      { name: "Varna", points: guna.varnaScore, max: 1 },
      { name: "Vasya", points: guna.vasyaScore, max: 2 },
      { name: "Tara", points: guna.taraScore, max: 3 },
      { name: "Yoni", points: guna.yoniScore, max: 4 },
      { name: "Graha Maitri", points: guna.graha_maitriScore, max: 5 },
      { name: "Gana", points: guna.ganaScore, max: 6 },
      { name: "Bhakoot", points: guna.bhakootScore, max: 7 },
      { name: "Nadi", points: guna.nadiScore, max: 8 },
    ];
  }, [matching]);

  const totalGunaPoints = gunaBreakdown.reduce((sum, item) => sum + Number(item.points || 0), 0);
  const overallScore = Number(matching?.overallScore || 0);

  const loadMatching = async () => {
    if (!profile1Id || !profile2Id) {
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await calculateHoroscopeMatching(profile1Id, profile2Id);
      setMatching(response?.data || response || null);
    } catch (error) {
      setMessage(`Unable to calculate compatibility: ${error.response?.data?.message || error.message}`);
      setMatching(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatching();
  }, [profile1Id, profile2Id]);

  if (loading) {
    return (
      <div className="horoscope-matching-container">
        <div className="loading">Calculating compatibility...</div>
      </div>
    );
  }

  if (!matching) {
    return (
      <div className="horoscope-matching-container">
        <div className="error">{message || "Unable to load horoscope data."}</div>
      </div>
    );
  }

  return (
    <div className="horoscope-matching-container">
      <div className="matching-header">
        <h2>Horoscope Compatibility</h2>
        {onClose ? (
          <button className="close-btn" onClick={onClose} type="button">
            Close
          </button>
        ) : null}
      </div>

      <div className="overall-score-card">
        <div className="score-info">
          <div className="compatibility-level" style={{ color: getCompatibilityColor(overallScore) }}>
            {getCompatibilityLevel(overallScore)}
          </div>
          <div className="guna-points">{totalGunaPoints} / 36 Guna Points</div>
          <div className="recommendation">
            <p>{matching?.recommendation || "No recommendation available."}</p>
          </div>
        </div>
      </div>

      <div className="matching-details">
        <button type="button" className="btn btn-outline toggle-details" onClick={() => setShowDetails((v) => !v)}>
          {showDetails ? "Hide details" : "Show details"}
        </button>
        {showDetails ? (
          <div className="guna-breakdown">
            {gunaBreakdown.map((guna) => (
              <div key={guna.name} className="guna-item">
                <div className="guna-header">
                  <span className="guna-name">{guna.name}</span>
                  <span className="guna-score">
                    {Number(guna.points || 0)} / {guna.max}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default HoroscopeMatching;

