import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './constants';
import './AuspiciousDates.css';

const AuspiciousDates = () => {
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [purpose, setPurpose] = useState('marriage');

  useEffect(() => {
    fetchAuspiciousDates();
  }, [selectedMonth, selectedYear, purpose]);

  const fetchAuspiciousDates = async () => {
    setLoading(true);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/matrimonial/astrology/auspicious-dates`,
        {
          params: {
            month: selectedMonth,
            year: selectedYear,
            purpose,
          },
        }
      );

      setDates(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch auspicious dates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSuitabilityBadge = (score) => {
    if (score >= 80) return { text: 'Excellent', class: 'excellent' };
    if (score >= 60) return { text: 'Very Good', class: 'very-good' };
    if (score >= 40) return { text: 'Good', class: 'good' };
    return { text: 'Fair', class: 'fair' };
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i);

  return (
    <div className="auspicious-dates">
      <h3>Auspicious Dates (Muhurat)</h3>
      <p>Find the best dates for marriage, engagement, or other ceremonies</p>

      <div className="date-filters">
        <select
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          className="filter-select"
        >
          <option value="marriage">Marriage</option>
          <option value="engagement">Engagement</option>
          <option value="griha_pravesh">Griha Pravesh</option>
          <option value="mundan">Mundan</option>
        </select>

        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="filter-select"
        >
          {months.map((month, index) => (
            <option key={index} value={index + 1}>
              {month}
            </option>
          ))}
        </select>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="filter-select"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="dates-loading">Loading auspicious dates...</div>
      ) : dates.length === 0 ? (
        <div className="dates-empty">
          No highly auspicious dates found for this month. Try another month.
        </div>
      ) : (
        <div className="dates-list">
          {dates.map((dateInfo, index) => {
            const badge = getSuitabilityBadge(dateInfo.suitability);
            
            return (
              <div key={index} className="date-card">
                <div className="date-header">
                  <div className="date-main">
                    <span className="date-number">
                      {new Date(dateInfo.date).getDate()}
                    </span>
                    <div className="date-details">
                      <span className="date-month">
                        {new Date(dateInfo.date).toLocaleDateString('en-IN', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="date-day">{dateInfo.day}</span>
                    </div>
                  </div>
                  <span className={`suitability-badge ${badge.class}`}>
                    {badge.text}
                  </span>
                </div>

                <div className="date-info">
                  <div className="info-item">
                    <label>Tithi:</label>
                    <span>{dateInfo.tithi}</span>
                  </div>
                  <div className="info-item">
                    <label>Nakshatra:</label>
                    <span>{dateInfo.nakshatra}</span>
                  </div>
                </div>

                {dateInfo.muhurats && dateInfo.muhurats.length > 0 && (
                  <div className="muhurats">
                    <label>Auspicious Times:</label>
                    <div className="muhurat-list">
                      {dateInfo.muhurats.map((muhurat, i) => (
                        <div key={i} className="muhurat-item">
                          <span className="muhurat-time">
                            {muhurat.start} - {muhurat.end}
                          </span>
                          <span className="muhurat-name">{muhurat.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="dates-note">
        <p>
          <strong>Note:</strong> These dates are calculated based on Vedic Panchang.
          For personalized muhurat based on your birth details, consult an astrologer.
        </p>
      </div>
    </div>
  );
};

export default AuspiciousDates;
