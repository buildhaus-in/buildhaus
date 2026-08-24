import { clsx } from "clsx";

// BuildHaus brand mark — an SVG recreation of the geometric "B" monogram
// from the Evakee identity ("Buildhaus File export.pdf"): two stacked blocks,
// each squared on the left and fully rounded on the right, with rising
// diagonal cuts on the left that carve the stylised B/3 silhouette.
// NOTE: this is a faithful approximation traced from the raster export —
// swap in the official vector when Evakee's source files (AI/SVG) arrive.
export function BrandMark({ className, title = "BuildHaus" }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={title}
      className={clsx("h-8 w-8", className)}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      {/* top block: flat top, capsule-rounded right end, diagonal under-cut */}
      <path d="M14 8 H61 A19.5 19.5 0 0 1 61 47 H49.5 L14 8 Z" />
      {/* bottom block: flat bottom, larger rounded right end, diagonal over-cut */}
      <path d="M14 92 L57 53 H63.5 A19.5 19.5 0 0 1 63.5 92 H14 Z" />
    </svg>
  );
}

// Full lockup: mark + wordmark. The wordmark is set in the display face
// (Poppins, standing in for the brand's Hilmar) with a capital B only,
// matching the identity's "Buildhaus" wordmark.
export function Logo({
  className,
  markClassName,
  wordmarkClassName,
  tagline,
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  tagline?: string;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <BrandMark className={clsx("h-8 w-8 text-brand", markClassName)} />
      <span className="leading-none">
        <span className={clsx("block font-display text-lg font-semibold tracking-tight text-ivory", wordmarkClassName)}>
          Buildhaus
        </span>
        {tagline && (
          <span className="mt-0.5 block text-[9px] uppercase tracking-[0.18em] text-muted">{tagline}</span>
        )}
      </span>
    </span>
  );
}
