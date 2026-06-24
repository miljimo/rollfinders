import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@rollfinders/theme",
    "@rollfinders/ui",
    "@rollfinders/api-client",
    "@rollfinders/types",
    "@rollfinders/validation",
  ],
};

export default nextConfig;
