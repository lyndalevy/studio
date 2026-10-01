import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // iCloud Shared Albums
      { protocol: "https", hostname: "*.icloud-content.com" },
      { protocol: "https", hostname: "cvws.icloud-content.com" },
      // Adobe Lightroom shares
      { protocol: "https", hostname: "lightroom.adobe.com" },
      { protocol: "https", hostname: "*.adobe.io" },
      // Adobe Portfolio pages and their image CDN
      { protocol: "https", hostname: "cdn.myportfolio.com" },
      { protocol: "https", hostname: "*.myportfolio.com" },
    ],
  },
};

export default nextConfig;
