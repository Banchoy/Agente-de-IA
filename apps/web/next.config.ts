import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@whiskeysockets/baileys", "ws", "link-preview-js", "jimp", "sharp"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
