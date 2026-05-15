import type { Persona } from "./types";

// Zoe Chen — copied verbatim from coach-connect's i18n + skill-tags seed.
// Sources:
//   - src/i18n/translations.js (zoeScenario, zoeTip, firstTimeBuyer)
//   - scripts/seed-skill-tags.sql (engagementZone, customerMoment, superpower)
//   - WeeklyRequiredCard (image asset, scenario_mode: decision)
export const DEFAULT_PERSONA: Persona = {
  name: "Zoe Chen",
  age: 22,
  type: "First-Time Luxury Buyer",
  scenario:
    "Saw the Tabby on TikTok but thinks it's too expensive. Needs authenticity, not pushy tactics.",
  tip: "Don't fight her phone behavior. Connect through TikTok trends and share the craftsmanship story.",
  image: "/personas/zoe-chen.webp",
  engagementZone: "understandingMoment",
  customerMoment: "culturalMoment",
  superpower: "culturalFluency",
};
