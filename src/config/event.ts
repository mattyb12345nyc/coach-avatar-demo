// Coach Pulse SMC Game App — single source of truth (config-driven per the
// build brief). Personas, games, point caps, timer, languages, team count.
// Everything tunable lives here so Shanelle's final numbers/labels and
// Harrison's updated prompts drop in without a rebuild.

export type Persona = {
  slug: string;
  name: string;
  age?: number;
  type: string;
  scenario: string;
  tip?: string;
  preCallTips: string[];
  image: string;
  // ElevenLabs Conversational AI agent (English base). Pulled from
  // coach-connect's practice_personas. Updated agents drop in here.
  agentId: string;
  // Per-language twin agents (es/fr/pt/…); falls back to agentId when absent.
  languageAgents?: Record<string, string>;
  scenarioMode: "decision" | "open_ended";
  sortOrder: number;
};

export type Game = {
  slug: string;
  name: string;
  maxPoints: number;
  // Optional note (e.g. ties into Culture Feed / Ask Pulse in the demo app).
  note?: string;
  sortOrder: number;
};

export type Language = { code: string; label: string };

// The 3 voice personas, in room order. Same order for every team.
export const PERSONAS: Persona[] = [
  {
    slug: "zoe",
    name: "Zoe Chen",
    age: 20,
    type: "First-Time Luxury Buyer",
    scenario:
      "Saw the Tabby on TikTok but thinks it's too expensive. Needs authenticity, not pushy tactics.",
    tip: "Zoe wants authentic guidance, not pushy tactics. Connect through TikTok trends and share the craftsmanship story.",
    preCallTips: [
      "Zoe wants authentic guidance, not pushy tactics.",
      "Connect through TikTok trends and share the craftsmanship story.",
    ],
    image: "/personas/persona_zoe-chen-1.webp",
    agentId: "agent_5401ksrmcshceawaeqfjd5axpp1s",
    scenarioMode: "decision",
    sortOrder: 1,
  },
  {
    slug: "sofia",
    name: "Sofia Rossi",
    age: 23,
    type: "Milestone Purchase",
    scenario:
      "Already decided on the Tabby 26 — but this purchase is tied to a meaningful life moment (first job, graduation, a big move). The moment matters more than the sale.",
    tip: 'Uncover and celebrate the "why now" behind the purchase — make the moment feel personal, not transactional.',
    preCallTips: [
      'Uncover and celebrate the "why now" behind the purchase.',
      "Make the moment feel personal and memorable, not just transactional.",
    ],
    image: "/personas/persona_sofia-rossi.webp",
    agentId: "agent_8301kmv4gyw1e5z8r6paysfjh6rg",
    scenarioMode: "decision",
    sortOrder: 2,
  },
  {
    slug: "jieun",
    name: "Ji-eun Park",
    age: 22,
    type: "Gift Return",
    scenario:
      "Wants to return a bag received as a gift. No receipt. Awkward, but open to an exchange if approached warmly.",
    tip: "Don't make her feel judged. Lead with reassurance about the policy, then pivot to something she might actually love.",
    preCallTips: [
      "Don't make her feel judged for returning.",
      "Lead with reassurance, then pivot to something she might love.",
    ],
    image: "/personas/persona_ji-eun-park.webp",
    agentId: "agent_3101kmv4w246fx6atf9a1k3yk2mf",
    scenarioMode: "decision",
    sortOrder: 3,
  },
];

// The 6 manual games (admin-entered, 15 pts each). Final list TBD from
// Harrison; two tie into the demo app (Culture Feed, Ask Pulse).
export const GAMES: Game[] = [
  { slug: "whats-the-word", name: "What's the Word?", maxPoints: 15, note: "Culture Feed crossword", sortOrder: 1 },
  { slug: "guess-their-moment", name: "Guess Their Moment", maxPoints: 15, sortOrder: 2 },
  { slug: "ready-or-not", name: "Ready or Not", maxPoints: 15, sortOrder: 3 },
  { slug: "true-or-false", name: "True or False — Coach Edition", maxPoints: 15, note: "Ask Pulse", sortOrder: 4 },
  { slug: "leaning-in", name: "Leaning In", maxPoints: 15, sortOrder: 5 },
  { slug: "self-expression", name: "Project Self-Expression", maxPoints: 15, sortOrder: 6 },
];

export const LANGUAGES: Language[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "pt", label: "Português" },
];

export const EVENT_CONFIG = {
  teamsCount: 44, // teams are numbered 1..44, no names
  personaMax: 100, // role-play % = points, up to 100
  gameMax: 15, // each manual game caps at 15
  sessionsPerPersona: 2, // every persona is run twice; best of two counts
  personaCapSeconds: 240, // 4-minute hard cap per session
  defaultLanguage: "en",
} as const;

// Max possible team total: 3 personas × 100 + 6 games × 15 = 390.
export const MAX_TEAM_TOTAL =
  PERSONAS.length * EVENT_CONFIG.personaMax + GAMES.length * EVENT_CONFIG.gameMax;

export function getPersona(slug: string | null | undefined): Persona | null {
  return PERSONAS.find((p) => p.slug === slug) ?? null;
}

// Resolve the ElevenLabs agent for a persona + language (falls back to the
// English base agent until language twins are configured).
export function resolveAgentId(persona: Persona, language: string): string {
  return persona.languageAgents?.[language] || persona.agentId;
}
