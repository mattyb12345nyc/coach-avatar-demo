"use client";

import { useCallback, useEffect, useState } from "react";
import { GAMES } from "@/config/event";

const PASS_KEY = "coachpulse.admin";
type Team = { id: number; label: string };
type Status = { passcodeRequired: boolean };

// Admin: station leaders enter the six games' points per team (0–15 each).
export default function AdminPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [passcode, setPasscode] = useState("");
  const [authed, setAuthed] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [points, setPoints] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/status")
      .then((r) => r.json())
      .then((s: Status) => {
        setStatus(s);
        const stored = window.localStorage.getItem(PASS_KEY) || "";
        setPasscode(stored);
        setAuthed(!s.passcodeRequired || Boolean(stored));
      });
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => setTeams(d.teams || []));
  }, []);

  const loadTeam = useCallback(async (id: number) => {
    setSaved({});
    const d = await (await fetch(`/api/game-score?teamId=${id}`)).json();
    const next: Record<string, string> = {};
    for (const s of d.scores || []) next[s.game_slug] = String(s.points);
    setPoints(next);
  }, []);

  function pickTeam(id: number) {
    setTeamId(id);
    loadTeam(id);
  }

  function savePasscode() {
    window.localStorage.setItem(PASS_KEY, passcode);
    setAuthed(true);
  }

  async function save(slug: string) {
    if (teamId == null) return;
    const val = Number(points[slug]);
    if (Number.isNaN(val)) return;
    setNote(null);
    const res = await fetch("/api/game-score", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-passcode": passcode },
      body: JSON.stringify({ teamId, gameSlug: slug, points: val }),
    });
    const d = await res.json();
    if (res.ok) {
      setSaved((s) => ({ ...s, [slug]: true }));
      setPoints((p) => ({ ...p, [slug]: String(d.points) }));
      setTimeout(() => setSaved((s) => ({ ...s, [slug]: false })), 1500);
    } else {
      setNote(d.error || "Save failed");
    }
  }

  if (!status) {
    return <Shell><p className="font-pulse-body text-pulse-neutral-1">Loading…</p></Shell>;
  }

  if (!authed) {
    return (
      <Shell>
        <div className="mx-auto max-w-[340px] flex flex-col gap-3 pt-16">
          <h2 className="font-pulse-ext text-[11px] tracking-[0.22em] uppercase text-pulse-meta">Game points · admin</h2>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Passcode"
            className="rounded-pulse-tile bg-pulse-paper border border-pulse-stroke px-4 py-3 font-pulse-body text-[14px] focus:outline-none focus:border-coach-black"
            onKeyDown={(e) => e.key === "Enter" && savePasscode()}
          />
          <button onClick={savePasscode} className="rounded-pulse-pill bg-coach-black text-coach-cream font-pulse-ext text-[12px] tracking-[0.12em] uppercase px-8 py-3.5">
            Enter
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-[560px] flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="font-pulse-ext text-[9px] tracking-[0.22em] uppercase font-medium text-pulse-meta px-1">Team</span>
          <select
            value={teamId ?? ""}
            onChange={(e) => pickTeam(Number(e.target.value))}
            className="rounded-pulse-tile bg-pulse-paper border border-pulse-stroke px-4 py-3 font-pulse-body text-[15px] focus:outline-none focus:border-coach-black"
          >
            <option value="">Select team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        {note && <p className="font-pulse-body text-[13px] text-pulse-error">{note}</p>}

        {teamId != null && (
          <div className="flex flex-col gap-2">
            <span className="font-pulse-ext text-[9px] tracking-[0.22em] uppercase font-medium text-pulse-meta px-1">Games · 0–15 each</span>
            <div className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke divide-y divide-pulse-stroke">
              {GAMES.map((g) => (
                <div key={g.slug} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1">
                    <p className="font-pulse-body text-[14px] text-pulse-primary">{g.name}</p>
                    {g.note && <p className="font-pulse-body text-[11px] text-pulse-meta">{g.note}</p>}
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={g.maxPoints}
                    value={points[g.slug] ?? ""}
                    onChange={(e) => setPoints((p) => ({ ...p, [g.slug]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && save(g.slug)}
                    placeholder="0"
                    className="w-20 rounded-pulse-tile bg-pulse-neutral-light border border-pulse-stroke px-3 py-2 font-pulse-body text-[15px] text-center focus:outline-none focus:border-coach-black"
                  />
                  <button
                    onClick={() => save(g.slug)}
                    className={`rounded-pulse-pill font-pulse-ext text-[10px] tracking-[0.1em] uppercase px-4 py-2.5 ${
                      saved[g.slug] ? "bg-pulse-success text-coach-cream" : "bg-coach-black text-coach-cream"
                    }`}
                  >
                    {saved[g.slug] ? "Saved" : "Save"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-coach-cream">
      <header className="bg-coach-black text-coach-cream px-6 py-5">
        <p className="font-pulse-ext text-[10px] tracking-[0.28em] uppercase text-coach-cream">Coach Pulse Live · SMC</p>
        <h1 className="font-pulse-ext text-[18px] font-medium mt-1">Game Points</h1>
      </header>
      <main className="px-5 py-8">{children}</main>
    </div>
  );
}
