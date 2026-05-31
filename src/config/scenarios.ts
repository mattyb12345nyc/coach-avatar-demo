import type { Persona, ScoringScores } from "@/lib/types";
import { DEFAULT_PERSONA } from "@/lib/defaultPersona";

// A "hero skill" is one of the 6 rubric categories. Each station/pod is
// graded on every category (the full 0–100 score), but ONE category is its
// hero skill — the one that earns a badge and crowns a per-scenario champion.
export type HeroSkill = keyof ScoringScores;

// One physical station at the SMC activation. Regions rotate through all six.
// The avatar engine is unchanged — a station is just a persona + avatar_id +
// background + which category is its hero skill.
export type Scenario = {
  // Stable id used in URLs (?station=culture) and as the DB key.
  id: string;
  // Display order / physical station number (1–6).
  station: number;
  // Customer archetype label from the deck (slide 6). Kept for the deck
  // mapping + admin; NOT shown as the primary label in consumer UI.
  archetype: string;
  // The customer's Moment (Expressive Selling §4) — what's actually bringing
  // them in. This is what the associate-facing UI leads with.
  moment: string;
  // Customer the associate role-plays with.
  persona: Persona;
  // HeyGen avatar for this station (the FACE). null => falls back to
  // LIVEAVATAR_AVATAR_ID. Created on the HeyGen/LiveAvatar platform.
  avatarId: string | null;
  // The VOICE (voice_id). null => falls back to LIVEAVATAR_VOICE_ID.
  voiceId: string | null;
  // The persona "brain" (context_id) — the LiveAvatar context built from this
  // persona's entry in personaBrains.ts. null => falls back to
  // LIVEAVATAR_CONTEXT_ID. This is what makes the avatar behave as the customer.
  contextId: string | null;
  // The category this station crowns a champion in.
  heroSkill: HeroSkill;
  // The deck's friendly name for the hero skill (may differ from the rubric
  // category label — e.g. Theo's "Confidence Building").
  heroSkillLabel: string;
  // Badge a team earns when its hero-skill score clears the threshold.
  heroBadge: string;
  // The #1 region on this hero skill earns the "ultimate" version + the prize.
  ultimateBadge: string;
  // Bonus prize for the top-scoring team (every manager on the team receives).
  prize: string | null;
  // Background asset under public/backgrounds/. Defaults to the shared one.
  background?: string;
};

