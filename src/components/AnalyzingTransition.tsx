"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { Persona, ScoringResult, TranscriptLine } from "@/lib/types";

type AnalyzingTransitionProps = {
  transcript: TranscriptLine[];
  persona: Persona;
  durationSeconds: number;
  endedReason: string;
  onComplete: (result: ScoringResult) => void;
  onError: (error: string) => void;
};

const MIN_DISPLAY_MS = 8000;

export function AnalyzingTransition({
  transcript,
  persona,
  durationSeconds,
  endedReason,
  onComplete,
  onError,
}: AnalyzingTransitionProps) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const startedAt = Date.now();
    const endpoint =
      process.env.NEXT_PUBLIC_SCORING_ENDPOINT &&
      process.env.NEXT_PUBLIC_SCORING_ENDPOINT.trim().length > 0
        ? process.env.NEXT_PUBLIC_SCORING_ENDPOINT
        : "/api/score";

    const run = async () => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript,
            persona: {
              name: persona.name,
              age: persona.age,
              scenario: persona.scenario,
            },
            scenario: persona.scenario,
            durationSeconds,
            endedReason,
            scenarioMode: "open_ended",
            prompt: "practice-scoring",
            model: "claude-sonnet-4-5-20250929",
          }),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(`Scoring failed (${res.status}): ${errText.slice(0, 200)}`);
        }
        const data = (await res.json()) as ScoringResult;
        const elapsed = Date.now() - startedAt;
        const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
        setTimeout(() => onComplete(data), wait);
      } catch (err) {
        const elapsed = Date.now() - startedAt;
        const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
        setTimeout(
          () => onError((err as Error).message || "Scoring failed"),
          wait,
        );
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-12 bg-coach-black">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: "rgba(201, 162, 39, 0.18)" }}
            animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.span
            aria-hidden
            className="absolute inset-3 rounded-full"
            style={{ backgroundColor: "rgba(201, 162, 39, 0.3)" }}
            animate={{ scale: [1, 1.25, 1], opacity: [0.8, 0.4, 0.8] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            aria-hidden
            className="absolute inset-6 rounded-full bg-coach-gold"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <p className="text-coach-cream text-[18px] font-normal">
          Analyzing your conversation...
        </p>
        <p className="text-coach-cream/60 text-[14px] leading-relaxed">
          Reviewing how you connected, explored, and guided.
        </p>
      </div>
    </main>
  );
}
