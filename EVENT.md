# Coach Pulse Live! — SMC Activation Infrastructure

Turning the single-station avatar demo into the live, team-based SMC
activation. Source of truth: **"Coach Pulse SMC Experience_draft May 2026"**
(Joon's deck) + the May 29 working session.

## The concept

Not a training launch — a **large-scale immersive competition**. Regional
manager teams rotate through six themed "pods," each a life-size vertical
avatar screen running an AI customer role-play. Real-time scoring, surprise
SMS culture challenges, a live leaderboard, content capture, and a gala
finale with a highlight reel + awards. The point is to make leaders *feel*
the Expressive Luxury Experience, not hear about it.

## Event shape

- **6 pods**, one HeyGen avatar + one role-play scenario each. Vertical
  flat screens styled like an iPhone interface, life-size avatar, camera +
  mic. Real concurrency ~6–12 → no enterprise HeyGen deal, cost is a non-issue.
- **10–12 regional teams** (Northeast x2, Southeast x2, West x2, Central x2,
  Canada x2, Europe DTC, MEAI). Each gets a fun name, branded tee, Pulse access.
- Each pod crowns a **hero skill** champion. Clear **90%** on the hero skill
  → badge + bonus points. #1 region on a hero skill → "Top ___" + prize.
- **Pulse Alerts**: ~10 surprise **SMS** prompts (culture / TikTok trend /
  styling / consumer-insight). Teams answer via Coach Pulse (Ask Coach,
  Culture-verse). First correct = bonus; scores can be **+/-**.
- **Live leaderboard** big-screen: rankings, component scores, badge counts,
  best score per hero skill.
- Friction-free registration: QR deep-link to a pod + name/region dropdown.

## The six pods (deck slide 6)

| # | id | Persona | Archetype | Hero skill | Badge | Prize |
|---|----|---------|-----------|-----------|-------|-------|
| 1 | `culture`  | Zoe Chen       | First Luxury Purchase        | Cultural Fluency (`culturalRelevance`) | Culture Champ | ?? |
| 2 | `moment`   | Sofia Rossi    | Milestone Purchase           | Understanding the Moment (`understandingTheMoment`) | Moment Maker | Lunch with Todd |
| 3 | `empathy`  | Ji-Eun Park    | Gift Return                  | Emotional Intelligence (`emotionalConnection`) | Empathy Expert | Coffee Shop gift card |
| 4 | `closer`   | Amara Okafor   | High Intent, Can't Decide    | Guiding the Decision (`guidingTheDecision`) | Closer | ?? |
| 5 | `explorer` | Theo Laurent   | New Male Explorer            | **Confidence Building** → `exploringTogether` ⚠️ | Acquisition Accelerator ⚠️ | ?? |
| 6 | `brand`    | Valentina Cruz | Outlet Bag in Retail         | Brand Fluency (`productKnowledge`) | Brand Fluency | Bag charm |

## ⚠️ Open decision for Joon: hero-skill ↔ rubric mismatch

The app scores **6 fixed rubric categories**. Five pods map 1:1. But:
- **Theo's "Confidence Building" is not a scored category** — the scorer
  can't produce that number.
- **"Exploring Together" IS a scored category but is no pod's hero skill.**

Current resolution (in `scenarios.ts`): Theo's pod owns `exploringTogether`,
making pods ↔ categories a clean bijection. Also unresolved: Theo's badge name
(slide 6 "TBD / Open Door" vs slide 9 "Acquisition Accelerator") and 3 open
prizes (Zoe, Amara, Theo). **Needs Joon's sign-off.**

## Scoring (deck slide 9)

```
team_total = Σ(scenario totals, 0–100 each, across 6 pods)
           + Σ(hero-skill components, across 6 pods)
           + Σ(Pulse Alert bonuses, +/-)
           + Σ(badge bonuses)        ← per pod where hero-skill ≥ 90%
```

In `src/lib/eventScoring.ts` (pure) and the `team_leaderboard` SQL view —
both agree. Knobs in `EVENT_CONFIG`: `badgeThreshold = 0.90`,
`badgeBonusPoints = 25` (amount TBD — not specified in deck).

Score screen (slide 7) shows: total + breakdown (3 engagement zones + 3
foundational skills), hero-skill score, coaching feedback, badges earned —
all already produced by `/api/score`.

## Ownership (deck slide 12) — what's FutureProof's

- **AI avatar creation, testing, technical setup** — FutureProof
- **Pulse Alerts technical feasibility + execution** — FutureProof
- Score-screen design — Megan · Leaderboard / scenic / screens / camera —
  activation agency + Wynn. (We're building the digital spine regardless.)

## Copy voice

All user-facing copy follows the **coach-expressive-selling** skill (Expressive
Luxury Experience, April 2026). Rules in force: lead with the customer's
**Moment** (Cultural / Milestone / Personal Turning Point / Everyday
Expression — see `scenario.moment`), athletic "build the craft" framing, calm
never-blame errors; no selling / objection / close / step-as-sequence words.
Competition surfaces keep "score / points / leaderboard" — that's the deck's
gamified context, which the skill permits. Apply this skill to any new copy.

## Hosting & the main-app seam

**Hosted fully separately from the main product — by design.** Coach Pulse is
mid-migration to Tapestry IT; that's a moving, change-frozen, approval-gated
target you can't ship a live 2.5-hr event against. This event surface is
FutureProof-owned and autonomous:

- **Netlify** (already wired) + a **dedicated Supabase project** for the event
  (NOT coach-connect's DB). Own subdomain, own deploy, own rollback.
- **The only coupling to the main app is a corporate identity key**, captured
  at registration (`participants.email` / `employee_id`). This is the one
  irreversible decision — without it, badges can never reconcile back.
- **Migration is a post-event CSV, not a live integration.** The `badge_export`
  view fans team badges out to each manager's SSO identity → hand to Tapestry
  IT to import on their schedule. If the migrated app later exposes an ingest
  API, we can POST to it, but we never depend on it.

## Build status

**Done — foundation:**
- `src/config/scenarios.ts` — all 6 pods from the deck, hero-skill mapping + Theo flag.
- `src/lib/eventScoring.ts` — deck scoring formula, pure + typed, 90% badge.
- `supabase/migrations/0001_event_layer.sql` — full schema + leaderboard +
  badge_export views.

**Done — live event layer (verified end-to-end against the DB):**
- **Supabase project `coach-pulse-live`** (`vjlryqntggyvwhuxuxzo`, us-west-1) —
  separate from coach-connect. Schema applied, realtime on, grants set.
- `src/lib/supabase.ts` — server + browser clients.
- `/api/roster` (GET/POST) — teams + participants, add-on-the-fly.
- `/api/sessions` (POST) — persists each role-play, derives hero fields +
  badge, writes against team + station.
- `/api/leaderboard` (GET) — ranked `team_leaderboard` view.
- `src/components/WhosPlaying.tsx` — station gate: pick/create team + manager,
  captures corporate email (the migration join key). QR deep-link `/?station=`.
- `src/components/Leaderboard.tsx` + `/leaderboard` — big-screen live board,
  Supabase realtime + poll fallback. Full coach-connect branding.
- `src/app/page.tsx` — station context, who→play→score→next-player loop,
  fire-and-forget persistence. Solo demo still works with no station param.
- Verified: team→participant→session→leaderboard, badge auto-awarded at ≥90%,
  formula total matches (88 + 14 hero + 25 badge = 127). `npm run build` green.

**Next, in order:**
1. **Avatar IDs** — build the 6 HeyGen avatars, drop IDs into `scenarios.ts`.
2. **Vertical pod UI** — iPhone-style portrait frame for the station screens.
3. **Pulse Alerts** — Twilio SMS send + admin trigger + answer capture.
4. **Admin tooling** — manage teams, fire Pulse Alerts, award prizes, export badges.
5. **Deploy** — Netlify site + Supabase env vars + event subdomain.
6. **Content capture + gala** — sizzle-reel pipeline, leaderboard reveal.
7. **Main-stage moment** — Joon's multilingual avatar (EN → French → Korean).

## Live infra

- **Supabase:** project `coach-pulse-live` / ref `vjlryqntggyvwhuxuxzo` / us-west-1.
  Env vars in `.env.local` (and `.env.local.example` as the template). For
  Netlify, set the same `SUPABASE_*` + `NEXT_PUBLIC_SUPABASE_*` vars.
- **QR targets:** `/?station=culture|moment|empathy|closer|explorer|brand`.
- **Big screen:** `/leaderboard`.

## Open questions from the deck

- Final badge name + prizes for the open pods (Zoe, Amara, Theo).
- Confirm Theo → Exploring Together (or add Confidence Building to the rubric).
- Badge bonus point value.
- Leaderboard on managers' phones vs. big-screen only (slide 5 asks).
- Background-noise impact on AI role-play with teammates coaching (slide 9).
