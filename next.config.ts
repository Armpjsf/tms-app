import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  turbopack: {},
  images: {
    remotePatterns: [
        {
            protocol: 'https',
            hostname: 'jhksvhujsrbkeyzpvpog.supabase.co',
        },
        {
            protocol: 'https',
            hostname: 'drive.google.com',
        },
        {
            protocol: 'https',
            hostname: 'lh3.googleusercontent.com',
        }
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default withPWA(nextConfig);
