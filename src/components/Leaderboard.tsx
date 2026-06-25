"use client";

import { useCallback, useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase";
import { MAX_TEAM_TOTAL } from "@/config/event";

type Row = {
  team_id: number;
  label: string;
  color: string | null;
  total: number;
  persona_points: number;
  game_points: number;
  personas_done: number;
  games_done: number;
};

// Big-screen live leaderboard for the SMC floor. Vertical, large, legible,
// self-refreshing (realtime + ~3-min poll fallback per the brief).
export function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [configured, setConfigured] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      const data = await res.json();
      if (data.configured === false) setConfigured(false);
      if (Array.isArray(data.rows)) setRows(data.rows);
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
      // brief: refresh about every three minutes regardless
      const t = setInterval(load, 180000);
      return () => {
        sb.removeChannel(ch);
        clearInterval(t);
      };
    }
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="min-h-screen bg-coach-black text-coach-cream flex flex-col">
      <header className="px-8 pt-12 pb-7 text-center">
        <p className="font-pulse-ext text-[12px] tracking-[0.32em] uppercase font-medium text-coach-gold">
          Coach Pulse Live · SMC
        </p>
        <h1 className="mt-3 font-bembo text-[clamp(40px,6vw,76px)] leading-[1.02]">Leaderboard</h1>
        <p className="mt-2 font-pulse-body text-[14px] text-coach-cream/50">
          Role plays + games · {MAX_TEAM_TOTAL} points possible
        </p>
      </header>

      <main className="flex-1 px-5 sm:px-8 pb-14">
        <div className="mx-auto w-full max-w-[1000px] flex flex-col gap-2.5">
          {!configured && (
            <p className="text-center font-pulse-body text-coach-cream/60 py-20">
              Leaderboard isn&apos;t connected yet.
            </p>
          )}
          {configured && rows.length === 0 && (
            <p className="text-center font-pulse-body text-coach-cream/60 py-20">
              Waiting for the first scores to land…
            </p>
          )}
          {rows.map((r, i) => (
            <Line key={r.team_id} row={r} rank={i + 1} />
          ))}
        </div>
      </main>
    </div>
  );
}

function Line({ row, rank }: { row: Row; rank: number }) {
  const leader = rank === 1;
  const podium = rank <= 3;
  return (
    <div
      className={`flex items-center gap-5 rounded-pulse-card px-6 py-4 ${
        leader
          ? "bg-coach-gold text-coach-black"
          : podium
            ? "bg-coach-cream/[0.08] border border-coach-gold/40"
            : "bg-coach-cream/[0.04] border border-coach-cream/10"
      }`}
    >
      <div className="w-12 flex justify-center shrink-0">
        {leader ? <Crown size={30} strokeWidth={1.5} /> : <span className="font-bembo text-[32px] opacity-90">{rank}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-pulse-ext text-[clamp(18px,2.3vw,26px)] font-medium truncate ${leader ? "text-coach-black" : "text-coach-cream"}`}>
          {row.label}
        </p>
        <p className={`font-pulse-body text-[12px] mt-0.5 ${leader ? "text-coach-black/60" : "text-coach-cream/45"}`}>
          {row.personas_done}/3 role plays · {row.games_done}/6 games
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`font-pulse-ext text-[clamp(26px,3.2vw,38px)] font-medium tabular-nums leading-none ${leader ? "text-coach-black" : "text-coach-cream"}`}>
          {row.total.toLocaleString()}
        </p>
        <p className={`font-pulse-body text-[10px] tracking-[0.16em] uppercase mt-1 ${leader ? "text-coach-black/55" : "text-coach-cream/40"}`}>
          points
        </p>
      </div>
    </div>
  );
}
