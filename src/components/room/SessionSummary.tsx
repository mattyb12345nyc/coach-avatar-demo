"use client";

import { Star } from "lucide-react";

export type PersonaSummary = {
  slug: string;
  name: string;
  score: number;
  stars: number;
  summary: string;
  recommendedNext: string;
};
export type SummaryData = {
  teamName: string;
  average: number;
  personas: PersonaSummary[];
  strengths: string[];
  growthAreas: string[];
};

// End-of-session team summary: the 3 persona scores, the average, and the
// aggregated feedback + insights. Shown after persona 3; "Start Next Session"
// resets the room for the next team.
export function SessionSummary({ data, onStartNext }: { data: SummaryData; onStartNext: () => void }) {
  return (
    <div className="min-h-screen w-full bg-coach-cream flex flex-col">
      <header className="bg-coach-black text-coach-cream px-6 pt-12 pb-12 text-center">
        <p className="font-pulse-ext text-[10px] tracking-[0.24em] uppercase text-coach-cream/65">Session complete</p>
        <h1 className="mt-2 font-bembo text-[clamp(30px,4.5vw,44px)] leading-[1.05]">{data.teamName}</h1>
        <div className="mt-5 flex flex-col items-center">
          <span className="font-bembo text-[80px] leading-none tabular-nums">
            {data.average}
            <span className="text-[38%] align-top">%</span>
          </span>
          <span className="mt-1 font-pulse-ext text-[9px] tracking-[0.22em] uppercase text-coach-cream/55">
            Average across 3 role plays
          </span>
        </div>
      </header>

      <main className="flex-1 bg-coach-cream rounded-t-3xl -mt-6 px-5 pt-7 pb-10 overflow-y-auto">
        <div className="mx-auto w-full max-w-[640px] flex flex-col gap-7">
          {/* Per-persona scores */}
          <section className="flex flex-col gap-2">
            <Eyebrow>Your role plays</Eyebrow>
            <div className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke divide-y divide-pulse-stroke">
              {data.personas.map((p) => (
                <div key={p.slug} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-pulse-body text-[15px] font-medium text-pulse-primary">{p.name}</p>
                    <div className="mt-1.5 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} size={11} className={i <= p.stars ? "text-coach-black" : "text-pulse-stroke"} fill={i <= p.stars ? "currentColor" : "transparent"} />
                      ))}
                    </div>
                  </div>
                  <span className="font-pulse-ext text-[24px] font-medium tabular-nums text-pulse-primary">{p.score}%</span>
                </div>
              ))}
            </div>
          </section>

          {data.strengths.length > 0 && (
            <InsightList title="What landed" items={data.strengths} />
          )}
          {data.growthAreas.length > 0 && (
            <InsightList title="Where to grow" items={data.growthAreas} />
          )}

          {/* Per-persona coach feedback */}
          <section className="flex flex-col gap-2">
            <Eyebrow>Coach feedback</Eyebrow>
            <div className="flex flex-col gap-3">
              {data.personas.map((p) => (
                <div key={p.slug} className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-5">
                  <p className="font-pulse-ext text-[9px] tracking-[0.2em] uppercase text-pulse-meta mb-2">{p.name}</p>
                  <p className="font-pulse-body text-[14px] leading-[1.6] text-pulse-neutral-dark whitespace-pre-line">{p.summary}</p>
                  {p.recommendedNext && (
                    <p className="mt-2 font-pulse-body italic text-[13px] leading-[1.5] text-pulse-neutral-1">Next: {p.recommendedNext}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={onStartNext}
            className="mt-1 w-full rounded-pulse-pill bg-coach-black text-coach-cream font-pulse-ext text-[12px] font-medium tracking-[0.12em] uppercase px-10 py-4"
          >
            Start Next Session
          </button>
        </div>
      </main>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <h2 className="font-pulse-ext text-[9px] tracking-[0.22em] uppercase font-medium text-pulse-meta px-1">{children}</h2>;
}

function InsightList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="flex flex-col gap-2">
      <Eyebrow>{title}</Eyebrow>
      <div className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-5 flex flex-col gap-3">
        {items.map((t, i) => (
          <div key={i} className="flex gap-3">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-coach-black shrink-0" />
            <p className="font-pulse-body text-[14px] leading-[1.5] text-pulse-neutral-dark">{t}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
