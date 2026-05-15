import React from "react";
import StrategicModuleBlueprint from "../strategic/StrategicModuleBlueprint";

const TrustLayer = () => (
  <StrategicModuleBlueprint
    title="Trust Layer"
    subtitle="Cross-platform trust architecture for verified identities, fraud mitigation, moderation, and safer transactions."
    valuePill="Core Risk + Trust Moat"
    investorStory={[
      "Most superapps fail trust scaling; this becomes a core moat.",
      "Improves transaction confidence across all revenue modules.",
      "Reduces fraud leakage and support burden.",
    ]}
    features={[
      "Verified users and seller KYC",
      "Trust score engine",
      "Fraud signal detection",
      "Seller verification workflows",
      "Community reporting pipeline",
      "AI moderation controls",
      "Risk-based transaction review",
    ]}
    targetUsers={[
      "Buyers and families",
      "Marketplace sellers",
      "Service providers",
      "Platform moderation teams",
    ]}
    monetization={[
      "Verified seller tier fees",
      "Trust badge subscriptions",
      "Enterprise risk API integrations",
      "Premium fraud-protection plans",
    ]}
    differentiation={[
      "Shared trust graph across modules",
      "Risk-aware actions instead of simple blocklists",
      "Safety and compliance friendly architecture",
    ]}
    keralaGulfScale={[
      "Region-aware verification standards",
      "Cross-border fraud rule packs",
      "Localized moderation policies",
    ]}
    apiContracts={[
      "POST /trust-layer/users/verify",
      "POST /trust-layer/sellers/verify",
      "GET /trust-layer/score/:entityId",
      "POST /trust-layer/fraud/analyze",
      "POST /trust-layer/reports/submit",
      "POST /trust-layer/moderation/review",
    ]}
  />
);

export default TrustLayer;
