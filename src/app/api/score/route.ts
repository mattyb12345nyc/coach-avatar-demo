import { NextRequest, NextResponse } from "next/server";
import {
  MAX_PER_KEY,
  REQUIRED_KEYS,
  SCORING_MAX_TOKENS,
  SCORING_MODEL,
  SYSTEM_PROMPT,
} from "@/lib/scoringPrompt";
import type {
  ScoringResult,
  ScoringScores,
  TranscriptLine,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validateScores(parsed: unknown): ScoringResult {
  const p = parsed as Partial<ScoringResult> & {
    scores?: Partial<ScoringScores>;
  };
  if (!p?.scores) throw new Error("Missing scores object");
  for (const key of REQUIRED_KEYS) {
    const value = p.scores[key];
    if (typeof value !== "number" || !Number.isInteger(value)) {
      throw new Error(`Invalid score for ${key}: ${value}`);
    }
    if (value < 0 || value > MAX_PER_KEY[key]) {
      throw new Error(`${key} out of range: ${value} (max ${MAX_PER_KEY[key]})`);
    }
  }
  const sum = REQUIRED_KEYS.reduce(
    (total, key) => total + (p.scores![key] as number),
    0,
  );
  if (typeof p.overall_score !== "number") {
    throw new Error("Missing overall_score");
  }
  if (Math.abs(sum - p.overall_score) > 1) {
    throw new Error(`overall_score ${p.overall_score} != sum ${sum}`);
  }
  if (p.overall_score < 0 || p.overall_score > 100) {
    throw new Error(`overall_score out of range: ${p.overall_score}`);
  }
  if (typeof p.recommendedNextFeedback !== "string") {
    throw new Error("Missing recommendedNextFeedback");
  }
  return p as ScoringResult;
}

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Response did not contain JSON");
  return JSON.parse(match[0]);
}

function formatTranscript(transcript: TranscriptLine[]): string {
  return transcript
    .map((line) => `${line.role === "user" ? "Associate" : "Customer"}: ${line.text}`)
    .join("\n");
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfigured: ANTHROPIC_API_KEY missing" },
      { status: 500 },
    );
  }

  let body: {
    transcript?: TranscriptLine[];
    persona?: string | { name: string; age?: number; scenario?: string };
    scenario?: string;
    durationSeconds?: number;
    endedReason?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { transcript, persona, scenario, durationSeconds, endedReason } = body;
  if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
    return NextResponse.json(
      { error: "Missing or empty transcript" },
      { status: 400 },
    );
  }

  const personaLabel =
    typeof persona === "string"
      ? persona
      : persona?.name
        ? `${persona.name}${persona.age ? `, ${persona.age}` : ""}`
        : "Customer";
  const scenarioText =
    scenario ||
    (typeof persona === "object" && persona?.scenario) ||
    "Practice session";

  const metaLines: string[] = [];
  if (typeof durationSeconds === "number" && durationSeconds > 0) {
    metaLines.push(`Session duration: ${durationSeconds}s`);
  }
  if (typeof endedReason === "string" && endedReason) {
    metaLines.push(`Ended reason: ${endedReason}`);
  }
  const metaBlock = metaLines.length > 0 ? `\n${metaLines.join("\n")}` : "";

  const userContent = `Customer: ${personaLabel}\nScenario: ${scenarioText}${metaBlock}\n\nTRANSCRIPT:\n${formatTranscript(transcript)}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: SCORING_MODEL,
        max_tokens: SCORING_MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
      signal: AbortSignal.timeout(25000),
    });

    const text = await res.text();
    if (!res.ok) {
      let errMsg = `Anthropic API error (HTTP ${res.status})`;
      try {
        const j = JSON.parse(text) as { error?: { message?: string } };
        if (j.error?.message) errMsg = j.error.message;
      } catch {
        if (text) errMsg = text;
      }
      return NextResponse.json({ error: errMsg }, { status: res.status });
    }

    const data = JSON.parse(text) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const block = data.content?.find(
      (b) => b.type === "text" && typeof b.text === "string",
    );
    if (!block?.text) {
      return NextResponse.json(
        { error: "Empty scoring response" },
        { status: 502 },
      );
    }
    const parsed = extractJson(block.text);
    const validated = validateScores(parsed);

    return NextResponse.json({
      ...validated,
      system_prompt: SYSTEM_PROMPT,
      user_prompt: userContent,
      model: SCORING_MODEL,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Scoring failed" },
      { status: 500 },
    );
  }
}
