'use client';

/**
 * AgentWorkshell — Production layout wrapper for all THING AGENT sub-routes.
 * Uses native design system tokens for full aesthetic consistency with PROTECT.
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  ShieldCheck,
  KeyRound,
  Wrench,
  Network,
  GitBranch,
  Activity,
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle2,
  Layers,
  Eye,
  Database,
  BarChart3,
  Settings as SettingsIcon,
  Shield,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface AgentWorkshellProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
  activeCount?: {
    approvals?: number;
    signals?: number;
    blocked?: number;
  };
}

export const AgentWorkshell: React.FC<AgentWorkshellProps> = ({
  children,
  actions,
  activeCount,
}) => {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', href: '/agent', icon: <BarChart3 size={14} /> },
    { id: 'agents', label: 'Agent Registry', href: '/agent/agents', icon: <Bot size={14} /> },
    { id: 'identities', label: 'Identities', href: '/agent/identities', icon: <KeyRound size={14} /> },
    { id: 'permissions', label: 'Permissions', href: '/agent/permissions', icon: <ShieldCheck size={14} /> },
    { id: 'tools', label: 'Tool Inventory', href: '/agent/tools', icon: <Wrench size={14} /> },
    { id: 'sessions', label: 'Sessions', href: '/agent/sessions', icon: <Clock size={14} /> },
    { id: 'delegations', label: 'Delegations', href: '/agent/delegations', icon: <GitBranch size={14} /> },
    { id: 'graph', label: 'Authority Graph', href: '/agent/delegations/graph', icon: <Network size={14} /> },
    { id: 'actions', label: 'Action Audit', href: '/agent/actions', icon: <Activity size={14} /> },
    { id: 'data-access', label: 'Data Access', href: '/agent/data-access', icon: <Database size={14} /> },
    { id: 'behavior', label: 'Behavior', href: '/agent/behavior', icon: <Eye size={14} />, badge: activeCount?.signals },
    { id: 'policies', label: 'Policies', href: '/agent/policies', icon: <Shield size={14} /> },
    { id: 'risk', label: 'Risk', href: '/agent/risk', icon: <AlertTriangle size={14} /> },
    { id: 'evidence', label: 'Evidence', href: '/agent/evidence', icon: <FileText size={14} /> },
    { id: 'approvals', label: 'Approvals', href: '/agent/approvals', icon: <CheckCircle2 size={14} />, badge: activeCount?.approvals },
    { id: 'activity', label: 'Audit Log', href: '/agent/activity', icon: <Layers size={14} /> },
    { id: 'settings', label: 'Settings', href: '/agent/settings', icon: <SettingsIcon size={14} /> },
  ];

  const isActive = (href: string) => {
    if (href === '/agent') return pathname === '/agent';
    return pathname.startsWith(href);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
      {/* ── Header Bar ─────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 24px',
        flexShrink: 0,
      }}>
        {/* Title Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 0 10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Bot size={16} color="#fff" />
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#a78bfa',
                textTransform: 'uppercase',
              }}>
                AI AGENT SECURITY
              </div>
              <div style={{
                fontSize: 11,
                color: 'var(--color-text-muted)',
                marginTop: 1,
              }}>
                AI Agent Identity · Authority · Delegation · Runtime Evidence
              </div>
            </div>
          </div>

          {/* Status Capsules */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(activeCount?.approvals ?? 0) > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 20,
                background: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                fontSize: 11, color: '#facc15',
                fontFamily: 'var(--font-mono)',
              }}>
                <CheckCircle2 size={11} />
                {activeCount!.approvals} PENDING
              </div>
            )}
            {(activeCount?.signals ?? 0) > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 20,
                background: 'rgba(249, 115, 22, 0.12)',
                border: '1px solid rgba(249, 115, 22, 0.3)',
                fontSize: 11, color: '#fb923c',
                fontFamily: 'var(--font-mono)',
              }}>
                <AlertTriangle size={11} />
                {activeCount!.signals} SIGNALS
              </div>
            )}
            {actions}
          </div>
        </div>

        {/* Nav Tabs */}
        <div style={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          paddingBottom: 0,
          msOverflowStyle: 'none',
        }}>
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#a78bfa' : 'var(--color-text-muted)',
                  borderBottom: active ? '2px solid #7c3aed' : '2px solid transparent',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s, border-color 0.15s',
                  position: 'relative',
                }}
              >
                {item.icon}
                {item.label}
                {item.badge != null && item.badge > 0 && (
                  <span style={{
                    background: '#7c3aed',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: 10,
                    lineHeight: '16px',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Content Area ───────────────────────────────────────────── */}
      <div style={{ flexGrow: 1, overflow: 'auto', minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
};

export default AgentWorkshell;

