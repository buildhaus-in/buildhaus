/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: '5mb' } },
  transpilePackages: [
    "@buildhaus/ui",
    "@buildhaus/brand",
    "@buildhaus/database",
    "@buildhaus/utils",
    "@buildhaus/types",
    "@buildhaus/validation",
  ],
  async headers() {
    return [
      {
        // Browsers go straight to https:// on every later visit, including
        // subdomains (www and app are both HTTPS on Vercel; mail is MX-only).
        source: "/:path*",
        headers: [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }],
      },
      {
        // Walkthrough frames are versioned with ?v= in house-walkthrough.tsx,
        // so phones never re-check ~240 frames on a repeat visit.
        source: "/walkthrough/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};
export default nextConfig;
