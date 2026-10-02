// The single source of truth for the BuildHaus palette. Both the Tailwind
// preset (website AND portal) and anything that can't use Tailwind classes
// (quotation PDF, email templates, canvas/chart code) read from here rather
// than hardcoding a hex.
//
// Palette source (2026-10-01): the Owner's print collateral in Downloads/ —
// Buildhaus_Brochure.pdf, Buildhaus_Pricing_Catalog.pdf, Buildhaus
// Quotation.pdf, "buildhaus Floor plan presentation template.pdf" and
// "buildhaus Company Profile Presentation .pdf". Every value was sampled from
// those PDFs' own fills and text colours, per "coordinate [the website] with
// the brochures and other files":
//   orange #E24625 — full-bleed brochure/pricing pages, headings, accents
//   grey   #F0F0F1 — page grounds;  #E7E7E8 — inset panels
//   ink    #18191B — headings/body; #5B5C62 — secondary text (pricing)
//   rule   #DCDCE0 — table hairlines; tint #FCE9E4 — highlighted rows
//   red    #9F1211 — pricing accent;  warm black #1F1816 + taupe #C2B19C —
//          the floor-plan template's side panel
// The collateral never uses navy, so dark panels use the floor-plan warm
// black.
//
// Official brand palette (2026-10-02): "Application Presentation Color
// pallete.pdf" (Evakee) defines six swatches — #E24625 orange, #D13611 deep
// orange, #1F1916 warm black, #EDCFA4 sand, #C7B8A5 taupe, #DFE4E3 mist —
// used on the business card, billboard, QR card, envelope and email
// signature (sand grounds + orange blocks + warm black). Those exact values
// win over the sampled ones above where they overlap. The logo SVGs keep their own embedded #E04D22 (official asset files,
// visually identical to #E24625) — don't recolour them.
//
// This replaced the earlier navy-based palette from the Evakee brand sheet
// ("Buildhaus File export.pdf": navy #0B263A, royal #273B85, sky #ABCFDF…).
// Token NAMES are kept so every existing class (bg-navy, text-ivory,
// bg-sky-soft…) restyles without a sweep: `navy` = dark panel (warm black),
// `ivory` = heading ink, `ink` = body ink, `royal` = deep red accent,
// `sky`/`skySoft` = orange tints. Semantic tones (ok/warn/danger) unchanged.
export const colors = {
  bg: "#F0F0F1",        // brochure grey — page ground
  surface: "#E7E7E8",   // input fields / subtle panels on white cards
  card: "#FFFFFF",      // elevated cards
  border: "#DCDCE0",    // pricing-table hairlines
  brand: "#E24625",     // brochure orange
  brandSoft: "#E2462515",
  sand: "#5B5C62",      // secondary text (pricing catalogue)
  sandLight: "#2E2B2B", // emphasised secondary text
  ivory: "#18191B",     // headings — brochure ink
  ok: "#1F7A4D",
  warn: "#A87400",
  danger: "#B3261E",
  muted: "#66666C",     // the PDFs' #99999B fails AA; darkened to ≥4.8:1
  ink: "#2E2B2B",       // body text

  // Beyond the ground/ink mapping (names kept from the navy-era palette)
  navy: "#1F1916",      // dark panels, footer — official warm black
  royal: "#9F1211",     // deep red accent (pricing catalogue)
  royalAlt: "#9F1211",
  sky: "#F4A28C",       // light orange — labels on dark panels
  skySoft: "#F6EAD8",   // light sand (tint of #EDCFA4) — section bands
  stone: "#C7B8A5",     // official taupe

  // Official palette additions (Application Presentation Color pallete.pdf)
  brandDeep: "#D13611", // deep orange — hover/pressed, emphasis
  cream: "#EDCFA4",     // sand — signature ground (business card, billboard)
  mist: "#DFE4E3",      // cool light neutral
} as const;

export type BrandColor = keyof typeof colors;
