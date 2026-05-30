import { useEffect, useRef, useState } from "react";

// Kiosk idle auto-reset. While `active`, any inactivity past `totalMs` fires
// `onIdle` (we send the station back to "who's playing" for the next manager).
// In the final `warnMs`, it surfaces a countdown so an engaged reader can tap
// to stay — any interaction resets the clock. Returns seconds left during the
// warning window, or null when not warning.
export function useIdleReset({
  active,
  totalMs,
  warnMs,
  onIdle,
}: {
  active: boolean;
  totalMs: number;
  warnMs: number;
  onIdle: () => void;
}): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!active) {
      setSecondsLeft(null);
      return;
    }

    let deadline = Date.now() + totalMs;
    const bump = () => {
      deadline = Date.now() + totalMs;
      setSecondsLeft(null);
    };

    const events = ["pointerdown", "keydown", "touchstart", "wheel"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    const tick = setInterval(() => {
      const msLeft = deadline - Date.now();
      if (msLeft <= 0) {
        setSecondsLeft(null);
        onIdleRef.current();
      } else if (msLeft <= warnMs) {
        setSecondsLeft(Math.ceil(msLeft / 1000));
      } else {
        setSecondsLeft(null);
      }
    }, 500);

    return () => {
      clearInterval(tick);
      events.forEach((e) => window.removeEventListener(e, bump));
    };
  }, [active, totalMs, warnMs]);

  return secondsLeft;
}
