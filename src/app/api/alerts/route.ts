import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { isAdminAuthorized } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/alerts — all Pulse Alerts (newest first), for the admin console.
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ alerts: [], configured: false });
  }
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from("pulse_alerts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alerts: data ?? [], configured: true });
}

// POST /api/alerts — create a Pulse Alert (admin).
//   { prompt, answer?, bonusPoints? }
export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  let body: { prompt?: string; answer?: string; bonusPoints?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from("pulse_alerts")
    .insert({
      prompt: body.prompt.trim(),
      answer: body.answer?.trim() || null,
      bonus_points:
        typeof body.bonusPoints === "number" ? body.bonusPoints : 10,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alert: data });
}
