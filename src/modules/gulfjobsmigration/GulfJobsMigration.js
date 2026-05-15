import React from "react";
import StrategicModuleBlueprint from "../strategic/StrategicModuleBlueprint";

const GulfJobsMigration = () => (
  <StrategicModuleBlueprint
    title="Kerala + Gulf Job & Migration Ecosystem"
    subtitle="End-to-end migration support from job discovery to verified documentation, interview readiness, and overseas onboarding."
    valuePill="Kerala to GCC Growth Engine"
    investorStory={[
      "Addresses a massive emotional and financial corridor for Kerala families.",
      "High-value lifecycle from candidate acquisition to migration onboarding.",
      "Creates trust-led marketplace between verified employers and talent.",
    ]}
    features={[
      "Gulf document verification",
      "Visa and milestone tracking",
      "Interview AI practice and scoring",
      "Skill certification map",
      "Malayalam CV AI builder",
      "Employer verification layer",
      "Overseas onboarding checklist",
      "Job fraud risk warnings",
    ]}
    targetUsers={[
      "Kerala job seekers targeting GCC",
      "Recruiters and overseas HR teams",
      "Migration support agencies",
      "Families managing migration preparation",
    ]}
    monetization={[
      "Candidate premium plan",
      "Recruiter subscription",
      "Verification fees",
      "Migration onboarding bundles",
    ]}
    differentiation={[
      "Localized Kerala context + Gulf compliance workflows",
      "Single journey instead of disconnected agencies",
      "Trust-first verification layer",
    ]}
    keralaGulfScale={[
      "Malayalam + English candidate flow",
      "GCC-specific process templates",
      "Country-by-country checklist engine",
    ]}
    apiContracts={[
      "POST /gulf-jobs-migration/cv/malayalam-generate",
      "POST /gulf-jobs-migration/documents/verify",
      "POST /gulf-jobs-migration/interview/practice",
      "GET /gulf-jobs-migration/visa-tracker/:candidateId",
      "POST /gulf-jobs-migration/employers/verify",
      "POST /gulf-jobs-migration/onboarding/start",
    ]}
  />
);

export default GulfJobsMigration;
