import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/*": ["./data/generated/*/\*.json.gz"],
  },
};

export default nextConfig;
