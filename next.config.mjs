// next.config.mjs - Optimized for production deployment
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for smaller deployments (includes only necessary dependencies)
  output: 'export', // Use static export for Netlify
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  
  // Optimize build for production
  productionBrowserSourceMaps: false,
  
  // Webpack optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    if (!dev) {
      // Production optimizations
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // Compress pages
  compress: true,
  
  // Trailing slash for static export
  trailingSlash: true,
};

// Bundle analyzer (only in development)
let finalConfig = nextConfig;

if (process.env.ANALYZE === 'true') {
  const { default: withBundleAnalyzer } = await import('@next/bundle-analyzer');
  finalConfig = withBundleAnalyzer({
    enabled: true,
  })(nextConfig);
}

export default finalConfig;