import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const poppins = Poppins({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });

// Private management portal: never indexed, never followed. The public
// marketing site (apps/website) is the only part of Buildhaus meant to show
// up in search results.
export const metadata: Metadata = {
  title: "Buildhaus Portal",
  description: "Buildhaus construction management portal.",
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false, nocache: true },
  // Next.js's app/icon.svg file-convention auto-detection does NOT fire
  // once `icons` is set explicitly here (the two don't merge — confirmed
  // by inspecting the rendered <head>, despite what the file-convention
  // docs imply) — so the SVG entry is listed explicitly, first, so
  // browsers that support SVG favicons (most current ones) prefer it over
  // the raster fallbacks below, generated from the same source file
  // (packages/brand/assets/logo/icon-orange-4x.png).
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body>{children}</body>
    </html>
  );
}
