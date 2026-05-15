import React from "react";
import StrategicModuleBlueprint from "../strategic/StrategicModuleBlueprint";

const AIBusinessOS = () => (
  <StrategicModuleBlueprint
    title="AI Business Operating System"
    subtitle="AI infrastructure layer for Kerala and Gulf local businesses with operating workflows, revenue tools, and growth automation."
    valuePill="Highest Investor Waitage"
    investorStory={[
      "Moves NilaHub from superapp to business AI infrastructure.",
      "Recurring SaaS subscriptions improve predictable revenue.",
      "SME operating data creates defensible analytics moat.",
    ]}
    features={[
      "AI invoice + GST billing",
      "WhatsApp marketing automation",
      "AI poster/ad creator",
      "Staff attendance and shift tracking",
      "Inventory and reorder alerts",
      "CRM + follow-up automation",
      "Mini website builder",
      "Malayalam voice assistant",
      "AI sales analytics dashboard",
    ]}
    targetUsers={[
      "Retail shops and boutiques",
      "Bakeries and restaurants",
      "Clinics and pharmacies",
      "Kerala and Gulf SMEs",
    ]}
    monetization={[
      "Monthly SaaS plans",
      "Per-user staff seats",
      "AI credits",
      "Premium analytics packs",
    ]}
    differentiation={[
      "Malayalam-first AI workflows",
      "Unified operating system instead of fragmented tools",
      "Built-in hyperlocal + commerce network integration",
    ]}
    keralaGulfScale={[
      "Dual-language onboarding (Malayalam + English + Arabic-ready)",
      "Gulf VAT/GST-ready invoice format pipeline",
      "Cross-border merchant expansion playbook",
    ]}
    apiContracts={[
      "POST /ai-business-os/invoices/generate",
      "POST /ai-business-os/gst/validate",
      "POST /ai-business-os/marketing/whatsapp-campaign",
      "POST /ai-business-os/posters/generate",
      "POST /ai-business-os/staff/attendance",
      "GET /ai-business-os/inventory/alerts",
      "POST /ai-business-os/crm/leads",
      "GET /ai-business-os/analytics/sales",
    ]}
  />
);

export default AIBusinessOS;
