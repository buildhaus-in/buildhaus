// The Buildhaus "B" mark as a decorative shape — the same path as the logo
// files in public/brand/ (and app/icon.svg). The print collateral (envelope,
// email signature, business card, QR card) uses it oversized as a graphic
// block on warm black / sand grounds; this lets the website do the same.
// Always decorative: aria-hidden, colour via `currentColor`.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="440 448 620 603" fill="currentColor" aria-hidden className={className}>
      <path d="M868.83,694.21l-80.48-.28,71.27-95.7v-124.9h-394.69v304.48h200.23l-200.23,248.87h403.89c91.81,0,166.23-74.42,166.23-166.23h0c0-91.81-74.42-166.23-166.23-166.23Z" />
    </svg>
  );
}

/** A field of small dots, like the envelope's and email signature's grid. */
export function DotGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={className}
      style={{ backgroundImage: "radial-gradient(currentColor 1.2px, transparent 1.4px)", backgroundSize: "14px 14px" }}
    />
  );
}
