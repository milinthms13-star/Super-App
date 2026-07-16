import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './constants';
import './GunaMilanCalculator.css';

const GunaMilanCalculator = ({ myKundali }) => {
  const [otherProfileId, setOtherProfileId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculateCompatibility = async () => {
    if (!otherProfileId) {
      alert('Please enter a profile ID');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/matrimonial/astrology/guna-milan`,
        { otherProfileId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      setResult(response.data.data);
    } catch (error) {
      console.error('Guna Milan calculation failed:', error);
      alert(error.response?.data?.message || 'Failed to calculate compatibility');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (points, max) => {
    const percentage = (points / max) * 100;
    if (percentage >= 70) return '#4caf50';
    if (percentage >= 50) return '#ff9800';
    return '#f44336';
  };

  return (
    <div className="guna-milan-calculator">
      <h3>Guna Milan (Ashtakoot) Calculator</h3>
      <p>Calculate marriage compatibility based on Vedic astrology</p>

      <div className="profile-input">
        <input
          type="text"
          placeholder="Enter profile ID to check compatibility"
          value={otherProfileId}
          onChange={(e) => setOtherProfileId(e.target.value)}
        />
        <button
          className="btn btn-primary"
          onClick={calculateCompatibility}
          disabled={loading}
        >
          {loading ? 'Calculating...' : 'Calculate'}
        </button>
      </div>

      {result && (
        <div className="compatibility-result">
          <div className="overall-score">
            <div className="score-circle" style={{ borderColor: getScoreColor(result.totalPoints, result.maxPoints) }}>
              <span className="score">{result.totalPoints}</span>
              <span className="max">/ {result.maxPoints}</span>
            </div>
            <div className="score-details">
              <h4>{result.compatibility} Match</h4>
              <p className="percentage">{result.percentage}% Compatible</p>
              <p className="recommendation">{result.recommendation}</p>
            </div>
          </div>

          <div className="gunas-breakdown">
            <h4>Detailed Breakdown (Ashtakoot)</h4>
            
            {Object.entries(result.gunas).map(([key, guna]) => (
              <div key={key} className="guna-item">
                <div className="guna-header">
                  <span className="guna-name">{guna.name}</span>
                  <span className="guna-score">
                    {guna.points} / {guna.max}
                  </span>
                </div>
                <div className="guna-bar">
                  <div
                    className="guna-fill"
                    style={{
                      width: `${(guna.points / guna.max) * 100}%`,
                      backgroundColor: getScoreColor(guna.points, guna.max),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="interpretation">
            <h4>What This Means</h4>
            <ul>
              <li><strong>18+ points:</strong> Good compatibility for marriage</li>
              <li><strong>24+ points:</strong> Very good match</li>
              <li><strong>28+ points:</strong> Excellent match</li>
              <li><strong>Below 18:</strong> May face challenges, consult astrologer</li>
            </ul>
            <p className="note">
              Note: Guna Milan is one factor. Consider personality, values, and family compatibility too.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GunaMilanCalculator;
