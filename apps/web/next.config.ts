import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the deterministic visual fixture server isolated from a developer's
  // normal `.next` dev process when Playwright runs in parallel.
  distDir: process.env.VISUAL_TEST_MODE === "1" ? ".next-visual" : ".next",
  transpilePackages: ["@hashvest/web3"],
};

export default nextConfig;
