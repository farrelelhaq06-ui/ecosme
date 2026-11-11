import type { NextConfig } from "next";

/**
 * EcoSME Next.js config.
 *
 * `cacheComponents` is intentionally disabled: almost every application page
 * depends on the per-request session cookie and on URL filters (date range,
 * machine), so classic request-time dynamic rendering is the simpler and
 * more predictable model for this product.
 */
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
