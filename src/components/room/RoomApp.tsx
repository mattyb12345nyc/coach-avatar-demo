"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { Mic } from "lucide-react";
import { PERSONAS, LANGUAGES, EVENT_CONFIG, resolveAgentId } from "@/config/event";
import { requestMicPermission } from "@/lib/requestMicPermission";
import { ScoreBreakdown } from "@/components/room/ScoreBreakdown";
import type { ScoringResult } from "@/lib/types";

type Team = { id: number; label: string };
type Phase = "start" | "ready" | "live" | "scoring" | "scored" | "done";
type Line = { role: "user" | "avatar"; text: string };

const CAP = EVENT_CONFIG.personaCapSeconds; // 4 min

export function RoomApp() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [language, setLanguage] = useState("en");

  const [phase, setPhase] = useState<Phase>("start");
  const [personaIdx, setPersonaIdx] = useState(0);
  const [sessionNo, setSessionNo] = useState<1 | 2>(1);
  const [sessionScores, setSessionScores] = useState<number[]>([]); // this persona
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<ScoringResult | null>(null);
  const [remaining, setRemaining] = useState<number>(CAP);
  const [error, setError] = useState<string | null>(null);

  const persona = PERSONAS[personaIdx];
  const transcriptRef = useRef<Line[]>([]);
  const convIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endingRef = useRef(false);

  const conversation = useConversation({
    onMessage: (m: { message?: string; source?: string; role?: string }) => {
      const text = m?.message;
      if (!text) return;
      const who = m.source ?? m.role;
      transcriptRef.current = [
        ...transcriptRef.current,
        { role: who === "user" ? "user" : "avatar", text },
      ];
    },
    onError: () => {
      /* surfaced via end + scoring fallback */
    },
  });

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => setTeams(d.teams || []));
  }, []);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  // End the live session, score it, log it.
  const finishSession = useCallback(
    async (endedReason: string) => {
      if (endingRef.current) return;
      endingRef.current = true;
      clearTimer();
      setPhase("scoring");
      try {
        if (conversation.status === "connected") {
          await conversation.endSession();
        }
      } catch {
        /* ignore */
      }

      // Local onMessage transcript is the reliable source. We also try the
      // finalized ElevenLabs transcript (works once the Coach EL account key
      // is set; falls back silently otherwise).
      let transcript: Line[] = transcriptRef.current;
      if (convIdRef.current) {
        try {
          await new Promise((r) => setTimeout(r, 1200));
          const res = await fetch("/api/elevenlabs/transcript", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId: convIdRef.current }),
          });
          const d = await res.json();
          if (Array.isArray(d.transcript) && d.transcript.length) {
            transcript = d.transcript;
          }
        } catch {
          /* use local */
        }
      }

      // Score it (same rubric as the app). Capture the FULL result for the
      // descriptive breakdown. Too-short / failure => 0 for this session.
      let percentage = 0;
      let result: ScoringResult | null = null;
      try {
        const res = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: transcript.map((l) => ({ ...l, timestamp: 0 })),
            persona: `${persona.name}${persona.age ? `, ${persona.age}` : ""}`,
            scenario: persona.scenario,
            durationSeconds: CAP - remaining,
            endedReason,
          }),
        });
        const d = await res.json();
        if (res.ok && typeof d.overall_score === "number") {
          percentage = Math.round(d.overall_score);
          result = d as ScoringResult;
        }
      } catch {
        /* percentage stays 0 */
      }
      const scores = result?.scores ?? null;
      if (!result) {
        result = {
          scores: { understandingTheMoment: 0, exploringTogether: 0, guidingTheDecision: 0, emotionalConnection: 0, culturalRelevance: 0, productKnowledge: 0 },
          overall_score: percentage,
          stars: 1,
          highlights: [],
          summary: "We couldn't fully read this one — the conversation may have been too short. Give it another go.",
          recommendedNextFeedback: "Aim for a couple of natural back-and-forth turns before the timer ends.",
        };
      }

      // Log the session (best-effort).
      if (teamId != null) {
        fetch("/api/roleplay-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamId,
            personaSlug: persona.slug,
            sessionNo,
            percentage,
            scores,
            language,
            endedReason,
          }),
        }).catch(() => {});
      }

      setSessionScores((prev) => [...prev, percentage]);
      setLastScore(percentage);
      setLastResult(result);
      setPhase("scored");
      endingRef.current = false;
    },
    [conversation, persona, remaining, sessionNo, teamId, language],
  );

  // Begin a session: mic, signed URL, connect, start the hard countdown.
  const beginSession = useCallback(async () => {
    setError(null);
    transcriptRef.current = [];
    convIdRef.current = null;
    endingRef.current = false;
    try {
      await requestMicPermission();
      // Coach persona agents are public — connect directly by agentId (the same
      // way coach-connect's Train does). No signed URL / account key needed.
      const agentId = resolveAgentId(persona, language);
      const convId = await conversation.startSession({
        agentId,
        connectionType: "websocket",
      });
      convIdRef.current = typeof convId === "string" ? convId : (convId as { conversationId?: string })?.conversationId ?? null;

      setRemaining(CAP);
      setPhase("live");
      timerRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            finishSession("max_duration");
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } catch (e) {
      setError((e as Error).message || "Could not start the session");
      setPhase("ready");
    }
  }, [conversation, persona, language, finishSession]);

  // After a scored session: advance to session 2, or submit the persona.
  const afterScored = useCallback(async () => {
    if (sessionNo === 1) {
      setSessionNo(2);
      setPhase("ready");
      return;
    }
    // session 2 done -> submit best of two, advance persona.
    const best = Math.max(...sessionScores, lastScore ?? 0);
    if (teamId != null) {
      fetch("/api/persona-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, personaSlug: persona.slug, bestPercentage: best }),
      }).catch(() => {});
    }
    const next = personaIdx + 1;
    if (next >= PERSONAS.length) {
      setPhase("done");
    } else {
      setPersonaIdx(next);
      setSessionNo(1);
      setSessionScores([]);
      setLastScore(null);
      setPhase("ready");
    }
  }, [sessionNo, sessionScores, lastScore, teamId, persona, personaIdx]);

  const resetRoom = useCallback(() => {
    clearTimer();
    setPhase("start");
    setTeamId(null);
    setLanguage("en");
    setPersonaIdx(0);
    setSessionNo(1);
    setSessionScores([]);
    setLastScore(null);
    setRemaining(CAP);
    setError(null);
  }, []);

  useEffect(() => () => clearTimer(), []);

  const bestSoFar = Math.max(...(sessionScores.length ? sessionScores : [0]));

  // The score breakdown takes over the whole screen (its own light layout).
  if (phase === "scored" && lastResult) {
    return (
      <ScoreBreakdown
        result={lastResult}
        personaName={persona.name}
        sessionNo={sessionNo}
        best={bestSoFar}
        onNext={afterScored}
      />
    );
  }

  return (
    <div className="min-h-screen bg-coach-black text-coach-cream flex flex-col">
      <TopBar phase={phase} personaIdx={personaIdx} teamId={teamId} teams={teams} />

      <div className="flex-1 flex items-center justify-center px-6 pb-10">
        {phase === "start" && (
          <StartScreen
            teams={teams}
            teamId={teamId}
            setTeamId={setTeamId}
            language={language}
            setLanguage={setLanguage}
            onStart={() => setPhase("ready")}
          />
        )}

        {phase === "ready" && (
          <ReadyScreen
            persona={persona}
            sessionNo={sessionNo}
            onBegin={beginSession}
            error={error}
          />
        )}

        {phase === "live" && (
          <LiveScreen
            persona={persona}
            sessionNo={sessionNo}
            remaining={remaining}
            speaking={conversation.isSpeaking}
            onEnd={() => finishSession("user_ended")}
          />
        )}

        {phase === "scoring" && <Analyzing persona={persona} />}

        {phase === "done" && <DoneScreen onReset={resetRoom} />}
      </div>
    </div>
  );
}

