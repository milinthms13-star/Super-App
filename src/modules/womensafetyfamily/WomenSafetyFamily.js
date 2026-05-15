import React from "react";
import StrategicModuleBlueprint from "../strategic/StrategicModuleBlueprint";

const WomenSafetyFamily = () => (
  <StrategicModuleBlueprint
    title="Women Safety + Family Protection Ecosystem"
    subtitle="Safety infrastructure for women, children, and elderly members with preventive intelligence and trusted emergency response."
    valuePill="High Social Impact + Retention"
    investorStory={[
      "Strong daily utility with social credibility and policy relevance.",
      "Supports CSR, grants, and public-sector partnership opportunities.",
      "Safety trust layer improves retention across all other modules.",
    ]}
    features={[
      "SOS live tracking",
      "Trusted circle live alerting",
      "Emergency audio/video capture",
      "Child location and school route safety",
      "Elderly inactivity/fall alerts",
      "AI threat signal detection",
      "Women-only verified service marketplace",
    ]}
    targetUsers={[
      "Women commuters and professionals",
      "Parents and guardians",
      "Elderly family members",
      "Local safety responders",
    ]}
    monetization={[
      "Family safety subscription",
      "Premium alert routing plan",
      "Enterprise package for institutions",
      "Insurance and partner integrations",
    ]}
    differentiation={[
      "Integrated family safety, not isolated panic button",
      "Threat intelligence + preventive action flow",
      "Direct connection with SOS module and trust layer",
    ]}
    keralaGulfScale={[
      "Localized emergency contact patterns by region",
      "Multi-country trusted contact architecture",
      "Cultural safety modes for women travelers",
    ]}
    apiContracts={[
      "POST /women-safety-family/sos/trigger",
      "POST /women-safety-family/trusted-circle",
      "POST /women-safety-family/emergency-recordings",
      "POST /women-safety-family/child-tracking/start",
      "POST /women-safety-family/elderly-care/alerts",
      "POST /women-safety-family/threat-detection/analyze",
    ]}
  />
);

export default WomenSafetyFamily;
