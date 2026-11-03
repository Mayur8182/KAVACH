'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShieldAlert,
  History,
  Layers,
  Network,
  Scale,
  Activity,
  Wand2,
  FileCode,
  ShieldCheck,
  GitPullRequest,
  Search,
  BarChart3,
  Sliders,
} from 'lucide-react';

export interface PrimaryModuleItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}

export const PRIMARY_DEPENDENCY_MODULES: PrimaryModuleItem[] = [
  { id: 'overview', label: 'Overview', href: '/code/dependencies', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory', href: '/code/dependencies/inventory', icon: Package },
  { id: 'vulnerabilities', label: 'Vulnerabilities', href: '/code/dependencies/vulnerabilities', icon: ShieldAlert },
  { id: 'versions', label: 'Versions', href: '/code/dependencies/versions', icon: History },
  { id: 'ecosystems', label: 'Ecosystems', href: '/code/dependencies/ecosystems', icon: Layers },
  { id: 'graph', label: 'Graph', href: '/code/dependencies/graph', icon: Network },
  { id: 'licenses', label: 'Licenses', href: '/code/dependencies/licenses', icon: Scale },
  { id: 'health', label: 'Health', href: '/code/dependencies/health', icon: Activity },
  { id: 'remediation', label: 'Remediation', href: '/code/dependencies/remediation', icon: Wand2 },
  { id: 'sbom', label: 'SBOM', href: '/code/dependencies/sbom', icon: FileCode },
  { id: 'policies', label: 'Policies', href: '/code/dependencies/policies', icon: ShieldCheck },
  { id: 'cicd', label: 'CI/CD', href: '/code/dependencies/ci-cd', icon: GitPullRequest },
  { id: 'scans', label: 'Scans', href: '/code/dependencies/scans', icon: Search },
  { id: 'reports', label: 'Reports', href: '/code/dependencies/reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', href: '/code/dependencies/settings', icon: Sliders },
];

export const getActiveDependencyModule = (pathname: string): string => {
  if (!pathname) return 'overview';
  if (
    pathname.startsWith('/code/dependencies/inventory') ||
    pathname.startsWith('/code/dependencies/direct') ||
    pathname.startsWith('/code/dependencies/transitive') ||
    pathname.startsWith('/code/dependencies/usage') ||
    pathname.startsWith('/code/dependencies/duplicates')
  ) {
    return 'inventory';
  }
  if (pathname.startsWith('/code/dependencies/vulnerabilities')) return 'vulnerabilities';
  if (pathname.startsWith('/code/dependencies/versions')) return 'versions';
  if (pathname.startsWith('/code/dependencies/ecosystems')) return 'ecosystems';
  if (pathname.startsWith('/code/dependencies/graph')) return 'graph';
  if (pathname.startsWith('/code/dependencies/licenses')) return 'licenses';
  if (pathname.startsWith('/code/dependencies/health')) return 'health';
  if (pathname.startsWith('/code/dependencies/remediation')) return 'remediation';
  if (pathname.startsWith('/code/dependencies/sbom')) return 'sbom';
  if (pathname.startsWith('/code/dependencies/policies')) return 'policies';
  if (pathname.startsWith('/code/dependencies/ci-cd')) return 'cicd';
  if (pathname.startsWith('/code/dependencies/scans')) return 'scans';
  if (pathname.startsWith('/code/dependencies/reports')) return 'reports';
  if (pathname.startsWith('/code/dependencies/settings')) return 'settings';
  return 'overview';
};

export const PrimaryDependenciesNav: React.FC = () => {
  const pathname = usePathname() || '/code/dependencies';
  const activeModule = getActiveDependencyModule(pathname);

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        padding: '6px 8px',
        marginBottom: '16px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {PRIMARY_DEPENDENCY_MODULES.map((item) => {
          const isActive = activeModule === item.id;
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#2563EB' : '#64748B',
                backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                border: isActive ? '1px solid #BFDBFE' : '1px solid transparent',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#0F172A';
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#64748B';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Icon size={14} style={{ color: isActive ? '#2563EB' : '#94A3B8' }} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
