import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const nextConfig: NextConfig = {
  basePath: "/h5",
  devIndicators: false,
  output: "standalone",
  outputFileTracingRoot: path.resolve(appDirectory, "../.."),
  poweredByHeader: false,
  transpilePackages: ["@daytrace/content", "@daytrace/ui"],
  async rewrites() {
    const apiOrigin = process.env.API_INTERNAL_ORIGIN ?? "http://127.0.0.1:3001";
    return [{ source: "/api/v1/:path*", destination: `${apiOrigin}/api/v1/:path*`, basePath: false }];
  },
};
export default nextConfig;
