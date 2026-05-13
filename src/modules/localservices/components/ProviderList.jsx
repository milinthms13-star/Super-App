import React from "react";

function ProviderBadge({ text, tone }) {
  return <span className={`local-services-badge local-services-badge-${tone}`}>{text}</span>;
}

function ProviderList({
  providers,
  loading,
  error,
  formatInr,
  onSelectProvider,
  onRequestQuote,
  onCall,
  onWhatsApp,
  onViewDetails,
}) {
  return (
    <article className="local-services-panel">
      <h2>Provider Listings</h2>
      {loading ? <p className="local-services-empty-card">Loading providers...</p> : null}
      {error ? <p className="local-services-empty-card">{error}</p> : null}
      {!loading && !error ? (
        <div className="local-services-provider-list">
          {providers.length === 0 ? (
            <p className="local-services-empty-card">No providers match current filters.</p>
          ) : (
            providers.map((provider) => (
              <div key={provider.id} className="local-services-provider-item">
                <div className="local-services-provider-head">
                  <img src={provider.image} alt={`${provider.name} logo`} />
                  <div>
                    <h3>{provider.name}</h3>
                    <p>
                      {provider.city} | Start {formatInr(provider.priceStart)} | Rating {provider.rating}
                    </p>
                  </div>
                </div>
                <p>
                  {provider.address} | Service areas: {(provider.serviceAreas || []).join(", ")}
                </p>
                <p>
                  Reviews {provider.reviewsCount} | Response {provider.responseMinutes} mins | Distance{" "}
                  {provider.distanceKm || 0} km
                </p>
                <div className="local-services-badges">
                  {provider.verified ? <ProviderBadge text="Verified" tone="verified" /> : null}
                  {provider.premium ? <ProviderBadge text="Premium" tone="premium" /> : null}
                  {provider.fastResponse ? <ProviderBadge text="Fast Response" tone="fast" /> : null}
                </div>
                <div className="local-services-actions">
                  <button type="button" onClick={() => onSelectProvider(provider)}>
                    Select
                  </button>
                  <button type="button" onClick={() => onRequestQuote(provider)}>
                    Request Quote
                  </button>
                  <button type="button" onClick={() => onViewDetails(provider)}>
                    View Details
                  </button>
                  <button type="button" onClick={() => onCall(provider)}>
                    Call
                  </button>
                  <button type="button" onClick={() => onWhatsApp(provider)}>
                    WhatsApp
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </article>
  );
}

export default ProviderList;
