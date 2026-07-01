import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // Host-based routing for keynote.coachpulsedemo.com lives in src/middleware.ts —
  // config rewrites can't override the statically prerendered "/" home page.
};

export default nextConfig;
