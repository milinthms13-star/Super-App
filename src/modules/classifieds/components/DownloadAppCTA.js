import React from "react";

const DownloadAppCTA = () => {
  return (
    <section className="tradepost-download-cta">
      <article className="tradepost-surface-card tradepost-cta-card">
        <div className="tradepost-cta-content">
          <p className="tradepost-eyebrow">TradePost mobile app</p>
          <h2>Buy, sell, and chat faster on mobile.</h2>
          <p>Manage listings, receive buyer alerts, and close deals from anywhere.</p>
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
          <div className="tradepost-phone-mockup">
            <span>Live alerts</span>
            <strong>Instant buyer leads</strong>
            <small>Search, post, and close deals in one app.</small>
          </div>
        </div>
      </article>
    </section>
  );
};

export default DownloadAppCTA;
