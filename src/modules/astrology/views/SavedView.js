import React from "react";
import { astrologyService } from "../../../services/astrologyService";

const SavedView = ({
  profileApi,
  kundliApi,
  handleRestoreSavedReading,
  formatSavedReadingDate,
  setActiveSection,
}) => (
  <div className="astro-card-grid">
    <article className="astrology-panel astro-result-card">
      <h4>Saved daily reports</h4>
      {profileApi.recentSavedReadings.length ? (
        <div className="astrology-mini-history-list">
          {profileApi.recentSavedReadings.map((item) => (
            <button 
              key={`${item.sign}-${item.readingDate}`} 
              type="button" 
              className="astrology-mini-history-item" 
              onClick={() => handleRestoreSavedReading(item)}
            >
              <strong>{astrologyService.getFallbackSign(item.sign).label}</strong>
              <span>{formatSavedReadingDate(item.readingDate)}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="astrology-history-empty">No saved daily reports.</p>
      )}
    </article>
    
    <article className="astrology-panel astro-result-card">
      <h4>Saved Kundli</h4>
      {kundliApi.kundliHistory.length ? (
        <div className="astrology-mini-history-list">
          {kundliApi.kundliHistory.slice(0, 6).map((item) => (
            <button 
              key={item.id} 
              type="button" 
              className="astrology-mini-history-item" 
              onClick={() => { 
                kundliApi.handleRestoreKundliSnapshot(item); 
                setActiveSection("kundli"); 
              }}
            >
              <strong>{item.profileName || "Profile"}</strong>
              <span>{formatSavedReadingDate(item.createdAt)}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="astrology-history-empty">No saved Kundli reports.</p>
      )}
    </article>

    <article className="astrology-panel astro-result-card">
      <h4>Compatibility history</h4>
      {kundliApi.compatibilityHistory?.length ? (
        <div className="astrology-mini-history-list">
          {kundliApi.compatibilityHistory.slice(0, 6).map((item) => (
            <button 
              key={item.id} 
              type="button" 
              className="astrology-mini-history-item" 
              onClick={() => { 
                kundliApi.handleRestoreCompatibilitySnapshot(item); 
                setActiveSection("match"); 
              }}
            >
              <strong>{item.sign} + {item.partnerSign}</strong>
              <span>{formatSavedReadingDate(item.createdAt)}</span>
              <span>Score: {item.data?.score || "N/A"}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="astrology-history-empty">No compatibility checks saved.</p>
      )}
    </article>
  </div>
);

export default SavedView;
