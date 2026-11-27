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
  htmlLimitedBots: /.*/,
  outputFileTracingRoot: path.resolve(__dirname),
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
    ],
  },
  async redirects() {
    return [
      {
        source: '/remediation',
        destination: '/code/remediation',
        permanent: false,
      },
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
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://client.crisp.chat https://www.googletagmanager.com https://www.google-analytics.com",
              "style-src 'self' 'unsafe-inline' https://accounts.google.com https://client.crisp.chat",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://client.crisp.chat",
              "connect-src 'self' https: wss: http://127.0.0.1:* http://localhost:*",
              "media-src 'self' blob: data: https:",
              "frame-src 'self' https://accounts.google.com https://client.crisp.chat",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://accounts.google.com",
              "frame-ancestors 'none'",
            ].join('; '),
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
        source: '/500',
        destination: '/server-error',
      },
      {
        source: '/404',
        destination: '/not-found-page',
      },
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/.well-known/:path*',
        destination: `${backendUrl}/.well-known/:path*`,
      },
      {
        source: '/oauth/:path*',
        destination: `${backendUrl}/oauth/:path*`,
      },
      {
        source: '/mcp',
        destination: `${backendUrl}/mcp`,
      },
      {
        source: '/mcp/:path*',
        destination: `${backendUrl}/mcp/:path*`,
      },
      {
        source: '/sse',
        destination: `${backendUrl}/sse`,
      },
    ];
  },
};

export default nextConfig;
