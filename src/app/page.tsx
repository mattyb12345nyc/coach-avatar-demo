"use client";

import { Suspense, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PreSession } from "@/components/PreSession";
import { ActiveSession } from "@/components/ActiveSession";
import { AnalyzingTransition } from "@/components/AnalyzingTransition";
import { ScoreCard } from "@/components/ScoreCard";
import { DEFAULT_BACKGROUND_KEY } from "@/config/backgrounds";
import { DEFAULT_PERSONA } from "@/lib/defaultPersona";
import type {
  Persona,
  ScoringResult,
  Screen,
  TranscriptLine,
} from "@/lib/types";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}

function HomeInner() {
  const searchParams = useSearchParams();
  const debug = searchParams?.get("debug") === "1";

  const [screen, setScreen] = useState<Screen>("pre-session");
  const [persona] = useState<Persona>(DEFAULT_PERSONA);
  const [selectedBackground, setSelectedBackground] = useState<string>(
    DEFAULT_BACKGROUND_KEY,
  );
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [endedReason, setEndedReason] = useState<string>("user_ended");
  const [scoreData, setScoreData] = useState<ScoringResult | null>(null);
  const [scoringError, setScoringError] = useState<string | null>(null);

  const handleStart = useCallback(async () => {
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || `Session start failed (HTTP ${res.status})`);
    }
    const { session_token } = (await res.json()) as { session_token: string };
    setSessionToken(session_token);
    setScreen("active");
  }, []);

  const handleSessionEnd = useCallback(
    ({
      transcript: t,
      durationSeconds: dur,
      endedReason: reason,
    }: {
      transcript: TranscriptLine[];
      durationSeconds: number;
      endedReason: "user_ended" | "max_duration" | "disconnected";
    }) => {
      setTranscript(t);
      setDurationSeconds(dur);
      setEndedReason(reason);
      setScreen("analyzing");
    },
    [],
  );

  const handleScoringComplete = useCallback((result: ScoringResult) => {
    setScoreData(result);
    setScreen("score");
  }, []);

  const handleScoringError = useCallback((err: string) => {
    setScoringError(err);
    // Synthesize a minimal scoring result so the UI still has something
    // to show. Real prod would surface a "scoring unavailable" view.
    setScoreData({
      scores: {
        understandingTheMoment: 0,
        exploringTogether: 0,
        guidingTheDecision: 0,
        emotionalConnection: 0,
        culturalRelevance: 0,
        productKnowledge: 0,
      },
      overall_score: 0,
      stars: 1,
      highlights: [],
      summary: `Scoring is unavailable right now. ${err}`,
      recommendedNextFeedback:
        "Try the session again once the scoring service is reachable.",
    });
    setScreen("score");
  }, []);

  const handleTryAgain = useCallback(() => {
    setScreen("pre-session");
    setSessionToken(null);
    setTranscript([]);
    setDurationSeconds(0);
    setEndedReason("user_ended");
    setScoreData(null);
    setScoringError(null);
  }, []);

  if (screen === "pre-session") {
    return (
      <PreSession
        persona={persona}
        selectedBackground={selectedBackground}
        onBackgroundChange={setSelectedBackground}
        onStart={handleStart}
      />
    );
  }

  if (screen === "active" && sessionToken) {
    return (
      <ActiveSession
        sessionToken={sessionToken}
        selectedBackground={selectedBackground}
        onBackgroundChange={setSelectedBackground}
        onSessionEnd={handleSessionEnd}
        debug={debug}
      />
    );
  }

  if (screen === "analyzing") {
    return (
      <AnalyzingTransition
        transcript={transcript}
        persona={persona}
        durationSeconds={durationSeconds}
        endedReason={endedReason}
        onComplete={handleScoringComplete}
        onError={handleScoringError}
      />
    );
  }

  if (screen === "score" && scoreData) {
    return (
      <>
        {scoringError && (
          <div className="bg-coach-mahogany/30 text-coach-cream text-[12px] px-4 py-2 text-center">
            {scoringError}
          </div>
        )}
        <ScoreCard
          result={scoreData}
          persona={persona}
          durationSeconds={durationSeconds}
          onTryAgain={handleTryAgain}
        />
      </>
    );
  }

  // Fallback (e.g. active screen without token).
  return (
    <main className="flex-1 flex items-center justify-center">
      <p className="text-coach-cream/60">Loading…</p>
    </main>
  );
}
