import { ImageResponse } from "next/og";

// Site-wide Open Graph / Twitter card image. Next.js auto-wires this into
// every page's metadata that doesn't declare its own — no `images` field
// needed in layout.tsx. Composed from the same brand palette and icon
// geometry as the rest of the site (packages/brand/src/colors.ts,
// packages/ui/src/logo.tsx's Icon) — the icon path is the exact shape from
// the shipped SVG (Buildhaus Logo File/Icon/…/1.svg), reproduced here
// because ImageResponse renders via Satori, which needs the shape inline
// rather than as a file reference; nothing about the mark itself is redrawn.
export const runtime = "edge";
export const alt = "Buildhaus — Design, Build, Deliver";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#EDCFA4",
          fontFamily: "sans-serif",
        }}
      >
        <svg width="168" height="163" viewBox="440 448 620 603" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            fill="#E04D22"
            d="M868.83,694.21l-80.48-.28,71.27-95.7v-124.9h-394.69v304.48h200.23l-200.23,248.87h403.89c91.81,0,166.23-74.42,166.23-166.23h0c0-91.81-74.42-166.23-166.23-166.23Z"
          />
        </svg>
        <div
          style={{
            marginTop: 28,
            fontSize: 72,
            fontWeight: 800,
            color: "#221A16",
            letterSpacing: "-0.02em",
          }}
        >
          Buildhaus
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 28,
            fontWeight: 500,
            color: "#5B4F45",
          }}
        >
          Design-led construction — Hyderabad &amp; Nellore
        </div>
      </div>
    ),
    { ...size }
  );
}
