import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../../contexts/AppContext';
import { API_BASE_URL } from './constants';

const HoroscopeMatching = ({ profile1Id, profile2Id, onClose }) => {
  const { currentUser } = useApp();
  const [matching, setMatching] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (profile1Id && profile2Id) {
      calculateCompatibility();
    }
  }, [profile1Id, profile2Id]);

  const calculateCompatibility = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/matrimonial/horoscope/match`,
        { profile1Id, profile2Id },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      setMatching(response.data);
    } catch (error) {
      setMessage(`✗ Failed to calculate: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getCompatibilityColor = (score) => {
    if (score >= 85) return '#4CAF50'; // Excellent - Green
    if (score >= 70) return '#8BC34A'; // Very Good - Light Green
    if (score >= 50) return '#FFC107'; // Good - Amber
    if (score >= 36) return '#FF9800'; // Acceptable - Orange
    return '#F44336'; // Poor - Red
  };

  const getCompatibilityLevel = (score) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Very Good';
    if (score >= 50) return 'Good';
    if (score >= 36) return 'Acceptable';
    return 'Poor';
  };

  if (loading) {
    return (
      <div className="horoscope-matching-container">
        <div className="loading">⏳ Calculating compatibility...</div>
      </div>
    );
  }

  if (!matching) {
    return (
      <div className="horoscope-matching-container">
        <div className="error">{message || 'Unable to load horoscope data'}</div>
      </div>
    );
  }

  const { overallScore, gunaScore, compatibilityLevel, recommendation, details } = matching;

  const gunaBreakdown = [
    { name: 'Varna', points: gunaScore.varnaScore, max: 1 },
    { name: 'Vasya', points: gunaScore.vasyaScore, max: 2 },
    { name: 'Tara', points: gunaScore.taraScore, max: 3 },
    { name: 'Yoni', points: gunaScore.yoniScore, max: 4 },
    { name: 'Graha Maitri', points: gunaScore.graha_maitriScore, max: 5 },
    { name: 'Gana', points: gunaScore.ganaScore, max: 6 },
    { name: 'Bhakoot', points: gunaScore.bhakootScore, max: 7 },
    { name: 'Nadi (Critical)', points: gunaScore.nadiScore, max: 8 },
  ];

  const totalGunaPoints = gunaBreakdown.reduce((sum, item) => sum + (item.points || 0), 0);

  return (
    <div className="horoscope-matching-container">
      <div className="matching-header">
        <h2>Horoscope Compatibility</h2>
        {onClose && (
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <div className="overall-score-card">
        <div className="score-circle">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="55"
              fill="none"
              stroke="#e0e0e0"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="55"
              fill="none"
              stroke={getCompatibilityColor(overallScore)}
              strokeWidth="8"
              strokeDasharray={`${(overallScore / 100) * 345.6} 345.6`}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
            <text x="60" y="65" textAnchor="middle" fontSize="28" fontWeight="bold" fill={getCompatibilityColor(overallScore)}>
              {Math.round(overallScore)}
            </text>
            <text x="60" y="85" textAnchor="middle" fontSize="12" fill="#666">
              / 100
            </text>
          </svg>
        </div>

        <div className="score-info">
          <div className="compatibility-level" style={{ color: getCompatibilityColor(overallScore) }}>
            {getCompatibilityLevel(overallScore)}
          </div>
          <div className="guna-points">
            {totalGunaPoints} / 36 Guna Points
          </div>
          <div className="recommendation">
            <p>{recommendation}</p>
          </div>
        </div>
      </div>

      <div className="matching-details">
        <button
          className="btn btn-outline toggle-details"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? '▼ Hide Details' : '▶ Show Details'}
        </button>

        {showDetails && (
          <div className="guna-breakdown">
            <h3>8-Guna Vedic Matching Breakdown</h3>
            <p className="guna-info">
              Minimum acceptable score: 18/36 (50%). Higher is better. Nadi (✓) is critical.
            </p>

            {gunaBreakdown.map((guna, idx) => (
              <div key={idx} className="guna-item">
                <div className="guna-header">
                  <span className="guna-name">
                    {guna.name}
                    {guna.name === 'Nadi (Critical)' && ' ⚠️'}
                  </span>
                  <span className="guna-score">
                    {guna.points || 0} / {guna.max}
                  </span>
                </div>
                <div className="guna-bar">
                  <div
                    className="guna-fill"
                    style={{
                      width: `${((guna.points || 0) / guna.max) * 100}%`,
                      backgroundColor:
                        (guna.points || 0) >= (guna.max * 0.75)
                          ? '#4CAF50'
                          : (guna.points || 0) >= (guna.max * 0.5)
                            ? '#FFC107'
                            : '#F44336',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="matching-analysis">
        <h3>Analysis</h3>
        {details && (
          <div className="analysis-content">
            <div className="analysis-item">
              <h4>Strengths:</h4>
              <ul>
                {details.strengths && details.strengths.map((strength, idx) => (
                  <li key={idx}>✓ {strength}</li>
                ))}
              </ul>
            </div>

            {details.challenges && details.challenges.length > 0 && (
              <div className="analysis-item">
                <h4>Challenges:</h4>
                <ul>
                  {details.challenges.map((challenge, idx) => (
                    <li key={idx}>⚠ {challenge}</li>
                  ))}
                </ul>
              </div>
            )}

            {details.advice && (
              <div className="analysis-item">
                <h4>Advice:</h4>
                <p>{details.advice}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="matching-info">
        <h4>Understanding Your Score</h4>
        <div className="score-guide">
          <div className="guide-item">
            <span className="guide-color" style={{ backgroundColor: '#4CAF50' }} />
            <span>Excellent (85+): Highly compatible match</span>
          </div>
          <div className="guide-item">
            <span className="guide-color" style={{ backgroundColor: '#8BC34A' }} />
            <span>Very Good (70-84): Very compatible</span>
          </div>
          <div className="guide-item">
            <span className="guide-color" style={{ backgroundColor: '#FFC107' }} />
            <span>Good (50-69): Compatible</span>
          </div>
          <div className="guide-item">
            <span className="guide-color" style={{ backgroundColor: '#FF9800' }} />
            <span>Acceptable (36-49): May work with effort</span>
          </div>
          <div className="guide-item">
            <span className="guide-color" style={{ backgroundColor: '#F44336' }} />
            <span>Poor (&lt;36): Challenging match</span>
          </div>
        </div>
      </div>

      <div className="matching-footer">
        <p>🔮 Based on traditional Vedic astrology (8-Guna system)</p>
        <p>💡 These are astrological indicators and not definitive of relationship success</p>
      </div>
    </div>
  );
};

export default HoroscopeMatching;
