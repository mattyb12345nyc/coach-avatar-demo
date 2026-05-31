#!/usr/bin/env node
// One-shot LiveAvatar setup for the 5 SMC station personas.
//
// Creates a LiveAvatar "context" (persona brain) for each station from
// src/config/personaBrains.ts, picks a gender-matched English voice, and
// surfaces the public-avatar menu so faces can be chosen. Prints the IDs to
// paste into src/config/scenarios.ts.
//
// Run:  LIVEAVATAR_API_KEY=... node scripts/setup-avatars.mjs
// Safe: only creates contexts (reversible) + reads voices/avatars. No sessions
// are started, so no streaming credits are burned.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const API = process.env.LIVEAVATAR_API_URL || "https://api.liveavatar.com";
const KEY = process.env.LIVEAVATAR_API_KEY;
if (!KEY) {
  console.error("Missing LIVEAVATAR_API_KEY");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const brainsSrc = readFileSync(
  join(__dirname, "..", "src", "config", "personaBrains.ts"),
  "utf8",
);

// Pull each `key: `...`` template-literal brain out of personaBrains.ts.
const brains = {};
for (const m of brainsSrc.matchAll(/(\w+):\s*`([\s\S]*?)`,\n/g)) {
  brains[m[1]] = m[2].trim();
}

// Station meta the API needs that isn't in the brain text.
const STATIONS = [
  { id: "moment", name: "Sofia Rossi", gender: "female",
    opening: "Oh, hi! So… I actually already know which bag I want." },
  { id: "empathy", name: "Ji-Eun Park", gender: "female",
    opening: "Um, hi… sorry, I think I need to return something. Is that okay?" },
  { id: "closer", name: "Amara Okafor", gender: "female",
    opening: "Hi! Okay — I've been researching for like a month and I still can't decide." },
  { id: "explorer", name: "Theo Laurent", gender: "male",
    opening: "Hey. I was just looking at the sneakers… not totally sure this is my thing." },
  { id: "brand", name: "Valentina Cruz", gender: "female",
    opening: "Hi! I'm looking for the Teri — the one that's all over my feed right now." },
];

const headers = { "X-API-KEY": KEY, "Content-Type": "application/json" };

async function getAll(path) {
  const out = [];
  let page = 1;
  for (;;) {
    const res = await fetch(`${API}${path}${path.includes("?") ? "&" : "?"}page=${page}&page_size=100`, { headers });
    if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const data = json.data ?? json;
    const results = data.results ?? data ?? [];
    out.push(...results);
    if (!data.next || results.length === 0) break;
    page += 1;
    if (page > 10) break;
  }
  return out;
}

async function main() {
  console.log("Fetching voices + public avatars…");
  const voices = await getAll("/v1/voices?voice_type=public");
  const avatars = await getAll("/v1/avatars/public");
  console.log(`  ${voices.length} voices, ${avatars.length} public avatars\n`);

  const enVoice = (g) =>
    voices.find(
      (v) =>
        (v.gender || "").toLowerCase().startsWith(g[0]) &&
        (v.language || "en").toLowerCase().includes("en"),
    ) || voices.find((v) => (v.gender || "").toLowerCase().startsWith(g[0]));

  const active = avatars.filter((a) => (a.status || "ACTIVE") === "ACTIVE");
  const result = {};

  for (let i = 0; i < STATIONS.length; i++) {
    const s = STATIONS[i];
    const prompt = brains[s.id];
    if (!prompt) {
      console.error(`No brain found for ${s.id}; skipping`);
      continue;
    }
    // Create the context (persona brain).
    const res = await fetch(`${API}/v1/contexts`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: `Coach Pulse — ${s.name} (${s.id})`,
        prompt,
        opening_text: s.opening,
      }),
    });
    if (!res.ok) {
      console.error(`Context create failed for ${s.id}: HTTP ${res.status} ${await res.text()}`);
      continue;
    }
    const json = await res.json();
    const contextId = (json.data ?? json).id;
    const voice = enVoice(s.gender);
    // Best-effort distinct face; review against the menu below.
    const face = active[i % Math.max(active.length, 1)];

    result[s.id] = {
      contextId,
      voiceId: voice?.id ?? null,
      voiceName: voice?.name ?? null,
      avatarId: face?.id ?? null,
      avatarName: face?.name ?? null,
    };
    console.log(`✓ ${s.id} (${s.name})`);
    console.log(`    contextId: ${contextId}`);
    console.log(`    voice:     ${voice?.name ?? "—"} (${voice?.id ?? "—"})`);
    console.log(`    face*:     ${face?.name ?? "—"} (${face?.id ?? "—"})`);
  }

  console.log("\n================ PASTE INTO scenarios.ts ================");
  console.log(JSON.stringify(result, null, 2));

  console.log("\n================ FULL FACE MENU (pick your own) ========");
  active.slice(0, 40).forEach((a) =>
    console.log(`  ${a.name}  |  ${a.id}  |  ${a.preview_url || ""}`),
  );
  console.log("\n* faces were auto-assigned by index — review the menu and swap as desired.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
