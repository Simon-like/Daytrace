import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(appDirectory, "../.."),
  poweredByHeader: false,
  transpilePackages: ["@daytrace/content", "@daytrace/ui"],
  async rewrites() {
    const h5Origin = process.env.H5_INTERNAL_ORIGIN ?? "http://127.0.0.1:3002";
    return [{ source: "/h5/:path*", destination: `${h5Origin}/h5/:path*` }];
  },
};

export default nextConfig;
