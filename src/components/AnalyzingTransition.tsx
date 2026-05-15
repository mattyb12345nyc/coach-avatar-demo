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
  onTooShort: () => void;
};

// Client-side guard: if there's basically nothing to score, skip the
// API call and route straight to the "too short" screen. Mirrors the
// server-side threshold in /api/score so we don't burn a model call.
const MIN_USER_TURNS = 2;
const MIN_TOTAL_CHARS = 60;

const MIN_DISPLAY_MS = 8000;

export function AnalyzingTransition({
  transcript,
  persona,
  durationSeconds,
  endedReason,
  onComplete,
  onError,
  onTooShort,
}: AnalyzingTransitionProps) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const startedAt = Date.now();

    // Short-circuit obviously-too-short sessions before hitting the API.
    const userTurns = transcript.filter((l) => l.role === "user").length;
    const totalChars = transcript.reduce(
      (sum, l) => sum + (l.text?.length ?? 0),
      0,
    );
    if (userTurns < MIN_USER_TURNS || totalChars < MIN_TOTAL_CHARS) {
      const wait = Math.max(0, MIN_DISPLAY_MS - (Date.now() - startedAt));
      setTimeout(() => onTooShort(), wait);
      return;
    }

    const endpoint =
      process.env.NEXT_PUBLIC_SCORING_ENDPOINT &&
      process.env.NEXT_PUBLIC_SCORING_ENDPOINT.trim().length > 0
        ? process.env.NEXT_PUBLIC_SCORING_ENDPOINT
        : "/api/score";

    const finish = (fn: () => void) => {
      const wait = Math.max(0, MIN_DISPLAY_MS - (Date.now() - startedAt));
      setTimeout(fn, wait);
    };

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
          let serverErr = "";
          try {
            const payload = (await res.json()) as { error?: string };
            serverErr = payload.error ?? "";
          } catch {
            serverErr = (await res.text().catch(() => "")).slice(0, 200);
          }
          // The server returns 400 with "Session too short..." for
          // empty/sparse transcripts. Route those to the dedicated UI.
          if (
            res.status === 400 &&
            /too short/i.test(serverErr)
          ) {
            finish(() => onTooShort());
            return;
          }
          throw new Error(
            `Scoring failed (${res.status}): ${serverErr || "unknown error"}`,
          );
        }
        const data = (await res.json()) as ScoringResult;
        finish(() => onComplete(data));
      } catch (err) {
        finish(() => onError((err as Error).message || "Scoring failed"));
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-12 bg-coach-cream">
      <div className="flex flex-col items-center gap-8 max-w-md text-center">
        <p className="font-pulse-ext text-[9px] tracking-[0.24em] uppercase font-medium text-pulse-meta">
          Coach Pulse
        </p>
        <div className="relative w-24 h-24 flex items-center justify-center">
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: "rgba(0, 0, 1, 0.06)" }}
            animate={{ scale: [1, 1.7, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.span
            aria-hidden
            className="absolute inset-4 rounded-full"
            style={{ backgroundColor: "rgba(0, 0, 1, 0.12)" }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.85, 0.5, 0.85] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            aria-hidden
            className="absolute inset-8 rounded-full bg-coach-black"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-bembo text-[22px] leading-[1.2] text-pulse-primary">
            Analyzing your conversation
          </p>
          <p className="font-pulse-body text-[14px] leading-[1.55] text-pulse-neutral-1">
            Reviewing how you connected, explored, and guided.
          </p>
        </div>
      </div>
    </main>
  );
}
