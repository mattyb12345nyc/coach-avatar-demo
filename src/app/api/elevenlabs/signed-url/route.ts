import { NextRequest, NextResponse } from "next/server";
import { getPersona, resolveAgentId } from "@/config/event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/elevenlabs/signed-url { personaSlug, language }
// Mints a single-use signed WebSocket URL for the persona's ElevenLabs agent.
// The API key never leaves the server and no agent IDs sit on the room laptop.
export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfigured: ELEVENLABS_API_KEY missing" },
      { status: 500 },
    );
  }

  let body: { personaSlug?: string; language?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const persona = getPersona(body.personaSlug);
  if (!persona) {
    return NextResponse.json({ error: "Unknown persona" }, { status: 400 });
  }
  const agentId = resolveAgentId(persona, body.language || "en");

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": apiKey }, signal: AbortSignal.timeout(15000) },
    );
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `ElevenLabs signed-url failed (HTTP ${res.status})`, detail: text.slice(0, 200) },
        { status: res.status },
      );
    }
    const data = (await res.json()) as { signed_url?: string };
    if (!data.signed_url) {
      return NextResponse.json({ error: "No signed_url returned" }, { status: 502 });
    }
    return NextResponse.json({ signedUrl: data.signed_url, agentId });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
