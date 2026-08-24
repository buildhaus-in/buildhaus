import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { WEBSITE_URL } from "@/lib/env";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const poppins = Poppins({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });

export const metadata: Metadata = {
  metadataBase: new URL(WEBSITE_URL),
  title: {
    default: "Buildhaus — The home you envision is the home you receive | Hyderabad & Nellore",
    template: "%s | Buildhaus",
  },
  description:
    "BuildHaus is design-led residential and commercial construction in Hyderabad & Nellore — transparent BOQ pricing, structured updates at every milestone and stage-wise quality checks, from blueprint to handover.",
  keywords: [
    "construction company Hyderabad", "construction company Nellore", "villa construction Hyderabad",
    "house construction Nellore", "house construction cost estimator", "turnkey construction Andhra Pradesh", "turnkey construction Telangana",
    "Buildhaus", "BuildHaus",
  ],
  openGraph: {
    type: "website",
    siteName: "Buildhaus",
    title: "Buildhaus — The home you envision is the home you receive",
    description: "Design-led construction in Hyderabad & Nellore. Clear processes. Honest pricing. Quality without compromise.",
    url: WEBSITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Buildhaus — The home you envision is the home you receive",
    description: "Design-led construction in Hyderabad & Nellore. Clear processes. Honest pricing. Quality without compromise.",
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
};

const LOCAL_BUSINESS_JSONLD = {
  "@context": "https://schema.org",
  "@type": "GeneralContractor",
  name: "Buildhaus Constructions",
  slogan: "The home you envision is the home you receive.",
  description:
    "Design-led construction with transparent BOQ pricing, structured milestone updates and documented stage-wise quality checks — from blueprint to handover.",
  url: WEBSITE_URL,
  telephone: "+917328573826",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Nellore",
    addressRegion: "Andhra Pradesh",
    addressCountry: "IN",
  },
  areaServed: [
    { "@type": "City", name: "Hyderabad" },
    { "@type": "City", name: "Nellore" },
    { "@type": "State", name: "Andhra Pradesh" },
    { "@type": "State", name: "Telangana" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body>
        {children}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(LOCAL_BUSINESS_JSONLD) }}
        />
      </body>
    </html>
  );
}
