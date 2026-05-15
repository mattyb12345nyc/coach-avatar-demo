# coach-avatar-demo

A standalone demo of the Coach Pulse practice experience built around the
HeyGen **LiveAvatar Web SDK**, with the avatar's green-screen removed onto
the Coach Cherry Boutique background and an AI scoring screen that mirrors
the live Coach Pulse 6-category rubric.

Standalone — **does not** touch `coach-connect` or `coach-connect-admin`.

**Audience:** internal walkthrough for Joon, Lauren, and Sarah ahead of SMC.

**Live URL (target):** https://pulse-avatar.futureproof.work

---

## Flow

```
┌──────────────┐  Start  ┌──────────────┐  End / 10:00  ┌────────────────┐  /api/score  ┌────────────┐
│ pre-session  │ ──────▶ │   active     │ ────────────▶ │   analyzing    │ ───────────▶ │   score    │
│              │         │ (avatar +    │               │ (pulsing gold) │              │ (6 bars +  │
│ persona +    │         │  chroma key) │               │                │              │  highlights│
│ bg picker)   │         │              │               │                │              │  + summary)│
└──────────────┘         └──────────────┘               └────────────────┘              └────────────┘
                                                                                              │
                                                                                              ▼
                                                                                        Try again ➜ pre
```

All four screens live in a single `useState`-based state machine inside
`src/app/page.tsx` — no router, no Zustand.

---

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in the values
npm run dev
```

Open <http://localhost:3000>.

### Required env vars

| Var                              | Where         | Purpose                                                                                      |
| -------------------------------- | ------------- | -------------------------------------------------------------------------------------------- |
| `LIVEAVATAR_API_KEY`             | server only   | HeyGen LiveAvatar API key. Used in `app/api/session/route.ts` to mint a session token.       |
| `LIVEAVATAR_AVATAR_ID`           | server only   | Default avatar. Currently `75b46fd5-554d-4f3f-876d-3210c906443b`.                             |
| `LIVEAVATAR_API_URL`             | server only   | Defaults to `https://api.liveavatar.com`. Override only for staging/test.                    |
| `NEXT_PUBLIC_LIVEAVATAR_API_URL` | client + srvr | Same value, exposed to the browser SDK.                                                       |
| `LIVEAVATAR_VOICE_ID`            | server only   | Optional voice override.                                                                      |
| `LIVEAVATAR_CONTEXT_ID`          | server only   | Optional persona/context ID.                                                                  |
| `LIVEAVATAR_LANGUAGE`            | server only   | Defaults to `en`.                                                                             |
| `ANTHROPIC_API_KEY`              | server only   | Used by `/api/score` to score the transcript with `claude-sonnet-4-5-20250929`.              |
| `NEXT_PUBLIC_SCORING_ENDPOINT`   | client        | Override the scoring endpoint. Leave blank to use the bundled local route.                    |

`.env.local` is `.gitignore`d. **Never commit secrets.**

---

## Swapping the avatar

Set `LIVEAVATAR_AVATAR_ID` in `.env.local` (or in your Netlify env). The
client-side React tree doesn't hard-code the ID anywhere; the server route
reads it on each session-start request.

To override per-call, post `{ avatar_id: "..." }` to `/api/session` — the
route accepts it but currently the UI does not expose it.

---

## Adding a new background preset

Edit `src/config/backgrounds.ts`:

```ts
{
  key: "warm-studio",
  label: "Warm Studio",
  image: "/backgrounds/warm-studio.jpg",
  avatarOffset: { scaleVh: 65, x: 0, yPercentFromBottom: 8 },
}
```

Drop the asset under `public/backgrounds/`. The picker reads the array at
build time; no other wiring is required.

The `avatarOffset` controls how the chroma-keyed avatar is positioned on
the stage:

- `scaleVh` — height as a percentage of viewport height
- `x` — horizontal offset in pixels (positive = right)
- `yPercentFromBottom` — distance from bottom of viewport as a percentage

Tweak interactively by appending `?debug=1` to the URL — chroma-key tuning
sliders appear top-right.

---

## Production mode (burns credits)

