import { NextResponse } from "next/server";

// Mints a LiveAvatar FULL-mode session token for the keynote stage.
// FULL mode (vs the iframe embed) hands us the raw green-screen video track,
// which the client chroma-keys over the Coach store photo.
const AVATAR_ID = "ab0765ad-69de-41fb-9f8a-bd01c3c52d6f"; // Joon, green screen
const VOICE_ID = "62bbb4b2-bb26-4727-bc87-cfb2bd4e0cc8"; // June — Lifelike
const CONTEXT_ID = "b25f2e75-cab8-415c-ab35-d902ff22367e"; // Coach keynote context

export async function POST() {
  const apiKey = process.env.LIVEAVATAR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "LIVEAVATAR_API_KEY is not configured" }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.liveavatar.com/v1/sessions/token", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "FULL",
        avatar_id: AVATAR_ID,
        avatar_persona: { voice_id: VOICE_ID, context_id: CONTEXT_ID, language: "en" },
        video_settings: { quality: "high", encoding: "H264" },
        interactivity_type: "CONVERSATIONAL",
        // Hard server-side cap — abandoned sessions (closed tab, reload) keep
        // consuming credits until they hit this.
        max_session_duration: 600,
      }),
    });
    const data = await res.json().catch(() => ({}));
    const sessionToken = data?.data?.session_token;
    if (!res.ok || !sessionToken) {
      return NextResponse.json(
        { error: data?.message || `LiveAvatar token request failed (${res.status})` },
        { status: 502 },
      );
    }
    return NextResponse.json({ sessionToken });
  } catch {
    return NextResponse.json({ error: "Could not reach LiveAvatar" }, { status: 502 });
  }
}
