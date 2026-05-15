import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = process.env.LIVEAVATAR_API_URL || "https://api.liveavatar.com";

export async function POST(request: NextRequest) {
  const API_KEY = process.env.LIVEAVATAR_API_KEY;
  if (!API_KEY) {
    return NextResponse.json(
      { error: "Server misconfigured: LIVEAVATAR_API_KEY missing" },
      { status: 500 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const avatar_id =
    (body.avatar_id as string | undefined) ||
    process.env.LIVEAVATAR_AVATAR_ID ||
    undefined;
  const voice_id =
    (body.voice_id as string | undefined) ||
    process.env.LIVEAVATAR_VOICE_ID ||
    undefined;
  const context_id =
    (body.context_id as string | undefined) ||
    process.env.LIVEAVATAR_CONTEXT_ID ||
    undefined;
  const language =
    (body.language as string | undefined) ||
    process.env.LIVEAVATAR_LANGUAGE ||
    "en";

  if (!avatar_id) {
    return NextResponse.json(
      { error: "Missing avatar_id (and no LIVEAVATAR_AVATAR_ID default)" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${API_URL}/v1/sessions/token`, {
      method: "POST",
      headers: {
        "X-API-KEY": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "FULL",
        avatar_id,
        avatar_persona: {
          voice_id,
          context_id,
          language,
        },
        video_settings: {
          quality: "high",
          encoding: "H264",
        },
        // Avatar 63014563-... requires production mode (sandbox unsupported).
        // This burns HeyGen credits per session — fine for a demo.
        is_sandbox: false,
      }),
    });

    if (!res.ok) {
      const contentType = res.headers.get("content-type") || "";
      let errorMessage = `Failed to start session (HTTP ${res.status})`;
      if (contentType.includes("application/json")) {
        try {
          const resp = (await res.json()) as {
            data?: Array<{ message?: string }>;
            error?: string;
            message?: string;
          };
          if (resp.data && resp.data.length > 0 && resp.data[0].message) {
            errorMessage = resp.data[0].message;
          } else if (resp.error) {
            errorMessage = resp.error;
          } else if (resp.message) {
            errorMessage = resp.message;
          }
        } catch {
          // ignore
        }
      } else {
        try {
          errorMessage = (await res.text()) || errorMessage;
        } catch {
          // ignore
        }
      }
      // Do NOT echo back the API key under any circumstance.
      return NextResponse.json(
        { error: errorMessage },
        { status: res.status },
      );
    }

    const data = (await res.json()) as {
      data: { session_token: string; session_id: string };
    };
    return NextResponse.json({
      session_token: data.data.session_token,
      session_id: data.data.session_id,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
