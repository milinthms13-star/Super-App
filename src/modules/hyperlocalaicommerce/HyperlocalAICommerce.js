import React from "react";
import StrategicModuleBlueprint from "../strategic/StrategicModuleBlueprint";

const HyperlocalAICommerce = () => (
  <StrategicModuleBlueprint
    title="Hyperlocal AI Commerce Engine"
    subtitle="AI-assisted local commerce stack that improves conversion, seller productivity, and order velocity."
    valuePill="Revenue Acceleration Layer"
    investorStory={[
      "Enhances conversion in existing commerce modules instead of duplicating marketplaces.",
      "Creates measurable GMV lift through AI-assisted buyer and seller flows.",
      "Defensible local-language commerce intelligence.",
    ]}
    features={[
      "AI product recommendations",
      "Seller co-pilot for listings",
      "Auto Malayalam captions",
      "Voice shopping flow",
      "Local offer intelligence engine",
      "WhatsApp assisted ordering",
      "AI bargaining assistant",
    ]}
    targetUsers={[
      "Local vendors and stores",
      "Hyperlocal delivery users",
      "Voice-first shoppers",
      "WhatsApp commerce operators",
    ]}
    monetization={[
      "AI commerce subscription for sellers",
      "Per-order automation fee",
      "Featured offer placement",
      "Voice commerce premium",
    ]}
    differentiation={[
      "Commerce intelligence on top of local network effects",
      "Language-native seller automation",
      "Integrated with hyperlocal + local market modules",
    ]}
    keralaGulfScale={[
      "Kerala local language shopping + Gulf diaspora ordering",
      "Category-specific local promotions by region",
      "Multi-channel conversion tracking",
    ]}
    apiContracts={[
      "POST /hyperlocal-ai-commerce/recommendations/generate",
      "POST /hyperlocal-ai-commerce/seller-assistant/listing-optimize",
      "POST /hyperlocal-ai-commerce/captions/malayalam",
      "POST /hyperlocal-ai-commerce/voice-order/parse",
      "GET /hyperlocal-ai-commerce/offers/local",
      "POST /hyperlocal-ai-commerce/whatsapp/order",
      "POST /hyperlocal-ai-commerce/bargain/assist",
    ]}
  />
);

export default HyperlocalAICommerce;
