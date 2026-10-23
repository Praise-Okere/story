import type { NextConfig } from "next";

// The Express backend (../server.js) does the AI work; Next proxies to it so
// the browser only ever talks to one origin.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // Scene prompts and long voiceovers can run for minutes; the proxy default is 30s.
    proxyTimeout: 600_000,
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      { source: "/audio/:path*", destination: `${BACKEND_URL}/audio/:path*` },
    ];
  },
};

export default nextConfig;
