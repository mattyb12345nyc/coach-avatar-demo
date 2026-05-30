import { NextRequest } from "next/server";

// Lightweight admin gate for the event console. A single shared passcode
// (ADMIN_PASSCODE) is enough for a closed, in-person activation. If the env
// var is unset (local dev), the gate is open.
export function isAdminAuthorized(request: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) return true;
  const provided =
    request.headers.get("x-admin-passcode") ||
    new URL(request.url).searchParams.get("passcode");
  return provided === expected;
}

// Exposed so the admin UI can tell whether a passcode is even required.
export function adminPasscodeRequired(): boolean {
  return Boolean(process.env.ADMIN_PASSCODE);
}
