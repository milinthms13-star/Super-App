import React, { useMemo, useState } from "react";
import useI18n from "../../hooks/useI18n";
import "./NilaAIHub.css";

const QUICK_ACTIONS = [
  { title: "Ask a Question", subtitle: "Get instant answers for travel, services, finance, and more." },
  { title: "Plan a Trip", subtitle: "Create travel plans with visa, flight, and itinerary suggestions." },
  { title: "Manage Tasks", subtitle: "Set reminders, follow up on requests, and track your day." },
  { title: "Search Services", subtitle: "Find local vendors, agents, jobs, and support quickly." },
];

const INSIGHTS = [
  { label: "Service Matches", value: "24+" },
  { label: "Growth Tips", value: "12" },
  { label: "Loan Options", value: "8" },
];

const TOPICS = [
  "Gulf visa guidance",
  "Business mini app ideas",
  "Local service pricing",
  "Job opportunities",
  "Daily reminders",
  "Health & travel support",
];

const NilaAIHub = () => {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState(TOPICS[0]);

  const recommendations = useMemo(
    () => [
      {
        title: "Smart Service Bundle",
        description: "Personalized local and Gulf assistance plans based on your profile.",
      },
      {
        title: "Loan Fit Calculator",
        description: "Compare EMI plans, eligibility, and quick application steps.",
      },
      {
        title: "Mini App Starter",
        description: "Turn ideas into an AI-powered storefront or booking tool within NilaHub.",
      },
    ],
    []
  );

  return (
    <div className="nila-ai-page">
      <header className="nila-ai-hero">
        <div className="nila-ai-hero-text">
          <span className="nila-ai-badge">Nila AI Hub</span>
          <h1>{t("nilaaihub.title", "AI Ecosystem & Digital Assistant")}</h1>
          <p>
            {t(
              "nilaaihub.subtitle",
              "A conversational AI companion to help with services, travel, loans, jobs, documents, and daily planning."
            )}
          </p>
          <div className="nila-ai-actions">
            <button className="btn btn-primary">Start AI Chat</button>
            <button className="btn btn-secondary">Explore Recommendations</button>
          </div>
        </div>
        <div className="nila-ai-hero-panel">
          {INSIGHTS.map((insight) => (
            <div key={insight.label} className="nila-ai-insight-card">
              <strong>{insight.value}</strong>
              <span>{insight.label}</span>
            </div>
          ))}
        </div>
      </header>

      <section className="nila-ai-search-panel">
        <div className="nila-ai-search-card">
          <h2>{t("nilaaihub.quickSearchTitle", "Ask Nila Anything")}</h2>
          <p>{t("nilaaihub.quickSearchSubtitle", "Type your question or select a topic to get tailored guidance.")}</p>
          <div className="nila-ai-search-box">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("nilaaihub.searchPlaceholder", "What can Nila help you with today?")}
            />
            <button className="btn btn-primary" type="button">
              {t("nilaaihub.searchButton", "Ask Now")}
            </button>
          </div>
          <div className="nila-ai-topic-list">
            {TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                className={topic === activeTopic ? "active" : ""}
                onClick={() => setActiveTopic(topic)}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="nila-ai-quick-actions">
        <h2>{t("nilaaihub.actionsTitle", "Instant AI Actions")}</h2>
        <div className="nila-ai-action-grid">
          {QUICK_ACTIONS.map((action) => (
            <article key={action.title} className="nila-ai-action-card">
              <h3>{action.title}</h3>
              <p>{action.subtitle}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="nila-ai-recommendations">
        <div>
          <h2>{t("nilaaihub.recommendationsTitle", "AI-Powered Recommendations")}</h2>
          <p>
            {t(
              "nilaaihub.recommendationsSubtitle",
              "Smart suggestions for service bundles, growth ideas, financial support, and travel readiness."
            )}
          </p>
        </div>
        <div className="nila-ai-recommendation-grid">
          {recommendations.map((item) => (
            <div key={item.title} className="nila-ai-recommendation-card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default NilaAIHub;
