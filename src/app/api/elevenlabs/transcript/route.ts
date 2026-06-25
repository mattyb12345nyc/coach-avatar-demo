import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/elevenlabs/transcript { conversationId }
// Fetches the finalized transcript for a finished conversation. The client
// falls back to its locally-collected transcript if this isn't ready yet.
export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY missing" }, { status: 500 });
  }
  let body: { conversationId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.conversationId) {
    return NextResponse.json({ error: "conversationId required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(body.conversationId)}`,
      { headers: { "xi-api-key": apiKey }, signal: AbortSignal.timeout(15000) },
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: `Transcript fetch failed (HTTP ${res.status})` },
        { status: res.status },
      );
    }
    const data = (await res.json()) as {
      transcript?: Array<{ role?: string; message?: string }>;
      status?: string;
    };
    const transcript = (data.transcript ?? [])
      .filter((t) => typeof t.message === "string" && t.message.trim())
      .map((t) => ({
        // ElevenLabs: assistant = the customer (avatar), user = the associate.
        role: t.role === "user" ? "user" : "avatar",
        text: t.message as string,
        timestamp: 0,
      }));
    return NextResponse.json({ transcript, status: data.status ?? "unknown" });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
