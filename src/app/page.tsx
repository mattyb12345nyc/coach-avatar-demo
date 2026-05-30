"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PreSession } from "@/components/PreSession";
import { ActiveSession } from "@/components/ActiveSession";
import { AnalyzingTransition } from "@/components/AnalyzingTransition";
import { ScoreCard } from "@/components/ScoreCard";
import { SessionTooShort } from "@/components/SessionTooShort";
import { WhosPlaying } from "@/components/WhosPlaying";
import { StationFrame } from "@/components/StationFrame";
import { Hub } from "@/components/Hub";
import { SCENARIOS, getScenario } from "@/config/scenarios";
import { requestMicPermission } from "@/lib/requestMicPermission";
import { useIdleReset } from "@/lib/useIdleReset";
import type {
  ActivePlayer,
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

  // Station context comes from the QR deep-link, e.g. /?station=moment.
  const stationParam = searchParams?.get("station") ?? null;
  const scenario = useMemo(
    () => getScenario(stationParam) ?? SCENARIOS[0],
    [stationParam],
  );
  // Event mode (team scoring + leaderboard) is on whenever a station is
  // addressed, or ?event=1. Without it, the app is the original solo demo.
  const eventMode =
    Boolean(stationParam) || searchParams?.get("event") === "1";
  // ?kiosk=1 renders inside the vertical iPhone-style pod frame.
  const kiosk = searchParams?.get("kiosk") === "1";
  // The bare URL is the command center. A station, ?event=1, or ?practice=1
  // takes you into the experience instead.
  const showHub =
    !stationParam &&
    searchParams?.get("event") !== "1" &&
    searchParams?.get("practice") !== "1";
  const persona = scenario.persona;

  const [screen, setScreen] = useState<Screen>(
    eventMode ? "who" : "pre-session",
  );
  const [player, setPlayer] = useState<ActivePlayer | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [endedReason, setEndedReason] = useState<string>("user_ended");
  const [scoreData, setScoreData] = useState<ScoringResult | null>(null);
  const [scoringError, setScoringError] = useState<string | null>(null);

  const handlePlayerReady = useCallback((p: ActivePlayer) => {
    setPlayer(p);
    setScreen("pre-session");
  }, []);

  const handleStart = useCallback(async () => {
    // Mic permission first so the browser popup resolves before the avatar
    // starts loading (avoids the mic-popup + avatar-talking race).
    await requestMicPermission();

    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        scenario.avatarId ? { avatar_id: scenario.avatarId } : {},
      ),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || `Session start failed (HTTP ${res.status})`);
    }
    const { session_token } = (await res.json()) as { session_token: string };
    setSessionToken(session_token);
    setScreen("active");
  }, [scenario.avatarId]);

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

  // Fire-and-forget: record the run against the team + station so it hits the
  // live leaderboard. Never blocks the participant's score reveal.
  const persistSession = useCallback(
    (result: ScoringResult, dur: number) => {
      if (!eventMode || !player) return;
      fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: player.teamId,
          participantId: player.participantId,
          stationId: scenario.id,
          scores: result.scores,
          overallScore: result.overall_score,
          durationSeconds: dur,
        }),
      }).catch(() => {
        /* leaderboard write is best-effort; score reveal still happens */
      });
    },
    [eventMode, player, scenario.id],
  );

  const handleScoringComplete = useCallback(
    (result: ScoringResult) => {
      persistSession(result, durationSeconds);
      setScoreData(result);
      setScreen("score");
    },
    [persistSession, durationSeconds],
  );

  const handleScoringError = useCallback((err: string) => {
    setScoringError(err);
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
      summary: `Something didn't connect, so we couldn't read this moment. Your practice still counts — step back in when you're ready. (${err})`,
      recommendedNextFeedback: "Take the moment again whenever you're set.",
    });
    setScreen("score");
  }, []);

  const handleTooShort = useCallback(() => {
    setScoringError(null);
    setScoreData(null);
    setScreen("too-short");
  }, []);

  const resetSession = useCallback(() => {
    setSessionToken(null);
    setTranscript([]);
    setDurationSeconds(0);
    setEndedReason("user_ended");
    setScoreData(null);
    setScoringError(null);
  }, []);

  const handleTryAgain = useCallback(() => {
    resetSession();
    // In event mode, hand the kiosk to the next manager.
    setScreen(eventMode ? "who" : "pre-session");
    if (eventMode) setPlayer(null);
  }, [eventMode, resetSession]);

  // Kiosk idle auto-reset: if a manager walks off on a static screen, send the
  // station back to "who's playing" for the next person. Skips the live avatar
  // and scoring screens. Tunable via ?idle=<seconds> (0 disables); default 60.
  const idleSeconds = (() => {
    const raw = searchParams?.get("idle");
    if (raw === null || raw === undefined) return 60;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 60;
  })();
  const resettableScreen =
    screen === "pre-session" || screen === "score" || screen === "too-short";
  const idleSecondsLeft = useIdleReset({
    active: eventMode && idleSeconds > 0 && resettableScreen,
    totalMs: idleSeconds * 1000,
    warnMs: 10000,
    onIdle: handleTryAgain,
  });

  // The command-center hub at the bare URL — short-circuits the experience.
  if (showHub) return <Hub />;

  let content: React.ReactNode;
  if (screen === "who") {
    content = <WhosPlaying scenario={scenario} onReady={handlePlayerReady} />;
  } else if (screen === "pre-session") {
    content = <PreSession persona={persona} onStart={handleStart} />;
  } else if (screen === "active" && sessionToken) {
    content = (
      <ActiveSession
        sessionToken={sessionToken}
        onSessionEnd={handleSessionEnd}
        debug={debug}
      />
    );
  } else if (screen === "analyzing") {
    content = (
      <AnalyzingTransition
        transcript={transcript}
        persona={persona}
        durationSeconds={durationSeconds}
        endedReason={endedReason}
        onComplete={handleScoringComplete}
        onError={handleScoringError}
        onTooShort={handleTooShort}
      />
    );
  } else if (screen === "too-short") {
    content = (
      <SessionTooShort
        persona={persona}
        durationSeconds={durationSeconds}
        onTryAgain={handleTryAgain}
      />
    );
  } else if (screen === "score" && scoreData) {
    content = (
      <>
        {scoringError && (
          <div className="bg-pulse-warning-tint text-pulse-neutral-dark font-pulse-body text-[12px] px-4 py-2 text-center border-b border-pulse-stroke">
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
  } else {
    content = (
      <main className="flex-1 flex items-center justify-center bg-coach-cream">
        <p className="font-pulse-body text-pulse-neutral-1">Loading…</p>
      </main>
    );
  }

  // ?kiosk=1 wraps the experience in the vertical iPhone-style pod frame.
  return (
    <>
      {kiosk ? <StationFrame>{content}</StationFrame> : content}
      {idleSecondsLeft !== null && <IdleWarning seconds={idleSecondsLeft} />}
    </>
  );
}

// Brief grace banner before the kiosk resets for the next manager. Any tap
// anywhere on screen cancels it (the idle hook listens window-wide).
function IdleWarning({ seconds }: { seconds: number }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-6 pointer-events-none">
      <div className="pointer-events-auto rounded-pulse-pill bg-coach-black text-coach-cream px-6 py-3.5 shadow-pulse-nav flex items-center gap-3">
        <span className="font-pulse-body text-[13px]">
          Resetting for the next manager in{" "}
          <span className="text-coach-gold tabular-nums">{seconds}s</span>
        </span>
        <span className="font-pulse-ext text-[10px] tracking-[0.14em] uppercase text-coach-cream/60">
          Tap to stay
        </span>
      </div>
    </div>
  );
}
