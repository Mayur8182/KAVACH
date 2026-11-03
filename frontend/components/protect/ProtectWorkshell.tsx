'use client';

/**
 * ProtectWorkshell — Production layout wrapper for all THING PROTECT sub-routes.
 * Renders the product-scoped secondary navigation bar and global header controls.
 * Uses native design system tokens for seamless aesthetic consistency.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield,
  Layers,
  FileCheck2,
  Activity,
  Cpu,
  Bot,
  Globe,
  Radio,
  UserCheck,
  AlertTriangle,
  Sliders,
  FileText,
  Clock,
  CheckCircle2,
  PieChart,
  Flame,
  Settings,
  PlusCircle,
  Play,
  RotateCcw,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface ProtectWorkshellProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
  activeCount?: {
    approvals?: number;
    threats?: number;
    enforcementFailures?: number;
  };
}

export const ProtectWorkshell: React.FC<ProtectWorkshellProps> = ({
  children,
  actions,
  activeCount,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [selectedEnv, setSelectedEnv] = useState('production');

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', href: '/protect', icon: <Shield size={13} /> },
    { id: 'runtime', label: 'Runtime', href: '/protect/runtime', icon: <Layers size={13} /> },
    { id: 'policies', label: 'Policies', href: '/protect/policies', icon: <FileCheck2 size={13} /> },
    { id: 'enforcement', label: 'Enforcement', href: '/protect/enforcement', icon: <Activity size={13} /> },
    { id: 'mcp', label: 'MCP', href: '/protect/mcp', icon: <Cpu size={13} /> },
    { id: 'agents', label: 'Agents', href: '/protect/agents', icon: <Bot size={13} /> },
    { id: 'apis', label: 'APIs', href: '/protect/apis', icon: <Globe size={13} /> },
    { id: 'network', label: 'Network', href: '/protect/network', icon: <Radio size={13} /> },
    { id: 'sessions', label: 'Sessions', href: '/protect/sessions', icon: <UserCheck size={13} /> },
    {
      id: 'threats',
      label: 'Threats',
      href: '/protect/threats',
      icon: <AlertTriangle size={13} />,
      badge: activeCount?.threats && activeCount.threats > 0 ? activeCount.threats : undefined,
    },
    { id: 'controls', label: 'Controls', href: '/protect/controls', icon: <Sliders size={13} /> },
    { id: 'evidence', label: 'Evidence', href: '/protect/evidence', icon: <FileText size={13} /> },
    { id: 'activity', label: 'Activity', href: '/protect/activity', icon: <Clock size={13} /> },
    {
      id: 'approvals',
      label: 'Approvals',
      href: '/protect/approvals',
      icon: <CheckCircle2 size={13} />,
      badge: activeCount?.approvals && activeCount.approvals > 0 ? activeCount.approvals : undefined,
    },
    { id: 'coverage', label: 'Coverage', href: '/protect/coverage', icon: <PieChart size={13} /> },
    { id: 'break-glass', label: 'Break-Glass', href: '/protect/break-glass', icon: <Flame size={13} /> },
    { id: 'settings', label: 'Settings', href: '/protect/settings', icon: <Settings size={13} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, width: '100%' }}>
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
                  width: '32px',
                  height: '32px',
                  borderRadius: '7px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
                }}
              >
                <Shield size={17} color="white" />
              </div>
              <div>
                <h1
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    letterSpacing: '-0.01em',
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  RUNTIME DEFENSE
                </h1>
                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-text-muted)',
                    margin: 0,
                    marginTop: '2px',
                  }}
                >
                  Active Defense, Deterministic Policy &amp; MCP Security
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
                  color: selectedEnv === 'production' ? '#34d399' : 'var(--color-text-primary)',
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

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {actions}
            <Link
              href="/protect/policies?action=simulate"
              
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#eab308',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <Play size={11} />
              Simulate Policy
            </Link>

            <Link
              href="/protect/break-glass"
              
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
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <Flame size={11} />
              Break Glass
            </Link>

            <Link
              href="/protect/policies?action=create"
              
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: 700,
                background: '#10b981',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: '#ffffff',
                textDecoration: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              }}
            >
              <PlusCircle size={12} />
              Create Policy
            </Link>
          </div>
        </div>

        {/* ── Sub Navigation Tabs ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            padding: '0 24px',
            overflowX: 'auto',
            borderTop: '1px solid var(--color-border)',
            scrollbarWidth: 'none',
          }}
        >
          {navItems.map((item) => {
            const isActive =
              item.href === '/protect'
                ? pathname === '/protect'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 13px',
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#34d399' : 'var(--color-text-secondary)',
                  borderBottom: isActive ? '2px solid #10b981' : '2px solid transparent',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  background: isActive ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
                }}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '16px',
                      height: '16px',
                      padding: '0 4px',
                      borderRadius: '8px',
                      fontSize: '9.5px',
                      fontWeight: 700,
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content Viewport */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
};

