import type { Config } from "tailwindcss";
import { colors } from "./colors";

// Shared Tailwind preset — both apps/website/tailwind.config.ts and
// apps/portal/tailwind.config.ts extend this via `presets: [buildhausPreset]`
// so a palette change only ever happens in one place.
export const buildhausPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        bg: colors.bg,
        surface: colors.surface,
        card: colors.card,
        border: colors.border,
        brand: { DEFAULT: colors.brand, soft: colors.brandSoft },
        sand: colors.sand,
        sandlight: colors.sandLight,
        ivory: colors.ivory,
        ok: colors.ok,
        warn: colors.warn,
        danger: colors.danger,
        muted: colors.muted,
        ink: colors.ink,
        navy: colors.navy,
        royal: { DEFAULT: colors.royal, alt: colors.royalAlt },
        sky: { DEFAULT: colors.sky, soft: colors.skySoft },
        stone: colors.stone,
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Poppins", "system-ui", "sans-serif"],
      },
      borderRadius: { xl2: "16px" },
    },
  },
};

export default buildhausPreset;
