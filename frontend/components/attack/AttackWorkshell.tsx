'use client';

/**
 * AttackWorkshell — Production layout wrapper for all Thing Attack sub-routes.
 * Renders the product-scoped secondary navigation bar and global header controls.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Crosshair,
  Globe2,
  Target,
  LayoutGrid,
  FileCode2,
  SearchCode,
  Flame,
  ShieldAlert,
  GitFork,
  Zap,
  Bug,
  Flag,
  Calendar,
  Archive,
  FileText,
  ShieldCheck,
  Settings2,
  Play,
  PlusCircle,
  Radio,
  Layers,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', href: '/attack', icon: <Crosshair size={13} /> },
  { id: 'surface', label: 'Attack Surface', href: '/attack/surface', icon: <Globe2 size={13} /> },
  { id: 'targets', label: 'Targets', href: '/attack/targets', icon: <Target size={13} /> },
  { id: 'web-apps', label: 'Web Apps', href: '/attack/web-apps', icon: <LayoutGrid size={13} /> },
  { id: 'apis', label: 'APIs', href: '/attack/apis', icon: <FileCode2 size={13} /> },
  { id: 'api-discovery', label: 'API Discovery', href: '/attack/api-discovery', icon: <SearchCode size={13} /> },
  { id: 'dast', label: 'DAST', href: '/attack/dast', icon: <Flame size={13} /> },
  { id: 'pentests', label: 'Pentests', href: '/attack/pentests', icon: <ShieldAlert size={13} /> },
  { id: 'paths', label: 'Attack Paths', href: '/attack/paths', icon: <GitFork size={13} /> },
  { id: 'exploits', label: 'Exploits', href: '/attack/exploits', icon: <Zap size={13} /> },
  { id: 'findings', label: 'Findings', href: '/attack/findings', icon: <Bug size={13} /> },
  { id: 'campaigns', label: 'Campaigns', href: '/attack/campaigns', icon: <Flag size={13} /> },
  { id: 'schedules', label: 'Schedules', href: '/attack/schedules', icon: <Calendar size={13} /> },
  { id: 'evidence', label: 'Evidence', href: '/attack/evidence', icon: <Archive size={13} /> },
  { id: 'reports', label: 'Reports', href: '/attack/reports', icon: <FileText size={13} /> },
  { id: 'policies', label: 'Policies', href: '/attack/policies', icon: <ShieldCheck size={13} /> },
  { id: 'settings', label: 'Settings', href: '/attack/settings', icon: <Settings2 size={13} /> },
];

interface AttackWorkshellProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const AttackWorkshell: React.FC<AttackWorkshellProps> = ({ children, actions }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [selectedEnv, setSelectedEnv] = useState('production');

  const getActiveId = () => {
    if (pathname === '/attack') return 'overview';
    const segment = pathname.replace('/attack/', '').split('/')[0];
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
            padding: '12px 24px 8px 24px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '7px',
                  background: 'linear-gradient(135deg, #ef4444, #f97316)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)',
                }}
              >
                <Crosshair size={16} color="white" />
              </div>
              <div>
                <h1
                  style={{
                    fontSize: '15px',
                    fontWeight: 'var(--weight-bold)',
                    color: 'var(--color-text-primary)',
                    letterSpacing: '-0.01em',
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  ATTACK SURFACE
                </h1>
                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-text-muted)',
                    margin: 0,
                    marginTop: '2px',
                  }}
                >
                  Attack Surface &amp; Verification
                </p>
              </div>
            </div>

            {/* Scope / Environment Selectors */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '11px',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <Layers size={11} color="var(--color-text-muted)" />
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Production Core</span>
              </div>

              <select
                value={selectedEnv}
                onChange={(e) => setSelectedEnv(e.target.value)}
                style={{
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  color: selectedEnv === 'production' ? '#f87171' : 'var(--color-text-primary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-md)',
                  padding: '4px 8px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="production">● Production</option>
                <option value="staging">○ Staging</option>
                <option value="development">○ Development</option>
              </select>
            </div>
          </div>

          {/* Quick Action Buttons connecting to real workflows */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => router.push('/attack/dast')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#ef4444',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Play size={11} />
              Run Test
            </button>

            <button
              onClick={() => router.push('/attack/pentests')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'rgba(249, 115, 22, 0.12)',
                border: '1px solid rgba(249, 115, 22, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#f97316',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <PlusCircle size={11} />
              New Pentest
            </button>

            <button
              onClick={() => router.push('/attack/api-discovery')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
              }}
            >
              <Radio size={11} />
              Discover APIs
            </button>

            {actions}
          </div>
        </div>

        {/* Secondary Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '2px',
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
                  gap: '6px',
                  padding: '7px 11px 9px 11px',
                  fontSize: '11.5px',
                  fontWeight: isActive ? 'var(--weight-semibold)' : 'var(--weight-normal)',
                  color: isActive ? '#ef4444' : 'var(--color-text-secondary)',
                  borderBottom: isActive ? '2px solid #ef4444' : '2px solid transparent',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all var(--transition-fast)',
                  opacity: isActive ? 1 : 0.75,
                }}
              >
                <span style={{ opacity: isActive ? 1 : 0.8 }}>{item.icon}</span>
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

