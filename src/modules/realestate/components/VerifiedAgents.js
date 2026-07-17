import React, { useMemo } from "react";

/**
 * VerifiedAgents — derives real agent data from live property listings.
 * No hardcoded names. Falls back to placeholder agents only when no data exists.
 */
const FALLBACK_AGENTS = [
  { name: "Priya Sharma", title: "Luxury Property Specialist", properties: 0, rating: 4.8, role: "Agent" },
  { name: "Rajesh Kumar", title: "Rental Market Expert", properties: 0, rating: 4.9, role: "Agent" },
  { name: "Anjali Patel", title: "Commercial Real Estate", properties: 0, rating: 4.7, role: "Agent" },
  { name: "Vikram Singh", title: "Property Investor Consultant", properties: 0, rating: 4.6, role: "Builder" },
];

const VerifiedAgents = ({ properties = [], onContactAgent }) => {
  const agents = useMemo(() => {
    if (!properties || properties.length === 0) return FALLBACK_AGENTS;

    // Group listings by sellerName, aggregate stats
    const agentMap = {};
    properties.forEach((p) => {
      if (!p.sellerName || !p.verified) return;
      const key = p.sellerName.trim();
      if (!agentMap[key]) {
        agentMap[key] = {
          name: key,
          role: p.sellerRole || "Agent",
          email: p.sellerEmail || "",
          phone: p.contactPhone || "",
          whatsapp: p.whatsappNumber || "",
          listings: [],
          totalRating: 0,
          ratingCount: 0,
          languages: new Set(p.languageSupport || ["English"]),
        };
      }
      agentMap[key].listings.push(p);
      if (p.rating > 0) {
        agentMap[key].totalRating += p.rating;
        agentMap[key].ratingCount++;
      }
      (p.languageSupport || []).forEach((l) => agentMap[key].languages.add(l));
    });

    return Object.values(agentMap)
      .filter((a) => a.listings.length > 0)
      .map((a) => ({
        name: a.name,
        title: a.role === "Builder"
          ? "Builder / Developer"
          : a.role === "Owner"
          ? "Property Owner"
          : "Real Estate Agent",
        role: a.role,
        email: a.email,
        phone: a.phone,
        whatsapp: a.whatsapp,
        properties: a.listings.length,
        rating: a.ratingCount > 0
          ? Math.round((a.totalRating / a.ratingCount) * 10) / 10
          : 4.5,
        languages: [...a.languages].slice(0, 3),
        cities: [...new Set(a.listings.map((l) => l.location))].slice(0, 2),
        verified: true,
      }))
      .sort((a, b) => b.properties - a.properties || b.rating - a.rating)
      .slice(0, 6);
  }, [properties]);

  const handleWhatsApp = (agent) => {
    const number = (agent.whatsapp || agent.phone || "").replace(/\D/g, "");
    if (!number) return;
    const msg = encodeURIComponent(`Hi ${agent.name}, I found your profile on HomeSphere and would like to discuss a property.`);
    window.open(`https://wa.me/${number}?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="homesphere-verified-agents">
      <article className="homesphere-surface-card">
        <div className="realestate-section-heading">
          <h2>Verified Agents &amp; Sellers</h2>
          <p>Active professionals with verified listings on HomeSphere</p>
        </div>

        <div className="re-agents-grid">
          {agents.map((agent) => (
            <div key={agent.name} className="re-agent-card">
              <div className="re-agent-avatar" aria-hidden="true">
                {agent.name.charAt(0).toUpperCase()}
              </div>

              <div className="re-agent-info">
                <strong className="re-agent-name">{agent.name}</strong>
                <span className="re-agent-title">{agent.title}</span>

                {agent.cities?.length > 0 && (
                  <span className="re-agent-cities">
                    📍 {agent.cities.join(" · ")}
                  </span>
                )}

                <div className="re-agent-stats">
                  <span>⭐ {agent.rating}</span>
                  <span>{agent.properties} listing{agent.properties !== 1 ? "s" : ""}</span>
                  {agent.verified && <span className="re-agent-verified">✓ Verified</span>}
                </div>

                {agent.languages?.length > 0 && (
                  <div className="re-agent-langs">
                    {agent.languages.map((l) => (
                      <span key={l} className="re-agent-lang-chip">{l}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="re-agent-actions">
                {(agent.whatsapp || agent.phone) ? (
                  <button
                    type="button"
                    className="re-agent-whatsapp-btn"
                    onClick={() => handleWhatsApp(agent)}
                    aria-label={`Contact ${agent.name} via WhatsApp`}
                  >
                    💬 WhatsApp
                  </button>
                ) : (
                  <button
                    type="button"
                    className="realestate-inline-button"
                    onClick={() => onContactAgent?.(agent)}
                  >
                    Contact
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
};

export default VerifiedAgents;
