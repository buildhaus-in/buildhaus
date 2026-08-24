// The single source of truth for the BuildHaus palette. Both the Tailwind
// preset and anything that can't use Tailwind classes (PDF generation, email
// templates, canvas/chart code) read from here rather than hardcoding a hex.
//
// Palette source: "Buildhaus File export.pdf" (Evakee Branding Studio, 2026)
// — swatch page hexes: Vibrant Orange #F15623, Deep Navy Blue #273B85,
// Sky Blue #ABCFDF, Light Stone Gray #C7C8C2, Soft White #F5F6F6, plus the
// dark panel navy sampled at #0B263A (its swatch label reads #304EA2 but the
// fill used across the identity is #0B263A — we follow the used fill; the
// labelled #304EA2 is kept as `royalAlt`).
//
// The identity is LIGHT-first: soft-white grounds, navy ink, orange accents.
// Token NAMES are kept from the previous dark theme so existing classes
// (bg-bg, text-ivory, text-sand…) restyle without a sweep: `ivory` now means
// "heading ink" (dark navy) and `ink` means "body ink". Semantic tones
// (ok/warn/danger) are tuned for contrast on light grounds; danger is a true
// red so it never reads as the brand orange.
export const colors = {
  bg: "#F5F6F6",        // Soft White — page ground
  surface: "#EDEFEF",   // input fields / subtle panels on white cards
  card: "#FFFFFF",      // elevated cards
  border: "#DCDEDA",    // hairlines, derived from Light Stone Gray
  brand: "#F15623",     // Vibrant Orange — the accent
  brandSoft: "#F1562315",
  sand: "#4A5B6E",      // secondary text (slate navy)
  sandLight: "#33465C", // emphasised secondary text
  ivory: "#0B263A",     // headings — Deep Panel Navy
  ok: "#1F7A4D",
  warn: "#A87400",
  danger: "#B3261E",
  muted: "#7A8694",
  ink: "#24384F",       // body text

  // Brand blues beyond the ground/ink mapping
  navy: "#0B263A",      // dark panels, footer, hero bands
  royal: "#273B85",     // Deep Navy Blue (indigo) — headline/link accents
  royalAlt: "#304EA2",  // labelled "Royal Blue" in the brand sheet
  sky: "#ABCFDF",       // Sky Blue — tints, section bands
  skySoft: "#E3EEF4",   // derived light tint of sky
  stone: "#C7C8C2",     // Light Stone Gray
} as const;

export type BrandColor = keyof typeof colors;
