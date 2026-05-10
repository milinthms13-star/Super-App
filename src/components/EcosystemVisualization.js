import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import "../styles/EcosystemVisualization.css";

const EcosystemVisualization = () => {
  const navigate = useNavigate();
  const { ecommerceProducts, mockData } = useApp();
  const [activeNode, setActiveNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  const liveActivity = useMemo(() => {
    const commerce = Array.isArray(ecommerceProducts) ? ecommerceProducts.length : 0;
    const messaging = Array.isArray(mockData?.conversations) ? mockData.conversations.length : 0;
    const services =
      (Array.isArray(mockData?.rideOffers) ? mockData.rideOffers.length : 0) +
      (Array.isArray(mockData?.restaurants) ? mockData.restaurants.length : 0);
    const community = Array.isArray(mockData?.socialMediaPosts) ? mockData.socialMediaPosts.length : 0;

    return { commerce, messaging, services, community };
  }, [ecommerceProducts, mockData]);

  const totalActivity =
    Number(liveActivity.commerce || 0) +
    Number(liveActivity.messaging || 0) +
    Number(liveActivity.services || 0) +
    Number(liveActivity.community || 0);

  const ecosystemConnections = [
    {
      id: "commerce",
      moduleId: "ecommerce",
      label: "Commerce",
      sublabel: "Shopping and Marketplace",
      icon: "S",
      color: "commerce",
      position: { top: "5%", left: "12%" },
      activity: Number(liveActivity.commerce || 0),
      description: "Product catalog activity",
    },
    {
      id: "messaging",
      moduleId: "messaging",
      label: "Communication",
      sublabel: "Messaging and Social",
      icon: "M",
      color: "messaging",
      position: { top: "5%", right: "12%" },
      activity: Number(liveActivity.messaging || 0),
      description: "Conversation activity",
    },
    {
      id: "services",
      moduleId: "ridesharing",
      label: "Services",
      sublabel: "Rides and Delivery",
      icon: "R",
      color: "services",
      position: { top: "28%", left: "3%" },
      activity: Number(liveActivity.services || 0),
      description: "Service listings activity",
    },
    {
      id: "community",
      moduleId: "socialmedia",
      label: "Community",
      sublabel: "Social and Connections",
      icon: "C",
      color: "community",
      position: { top: "28%", right: "3%" },
      activity: Number(liveActivity.community || 0),
      description: "Community posting activity",
    },
    {
      id: "core",
      moduleId: "dashboard",
      label: "Unified Ecosystem",
      sublabel: "Central Hub",
      icon: "U",
      color: "core",
      position: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
      isCenter: true,
      description: "Everything connected",
    },
  ];

  const features = [
    { icon: "W", label: "Shared Wallet", desc: "One account across services" },
    { icon: "ID", label: "Unified Identity", desc: "Single secure sign-in" },
    { icon: "MSG", label: "Common Messaging", desc: "Connected conversations" },
    { icon: "AI", label: "AI Assisted", desc: "Personalized suggestions" },
  ];

  const handleNodeClick = (nodeId, moduleId) => {
    setActiveNode(nodeId);
    if (moduleId) {
      navigate(`/${moduleId}`);
    }
  };

  const handleNodeHover = (nodeId) => {
    setHoveredNode(nodeId);
  };

  return (
    <div className="ecosystem-visualization">
      <div className="ecosystem-container">
        <svg className="ecosystem-connections" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#FFA500" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FF6B6B" stopOpacity="0.2" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="activeGlow">
              <feGaussianBlur stdDeviation="6" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <line x1="120" y1="30" x2="500" y2="300" stroke="url(#connectionGradient)" strokeWidth="3" filter={activeNode || hoveredNode ? "url(#activeGlow)" : "url(#glow)"} className={`connection-line ${activeNode === "commerce" ? "active" : ""}`} opacity={hoveredNode && hoveredNode !== "commerce" ? 0.3 : 1} />
          <line x1="880" y1="30" x2="500" y2="300" stroke="url(#connectionGradient)" strokeWidth="3" filter={activeNode || hoveredNode ? "url(#activeGlow)" : "url(#glow)"} className={`connection-line ${activeNode === "messaging" ? "active" : ""}`} opacity={hoveredNode && hoveredNode !== "messaging" ? 0.3 : 1} />
          <line x1="30" y1="168" x2="500" y2="300" stroke="url(#connectionGradient)" strokeWidth="3" filter={activeNode || hoveredNode ? "url(#activeGlow)" : "url(#glow)"} className={`connection-line ${activeNode === "services" ? "active" : ""}`} opacity={hoveredNode && hoveredNode !== "services" ? 0.3 : 1} />
          <line x1="970" y1="168" x2="500" y2="300" stroke="url(#connectionGradient)" strokeWidth="3" filter={activeNode || hoveredNode ? "url(#activeGlow)" : "url(#glow)"} className={`connection-line ${activeNode === "community" ? "active" : ""}`} opacity={hoveredNode && hoveredNode !== "community" ? 0.3 : 1} />
        </svg>

        <div className="ecosystem-nodes">
          {ecosystemConnections.map((connection) => (
            <div
              key={connection.id}
              className={`ecosystem-node ecosystem-node-${connection.color} ${
                connection.isCenter ? "is-center" : ""
              } ${activeNode === connection.id ? "active" : ""} ${hoveredNode === connection.id ? "hovered" : ""}`}
              style={{
                top: connection.position.top,
                left: connection.position.left,
                right: connection.position.right,
                transform: connection.position.transform,
              }}
              onClick={() => handleNodeClick(connection.id, connection.moduleId)}
              onMouseEnter={() => handleNodeHover(connection.id)}
              onMouseLeave={() => setHoveredNode(null)}
              role="button"
              tabIndex={0}
            >
              {!connection.isCenter && <div className="node-activity-badge">{Number(connection.activity || 0)}</div>}

              <div className="node-content">
                <div className="node-icon">{connection.icon}</div>
                <div className="node-label">{connection.label}</div>
                <div className="node-sublabel">{connection.sublabel}</div>
              </div>

              {connection.isCenter && (
                <>
                  <div className="node-pulse"></div>
                  <div className="node-pulse-ring"></div>
                </>
              )}

              <div className="node-tooltip">
                <div className="tooltip-content">
                  <p className="tooltip-title">{connection.label}</p>
                  <p className="tooltip-description">{connection.description}</p>
                  {!connection.isCenter && <p className="tooltip-activity">Active: {Number(connection.activity || 0)}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="ecosystem-features">
          {features.map((feature, index) => (
            <div key={index} className="feature-badge" style={{ "--delay": `${index * 0.15}s` }}>
              <span className="feature-icon">{feature.icon}</span>
              <div className="feature-content">
                <span className="feature-label">{feature.label}</span>
                <span className="feature-desc">{feature.desc}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="ecosystem-legend">
          <div className="legend-item"><span className="legend-dot commerce"></span><span>Commerce</span></div>
          <div className="legend-item"><span className="legend-dot messaging"></span><span>Communication</span></div>
          <div className="legend-item"><span className="legend-dot services"></span><span>Services</span></div>
          <div className="legend-item"><span className="legend-dot community"></span><span>Community</span></div>
        </div>

        <div className="ecosystem-center-message">
          <p className="center-title">Everything Connected</p>
          <p className="center-subtitle">Total tracked activity: {Number(totalActivity || 0)}</p>
        </div>
      </div>
    </div>
  );
};

export default EcosystemVisualization;
