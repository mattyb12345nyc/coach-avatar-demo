import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { sendSmsBatch, isTwilioConfigured } from "@/lib/twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/alerts/[id]/send — make this the live alert and SMS every manager.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const { id } = await params;
  const sb = getServerSupabase();

  const { data: alert, error: aErr } = await sb
    .from("pulse_alerts")
    .select("*")
    .eq("id", id)
    .single();
  if (aErr || !alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  // Only one alert live at a time.
  await sb.from("pulse_alerts").update({ active: false }).eq("active", true);
  const nowIso = new Date().toISOString();
  await sb
    .from("pulse_alerts")
    .update({ active: true, sent_at: nowIso })
    .eq("id", id);

  // Gather manager phones and blast the prompt + answer link.
  const { data: parts } = await sb
    .from("participants")
    .select("phone")
    .not("phone", "is", null);
  const phones = (parts ?? [])
    .map((p) => (p as { phone: string | null }).phone)
    .filter((p): p is string => Boolean(p));

  const origin = request.nextUrl.origin;
  const body = `⚡ PULSE ALERT: ${alert.prompt}\nAnswer fast in Coach Pulse → ${origin}/pulse  (+${alert.bonus_points} pts for the first team)`;

  let sms = { attempted: phones.length, sent: 0, configured: isTwilioConfigured() };
  if (phones.length && isTwilioConfigured()) {
    const results = await sendSmsBatch(phones, body);
    sms = {
      attempted: phones.length,
      sent: results.filter((r) => r.ok).length,
      configured: true,
    };
  }

  return NextResponse.json({ activated: true, alertId: id, sms });
}
