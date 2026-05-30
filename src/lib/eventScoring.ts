import type { ScoringScores } from "./types";
import type { HeroSkill } from "@/config/scenarios";

// Max points per rubric category. Mirrors scoreCategories.ts (sums to 100).
export const MAX_PER_CATEGORY: Record<keyof ScoringScores, number> = {
  understandingTheMoment: 20,
  exploringTogether: 20,
  guidingTheDecision: 20,
  emotionalConnection: 15,
  culturalRelevance: 15,
  productKnowledge: 10,
};

// Event tuning knobs — all the magic numbers Joon's formula depends on,
// in one place so they're trivial to adjust before the event.
export const EVENT_CONFIG = {
  // Hero-skill % a team must clear to earn the station badge + bonus.
  // Deck slide 9: "Hero skill score > 90% earns team a badge."
  badgeThreshold: 0.9,
  // Flat bonus points per badge earned. Amount unspecified in the deck —
  // placeholder until Joon sets it.
  badgeBonusPoints: 25,
} as const;

// One completed avatar role-play at a station. The `scores` object is the
// exact shape /api/score already returns — we just keep it instead of
// discarding it.
export type StationResult = {
  scenarioId: string;
  heroSkill: HeroSkill;
  scores: ScoringScores;
  // overall_score from the scorer (0–100). Equals the sum of all categories.
  scenarioTotal: number;
};

// The hero-skill component: the raw value of this station's hero category.
export function heroComponent(result: StationResult): number {
  return result.scores[result.heroSkill];
}

// Hero-skill performance as a 0–1 fraction of its category max.
export function heroPct(result: StationResult): number {
  const max = MAX_PER_CATEGORY[result.heroSkill];
  return max > 0 ? result.scores[result.heroSkill] / max : 0;
}

// Did this run clear the badge threshold for its hero skill?
export function earnsBadge(result: StationResult): boolean {
  return heroPct(result) >= EVENT_CONFIG.badgeThreshold;
}

export type TeamBreakdown = {
  // Σ of every station's 0–100 scenario total.
  scenarioPoints: number;
  // Σ of every station's hero-skill component (counted again, by design —
  // Joon's formula rewards the hero skill on top of the base score).
  heroPoints: number;
  // Σ of bonus points from Pulse Alerts (SMS scavenger-hunt prompts).
  // Can be negative — the deck allows +/- on Pulse Alert scores.
  pulseBonus: number;
  // Σ of badge bonuses unlocked by clearing the hero-skill threshold.
  badgeBonus: number;
  // Grand total used for the leaderboard.
  total: number;
  // Badges earned, one per station cleared.
  badges: string[];
};

// Joon's formula, verbatim:
//   total = Σ(scenario totals) + Σ(hero-skill components) + Σ(pulse bonuses)
//   + a team earns a badge (and bonus points) on any station where its
//     hero-skill score ≥ 85%.
export function teamBreakdown(
  results: StationResult[],
  pulseBonus = 0,
): TeamBreakdown {
  const scenarioPoints = results.reduce((sum, r) => sum + r.scenarioTotal, 0);
  const heroPoints = results.reduce((sum, r) => sum + heroComponent(r), 0);

  const badges: string[] = [];
  let badgeBonus = 0;
  for (const r of results) {
    if (earnsBadge(r)) {
      badges.push(r.scenarioId);
      badgeBonus += EVENT_CONFIG.badgeBonusPoints;
    }
  }

  return {
    scenarioPoints,
    heroPoints,
    pulseBonus,
    badgeBonus,
    total: scenarioPoints + heroPoints + pulseBonus + badgeBonus,
    badges,
  };
}

// Crown the per-scenario champion: the team with the highest hero-skill
// component on a given station earns the "ultimate" badge + the prize.
// Returns the winning teamId, or null on an empty/tied-at-zero field.
export function ultimateChampion(
  entries: Array<{ teamId: string; result: StationResult }>,
): string | null {
  let best: { teamId: string; value: number } | null = null;
  for (const { teamId, result } of entries) {
    const value = heroComponent(result);
    if (value <= 0) continue;
    if (!best || value > best.value) best = { teamId, value };
  }
  return best?.teamId ?? null;
}
