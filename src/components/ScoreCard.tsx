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

const ZONE_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
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
    <div className="flex-1 flex flex-col bg-coach-cream">
      {/* Black hero header */}
      <header className="bg-coach-black text-coach-cream px-6 pt-12 pb-12 text-center">
        <p className="font-pulse-ext text-[10px] tracking-[0.22em] uppercase font-medium text-coach-cream/75">
          Session complete
        </p>
        <h1
          className="mt-3 font-bembo text-[28px] leading-[1.1] font-normal"
          style={{ letterSpacing: "-0.005em" }}
        >
          Here&apos;s how the conversation landed.
        </h1>
        <p className="mt-3 font-pulse-body text-[13px] text-coach-cream/65">
          {new Date().toLocaleDateString(undefined, {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>

      {/* Cream container with rounded-top overlap */}
      <main className="flex-1 bg-coach-cream rounded-t-3xl -mt-6 px-5 pt-8 pb-16">
        <div className="mx-auto w-full max-w-[640px] flex flex-col gap-8">
          {/* Persona + score trio */}
          <section className="flex flex-col items-center gap-4">
            {persona.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={persona.image}
                alt={persona.name}
                className="w-[60px] h-[60px] rounded-full object-cover"
              />
            ) : (
              <div className="w-[60px] h-[60px] rounded-full bg-coach-black flex items-center justify-center text-coach-cream font-pulse-ext text-[18px] font-medium">
                {persona.name.charAt(0)}
              </div>
            )}
            <div className="text-center">
              <p className="font-pulse-body text-[17px] font-medium text-pulse-primary">
                {persona.name}
                {persona.age ? `, ${persona.age}` : ""}
              </p>
              {persona.type && (
                <p className="font-pulse-ext text-[9px] tracking-[0.22em] uppercase font-medium text-pulse-meta mt-1">
                  {persona.type}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 w-full mt-2">
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
              <SectionHeader>Coach feedback</SectionHeader>
              <div className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-5">
                <p className="font-pulse-body text-[14px] leading-[1.6] text-pulse-neutral-dark whitespace-pre-line">
                  {result.summary}
                </p>
              </div>
            </section>
          )}

          {(strengths.length > 0 || improvements.length > 0) && (
            <section className="flex flex-col gap-2">
              <SectionHeader>Key moments</SectionHeader>
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
            <section className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-5 flex flex-col gap-2">
              <p className="font-pulse-ext text-[9px] tracking-[0.22em] uppercase font-medium text-pulse-meta">
                Recommended next
              </p>
              <p className="font-pulse-body italic text-[15px] leading-[1.55] text-pulse-primary">
                {result.recommendedNextFeedback}
              </p>
            </section>
          )}

          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={onTryAgain}
              className="inline-flex items-center justify-center rounded-pulse-pill bg-coach-black text-coach-cream font-pulse-ext text-[12px] font-medium tracking-[0.12em] uppercase px-10 py-4 hover:opacity-90 active:scale-[0.99] transition-all"
            >
              Try another session
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-pulse-ext text-[9px] tracking-[0.22em] uppercase font-medium text-pulse-meta px-1">
      {children}
    </h2>
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
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const hasProgress = typeof pct === "number";
  const offset = hasProgress
    ? circumference * (1 - Math.max(0, Math.min(100, pct!)) / 100)
    : circumference;
  // Per Coach Pulse: black ring by default, green when 75+ (on track up).
  const ringColor =
    hasProgress && pct! >= 75 ? "var(--color-pulse-success)" : "var(--color-coach-black)";

  return (
    <div className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-4 flex flex-col items-center justify-center gap-3">
      <div className="relative w-[88px] h-[88px]">
        <svg className="w-[88px] h-[88px] -rotate-90" aria-hidden>
          <circle
            cx="44"
            cy="44"
            r={radius}
            stroke="var(--color-pulse-stroke)"
            strokeWidth="6"
            fill="none"
          />
          {hasProgress && (
            <circle
              cx="44"
              cy="44"
              r={radius}
              stroke={ringColor}
              strokeWidth="6"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-pulse-ext text-[18px] font-medium text-pulse-primary">
            {value}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="font-pulse-body text-[12px] font-medium text-pulse-neutral-1">{label}</p>
        {typeof stars === "number" && (
          <div className="flex gap-0.5" aria-label={`${stars} of 5 stars`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={11}
                className={i <= stars ? "text-pulse-primary" : "text-pulse-stroke"}
                fill={i <= stars ? "var(--color-pulse-primary)" : "transparent"}
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
  iconFor: (c: ScoreCategory) => React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <section className="flex flex-col gap-2">
      <SectionHeader>{title}</SectionHeader>
      <div className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-5 flex flex-col gap-4">
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
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  // Pulse system: thin bar, pulse-success when at 100, otherwise coach-black.
  const barColor = pct >= 100 ? "bg-pulse-success" : "bg-coach-black";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="font-pulse-body text-[14px] text-pulse-primary inline-flex items-center gap-2">
          <Icon size={15} />
          {label}
        </span>
        <span className={`font-pulse-body text-[13px] tabular-nums ${pct >= 100 ? "text-pulse-success" : "text-pulse-primary"}`}>
          {valueLabel}
        </span>
      </div>
      <div className="w-full h-1 rounded-full bg-pulse-stroke overflow-hidden">
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
      className={`rounded-pulse-card bg-pulse-paper border border-pulse-stroke border-l-4 p-4 ${
        isStrength ? "border-l-pulse-success" : "border-l-pulse-error"
      }`}
    >
      <p
        className={`font-pulse-ext text-[9px] tracking-[0.22em] uppercase font-medium mb-1.5 ${
          isStrength ? "text-pulse-success" : "text-pulse-error"
        }`}
      >
        {isStrength ? "Strength" : "Area for improvement"}
      </p>
      <p className="font-pulse-body text-[14px] leading-[1.5] text-pulse-neutral-dark">
        {text}
      </p>
    </div>
  );
}
