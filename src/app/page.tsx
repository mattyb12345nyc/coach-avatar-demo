import type { Metadata } from "next";
import Link from "next/link";
import { Mic, Trophy, SlidersHorizontal, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Coach Pulse Live — SMC Game",
};

// Command center for the SMC game site. The only thing attendees ever see is
// the leaderboard; everything else is run by staff.
export default function Home() {
  return (
    <div className="min-h-screen bg-coach-cream flex flex-col">
      <header className="bg-coach-black text-coach-cream px-6 pt-14 pb-12">
        <div className="mx-auto w-full max-w-[760px]">
          <p className="font-pulse-ext text-[11px] tracking-[0.3em] uppercase font-medium text-coach-gold">
            Coach Pulse Live · SMC · The Wynn
          </p>
          <h1 className="mt-3 font-bembo text-[clamp(34px,5vw,52px)] leading-[1.04]">
            The game site.
          </h1>
          <p className="mt-4 font-pulse-body text-[14px] leading-[1.6] text-coach-cream/70 max-w-[560px]">
            Three voice role plays, six floor games, one live leaderboard. The room screen and the admin are run by staff; the leaderboard and guide are what the floor sees.
          </p>
        </div>
      </header>

      <main className="flex-1 bg-coach-cream rounded-t-3xl -mt-6 px-5 pt-10 pb-20">
        <div className="mx-auto w-full max-w-[760px] flex flex-col gap-3">
          <Card href="/room" icon={Mic} title="Role-Play Room" desc="The single room screen: pick team + language, run the 3 voice personas (best of 2), submit. Full-screen on the room laptop." staff />
          <Card href="/leaderboard" icon={Trophy} title="Live Leaderboard" desc="Team standings for the big screen — role plays + games, self-refreshing." />
          <Card href="/admin" icon={SlidersHorizontal} title="Game Points (Admin)" desc="Station leaders enter the 6 games' points per team. Passcode-gated." staff />
          <Card href="/guide" icon={BookOpen} title="How the Game Works" desc="Player-facing guide + scoring, linked from the demo-app popup." />
        </div>
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
        </p>
        <p className="mt-1 font-pulse-body text-[13px] leading-[1.5] text-pulse-neutral-1">{desc}</p>
      </div>
    </Link>
  );
}
