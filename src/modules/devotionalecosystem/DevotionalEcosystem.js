import React from "react";
import StrategicModuleBlueprint from "../strategic/StrategicModuleBlueprint";

const DevotionalEcosystem = () => (
  <StrategicModuleBlueprint
    title="Temple / Devotional Ecosystem"
    subtitle="Daily-engagement devotional platform for booking, offerings, alerts, streaming, and pilgrimage planning."
    valuePill="High Emotional Retention"
    investorStory={[
      "Creates daily active habit loops through devotional utility.",
      "Underserved digital category with strong trust adoption.",
      "Links donations, services, and pilgrimage commerce flows.",
    ]}
    features={[
      "Virtual queue booking",
      "Vazhipadu and pooja booking",
      "Festival and schedule alerts",
      "Astrology integration",
      "Temple donations",
      "Devotional live streaming",
      "Pilgrimage route planner",
    ]}
    targetUsers={[
      "Devotees and families",
      "Temple administrators",
      "Pilgrimage travelers",
      "Spiritual service providers",
    ]}
    monetization={[
      "Temple SaaS onboarding",
      "Service convenience fees",
      "Festival promotion slots",
      "Pilgrimage package partnerships",
    ]}
    differentiation={[
      "Deep local devotional context for Kerala temples",
      "Integrated scheduling, donation, and spiritual guidance",
      "Cross-link with astrology and tourism modules",
    ]}
    keralaGulfScale={[
      "NRI devotee donation and event participation flow",
      "Digital devotional access for Gulf families",
      "Festival-specific engagement calendar",
    ]}
    apiContracts={[
      "POST /devotional-ecosystem/queue/book",
      "POST /devotional-ecosystem/vazhipadu/book",
      "GET /devotional-ecosystem/festival-alerts",
      "POST /devotional-ecosystem/donations/create",
      "GET /devotional-ecosystem/streaming/live",
      "POST /devotional-ecosystem/pilgrimage/plan",
    ]}
  />
);

export default DevotionalEcosystem;
