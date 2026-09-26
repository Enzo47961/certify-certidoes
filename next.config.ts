import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // O repositório tem outros projetos com lockfile próprio; a raiz deste app é esta pasta.
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ['unpdf'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          // O visualizador de PDF do painel usa iframe do próprio site.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
