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
  // Anthropic occasionally wraps the JSON in code fences or chats around
  // it. Try increasingly tolerant parses.
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }
  // Strip ```json fences if present
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // fall through
    }
  }
  // Greedy first-{ to last-} extraction
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error("Response did not contain JSON");
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

  // If essentially nothing was said, don't waste a model call — give the
  // user a clear "too short" error they can act on.
  const totalChars = transcript.reduce(
    (sum, line) => sum + (typeof line.text === "string" ? line.text.length : 0),
    0,
  );
  const userTurns = transcript.filter((line) => line.role === "user").length;
  if (totalChars < 60 || userTurns < 2) {
    return NextResponse.json(
      {
        error:
          "Session too short to score. Aim for at least a couple of minutes with a few back-and-forth turns before ending.",
      },
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
        // Assistant prefill locks the model into producing JSON from the
        // first token. The prefilled "{" is prepended back on parse.
        messages: [
          { role: "user", content: userContent },
          { role: "assistant", content: "{" },
        ],
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
    // Re-attach the prefilled "{" since Anthropic returns only the
    // tokens it generated after the prefill.
    const raw = block.text.trim().startsWith("{")
      ? block.text
      : "{" + block.text;
    let parsed: unknown;
    try {
      parsed = extractJson(raw);
    } catch (parseErr) {
      console.error("Scoring JSON parse failed. Raw text:", raw.slice(0, 1000));
      return NextResponse.json(
        {
          error: `Scoring returned non-JSON: ${(parseErr as Error).message}`,
          rawPreview: raw.slice(0, 400),
        },
        { status: 502 },
      );
    }
    let validated;
    try {
      validated = validateScores(parsed);
    } catch (validateErr) {
      console.error("Scoring validation failed. Parsed:", parsed);
      return NextResponse.json(
        {
          error: `Scoring validation failed: ${(validateErr as Error).message}`,
        },
        { status: 502 },
      );
    }

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
