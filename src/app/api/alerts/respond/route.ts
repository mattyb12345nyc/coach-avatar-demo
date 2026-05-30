import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// POST /api/alerts/respond — a team submits an answer to the live alert.
// First correct team earns the bonus; others who are correct get 0 (still
// recorded). One response per team per alert.
//   { alertId, teamId, answer }
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  let body: { alertId?: string; teamId?: string; answer?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { alertId, teamId } = body;
  const answer = (body.answer || "").toString();
  if (!alertId || !teamId) {
    return NextResponse.json({ error: "alertId and teamId required" }, { status: 400 });
  }

  const sb = getServerSupabase();

  const { data: alert, error: aErr } = await sb
    .from("pulse_alerts")
    .select("id, answer, bonus_points, active")
    .eq("id", alertId)
    .single();
  if (aErr || !alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }
  if (!alert.active) {
    return NextResponse.json({ error: "This alert has closed" }, { status: 409 });
  }

  // Already answered? (unique alert_id+team_id)
  const { data: existing } = await sb
    .from("alert_responses")
    .select("id")
    .eq("alert_id", alertId)
    .eq("team_id", teamId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "Your team already answered this one" },
      { status: 409 },
    );
  }

  // Grade. Freeform alerts (no answer key) are recorded for manual review.
  const hasKey = Boolean(alert.answer && alert.answer.trim());
  const correct = hasKey ? normalize(answer) === normalize(alert.answer!) : false;

  // First correct?
  let awarded = 0;
  if (correct) {
    const { count } = await sb
      .from("alert_responses")
      .select("id", { count: "exact", head: true })
      .eq("alert_id", alertId)
      .eq("correct", true);
    if ((count ?? 0) === 0) awarded = alert.bonus_points;
  }

  const { error: insErr } = await sb.from("alert_responses").insert({
    alert_id: alertId,
    team_id: teamId,
    answer,
    correct,
    awarded,
  });
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    recorded: true,
    correct,
    awarded,
    first: awarded > 0,
    pending: !hasKey,
  });
}
