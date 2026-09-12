// Mr Haus — the Owner's own commissioned brand mascot, an elephant site
// engineer wearing the brand's own "3" icon on his hard hat (source art:
// BuildHaus_Mr_Haus_Mascot_Red_Navy_Transparent.png, resized to
// public/images/mascot-mr-haus.png).
//
// Shared here rather than repeated per page so the alt text and the
// decorative-image treatment (pointer-events-none/select-none, so he never
// swallows a click or gets caught in a text selection) stay identical
// everywhere he appears. Callers pass sizing/placement via `className` —
// he's deliberately unsized by default.
export function MrHaus({ className }: { className?: string }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- brand mascot art, no optimisation pipeline needed for one static image */
    <img
      src="/images/mascot-mr-haus.png"
      alt="Mr Haus, the Buildhaus mascot — an elephant site engineer in a Buildhaus hard hat holding rolled drawings"
      className={`pointer-events-none w-auto shrink-0 select-none ${className ?? ""}`}
    />
  );
}
