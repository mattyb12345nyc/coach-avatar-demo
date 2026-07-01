import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coach Pulse — Las Vegas",
  description: "Live in-store associate avatar, standing on the Coach floor in Las Vegas.",
};

// Reuses the LiveAvatar embed Matt provided, flipped to portrait (9:16).
// orientation=vertical is the only change from the horizontal snippet.
const AVATAR_ID = "a4b14ad2-bf9a-4d93-aa0f-7a9e903313cb";
const EMBED_SRC = `https://embed.liveavatar.com/v1/${AVATAR_ID}?orientation=vertical`;

const STORE_IMAGE = "/backgrounds/coach-store-vegas.jpg";

export default function VegasPage() {
  return (
    <main className="relative min-h-[100svh] w-full overflow-hidden bg-coach-black">
      {/* Store backdrop */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={STORE_IMAGE}
        alt="Coach boutique, Las Vegas"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Legibility wash — keeps the avatar frame and wordmark crisp over a bright store */}
      <div className="absolute inset-0 bg-gradient-to-b from-coach-black/45 via-coach-black/15 to-coach-black/55" />
      <div className="absolute inset-0 [background:radial-gradient(120%_90%_at_50%_38%,transparent_45%,rgba(28,25,23,0.55)_100%)]" />

      {/* Wordmark */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5">
        <p className="font-pulse-ext text-[11px] uppercase tracking-[0.34em] text-coach-cream drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">
          Coach&nbsp;Pulse
        </p>
        <p className="font-pulse-ext text-[10px] uppercase tracking-[0.28em] text-coach-cream/70 drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">
          Las&nbsp;Vegas
        </p>
      </header>

      {/* 9:16 avatar, floated on the store floor */}
      <div className="relative z-10 flex min-h-[100svh] items-center justify-center px-4 py-16">
        <div
          className="relative aspect-[9/16] w-auto overflow-hidden rounded-[26px] bg-coach-black shadow-[0_40px_120px_-24px_rgba(0,0,0,0.85)] ring-1 ring-coach-cream/15"
          style={{ height: "min(86svh, 880px)", maxWidth: "94vw" }}
        >
          <iframe
            src={EMBED_SRC}
            title="Coach Pulse — Las Vegas associate"
            allow="microphone; autoplay; clipboard-write"
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      </div>
    </main>
  );
}