The session API currently posts `is_sandbox: true` to
`https://api.liveavatar.com/v1/sessions/token`. To run real sessions, flip
the literal in `src/app/api/session/route.ts`:

```ts
is_sandbox: false,
```

Sandbox mode is free; production mode consumes HeyGen credits.

---

## Scoring source: how it works

The Coach Pulse live app's scoring endpoint
(`https://coach.futureproof.work/.netlify/functions/anthropic-proxy`) is
**not** reachable from this demo, because:

1. Its CORS policy is locked to `https://coach.futureproof.work`.
2. It requires a Supabase auth token this demo doesn't have.

This repo ships **Path 2** by default: a local Next.js route at
`/api/score` that calls Anthropic directly using the exact same system
prompt the live app uses (mirrored verbatim from
`coach-connect/netlify/functions/_prompts/practice-scoring.cjs` into
`src/lib/scoringPrompt.ts`). The 6-category breakdown (`understandingTheMoment`,
`exploringTogether`, `guidingTheDecision`, `emotionalConnection`,
`culturalRelevance`, `productKnowledge`) and the response shape are
identical.

If you ever expose a CORS-open / unauthenticated scoring proxy in the
future, point `NEXT_PUBLIC_SCORING_ENDPOINT` at it and `/api/score` will
be bypassed.

---

## Deploy

This repo is wired for Netlify with `@netlify/plugin-nextjs`.

1. `npm run build` locally to confirm it compiles.
2. Push to `main` — Netlify auto-deploys from GitHub.
3. In **Site settings → Environment variables**, set all the required
   env vars above. The build will succeed without `ANTHROPIC_API_KEY` or
   `LIVEAVATAR_API_KEY`, but runtime requests will 500.
4. In **Domain management**, add `pulse-avatar.futureproof.work` as a
   custom domain. Add the CNAME Netlify provides to the `futureproof.work`
   DNS at the registrar.

### Deploy verification

```bash
curl -sI https://pulse-avatar.futureproof.work | head -1
```

Expect `HTTP/2 200`.

---

## Known limitations

- **Chroma-key edge artifacts.** The canvas-2D shader walks the green-screen
  per pixel; harsh-lit avatars can leave a faint green halo on light/saturated
  backgrounds. Tune via `?debug=1` if needed; the defaults work well on the
  Cherry Boutique image.
- **No transcript display.** The UI captures transcripts via the SDK's
  `USER_TRANSCRIPTION` / `AVATAR_TRANSCRIPTION` events and feeds them to the
  scoring endpoint, but does not render them in the Active Session screen.
- **Single persona.** The demo ships with Sofia as the only practice partner.
  Add more in `src/lib/defaultPersona.ts` and wire a selector if needed.
- **Cherry Boutique image** is **not** committed. Matt drops it manually at
  `public/backgrounds/coach-cherry-boutique.png`. Until then, the picker
  preset renders as Coach black.

---

## Repo structure

```
src/
  app/
    api/
      session/route.ts        # POST → LiveAvatar /v1/sessions/token
      score/route.ts          # POST → Anthropic, returns 6-category scores
    layout.tsx
    page.tsx                  # screen state machine
    globals.css               # brand tokens (Tailwind v4 @theme)
  components/
    PreSession.tsx
    ActiveSession.tsx         # mounts the LiveAvatar context
    AnalyzingTransition.tsx   # min-8s pulsing gold ring + scoring fetch
    ScoreCard.tsx             # mirrors coach-connect's ScoreCard layout
    BackgroundPicker.tsx
    ChromaKeyVideo.tsx        # canvas-2D chroma key, ported from SDK demo
  config/
    backgrounds.ts            # preset list + per-bg avatar offsets
  liveavatar/
    context.tsx               # SDK wrapper, transcript subscription
    useSession.ts
    index.ts
  lib/
    chromaKey.ts              # the HSV per-pixel shader
    scoringPrompt.ts          # mirrors coach-connect's practice-scoring prompt
    scoreCategories.ts        # UI labels for the 6 categories
    defaultPersona.ts
    types.ts
public/
  backgrounds/                # static background images
```