/* ---------- sub-screens ---------- */

function TopBar({
  phase,
  personaIdx,
  teamId,
  teams,
}: {
  phase: Phase;
  personaIdx: number;
  teamId: number | null;
  teams: Team[];
}) {
  const teamLabel = teams.find((t) => t.id === teamId)?.label;
  return (
    <header className="px-6 py-4 flex items-center justify-between border-b border-coach-cream/10">
      <p className="font-pulse-ext text-[10px] tracking-[0.28em] uppercase text-coach-cream">
        Coach Pulse Live · Role-Play Room
      </p>
      <div className="flex items-center gap-4 font-pulse-body text-[12px] text-coach-cream/60">
        {teamLabel && phase !== "start" && <span>{teamLabel}</span>}
        {phase !== "start" && (
          <span className="flex gap-1.5">
            {PERSONAS.map((p, i) => (
              <span
                key={p.slug}
                className={`w-2 h-2 rounded-full ${
                  i < personaIdx
                    ? "bg-pulse-success"
                    : i === personaIdx
                      ? "bg-coach-cream"
                      : "bg-coach-cream/25"
                }`}
              />
            ))}
          </span>
        )}
      </div>
    </header>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="w-full max-w-[520px] flex flex-col items-center text-center gap-6">{children}</div>;
}

function StartScreen({
  teams,
  teamId,
  setTeamId,
  language,
  setLanguage,
  onStart,
}: {
  teams: Team[];
  teamId: number | null;
  setTeamId: (n: number) => void;
  language: string;
  setLanguage: (s: string) => void;
  onStart: () => void;
}) {
  return (
    <Panel>
      <div>
        <p className="font-pulse-ext text-[10px] tracking-[0.22em] uppercase text-coach-cream">Ready when you are</p>
        <h1 className="mt-3 font-bembo text-[40px] leading-[1.05]">Pick the team. Hit start.</h1>
      </div>
      <div className="w-full max-w-[360px] flex flex-col gap-3">
        <select
          value={teamId ?? ""}
          onChange={(e) => setTeamId(Number(e.target.value))}
          className="rounded-pulse-tile bg-coach-cream text-pulse-primary px-4 py-4 font-pulse-body text-[16px] focus:outline-none"
        >
          <option value="">Select team</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="rounded-pulse-tile bg-coach-cream text-pulse-primary px-4 py-4 font-pulse-body text-[16px] focus:outline-none"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={teamId == null}
          onClick={onStart}
          className="mt-2 rounded-pulse-pill bg-coach-cream text-coach-black font-pulse-ext text-[13px] font-medium tracking-[0.12em] uppercase px-10 py-4 disabled:opacity-40"
        >
          Start
        </button>
      </div>
    </Panel>
  );
}

function ReadyScreen({
  persona,
  sessionNo,
  onBegin,
  error,
}: {
  persona: (typeof PERSONAS)[number];
  sessionNo: 1 | 2;
  onBegin: () => void;
  error: string | null;
}) {
  return (
    <Panel>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={persona.image} alt={persona.name} className="w-[120px] h-[120px] rounded-full object-cover" />
      <div>
        <p className="font-pulse-ext text-[10px] tracking-[0.22em] uppercase text-coach-cream">
          {persona.type} · Session {sessionNo} of 2
        </p>
        <h1 className="mt-2 font-bembo text-[34px] leading-[1.05]">{persona.name}{persona.age ? `, ${persona.age}` : ""}</h1>
        <p className="mt-3 font-pulse-body text-[15px] leading-[1.55] text-coach-cream/75 max-w-[460px]">{persona.scenario}</p>
      </div>
      <button
        type="button"
        onClick={onBegin}
        className="rounded-pulse-pill bg-coach-cream text-coach-black font-pulse-ext text-[13px] font-medium tracking-[0.12em] uppercase px-12 py-4 inline-flex items-center gap-2"
      >
        <Mic size={16} /> Begin session {sessionNo}
      </button>
      <p className="font-pulse-body text-[12px] text-coach-cream/45">4-minute cap · speak naturally into the mic</p>
      {error && <p className="font-pulse-body text-[13px] text-pulse-error">{error}</p>}
    </Panel>
  );
}

function LiveScreen({
  persona,
  sessionNo,
  remaining,
  speaking,
  onEnd,
}: {
  persona: (typeof PERSONAS)[number];
  sessionNo: 1 | 2;
  remaining: number;
  speaking: boolean;
  onEnd: () => void;
}) {
  const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");
  return (
    <Panel>
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={persona.image} alt={persona.name} className="w-[160px] h-[160px] rounded-full object-cover" />
        <span
          className={`absolute inset-0 rounded-full ring-4 transition-all ${
            speaking ? "ring-coach-cream animate-pulse" : "ring-coach-cream/20"
          }`}
        />
      </div>
      <div>
        <p className="font-pulse-ext text-[10px] tracking-[0.22em] uppercase text-coach-cream">
          {persona.name} · Session {sessionNo} of 2
        </p>
        <p className="mt-3 font-bembo text-[64px] leading-none tabular-nums">{mm}:{ss}</p>
        <p className="mt-2 font-pulse-body text-[13px] text-coach-cream/60 inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-pulse-error animate-pulse" /> Mic live · {speaking ? "customer speaking" : "listening"}
        </p>
      </div>
      <button
        type="button"
        onClick={onEnd}
        className="rounded-pulse-pill border border-coach-cream/40 text-coach-cream font-pulse-ext text-[12px] tracking-[0.12em] uppercase px-10 py-3.5 hover:bg-coach-cream/10"
      >
        End &amp; score now
      </button>
    </Panel>
  );
}

function Analyzing({ persona }: { persona: (typeof PERSONAS)[number] }) {
  return (
    <Panel>
      <div className="w-[90px] h-[90px] rounded-full border-4 border-coach-cream/30 border-t-coach-cream animate-spin" />
      <p className="font-bembo text-[28px]">Scoring the conversation…</p>
      <p className="font-pulse-body text-[13px] text-coach-cream/55">Reading how the moment with {persona.name.split(" ")[0]} landed.</p>
    </Panel>
  );
}


function DoneScreen({ onReset }: { onReset: () => void }) {
  return (
    <Panel>
      <p className="font-pulse-ext text-[10px] tracking-[0.22em] uppercase text-coach-cream">All three complete</p>
      <h1 className="font-bembo text-[40px] leading-[1.05]">Nicely done. Scores are on the board.</h1>
      <button
        type="button"
        onClick={onReset}
        className="rounded-pulse-pill bg-coach-cream text-coach-black font-pulse-ext text-[13px] font-medium tracking-[0.12em] uppercase px-12 py-4"
      >
        Reset for next team
      </button>
    </Panel>
  );
}
