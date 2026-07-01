"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";

// Deep-link guard for /keynote — same pattern as the hub's EntryPage gate,
// its own password + storage key so hub access doesn't unlock it (or vice versa).
const PASSWORD = "coach2026!";
const KEY = "coachpulse.keynote";

export function KeynoteGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = not yet checked
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setAuthed(window.localStorage.getItem(KEY) === "1");
  }, []);

  function submit() {
    if (pw === PASSWORD) {
      window.localStorage.setItem(KEY, "1");
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  if (authed) return <>{children}</>;

  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-coach-black px-6 text-coach-cream">
      {authed === false && (
        <div className="flex w-full max-w-[360px] flex-col gap-5 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-coach-cream/25">
            <Lock size={18} className="text-coach-cream" />
          </span>
          <div>
            <p className="font-pulse-ext text-[10px] uppercase tracking-[0.3em] text-coach-cream">
              Coach Pulse · Las Vegas
            </p>
            <h1 className="mt-2 font-bembo text-[30px] leading-tight">Enter the password</h1>
          </div>
          <input
            type="password"
            value={pw}
            autoFocus
            onChange={(e) => {
              setPw(e.target.value);
              setError(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Password"
            className="rounded-pulse-tile bg-coach-cream px-4 py-3.5 text-center font-pulse-body text-[15px] text-pulse-primary focus:outline-none"
          />
          <button
            onClick={submit}
            className="rounded-pulse-pill bg-coach-cream px-10 py-3.5 font-pulse-ext text-[12px] font-medium uppercase tracking-[0.12em] text-coach-black"
          >
            Enter
          </button>
          {error && <p className="font-pulse-body text-[13px] text-pulse-error">That&apos;s not the password.</p>}
        </div>
      )}
    </div>
  );
}
