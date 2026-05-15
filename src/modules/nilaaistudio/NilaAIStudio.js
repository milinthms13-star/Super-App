import React from "react";
import StrategicModuleBlueprint from "../strategic/StrategicModuleBlueprint";

const NilaAIStudio = () => (
  <StrategicModuleBlueprint
    title="Nila AI Studio"
    subtitle="Unified AI creator platform for stories, reels, dubbing, avatars, and business promo videos."
    valuePill="Viral Growth + Valuation Signal"
    investorStory={[
      "Independent creator flywheel with high shareability.",
      "Strong valuation narrative around generative media stack.",
      "Cross-sells into jobs, business, kids, and commerce modules.",
    ]}
    features={[
      "Story to cartoon video",
      "AI reel generator",
      "Auto dubbing and voice sync",
      "Malayalam voice AI",
      "AI avatar presenter",
      "Business ad maker",
      "Dual-dance and karaoke merge workflows",
    ]}
    targetUsers={[
      "Creators and influencers",
      "Small businesses and agencies",
      "Parents and kids content creators",
      "Recruiters and educators",
    ]}
    monetization={[
      "Creator subscription tiers",
      "Per-render credit packs",
      "Brand template marketplace",
      "Premium export upsells",
    ]}
    differentiation={[
      "Localized language + culture aware creator outputs",
      "Multi-format studio, not one-off video tool",
      "Direct integration with existing video modules",
    ]}
    keralaGulfScale={[
      "Malayalam-first creator ecosystem",
      "Gulf diaspora content personalization",
      "Cross-border creator collaborations",
    ]}
    apiContracts={[
      "POST /nila-ai-studio/story/cartoon-render",
      "POST /nila-ai-studio/reels/generate",
      "POST /nila-ai-studio/dubbing/auto",
      "POST /nila-ai-studio/voice/malayalam-generate",
      "POST /nila-ai-studio/avatar/presenter-create",
      "POST /nila-ai-studio/business-ad/generate",
    ]}
  />
);

export default NilaAIStudio;
