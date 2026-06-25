"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { BackToMenu } from "@/components/BackToMenu";

type Row = {
  team_id: number;
  label: string;
  color: string | null;
  number: number | null;
  total: number;
  personas_done: number;
  games_done: number;
};
type Move = "up" | "down" | "same" | null;

// Venue leaderboard, built to the Pulse "Challenges/Leaderboard-List" design
// (Figma: Demo Leaderboard). Dark rows, circular team avatar, uppercase
// Helvetica Neue Extended name, points + divider + rank + movement arrow.
// Scaled large for the big vertical screen; realtime + ~3-min poll.
export function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [configured, setConfigured] = useState(true);
  const prevRanks = useRef<Map<number, number>>(new Map());
  const [moves, setMoves] = useState<Map<number, Move>>(new Map());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      const data = await res.json();
      if (data.configured === false) setConfigured(false);
      if (!Array.isArray(data.rows)) return;
      const next: Row[] = data.rows;

      // Movement vs the previous standings (drives the up/down arrows).
      const m = new Map<number, Move>();
      next.forEach((r, i) => {
        const rank = i + 1;
        const prev = prevRanks.current.get(r.team_id);
        m.set(r.team_id, prev == null ? null : rank < prev ? "up" : rank > prev ? "down" : "same");
      });
      const pr = new Map<number, number>();
      next.forEach((r, i) => pr.set(r.team_id, i + 1));
      prevRanks.current = pr;
      setMoves(m);
      setRows(next);
    } catch {
      /* keep last good state */
    }
  }, []);

  useEffect(() => {
    load();
    const sb = getBrowserSupabase();
    if (sb) {
      const ch = sb
        .channel("leaderboard")
        .on("postgres_changes", { event: "*", schema: "public", table: "persona_scores" }, () => load())
        .on("postgres_changes", { event: "*", schema: "public", table: "game_scores" }, () => load())
        .subscribe();
      const t = setInterval(load, 180000);
      return () => { sb.removeChannel(ch); clearInterval(t); };
    }
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="min-h-screen flex flex-col relative" style={{ backgroundColor: "#09090A" }}>
      <div className="absolute top-5 left-6 z-10"><BackToMenu tone="dark" /></div>
      <header className="px-8 pt-10 pb-6 text-center">
        <p className="font-pulse-ext text-[12px] tracking-[0.34em] uppercase font-medium text-coach-cream">
          Coach Pulse Live · SMC
        </p>
        <h1 className="mt-2 font-bembo text-[clamp(36px,5vw,68px)] leading-[1.02] text-white">Leaderboard</h1>
      </header>

      <main className="flex-1 px-4 sm:px-10 pb-10">
        <div className="mx-auto w-full max-w-[1100px]">
          {!configured && (
            <p className="text-center font-pulse-body text-white/50 py-24">Leaderboard isn&apos;t connected yet.</p>
          )}
          {configured && rows.length === 0 && (
            <p className="text-center font-pulse-body text-white/50 py-24">Waiting for the first scores to land…</p>
          )}
          {rows.map((r, i) => (
            <LeaderRow key={r.team_id} row={r} rank={i + 1} move={moves.get(r.team_id) ?? null} />
          ))}
        </div>
      </main>
    </div>
  );
}

function LeaderRow({ row, rank, move }: { row: Row; rank: number; move: Move }) {
  const rr = String(rank).padStart(2, "0");
  return (
    <div className="flex items-center gap-4 sm:gap-6 py-[clamp(12px,1.6vh,22px)] border-b border-white/10">
      {/* Team avatar — circle with the team number (color-fill when set). */}
      <div
        className="shrink-0 rounded-full flex items-center justify-center font-pulse-ext font-medium text-coach-black tabular-nums"
        style={{
          width: "clamp(44px,5vw,64px)",
          height: "clamp(44px,5vw,64px)",
          fontSize: "clamp(16px,1.8vw,24px)",
          backgroundColor: row.color || "#FFFFFE",
        }}
      >
        {row.number ?? rank}
      </div>

      {/* Team name — uppercase, extended, wide tracking. */}
      <div className="flex-1 min-w-0">
        <p
          className="font-pulse-ext font-medium text-white uppercase truncate"
          style={{ fontSize: "clamp(15px,1.9vw,26px)", letterSpacing: "0.22em" }}
        >
          {row.label}
        </p>
        <p className="font-pulse-body text-white/35 mt-0.5" style={{ fontSize: "clamp(10px,0.9vw,13px)" }}>
          {row.personas_done}/3 role plays · {row.games_done}/6 games
        </p>
      </div>

      {/* Right cluster: points · divider · rank · arrow */}
      <div className="flex items-center gap-[clamp(10px,1.4vw,22px)] shrink-0">
        <span className="font-pulse-body tabular-nums" style={{ color: "#9E9E9E", fontSize: "clamp(12px,1.2vw,18px)" }}>
          {row.total.toLocaleString()}pts
        </span>
        <span className="bg-white/20" style={{ width: 1, height: "clamp(18px,2vw,30px)" }} />
        <span
          className="font-pulse-ext font-medium text-white tabular-nums text-right"
          style={{ fontSize: "clamp(22px,2.8vw,40px)", minWidth: "1.6em" }}
        >
          {rr}
        </span>
        <MoveArrow move={move} />
      </div>
    </div>
  );
}

function MoveArrow({ move }: { move: Move }) {
  // Green up / red down with a soft radial glow; neutral when unchanged.
  const up = move === "up";
  const down = move === "down";
  const color = up ? "#0FAE5E" : down ? "#FF2B1C" : "rgba(255,255,255,0.25)";
  const glow = up ? "rgba(15,174,94,0.35)" : down ? "rgba(255,43,28,0.32)" : "transparent";
  return (
    <span
      className="flex items-center justify-center rounded-full shrink-0"
      style={{
        width: "clamp(28px,3vw,40px)",
        height: "clamp(28px,3vw,40px)",
        background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
      }}
    >
      <svg viewBox="0 0 14 12" style={{ width: "clamp(10px,1.2vw,15px)", height: "auto" }}>
        {down ? (
          <path d="M7 12 L0 1 L14 1 Z" fill={color} />
        ) : (
          <path d="M7 0 L14 11 L0 11 Z" fill={color} />
        )}
      </svg>
    </span>
  );
}
