import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow connections from local network devices for Turbopack HMR
  allowedDevOrigins: ['192.168.100.5'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/**',
      },
      {
        // MyAnimeList / Jikan API images
        protocol: 'https',
        hostname: 'cdn.myanimelist.net',
        pathname: '/**',
      },
      {
        // AniList cover images
        protocol: 'https',
        hostname: 's4.anilist.co',
        pathname: '/**',
      },
      {
        // Jikan alternative CDN
        protocol: 'https',
        hostname: 'media.myanimelist.net',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
