import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker production
  output: "standalone",
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false, // Enable strict type checking for production
  },
  
  // React configuration
  reactStrictMode: true, // Enable strict mode for better error handling
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false, // Enforce linting in production builds
  },
  
  // Environment variables accessible on client side
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_DEFAULT_MODEL: process.env.NEXT_PUBLIC_DEFAULT_MODEL,
  },
  
  // Image optimization
  images: {
    domains: [
      'localhost',
      // Add your production domains here
      'your-domain.com',
      'cdn.your-domain.com'
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  
  // Compression
  compress: true,
  
  // Powered by header removal for security
  poweredByHeader: false,
  
  // HTTP headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Webpack configuration for optimization
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
      };
    }

    // Add support for web workers
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
    };

    return config;
  },
  
  // Experimental features
  experimental: {
    // Optimize CSS
    optimizeCss: true,
    
    // Enable worker threads for compilation
    workerThreads: false, // Disable for now to avoid issues
  },
  
  // Logging configuration
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  
  // Redirects for SEO and legacy URLs
  async redirects() {
    return [
      // Add any redirects here
    ];
  },
  
  // Rewrites for API proxying
  async rewrites() {
    return [
      // Add any rewrites here if needed
    ];
  },
};

export default nextConfig;