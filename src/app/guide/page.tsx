import type { Metadata } from "next";
import { PERSONAS, GAMES, EVENT_CONFIG, MAX_TEAM_TOTAL } from "@/config/event";
import { BackToMenu } from "@/components/BackToMenu";

export const metadata: Metadata = { title: "Coach Pulse — How the Game Works" };

// Player-facing game guide + scoring page, linked from the demo-app popup.
export default function GuidePage() {
  return (
    <div className="min-h-screen bg-coach-cream">
      <header className="bg-coach-black text-coach-cream px-6 pt-12 pb-12">
        <div className="mx-auto max-w-[680px]">
          <div className="mb-5"><BackToMenu tone="dark" /></div>
          <p className="font-pulse-ext text-[10px] tracking-[0.28em] uppercase text-coach-cream">Coach Pulse Live · SMC</p>
          <h1 className="mt-3 font-bembo text-[clamp(32px,5vw,48px)] leading-[1.05]">How the game works</h1>
          <p className="mt-3 font-pulse-body text-[14px] leading-[1.6] text-coach-cream/70 max-w-[560px]">
            Your team earns points two ways: live role plays in the role-play rooms, and the games out on the floor. Highest total wins.
          </p>
        </div>
      </header>

      <main className="px-5 py-10">
        <div className="mx-auto max-w-[680px] flex flex-col gap-10">
          <Section title="The role plays" sub={`3 personas · keep or retry · up to ${EVENT_CONFIG.personaMax} pts each`}>
            <p className="font-pulse-body text-[14px] leading-[1.6] text-pulse-neutral-dark mb-4">
              In a role-play room, one teammate steps up and has a real spoken conversation with a customer
              ({Math.round(EVENT_CONFIG.personaCapSeconds / 60)} minutes each). After each one you see your score, then <strong>keep it or try once more</strong> — if you retry, the <strong>higher of the two counts</strong>.
              You&apos;ll do all three personas this way.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PERSONAS.map((p) => (
                <div key={p.slug} className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-4 flex flex-col items-center text-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt={p.name} className="w-[56px] h-[56px] rounded-full object-cover" />
                  <p className="font-pulse-body text-[14px] font-medium text-pulse-primary">{p.name}</p>
                  <p className="font-pulse-body text-[11px] text-pulse-meta">{p.type}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="The games" sub={`6 games · up to ${EVENT_CONFIG.gameMax} pts each`}>
            <div className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke divide-y divide-pulse-stroke">
              {GAMES.map((g) => (
                <div key={g.slug} className="flex items-center justify-between px-5 py-3">
                  <span className="font-pulse-body text-[14px] text-pulse-primary">{g.name}</span>
                  <span className="font-pulse-body text-[12px] text-pulse-meta">{g.maxPoints} pts</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Scoring" sub={`${MAX_TEAM_TOTAL} points possible`}>
            <div className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-5 font-pulse-body text-[14px] text-pulse-neutral-dark leading-[1.7]">
              <div className="flex justify-between"><span>3 role plays × {EVENT_CONFIG.personaMax}</span><span className="tabular-nums">{PERSONAS.length * EVENT_CONFIG.personaMax}</span></div>
              <div className="flex justify-between"><span>6 games × {EVENT_CONFIG.gameMax}</span><span className="tabular-nums">{GAMES.length * EVENT_CONFIG.gameMax}</span></div>
              <div className="flex justify-between border-t border-pulse-stroke mt-2 pt-2 font-medium text-pulse-primary"><span>Team total</span><span className="tabular-nums">{MAX_TEAM_TOTAL}</span></div>
            </div>
            <a href="/leaderboard" className="mt-4 inline-flex items-center justify-center rounded-pulse-pill bg-coach-black text-coach-cream font-pulse-ext text-[12px] tracking-[0.12em] uppercase px-8 py-3.5">
              See the live leaderboard
            </a>
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-bembo text-[26px] text-pulse-primary leading-tight">{title}</h2>
        <p className="font-pulse-ext text-[9px] tracking-[0.2em] uppercase text-pulse-meta mt-1">{sub}</p>
      </div>
      {children}
    </section>
  );
}
