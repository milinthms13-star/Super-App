import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './constants';
import KundaliForm from './KundaliForm';
import KundaliChart from './KundaliChart';
import GunaMilanCalculator from './GunaMilanCalculator';
import AuspiciousDates from './AuspiciousDates';
import './AstrologyHub.css';

const AstrologyHub = () => {
  const [activeTab, setActiveTab] = useState('kundali');
  const [myKundali, setMyKundali] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyKundali();
  }, []);

  const fetchMyKundali = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/matrimonial/astrology/kundali`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );
      setMyKundali(response.data.data);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Failed to fetch Kundali:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKundaliCreated = (kundali) => {
    setMyKundali(kundali);
    setActiveTab('view');
  };

  const downloadPDF = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/matrimonial/astrology/kundali/download-pdf`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'my-kundali.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Failed to download Kundali PDF');
    }
  };

  if (loading) {
    return <div className="astrology-loading">Loading astrology data...</div>;
  }

  return (
    <div className="astrology-hub">
      <div className="astrology-header">
        <h2>🔮 Astrology & Kundali</h2>
        <p>Find your perfect match through Vedic astrology</p>
      </div>

      <div className="astrology-tabs">
        <button
          className={`tab ${activeTab === 'kundali' ? 'active' : ''}`}
          onClick={() => setActiveTab('kundali')}
        >
          {myKundali ? 'My Kundali' : 'Create Kundali'}
        </button>
        {myKundali && (
          <>
            <button
              className={`tab ${activeTab === 'view' ? 'active' : ''}`}
              onClick={() => setActiveTab('view')}
            >
              View Chart
            </button>
            <button
              className={`tab ${activeTab === 'compatibility' ? 'active' : ''}`}
              onClick={() => setActiveTab('compatibility')}
            >
              Guna Milan
            </button>
          </>
        )}
        <button
          className={`tab ${activeTab === 'dates' ? 'active' : ''}`}
          onClick={() => setActiveTab('dates')}
        >
          Auspicious Dates
        </button>
      </div>

      <div className="astrology-content">
        {activeTab === 'kundali' && !myKundali && (
          <div className="create-kundali">
            <h3>Create Your Kundali</h3>
            <p>Enter your birth details to generate your Vedic birth chart</p>
            <KundaliForm onSuccess={handleKundaliCreated} />
          </div>
        )}

        {activeTab === 'kundali' && myKundali && (
          <div className="kundali-summary">
            <div className="summary-card">
              <h3>Your Kundali Summary</h3>
              
              <div className="summary-grid">
                <div className="summary-item">
                  <label>Ascendant (Lagna)</label>
                  <span className="value">{myKundali.kundali.ascendant}</span>
                </div>
                
                <div className="summary-item">
                  <label>Moon Sign (Rashi)</label>
                  <span className="value">{myKundali.kundali.moonSign}</span>
                </div>
                
                <div className="summary-item">
                  <label>Sun Sign</label>
                  <span className="value">{myKundali.kundali.sunSign}</span>
                </div>
                
                <div className="summary-item">
                  <label>Nakshatra</label>
                  <span className="value">{myKundali.kundali.nakshatra}</span>
                </div>
              </div>

              {myKundali.doshas && myKundali.doshas.length > 0 && (
                <div className="doshas-section">
                  <h4>Doshas Detected</h4>
                  {myKundali.doshas.map((dosha, index) => (
                    <div key={index} className={`dosha-card severity-${dosha.severity.toLowerCase()}`}>
                      <h5>{dosha.name}</h5>
                      <p className="severity">Severity: {dosha.severity}</p>
                      <p className="description">{dosha.description}</p>
                      
                      {dosha.remedies && dosha.remedies.length > 0 && (
                        <div className="remedies">
                          <strong>Remedies:</strong>
                          <ul>
                            {dosha.remedies.map((remedy, i) => (
                              <li key={i}>{remedy}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="action-buttons">
                <button className="btn btn-primary" onClick={() => setActiveTab('view')}>
                  View Full Chart
                </button>
                <button className="btn btn-outline" onClick={downloadPDF}>
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'view' && myKundali && (
          <KundaliChart kundali={myKundali.kundali} />
        )}

        {activeTab === 'compatibility' && myKundali && (
          <GunaMilanCalculator myKundali={myKundali} />
        )}

        {activeTab === 'dates' && (
          <AuspiciousDates />
        )}
      </div>
    </div>
  );
};

export default AstrologyHub;
