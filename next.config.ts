import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['sql.js', '@netlify/blobs'],
  typescript: {tsconfigPath: process.env.NEXT_PUBLIC_HOSTING_TARGET==='netlify'?'tsconfig.netlify.json':'tsconfig.json'},
};

export default nextConfig;
