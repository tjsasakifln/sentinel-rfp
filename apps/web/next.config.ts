import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  eslint: {
    dirs: ['app', 'components', 'lib'],
  },
};

export default nextConfig;
