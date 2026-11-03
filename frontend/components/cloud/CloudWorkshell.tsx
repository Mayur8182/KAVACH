'use client';

/**
 * CloudWorkshell — Shared layout wrapper for all Thing Cloud sub-routes.
 * Renders the product-scoped secondary navigation bar with 20 sub-workspaces.
 * Consumed by every /cloud/* page via a client boundary.
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Cloud,
  Server,
  CloudLightning,
  Globe,
  Layers,
  Boxes,
  Container,
  FileCode2,
  AlertTriangle,
  Users,
  Network,
  HardDrive,
  Database,
  Radio,
  GitFork,
  Target,
  CheckSquare,
  Wrench,
  Archive,
  Settings2,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', href: '/cloud', icon: <Cloud size={13} /> },
  { id: 'assets', label: 'Assets', href: '/cloud/assets', icon: <Server size={13} /> },
  { id: 'aws', label: 'AWS', href: '/cloud/aws', icon: <CloudLightning size={13} /> },
  { id: 'azure', label: 'Azure', href: '/cloud/azure', icon: <Globe size={13} /> },
  { id: 'gcp', label: 'GCP', href: '/cloud/gcp', icon: <Layers size={13} /> },
  { id: 'kubernetes', label: 'Kubernetes', href: '/cloud/kubernetes', icon: <Boxes size={13} /> },
  { id: 'docker', label: 'Docker', href: '/cloud/docker', icon: <Container size={13} /> },
  { id: 'findings', label: 'Findings', href: '/cloud/findings', icon: <AlertTriangle size={13} /> },
  { id: 'iam', label: 'IAM', href: '/cloud/iam', icon: <Users size={13} /> },
  { id: 'network', label: 'Network', href: '/cloud/network', icon: <Network size={13} /> },
  { id: 'storage', label: 'Storage', href: '/cloud/storage', icon: <HardDrive size={13} /> },
  { id: 'databases', label: 'Databases', href: '/cloud/databases', icon: <Database size={13} /> },
  { id: 'exposures', label: 'Exposures', href: '/cloud/exposures', icon: <Radio size={13} /> },
  { id: 'attack-paths', label: 'Attack Paths', href: '/cloud/attack-paths', icon: <GitFork size={13} /> },
  { id: 'blast-radius', label: 'Blast Radius', href: '/cloud/blast-radius', icon: <Target size={13} /> },
  { id: 'compliance', label: 'Compliance', href: '/cloud/compliance', icon: <CheckSquare size={13} /> },
  { id: 'remediation', label: 'Remediation', href: '/cloud/remediation', icon: <Wrench size={13} /> },
  { id: 'evidence', label: 'Evidence', href: '/cloud/evidence', icon: <Archive size={13} /> },
  { id: 'settings', label: 'Settings', href: '/cloud/settings', icon: <Settings2 size={13} /> },
];

interface CloudWorkshellProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const CloudWorkshell: React.FC<CloudWorkshellProps> = ({ children, actions }) => {
  const pathname = usePathname();

  const getActiveId = () => {
    if (pathname === '/cloud') return 'overview';
    const segment = pathname.replace('/cloud/', '').split('/')[0];
    return segment || 'overview';
  };

  const activeId = getActiveId();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
      {/* ── Product Header ── */}
      <div
        style={{
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          flexShrink: 0,
        }}
      >
        {/* Title row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px 10px 24px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Cloud size={15} color="white" />
              </div>
              <h1
                style={{
                  fontSize: '16px',
                  fontWeight: 'var(--weight-bold)',
                  color: 'var(--color-text-primary)',
                  letterSpacing: '-0.01em',
                }}
              >
                CLOUD SECURITY
              </h1>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '3px', paddingLeft: '38px' }}>
              Cloud Infrastructure Security &amp; Posture Management
            </p>
          </div>

          {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{actions}</div>}
        </div>

        {/* Secondary Nav tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0',
            overflowX: 'auto',
            padding: '0 20px',
            scrollbarWidth: 'none',
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeId;
            return (
              <Link
                key={item.id}
                href={item.href}
                
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '8px 10px 10px 10px',
                  fontSize: '11.5px',
                  fontWeight: isActive ? 'var(--weight-semibold)' : 'var(--weight-normal)',
                  color: isActive ? 'var(--color-primary-text)' : 'var(--color-text-secondary)',
                  borderBottom: isActive
                    ? '2px solid var(--color-primary)'
                    : '2px solid transparent',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all var(--transition-fast)',
                  opacity: isActive ? 1 : 0.75,
                }}
              >
                <span style={{ opacity: 0.85 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Page Content ── */}
      <div style={{ flexGrow: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
};
export default CloudWorkshell;

