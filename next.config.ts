import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Disable PWA in dev to avoid aggressive caching
  register: true,
});

const nextConfig: NextConfig = {
  turbopack: {},
  devIndicators: {
    buildActivity: false,
  },
};

export default withPWA(nextConfig);
