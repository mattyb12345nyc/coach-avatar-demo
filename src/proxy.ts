import { NextRequest, NextResponse } from "next/server";

// keynote.coachpulsedemo.com → serve the /keynote avatar page at the root.
// Proxy (not next.config rewrites) because the prerendered "/" home page
// is served from the static cache before afterFiles/beforeFiles rewrites run.
export function proxy(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  if (host.startsWith("keynote.")) {
    return NextResponse.rewrite(new URL("/keynote", req.url));
  }
  return NextResponse.next();
}

// Only the root path needs rewriting; every other route behaves normally.
export const config = {
  matcher: "/",
};
