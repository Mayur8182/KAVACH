import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  poweredByHeader: false,
  compress: true,
  outputFileTracingRoot: path.resolve(__dirname),
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    cpus: 1,
    webpackBuildWorker: false,
    optimizePackageImports: [
      'lucide-react',
    ],
  },
  async redirects() {
    return [
      {
        source: '/kubernetes',
        destination: '/cloud/kubernetes',
        permanent: true,
      },
      {
        source: '/code/findings',
        destination: '/findings',
        permanent: false,
      },
      {
        source: '/code/repositories',
        destination: '/repositories',
        permanent: false,
      },
      {
        source: '/sast',
        destination: '/code/sast',
        permanent: true,
      },
      {
        source: '/scans',
        destination: '/code/iac/scans',
        permanent: true,
      },
      {
        source: '/ci-cd',
        destination: '/code/iac/quality-gates',
        permanent: true,
      },
      {
        source: '/compliance',
        destination: '/governance',
        permanent: true,
      },
      {
        source: '/docker',
        destination: '/cloud/docker',
        permanent: true,
      },
      {
        source: '/iac',
        destination: '/code/iac',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
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
    ];
  },
  webpack: (config, { dev }) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname),
    };
    if (dev) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
      config.devtool = 'eval-cheap-module-source-map';
      config.watchOptions = {
        ignored: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/.git/**'],
        aggregateTimeout: 50,
        poll: false,
      };
    }
    return config;
  },
  async rewrites() {
    const isProduction =
      process.env.NODE_ENV === 'production' ||
      !!process.env.RENDER ||
      !!process.env.VERCEL;
    const backendPort = process.env.BACKEND_PORT || '8000';
    const localUrl = `http://127.0.0.1:${backendPort}`;
    const productionBackend = 'https://kavach-backend-3hdm.onrender.com';

    let rawUrl = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '').trim();
    let backendUrl = rawUrl;

    if (!backendUrl) {
      backendUrl = isProduction ? productionBackend : localUrl;
    } else {
      // In local dev without RENDER/VERCEL, if someone has render backend in .env, they might want local unless forced
      // BUT in production, if backendUrl points to kavach-backend-3hdm.onrender.com, ALWAYS KEEP IT!
      if (!isProduction && backendUrl.includes('kavach-backend-3hdm.onrender.com') && !process.env.FORCE_REMOTE_BACKEND) {
        backendUrl = localUrl;
      }
    }

    if (!backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
      backendUrl = isProduction ? `https://${backendUrl}` : `http://${backendUrl}`;
    }

    try {
      const parsed = new URL(backendUrl);
      if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
        parsed.hostname = `${parsed.hostname}.onrender.com`;
        parsed.port = '';
        parsed.protocol = 'https:';
      }
      if (parsed.hostname.endsWith('.onrender.com')) {
        parsed.port = '';
        parsed.protocol = 'https:';
      }
      backendUrl = parsed.origin;
    } catch {
      backendUrl = backendUrl.replace(/:\d+$/, '').replace(/\/+$/, '');
    }

    // Clean trailing slashes or duplicate api prefixes
    backendUrl = backendUrl.replace(/\/+$/, '').replace(/\/api(\/v1)?$/, '');

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
