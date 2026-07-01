"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mic, Trophy, SlidersHorizontal, BookOpen, Lock, ArrowUpRight } from "lucide-react";

// Password gate for the staff entry page. The page is a directory of every
// surface in the SMC game site. The individual pages (leaderboard, guide) are
// front-facing; this hub is the staff jump-off, so it sits behind a password.
const ENTRY_PASSWORD = "smc2026!!!";
const KEY = "coachpulse.entry";

export function EntryPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(KEY) === "1") setAuthed(true);
  }, []);

  function submit() {
    if (pw === ENTRY_PASSWORD) {
      window.localStorage.setItem(KEY, "1");
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-coach-black text-coach-cream flex items-center justify-center px-6">
        <div className="w-full max-w-[360px] flex flex-col gap-5 text-center">
          <span className="mx-auto w-12 h-12 rounded-full border border-coach-cream/25 flex items-center justify-center">
            <Lock size={18} className="text-coach-cream" />
          </span>
          <div>
            <p className="font-pulse-ext text-[10px] tracking-[0.3em] uppercase text-coach-cream">Coach Pulse Live · SMC</p>
            <h1 className="mt-2 font-bembo text-[30px] leading-tight">Enter the password</h1>
          </div>
          <input
            type="password"
            value={pw}
            autoFocus
            onChange={(e) => { setPw(e.target.value); setError(false); }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Password"
            className="rounded-pulse-tile bg-coach-cream text-pulse-primary px-4 py-3.5 font-pulse-body text-[15px] text-center focus:outline-none"
          />
          <button
            onClick={submit}
            className="rounded-pulse-pill bg-coach-cream text-coach-black font-pulse-ext text-[12px] font-medium tracking-[0.12em] uppercase px-10 py-3.5"
          >
            Enter
          </button>
          {error && <p className="font-pulse-body text-[13px] text-pulse-error">That&apos;s not the password.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-coach-cream flex flex-col">
      <header className="bg-coach-black text-coach-cream px-6 pt-14 pb-12">
        <div className="mx-auto w-full max-w-[760px]">
          <p className="font-pulse-ext text-[11px] tracking-[0.3em] uppercase font-medium text-coach-cream">
            Coach Pulse Live · SMC · The Wynn
          </p>
          <h1 className="mt-3 font-bembo text-[clamp(34px,5vw,52px)] leading-[1.04]">The game site.</h1>
          <p className="mt-4 font-pulse-body text-[14px] leading-[1.6] text-coach-cream/70 max-w-[560px]">
            Every page we&apos;ve built for the activation. The room and admin are run by staff; the leaderboard and guide are what the floor sees.
          </p>
        </div>
      </header>

      <main className="flex-1 bg-coach-cream rounded-t-3xl -mt-6 px-5 pt-10 pb-20">
        <div className="mx-auto w-full max-w-[760px] flex flex-col gap-3">
          <Card
            href="/room"
            icon={Mic}
            title="Role-Play Room"
            staff
            desc="The single room screen. Pick team + language, run the 3 voice personas (2 sessions each, 4-min cap, best of 2), submit, reset. Full-screen on the room laptop, mouse-driven."
          />
          <Card
            href="/leaderboard"
            icon={Trophy}
            title="Live Leaderboard"
            desc="Team standings for the big screen — role plays + games, 390 points possible. Self-refreshing with live rank-movement arrows."
          />
          <Card
            href="/admin"
            icon={SlidersHorizontal}
            title="Game Points (Admin)"
            staff
            desc="Station leaders enter the 6 floor games' points per team (0–15 each). Its own passcode. Feeds the leaderboard live."
          />
          <Card
            href="/guide"
            icon={BookOpen}
            title="How the Game Works"
            desc="Player-facing guide + scoring breakdown. This is what the demo-app popup links to."
          />
        </div>

        <p className="mx-auto w-full max-w-[760px] mt-8 font-pulse-body text-[12px] text-pulse-neutral-1 px-1">
          Tip: open each on the device it belongs to — the room URL on the room laptop, the leaderboard on the venue screen.
        </p>
      </main>
    </div>
  );
}

function Card({
  href,
  icon: Icon,
  title,
  desc,
  staff,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  desc: string;
  staff?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-5 flex items-start gap-4 hover:border-coach-black transition-colors"
    >
      <span className="shrink-0 w-11 h-11 rounded-full bg-coach-black text-coach-cream flex items-center justify-center">
        <Icon size={19} />
      </span>
      <div className="flex-1">
        <p className="font-pulse-body text-[16px] font-medium text-pulse-primary flex items-center gap-2">
          {title}
          {staff && (
            <span className="font-pulse-ext text-[8px] tracking-[0.16em] uppercase text-pulse-meta border border-pulse-stroke rounded-pulse-pill px-2 py-0.5">
              Staff
            </span>
          )}
          <ArrowUpRight size={14} className="text-pulse-neutral group-hover:text-coach-black transition-colors" />
        </p>
        <p className="mt-1 font-pulse-body text-[13px] leading-[1.5] text-pulse-neutral-1">{desc}</p>
      </div>
    </Link>
  );
}
