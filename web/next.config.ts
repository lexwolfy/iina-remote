import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: process.env.NODE_ENV === 'production' ? '/iina-remote' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/iina-remote/' : '',
  images: {
    unoptimized: true
  }
};

export default nextConfig;
