export type Screen =
  | "pre-session"
  | "active"
  | "analyzing"
  | "score"
  | "too-short";

export type TranscriptRole = "user" | "avatar";

export type TranscriptLine = {
  role: TranscriptRole;
  text: string;
  timestamp: number;
};

export type ChromaKeyOptions = {
  minHue: number;
  maxHue: number;
  minSaturation: number;
  threshold: number;
};

export const DEFAULT_CHROMA_KEY_OPTIONS: ChromaKeyOptions = {
  minHue: 60,
  maxHue: 180,
  minSaturation: 0.1,
  threshold: 1.0,
};

export type AvatarOffset = {
  scaleVh: number;
  x: number;
  yPercentFromBottom: number;
};

export type BackgroundPreset = {
  key: string;
  label: string;
  image?: string;
  color?: string;
  avatarOffset: AvatarOffset;
  default?: boolean;
};

export type ScoringScores = {
  understandingTheMoment: number;
  exploringTogether: number;
  guidingTheDecision: number;
  emotionalConnection: number;
  culturalRelevance: number;
  productKnowledge: number;
};

export type ScoringHighlight = {
  type: "positive" | "improvement";
  text: string;
};

export type ScoringResult = {
  scores: ScoringScores;
  overall_score: number;
  stars: number;
  highlights: ScoringHighlight[] | string[];
  summary: string;
  recommendedNextFeedback: string;
  decisionOutcome?: string;
  decisionEvidence?: string | null;
};

export type Persona = {
  name: string;
  age?: number;
  type?: string;
  scenario: string;
  tip?: string;
  image?: string;
  engagementZone?: string;
  customerMoment?: string;
  superpower?: string;
};
