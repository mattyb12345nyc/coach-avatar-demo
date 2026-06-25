"use client";

import { BookOpen, Compass, Eye, Heart, Star, Users } from "lucide-react";
import { ENGAGEMENT_ZONES, FOUNDATIONAL_SKILLS, type ScoreCategory } from "@/lib/scoreCategories";
import type { ScoringResult } from "@/lib/types";

// The full descriptive score breakdown teams get after a role play — mirrors
// coach-connect's ScoreCard (overall score + stars, 6-category rubric, coach
// feedback, key moments, recommended next), in the room's flow.
export function ScoreBreakdown({
  result,
  personaName,
  sessionNo,
  best,
  onNext,
}: {
  result: ScoringResult;
  personaName: string;
  sessionNo: 1 | 2;
  best: number;
  onNext: () => void;
}) {
  const overall = Math.round(result.overall_score);
  const stars = Math.max(1, Math.min(5, result.stars || 1));
  const isFinal = sessionNo === 2;

  const highlights = (result.highlights || []) as Array<{ type?: string; text?: string }> | string[];
  const strengths: string[] = [];
  const improvements: string[] = [];
  for (const h of highlights) {
    if (typeof h === "string") strengths.push(h);
    else if (h && typeof h.text === "string") {
      if (h.type === "improvement") improvements.push(h.text);
      else strengths.push(h.text);
    }
  }

  return (
    <div className="min-h-screen w-full bg-coach-cream flex flex-col">
      {/* Hero — score + stars */}
      <header className="bg-coach-black text-coach-cream px-6 pt-10 pb-12 text-center">
        <p className="font-pulse-ext text-[10px] tracking-[0.22em] uppercase text-coach-cream/70">
          {personaName} · Session {sessionNo} of 2
        </p>
        <div className="mt-3 flex items-end justify-center gap-8">
          <div className="flex flex-col items-center">
            <span className="font-bembo text-[72px] leading-none tabular-nums">
              {overall}
              <span className="text-[40%] align-top">%</span>
            </span>
            <div className="mt-2 flex gap-1" aria-label={`${stars} of 5`}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={14} className={i <= stars ? "text-coach-cream" : "text-coach-cream/25"} fill={i <= stars ? "currentColor" : "transparent"} />
              ))}
            </div>
            <span className="mt-1 font-pulse-ext text-[9px] tracking-[0.2em] uppercase text-coach-cream/50">Session {sessionNo}</span>
          </div>
          {isFinal && (
            <div className="flex flex-col items-center">
              <span className="font-bembo text-[72px] leading-none tabular-nums text-pulse-success">
                {best}
                <span className="text-[40%] align-top">%</span>
              </span>
              <span className="mt-[34px] font-pulse-ext text-[9px] tracking-[0.2em] uppercase text-coach-cream/50">Best of two</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 bg-coach-cream rounded-t-3xl -mt-6 px-5 pt-7 pb-10 overflow-y-auto">
        <div className="mx-auto w-full max-w-[620px] flex flex-col gap-7">
          <CategorySection title="Engagement Zones" categories={ENGAGEMENT_ZONES} scores={result.scores} iconFor={zoneIcon} />
          <CategorySection title="Foundational Skills" categories={FOUNDATIONAL_SKILLS} scores={result.scores} iconFor={skillIcon} />

          {result.summary && (
            <section className="flex flex-col gap-2">
              <Eyebrow>Coach feedback</Eyebrow>
              <div className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-5">
                <p className="font-pulse-body text-[14px] leading-[1.6] text-pulse-neutral-dark whitespace-pre-line">{result.summary}</p>
              </div>
            </section>
          )}

          {(strengths.length > 0 || improvements.length > 0) && (
            <section className="flex flex-col gap-2">
              <Eyebrow>Key moments</Eyebrow>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {strengths.map((t, i) => <Highlight key={`s${i}`} kind="strength" text={t} />)}
                {improvements.map((t, i) => <Highlight key={`i${i}`} kind="improvement" text={t} />)}
              </div>
            </section>
          )}

          {result.recommendedNextFeedback && (
            <section className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-5 flex flex-col gap-2">
              <Eyebrow>Recommended next</Eyebrow>
              <p className="font-pulse-body italic text-[15px] leading-[1.55] text-pulse-primary">{result.recommendedNextFeedback}</p>
            </section>
          )}

          <button
            type="button"
            onClick={onNext}
            className="mt-1 w-full rounded-pulse-pill bg-coach-black text-coach-cream font-pulse-ext text-[12px] font-medium tracking-[0.12em] uppercase px-10 py-4"
          >
            {isFinal ? "Submit & continue" : "Begin session 2"}
          </button>
        </div>
      </main>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <h2 className="font-pulse-ext text-[9px] tracking-[0.22em] uppercase font-medium text-pulse-meta px-1">{children}</h2>;
}

function zoneIcon(key: string) {
  if (key === "exploringTogether") return Users;
  if (key === "guidingTheDecision") return Compass;
  return Eye;
}
function skillIcon(key: string) {
  if (key === "emotionalConnection") return Heart;
  if (key === "culturalRelevance") return Star;
  return BookOpen;
}

function CategorySection({
  title,
  categories,
  scores,
  iconFor,
}: {
  title: string;
  categories: ScoreCategory[];
  scores: ScoringResult["scores"];
  iconFor: (k: string) => React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <section className="flex flex-col gap-2">
      <Eyebrow>{title}</Eyebrow>
      <div className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-5 flex flex-col gap-4">
        {categories.map((c) => {
          const raw = (scores as Record<string, number>)[c.key];
          const has = typeof raw === "number";
          const pct = has ? Math.round((raw / c.max) * 100) : 0;
          const Icon = iconFor(c.key);
          return (
            <div key={c.key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="font-pulse-body text-[14px] text-pulse-primary inline-flex items-center gap-2">
                  <Icon size={15} /> {c.label}
                </span>
                <span className="font-pulse-body text-[13px] tabular-nums text-pulse-primary">{has ? `${raw}/${c.max}` : "—"}</span>
              </div>
              <div className="w-full h-1 rounded-full bg-pulse-stroke overflow-hidden">
                <div className="h-full rounded-full bg-coach-black transition-all" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Highlight({ kind, text }: { kind: "strength" | "improvement"; text: string }) {
  const isStrength = kind === "strength";
  return (
    <div className={`rounded-pulse-card bg-pulse-paper border border-pulse-stroke border-l-4 p-4 ${isStrength ? "border-l-coach-black" : "border-l-pulse-neutral"}`}>
      <p className="font-pulse-ext text-[9px] tracking-[0.22em] uppercase font-medium mb-1.5 text-pulse-meta">
        {isStrength ? "Strength" : "Where to lean in"}
      </p>
      <p className="font-pulse-body text-[14px] leading-[1.5] text-pulse-neutral-dark">{text}</p>
    </div>
  );
}
