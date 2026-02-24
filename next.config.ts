import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Resonate uses native Node.js modules (sqlite3 for embedded storage).
  // Opt the API routes out of the Edge runtime to use Node.js runtime.
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
};

export default nextConfig;
