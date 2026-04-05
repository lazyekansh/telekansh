/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['telegram', 'big-integer'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        dns: false,
        dgram: false,
        crypto: false,
      };
    }
    // Suppress GramJS dynamic require warnings
    config.module.exprContextCritical = false;
    return config;
  },
};

export default nextConfig;
