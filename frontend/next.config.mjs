import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  devIndicators: false,
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
    const backendPort = process.env.BACKEND_PORT || '8000';
    let backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || `http://127.0.0.1:${backendPort}`;
    if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
      backendUrl = `https://${backendUrl}`;
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
