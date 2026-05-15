"use client";

import type { Persona } from "@/lib/types";

type SessionTooShortProps = {
  persona: Persona;
  durationSeconds: number;
  onTryAgain: () => void;
};

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function SessionTooShort({
  persona,
  durationSeconds,
  onTryAgain,
}: SessionTooShortProps) {
  return (
    <div className="flex-1 flex flex-col bg-coach-cream">
      <header className="bg-coach-black text-coach-cream px-6 pt-12 pb-12 text-center">
        <p className="font-pulse-ext text-[10px] tracking-[0.22em] uppercase font-medium text-coach-cream/75">
          Session too short
        </p>
        <h1
          className="mt-3 font-bembo text-[28px] leading-[1.1] font-normal"
          style={{ letterSpacing: "-0.005em" }}
        >
          Let&apos;s try that again.
        </h1>
        <p className="mt-3 font-pulse-body text-[13px] text-coach-cream/65">
          {durationSeconds > 0
            ? `Lasted ${formatElapsed(durationSeconds)}`
            : "Less than a minute"}
        </p>
      </header>

      <main className="flex-1 bg-coach-cream rounded-t-3xl -mt-6 px-5 pt-10 pb-16">
        <div className="mx-auto w-full max-w-[520px] flex flex-col items-center gap-6 text-center">
          {persona.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={persona.image}
              alt={persona.name}
              className="w-[60px] h-[60px] rounded-full object-cover"
            />
          ) : (
            <div className="w-[60px] h-[60px] rounded-full bg-coach-black flex items-center justify-center text-coach-cream font-pulse-ext text-[18px] font-medium">
              {persona.name.charAt(0)}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p className="font-bembo text-[22px] leading-[1.2] text-pulse-primary">
              We need a bit more of the conversation to score it.
            </p>
            <p className="font-pulse-body text-[14px] leading-[1.6] text-pulse-neutral-1">
              Practice with {persona.name.split(" ")[0]} for at least a
              couple of minutes — long enough to surface her moment,
              explore together, and start guiding the decision. Then end
              the session for a full breakdown.
            </p>
          </div>

          <div className="w-full rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-4 flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-coach-black shrink-0" />
            <p className="font-pulse-body text-[13px] text-pulse-neutral-dark text-left">
              Aim for 2–10 minutes with a few back-and-forth turns.
            </p>
          </div>

          <button
            type="button"
            onClick={onTryAgain}
            className="w-full inline-flex items-center justify-center rounded-pulse-pill bg-coach-black text-coach-cream font-pulse-ext text-[12px] font-medium tracking-[0.12em] uppercase px-10 py-4 hover:opacity-90 active:scale-[0.99] transition-all"
          >
            Try again
          </button>
        </div>
      </main>
    </div>
  );
}
