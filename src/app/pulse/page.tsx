"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";

type Team = { id: string; name: string };
type Alert = { id: string; prompt: string; bonus_points: number };

const TEAM_KEY = "coachpulse.lastTeamId";

// Phone surface managers land on from the Pulse Alert SMS. Pick your team
// once, then race to answer whatever alert is live.
export default function PulsePage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string>("");
  const [alert, setAlert] = useState<Alert | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/roster")
      .then((r) => r.json())
      .then((d) => {
        setTeams((d.teams || []).map((t: Team) => ({ id: t.id, name: t.name })));
        const last = window.localStorage.getItem(TEAM_KEY);
        if (last) setTeamId(last);
      });
  }, []);

  const loadActive = useCallback(async () => {
    const r = await fetch("/api/alerts/active", { cache: "no-store" });
    const d = await r.json();
    setAlert((prev) => {
      // Reset the answer box when a new alert goes live.
      if (d.alert?.id && d.alert.id !== prev?.id) {
        setAnswer("");
        setResult(null);
      }
      return d.alert ?? null;
    });
  }, []);

  useEffect(() => {
    loadActive();
    pollRef.current = setInterval(loadActive, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadActive]);

  function pickTeam(id: string) {
    setTeamId(id);
    window.localStorage.setItem(TEAM_KEY, id);
  }

  async function submit() {
    if (!alert || !teamId || !answer.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch("/api/alerts/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: alert.id, teamId, answer }),
      });
      const d = await r.json();
      if (!r.ok) {
        setResult(d.error || "Couldn't record that.");
      } else if (d.first) {
        setResult(`First in — +${d.awarded} points for your team. 🔥`);
      } else if (d.correct) {
        setResult("Correct — but another team beat you to it.");
      } else if (d.pending) {
        setResult("Locked in. The floor team will review this one.");
      } else {
        setResult("Locked in — not the one this time.");
      }
    } finally {
      setBusy(false);
    }
  }

  const teamName = teams.find((t) => t.id === teamId)?.name;

  return (
    <div className="min-h-screen bg-coach-cream flex flex-col">
      <header className="bg-coach-black text-coach-cream px-6 pt-12 pb-10">
        <p className="font-pulse-ext text-[10px] tracking-[0.22em] uppercase font-medium text-coach-gold inline-flex items-center gap-1.5">
          <Zap size={12} /> Pulse Alert
        </p>
        <h1
          className="mt-3 font-bembo text-[30px] leading-[1.05] font-normal"
          style={{ letterSpacing: "-0.01em" }}
        >
          Read culture. Answer fast.
        </h1>
        {teamName && (
          <p className="mt-2 font-pulse-body text-[13px] text-coach-cream/70">
            Playing for <span className="text-coach-gold">{teamName}</span>
          </p>
        )}
      </header>

      <main className="flex-1 bg-coach-cream rounded-t-3xl -mt-6 px-5 pt-8 pb-16">
        <div className="mx-auto w-full max-w-[440px] flex flex-col gap-5">
          {!teamId && (
            <div className="flex flex-col gap-2">
              <span className="font-pulse-ext text-[9px] tracking-[0.22em] uppercase font-medium text-pulse-meta px-1">
                Your team
              </span>
              <select
                value={teamId}
                onChange={(e) => pickTeam(e.target.value)}
                className="rounded-pulse-tile bg-pulse-paper border border-pulse-stroke px-4 py-3 font-pulse-body text-[14px] text-pulse-primary focus:outline-none focus:border-coach-black"
              >
                <option value="">Select team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {teamId && !alert && (
            <div className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-8 text-center">
              <p className="font-pulse-body text-[15px] text-pulse-neutral-1">
                No alert live right now. Keep this open — the next one drops any
                moment.
              </p>
            </div>
          )}

          {teamId && alert && (
            <div className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-6 flex flex-col gap-5">
              <div>
                <p className="font-pulse-ext text-[9px] tracking-[0.22em] uppercase font-medium text-coach-gold">
                  Live · +{alert.bonus_points} for first
                </p>
                <p className="mt-2 font-pulse-body text-[18px] leading-[1.4] text-pulse-primary">
                  {alert.prompt}
                </p>
              </div>
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Your team's answer"
                className="w-full rounded-pulse-tile bg-pulse-neutral-light border border-pulse-stroke px-4 py-3 font-pulse-body text-[15px] text-pulse-primary placeholder:text-pulse-neutral focus:outline-none focus:border-coach-black"
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
              <button
                type="button"
                onClick={submit}
                disabled={busy || !answer.trim()}
                className="w-full inline-flex items-center justify-center rounded-pulse-pill bg-coach-black text-coach-cream font-pulse-ext text-[12px] font-medium tracking-[0.12em] uppercase px-10 py-4 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? "Sending…" : "Lock it in"}
              </button>
              {result && (
                <p className="font-pulse-body text-[14px] text-center text-pulse-primary">
                  {result}
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
