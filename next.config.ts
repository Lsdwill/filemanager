import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'ali-oss', 'mysql2'],
};

export default nextConfig;
