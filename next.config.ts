import type { NextConfig } from "next";
import os from "node:os";

import path from "node:path";

const localIps = Object.values(os.networkInterfaces())
  .flatMap((net) => net ?? [])
  .filter((net) => net.family === "IPv4")
  .map((net) => net.address);

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname),
  allowedDevOrigins: [
    ...localIps,
    ...localIps.map((ip) => `${ip}:3000`),
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
  ],
};

export default nextConfig;