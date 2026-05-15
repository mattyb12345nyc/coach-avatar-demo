import type { BackgroundPreset } from "@/lib/types";

export const backgrounds: BackgroundPreset[] = [
  {
    key: "cherry-boutique",
    label: "Cherry Boutique",
    image: "/backgrounds/coach-cherry-boutique.png",
    avatarOffset: { scaleVh: 60, x: 0, yPercentFromBottom: 8 },
    default: true,
  },
  {
    key: "coach-black",
    label: "Coach Black",
    color: "#1C1917",
    avatarOffset: { scaleVh: 70, x: 0, yPercentFromBottom: 5 },
  },
  {
    key: "gold-pattern",
    label: "Gold Pattern",
    image: "/backgrounds/coach-gold-pattern.svg",
    avatarOffset: { scaleVh: 65, x: 0, yPercentFromBottom: 8 },
  },
];

export const DEFAULT_BACKGROUND_KEY =
  backgrounds.find((b) => b.default)?.key ?? backgrounds[0].key;
