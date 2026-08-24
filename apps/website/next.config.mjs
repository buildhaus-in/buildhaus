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
};
export default nextConfig;
