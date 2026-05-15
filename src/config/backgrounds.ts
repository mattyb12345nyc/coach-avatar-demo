import type { BackgroundPreset } from "@/lib/types";

// Single background. Drop a replacement at public/backgrounds/background.png
// (any size; 1920x1080 or similar works best). The picker has been removed.
export const BACKGROUND: BackgroundPreset = {
  key: "default",
  label: "Background",
  image: "/backgrounds/background.png",
  avatarOffset: { scaleVh: 60, x: 0, yPercentFromBottom: 8 },
};
