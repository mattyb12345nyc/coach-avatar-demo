import type { Metadata } from "next";
import { KeynoteStage } from "@/components/keynote/KeynoteStage";

export const metadata: Metadata = {
  title: "Coach Pulse — Las Vegas",
  description: "Live in-store associate avatar, standing on the Coach floor in Las Vegas.",
};

// Joon streams over a green screen (LiveAvatar FULL mode via the Web SDK);
// KeynoteStage chroma-keys her onto this store photo in real time.
const STORE_IMAGE = "/backgrounds/coach-store-vegas.jpg";

export default function KeynotePage() {
  return (
    <main className="relative min-h-[100svh] w-full overflow-hidden bg-coach-black">
      {/* Store backdrop */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={STORE_IMAGE}
        alt="Coach boutique, Las Vegas"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Soft floor shadow so she reads as standing in the room */}
      <div className="absolute inset-0 [background:radial-gradient(90%_50%_at_50%_100%,rgba(28,25,23,0.35)_0%,transparent_60%)]" />

      {/* Wordmark */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5">
        <p className="font-pulse-ext text-[11px] uppercase tracking-[0.34em] text-coach-cream drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">
          Coach&nbsp;Pulse
        </p>
        <p className="font-pulse-ext text-[10px] uppercase tracking-[0.28em] text-coach-cream/70 drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">
          Las&nbsp;Vegas
        </p>
      </header>

      <KeynoteStage />
    </main>
  );
}
