// next.config.mjs - Optimized for production deployment
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for smaller deployments
  output: 'standalone',
  
  // Optimize build for production
  productionBrowserSourceMaps: false, // Disable source maps in production
  
  // Optimize images
  images: {
    // Configure image optimization
    formats: ['image/webp'],
    minimumCacheTTL: 86400, // 24 hours
    // Add your image domains here
    domains: [],
  },
  
  // Experimental features for optimization
  experimental: {
    // Enable output file tracing for smaller deployments
    outputFileTracingRoot: process.cwd(),
    
    // Optimize CSS
    optimizeCss: true,
  },
  
  // Webpack optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    if (!dev) {
      // Production optimizations
      config.optimization = {
        ...config.optimization,
        // Enable SplitChunks for better caching
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
      
      // Remove console.log in production
      config.optimization.minimizer.push(
        new webpack.DefinePlugin({
          'console.log': '(() => {})',
        })
      );
    }
    
    return config;
  },
  
  // Compress pages
  compress: true,
  
  // Optimize fonts
  optimizeFonts: true,
  
  // Headers for better caching
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|gif|ico|webp)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

// Bundle analyzer (only in development)
if (process.env.ANALYZE === 'true') {
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
  });
  module.exports = withBundleAnalyzer(nextConfig);
} else {
  module.exports = nextConfig;
}