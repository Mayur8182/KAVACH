'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useScope } from '@/context/ScopeContext';
import {
  LayoutDashboard,
  ShieldAlert,
  Search,
  BookOpen,
  FileCheck2,
  GitCompare,
  Network,
  ClipboardCheck,
  Wand2,
  Sliders,
  Cpu,
  Link2,
  FolderGit2,
  ShieldCheck,
  Play,
} from 'lucide-react';

interface SubNavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  exact?: boolean;
}

const IAC_NAV_ITEMS: SubNavItem[] = [
  { id: 'overview', label: 'Overview', href: '/code/iac/overview', icon: LayoutDashboard },
  { id: 'scans', label: 'Scans', href: '/code/iac/scans', icon: Search },
  { id: 'findings', label: 'Findings', href: '/code/iac/findings', icon: ShieldAlert },
  { id: 'config', label: 'Config Analysis', href: '/code/iac/configuration-analysis', icon: Cpu },
  { id: 'rules', label: 'Rules', href: '/code/iac/rules', icon: BookOpen },
  { id: 'policies', label: 'Policies', href: '/code/iac/policies', icon: FileCheck2 },
  { id: 'quality-gates', label: 'Quality Gates', href: '/code/iac/quality-gates', icon: ShieldCheck },
  { id: 'compliance', label: 'Compliance', href: '/code/iac/compliance', icon: ClipboardCheck },
  { id: 'drift', label: 'Drift Detection', href: '/code/iac/drift', icon: GitCompare },
  { id: 'graph', label: 'Infra Graph', href: '/code/iac/infrastructure-graph', icon: Network },
  { id: 'remediation', label: 'AutoFix & Remediation', href: '/code/iac/remediation', icon: Wand2 },
  { id: 'run', label: 'Workload Manifests', href: '/code/iac/run', icon: Play },
  { id: 'integrations', label: 'Integrations', href: '/code/iac/integrations', icon: Link2 },
  { id: 'settings', label: 'Settings', href: '/code/iac/settings', icon: Sliders },
];

export const IaCSubNav: React.FC = () => {
  const pathname = usePathname() || '/code/iac';
  const { currentRepository } = useScope();

  const isItemActive = (item: SubNavItem) => {
    if (pathname === item.href) return true;
    if (item.id === 'overview' && (pathname === '/code/iac' || pathname === '/code/iac/')) return true;
    if (item.href !== '/code/iac' && pathname.startsWith(item.href + '/')) return true;
    return false;
  };

  const repoName = currentRepository?.name || 'All Repositories';

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '0 24px',
        position: 'sticky',
        top: '68px',
        zIndex: 30,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '48px',
          gap: '16px',
        }}
      >
        {/* Navigation Tabs */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            padding: '4px 0',
          }}
        >
          {IAC_NAV_ITEMS.map((item) => {
            const active = isItemActive(item);
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
                  fontWeight: active ? 600 : 500,
                  color: active ? '#09090B' : '#64748B',
                  backgroundColor: active ? '#F1F5F9' : 'transparent',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  border: active ? '1px solid #E2E8F0' : '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = '#0F172A';
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = '#64748B';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <Icon size={14} style={{ color: active ? '#09090B' : '#94A3B8' }} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Global Repository Scope Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
            padding: '4px 10px',
            borderRadius: '6px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            fontSize: '11px',
            color: '#475569',
          }}
          title={`Global Context: Scoped to ${repoName}`}
        >
          <FolderGit2 size={13} color="#0F172A" />
          <span style={{ fontWeight: 500 }}>Repository:</span>
          <span style={{ fontWeight: 700, color: '#0F172A', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {repoName}
          </span>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#16A34A',
            }}
            title="Context synchronized across SAST, Secrets & IaC"
          />
        </div>
      </div>
    </div>
  );
};
