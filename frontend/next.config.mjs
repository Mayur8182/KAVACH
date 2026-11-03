import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  outputFileTracingRoot: path.resolve(__dirname),
  // Keep HTTP connections alive so the proxy doesn't close prematurely
  httpAgentOptions: {
    keepAlive: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'recharts',
      'framer-motion',
    ],
    // Allow 180s for long-running backend operations like remediation pipelines
    // (git clone + patch + rescan + PR creation can take 30-90s)
    proxyTimeout: 180000,
  },
  async redirects() {
    return [
      {
        source: '/kubernetes',
        destination: '/cloud/kubernetes',
        permanent: true,
      },
      {
        source: '/findings',
        destination: '/code/findings',
        permanent: true,
      },
      {
        source: '/repositories',
        destination: '/code/repositories',
        permanent: true,
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
  webpack: (config, { dev }) => {
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
    const backendPort = process.env.BACKEND_PORT || '8000';
    const backendUrl = process.env.BACKEND_URL || `http://127.0.0.1:${backendPort}`;
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
