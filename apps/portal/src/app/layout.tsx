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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body>{children}</body>
    </html>
  );
}
