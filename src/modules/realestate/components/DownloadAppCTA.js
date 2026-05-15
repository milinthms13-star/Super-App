import React from "react";

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
              Download on App Store
            </button>
            <button
              type="button"
              className="realestate-secondary-button"
              onClick={() => window.open("https://play.google.com", "_blank")}
            >
              Get it on Google Play
            </button>
          </div>
        </div>
        <div className="homesphere-cta-image" aria-hidden="true">
          <div className="homesphere-phone-mockup">Mobile App Preview</div>
        </div>
      </article>
    </section>
  );
};

export default DownloadAppCTA;