// The six stations, transcribed from "Coach Pulse SMC Experience_draft May
// 2026" slide 6. Five hero skills map cleanly onto the scoring rubric; Theo's
// deck hero skill is "Confidence Building", which the rubric does NOT score —
// so his pod is assigned `exploringTogether`, the one rubric category no other
// pod owns. This makes pods ↔ categories a clean bijection.
// TODO(joon): confirm Theo → Exploring Together, his badge name (deck says
// "TBD (OPEN DOOR)" on slide 6 but "Acquisition Accelerator" on slide 9), and
// the three open prizes (Zoe, Amara, Theo).
export const SCENARIOS: Scenario[] = [
  {
    id: "culture",
    station: 1,
    archetype: "First Luxury Purchase",
    moment: "Cultural Moment",
    persona: DEFAULT_PERSONA, // Zoe Chen — full persona already in the demo
    avatarId: null,
    voiceId: null,
    contextId: null,
    heroSkill: "culturalRelevance",
    heroSkillLabel: "Cultural Fluency",
    heroBadge: "Culture Champ",
    ultimateBadge: "Top Culture Champ",
    prize: null, // ?? — open in deck
  },
  {
    id: "moment",
    station: 2,
    archetype: "Milestone Purchase",
    moment: "Milestone Moment",
    persona: {
      name: "Sofia Rossi",
      type: "Milestone Purchase",
      scenario:
        "Gen Z celebrating a milestone. Already decided on the bag. The emotional moment matters more than selling.",
    },
    avatarId: "69cf601f-b35b-4d1b-a701-c854d223b5a5", // Katya (Portrait) — placeholder face
    voiceId: "b2bd6569-a537-4342-aeca-a1f15d2a2c97", // Rika
    contextId: "b8b59215-a56f-4d96-a5f1-2196091e0281", // Sofia Rossi brain
    heroSkill: "understandingTheMoment",
    heroSkillLabel: "Understanding the Moment",
    heroBadge: "Moment Maker",
    ultimateBadge: "Top Moment Maker",
    prize: "Breakfast or lunch with Todd",
  },
  {
    id: "empathy",
    station: 3,
    archetype: "Gift Return",
    moment: "Everyday Expression",
    persona: {
      name: "Ji-Eun Park",
      type: "Gift Return",
      scenario:
        "Gen Z who received a bag as a gift. Needs to return/exchange. Feels awkward and uncomfortable.",
    },
    avatarId: "cd1d101c-9273-431b-8069-63beef736bec", // Judy — placeholder face
    voiceId: "b2bd6569-a537-4342-aeca-a1f15d2a2c97", // Rika
    contextId: "c9d7ef9e-beb1-4891-ad31-b1daa1288818", // Ji-Eun Park brain
    heroSkill: "emotionalConnection",
    heroSkillLabel: "Emotional Intelligence",
    heroBadge: "Empathy Expert",
    ultimateBadge: "Top Empathy Expert",
    prize: "Coach Coffee Shop gift card",
  },
  {
    id: "closer",
    station: 4,
    archetype: "High Intent but Can't Decide",
    moment: "Personal Turning Point",
    persona: {
      name: "Amara Okafor",
      type: "High Intent but Can't Decide",
      scenario:
        "First-time luxury buyer. Has spent a month researching on TikTok and can't decide. Needs help making sense of her own preferences.",
    },
    avatarId: "06bcaebf-feeb-4e7a-8ab8-16b9f9537a19", // Amina (Portrait) — placeholder face
    voiceId: "b2bd6569-a537-4342-aeca-a1f15d2a2c97", // Rika
    contextId: "fbaa9790-a0c7-42cb-a448-a7d1ea74f05a", // Amara Okafor brain
    heroSkill: "guidingTheDecision",
    heroSkillLabel: "Guiding the Decision",
    heroBadge: "Closer",
    ultimateBadge: "Top Closer",
    prize: null, // ?? — open in deck
  },
  {
    id: "explorer",
    station: 5,
    archetype: "New Male Explorer",
    moment: "Personal Turning Point",
    persona: {
      name: "Theo Laurent",
      type: "New Male Explorer",
      scenario:
        "Gen Z male exploring Coach for the first time. Interested in the Soho sneaker but not sure Coach feels relevant for him.",
    },
    avatarId: "f0a9978d-634a-4063-8164-42ba6670542f", // Graham (Portrait) — placeholder face
    voiceId: "c2527536-6d1f-4412-a643-53a3497dada9", // Wayne Liang
    contextId: "1dc48609-0cd3-4a97-9f08-1e07d36aec9b", // Theo Laurent brain
    // Deck hero skill: "Confidence Building" (not a scored category). Mapped to
    // exploringTogether — the orphaned rubric category — pending Joon's sign-off.
    heroSkill: "exploringTogether",
    heroSkillLabel: "Confidence Building",
    heroBadge: "Acquisition Accelerator", // deck slide 9; slide 6 says "TBD (Open Door)"
    ultimateBadge: "Top Acquisition Accelerator",
    prize: null, // ?? — open in deck
  },
  {
    id: "brand",
    station: 6,
    archetype: "Outlet Bag in Retail",
    moment: "Cultural Moment",
    persona: {
      name: "Valentina Cruz",
      type: "Outlet Bag in Retail",
      scenario:
        "Gen Z customer enters a Collection store looking for the Teri bag after seeing it trending heavily on social media.",
    },
    avatarId: "9a4f4b1f-86f9-4acf-9a37-b81c21ae95e4", // Elenora — placeholder face
    voiceId: "b2bd6569-a537-4342-aeca-a1f15d2a2c97", // Rika
    contextId: "113ddd37-2e22-441c-a273-5c89e0de081a", // Valentina Cruz brain
    heroSkill: "productKnowledge",
    heroSkillLabel: "Brand Fluency",
    heroBadge: "Brand Fluency",
    ultimateBadge: "Top Brand Fluency",
    prize: "Bag charm",
  },
];

export function getScenario(id: string | null | undefined): Scenario | null {
  if (!id) return null;
  return SCENARIOS.find((s) => s.id === id) ?? null;
}
