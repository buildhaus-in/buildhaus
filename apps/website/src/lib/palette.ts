// Extended colour system for the PUBLIC MARKETING SITE ONLY.
//
// Buildhaus's real logo ships three colours — accent orange #E04D22, dark
// ink #221A16, warm cream #EDCFA4 (see packages/brand/src/colors.ts) — and
// those stay the `brand` / `ivory`-adjacent / `sand` tokens shared with the
// portal via @buildhaus/brand. This file does NOT touch that shared package,
// so the portal dashboard is completely unaffected.
//
// Every hue below stays deliberately inside the logo's own warm family —
// orange, gold, rust, ochre, copper, espresso-brown — rather than reaching
// for Tailwind's cool stock colours (teal/violet/rose/emerald). An earlier
// pass used those cool stock hues and was explicitly rejected ("the colours
// themselves" didn't fit) — every value here is a custom hex chosen to read
// as a variation *of* the brand orange/cream/ink, not a different brand.
// Arbitrary-value Tailwind classes (`text-[#rrggbb]`) are written out in
// full below (never built by string interpolation at the call site) so
// Tailwind's content scanner can find them — see
// apps/website/tailwind.config.ts's `content` glob, which covers this file.
export interface Hue {
  name: string;
  /** Body-weight text colour, readable on `bg`. */
  text: string;
  /** Slightly bolder text colour, for numbers/prices. */
  textStrong: string;
  /** Pale tint, for a card/chip ground. */
  bg: string;
  /** Border to pair with `bg`. */
  border: string;
  /** Left-edge-only border colour — pair with a `border-l-4` width utility
   *  so an accent bar doesn't fight a neutral `border-border` on the other
   *  three sides (directional colour utilities apply to one side only). */
  borderL: string;
  /** Top-edge-only border colour — same reasoning as `borderL`. */
  borderT: string;
  /** Solid dot/accent-bar fill. */
  dot: string;
}

// Quiet warm neutral (NOT cool grey) — a soft taupe, for the entry-level
// package tier and the two industrial/utility build categories.
const TAUPE: Hue = {
  name: "taupe",
  text: "text-[#6b5d4a]",
  textStrong: "text-[#8a7a63]",
  bg: "bg-[#f2efe9]",
  border: "border-[#ddd6c9]",
  borderL: "border-l-[#ab9a80]",
  borderT: "border-t-[#ab9a80]",
  dot: "bg-[#8a7a63]",
};

const BRAND: Hue = {
  name: "brand",
  text: "text-brand",
  textStrong: "text-brand",
  bg: "bg-brand/10",
  border: "border-brand/30",
  borderL: "border-l-brand",
  borderT: "border-t-brand",
  dot: "bg-brand",
};

// The five additional warm hues, in a fixed cycling order — gold, rust,
// ochre, copper, espresso. Each is a distinct step in the same
// orange/brown/gold family the logo already lives in.
export const SPECTRUM: Hue[] = [
  { name: "gold", text: "text-[#8a651f]", textStrong: "text-[#b8862c]", bg: "bg-[#fdf3e0]", border: "border-[#f0d9a6]", borderL: "border-l-[#d9a441]", borderT: "border-t-[#d9a441]", dot: "bg-[#d9a441]" },
  { name: "rust", text: "text-[#8f3620]", textStrong: "text-[#b3452e]", bg: "bg-[#fbeae6]", border: "border-[#e8bdae]", borderL: "border-l-[#b3452e]", borderT: "border-t-[#b3452e]", dot: "bg-[#b3452e]" },
  { name: "ochre", text: "text-[#665a15]", textStrong: "text-[#8c7a1e]", bg: "bg-[#f5f1de]", border: "border-[#ded1a0]", borderL: "border-l-[#a68f28]", borderT: "border-t-[#a68f28]", dot: "bg-[#a68f28]" },
  { name: "copper", text: "text-[#7a4527]", textStrong: "text-[#9c5b33]", bg: "bg-[#f7ece2]", border: "border-[#e2c3a8]", borderL: "border-l-[#9c5b33]", borderT: "border-t-[#9c5b33]", dot: "bg-[#9c5b33]" },
  { name: "espresso", text: "text-[#5c3a21]", textStrong: "text-[#4a2e1a]", bg: "bg-[#efe6dc]", border: "border-[#d6c2ac]", borderL: "border-l-[#5c3a21]", borderT: "border-t-[#5c3a21]", dot: "bg-[#5c3a21]" },
];

/** Cycle through the spectrum by position — for lists with no fixed identity. */
export function hueFor(index: number): Hue {
  return SPECTRUM[((index % SPECTRUM.length) + SPECTRUM.length) % SPECTRUM.length];
}

// Package tier → a MEMORISED colour (not cycled), so "Luxury" reads the same
// hue on the /packages grid, the /packages/[slug] detail page and anywhere
// else it's mentioned. Premium keeps the brand orange itself — it's the
// house's own signature tier (RECOMMENDED_KEY in packages/page.tsx).
export const TIER_HUE: Record<string, Hue> = {
  basic: TAUPE,
  standard: SPECTRUM[0], // gold — practical, warm
  premium: BRAND, // the brand's own orange — the signature tier
  luxury: SPECTRUM[4], // espresso — dark, sophisticated, top-tier
};

// Build-category colour, keyed by services/data.ts slugs.
export const CATEGORY_HUE: Record<string, Hue> = {
  "independent-houses": SPECTRUM[0], // gold
  villas: SPECTRUM[3], // copper — earthy, courtyards/gardens
  "duplex-homes": SPECTRUM[1], // rust
  apartments: SPECTRUM[2], // ochre
  offices: SPECTRUM[4], // espresso
  commercial: SPECTRUM[2], // ochre
  warehouses: TAUPE,
  factories: TAUPE,
  interiors: SPECTRUM[1], // rust — warm, human
  renovation: SPECTRUM[0], // gold
};

// public_projects.project_type is a free-text DB field, not guaranteed to
// match a services slug exactly — map by keyword, and fall back to the
// brand's own orange (never colourless) for anything unrecognised.
export function hueForProjectType(projectType: string | null | undefined): Hue {
  const key = (projectType ?? "").toLowerCase();
  if (key.includes("villa")) return CATEGORY_HUE.villas;
  if (key.includes("duplex")) return CATEGORY_HUE["duplex-homes"];
  if (key.includes("apartment")) return CATEGORY_HUE.apartments;
  if (key.includes("office")) return CATEGORY_HUE.offices;
  if (key.includes("commercial") || key.includes("retail")) return CATEGORY_HUE.commercial;
  if (key.includes("warehouse")) return CATEGORY_HUE.warehouses;
  if (key.includes("factory")) return CATEGORY_HUE.factories;
  if (key.includes("interior")) return CATEGORY_HUE.interiors;
  if (key.includes("renovation") || key.includes("reno")) return CATEGORY_HUE.renovation;
  return BRAND;
}
