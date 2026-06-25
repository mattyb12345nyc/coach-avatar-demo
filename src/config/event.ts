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
    languageAgents: {
      fr: "agent_1501kvdre03jeg695kdhhw76q810",
      es: "agent_6001kve1qs6zevdamwfv9bghq58q",
      it: "agent_2401kvejx8qfegcvghj5egdqdwa2",
      de: "agent_9401kvery0d0fzm892nxhd41g89r",
      ja: "agent_4801kvev9sgcfeqr41z6htknmfg1",
      ko: "agent_9601kvezmyncfscrs0p83e6n28m0",
      zh: "agent_8301kvg3kmkrfv5sv0dfw8yfeht2",
      "zh-HK": "agent_5001kvg1bf8web8rcapt8gp4f135",
    },
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
    languageAgents: {
      fr: "agent_9701kvds0mtcerz95418yzx86jtr",
      es: "agent_0301kve12s2pffcrp88mzvmzr33j",
      it: "agent_5901kve39e9tej6s1avtfg2m7t2g",
      de: "agent_9201kveqxq00fkw8eafejmjqt241",
      ja: "agent_3001kvetcbdkf3japhvdg7dvszyp",
      ko: "agent_4001kveytd40fwvbngkx8c300wvq",
      zh: "agent_1001kvg2q0p5fets6sfyxady70mp",
      "zh-HK": "agent_3001kvfzkvkffem914jjcyp5jrh8",
    },
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
    languageAgents: {
      fr: "agent_7801kvdjxmhgfj49cdvadxmntae5",
      es: "agent_2901kve2mv0mesea5jw542703edh",
      it: "agent_7301kvemkyrvegwrq359xfkz21gy",
      de: "agent_5601kvesqxnpf80an4rvb7w3vfe9",
      ja: "agent_4701kvew7c4te2can9vsdy70edyj",
      ko: "agent_6301kvf0mkexf8rvy1h2sxcvd7aw",
      zh: "agent_2201kvg4mmgbfpza868653q00sad",
      "zh-HK": "agent_5301kvg28rnqew2a0z3d7mj9q5av",
    },
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

// Only languages we have ElevenLabs twin agents for (per persona). Portuguese
// has no twin yet — per the brief, those CI LatAm teams run in Spanish.
export const LANGUAGES: Language[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "zh", label: "中文 (普通话)" },
  { code: "zh-HK", label: "粵語 (廣東話)" },
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
