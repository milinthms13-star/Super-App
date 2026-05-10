import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/EcosystemVisualization.css";

const EcosystemVisualization = () => {
  const navigate = useNavigate();
  const [activeNode, setActiveNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [liveActivity, setLiveActivity] = useState({
    commerce: "2.1M+",
    messaging: "340K+",
    services: "24.3K",
    community: "2M+",
  });

  // Simulate real-time activity updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveActivity((prev) => ({
        commerce: `${(Math.random() * 2.1).toFixed(1)}M+`,
        messaging: `${Math.floor(Math.random() * 340)}K+`,
        services: `${Math.floor(Math.random() * 24.3)}K`,
        community: `${(Math.random() * 2).toFixed(1)}M+`,
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const ecosystemConnections = [
    {
      id: "commerce",
      label: "Commerce",
      sublabel: "Shopping & Marketplace",
      icon: "🛍️",
      color: "commerce",
      position: { top: "5%", left: "12%" },
      activity: liveActivity.commerce,
      description: "Products, shops, deals",
    },
    {
      id: "messaging",
      label: "Communication",
      sublabel: "Messaging & Social",
      icon: "💬",
      color: "messaging",
      position: { top: "5%", right: "12%" },
      activity: liveActivity.messaging,
      description: "Chat, media, posts",
    },
    {
      id: "services",
      label: "Services",
      sublabel: "Rides, Food, Delivery",
      icon: "🚀",
      color: "services",
      position: { top: "28%", left: "3%" },
      activity: liveActivity.services,
      description: "Live bookings today",
    },
    {
      id: "community",
      label: "Community",
      sublabel: "Social & Connections",
      icon: "👥",
      color: "community",
      position: { top: "28%", right: "3%" },
      activity: liveActivity.community,
      description: "Engaged members",
    },
    {
      id: "core",
      label: "Unified Ecosystem",
      sublabel: "Central Hub",
      icon: "🔗",
      color: "core",
      position: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
      isCenter: true,
      description: "Everything connected",
    },
  ];

  const features = [
    { icon: "💳", label: "Shared Wallet", desc: "One account, unlimited services" },
    { icon: "👤", label: "Unified Identity", desc: "Seamless authentication" },
    { icon: "📨", label: "Common Messaging", desc: "Stay connected everywhere" },
    { icon: "✨", label: "AI-Powered", desc: "Smart recommendations" },
  ];

  const handleNodeClick = (nodeId) => {
    setActiveNode(nodeId);
    // Navigate to module or show details
    if (nodeId !== "core") {
      // Could navigate to module or show expanded view
    }
  };

  const handleNodeHover = (nodeId) => {
    setHoveredNode(nodeId);
  };

  return (
    <div className="ecosystem-visualization">
      <div className="ecosystem-container">
        {/* SVG Connections with animated flow */}
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

          {/* Connection Lines with animation */}
          <line
            x1="120"
            y1="30"
            x2="500"
            y2="300"
            stroke="url(#connectionGradient)"
            strokeWidth="3"
            filter={activeNode || hoveredNode ? "url(#activeGlow)" : "url(#glow)"}
            className={`connection-line ${activeNode === "commerce" ? "active" : ""}`}
            opacity={hoveredNode && hoveredNode !== "commerce" ? 0.3 : 1}
          />
          <line
            x1="880"
            y1="30"
            x2="500"
            y2="300"
            stroke="url(#connectionGradient)"
            strokeWidth="3"
            filter={activeNode || hoveredNode ? "url(#activeGlow)" : "url(#glow)"}
            className={`connection-line ${activeNode === "messaging" ? "active" : ""}`}
            opacity={hoveredNode && hoveredNode !== "messaging" ? 0.3 : 1}
          />
          <line
            x1="30"
            y1="168"
            x2="500"
            y2="300"
            stroke="url(#connectionGradient)"
            strokeWidth="3"
            filter={activeNode || hoveredNode ? "url(#activeGlow)" : "url(#glow)"}
            className={`connection-line ${activeNode === "services" ? "active" : ""}`}
            opacity={hoveredNode && hoveredNode !== "services" ? 0.3 : 1}
          />
          <line
            x1="970"
            y1="168"
            x2="500"
            y2="300"
            stroke="url(#connectionGradient)"
            strokeWidth="3"
            filter={activeNode || hoveredNode ? "url(#activeGlow)" : "url(#glow)"}
            className={`connection-line ${activeNode === "community" ? "active" : ""}`}
            opacity={hoveredNode && hoveredNode !== "community" ? 0.3 : 1}
          />
        </svg>

        {/* Ecosystem Nodes with enhanced interactivity */}
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
              onClick={() => handleNodeClick(connection.id)}
              onMouseEnter={() => handleNodeHover(connection.id)}
              onMouseLeave={() => setHoveredNode(null)}
              role="button"
              tabIndex={0}
            >
              {/* Activity Badge */}
              {!connection.isCenter && (
                <div className="node-activity-badge">{connection.activity}</div>
              )}

              {/* Node Content */}
              <div className="node-content">
                <div className="node-icon">{connection.icon}</div>
                <div className="node-label">{connection.label}</div>
                <div className="node-sublabel">{connection.sublabel}</div>
              </div>

              {/* Center Pulsing Effect */}
              {connection.isCenter && (
                <>
                  <div className="node-pulse"></div>
                  <div className="node-pulse-ring"></div>
                </>
              )}

              {/* Hover Tooltip */}
              <div className="node-tooltip">
                <div className="tooltip-content">
                  <p className="tooltip-title">{connection.label}</p>
                  <p className="tooltip-description">{connection.description}</p>
                  {!connection.isCenter && (
                    <p className="tooltip-activity">Active: {connection.activity}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Feature Badges */}
        <div className="ecosystem-features">
          {features.map((feature, index) => (
            <div
              key={index}
              className="feature-badge"
              style={{ "--delay": `${index * 0.15}s` }}
            >
              <span className="feature-icon">{feature.icon}</span>
              <div className="feature-content">
                <span className="feature-label">{feature.label}</span>
                <span className="feature-desc">{feature.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="ecosystem-legend">
          <div className="legend-item">
            <span className="legend-dot commerce"></span>
            <span>Commerce & Shopping</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot messaging"></span>
            <span>Communication</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot services"></span>
            <span>Services & Delivery</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot community"></span>
            <span>Community & Social</span>
          </div>
        </div>

        {/* Center Message */}
        <div className="ecosystem-center-message">
          <p className="center-title">Everything Connected</p>
          <p className="center-subtitle">850K+ users exploring one unified ecosystem</p>
        </div>
      </div>
    </div>
  );
};

export default EcosystemVisualization;
