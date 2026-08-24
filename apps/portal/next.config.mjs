/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
  transpilePackages: [
    "@buildhaus/ui",
    "@buildhaus/brand",
    "@buildhaus/database",
    "@buildhaus/utils",
    "@buildhaus/types",
    "@buildhaus/validation",
  ],
};
export default nextConfig;
