import type { NextConfig } from "next";
const config: NextConfig = {
  distDir: process.env.NODE_ENV === "production" ? ".next-production" : ".next",
  devIndicators: false,
  experimental: { cpus: 2 },
  serverExternalPackages: ["@prisma/client"],
  transpilePackages: ["@buildspace/core"],
};
export default config;
