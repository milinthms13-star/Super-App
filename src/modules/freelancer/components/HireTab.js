import React from "react";
import CallRequest from "./CallRequest";
import ChatThread from "./ChatThread";
import PortfolioSection from "./PortfolioSection";
import ProviderProfile from "./ProviderProfile";
import ReviewsSection from "./ReviewsSection";

const HireTab = ({
  providerListState,
  providers,
  providersError,
  formatInr,
  handleProviderProfile,
  rolePermissions,
  setStatusMessage,
  setBookingForm,
  setActiveTab,
  toggleCompareProvider,
  toggleSaveProvider,
  savedProviderIds,
  openProviderPanel,
  compareProviderIds,
  filteredCompareProviders,
  activeProviderPanel,
  activeProviderForPanel,
  closeProviderPanel,
  chatByProvider,
  chatDraft,
  setChatDraft,
  sendChatMessage,
  callRequestNote,
  setCallRequestNote,
  submitCallRequest,
  reviewDraft,
  setReviewDraft,
  submitProviderReview,
  selectedProvider,
  quoteForm,
  setQuoteForm,
  categoryOptions,
  districtOptions,
  submitQuote,
  quoteResult,
  profileLoading,
}) => (
  <section className="freelancer-section">
    <div className="freelancer-section-header">
      <h2>Hire Professionals</h2>
      <p>View profile, compare, save, chat/call, reviews, portfolio and service area.</p>
    </div>

    {providerListState === "loading" ? (
      <div className="freelancer-skeleton-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="freelancer-skeleton-card" key={`skeleton-${index}`} />
        ))}
      </div>
    ) : null}
    {providerListState === "error" ? <p className="freelancer-error">{providersError}</p> : null}
    {providerListState === "empty" ? (
      <p className="freelancer-note">No results found. Try relaxing filters.</p>
    ) : null}

    {providerListState === "ready" ? (
      <div className="freelancer-card-grid">
        {providers.map((provider) => (
          <article key={provider._id} className="freelancer-card">
            <h3>{provider.name}</h3>
            <p>
              {provider.category} | {provider.type} | {provider.district}
            </p>
            <p>
              Rating {provider.rating} ({provider.reviewCount} reviews) | Experience {provider.experience} years
            </p>
            <p>
              {formatInr(provider.hourlyRate)} / hr | Starts from {formatInr(provider.gigStartsFrom)}
            </p>
            <p>
              Response {provider.responseMinutes} min | Completion {provider.completionRate}% | Service area{" "}
              {(provider.serviceAreas || []).join(", ")}
            </p>
            <div className="freelancer-tag-row">
              {(provider.verificationBadges || []).map((badge) => (
                <span key={`${provider._id}-${badge}`}>{badge}</span>
              ))}
            </div>
            <div className="freelancer-inline-actions">
              <button type="button" onClick={() => handleProviderProfile(provider._id)}>
                View Profile
              </button>
              <button
                type="button"
                disabled={!rolePermissions.canBook}
                onClick={() => {
                  if (!rolePermissions.canBook) {
                    setStatusMessage("Switch to Customer/Admin role to create bookings.");
                    return;
                  }
                  setBookingForm((current) => ({ ...current, providerId: provider._id }));
                  setActiveTab("bookings");
                }}
              >
                Book Now
              </button>
              <button type="button" onClick={() => toggleCompareProvider(provider._id)}>
                Compare
              </button>
              <button type="button" onClick={() => toggleSaveProvider(provider._id)}>
                {savedProviderIds.includes(provider._id) ? "Saved" : "Save"}
              </button>
              <button type="button" onClick={() => void openProviderPanel(provider, "call")}>
                Call
              </button>
              <button type="button" onClick={() => void openProviderPanel(provider, "chat")}>
                Chat
              </button>
              <button type="button" onClick={() => void openProviderPanel(provider, "reviews")}>
                Reviews
              </button>
              <button type="button" onClick={() => void openProviderPanel(provider, "portfolio")}>
                Portfolio
              </button>
              <button
                type="button"
                onClick={() => setStatusMessage(`Service area: ${(provider.serviceAreas || []).join(", ")}`)}
              >
                Service Area
              </button>
            </div>
          </article>
        ))}
      </div>
    ) : null}

    {compareProviderIds.length > 0 ? (
      <article className="freelancer-panel">
        <h3>Compare Providers ({compareProviderIds.length}/3)</h3>
        <div className="freelancer-list-grid">
          {filteredCompareProviders.map((provider) => (
            <div key={`compare-${provider._id}`} className="freelancer-list-item">
              <strong>{provider.name}</strong>
              <p>Rating: {provider.rating}</p>
              <p>Rate: {formatInr(provider.hourlyRate)}</p>
              <p>Response: {provider.responseMinutes} min</p>
            </div>
          ))}
        </div>
      </article>
    ) : null}

    {activeProviderPanel && activeProviderForPanel ? (
      <article className="freelancer-panel">
        <div className="freelancer-panel-headline">
          <h3>
            {activeProviderPanel === "chat" ? "Chat Thread" : ""}
            {activeProviderPanel === "call" ? "Call Request" : ""}
            {activeProviderPanel === "reviews" ? "Reviews" : ""}
            {activeProviderPanel === "portfolio" ? "Portfolio" : ""} - {activeProviderForPanel.name}
          </h3>
          <button type="button" onClick={closeProviderPanel}>
            Close
          </button>
        </div>

        {activeProviderPanel === "chat" ? (
          <ChatThread
            messages={chatByProvider[activeProviderForPanel._id] || []}
            chatDraft={chatDraft}
            setChatDraft={setChatDraft}
            onSendMessage={sendChatMessage}
          />
        ) : null}

        {activeProviderPanel === "call" ? (
          <CallRequest
            callRequestNote={callRequestNote}
            setCallRequestNote={setCallRequestNote}
            onSubmit={submitCallRequest}
          />
        ) : null}

        {activeProviderPanel === "reviews" ? (
          <ReviewsSection
            reviewDraft={reviewDraft}
            setReviewDraft={setReviewDraft}
            canSubmitReview={rolePermissions.canSubmitReview}
            onSubmitReview={submitProviderReview}
            reviews={selectedProvider?.reviews || []}
          />
        ) : null}

        {activeProviderPanel === "portfolio" ? (
          <PortfolioSection
            portfolio={selectedProvider?.portfolio || []}
            fallbackCategory={selectedProvider?.category || ""}
          />
        ) : null}
      </article>
    ) : null}

    <article className="freelancer-panel">
      <h3>AI Quote Generator</h3>
      <form className="freelancer-form" onSubmit={submitQuote}>
        <label>
          Category
          <select
            value={quoteForm.category}
            onChange={(event) => setQuoteForm((current) => ({ ...current, category: event.target.value }))}
          >
            <option value="">Select category</option>
            {categoryOptions.map((category) => (
              <option key={`quote-cat-${category}`} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label>
          Scope
          <textarea
            rows={3}
            value={quoteForm.scope}
            onChange={(event) => setQuoteForm((current) => ({ ...current, scope: event.target.value }))}
            placeholder="Describe scope, deliverables, constraints and priority."
          />
        </label>
        <label>
          Budget
          <input
            type="number"
            value={quoteForm.budget}
            onChange={(event) => setQuoteForm((current) => ({ ...current, budget: event.target.value }))}
          />
        </label>
        <label>
          Urgency
          <select
            value={quoteForm.urgency}
            onChange={(event) => setQuoteForm((current) => ({ ...current, urgency: event.target.value }))}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="emergency">Emergency</option>
          </select>
        </label>
        <label>
          District
          <select
            value={quoteForm.location}
            onChange={(event) => setQuoteForm((current) => ({ ...current, location: event.target.value }))}
          >
            <option value="">Select district</option>
            {districtOptions.map((district) => (
              <option key={`quote-location-${district}`} value={district}>
                {district}
              </option>
            ))}
          </select>
        </label>
        <label>
          Skill Level
          <select
            value={quoteForm.skillLevel}
            onChange={(event) => setQuoteForm((current) => ({ ...current, skillLevel: event.target.value }))}
          >
            <option value="junior">Junior</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
            <option value="expert">Expert</option>
          </select>
        </label>
        <label>
          Service Type
          <select
            value={quoteForm.serviceType}
            onChange={(event) => setQuoteForm((current) => ({ ...current, serviceType: event.target.value }))}
          >
            <option value="digital">Digital</option>
            <option value="local">Local</option>
          </select>
        </label>
        <button type="submit">Generate Quote</button>
      </form>
      {quoteResult ? (
        <div className="freelancer-result">
          <p>
            Estimated price: {formatInr(quoteResult.priceRange?.min)} - {formatInr(quoteResult.priceRange?.max)}
          </p>
          <p>
            Timeline: {quoteResult.recommendedTimelineDays?.min} to {quoteResult.recommendedTimelineDays?.max} days
          </p>
          <p>Skills: {(quoteResult.recommendedSkills || []).join(", ")}</p>
          <p>
            Matches: {(quoteResult.matchedProviders || []).map((provider) => provider.name).join(", ") || "No direct matches"}
          </p>
        </div>
      ) : null}
    </article>

    <ProviderProfile profileLoading={profileLoading} selectedProvider={selectedProvider} />
  </section>
);

export default HireTab;
