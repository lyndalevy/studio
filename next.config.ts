import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phone photos added to the dashboard's post ideas are a few MB each.
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
  images: {
    remotePatterns: [
      // iCloud Shared Albums
      { protocol: "https", hostname: "*.icloud-content.com" },
      { protocol: "https", hostname: "cvws.icloud-content.com" },
      // Adobe Lightroom shares
      { protocol: "https", hostname: "lightroom.adobe.com" },
      { protocol: "https", hostname: "*.adobe.io" },
      // Instagram media CDN
      { protocol: "https", hostname: "*.cdninstagram.com" },
      { protocol: "https", hostname: "*.fbcdn.net" },
      // Adobe Portfolio pages and their image CDN
      { protocol: "https", hostname: "cdn.myportfolio.com" },
      { protocol: "https", hostname: "*.myportfolio.com" },
    ],
  },
};

export default nextConfig;
