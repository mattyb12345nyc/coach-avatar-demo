"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Award, Crown } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase";

type Row = {
  team_id: string;
  name: string;
  region: string | null;
  total: number;
  scenario_points: number;
  hero_points: number;
  badge_bonus: number;
  pulse_bonus: number;
  badges_earned: number;
  stations_completed: number;
};

// Big-screen live leaderboard for the SMC floor. Coach black/cream, gold for
// the leaders. Auto-refreshes via Supabase realtime, with a polling fallback.
export function Leaderboard({ reveal = false }: { reveal?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [configured, setConfigured] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      const data = await res.json();
      if (data.configured === false) setConfigured(false);
      if (Array.isArray(data.rows)) setRows(data.rows);
    } catch {
      /* keep last good state on a transient error */
    }
  }, []);

  useEffect(() => {
    load();
    // Realtime: refresh whenever a session or pulse response lands.
    const sb = getBrowserSupabase();
    if (sb) {
      const channel = sb
        .channel("leaderboard")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sessions" },
          () => load(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "alert_responses" },
          () => load(),
        )
        .subscribe();
      return () => {
        sb.removeChannel(channel);
      };
    }
    // Fallback: poll every 8s if realtime isn't wired.
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="min-h-screen bg-coach-black text-coach-cream flex flex-col">
      <header className="px-10 pt-12 pb-8 text-center">
        <p className="font-pulse-ext text-[12px] tracking-[0.32em] uppercase font-medium text-coach-gold">
          Coach Pulse Live · SMC
        </p>
        <h1
          className="mt-3 font-bembo text-[clamp(40px,6vw,76px)] leading-[1.02] font-normal"
          style={{ letterSpacing: "-0.01em" }}
        >
          The Pulse Cup
        </h1>
        <p className="mt-3 font-pulse-body text-[15px] text-coach-cream/55">
          {reveal
            ? "The teams that brought the craft"
            : "Where the craft is landing — live on the floor"}
        </p>
      </header>

      <main className="flex-1 px-6 sm:px-10 pb-16">
        <div className="mx-auto w-full max-w-[1100px] flex flex-col gap-3">
          {!configured && (
            <p className="text-center font-pulse-body text-[15px] text-coach-cream/60 py-20">
              Leaderboard isn&apos;t connected yet. Set the Supabase env vars
              to go live.
            </p>
          )}
          {configured && rows.length === 0 && (
            <p className="text-center font-pulse-body text-[15px] text-coach-cream/60 py-20">
              Waiting for the first scores to land…
            </p>
          )}
          {rows.map((r, i) =>
            reveal ? (
              // Gala reveal: rows rise bottom-rank → champion last, for suspense.
              <motion.div
                key={r.team_id}
                initial={{ opacity: 0, y: 28, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: (rows.length - 1 - i) * 0.3,
                  duration: 0.55,
                  ease: "easeOut",
                }}
              >
                <LeaderRow row={r} rank={i + 1} />
              </motion.div>
            ) : (
              <LeaderRow key={r.team_id} row={r} rank={i + 1} />
            ),
          )}
        </div>
      </main>
    </div>
  );
}

function LeaderRow({ row, rank }: { row: Row; rank: number }) {
  const isLeader = rank === 1;
  const isPodium = rank <= 3;
  return (
    <div
      className={`flex items-center gap-5 rounded-pulse-card px-6 py-5 transition-all ${
        isLeader
          ? "bg-coach-gold text-coach-black"
          : isPodium
            ? "bg-coach-cream/[0.08] border border-coach-gold/40"
            : "bg-coach-cream/[0.04] border border-coach-cream/10"
      }`}
    >
      <div className="w-12 flex items-center justify-center shrink-0">
        {isLeader ? (
          <Crown size={32} strokeWidth={1.5} />
        ) : (
          <span className="font-bembo text-[34px] leading-none opacity-90">
            {rank}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`font-pulse-ext text-[clamp(18px,2.4vw,28px)] font-medium leading-tight truncate ${
            isLeader ? "text-coach-black" : "text-coach-cream"
          }`}
        >
          {row.name}
        </p>
        <p
          className={`font-pulse-body text-[12px] mt-0.5 ${
            isLeader ? "text-coach-black/60" : "text-coach-cream/45"
          }`}
        >
          {row.region || "—"} · {row.stations_completed}/6 pods
          {row.badges_earned > 0 && (
            <span className="inline-flex items-center gap-1 ml-2">
              <Award size={12} />
              {row.badges_earned}
            </span>
          )}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p
          className={`font-pulse-ext text-[clamp(26px,3.4vw,40px)] font-medium tabular-nums leading-none ${
            isLeader ? "text-coach-black" : "text-coach-cream"
          }`}
        >
          {row.total.toLocaleString()}
        </p>
        <p
          className={`font-pulse-body text-[10px] tracking-[0.18em] uppercase mt-1 ${
            isLeader ? "text-coach-black/55" : "text-coach-cream/40"
          }`}
        >
          points
        </p>
      </div>
    </div>
  );
}
