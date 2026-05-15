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

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[720px] flex flex-col items-center text-center gap-8">
        <header className="flex flex-col gap-3">
          <p className="text-coach-gold text-[12px] tracking-[0.3em] uppercase font-medium">
            Coach Pulse
          </p>
          <h1 className="text-[36px] leading-[1.15] text-coach-cream font-medium">
            Practice with Coach Pulse
          </h1>
          <p className="text-[18px] text-coach-cream/70 font-normal max-w-[520px] mx-auto">
            A live avatar conversation. Get scored on what matters.
          </p>
        </header>

        <section className="w-full max-w-[480px] rounded-2xl border border-coach-gold/40 bg-coach-black/40 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-coach-gold/15 border border-coach-gold/40 flex items-center justify-center text-coach-gold text-lg font-medium">
              {persona.name.charAt(0)}
            </div>
            <div className="flex-1 text-left">
              <p className="text-coach-cream text-[16px] font-medium">
                {persona.name}
                {persona.age ? `, ${persona.age}` : ""}
              </p>
              <p className="text-coach-cream/60 text-[13px] mt-0.5">
                Your practice partner
              </p>
            </div>
          </div>
          <p className="mt-4 text-left text-coach-cream/80 text-[14px] leading-[1.55]">
            {persona.scenario}
          </p>
        </section>

        <div className="inline-flex items-center gap-2 rounded-full border border-coach-cream/15 px-4 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-coach-gold" />
          <p className="text-coach-cream/70 text-[12px]">
            Minimum 2 minutes, maximum 10 minutes to receive a score.
          </p>
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-full bg-coach-gold px-10 py-3.5 text-coach-black text-[14px] font-medium tracking-[0.08em] uppercase transition hover:translate-y-[-1px] hover:shadow-[0_8px_24px_rgba(201,162,39,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Connecting..." : "Start session"}
        </button>

        {error && (
          <p className="text-coach-mahogany text-[13px] max-w-[480px]">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
