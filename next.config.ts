import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/*": ["./data/generated/**/*.json.gz", "./data/generated/**/*.json"],
  },
};

export default nextConfig;
