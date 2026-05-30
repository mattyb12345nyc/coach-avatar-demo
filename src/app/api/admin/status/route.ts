import { NextResponse } from "next/server";
import { adminPasscodeRequired } from "@/lib/adminAuth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { isTwilioConfigured } from "@/lib/twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/status — what the admin console needs to render: whether a
// passcode is required and which integrations are live.
export async function GET() {
  return NextResponse.json({
    passcodeRequired: adminPasscodeRequired(),
    supabase: isSupabaseConfigured(),
    twilio: isTwilioConfigured(),
  });
}
