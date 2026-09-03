const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === "string" && args[0].includes("zlib.bytesRead is deprecated")) {
    return;
  }
  originalConsoleError(...args);
};

import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Disable PWA in dev to avoid aggressive caching
  register: true,
});

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "react-icons", "date-fns"],
  },
  turbopack: {},
};

export default withPWA(nextConfig);
