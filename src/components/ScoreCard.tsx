"use client";

import {
  BookOpen,
  Compass,
  Eye,
  Heart,
  Star,
  Users,
} from "lucide-react";
import {
  ENGAGEMENT_ZONES,
  FOUNDATIONAL_SKILLS,
  type ScoreCategory,
} from "@/lib/scoreCategories";
import type { Persona, ScoringResult } from "@/lib/types";

type ScoreCardProps = {
  result: ScoringResult;
  persona: Persona;
  durationSeconds: number;
  onTryAgain: () => void;
};

const ZONE_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  understandingTheMoment: Eye,
  exploringTogether: Users,
  guidingTheDecision: Compass,
};

function skillIcon(key: string) {
  if (key === "emotionalConnection") return Heart;
  if (key === "culturalRelevance") return Star;
  return BookOpen;
}

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function ScoreCard({
  result,
  persona,
  durationSeconds,
  onTryAgain,
}: ScoreCardProps) {
  const overall = Math.round(result.overall_score);
  const stars = Math.max(1, Math.min(5, result.stars || 1));

  // Normalize highlights — accept either tagged objects or plain strings.
  const highlights = (result.highlights || []) as
    | Array<{ type?: string; text?: string }>
    | string[];
  const strengths: string[] = [];
  const improvements: string[] = [];
  for (const h of highlights) {
    if (typeof h === "string") {
      strengths.push(h);
    } else if (h && typeof h.text === "string") {
      if (h.type === "improvement") improvements.push(h.text);
      else strengths.push(h.text);
    }
  }

  return (
    <main className="flex-1 bg-coach-black overflow-y-auto">
      <div className="mx-auto w-full max-w-[720px] px-6 py-12 flex flex-col gap-8">
        <header className="text-center flex flex-col gap-2">
          <p className="text-coach-gold text-[12px] tracking-[0.3em] uppercase font-medium">
            Session complete
          </p>
          <h1 className="text-coach-cream text-[28px] font-medium leading-[1.2]">
            Here's how the conversation landed
          </h1>
          <p className="text-coach-cream/60 text-[13px] uppercase tracking-wider">
            {new Date().toLocaleDateString(undefined, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </header>

        <section className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-coach-gold/15 border border-coach-gold/50 flex items-center justify-center text-coach-gold text-[18px] font-medium">
            {persona.name.charAt(0)}
          </div>
          <p className="text-coach-cream text-[18px] font-medium">
            {persona.name}
            {persona.age ? `, ${persona.age}` : ""}
          </p>

          <div className="grid grid-cols-2 gap-3 w-full">
            <ScoreRing
              label="Session Score"
              value={`${overall}%`}
              pct={overall}
              stars={stars}
            />
            <ScoreRing
              label="Time Elapsed"
              value={formatElapsed(durationSeconds)}
              pct={null}
            />
          </div>
        </section>

        <CategorySection
          title="Engagement Zones"
          categories={ENGAGEMENT_ZONES}
          scores={result.scores}
          iconFor={(c) => ZONE_ICON[c.key] ?? Eye}
        />

        <CategorySection
          title="Foundational Skills"
          categories={FOUNDATIONAL_SKILLS}
          scores={result.scores}
          iconFor={(c) => skillIcon(c.key)}
        />

        {result.summary && (
          <section className="flex flex-col gap-2">
            <h2 className="text-coach-cream/60 text-[11px] tracking-[0.25em] uppercase">
              Coach feedback
            </h2>
            <div className="rounded-2xl border border-coach-cream/10 bg-coach-cream/[0.04] p-5">
              <p className="text-coach-cream/90 text-[15px] leading-[1.6] whitespace-pre-line">
                {result.summary}
              </p>
            </div>
          </section>
        )}

        {(strengths.length > 0 || improvements.length > 0) && (
          <section className="flex flex-col gap-2">
            <h2 className="text-coach-cream/60 text-[11px] tracking-[0.25em] uppercase">
              Key moments
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {strengths.map((text, i) => (
                <HighlightCard key={`s-${i}`} kind="strength" text={text} />
              ))}
              {improvements.map((text, i) => (
                <HighlightCard
                  key={`i-${i}`}
                  kind="improvement"
                  text={text}
                />
              ))}
            </div>
          </section>
        )}

        {result.recommendedNextFeedback && (
          <section className="rounded-2xl border border-coach-gold/30 bg-coach-gold/[0.06] p-5">
            <p className="text-coach-gold text-[11px] tracking-[0.25em] uppercase mb-2">
              Recommended next
            </p>
            <p className="italic text-coach-cream/90 text-[15px] leading-[1.55]">
              {result.recommendedNextFeedback}
            </p>
          </section>
        )}

        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={onTryAgain}
            className="inline-flex items-center justify-center rounded-full bg-coach-gold px-10 py-3.5 text-coach-black text-[14px] font-medium tracking-[0.08em] uppercase hover:translate-y-[-1px] transition"
          >
            Try another session
          </button>
        </div>
      </div>
    </main>
  );
}

function ScoreRing({
  label,
  value,
  pct,
  stars,
}: {
  label: string;
  value: string;
  pct: number | null;
  stars?: number;
}) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const hasProgress = typeof pct === "number";
  const offset = hasProgress
    ? circumference * (1 - Math.max(0, Math.min(100, pct!)) / 100)
    : circumference;

  return (
    <div className="rounded-2xl border border-coach-cream/10 bg-coach-cream/[0.04] p-4 flex flex-col items-center justify-center gap-3">
      <div className="relative w-[88px] h-[88px]">
        <svg className="w-[88px] h-[88px] -rotate-90" aria-hidden>
          <circle
            cx="44"
            cy="44"
            r={radius}
            stroke="rgba(245, 240, 235, 0.12)"
            strokeWidth="4"
            fill="none"
          />
          {hasProgress && (
            <circle
              cx="44"
              cy="44"
              r={radius}
              stroke="#C9A227"
              strokeWidth="4"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-coach-cream font-medium text-[16px]">
            {value}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-coach-cream/70 text-[12px] font-medium">{label}</p>
        {typeof stars === "number" && (
          <div className="flex gap-0.5" aria-label={`${stars} of 5 stars`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={12}
                className={i <= stars ? "text-coach-gold" : "text-coach-cream/20"}
                fill={i <= stars ? "#C9A227" : "transparent"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
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
  iconFor: (c: ScoreCategory) => React.ComponentType<{ size?: number }>;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-coach-cream/60 text-[11px] tracking-[0.25em] uppercase">
        {title}
      </h2>
      <div className="rounded-2xl border border-coach-cream/10 bg-coach-cream/[0.04] p-5 flex flex-col gap-4">
        {categories.map((c) => {
          const raw = (scores as Record<string, number>)[c.key];
          const hasValue = typeof raw === "number";
          const pct = hasValue ? Math.round((raw / c.max) * 100) : 0;
          const Icon = iconFor(c);
          return (
            <ScoreBar
              key={c.key}
              label={c.label}
              pct={pct}
              valueLabel={hasValue ? `${raw}/${c.max}` : "—"}
              Icon={Icon}
            />
          );
        })}
      </div>
    </section>
  );
}

function ScoreBar({
  label,
  pct,
  valueLabel,
  Icon,
}: {
  label: string;
  pct: number;
  valueLabel: string;
  Icon: React.ComponentType<{ size?: number }>;
}) {
  // High (75+) coach-gold, mid (50-74) cream/60, low (<50) mahogany.
  const barColor =
    pct >= 75
      ? "bg-coach-gold"
      : pct >= 50
        ? "bg-coach-cream/60"
        : "bg-coach-mahogany";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-coach-cream text-[14px] inline-flex items-center gap-2">
          <Icon size={15} />
          {label}
        </span>
        <span className="text-coach-cream/80 text-[13px] tabular-nums">
          {valueLabel}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-coach-cream/10 overflow-hidden">
        <div
          className={`${barColor} h-full rounded-full transition-all`}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}

function HighlightCard({
  kind,
  text,
}: {
  kind: "strength" | "improvement";
  text: string;
}) {
  const isStrength = kind === "strength";
  return (
    <div
      className={`rounded-xl border-l-4 p-4 ${
        isStrength
          ? "border-coach-gold bg-coach-gold/[0.06]"
          : "border-coach-mahogany bg-coach-mahogany/[0.12]"
      }`}
    >
      <p
        className={`text-[10px] tracking-[0.25em] uppercase mb-1.5 ${
          isStrength ? "text-coach-gold" : "text-coach-mahogany"
        }`}
      >
        {isStrength ? "Strength" : "Area for improvement"}
      </p>
      <p className="text-coach-cream/90 text-[14px] leading-[1.5]">{text}</p>
    </div>
  );
}
