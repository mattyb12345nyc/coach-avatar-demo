"use client";

// Vertical "iPhone interface" pod frame (deck slide 7: oversized vertical flat
// screen designed to look like an iPhone). Opt-in via ?kiosk=1 — on the real
// portrait kiosk screens it fills the column; on a laptop it previews as a
// centered device on a black stage. Avatar/score screens render inside.
export function StationFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-coach-black flex items-center justify-center p-0 sm:p-6">
      <div
        className="relative w-full h-screen sm:h-auto sm:w-auto sm:aspect-[9/19.5] sm:max-h-[94vh] bg-coach-cream sm:rounded-[44px] overflow-hidden sm:border-[10px] sm:border-coach-black sm:shadow-pulse-nav flex flex-col"
        style={{ contain: "layout paint" }}
      >
        {/* notch — only on the laptop-preview device shell */}
        <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-coach-black rounded-b-2xl z-20" />
        <div className="flex-1 flex flex-col overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
