import React from "react";

const DownloadAppCTA = () => {
  return (
    <section className="tradepost-download-cta">
      <article className="tradepost-surface-card tradepost-cta-card">
        <div className="tradepost-cta-content">
          <h2>Get the TradePost App</h2>
          <p>Browse listings, contact sellers, and manage your ads on the go.</p>
          <div className="tradepost-app-buttons">
            <button
              type="button"
              className="classifieds-secondary-button"
              onClick={() => window.open("https://apps.apple.com", "_blank")}
            >
              Download on App Store
            </button>
            <button
              type="button"
              className="classifieds-secondary-button"
              onClick={() => window.open("https://play.google.com", "_blank")}
            >
              Get it on Google Play
            </button>
          </div>
        </div>
        <div className="tradepost-cta-image" aria-hidden="true">
          <div className="tradepost-phone-mockup">Mobile App Preview</div>
        </div>
      </article>
    </section>
  );
};

export default DownloadAppCTA;