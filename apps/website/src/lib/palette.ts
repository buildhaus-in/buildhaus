// Colour system for the PUBLIC MARKETING SITE ONLY.
//
// This file previously cycled through a multi-hue "spectrum" (per
// service/tier/project-type category) — that was explicitly rejected
// ("what we build has different colour for independent houses n villas
// make it into one colour only", plus the earlier "remove those colour
// strips, I don't want colours"). Every page across the site now shows a
// single colour: the brand's own accent orange (#E04D22, see
// packages/brand/src/colors.ts). This file does NOT touch that shared
// package, so the portal dashboard is unaffected either way.
//
// Every function/lookup below is KEPT (rather than deleted and every call
// site rewritten) so this is a one-file change: each one now always
// resolves to BRAND_HUE instead of a category-specific hue. `Hue` shapes a
// small set of Tailwind classes (never built by string interpolation, so
// Tailwind's content scanner can find them) for text/background/border/dot
// treatments of one colour.
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

export const BRAND_HUE: Hue = {
  name: "brand",
  text: "text-brand",
  textStrong: "text-brand",
  bg: "bg-brand/10",
  border: "border-brand/30",
  borderL: "border-l-brand",
  borderT: "border-t-brand",
  dot: "bg-brand",
};

/** Every call site gets the single brand hue, regardless of index. */
export function hueFor(_index: number): Hue {
  return BRAND_HUE;
}

/** Every package tier gets the single brand hue. */
export const TIER_HUE: Record<string, Hue> = new Proxy(
  {},
  { get: () => BRAND_HUE }
);

/** Every build category gets the single brand hue. */
export const CATEGORY_HUE: Record<string, Hue> = new Proxy(
  {},
  { get: () => BRAND_HUE }
);

/** Every project type gets the single brand hue. */
export function hueForProjectType(_projectType: string | null | undefined): Hue {
  return BRAND_HUE;
}

// Display label for a project's build type — used on the public homepage
// teaser instead of the client-identifying project name (e.g. a family
// surname). "duplex" reads as "G+2" (Ground+2 floors) per an explicit
// request — that's the real, more informative construction term already
// used in services/data.ts's sizing copy — everything else is just
// title-cased.
const PROJECT_TYPE_LABEL: Record<string, string> = {
  duplex: "G+2",
};

export function projectTypeLabel(projectType: string | null | undefined): string {
  if (!projectType) return "Project";
  const key = projectType.toLowerCase();
  return PROJECT_TYPE_LABEL[key] ?? projectType.charAt(0).toUpperCase() + projectType.slice(1);
}
