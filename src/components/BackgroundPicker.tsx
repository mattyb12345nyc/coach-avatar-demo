"use client";

import { backgrounds } from "@/config/backgrounds";

type BackgroundPickerProps = {
  selectedKey: string;
  onChange: (key: string) => void;
  variant?: "row" | "floating";
};

export function BackgroundPicker({
  selectedKey,
  onChange,
  variant = "row",
}: BackgroundPickerProps) {
  const containerClass =
    variant === "floating"
      ? "fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2 rounded-full bg-black/50 backdrop-blur-md px-3 py-2"
      : "flex gap-3 justify-center";

  return (
    <div className={containerClass} role="radiogroup" aria-label="Background">
      {backgrounds.map((bg) => {
        const selected = bg.key === selectedKey;
        const thumbStyle: React.CSSProperties = bg.image
          ? {
              backgroundImage: `url(${bg.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : { backgroundColor: bg.color || "#1C1917" };
        return (
          <button
            key={bg.key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(bg.key)}
            className={`relative rounded-md transition-all overflow-hidden ${
              selected
                ? "ring-2 ring-coach-gold ring-offset-2 ring-offset-coach-black"
                : "ring-1 ring-coach-cream/20 hover:ring-coach-cream/50"
            }`}
            style={{
              width: 60,
              height: 40,
              ...thumbStyle,
            }}
            title={bg.label}
          >
            <span className="sr-only">{bg.label}</span>
          </button>
        );
      })}
    </div>
  );
}
