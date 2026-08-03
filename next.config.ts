import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  redirects: async () => [
    {
      source: "/invoices",
      destination: "/statements",
      permanent: true,
    },
  ],
};

export default nextConfig;
