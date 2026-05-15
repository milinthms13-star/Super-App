import React from "react";

/**
 * VerifiedAgents
 * Shows trusted agents/brokers to build confidence.
 * Helps users contact professionals for property search.
 */
const VerifiedAgents = () => {
  const agents = [
    {
      name: "Priya Sharma",
      title: "Luxury Property Specialist",
      verified: true,
      properties: 156,
      rating: 4.8,
    },
    {
      name: "Rajesh Kumar",
      title: "Rental Market Expert",
      verified: true,
      properties: 342,
      rating: 4.9,
    },
    {
      name: "Anjali Patel",
      title: "Commercial Real Estate",
      verified: true,
      properties: 89,
      rating: 4.7,
    },
    {
      name: "Vikram Singh",
      title: "Property Investor Consultant",
      verified: true,
      properties: 213,
      rating: 4.6,
    },
  ];

  return (
    <section className="homesphere-verified-agents">
      <article className="homesphere-surface-card">
        <div className="realestate-section-heading">
          <h2>Verified Agents</h2>
          <p>Connect with trusted professionals</p>
        </div>
        <div className="homesphere-agents-grid">
          {agents.map((agent) => (
            <div key={agent.name} className="homesphere-agent-card">
              <div className="homesphere-agent-avatar">{agent.name[0]}</div>
              <strong>{agent.name}</strong>
              <span className="homesphere-agent-title">{agent.title}</span>
              <div className="homesphere-agent-stats">
                <span>⭐ {agent.rating}</span>
                <span>📍 {agent.properties} properties</span>
              </div>
              <button
                type="button"
                className="realestate-inline-button"
                style={{ marginTop: "0.75rem", width: "100%" }}
              >
                Contact
              </button>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
};

export default VerifiedAgents;
