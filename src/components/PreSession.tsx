"use client";

import { useState } from "react";
import type { Persona } from "@/lib/types";

type PreSessionProps = {
  persona: Persona;
  onStart: () => Promise<void> | void;
};

export function PreSession({ persona, onStart }: PreSessionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setError(null);
    setLoading(true);
    try {
      await onStart();
    } catch (err) {
      setError((err as Error).message || "Could not start session");
    } finally {
      setLoading(false);
    }
  };

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex-1 flex flex-col bg-coach-cream">
      {/* Black hero header */}
      <header className="bg-coach-black text-coach-cream px-6 pt-12 pb-12">
        <p className="font-pulse-ext text-[10px] tracking-[0.18em] uppercase font-medium text-coach-cream/80">
          Welcome to Coach Pulse
        </p>
        <h1
          className="mt-3 font-bembo text-[32px] leading-[1.05] font-normal"
          style={{ letterSpacing: "-0.01em" }}
        >
          Practice your moment with {persona.name.split(" ")[0]}.
        </h1>
        <p className="mt-3 font-pulse-body text-[13px] text-coach-cream/75">
          {todayLabel} · <span className="underline underline-offset-2">Live avatar session</span>
        </p>
      </header>

      {/* Cream container with rounded-top overlap */}
      <main className="flex-1 bg-coach-cream rounded-t-3xl -mt-6 px-5 pt-8 pb-16 flex flex-col items-center gap-6">
        <div className="w-full max-w-[560px] flex flex-col gap-6">
          {/* Persona card — white surface with pulse-stroke border */}
          <section className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-5 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              {persona.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={persona.image}
                  alt={persona.name}
                  className="w-[60px] h-[60px] rounded-full object-cover"
                />
              ) : (
                <div className="w-[60px] h-[60px] rounded-full bg-coach-black flex items-center justify-center text-coach-cream font-pulse-ext text-[20px] font-medium">
                  {persona.name.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                {persona.type && (
                  <p className="font-pulse-ext text-[9px] tracking-[0.18em] uppercase font-medium text-pulse-meta mb-1">
                    {persona.type}
                  </p>
                )}
                <p className="font-pulse-body text-[16px] font-medium text-pulse-primary leading-tight">
                  {persona.name}
                  {persona.age ? `, ${persona.age}` : ""}
                </p>
              </div>
            </div>
            <p className="font-pulse-body text-[14px] leading-[1.55] text-pulse-neutral-dark">
              {persona.scenario}
            </p>

            {persona.tip && (
              <div className="rounded-pulse-tile bg-pulse-neutral-light p-4">
                <p className="font-pulse-ext text-[9px] tracking-[0.22em] uppercase font-medium text-pulse-primary mb-1.5">
                  Remember
                </p>
                <p className="font-pulse-body text-[13px] leading-[1.5] text-pulse-neutral-dark">
                  {persona.tip}
                </p>
              </div>
            )}
          </section>

          {/* Duration guidance — subtle meta */}
          <div className="flex items-center justify-center gap-2">
            <span
              className="w-1 h-1 rounded-full bg-pulse-neutral"
              aria-hidden
            />
            <p className="font-pulse-body text-[12px] text-pulse-neutral-1">
              Minimum 2 minutes, maximum 10 minutes to receive a score
            </p>
          </div>

          {/* Primary CTA — solid black */}
          <button
            type="button"
            onClick={handleStart}
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-pulse-pill bg-coach-black text-coach-cream font-pulse-ext text-[12px] font-medium tracking-[0.12em] uppercase px-10 py-4 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Connecting…" : "Start session"}
          </button>

          {error && (
            <p className="font-pulse-body text-[13px] text-pulse-error text-center">
              {error}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
