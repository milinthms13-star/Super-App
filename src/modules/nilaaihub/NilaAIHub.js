import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import useI18n from "../../hooks/useI18n";
import "./NilaAIHub.css";

const QUICK_ACTIONS = [
  {
    title: "Ask a Question",
    subtitle: "Get instant answers for travel, services, finance, and more.",
    prompt: "I want help with loans, Gulf visas, and local service options.",
  },
  {
    title: "Plan a Trip",
    subtitle: "Create travel plans with visa, flight, and itinerary suggestions.",
    prompt: "Help me plan a Gulf business trip with visa, flights, and document guidance.",
  },
  {
    title: "Manage Tasks",
    subtitle: "Set reminders, follow up on requests, and track your day.",
    prompt: "Create a quick task list for my service appointments and deadline reminders.",
  },
  {
    title: "Search Services",
    subtitle: "Find local vendors, agents, jobs, and support quickly.",
    prompt: "Show me local and Gulf support services for travel, finance, and government paperwork.",
  },
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

const TOPIC_PROMPTS = {
  "Gulf visa guidance": "I need step-by-step guidance for applying for a Gulf visa from India.",
  "Business mini app ideas": "Suggest a mini app concept for local services or booking assistance.",
  "Local service pricing": "Compare prices for local travel, agents, and paperwork services.",
  "Job opportunities": "Help me find Gulf and local job openings that match my skills.",
  "Daily reminders": "Create a daily reminder plan for my travel, documents, and bills.",
  "Health & travel support": "Recommend health and travel support services for a safe Gulf journey.",
};

const ASSISTANTS = [
  {
    title: "Loan & Government Scheme Assistant",
    description: "Get eligibility checks, scheme comparisons, and application support.",
  },
  {
    title: "Gulf Services Assistant",
    description: "Find visa, immigration, and travel service recommendations tailored to your profile.",
  },
  {
    title: "Gulf Jobs Assistant",
    description: "Search jobs, verify employer details, and understand visa-linked hiring support.",
  },
  {
    title: "Local Jobs Assistant",
    description: "Discover local hiring leads, contract work, and community-based job options.",
  },
  {
    title: "Health & Travel Assistant",
    description: "Plan safe travel, insurance, and healthcare services for your journey.",
  },
];

const DEFAULT_RECOMMENDATIONS = [
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
];

const NilaAIHub = () => {
  const { t } = useI18n();
  const chatInputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState(TOPICS[0]);
  const [conversation, setConversation] = useState([
    {
      role: "assistant",
      content: t(
        "nilaaihub.welcomeMessage",
        "Welcome to Nila AI Hub. Ask anything about Gulf services, loans, local help, or your next trip."
      ),
      timestamp: new Date().toISOString(),
    },
  ]);
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [recommendations, setRecommendations] = useState(DEFAULT_RECOMMENDATIONS);
  const [suggestedActions, setSuggestedActions] = useState([]);
  const [flashMessage, setFlashMessage] = useState("");
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState("");

  const getStoredAuthToken = () =>
    window.localStorage.getItem("authToken") || window.localStorage.getItem("token") || "";

  useEffect(() => {
    const token = getStoredAuthToken();
    fetchRecommendations(token);

    if (token) {
      initChatSession(token);
    }
  }, []);

  const initChatSession = async (token) => {
    try {
      const { data } = await axios.post(
        "/api/ecommerce/ai-chat/init",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const nextSessionId = data.data?.sessionId;
      if (nextSessionId) {
        setSessionId(nextSessionId);
      }
      return nextSessionId;
    } catch (error) {
      console.warn("Unable to initialize AI chat session:", error?.response?.data || error.message);
      return null;
    }
  };

  const fetchRecommendations = async (token) => {
    try {
      const url = token
        ? "/api/ecommerce/recommendations/personalized?limit=6"
        : "/api/ecommerce/recommendations/trending?limit=6";
      const response = await axios.get(url, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });

      const items = response.data?.data;
      if (Array.isArray(items) && items.length > 0) {
        setRecommendations(items);
      }
    } catch (fetchError) {
      console.warn("Recommendation fetch failed:", fetchError?.response?.data || fetchError.message);
      setRecommendations(DEFAULT_RECOMMENDATIONS);
    }
  };

  const handleStartChat = () => {
    chatInputRef.current?.focus();
  };

  const activeRecommendations = useMemo(() => {
    const formatRecommendation = (item) => {
      if (!item) {
        return { title: "Unknown recommendation", description: "No details available." };
      }

      return {
        title: item.title || item.name || item.productName || item.label || t("nilaaihub.recommendationItemTitle", "Recommended item"),
        description:
          item.description || item.summary || item.details || item.snippet || item.subtitle ||
          t(
            "nilaaihub.recommendationItemDescription",
            "Personalized guidance to help you make the next move."
          ),
      };
    };

    return recommendations.map(formatRecommendation);
  }, [recommendations, t]);

  const setQueryForTopic = (topic) => {
    setActiveTopic(topic);
    setQuery(TOPIC_PROMPTS[topic] || "");
    setError("");
    chatInputRef.current?.focus();
  };

  const handleQuickAction = (action) => {
    setQuery(action.prompt);
    setActiveTopic(action.title);
    setError("");
    setSuggestedActions([]);
    chatInputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.text || suggestion);
    chatInputRef.current?.focus();
  };

  const generateLocalAssistantResponse = (message) => {
    const text = message.toLowerCase();
    if (text.includes("visa") || text.includes("gulf")) {
      return t(
        "nilaaihub.localResponseVisa",
        "For Gulf visa guidance, start with the destination-specific requirements, validate your passport, gather supporting documents, and plan for processing time of at least 2-3 weeks."
      );
    }

    if (text.includes("loan") || text.includes("emi") || text.includes("scheme")) {
      return t(
        "nilaaihub.localResponseLoan",
        "For loans and government schemes, check eligibility first, compare interest and fees, and gather ID, income proof, and payment history before you apply."
      );
    }

    if (text.includes("job") || text.includes("employment") || text.includes("hiring")) {
      return t(
        "nilaaihub.localResponseJobs",
        "I can help you explore job options. Share your skills, preferred location, and whether you want local or Gulf opportunities."
      );
    }

    if (text.includes("health") || text.includes("travel")) {
      return t(
        "nilaaihub.localResponseHealth",
        "For health and travel support, always verify service providers, carry your insurance details, and choose trusted local assistance."
      );
    }

    return t(
      "nilaaihub.localResponseGeneral",
      "Great question! I’m ready to help with local services, Gulf planning, or financial guidance. Please tell me more."
    );
  };

  const generateLocalSuggestions = (message) => {
    const text = message.toLowerCase();

    if (text.includes("visa")) {
      return [
        { text: "What documents are needed for a Gulf visa?" },
        { text: "How soon should I apply for a visa?" },
      ];
    }

    if (text.includes("loan")) {
      return [
        { text: "Which loan is best for small business?" },
        { text: "How do I calculate EMI for a personal loan?" },
      ];
    }

    return [
      { text: "Show me services for travel planning." },
      { text: "Give me latest Gulf job leads." },
    ];
  };

  const handleQuerySubmit = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setError(t("nilaaihub.emptySearchError", "Enter a question or choose a topic first."));
      return;
    }

    setError("");
    setFlashMessage("");
    const nextConversation = [
      ...conversation,
      {
        role: "user",
        content: trimmedQuery,
        timestamp: new Date().toISOString(),
      },
    ];
    setConversation(nextConversation);
    setIsLoading(true);

    const token = getStoredAuthToken();

    try {
      if (!token) {
        throw new Error("unauthenticated");
      }

      let activeSessionId = sessionId;
      if (!activeSessionId) {
        activeSessionId = await initChatSession(token);
      }

      if (!activeSessionId) {
        throw new Error("no-session");
      }

      const response = await axios.post(
        "/api/ecommerce/ai-chat/message",
        {
          sessionId: activeSessionId,
          message: trimmedQuery,
          context: {
            topic: activeTopic,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const payload = response.data?.data;
      const assistantText = payload?.response || generateLocalAssistantResponse(trimmedQuery);
      const actions = payload?.suggestedActions || [];

      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          content: assistantText,
          timestamp: new Date().toISOString(),
        },
      ]);
      setSuggestedActions(actions);
      setQuery("");
    } catch (submitError) {
      if (submitError.message === "unauthenticated" || submitError?.response?.status === 401) {
        setError(t("nilaaihub.loginRequired", "Sign in to use the full AI chat experience. Guest mode still offers helpful guidance."));
      } else {
        setError(t(
          "nilaaihub.chatError",
          "We couldn't process that right now. Try again or select another topic."
        ));
      }

      const fallbackResponse = generateLocalAssistantResponse(trimmedQuery);
      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          content: fallbackResponse,
          timestamp: new Date().toISOString(),
        },
      ]);
      setSuggestedActions(generateLocalSuggestions(trimmedQuery));
      setQuery("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = async (message) => {
    try {
      await navigator.clipboard.writeText(message);
      setFlashMessage(t("nilaaihub.copiedToClipboard", "Copied to clipboard."));
    } catch (clipboardError) {
      setFlashMessage(t("nilaaihub.copyFailed", "Unable to copy text. Try again."));
    }
  };

  const handleSaveConversation = () => {
    window.localStorage.setItem("nilaAIHubSavedConversation", JSON.stringify(conversation));
    setFlashMessage(t("nilaaihub.chatSaved", "Conversation saved locally."));
  };

  return (
    <div className="nila-ai-page">
      <header className="nila-ai-hero">
        <div className="nila-ai-hero-text">
          <span className="nila-ai-badge">{t('nilaaihub.badge')}</span>
          <h1>{t('nilaaihub.hero.title')}</h1>
          <p>{t('nilaaihub.hero.subtitle')}</p>
          <div className="nila-ai-actions">
            <button className="btn btn-primary" type="button" onClick={handleStartChat}>
              {t('nilaaihub.getStarted')}
            </button>
          </div>
        </div>
        <div className="nila-ai-hero-panel">
          {INSIGHTS.map((insight) => (
            <div key={insight.label} className="nila-ai-insight-card">
              <strong>{insight.value}</strong>
              <span>{t(`nilaaihub.insight.${insight.label.replace(/\s+/g, '').toLowerCase()}`, insight.label)}</span>
            </div>
          ))}
        </div>
      </header>

      <section className="nila-ai-search-panel">
        <div className="nila-ai-search-card">
          <h2>{t('nilaaihub.search.title')}</h2>
          <p>{t('nilaaihub.search.subtitle')}</p>
          <div className="nila-ai-search-box">
            <input
              ref={chatInputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('nilaaihub.search.placeholder')}
              aria-label={t('nilaaihub.search.placeholder')}
            />
            <button className="btn btn-primary" type="button" onClick={handleQuerySubmit}>
              {t('nilaaihub.search.button')}
            </button>
          </div>
          {error && (
            <div className="nila-ai-error-state" role="alert">
              {error}
            </div>
          )}
          {flashMessage && <div className="nila-ai-flash-state">{flashMessage}</div>}
          <div className="nila-ai-topic-list">
            {TOPICS.map((topic) => {
              const topicSlug = topic.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');
              return (
                <button
                  key={topic}
                  type="button"
                  className={topic === activeTopic ? "active" : ""}
                  onClick={() => setQueryForTopic(topic)}
                >
                  {t(`nilaaihub.topic.${topicSlug}`, topic)}
                </button>
              );
            })}
          </div>

          <div className="nila-ai-chat-panel">
            <div className="nila-ai-chat-panel-header">
              <div>
                <h3>{t('nilaaihub.chat.title')}</h3>
                <p>{t('nilaaihub.chat.subtitle')}</p>
              </div>
              <button className="btn btn-secondary" type="button" onClick={handleSaveConversation}>
                {t("nilaaihub.saveChat", "Save Chat")}
              </button>
            </div>
            <div className="nila-ai-chat-history" aria-live="polite">
              {conversation.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`nila-ai-chat-message ${message.role}`}
                >
                  <div className="nila-ai-chat-meta">
                    <strong>{message.role === "user" ? t("nilaaihub.voice.user", "You") : t("nilaaihub.voice.assistant", "Nila")}</strong>
                    <small>{new Date(message.timestamp).toLocaleString()}</small>
                  </div>
                  <p>{message.content}</p>
                  {message.role === "assistant" && (
                    <button
                      className="nila-ai-copy-button"
                      type="button"
                      onClick={() => handleCopyMessage(message.content)}
                    >
                      {t("nilaaihub.copyResponse", "Copy response")}
                    </button>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="nila-ai-loading-state">
                  {t("nilaaihub.loadingResponse", "Preparing your AI answer...")}
                </div>
              )}
            </div>
            {suggestedActions.length > 0 && (
              <div className="nila-ai-suggestion-block">
                <strong>{t("nilaaihub.followUpLabel", "Suggested next steps:")}</strong>
                <div className="nila-ai-suggestions">
                  {suggestedActions.map((action, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="nila-ai-suggestion-button"
                      onClick={() => handleSuggestionClick(action)}
                    >
                      {action.text || action}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="nila-ai-quick-actions">
        <h2>{t("nilaaihub.actionsTitle", "Instant AI Actions")}</h2>
        <div className="nila-ai-action-grid">
          {QUICK_ACTIONS.map((action) => {
            const actionSlug = action.title.toLowerCase().replace(/\s+/g, '');
            return (
              <article
                key={action.title}
                className="nila-ai-action-card clickable"
                role="button"
                tabIndex={0}
                onClick={() => handleQuickAction(action)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    handleQuickAction(action);
                  }
                }}
              >
                <h3>{t(`nilaaihub.quickActions.${actionSlug}.title`, action.title)}</h3>
                <p>{t(`nilaaihub.quickActions.${actionSlug}.subtitle`, action.subtitle)}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="nila-ai-assistants">
        <h2>{t("nilaaihub.assistantsTitle", "Assistants for Every Need")}</h2>
        <p>{t("nilaaihub.assistantsSubtitle", "Choose a dedicated assistant for loans, Gulf services, jobs, health, and travel.")}</p>
        <div className="nila-ai-assistant-grid">
          {ASSISTANTS.map((assistant) => {
            const assistantSlug = assistant.title.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');
            return (
              <div key={assistant.title} className="nila-ai-assistant-card">
                <h3>{t(`nilaaihub.assistants.${assistantSlug}.title`, assistant.title)}</h3>
                <p>{t(`nilaaihub.assistants.${assistantSlug}.description`, assistant.description)}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="nila-ai-recommendations">
        <div>
          <h2>{t('nilaaihub.recommendations.title')}</h2>
          <p>{t('nilaaihub.recommendations.subtitle')}</p>
        </div>
        <div className="nila-ai-recommendation-grid">
          {activeRecommendations.map((item, index) => (
            <div key={`${item.title}-${index}`} className="nila-ai-recommendation-card">
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
