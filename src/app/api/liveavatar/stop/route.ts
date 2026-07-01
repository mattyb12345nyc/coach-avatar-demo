import { NextResponse } from "next/server";

// Force-stops a LiveAvatar session server-side. The client calls this from
// its connect watchdog and on pagehide — abandoned sessions otherwise keep
// consuming credits until max_session_duration.
export async function POST(req: Request) {
  const apiKey = process.env.LIVEAVATAR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "LIVEAVATAR_API_KEY is not configured" }, { status: 500 });
  }
  const { sessionId } = await req.json().catch(() => ({}));
  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }
  try {
    const res = await fetch("https://api.liveavatar.com/v1/sessions/stop", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });
    return NextResponse.json({ ok: res.ok });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
