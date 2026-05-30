"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Monitor,
  Trophy,
  Sparkles,
  Smartphone,
  SlidersHorizontal,
  Play,
  Copy,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { SCENARIOS } from "@/config/scenarios";

// Command center for the SMC activation. Landing at the bare URL lands here:
// a directory of every surface — the 6 stations, the big-screen leaderboard,
// the manager phone page, and the floor console.
export function Hub() {
  return (
    <div className="min-h-screen bg-coach-cream flex flex-col">
      <header className="bg-coach-black text-coach-cream px-6 pt-14 pb-12">
        <div className="mx-auto w-full max-w-[920px]">
          <p className="font-pulse-ext text-[11px] tracking-[0.3em] uppercase font-medium text-coach-gold">
            Coach Pulse Live · SMC
          </p>
          <h1
            className="mt-3 font-bembo text-[clamp(34px,5vw,52px)] leading-[1.04] font-normal"
            style={{ letterSpacing: "-0.01em" }}
          >
            The activation, end to end.
          </h1>
          <p className="mt-4 font-pulse-body text-[14px] leading-[1.6] text-coach-cream/70 max-w-[640px]">
            Six role-play pods, live team scoring, surprise Pulse Alerts, and a
            big-screen leaderboard — every surface of the floor, in one place.
            Open a station on its screen, put the leaderboard on the wall, and
            run the room from the console.
          </p>
        </div>
      </header>

      <main className="flex-1 bg-coach-cream rounded-t-3xl -mt-6 px-5 pt-10 pb-20">
        <div className="mx-auto w-full max-w-[920px] flex flex-col gap-10">
          <Stations />

          <Group title="The big screen">
            <NavCard
              href="/leaderboard"
              icon={Trophy}
              title="The Pulse Cup — Live Leaderboard"
              desc="Real-time team rankings for the wall. Updates the instant a score or Pulse Alert lands."
            />
            <NavCard
              href="/leaderboard?reveal=1"
              icon={Sparkles}
              title="Gala Reveal"
              desc="Dramatic bottom-to-champion reveal animation for the finale dinner."
            />
          </Group>

          <Group title="Managers & the floor">
            <NavCard
              href="/pulse"
              icon={Smartphone}
              title="Pulse Alerts — Manager Phones"
              desc="Where managers answer the surprise SMS challenges. First correct team takes the bonus."
            />
            <NavCard
              href="/admin"
              icon={SlidersHorizontal}
              title="Floor Console"
              desc="Roster, fire Pulse Alerts, watch responses, standings, settings, and the badge export for Tapestry IT."
            />
            <NavCard
              href="/?practice=1"
              icon={Play}
              title="Try a Practice Run"
              desc="Step into a single avatar conversation solo — no team, no scoring. Good for a quick demo."
            />
          </Group>
        </div>
      </main>
    </div>
  );
}

function Stations() {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(id: string) {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    navigator.clipboard?.writeText(`${origin}/?station=${id}&kiosk=1`);
    setCopied(id);
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
  }

  return (
    <Group title="The floor · 6 stations">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {SCENARIOS.map((s) => (
          <div
            key={s.id}
            className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-5 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-pulse-ext text-[9px] tracking-[0.22em] uppercase font-medium text-coach-gold">
                  Station {s.station} · {s.heroBadge}
                </p>
                <p className="mt-1.5 font-pulse-body text-[16px] font-medium text-pulse-primary">
                  {s.persona.name}
                </p>
                <p className="font-pulse-body text-[12px] text-pulse-meta">
                  {s.moment}
                </p>
              </div>
              <Link
                href={`/?station=${s.id}&kiosk=1`}
                className="shrink-0 rounded-pulse-pill bg-coach-black text-coach-cream font-pulse-ext text-[10px] tracking-[0.1em] uppercase px-4 py-2 inline-flex items-center gap-1 hover:opacity-90"
              >
                Open <ArrowUpRight size={12} />
              </Link>
            </div>
            <button
              type="button"
              onClick={() => copy(s.id)}
              className="flex items-center justify-between gap-2 rounded-pulse-tile bg-pulse-neutral-light px-3 py-2 text-left group"
            >
              <code className="font-pulse-body text-[11px] text-pulse-neutral-1 truncate">
                /?station={s.id}&amp;kiosk=1
              </code>
              {copied === s.id ? (
                <Check size={13} className="text-pulse-success shrink-0" />
              ) : (
                <Copy size={13} className="text-pulse-neutral shrink-0" />
              )}
            </button>
          </div>
        ))}
      </div>
    </Group>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-pulse-ext text-[9px] tracking-[0.22em] uppercase font-medium text-pulse-meta px-1">
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function NavCard({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-5 flex items-start gap-4 hover:border-coach-black transition-colors"
    >
      <span className="shrink-0 w-10 h-10 rounded-full bg-coach-black text-coach-cream flex items-center justify-center">
        <Icon size={18} />
      </span>
      <div className="flex-1">
        <p className="font-pulse-body text-[15px] font-medium text-pulse-primary inline-flex items-center gap-1.5">
          {title}
          <ArrowUpRight
            size={14}
            className="text-pulse-neutral group-hover:text-coach-black transition-colors"
          />
        </p>
        <p className="mt-1 font-pulse-body text-[13px] leading-[1.5] text-pulse-neutral-1">
          {desc}
        </p>
      </div>
    </Link>
  );
}
