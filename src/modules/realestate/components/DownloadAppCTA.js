import React from "react";

/**
 * DownloadAppCTA
 * Simple call-to-action for mobile app download.
 * Appears at the bottom of the public homepage.
 */
const DownloadAppCTA = () => {
  return (
    <section className="homesphere-download-cta">
      <article className="homesphere-surface-card homesphere-cta-card">
        <div className="homesphere-cta-content">
          <h2>Get the HomeSphere App</h2>
          <p>Search properties, schedule visits, and chat with sellers on the go.</p>
          <div className="homesphere-app-buttons">
            <button
              type="button"
              className="realestate-secondary-button"
              onClick={() => window.open("https://apps.apple.com", "_blank")}
            >
              📱 App Store
            </button>
            <button
              type="button"
              className="realestate-secondary-button"
              onClick={() => window.open("https://play.google.com", "_blank")}
            >
              🤖 Google Play
            </button>
          </div>
        </div>
        <div className="homesphere-cta-image">
          <div className="homesphere-phone-mockup">
            📱 App preview
          </div>
        </div>
      </article>
    </section>
  );
};

export default DownloadAppCTA;
