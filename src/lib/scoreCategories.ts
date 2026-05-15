// Categories shown on the score card. Pulled out of the practice-scoring
// rubric so the UI labels stay in sync with the prompt's keys.

export type ScoreCategory = {
  key: string;
  label: string;
  max: number;
};

export const ENGAGEMENT_ZONES: ScoreCategory[] = [
  { key: "understandingTheMoment", label: "Understanding the Moment", max: 20 },
  { key: "exploringTogether", label: "Exploring Together", max: 20 },
  { key: "guidingTheDecision", label: "Guiding the Decision", max: 20 },
];

export const FOUNDATIONAL_SKILLS: ScoreCategory[] = [
  { key: "emotionalConnection", label: "Emotional Intelligence", max: 15 },
  { key: "culturalRelevance", label: "Cultural Fluency", max: 15 },
  { key: "productKnowledge", label: "Brand & Product Fluency", max: 10 },
];
